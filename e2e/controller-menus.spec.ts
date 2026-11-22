import { test, expect, type Page } from "@playwright/test";

declare global {
  interface Window { __menuPad: { id: string; connected: boolean; axes: number[]; buttons: { pressed: boolean; value: number }[] } }
}
test.slow();
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "low", input: "controller" }));
    window.__menuPad = { id: "Menu test controller", connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, "getGamepads", { value: () => [window.__menuPad] });
  });
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install(); await page.clock.pauseAt(new Date());
});
async function control(page: Page, x = 0, y = 0, button = -1, release = true) {
  await page.evaluate(({ x, y, button, release }) => {
    const p = window.__menuPad;
    p.axes = [x, y, 0, 0]; p.buttons.forEach((b, i) => { b.pressed = i === button; b.value = b.pressed ? 1 : 0; });
    window.__game!.driveFrames(0, 1, () => ({}), false);
    if (release) { p.axes = [0, 0, 0, 0]; p.buttons.forEach(b => { b.pressed = false; b.value = 0; }); window.__game!.driveFrames(0, 1, () => ({}), false); }
  }, { x, y, button, release });
}

test("left stick and d-pad browse collections and tracks; held A cannot start twice; B goes back", async ({ page }, info) => {
  const collections = page.locator(".collection-pick");
  await expect(collections.first()).toBeFocused();
  await control(page, 1); await expect(collections.nth(1)).toBeFocused();
  await control(page, 0, 0, 0, false);
  await expect(page.locator(".collection-tracks")).toBeVisible();
  await control(page, 0, 0, 0, false);
  await expect(page.locator("#level-select")).toBeVisible();
  await control(page); await control(page, 0, 0, 1);
  await expect(collections.nth(1)).toBeFocused();
  await control(page, 0, 0, 0);
  await control(page, 0, 0, 15);
  await expect(page.locator(".track-play").nth(1)).toBeFocused();
  await expect(page.locator(".track-card").nth(1)).toHaveCSS("border-color", "rgb(244, 163, 81)");
  await page.screenshot({ path: info.outputPath("controller-level-select.png") });
  await control(page, 0, 0, 0);
  await expect(page.locator("#level-select")).toBeHidden();
});

test("left stick navigates pause and vehicle options, A picks a vehicle and B returns", async ({ page }, info) => {
  await page.evaluate(() => window.__game!.select("easy"));
  await control(page, 0, 0, 9);
  await expect(page.locator("#pause-resume")).toBeFocused();
  await control(page, 0, 1); await expect(page.locator("#pause-reset")).toBeFocused();
  await control(page, 0, 1); await expect(page.locator("#pause-levels")).toBeFocused();
  await control(page, 0, 0, 13); await expect(page.locator("#pause-vehicles")).toBeFocused();
  await control(page, 0, 0, 0);
  await expect(page.locator("#vehicle-select")).toBeVisible();
  const first = await page.locator(".vehicle-pick:focus").getAttribute("aria-label");
  await control(page, 1);
  await expect(page.locator(".vehicle-pick:focus")).not.toHaveAttribute("aria-label", first!);
  await expect(page.locator(".vehicle-card:has(button:focus)")).toHaveCSS("border-color", "rgb(244, 163, 81)");
  const picked = await page.locator(".vehicle-card:has(button:focus)").getAttribute("data-vehicle");
  await page.screenshot({ path: info.outputPath("controller-vehicle-select.png") });
  await control(page, 0, 0, 0);
  expect(await page.evaluate(() => localStorage.getItem("vehicle"))).toBe(picked);
  await page.getByRole("button", { name: "Select vehicle", exact: true }).focus();
  await control(page, 0, 0, 0);
  await control(page, 0, 0, 1); await expect(page.locator("#vehicle-select")).toBeHidden();
});

test("game-over options support stick navigation, A retry and B level select", async ({ page }, info) => {
  async function wreck() {
    await page.evaluate(() => {
      const g = window.__game!; g.startTrack("haunted-hollow"); g.pause(true);
      g.advanceFrames(150, 16, {}); g.advanceFrames(301, 1, {});
    });
    await expect(page.locator("#track-result")).toBeVisible();
    expect(await page.evaluate(() => window.__game!.snapshot().run?.status)).toBe("failed");
  }
  await wreck();
  await control(page, 0, 1); await expect(page.locator("#result-level-select")).toBeFocused();
  await control(page, 0, -1); await expect(page.locator("#retry-track")).toBeFocused();
  await page.screenshot({ path: info.outputPath("controller-game-over.png") });
  await control(page, 0, 0, 0);
  expect(await page.evaluate(() => window.__game!.snapshot().run?.status)).toBe("running");
  await wreck(); await control(page, 0, 0, 1);
  await expect(page.locator("#track-result")).toBeHidden(); await expect(page.locator("#level-select")).toBeVisible();
});

test("B handbrakes during gameplay and releasing it restores controller acceleration", async ({ page }) => {
  const speeds = await page.evaluate(() => {
    const g = window.__game!, p = window.__menuPad;
    g.select("easy"); g.pause(true);
    p.buttons[7] = { pressed: true, value: 1 };
    p.buttons[1] = { pressed: true, value: 1 };
    g.advanceFrames(120, 1);
    const held = Math.abs(g.snapshot().signedSpeed);
    p.buttons[1] = { pressed: false, value: 0 };
    g.advanceFrames(120, 1);
    return { held, released: g.snapshot().signedSpeed };
  });
  expect(speeds.held).toBeLessThan(0.5);
  expect(speeds.released).toBeGreaterThan(1);
  await expect(page.locator("#level-select")).toBeHidden();
  await expect(page.locator("#pause-menu")).toBeHidden();
});

test("pause Reset level and Y restart the current course and resume; held Y does not repeat", async ({ page }, info) => {
  await page.evaluate(() => { const g = window.__game!; g.startTrack("foundry-run"); g.advanceFrames(60, 1, {}); });
  expect(await page.evaluate(() => window.__game!.snapshot().run?.elapsed)).toBeGreaterThan(0.5);
  await control(page, 0, 0, 9);
  await control(page, 0, 1); await expect(page.locator("#pause-reset")).toBeFocused();
  await page.screenshot({ path: info.outputPath("pause-reset-level.png") });
  await control(page, 0, 0, 0);
  await expect(page.locator("#pause-menu")).toBeHidden();
  expect(await page.evaluate(() => window.__game!.snapshot().run)).toMatchObject({ trackId: "foundry-run", status: "running", elapsed: 0 });
  await page.clock.runFor(50);
  expect(await page.evaluate(() => window.__game!.snapshot().run?.elapsed)).toBeGreaterThan(0);
  await control(page, 0, 0, 9);
  await control(page, 0, 0, 3, false);
  await expect(page.locator("#pause-menu")).toBeHidden();
  expect(await page.evaluate(() => window.__game!.snapshot().run?.elapsed)).toBe(0);
  await page.evaluate(() => window.__game!.driveFrames(60, 1, () => ({}), false));
  expect(await page.evaluate(() => window.__game!.snapshot().run?.elapsed)).toBeGreaterThan(0.5);
  await control(page);
  await control(page, 0, 0, 3);
  expect(await page.evaluate(() => window.__game!.snapshot().run)).toMatchObject({ trackId: "foundry-run", status: "running", elapsed: 0 });
  await page.getByRole("button", { name: "Select level", exact: true }).click();
  await control(page, 0, 0, 3);
  await expect(page.locator("#level-select")).toBeVisible();
});
