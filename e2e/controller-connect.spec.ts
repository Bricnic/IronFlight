import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    __proTest: { packets: { id: number; data: number[] }[]; cancelled: boolean; frame(right: number, shared?: number): void; disconnect(): void; getRequests(): number };
  }
}
test.slow();
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "getGamepads", { value: () => [] });
    const hid = new EventTarget(), device = new EventTarget(); let requests = 0;
    const packets: { id: number; data: number[] }[] = [];
    const emit = (reportId: number, bytes: Uint8Array) => {
      const event = new Event("inputreport"); Object.assign(event, { reportId, data: new DataView(bytes.buffer), device }); device.dispatchEvent(event);
    };
    const frame = (right: number, shared = 0) => {
      const bytes = new Uint8Array(48); bytes[2] = right; bytes[3] = shared; bytes.set([0, 8, 128, 0, 8, 128], 5); emit(0x30, bytes);
    };
    const mock = { packets, cancelled: false, frame, getRequests: () => requests,
      disconnect: () => { const event = new Event("disconnect"); Object.assign(event, { device }); hid.dispatchEvent(event); } };
    window.__proTest = mock;
    Object.assign(device, {
      vendorId: 0x057e, productId: 0x2009, productName: "Pro Controller", opened: false, collections: [],
      open: async () => { Object.assign(device, { opened: true }); }, close: async () => { Object.assign(device, { opened: false }); },
      sendReport: async (id: number, data: Uint8Array) => {
        packets.push({ id, data: Array.from(data) });
        const bytes = new Uint8Array(48); bytes[12] = 0x80; bytes[13] = data[9];
        queueMicrotask(() => emit(0x21, bytes));
        if (data[9] === 0x03) queueMicrotask(() => frame(0));
      },
    });
    Object.assign(hid, { requestDevice: async () => { requests++; return mock.cancelled ? [] : [device]; }, getDevices: async () => [device] });
    Object.defineProperty(navigator, "hid", { value: hid, configurable: true });
  });
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
});

test("Connect Pro Controller performs the handshake and drives the game without Gamepad API detection", async ({ page }, info) => {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator("#input-status")).toContainText("none detected");
  await page.getByRole("button", { name: "Connect Pro Controller", exact: true }).click();
  await expect(page.locator("#input-status")).toContainText("Controller connected: Pro Controller");
  await expect(page.locator('[data-input="controller"] button')).toHaveAttribute("aria-checked", "true");
  const packets = await page.evaluate(() => window.__proTest.packets.map(p => [p.id, p.data[9], p.data[10]]));
  expect(packets).toContainEqual([1, 0x30, 1]); expect(packets).toContainEqual([1, 3, 0x30]);
  await page.screenshot({ path: info.outputPath("pro-controller-connected.png") });
  await page.evaluate(() => { window.__game!.select("easy"); window.__game!.pause(false); window.__proTest.frame(0x80); });
  // Keep receiving reports, as the real controller does, while advancing gameplay.
  for (let i = 0; i < 6; i++) { await page.evaluate(() => window.__proTest.frame(0x80)); await page.clock.runFor(150); }
  const speed = await page.evaluate(() => window.__game!.snapshot().speed);
  expect(speed).toBeGreaterThan(0.5);
  await page.evaluate(() => window.__proTest.frame(0, 0x02)); await page.clock.runFor(20);
  await expect(page.locator("#pause-menu")).toBeVisible();
  await page.evaluate(() => window.__proTest.disconnect());
  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
  await expect(page.locator("#input-status")).toContainText("Controller disconnected");
});

test("cancelling the chooser keeps the page usable and retry connects", async ({ page }) => {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.evaluate(() => { window.__proTest.cancelled = true; });
  await page.getByRole("button", { name: "Connect Pro Controller", exact: true }).click();
  await expect(page.locator("#input-status")).toContainText("No controller selected");
  await expect(page.getByRole("button", { name: "Connect Pro Controller", exact: true })).toBeEnabled();
  await page.evaluate(() => { window.__proTest.cancelled = false; });
  await page.getByRole("button", { name: "Connect Pro Controller", exact: true }).click();
  await expect(page.locator("#input-status")).toContainText("Controller connected");
});
