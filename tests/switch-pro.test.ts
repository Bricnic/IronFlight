import { afterEach, expect, it, vi } from "vitest";
import { decodeProReport, ProControllerConnection, type ProHidDevice, type ProHidAccess } from "../src/switch-pro";

function report(buttons = [0, 0, 0]) {
  const bytes = new Uint8Array(48); bytes.set(buttons, 2);
  bytes.set([0, 8, 128, 0, 8, 128], 5); return new DataView(bytes.buffer);
}
function fixture(ack = true) {
  let input: ((event: { reportId: number; data: DataView }) => void) | undefined;
  let disconnect: ((event: { device: ProHidDevice }) => void) | undefined;
  const device: ProHidDevice = {
    vendorId: 0x057e, productId: 0x2009, productName: "Pro Controller", opened: false, collections: [],
    open: vi.fn(async () => { device.opened = true; }), close: vi.fn(async () => { device.opened = false; }),
    addEventListener: (_type, fn) => { input = fn; }, removeEventListener: () => { input = undefined; },
    sendReport: vi.fn(async (_id, bytes) => {
      if (!ack) return;
      const reply = new Uint8Array(48); reply[12] = 0x80; reply[13] = bytes[9];
      queueMicrotask(() => input?.({ reportId: 0x21, data: new DataView(reply.buffer) }));
      if (bytes[9] === 0x03) queueMicrotask(() => input?.({ reportId: 0x30, data: report() }));
    }),
  };
  const access: ProHidAccess = {
    requestDevice: vi.fn(async () => [device]), getDevices: vi.fn(async () => [device]),
    addEventListener: (type, fn) => { if (type === "disconnect") disconnect = fn; },
  };
  return { device, access, frame: (data: DataView) => input?.({ reportId: 0x30, data }), disconnect: () => disconnect?.({ device }) };
}
afterEach(() => vi.useRealTimers());
it("decodes packed sticks, Nintendo A/ZR/ZL, Plus and d-pad into the driving scheme", () => {
  const data = report([0x88, 0x02, 0x82]);
  const state = decodeProReport(0x30, data)!;
  expect(state.axes).toEqual([0, 0, 0, 0]);
  for (const index of [0, 6, 7, 9, 12]) expect(state.buttons[index].pressed).toBe(true);
  expect(decodeProReport(0x30, report([0x04, 0, 0]))?.buttons[1].pressed).toBe(true);
  expect(decodeProReport(0x3f, data)).toBeNull(); expect(decodeProReport(0x30, new DataView(new ArrayBuffer(2)))).toBeNull();
});
it("actively requests access, enables full reports and sets a steady player light before ready", async () => {
  const f = fixture(); const connection = new ProControllerConnection(f.access);
  expect(await connection.connect()).toBe(true);
  expect(f.access.requestDevice).toHaveBeenCalledWith({ filters: [{ vendorId: 0x057e, productId: 0x2009 }] });
  const packets = vi.mocked(f.device.sendReport).mock.calls.map(([id, bytes]) => [id, bytes[9], bytes[10]]);
  expect(packets).toContainEqual([0x01, 0x30, 0x01]); expect(packets).toContainEqual([0x01, 0x03, 0x30]);
  expect(connection.pad()).not.toBeNull(); expect(connection.status().state).toBe("connected");
  f.disconnect(); expect(connection.pad()).toBeNull(); expect(connection.status().state).toBe("disconnected");
});
it("does not call a successful write a connection when no acknowledgement/input arrives", async () => {
  vi.useFakeTimers(); const f = fixture(false); const connection = new ProControllerConnection(f.access);
  const connected = connection.connect(); await vi.advanceTimersByTimeAsync(10000);
  expect(await connected).toBe(false); expect(connection.pad()).toBeNull(); expect(connection.status().state).toBe("error");
  expect(f.device.close).toHaveBeenCalled();
});
it("reconnects previously granted devices without showing another chooser and drops stale input", async () => {
  vi.useFakeTimers(); const f = fixture(); const connection = new ProControllerConnection(f.access);
  expect(await connection.reconnect()).toBe(true); expect(f.access.requestDevice).not.toHaveBeenCalled();
  f.frame(report([0x80, 0, 0])); expect(connection.pad()?.buttons[7].pressed).toBe(true);
  await vi.advanceTimersByTimeAsync(1100); expect(connection.pad()).toBeNull();
});
it("handles chooser cancellation, denied access and unsupported browsers without crashing", async () => {
  expect(await new ProControllerConnection().connect()).toBe(false);
  const f = fixture(); vi.mocked(f.access.requestDevice).mockResolvedValue([]);
  const c = new ProControllerConnection(f.access); expect(await c.connect()).toBe(false); expect(c.status().state).toBe("idle");
  vi.mocked(f.access.requestDevice).mockRejectedValue(new Error("Access denied"));
  expect(await c.connect()).toBe(false); expect(c.status().message).toContain("Access denied");
});
it("starts input before lights and uses compact commands even with 48-byte Bluetooth descriptors", async () => {
  const f = fixture();
  f.device.collections = [{ outputReports: [{ reportId: 1, items: [{ reportSize: 8, reportCount: 48 }] }] }];
  const original = vi.mocked(f.device.sendReport).getMockImplementation()!;
  vi.mocked(f.device.sendReport).mockImplementation(async (id, bytes) => {
    if (bytes.length === 48) return; // Simulate a device that rejects descriptor padding.
    return original(id, bytes);
  });
  const c = new ProControllerConnection(f.access);
  expect(await c.connect()).toBe(true);
  const calls = vi.mocked(f.device.sendReport).mock.calls;
  expect(calls[0][1][9]).toBe(3); expect(calls[0][1].length).toBe(11);
  expect(calls.findIndex(([, bytes]) => bytes[9] === 0x30)).toBeGreaterThan(0);
});
it("retries with descriptor padding for controllers that require full-sized packets", async () => {
  vi.useFakeTimers(); const f = fixture();
  f.device.collections = [{ outputReports: [{ reportId: 1, items: [{ reportSize: 8, reportCount: 48 }] }] }];
  const original = vi.mocked(f.device.sendReport).getMockImplementation()!;
  vi.mocked(f.device.sendReport).mockImplementation(async (id, bytes) => {
    if (bytes.length === 48) return original(id, bytes);
  });
  const c = new ProControllerConnection(f.access); const connected = c.connect();
  await vi.advanceTimersByTimeAsync(4000);
  expect(await connected).toBe(true);
  const calls = vi.mocked(f.device.sendReport).mock.calls;
  expect(calls[0][1].length).toBe(11); expect(calls[1][1].length).toBe(48);
});
it("accepts live input as mode confirmation and does not require optional setup acknowledgements", async () => {
  vi.useFakeTimers(); const f = fixture(false);
  vi.mocked(f.device.sendReport).mockImplementation(async (_id, bytes) => {
    if (bytes[9] === 3) queueMicrotask(() => f.frame(report()));
  });
  const c = new ProControllerConnection(f.access); const connected = c.connect();
  await vi.advanceTimersByTimeAsync(1800); f.frame(report([0x80, 0, 0]));
  expect(await connected).toBe(true); expect(c.pad()?.buttons[7].pressed).toBe(true);
});
it("performs the USB transport handshake before enabling controller input", async () => {
  const f = fixture();
  f.device.collections = [{ outputReports: [{ reportId: 0x80, items: [{ reportSize: 8, reportCount: 63 }] }] }];
  const original = vi.mocked(f.device.sendReport).getMockImplementation()!;
  let input: ((event: { reportId: number; data: DataView }) => void) | undefined;
  const attach = f.device.addEventListener;
  f.device.addEventListener = (type, fn) => { input = fn; attach(type, fn); };
  vi.mocked(f.device.sendReport).mockImplementation(async (id, bytes) => {
    if (id !== 0x80) return original(id, bytes);
    if (bytes[0] !== 4) queueMicrotask(() => input?.({ reportId: 0x81, data: new DataView(Uint8Array.of(bytes[0]).buffer) }));
  });
  const c = new ProControllerConnection(f.access);
  expect(await c.connect()).toBe(true);
  const calls = vi.mocked(f.device.sendReport).mock.calls;
  expect(calls.slice(0, 5).map(([id, bytes]) => [id, bytes[0], bytes.length])).toEqual([
    [0x80, 1, 63], [0x80, 2, 63], [0x80, 3, 63], [0x80, 2, 63], [0x80, 4, 63],
  ]);
  expect(calls[5][1][9]).toBe(3);
});
