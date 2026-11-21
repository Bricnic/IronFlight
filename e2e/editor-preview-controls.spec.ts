import { test, expect, type Page } from "@playwright/test";
import { blankLevel } from "../src/custom-level";

test.slow();
async function editor(page: Page) {
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill("Preview controls verification"); await page.locator("#editor-new").click();
}

test("plain checkpoints and the spawn monster truck are visible in preview", async ({ page }, info) => {
  await editor(page);
  await page.locator('li[data-key="checkpoint:0"] span').click();
  await page.locator("#editor-frame-selection").click();
  await page.locator("#editor-preview").click();
  const preview = () => page.evaluate(() => window.__game!.inspectPreview());
  expect((await preview()).checkpoints).toEqual([{ index: 0, meshes: 3 }]);
  expect((await preview()).spawn).toMatchObject({ name: "iron-flight-monster", visible: true });
  expect((await preview()).spawn.meshes).toBeGreaterThan(20);
  await page.locator("#editor-frame-selection").click();
  await page.locator("#level-editor canvas").screenshot({ path: info.outputPath("checkpoint-preview.png") });
  await page.locator("#editor-select-spawn").click(); await page.locator("#editor-frame-selection").click();
  await page.locator("#level-editor canvas").screenshot({ path: info.outputPath("spawn-preview.png") });
  const before = (await preview()).spawn;
  await page.clock.fastForward(1000);
  expect((await preview()).spawn).toEqual(before);
});

test("locked selection override and both middle-button pan chords preserve objects", async ({ page }) => {
  await editor(page);
  await page.locator("#editor-solid-kind").selectOption("barrier"); await page.locator("#editor-add-solid").click();
  for (const [key, value] of Object.entries({ x: 0, y: 5, z: 0, w: 12, h: 10, d: 12 })) {
    const input = page.locator(`#editor-props [data-prop="${key}"]`); await input.fill(String(value)); await input.dispatchEvent("change");
  }
  const state = () => page.evaluate(() => window.__game!.editor());
  await page.locator("#editor-frame-selection").click();
  const at = await page.evaluate(() => window.__game!.editorProject({ x: 0, y: 5, z: 0 }));
  const object = (await state()).selectedObject;
  await page.locator("#editor-selection-lock").click();
  for (const key of ["ground", "road-1"])
    await page.locator(`li[data-key="solid:${key}"]`).getByRole("button", { name: /^Lock / }).click();
  await page.mouse.click(at.x, at.y);
  expect((await state()).selection).not.toBe("solid:barrier-3");
  await page.keyboard.down("Control"); await page.keyboard.down("Shift");
  await page.mouse.click(at.x, at.y);
  await page.keyboard.up("Shift"); await page.keyboard.up("Control");
  expect((await state()).selection).toBe("solid:barrier-3");
  expect((await state()).selectedObject).toEqual({ ...object, locked: true });
  await page.locator("#editor-selection-lock").click();
  for (const tool of ["select", "pan", "rotator", "resize"]) {
    await page.locator(`#editor-tool-${tool}`).click();
  for (const secondary of ["left", "right"] as const) for (const middleFirst of [true, false]) {
    await page.locator("#editor-frame-selection").click();
    const before = await state();
    await page.mouse.move(at.x, at.y);
    await page.mouse.down({ button: middleFirst ? "middle" : secondary });
    await page.mouse.down({ button: middleFirst ? secondary : "middle" });
    await page.mouse.move(at.x + 60, at.y + 30, { steps: 6 });
    await page.mouse.up({ button: secondary });
    const panned = await state();
    // Releasing the secondary button returns immediately to orbit.
    await page.mouse.move(at.x + 80, at.y + 40, { steps: 3 });
    expect((await state()).cameraTarget).toEqual(panned.cameraTarget);
    await page.mouse.up({ button: "middle" });
    const after = await state();
    expect(after.selectedObject, `${secondary}, middleFirst=${middleFirst}`).toEqual(before.selectedObject);
    expect(after.cameraTarget, `${secondary}, middleFirst=${middleFirst}`).not.toEqual(before.cameraTarget);
    expect(after.tool).toBe(tool);
  }
  }
});

test("lighting settings persist, override mystic night and reach Playtest", async ({ page }, info) => {
  await editor(page);
  const name = "e2e-preview-lighting";
  try {
    await page.evaluate(async level => { await window.__game!.customLevels.save(level); }, { ...blankLevel(name), backgroundTemplate: "mystic-cave" });
    await page.locator("#editor-refresh-levels").click();
    await page.locator("#editor-levels").selectOption(name);
    await page.locator("#editor-level-settings summary").click();
    await expect(page.locator('#editor-props [data-prop="forceNight"]')).toBeChecked();
    await page.locator("#editor-preview").click();
    expect((await page.evaluate(() => window.__game!.inspectPreview())).lighting?.game).toBe(false);
    await page.locator('#editor-props [data-prop="previewGameLighting"]').check();
    const night = (await page.evaluate(() => window.__game!.inspectPreview())).lighting!;
    expect(night).toMatchObject({ game: true, night: true });
    await page.locator("#level-editor canvas").screenshot({ path: info.outputPath("mystic-night-preview.png") });
    await page.locator('#editor-props [data-prop="forceNight"]').uncheck();
    const day = (await page.evaluate(() => window.__game!.inspectPreview())).lighting!;
    expect(day.night).toBe(false); expect(day.sun).toBeGreaterThan(night.sun);
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    expect(await page.evaluate(name => window.__game!.customLevels.load(name), name)).toMatchObject({ previewGameLighting: true, forceNight: false });
    await page.locator("#editor-playtest").click();
    await expect(page.locator("#level-editor")).toBeHidden({ timeout: 20000 });
    await expect(page.locator("#weather-night")).toBeHidden();
  } finally { await page.evaluate(name => window.__game!.customLevels.remove(name), name); }
});
