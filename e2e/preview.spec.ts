import { test, expect, type Page } from "@playwright/test";
test.slow();
async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#level-editor canvas")).toHaveCount(1);
}
async function savePreviewLevel(page: Page) {
  await page.evaluate(async () => {
    const g = window.__game!;
    await g.customLevels.remove("e2e-preview").catch(() => {});
    await g.customLevels.save({
      name: "e2e-preview",
      mode: "race",
      spawn: { x: 0, y: 2.1, z: -40, yaw: 0 },
      checkpoints: [{ x: 0, z: 40 }],
      solids: [
        {
          id: "ground-1",
          kind: "ground",
          x: 0,
          y: -0.6,
          z: 0,
          w: 200,
          h: 1.2,
          d: 200,
          color: 0x6d817c,
          texture: "grass_ground",
        },
        {
          id: "front-wall",
          kind: "barrier",
          x: 0,
          y: 8,
          z: -20,
          w: 12,
          h: 16,
          d: 2,
          color: 0xc3c4c5,
          texture: "asphalt_02",
        },
        {
          id: "back-wall",
          kind: "barrier",
          x: 0,
          y: 8,
          z: -32,
          w: 12,
          h: 16,
          d: 2,
          color: 0xff0000,
        },
      ],
      prefabs: [],
      medals: { gold: 30, silver: 45, bronze: 60 },
    });
  });
  await page.reload();
  await openEditor(page);
  await page.locator("#editor-levels").selectOption("e2e-preview");
  await expect(page.locator("#editor-status")).toContainText(
    "Opened e2e-preview",
    { timeout: 15000 },
  );
}
async function settledShot(page: Page) {
  const canvas = page.locator("#level-editor canvas");
  let last = await canvas.screenshot();
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    const next = await canvas.screenshot();
    if (next.equals(last)) return next;
    last = next;
  }
  return last;
}
test("preview renders textured solids with occlusion", async ({ page }) => {
  await openEditor(page);
  await savePreviewLevel(page);
  const wire = await settledShot(page);
  await page.locator("#editor-preview").click();
  await expect
    .poll(
      async () => (await page.evaluate(() => window.__game!.editor())).preview,
      { timeout: 15000 },
    )
    .toBe(true);
  const inspect = await page.evaluate(() =>
    window.__game!.inspectPreview(),
  );
  expect(inspect.preview).toBe(true);
  expect(inspect.gridVisible).toBe(false);
  expect(inspect.centerPick).toEqual({ kind: "solid", id: "front-wall" });
  const byId = Object.fromEntries(
    inspect.solids.map((s) => [s.id, s]),
  );
  expect(byId["front-wall"]).toMatchObject({
    textured: true,
    opaque: true,
    depthTest: true,
    depthWrite: true,
  });
  expect(byId["ground-1"].textured).toBe(true);
  expect(byId["back-wall"].textured).toBe(false);
  const preview = await settledShot(page);
  expect(preview.equals(wire)).toBe(false);
  await page.locator("#editor-preview").click();
  await expect
    .poll(
      async () => (await page.evaluate(() => window.__game!.editor())).preview,
      { timeout: 15000 },
    )
    .toBe(false);
  const probe = await page.evaluate(() => window.__game!.editor());
  expect(probe.dirty).toBe(false);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-preview",
  );
});
