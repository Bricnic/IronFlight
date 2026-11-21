import { test, expect } from "@playwright/test";
test("all angle fields accept degrees, preserving negative and multiple turns", async ({ page }) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill("Degree checks"); await page.locator("#editor-new").click();
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.locator("#editor-solid-kind").selectOption("tile"); await page.locator("#editor-add-solid").click();
  for (const key of ["yaw", "angle", "roll"]) for (const value of [45, 90, 135, -45, -90, -135, 180, 360, 720]) {
    const input = page.locator(`#editor-props [data-prop="${key}"]`);
    await input.fill(String(value)); await input.dispatchEvent("change");
    await expect(input).toHaveValue(String(value));
    const angle = await page.evaluate(key => window.__game!.editor().selectedObject?.[key], key);
    expect(angle).toBeCloseTo(value * Math.PI / 180);
  }
});
