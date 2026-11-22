import { test, expect } from "@playwright/test";
import { Vector3, Euler } from "three";
test("resize drags face corners in object space, undoes once, and resizes gameplay prefabs", async ({ page }) => {
  test.slow();
  const name = "e2e-resize";
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill(name); await page.locator("#editor-new").click();
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  const number = async (key: string, value: number) => { const input = page.locator(`#editor-props [data-prop="${key}"]`); await input.fill(String(value)); await input.dispatchEvent("change"); };
  const drag = async (start: { x: number; y: number; z: number }, end: { x: number; y: number; z: number }) => {
    const points = await page.evaluate(points => points.map(p => window.__game!.editorProject(p)), [start, end]);
    await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
    await page.mouse.move(points[1].x, points[1].y, { steps: 6 }); await page.mouse.up();
  };
  try {
    await page.locator("#editor-solid-kind").selectOption("tile"); await page.locator("#editor-add-solid").click();
    for (const [k, v] of Object.entries({ x: 0, y: 2, z: 0, w: 10, h: 4, d: 12 })) await number(k, v);
    await page.locator("#editor-tool-resize").click(); await page.locator("#editor-frame-selection").click();
    await drag({ x: 4.7, y: 4, z: 5.7 }, { x: 6.7, y: 4, z: 7.7 });
    let object = await page.evaluate(() => window.__game!.editor().selectedObject!);
    expect(object.w).toBeCloseTo(12, 1); expect(object.d).toBeCloseTo(14, 1);
    expect((object.x as number) - (object.w as number) / 2).toBeCloseTo(-5);
    await page.locator("#editor-undo").click(); await expect(page.locator('[data-prop="w"]')).toHaveValue("10");
    await number("yaw", 45); await page.locator("#editor-frame-selection").click();
    const q = new Euler(0, Math.PI / 4, 0, "YXZ");
    const a = new Vector3(4.7, 2, 5.7).applyEuler(q).add(new Vector3(0, 2, 0));
    const b = new Vector3(6.7, 2, 7.7).applyEuler(q).add(new Vector3(0, 2, 0));
    await drag(a, b);
    object = await page.evaluate(() => window.__game!.editor().selectedObject!);
    expect(object.w).toBeCloseTo(12, 1); expect(object.d).toBeCloseTo(14, 1);
    await page.locator("#editor-undo").click();
    await page.locator("#editor-prefab-kind").selectOption("fragile-ice"); await page.locator("#editor-add-prefab").click();
    await number("y", 6);
    await page.locator("#editor-add-prefab").click(); await number("x", 8); await number("y", 6);
    await page.locator('li[data-key="prefab:fragile-ice-2"] span').click();
    await page.locator('li[data-key="prefab:fragile-ice-1"] span').click({ modifiers: ["Control"] });
    await page.locator("#editor-group").click();
    await page.locator("#editor-frame-selection").click();
    await drag({ x: 2.3, y: 6.02, z: 2.3 }, { x: 4.3, y: 6.02, z: 4.3 });
    object = await page.evaluate(() => window.__game!.editor().selectedObject!);
    expect(object.resizeScale).toBeGreaterThan(1.3);
    await page.locator("#editor-save").click(); await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    const saved = await page.evaluate(name => window.__game!.customLevels.load(name), name);
    expect(saved.prefabs).toHaveLength(2);
    for (const prefab of saved.prefabs) expect(prefab.resizeScale).toBeCloseTo(object.resizeScale as number);
    await page.locator("#editor-playtest").click(); await expect(page.locator("#run-progress")).toBeVisible();
    const runtime = await page.evaluate(() => window.__game!.resizedPrefabs());
    expect(runtime[0].scale).toBeCloseTo(object.resizeScale as number);
    expect(runtime[0].colliders).toBeGreaterThan(0);
    await page.screenshot({ path: "artifacts/editor-resized-ice-playtest.png" });
  } finally {
    await page.evaluate(name => window.__game!.customLevels.remove(name), name).catch(() => {});
  }
});
