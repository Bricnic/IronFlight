import { test, expect, type Page } from "@playwright/test";
test.slow();
async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#level-editor canvas")).toHaveCount(1);
}
test("randomize modal opens with documented defaults", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("New-Level-001").catch(() => {}),
  );
  await page.locator("#editor-randomize").click();
  await expect(page.locator("#editor-random-modal")).toBeVisible();
  await expect(page.locator("#editor-random-checkpoints")).toHaveValue("3");
  await expect(page.locator("#editor-random-lethals")).toHaveValue("10");
  await expect(page.locator("#editor-random-blocking")).toHaveValue("40");
  await expect(page.locator("#editor-random-decor")).toHaveValue("10");
  await expect(page.locator("#editor-random-theme")).toHaveValue("random");
  await expect(page.locator("#editor-random-width")).toHaveValue("400");
  await expect(page.locator("#editor-random-length")).toHaveValue("400");
  await expect
    .poll(
      () => page.locator("#editor-random-name").inputValue(),
      { timeout: 15000 },
    )
    .toBe("New-Level-001");
  await page.locator("#editor-random-cancel").click();
  await expect(page.locator("#editor-random-modal")).toBeHidden();
});
test("randomize generates a level with requested counts", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("e2e-random-1").catch(() => {}),
  );
  await page.locator("#editor-randomize").click();
  await page.locator("#editor-random-lethals").fill("2");
  await page.locator("#editor-random-blocking").fill("100");
  await page.locator("#editor-random-decor").fill("2");
  await page.locator("#editor-random-theme").selectOption("toys");
  await page.locator("#editor-random-name").fill("e2e-random-1");
  await page.locator("#editor-random-generate").click();
  await expect(page.locator("#editor-random-modal")).toBeHidden();
  const probe = await page.evaluate(() => window.__game!.editor());
  expect(probe).toMatchObject({
    name: "e2e-random-1",
    checkpoints: 3,
    prefabs: 4,
  });
  await expect(page.locator("#editor-status")).toContainText("Generated e2e-random-1");
});
test("randomize rejects out-of-range parameters", async ({ page }) => {
  await openEditor(page);
  await page.locator("#editor-randomize").click();
  await page.locator("#editor-random-checkpoints").fill("0");
  await page.locator("#editor-random-generate").click();
  await expect(page.locator("#editor-random-error")).toContainText(
    "Checkpoints must be an integer from 1 to 20",
  );
  await expect(page.locator("#editor-random-modal")).toBeVisible();
  await page.locator("#editor-random-checkpoints").fill("3");
  await page.locator("#editor-random-blocking").fill("101");
  await page.locator("#editor-random-generate").click();
  await expect(page.locator("#editor-random-error")).toContainText(
    "Blocking path % must be an integer from 0 to 100",
  );
  await expect(page.locator("#editor-random-modal")).toBeVisible();
  await page.locator("#editor-random-cancel").click();
});
test("randomize increments the default name when taken", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("New-Level-001").catch(() => {}),
  );
  await page.locator("#editor-name").fill("New-Level-001");
  await page.locator("#editor-new").click();
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText("Saved New-Level-001");
  await page.locator("#editor-randomize").click();
  await expect
    .poll(
      () => page.locator("#editor-random-name").inputValue(),
      { timeout: 15000 },
    )
    .toBe("New-Level-002");
  await page.locator("#editor-random-cancel").click();
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name).catch(() => {}),
    "New-Level-001",
  );
});
