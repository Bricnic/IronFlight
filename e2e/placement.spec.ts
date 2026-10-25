import { test, expect, type Page } from "@playwright/test";
import type { CustomLevel } from "../src/custom-level";
test.slow();
const seedLevel = (name: string): CustomLevel => ({
  name,
  mode: "race",
  spawn: { x: 0, y: 2.1, z: -40, yaw: 0 },
  checkpoints: [{ x: 0, z: 40 }],
  solids: [
    {
      id: "ground",
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
      id: "road-1",
      kind: "road",
      x: 0,
      y: 0.015,
      z: 0,
      w: 24,
      h: 0.03,
      d: 110,
      color: 0x303e49,
      texture: "asphalt_02",
    },
  ],
  prefabs: [],
  medals: { gold: 30, silver: 45, bronze: 60 },
});
async function startCustom(page: Page, name: string) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(async (level) => {
    const g = window.__game!;
    await g.customLevels.remove(level.name).catch(() => {});
    await g.customLevels.save(level);
  }, seedLevel(name));
  await page.evaluate((slug) => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack(slug as `custom:${string}`);
  }, `custom:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
  await expect(page.locator("#placement-bar")).toBeVisible();
}
test("in-game bricks land live, save, and block the truck", async ({
  page,
}) => {
  await startCustom(page, "Place Zone");
  await page.locator("#edit-toggle").click();
  expect(await page.evaluate(() => window.__game!.placement())).toMatchObject(
    { editing: true },
  );
  await page.locator("#place-texture").selectOption("rock_06");
  const aim = await page.evaluate(() =>
    window.__game!.project({ x: 0, y: 0, z: -20 }),
  );
  await page.mouse.click(aim.x, aim.y);
  await expect(page.locator("#place-status")).toContainText("Brick saved");
  const solids = await page.evaluate(
    () => window.__game!.stats().officialCourse.solids,
  );
  expect(solids).toBe(3);
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("Place Zone"),
  );
  const brick = loaded.solids.find((s) => s.kind === "barrier")!;
  expect(brick.texture).toBe("rock_06");
  expect(Math.abs(brick.x)).toBeLessThan(2);
  expect(Math.abs(brick.z + 20)).toBeLessThan(3);
  await page.locator("#place-kind").selectOption("wall");
  await page.mouse.click(aim.x, aim.y);
  await expect(page.locator("#place-status")).toContainText("Wall saved");
  await expect
    .poll(
      async () =>
        page.evaluate(() => window.__game!.stats().officialCourse.solids),
      { timeout: 15000 },
    )
    .toBe(4);
  const wall = (
    await page.evaluate(() =>
      window.__game!.customLevels.load("Place Zone"),
    )
  ).solids.at(-1)!;
  expect(wall).toMatchObject({ kind: "barrier", w: 24, h: 3, d: 2 });
  await page.locator("#edit-toggle").click();
  const end = await page.evaluate(() => {
    const g = window.__game!;
    for (let i = 0; i < 30; i++)
      g.driveFrames(4, 16, () => ({ throttle: 1, steer: 0, brake: 0 }), false);
    return g.snapshot().position.z;
  });
  expect(end).toBeLessThan(wall.z);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "Place Zone",
  );
});
test("in-game palette places snowmen, books, hydrants, checkpoints", async ({
  page,
}) => {
  await startCustom(page, "Prefab Zone");
  await page.locator("#edit-toggle").click();
  const canvas = page.locator("#viewport canvas");
  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.locator("#place-kind").selectOption("snowman");
  await page.mouse.click(cx, cy);
  await expect(page.locator("#place-status")).toContainText("snowman saved");
  let loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("Prefab Zone"),
  );
  expect(loaded.prefabs.map((p) => p.kind)).toEqual(["snowman"]);
  const props = await page.evaluate(() => window.__game!.snapshot().props);
  expect(props.length).toBe(1);
  await page.locator("#place-kind").selectOption("book");
  await page.mouse.click(cx, cy);
  await expect(page.locator("#place-status")).toContainText("book saved");
  await page.locator("#place-kind").selectOption("hydrant");
  await page.mouse.click(cx, cy);
  await expect(page.locator("#place-status")).toContainText("hydrant saved");
  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          window
            .__game!.stats()
            .comicHazards.map((h) => h.kind)
            .sort(),
        ),
      { timeout: 15000 },
    )
    .toEqual(["book", "hydrant"]);
  await page.locator("#place-kind").selectOption("checkpoint");
  await page.mouse.click(cx, cy);
  await expect(page.locator("#place-status")).toContainText("Checkpoint gate");
  loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("Prefab Zone"),
  );
  expect(loaded.checkpoints).toHaveLength(2);
  const gates = await page.evaluate(
    (id) => window.__game!.track(id).checkpoints.length,
    "custom:prefab-zone",
  );
  expect(gates).toBe(2);
  expect(loaded.prefabs.map((p) => p.kind).sort()).toEqual([
    "book",
    "hydrant",
    "snowman",
  ]);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "Prefab Zone",
  );
});
test("placement bar shows only on custom tracks", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("harbor-sprint");
  });
  await expect(page.locator("#placement-bar")).toBeHidden();
  await page.evaluate(async (level) => {
    const g = window.__game!;
    await g.customLevels.remove(level.name).catch(() => {});
    await g.customLevels.save(level);
    await g.customLevels.load(level.name);
    g.startTrack("custom:bar-check");
  }, seedLevel("Bar Check"));
  await expect(page.locator("#placement-bar")).toBeVisible();
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "Bar Check",
  );
});
