import { test, expect } from "@playwright/test";

test("world grid visibility, per-axis and multiple-object snapping, drag and Control bypass", async ({ page }, info) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill("Grid verification"); await page.locator("#editor-new").click();
  const probe = () => page.evaluate(() => window.__game!.inspectPreview());
  const state = () => page.evaluate(() => window.__game!.editor());
  const field = (key: string) => page.locator(`#editor-props [data-prop="${key}"]`);
  const set = async (key: string, value: number) => { await field(key).fill(String(value)); await field(key).dispatchEvent("change"); };
  expect((await probe()).grid.spacing).toBe(5);
  await page.locator("#editor-world-settings summary").click();
  await page.locator("#editor-grid-y").check();
  expect((await probe()).grid.axes).toEqual(["world-grid-x", "world-grid-y", "world-grid-z"]);
  await page.locator("#editor-grid-x").uncheck(); expect((await probe()).grid.axes).not.toContain("world-grid-x");
  await page.locator("#editor-grid-show").uncheck(); expect((await probe()).gridVisible).toBe(false);
  await page.locator("#editor-grid-show").check(); await page.locator("#editor-grid-x").check();
  await page.locator("#editor-solid-kind").selectOption("barrier"); await page.locator("#editor-add-solid").click();
  for (const [key, value] of Object.entries({ x: 6.2, y: 7.8, z: -8.1, w: 12, h: 10, d: 12 })) await set(key, value);
  await page.locator("#editor-snap-x").click(); expect((await state()).selectedObject).toMatchObject({ x: 5, y: 7.8, z: -8.1 });
  await page.locator("#editor-snap-y").click(); await page.locator("#editor-snap-z").click();
  expect((await state()).selectedObject).toMatchObject({ x: 5, y: 10, z: -10 });
  await page.locator("#editor-frame-selection").click();
  await page.locator("#level-editor canvas").screenshot({ path: info.outputPath("colored-world-grid.png") });
  await page.locator("#editor-grid-snap").check();
  const at = await page.evaluate(() => window.__game!.editorProject({ x: 5, y: 10, z: -10 }));
  await page.mouse.move(at.x, at.y); await page.mouse.down();
  await page.mouse.move(at.x + 67, at.y + 23, { steps: 6 });
  const snapped = (await state()).selectedObject!;
  for (const axis of ["x", "y", "z"]) expect(Number(snapped[axis]) / 5).toBeCloseTo(Math.round(Number(snapped[axis]) / 5));
  await page.keyboard.down("Control"); await page.mouse.move(at.x + 79, at.y + 29, { steps: 4 });
  const free = (await state()).selectedObject!;
  expect(["x", "z"].some(axis => Math.abs(Number(free[axis]) / 5 - Math.round(Number(free[axis]) / 5)) > 0.01)).toBe(true);
  await page.keyboard.up("Control"); await page.mouse.move(at.x + 87, at.y + 31, { steps: 3 }); await page.mouse.up();
  for (const axis of ["x", "y", "z"]) { const value = Number((await state()).selectedObject![axis]) / 5; expect(value).toBeCloseTo(Math.round(value)); }
  await page.locator("#editor-prefab-kind").selectOption("barrel"); await page.locator("#editor-add-prefab").click();
  await set("x", 12.7); await set("y", 6.4); await set("z", -9.2);
  await page.locator('li[data-key="solid:barrier-3"] span').click({ modifiers: ["Shift"] });
  await page.locator("#editor-grid-spacing").fill("2"); await page.locator("#editor-grid-spacing").dispatchEvent("change");
  await page.locator("#editor-snap-all").click();
  await page.locator('li[data-key="prefab:barrel-1"] span').click();
  expect((await state()).selectedObject).toMatchObject({ x: 12, y: 6, z: -10 });
  await page.locator('li[data-key="solid:barrier-3"] span').click();
  for (const axis of ["x", "y", "z"]) { const value = Number((await state()).selectedObject![axis]) / 2; expect(value).toBeCloseTo(Math.round(value)); }
});
