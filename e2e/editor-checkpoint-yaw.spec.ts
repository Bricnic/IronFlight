import { test, expect } from "@playwright/test";

test("checkpoints without saved rotation expose yaw in degrees and retain edits in playtests", async ({ page }) => {
  test.slow();
  const name = "e2e-checkpoint-yaw";
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill(name); await page.locator("#editor-new").click();
  await page.locator('li[data-key="checkpoint:0"] span').click();
  expect(await page.evaluate(() => window.__game!.editor().selectedObject?.yaw)).toBeUndefined();
  const yaw = page.locator('#editor-props input[data-prop="yaw"]');
  await expect(yaw).toBeVisible();
  await expect(yaw).toHaveValue("");
  await expect(yaw).toHaveAttribute("placeholder", "Automatic (route direction)");
  const height = page.locator('#editor-props input[data-prop="y"]');
  await height.fill("3"); await height.dispatchEvent("change");
  expect(await page.evaluate(() => window.__game!.editor().selectedObject?.yaw)).toBeUndefined();
  for (const degrees of [90, -45, 720]) {
    await yaw.fill(String(degrees)); await yaw.dispatchEvent("change");
    await expect(yaw).toHaveValue(String(degrees));
    expect(await page.evaluate(() => window.__game!.editor().selectedObject?.yaw)).toBeCloseTo(degrees * Math.PI / 180);
  }
  await yaw.fill("90"); await yaw.dispatchEvent("change");
  await page.locator("#editor-add-checkpoint").click();
  await expect(yaw).toBeVisible(); await expect(yaw).toHaveValue("");
  await yaw.fill("-45"); await yaw.dispatchEvent("change");
  // Auto-numbering prepends: the new gate is checkpoint:0, the 90° gate shifts to 1.
  await page.locator('li[data-key="checkpoint:1"] span').click();
  try {
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    const saved = await page.evaluate(name => window.__game!.customLevels.load(name), name);
    expect(saved.checkpoints[0].yaw).toBeCloseTo(-Math.PI / 4);
    expect(saved.checkpoints[1].yaw).toBeCloseTo(Math.PI / 2);
    await page.locator("#editor-levels").selectOption(name);
    await expect(page.locator("#editor-status")).toContainText(`Opened ${name}`);
    await page.locator('li[data-key="checkpoint:1"] span').click();
    await expect(yaw).toHaveValue("90");
    await page.locator("#editor-playtest").click();
    await expect(page.locator("#level-editor")).toBeHidden();
    const gate = await page.evaluate(() => {
      const g = window.__game!; return g.track(g.snapshot().run!.trackId).checkpoints[0];
    });
    expect(gate.yaw).toBeCloseTo(-Math.PI / 4); expect(gate.nx).toBeCloseTo(-Math.SQRT1_2); expect(gate.nz).toBeCloseTo(Math.SQRT1_2);
  } finally {
    await page.evaluate(name => window.__game!.customLevels.remove(name).catch(() => {}), name);
  }
});
