import type { PadState } from "./gamepad";

// Protocol references: Chromium device/gamepad/nintendo_controller.cc and
// dekuNukem/Nintendo_Switch_Reverse_Engineering/bluetooth_hid_notes.md.
export interface ProHidInput { reportId: number; data: DataView }
interface HidCollection {
  inputReports?: { reportId: number; items?: { reportSize: number; reportCount: number }[] }[];
  outputReports?: { reportId: number; items?: { reportSize: number; reportCount: number }[] }[];
  children?: HidCollection[];
}
export interface ProHidDevice {
  vendorId: number; productId: number; productName: string; opened: boolean;
  collections?: HidCollection[];
  open(): Promise<void>; close(): Promise<void>;
  sendReport(id: number, data: Uint8Array<ArrayBuffer>): Promise<void>;
  addEventListener(type: "inputreport", listener: (event: ProHidInput) => void): void;
  removeEventListener(type: "inputreport", listener: (event: ProHidInput) => void): void;
}
export interface ProHidAccess {
  requestDevice(options: { filters: { vendorId: number; productId: number }[] }): Promise<ProHidDevice[]>;
  getDevices(): Promise<ProHidDevice[]>;
  addEventListener(type: "disconnect" | "connect", listener: (event: { device: ProHidDevice }) => void): void;
}
type Calibration = { center: number; min: number; max: number }[];
const defaults = (): Calibration => Array.from({ length: 4 }, () => ({ center: 2048, min: 1500, max: 1500 }));
const unpack = (data: DataView, offset: number) => [data.getUint8(offset) | (data.getUint8(offset + 1) & 15) << 8, data.getUint8(offset + 1) >> 4 | data.getUint8(offset + 2) << 4];
export function decodeProReport(reportId: number, data: DataView, calibration = defaults()): PadState | null {
  if (reportId !== 0x30 || data.byteLength < 12) return null;
  const right = data.getUint8(2), shared = data.getUint8(3), left = data.getUint8(4);
  const bits = [[right, 3], [right, 2], [right, 1], [right, 0], [left, 6], [right, 6], [left, 7], [right, 7], [shared, 0], [shared, 1], [shared, 3], [shared, 2], [left, 1], [left, 0], [left, 3], [left, 2], [shared, 4]];
  const values = [...unpack(data, 5), ...unpack(data, 8)];
  return {
    buttons: bits.map(([byte, bit]) => { const pressed = !!(byte & 1 << bit); return { pressed, value: pressed ? 1 : 0 }; }),
    axes: values.map((value, i) => {
      const c = calibration[i], delta = value - c.center;
      const normalized = Math.max(-1, Math.min(1, delta / (delta < 0 ? c.min : c.max)));
      return normalized === 0 ? 0 : i % 2 ? -normalized : normalized;
    }),
  };
}
type State = "idle" | "requesting" | "initializing" | "connected" | "waiting" | "disconnected" | "error";
type Status = { state: State; message: string };
const isPro = (d: ProHidDevice) => d.vendorId === 0x057e && d.productId === 0x2009;
function reports(device: ProHidDevice, kind: "inputReports" | "outputReports" = "outputReports") {
  const result: NonNullable<HidCollection["outputReports"]> = [];
  const visit = (collections: HidCollection[]) => { for (const c of collections) { result.push(...c[kind] ?? []); visit(c.children ?? []); } };
  visit(device.collections ?? []); return result;
}

/** Direct Bluetooth/USB setup, with acknowledged commands and live input proof. */
export class ProControllerConnection {
  readonly supported: boolean;
  private current: ProHidDevice | null = null;
  private value: PadState | null = null;
  private lastFrame: number | null = null;
  private ready = false;
  private counter = 0;
  private calibration = defaults();
  private message: Status = { state: "idle", message: "" };
  private listeners = new Set<() => void>();
  private waiters = new Set<(event: ProHidInput | Error) => void>();
  private pending: Promise<boolean> | null = null;
  private step = "idle";
  private sent: { reportId: number; command: number; bytes: number }[] = [];
  private received = new Map<number, { count: number; bytes: number }>();
  private deviceInfo: { name: string; vendor: number; product: number; inputs: { reportId: number; bytes: number }[]; outputs: { reportId: number; bytes: number }[] } | null = null;
  diagnostics() { return { ...this.status(), step: this.step, device: this.deviceInfo, sent: this.sent, received: [...this.received].map(([reportId, value]) => ({ reportId, ...value })) }; }
  constructor(private access?: ProHidAccess, private now = () => Date.now()) {
    this.supported = !!access;
    access?.addEventListener("disconnect", ({ device }) => {
      if (device !== this.current) return;
      this.release(); this.change("disconnected", "Controller disconnected. Reconnect it, then choose Connect Pro Controller.");
    });
    access?.addEventListener("connect", ({ device }) => {
      if (isPro(device) && this.message.state === "disconnected") void this.reconnect();
    });
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private change(state: State, message: string) {
    this.message = { state, message }; for (const fn of this.listeners) fn();
    if (import.meta.env.DEV && typeof window !== "undefined") void fetch("/__controller-diagnostics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.diagnostics()) }).catch(() => {});
  }
  status(): Status {
    if (this.message.state === "connected" && !this.pad()) return { state: "waiting", message: "Controller opened, but input stopped. Focus the game and press a controller button, or reconnect." };
    return this.message;
  }
  pad(): PadState | null { return this.ready && this.current?.opened && this.lastFrame !== null && this.now() - this.lastFrame < 1000 ? this.value : null; }
  id(): string | null { return this.pad() ? `${this.current!.productName || "Pro Controller"} (direct connection)` : null; }
  connect(): Promise<boolean> {
    if (this.pending) return this.pending;
    return this.run(true);
  }
  reconnect(): Promise<boolean> {
    if (this.pending) return this.pending;
    if (this.pad()) return Promise.resolve(true);
    return this.run(false);
  }
  private run(choose: boolean) {
    const task = this.start(choose); this.pending = task;
    void task.finally(() => { if (this.pending === task) this.pending = null; });
    return task;
  }
  private async start(choose: boolean) {
    if (!this.access) { this.change("error", "Direct Pro Controller setup needs Chrome or Edge on HTTPS or localhost. Standard controllers can still use the browser's Gamepad support."); return false; }
    try {
      if (choose) this.change("requesting", "Choose your Pro Controller in the browser device picker.");
      const devices = choose ? await this.access.requestDevice({ filters: [{ vendorId: 0x057e, productId: 0x2009 }] }) : await this.access.getDevices();
      const device = devices.find(isPro);
      if (!device) { if (choose) this.change("idle", "No controller selected. Choose Connect Pro Controller to try again."); return false; }
      await this.release(); this.current = device; this.counter = 0; this.calibration = defaults();
      this.sent = []; this.received.clear(); this.step = "opening controller";
      const describe = (kind: "inputReports" | "outputReports") => reports(device, kind).map(r => ({ reportId: r.reportId, bytes: (r.items ?? []).reduce((n, i) => n + i.reportSize * i.reportCount, 0) / 8 }));
      this.deviceInfo = { name: device.productName, vendor: device.vendorId, product: device.productId, inputs: describe("inputReports"), outputs: describe("outputReports") };
      this.change("initializing", "Setting up Pro Controller…");
      if (!device.opened) await device.open();
      device.addEventListener("inputreport", this.input);
      // USB requires a transport handshake before ordinary subcommands.
      if (reports(device).some(r => r.reportId === 0x80)) {
        this.step = "USB transport setup";
        for (const command of [0x01, 0x02, 0x03, 0x02])
          await this.send(0x80, Uint8Array.of(command), e => e.reportId === 0x81 && e.data.byteLength > 0 && e.data.getUint8(0) === command);
        await device.sendReport(0x80, this.packet(0x80, Uint8Array.of(0x04)));
      }
      // Some Pro-compatible devices do not acknowledge LED commands until the
      // input stream has been enabled. Establish usable input first.
      await this.subcommand(0x03, [0x30]);
      this.step = "waiting for full input reports";
      if (!this.value) await this.wait(e => e.reportId === 0x30 && !!decodeProReport(e.reportId, e.data), 4000);
      try { await this.subcommand(0x30, [0x01], 700, 1); } catch { /* LED support must not block live input. */ }
      try { await this.subcommand(0x40, [0x00], 500, 1); } catch { /* Motion sensors are unused. */ }
      // Factory calibration is optional; clones may not implement SPI reads.
      try { await this.subcommand(0x10, [0x3d, 0x60, 0, 0, 18], 500, 1); } catch { /* Keep conservative stick defaults. */ }
      this.step = "waiting for full input reports";
      if (!this.value) await this.wait(e => e.reportId === 0x30 && !!decodeProReport(e.reportId, e.data), 4000);
      if (!this.current?.opened || !this.value) throw new Error("No controller input received. Focus the game and press a controller button.");
      this.ready = true; this.step = "ready"; this.change("connected", `Controller connected: ${device.productName || "Pro Controller"}. Direct input is active.`);
      return true;
    } catch (error) {
      const disconnected = this.message.state === "disconnected"; await this.release();
      if (!disconnected) this.change("error", `Could not connect Pro Controller during ${this.step}: ${error instanceof Error ? error.message : String(error)} Try reconnecting it and closing other apps using the controller.`);
      return false;
    }
  }
  private packet(id: number, contents: Uint8Array<ArrayBuffer>) {
    // WebHID accepts the actual subcommand length. Avoid forcing descriptor
    // padding onto Bluetooth packets (some compatible controllers reject it).
    if (id === 1) return contents;
    const descriptor = reports(this.current!).find(r => r.reportId === id);
    const bits = descriptor?.items?.reduce((n, item) => n + item.reportSize * item.reportCount, 0);
    const size = bits ? Math.ceil(bits / 8) : id === 0x80 ? 63 : 47;
    const packet = new Uint8Array(Math.max(size, contents.length)); packet.set(contents); return packet;
  }
  private subcommand(command: number, data: number[], timeout = 1500, attempts = 2) {
    this.step = ({ 0x30: "player-light setup", 0x40: "motion setup", 0x03: "full input mode", 0x10: "stick calibration" } as Record<number, string>)[command] ?? "controller setup";
    const bytes = Uint8Array.from([0, 0, 1, 0x40, 0x40, 0, 1, 0x40, 0x40, command, ...data]);
    return this.send(0x01, bytes, e => command === 3 && e.reportId === 0x30 && !!decodeProReport(e.reportId, e.data) || e.reportId === 0x21 && e.data.byteLength >= 14 && e.data.getUint8(13) === command && !!(e.data.getUint8(12) & 0x80), timeout, attempts);
  }
  private async send(id: number, contents: Uint8Array<ArrayBuffer>, matches: (e: ProHidInput) => boolean, timeout = 1500, attempts = 2) {
    for (let attempt = 0; ; attempt++) {
      try {
        if (id === 0x01) contents[0] = this.counter++ & 15;
        let packet = this.packet(id, contents);
        if (id === 1 && attempt > 0) {
          const descriptor = reports(this.current!).find(r => r.reportId === 1);
          const size = Math.ceil((descriptor?.items ?? []).reduce((n, item) => n + item.reportCount * item.reportSize, 0) / 8) || 48;
          const padded = new Uint8Array(Math.max(size, packet.length)); padded.set(packet); packet = padded;
        }
        this.sent.push({ reportId: id, command: id === 1 ? contents[9] : contents[0], bytes: packet.byteLength });
        await this.wait(matches, timeout, () => this.current!.sendReport(id, packet)); return;
      } catch (error) { if (!this.current || attempt + 1 >= attempts) throw error; }
    }
  }
  private wait(matches: (e: ProHidInput) => boolean, timeout: number, write?: () => Promise<void>) {
    return new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => { clearTimeout(timer); this.waiters.delete(listener); if (error) reject(error); else resolve(); };
      const listener = (event: ProHidInput | Error) => { if (event instanceof Error) finish(event); else if (matches(event)) finish(); };
      const timer = setTimeout(() => finish(new Error("Controller did not acknowledge setup or send input.")), timeout);
      this.waiters.add(listener); if (write) void write().catch(error => finish(error instanceof Error ? error : new Error(String(error))));
    });
  }
  private input = (event: ProHidInput) => {
    const { data, reportId } = event;
    const previous = this.received.get(reportId); this.received.set(reportId, { count: (previous?.count ?? 0) + 1, bytes: data.byteLength });
    if (reportId === 0x21 && data.byteLength >= 37 && data.getUint8(13) === 0x10 && data.getUint16(14, true) === 0x603d && data.getUint8(18) >= 18) {
      const maxL = unpack(data, 19), centerL = unpack(data, 22), minL = unpack(data, 25);
      const centerR = unpack(data, 28), minR = unpack(data, 31), maxR = unpack(data, 34);
      const centers = [...centerL, ...centerR], mins = [...minL, ...minR], maxs = [...maxL, ...maxR];
      const calibration = centers.map((center, i) => ({ center, min: mins[i], max: maxs[i] }));
      if (calibration.every(c => c.center > 512 && c.center < 3584 && c.min > 128 && c.max > 128)) this.calibration = calibration;
    }
    const value = decodeProReport(reportId, data, this.calibration);
    if (value) { this.value = value; this.lastFrame = this.now(); }
    for (const listener of [...this.waiters]) listener(event);
  };
  private release() {
    this.ready = false; this.value = null; this.lastFrame = null;
    for (const listener of [...this.waiters]) listener(new Error("Controller disconnected."));
    const old = this.current; this.current = null;
    old?.removeEventListener("inputreport", this.input);
    return old?.opened ? old.close().catch(() => {}) : Promise.resolve();
  }
}
const access = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { hid?: ProHidAccess }).hid;
export const proController = new ProControllerConnection(access);
