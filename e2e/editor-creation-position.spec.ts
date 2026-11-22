import { test, expect } from "@playwright/test";

test("new solids and prefabs appear at the view center after framing, panning and dollying", async ({ page }) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill("Creation at view center"); await page.locator("#editor-new").click();
  await page.locator("#editor-solid-kind").selectOption("barrier"); await page.locator("#editor-add-solid").click();
  for (const [key, value] of Object.entries({ x: 240, y: 35, z: -160 })) {
    const input = page.locator(`#editor-props [data-prop="${key}"]`);
    await input.fill(String(value)); await input.dispatchEvent("change");
  }
  await page.locator("#editor-frame-selection").click();
  const canvas = page.locator("#level-editor canvas"), box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down({ button: "middle" }); await page.mouse.down({ button: "right" });
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 50, { steps: 4 });
  await page.mouse.up({ button: "right" }); await page.mouse.up({ button: "middle" });
  await canvas.dispatchEvent("wheel", { deltaY: -300, bubbles: true, cancelable: true });
  const target = await page.evaluate(() => window.__game!.inspectPreview().camera.target);
  expect(Math.abs(target[0])).toBeGreaterThan(100); expect(Math.abs(target[1])).toBeGreaterThan(10); expect(Math.abs(target[2])).toBeGreaterThan(100);
  for (const kind of ["solid", "prefab", "solid"] as const) {
    if (kind === "prefab") await page.locator("#editor-prefab-kind").selectOption("barrel");
    await page.locator(`#editor-add-${kind}`).click();
    const item = await page.evaluate(() => window.__game!.editor().selectedObject!);
    for (const [index, axis] of ["x", "y", "z"].entries()) expect(item[axis]).toBeCloseTo(target[index]);
    const point = await page.evaluate(p => window.__game!.editorProject(p), { x: Number(item.x), y: Number(item.y), z: Number(item.z) });
    expect(point.x).toBeCloseTo(box.x + box.width / 2, 1); expect(point.y).toBeCloseTo(box.y + box.height / 2, 1);
    await page.locator("#editor-undo").click(); await page.locator("#editor-redo").click();
    expect(await page.evaluate(() => window.__game!.editor().selectedObject)).toEqual(item);
  }
});
