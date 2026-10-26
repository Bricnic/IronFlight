import { test, expect, type Page } from "@playwright/test";
test.slow();
async function newLevel(page: Page, name: string) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(
    (n) => window.__game!.customLevels.remove(n).catch(() => {}),
    name,
  );
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await page.locator("#editor-name").fill(name);
  await page.locator("#editor-new").click();
}
async function addPrefab(
  page: Page,
  kind: string,
  x: number,
  z: number,
  id: string,
) {
  await page.locator("#editor-prefab-kind").selectOption(kind);
  await page.locator("#editor-add-prefab").click();
  await page.locator('#editor-props input[data-prop="x"]').fill(String(x));
  await page.locator('#editor-props input[data-prop="z"]').fill(String(z));
  await expect(
    page.locator(`#editor-objects li[data-key="prefab:${id}"]`),
  ).toBeVisible();
}
async function saveAndStart(page: Page, name: string, slug: string) {
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`, {
    timeout: 15000,
  });
  await page.evaluate((s) => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack(s as `custom:${string}`);
  }, slug);
  await expect(page.locator("#placement-bar")).toBeVisible({ timeout: 20000 });
}
async function removeLevel(page: Page, name: string) {
  await page.evaluate(
    (n) => window.__game!.customLevels.remove(n).catch(() => {}),
    name,
  );
}
test("placed loop renders its ring and supports", async ({ page }) => {
  await newLevel(page, "e2e-loop");
  await addPrefab(page, "loop", 0, 0, "loop-1");
  await saveAndStart(page, "e2e-loop", "custom:e2e-loop");
  const art = await page.evaluate(() => window.__game!.stats().officialCourse);
  expect(art.loopSegments).toBe(96);
  await removeLevel(page, "e2e-loop");
});
test("placed dragon renders and burns a car in its jet", async ({ page }) => {
  await newLevel(page, "e2e-dragon");
  await addPrefab(page, "dragon", 10, 0, "dragon-1");
  await saveAndStart(page, "e2e-dragon", "custom:e2e-dragon");
  const art = await page.evaluate(() => window.__game!.stats().officialCourse);
  expect(art.dragons).toBe(1);
  await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: 2, y: 2.1, z: 0 }, 0);
  });
  await page.evaluate(() => window.__game!.advanceFrames(120, 1, {}));
  const snap = await page.evaluate(() => window.__game!.snapshot());
  expect(
    snap.damageEvents.filter((e) => e.source === "dragon-fire").length,
  ).toBeGreaterThan(0);
  expect(snap.integrity).toBeLessThan(1);
  await removeLevel(page, "e2e-dragon");
});
test("placed lamp post renders", async ({ page }) => {
  await newLevel(page, "e2e-lamp");
  await addPrefab(page, "lamp", 20, 10, "lamp-1");
  await saveAndStart(page, "e2e-lamp", "custom:e2e-lamp");
  const art = await page.evaluate(() => window.__game!.stats().officialCourse);
  expect(art.lamps).toBe(1);
  await removeLevel(page, "e2e-lamp");
});
test("placed grandstand renders", async ({ page }) => {
  await newLevel(page, "e2e-stand");
  await addPrefab(page, "grandstand", -30, 40, "grandstand-1");
  await saveAndStart(page, "e2e-stand", "custom:e2e-stand");
  const art = await page.evaluate(() => window.__game!.stats().officialCourse);
  expect(art.grandstands).toBe(1);
  await removeLevel(page, "e2e-stand");
});
