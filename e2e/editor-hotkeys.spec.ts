import { test, expect, type Page } from "@playwright/test";

test.slow();

async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#level-editor canvas")).toHaveCount(1);
}

test("prefab picker groups kinds into four sorted sections", async ({ page }) => {
  await openEditor(page);
  const groups = page.locator("#editor-prefab-kind optgroup");
  await expect(groups).toHaveCount(4);
  await expect(groups.nth(0)).toHaveAttribute("label", "Colliders — rigid decor");
  await expect(groups.nth(1)).toHaveAttribute("label", "Destructibles — knocked over or destroyed");
  await expect(groups.nth(2)).toHaveAttribute("label", "Dangerous — significant damage");
  await expect(groups.nth(3)).toHaveAttribute("label", "Lethal — insta-kill on contact");
  for (let g = 0; g < 4; g++) {
    const values = await groups.nth(g).locator("option").evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    expect(values.length, `section ${g} populated`).toBeGreaterThan(0);
    expect([...values].sort(), `section ${g} sorted`).toEqual(values);
  }
  // Spot checks land in their section.
  const valueOf = (kind: string) =>
    page.locator(`#editor-prefab-kind optgroup option[value="${kind}"]`).evaluate((el) => [
      el.parentElement!.getAttribute("label"),
      (el as HTMLOptionElement).value,
    ]);
  expect((await valueOf("lamp"))[0]).toContain("Colliders");
  expect((await valueOf("barrel"))[0]).toContain("Destructibles");
  expect((await valueOf("raptor"))[0]).toContain("Dangerous");
  expect((await valueOf("hands"))[0]).toContain("Lethal");
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
