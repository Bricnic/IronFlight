import { test, expect } from "@playwright/test";

test("middle mouse always orbits without selecting or editing objects, in every editor tool", async ({ page }) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill("Middle mouse regression"); await page.locator("#editor-new").click();
  await page.locator("#editor-solid-kind").selectOption("barrier"); await page.locator("#editor-add-solid").click();
  for (const [key, value] of Object.entries({ x: 0, y: 5, z: 0, w: 12, h: 10, d: 12 })) {
    const input = page.locator(`#editor-props [data-prop="${key}"]`); await input.fill(String(value)); await input.dispatchEvent("change");
  }
  const orbit = async (tool: string, shift = false) => {
    await page.locator("#editor-frame-selection").click();
    const center = await page.evaluate(() => window.__game!.editorProject({ x: 0, y: 5, z: 0 }));
    await page.mouse.move(center.x, center.y);
    const before = await page.evaluate(() => ({ editor: window.__game!.editor(), point: window.__game!.editorProject({ x: 10, y: 8, z: 3 }) }));
    if (shift) await page.keyboard.down("Shift");
    await page.mouse.down({ button: "middle" }); await page.mouse.move(center.x + 65, center.y + 25, { steps: 6 }); await page.mouse.up({ button: "middle" });
    if (shift) await page.keyboard.up("Shift");
    const after = await page.evaluate(() => ({ editor: window.__game!.editor(), point: window.__game!.editorProject({ x: 10, y: 8, z: 3 }) }));
    expect(after.editor.selectedObject, tool).toEqual(before.editor.selectedObject);
    expect(after.editor.selection, tool).toBe(before.editor.selection);
    expect(after.editor.cameraTarget, tool).toEqual(before.editor.cameraTarget);
    expect(after.editor.tool, tool).toBe(tool);
    expect(Math.hypot(after.point.x - before.point.x, after.point.y - before.point.y), tool).toBeGreaterThan(5);
  };
  for (const tool of ["select", "pan", "eyedropper", "rotator", "resize", "clip"]) {
    await page.locator(`#editor-tool-${tool}`).click(); await orbit(tool);
  }
  await page.locator("#editor-tool-select").click(); await orbit("select", true);
  await page.locator("#editor-selection-lock").click(); await orbit("select"); await page.locator("#editor-selection-lock").click();
  await page.locator("#editor-prefab-kind").selectOption("barrel"); await page.locator("#editor-add-prefab").click();
  const y = page.locator('#editor-props [data-prop="y"]'); await y.fill("5"); await y.dispatchEvent("change");
  // Exercise prefab selection as well as solid selection.
  await orbit("select");
  await page.locator("#editor-tool-look").click(); await orbit("look");
});
