import { test, expect } from "@playwright/test";

test("Mystic Caverns mushrooms have explicit sizes that match preview and gameplay", async ({ page }, info) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  const name = "official/spooky-places/Mystic Caverns";
  const level = await page.evaluate(name => window.__game!.customLevels.load(name), name);
  const mushrooms = level.prefabs.filter(p => p.kind === "glow-mushroom");
  expect(mushrooms.length).toBeGreaterThan(10); expect(mushrooms.every(p => typeof p.resizeScale === "number")).toBe(true);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-levels").selectOption(name);
  await expect(page.locator("#editor-status")).toContainText(`Opened ${name}`);
  await page.locator("#editor-preview").click();
  const preview = (await page.evaluate(() => window.__game!.inspectPreview())).prefabs;
  const first = mushrooms.find(p => !p.locked && !p.group)!;
  expect(first).toBeTruthy();
  await page.getByRole("button", { name: "Expand Prefab: glow-mushroom", exact: true }).click();
  await page.locator(`li[data-key="prefab:${first.id}"] span`).click(); await page.locator("#editor-frame-selection").click();
  await page.locator("#level-editor canvas").screenshot({ path: info.outputPath("mystic-mushroom-preview.png") });
  await page.evaluate(() => { window.__game!.startTrack("custom:mystic-caverns"); window.__game!.pause(true); });
  for (const p of mushrooms) {
    const actual = await page.evaluate(id => window.__game!.prefabBounds(id), p.id);
    const expected = preview.find(model => model.id === p.id)!;
    expect(actual, p.id).not.toBeNull();
    for (const bound of ["min", "max"] as const) actual![bound].forEach((value, axis) => expect(value, `${p.id} ${bound}[${axis}]`).toBeCloseTo(expected[bound][axis], 3));
  }
  await page.evaluate(p => window.__game!.frameSpot(p.x, (p.y ?? 0) + 1.5 * p.resizeScale!, p.z, 12 * p.resizeScale!, -Math.PI / 2, 0.35), first);
  await page.screenshot({ path: info.outputPath("mystic-mushroom-gameplay.png") });
});
