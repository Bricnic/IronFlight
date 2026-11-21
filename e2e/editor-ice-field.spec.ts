import { test, expect } from "@playwright/test";

test("North Pole Summit's full ice field opens, selects and previews", async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-levels").selectOption("official/North Pole Summit");
  await expect(page.locator("#editor-status")).toContainText("Opened official/North Pole Summit");
  const field = await page.evaluate(async () => {
    const level = await window.__game!.customLevels.load("official/North Pole Summit");
    return { count: level.prefabs.length, ice: level.prefabs.find(p => p.kind === "fragile-ice")! };
  });
  expect(field.count).toBeGreaterThan(5000);
  await page.getByRole("button", { name: "Expand Prefab: fragile-ice", exact: true }).click();
  if (field.ice.group) await page.getByRole("button", { name: `Expand ${field.ice.group}`, exact: true }).click();
  await page.locator(`li[data-key="prefab:${field.ice.id}"] span`).click();
  await page.locator("#editor-frame-selection").click();
  expect((await page.evaluate(() => window.__game!.editor())).selectedObject?.kind).toBe("fragile-ice");
  await page.locator("#level-editor canvas").screenshot({ path: "artifacts/editor-north-pole-wire.png" });
  await page.locator("#editor-preview").click();
  await page.locator("#level-editor canvas").screenshot({ path: "artifacts/editor-north-pole-preview.png" });
  expect(errors).toEqual([]);
});
