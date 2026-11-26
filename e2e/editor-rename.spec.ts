import { test, expect, type Page } from "@playwright/test";

test.slow();

async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#level-editor canvas")).toHaveCount(1);
}

async function saveAndSync(page: Page, name: string) {
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
  // The picker rebuild lands after the status; settle it before the next click.
  await expect(page.locator(`#editor-levels option[value="${name}"]`)).toBeAttached();
}

test("saving under a new name renames the file and refuses collisions", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() => {
    const g = window.__game!;
    return Promise.all([
      g.customLevels.remove("e2e-rename-a").catch(() => {}),
      g.customLevels.remove("e2e-rename-b").catch(() => {}),
      g.customLevels.remove("e2e-rename-c").catch(() => {}),
    ]);
  });
  try {
    await page.locator("#editor-name").fill("e2e-rename-a");
    await page.locator("#editor-new").click();
    await page.locator("#editor-add-solid").click();
    await saveAndSync(page, "e2e-rename-a");
    // Rename and save: the old file goes away, the new one keeps the content.
    await page.locator("#editor-name").fill("e2e-rename-b");
    await saveAndSync(page, "e2e-rename-b");
    const names = await page.evaluate(() => window.__game!.customLevels.list());
    expect(names).toContain("e2e-rename-b");
    expect(names).not.toContain("e2e-rename-a");
    const moved = await page.evaluate(() => window.__game!.customLevels.load("e2e-rename-b"));
    expect(moved.solids.length).toBeGreaterThan(2);
    await expect(
      page.evaluate(() => window.__game!.customLevels.load("e2e-rename-a")),
    ).rejects.toThrow(/Unknown custom level/);
    // Re-saving the unchanged name still works (the POST proves the save ran).
    const post = page.waitForResponse(
      (r) => r.url().endsWith("/__levels") && r.request().method() === "POST",
    );
    await page.locator("#editor-save").click();
    await post;
    await expect(page.locator("#editor-status")).toContainText("Saved e2e-rename-b");
    // Renaming onto another level's name is refused and loses nothing.
    await page.locator("#editor-name").fill("e2e-rename-c");
    await page.locator("#editor-new").click();
    await saveAndSync(page, "e2e-rename-c");
    await page.locator("#editor-levels").selectOption("e2e-rename-b");
    await expect(page.locator("#editor-status")).toContainText("Opened e2e-rename-b");
    await page.locator("#editor-name").fill("e2e-rename-c");
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-error")).toContainText("already exists");
    const kept = await page.evaluate(() => window.__game!.customLevels.load("e2e-rename-b"));
    expect(kept.solids.length).toBe(moved.solids.length);
  } finally {
    await page.evaluate(() => {
      const g = window.__game!;
      return Promise.all([
        g.customLevels.remove("e2e-rename-a").catch(() => {}),
        g.customLevels.remove("e2e-rename-b").catch(() => {}),
        g.customLevels.remove("e2e-rename-c").catch(() => {}),
      ]);
    });
  }
});
