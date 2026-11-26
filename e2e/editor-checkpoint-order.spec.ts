import { test, expect } from "@playwright/test";

test("checkpoint auto-numbering, explicit numbers, and finish flag", async ({ page }) => {
  test.slow();
  const name = "e2e-checkpoint-order";
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill(name);
  await page.locator("#editor-new").click();
  const row = (i: number) => page.locator(`li[data-key="checkpoint:${i}"] span`);
  const orderField = page.locator('#editor-props input[data-prop="order"]');
  const finishBox = page.locator('#editor-props input[data-prop="finish"]');
  // Three same-kind rows collapse into a kind section: expand it like a user.
  const expandCheckpoints = async () => {
    const section = page.locator('li.editor-kind-section[data-kind="checkpoint"]');
    if ((await section.count()) > 0) {
      const toggle = section.locator(".editor-kind-toggle");
      if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
    }
  };
  try {
    // Blank level has one gate: it is the finish line.
    await expect(row(0)).toContainText("Finish");
    // Adds prepend: each new gate is #1 and the rest shift down.
    await page.locator("#editor-add-checkpoint").click();
    await expect(row(0)).toContainText("Checkpoint 1");
    await expect(row(1)).toContainText("Finish");
    await page.locator("#editor-add-checkpoint").click();
    await expect(row(0)).toContainText("Checkpoint 1");
    await expect(row(1)).toContainText("Checkpoint 2");
    await expect(row(2)).toContainText("Finish");
    await expandCheckpoints();
    // Explicit number pins the last gate (z=40) into slot 1.
    await row(2).click();
    await expect(orderField).toHaveValue("");
    await orderField.fill("1");
    await orderField.dispatchEvent("change");
    await expect(row(0)).toContainText("(0, 40)");
    // Moving a gate via its X field renumbers the auto pool around the pin.
    await row(2).click();
    const xField = page.locator('#editor-props input[data-prop="x"]');
    await xField.fill("200");
    await xField.dispatchEvent("change");
    await expect(row(0)).toContainText("(0, 40)");
    // Finish flag moves its gate last and grays out the number field.
    await row(1).click();
    await finishBox.check();
    await expect(orderField).toBeDisabled();
    await expect(row(2)).toContainText("Finish");
    // The flag is exclusive: ticking another gate releases the first.
    await row(0).click();
    await expect(finishBox).not.toBeChecked();
    await finishBox.check();
    const saved = await page.evaluate((n) => window.__game!.customLevels.load(n).catch(() => null), name);
    expect(saved).toBeNull();
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    const level = await page.evaluate((n) => window.__game!.customLevels.load(n), name);
    expect(level.checkpoints.filter((c: { finish?: boolean }) => c.finish)).toHaveLength(1);
    expect(level.checkpoints.at(-1).finish).toBe(true);
  } finally {
    await page.evaluate((n) => window.__game!.customLevels.remove(n).catch(() => {}), name);
  }
});
