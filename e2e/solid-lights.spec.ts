import { test, expect } from "@playwright/test";

test.slow();
test.beforeEach(async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
});
test("solid light controls, gold-star defaults and mixed bulk edits reach preview, disk and gameplay", async ({ page }) => {
  const name = "e2e-solid-lights";
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill(name); await page.locator("#editor-new").click();
  try {
    await page.locator('li[data-key="solid:road-1"] span').click();
    await expect(page.locator('[data-prop="lightLumens"]')).toHaveValue("0");
    await page.locator('[data-prop="lightLumens"]').fill("50"); await page.locator('[data-prop="lightLumens"]').dispatchEvent("change");
    await page.locator('[data-prop="lightColor"]').evaluate((node: HTMLInputElement) => { node.value = "#4ff5e0"; node.dispatchEvent(new Event("change")); });
    await page.locator("#editor-prefab-kind").selectOption("gold-star"); await page.locator("#editor-add-prefab").click();
    await expect(page.locator('[data-prop="lightLumens"]')).toHaveValue("300");
    await expect(page.locator('[data-prop="lightColor"]')).toHaveValue("#ffe6a3");
    await page.locator("#editor-preview").click();
    const lights = (await page.evaluate(() => window.__game!.inspectPreview())).prefabLights;
    expect(lights).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "road-1", lumens: 50, color: 0x4ff5e0 }),
      expect.objectContaining({ id: "gold-star-1", lumens: 300, color: 0xffe6a3 }),
    ]));
    await page.locator('li[data-key="solid:road-1"] span').click({ modifiers: ["Shift"] });
    await expect(page.locator('[data-prop="lightLumens"]')).toHaveAttribute("placeholder", "(various)");
    await page.locator('[data-prop="lightLumens"]').fill("75"); await page.locator('[data-prop="lightLumens"]').dispatchEvent("change");
    await page.locator("#editor-save").click(); await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    const saved = await page.evaluate(name => window.__game!.customLevels.load(name), name);
    expect(saved.solids.find(s => s.id === "road-1")).toMatchObject({ lightLumens: 75, lightColor: 0x4ff5e0 });
    expect(saved.prefabs[0].lightLumens).toBe(75);
    await page.locator("#editor-playtest").click(); await expect(page.locator("#level-editor")).toBeHidden({ timeout: 20000 });
    const game = (await page.evaluate(() => window.__game!.stats())).prefabLights;
    expect(game.filter(p => Math.abs(p.lumens - 75) < 0.01)).toHaveLength(2);
  } finally { await page.evaluate(name => window.__game!.customLevels.remove(name), name); }
});

test("all cave roads have teal output and legacy gold stars also emit soft yellow", async ({ page }, info) => {
  for (const name of ["Mystic Caverns", "Firefly Grotto", "Lavabridge Abyss"]) {
    const level = await page.evaluate(name => window.__game!.customLevels.load(`official/spooky-places/${name}`), name);
    const roads = level.solids.filter(s => s.kind === "road");
    expect(roads.length).toBeGreaterThan(0);
    expect(roads.every(s => s.lightLumens === 50 && s.lightColor === 0x4ff5e0)).toBe(true);
  }
  await page.evaluate(() => { window.__game!.startTrack("custom:mystic-caverns"); window.__game!.pause(true); });
  const actual = (await page.evaluate(() => window.__game!.stats())).prefabLights;
  expect(actual.some(p => Math.abs(p.lumens - 50) < 0.01 && p.color === 0x4ff5e0)).toBe(true);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.__game!.frameSpot(-10.5, 1.2, -185, 9.6, -Math.PI / 2, 0.35));
  await page.screenshot({ path: info.outputPath("cave-road-lighting.png") });
  await page.evaluate(() => { window.__game!.startTrack("foundry-run"); window.__game!.pause(true); });
  expect((await page.evaluate(() => window.__game!.stats())).prefabLights).toEqual(expect.arrayContaining([expect.objectContaining({ lumens: 300, color: 0xffe6a3 })]));
});
