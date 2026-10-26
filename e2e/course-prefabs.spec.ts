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
async function addPrefab(page: Page, kind: string, x: number, z: number) {
  await page.locator("#editor-prefab-kind").selectOption(kind);
  await page.locator("#editor-add-prefab").click();
  await page.locator('#editor-props input[data-prop="x"]').fill(String(x));
  await page.locator('#editor-props input[data-prop="z"]').fill(String(z));
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
test("placed hammer spins and strikes a parked car", async ({ page }) => {
  await newLevel(page, "e2e-hammer");
  await addPrefab(page, "hammer", 0, 0);
  await saveAndStart(page, "e2e-hammer", "custom:e2e-hammer");
  await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: 2, y: 2.1, z: 0 }, 0);
  });
  await page.evaluate(() => window.__game!.advanceFrames(180, 1, {}));
  const snap = await page.evaluate(() => window.__game!.snapshot());
  expect(snap.hammerImpacts.length).toBeGreaterThan(0);
  expect(snap.integrity).toBeLessThan(1);
  await removeLevel(page, "e2e-hammer");
});
test("placed trampoline bounces a parked car", async ({ page }) => {
  await newLevel(page, "e2e-tramp");
  await addPrefab(page, "trampoline", 0, 20);
  await saveAndStart(page, "e2e-tramp", "custom:e2e-tramp");
  const art = await page.evaluate(() => window.__game!.stats().officialCourse);
  expect(art.trampolines).toBe(1);
  await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: 0, y: 2.1, z: 20 }, 0);
  });
  await page.evaluate(() => window.__game!.advanceFrames(120, 1, {}));
  const snap = await page.evaluate(() => window.__game!.snapshot());
  expect(snap.slide.trampolines[0].bounces).toBeGreaterThan(0);
  expect(snap.run?.bounced).toBe(true);
  await removeLevel(page, "e2e-tramp");
});
test("placed ghost chases and attacks a parked car", async ({ page }) => {
  await newLevel(page, "e2e-ghost");
  await addPrefab(page, "ghost", 0, -30);
  await saveAndStart(page, "e2e-ghost", "custom:e2e-ghost");
  const art = await page.evaluate(() => window.__game!.stats().officialCourse);
  expect(art.ghosts).toBe(1);
  await page.evaluate(() => window.__game!.advanceFrames(300, 1, {}));
  const snap = await page.evaluate(() => window.__game!.snapshot());
  expect(snap.ghosts.ghosts).toHaveLength(1);
  expect(snap.ghosts.ghosts[0].contacts).toBeGreaterThan(0);
  expect(snap.integrity).toBeLessThan(1);
  expect(
    snap.damageEvents.filter((e) => e.source === "ghost").length,
  ).toBeGreaterThan(0);
  await removeLevel(page, "e2e-ghost");
});
