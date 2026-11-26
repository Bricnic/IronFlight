import { test, expect, type Page } from "@playwright/test";

test.slow();

async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#level-editor canvas")).toHaveCount(1);
}

test("prefab picker groups kinds into four collapsed, searchable sections", async ({ page }) => {
  await openEditor(page);
  const sections = page.locator("#editor-prefab-picker details");
  await expect(sections).toHaveCount(4);
  // Collapsed by default.
  for (let g = 0; g < 4; g++) await expect(sections.nth(g)).toHaveJSProperty("open", false);
  await expect(sections.nth(0).locator("summary")).toContainText("Colliders");
  await expect(sections.nth(1).locator("summary")).toContainText("Destructibles");
  await expect(sections.nth(2).locator("summary")).toContainText("Dangerous");
  await expect(sections.nth(3).locator("summary")).toContainText("Lethal");
  for (let g = 0; g < 4; g++) {
    const values = await sections.nth(g).locator("button[data-kind]").evaluateAll((els) => els.map((e) => (e as HTMLButtonElement).dataset.kind!));
    expect(values.length, `section ${g} populated`).toBeGreaterThan(0);
    expect([...values].sort(), `section ${g} sorted`).toEqual(values);
  }
  // Spot checks land in their section.
  await expect(page.locator('details[data-section="colliders"] button[data-kind="lamp"]')).toHaveCount(1);
  await expect(page.locator('details[data-section="destructibles"] button[data-kind="barrel"]')).toHaveCount(1);
  await expect(page.locator('details[data-section="dangerous"] button[data-kind="raptor"]')).toHaveCount(1);
  await expect(page.locator('details[data-section="lethal"] button[data-kind="hands"]')).toHaveCount(1);
  // Search filters across sections and expands matches.
  await page.locator("#editor-prefab-search").fill("gumball-lamp");
  await expect(page.locator("#editor-prefab-picker button[data-kind]:visible")).toHaveCount(1);
  await expect(page.locator('details[data-section="colliders"]')).toHaveJSProperty("open", true);
  await page.locator("#editor-prefab-picker button[data-kind]:visible").click();
  await expect(page.locator("#editor-add-prefab")).toContainText("gumball-lamp");
  await page.locator("#editor-prefab-search").fill("");
  for (let g = 0; g < 4; g++) await expect(sections.nth(g)).toHaveJSProperty("open", false);
});

test("added prefabs land on the ground instead of floating at orbit height", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() => window.__game!.customLevels.remove("e2e-snap").catch(() => {}));
  await page.locator("#editor-name").fill("e2e-snap");
  await page.locator("#editor-new").click();
  try {
    const target = await page.evaluate(() => window.__game!.editor().cameraTarget);
    expect(target.y, "orbit target above the road").toBeGreaterThan(1);
    await page.locator("#editor-add-prefab").click();
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText("Saved e2e-snap");
    const placed = await page.evaluate(async () => (await window.__game!.customLevels.load("e2e-snap")).prefabs);
    expect(placed).toHaveLength(1);
    expect(placed[0].y, "snapped to road/ground top").toBeLessThanOrEqual(0.05);
    expect(placed[0].y).toBeGreaterThanOrEqual(0);
  } finally {
    await page.evaluate(() => window.__game!.customLevels.remove("e2e-snap").catch(() => {}));
  }
});

test("p playtests and ctrl+z undoes, but not while typing", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() => {
    const g = window.__game!;
    return Promise.all([
      g.customLevels.remove("e2e-hotkeys").catch(() => {}),
      g.customLevels.remove("e2e-hotkeys-p").catch(() => {}),
    ]);
  });
  await page.locator("#editor-name").fill("e2e-hotkeys");
  await page.locator("#editor-new").click();
  try {
  // Typing p in a field must not playtest.
  await page.locator("#editor-name").fill("e2e-hotkeys-p");
  await expect(page.locator("#level-editor")).toBeVisible();
  await page.locator("#editor-name").fill("e2e-hotkeys");
  // ctrl+z undoes the last edit.
  const before = await page.evaluate(() => window.__game!.editor().solids);
  await page.locator("#editor-add-solid").click();
  await expect
    .poll(() => page.evaluate(() => window.__game!.editor().solids))
    .toBe(before + 1);
  await page.keyboard.press("Control+z");
  await expect
    .poll(() => page.evaluate(() => window.__game!.editor().solids))
    .toBe(before);
  // ctrl+z inside a text field leaves the level alone (native behavior).
  await page.locator("#editor-name").click();
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__game!.editor().solids)).toBe(before);
  // p starts a playtest from the editor.
  await page.locator("#level-editor canvas").click({ position: { x: 40, y: 40 } });
  await page.keyboard.press("p");
  await expect(page.locator("#level-editor")).toBeHidden({ timeout: 15000 });
  } finally {
    await page.evaluate(() => {
      const g = window.__game!;
      return Promise.all([
        g.customLevels.remove("e2e-hotkeys").catch(() => {}),
        g.customLevels.remove("e2e-hotkeys-p").catch(() => {}),
      ]);
    });
  }
});
