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
    {
      id: "brick-1",
      kind: "barrier",
      x: 10,
      y: 1.5,
      z: -20,
      w: 6,
      h: 3,
      d: 2,
      color: 0xe6b655,
    },
  ],
  prefabs: [],
  medals: { gold: 30, silver: 45, bronze: 60 },
});

async function clickAt(page: Page, x: number, y: number, z: number) {
  const aim = await page.evaluate(
    (point) => window.__game!.project(point),
    { x, y, z },
  );
  await page.mouse.click(aim.x, aim.y);
}

test("playtest select relocates, rotates, retextures, duplicates, deletes", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(async (level) => {
    const g = window.__game!;
    await g.customLevels.remove(level.name).catch(() => {});
    await g.customLevels.save(level);
  }, seedLevel("Edit Shop"));
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("custom:edit-shop");
  });
  await expect(page.locator("#placement-bar")).toBeVisible();
  await page.locator("#edit-toggle").click();
  await page.locator("#place-kind").selectOption("select");
  const selected = () =>
    page.evaluate(() => window.__game!.placement().selected);
  const solids = () =>
    page.evaluate(
      async () => (await window.__game!.customLevels.load("Edit Shop")).solids,
    );
  // Select the off-path brick, then move it into the truck's lane.
  await clickAt(page, 10, 1.5, -20);
  await expect(page.locator("#place-status")).toContainText(
    "Selected brick-1",
  );
  await expect.poll(selected, { timeout: 15000 }).toBe("brick-1");
  await clickAt(page, 0, 0, -20);
  await expect(page.locator("#place-status")).toContainText("Moved brick-1");
  await expect
    .poll(
      async () => (await solids()).find((s) => s.id === "brick-1")?.x,
      { timeout: 15000 },
    )
    .toBeCloseTo(0, 0);
  // The moved brick blocks the truck: its live collider followed.
  await page.locator("#edit-toggle").click();
  const brick = (await solids()).find((s) => s.id === "brick-1")!;
  const end = await page.evaluate(() => {
    const g = window.__game!;
    for (let i = 0; i < 30; i++)
      g.driveFrames(4, 16, () => ({ throttle: 1, steer: 0, brake: 0 }), false);
    return g.snapshot().position.z;
  });
  expect(end).toBeLessThan(brick.z);
  // Rotate, retexture, duplicate, delete.
  await page.locator("#edit-toggle").click();
  await page.locator("#place-kind").selectOption("select");
  await clickAt(page, 0, 1.5, -20);
  await expect(page.locator("#place-status")).toContainText(
    "Selected brick-1",
  );
  await page.locator("#sel-rotate").click();
  await expect(page.locator("#place-status")).toContainText("Rotated brick-1");
  expect(
    (await solids()).find((s) => s.id === "brick-1")?.yaw,
  ).toBeCloseTo(Math.PI / 4, 5);
  await page.locator("#place-texture").selectOption("rock_06");
  await expect(page.locator("#place-status")).toContainText(
    "Retextured brick-1",
  );
  expect((await solids()).find((s) => s.id === "brick-1")?.texture).toBe(
    "rock_06",
  );
  await page.locator("#sel-duplicate").click();
  await expect(page.locator("#place-status")).toContainText("Duplicated");
  await expect
    .poll(async () => (await solids()).length, { timeout: 15000 })
    .toBe(4);
  const copyId = await selected();
  expect(copyId).not.toBe("brick-1");
  await page.locator("#place-kind").selectOption("select");
  await clickAt(page, 0, 1.5, -20);
  await expect(page.locator("#place-status")).toContainText(
    "Selected brick-1",
  );
  await page.locator("#sel-delete").click();
  await expect(page.locator("#place-status")).toContainText("Deleted brick-1");
  await expect
    .poll(async () => (await solids()).length, { timeout: 15000 })
    .toBe(3);
  await expect.poll(selected, { timeout: 15000 }).toBe(null);
  const final = await solids();
  expect(final.find((s) => s.id === "brick-1")).toBeUndefined();
  expect(final.find((s) => s.id === copyId)).toBeDefined();
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "Edit Shop",
  );
});
const seedPrefabs = (name: string): CustomLevel => ({
  ...seedLevel(name),
  solids: seedLevel(name).solids.slice(0, 2),
  prefabs: [
    { id: "snow-1", kind: "snowman", x: 10, y: 0, z: -20 },
    { id: "book-1", kind: "book", x: -10, y: 0, z: -20 },
  ],
});

test("playtest select moves, duplicates and deletes prefabs", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(async (level) => {
    const g = window.__game!;
    await g.customLevels.remove(level.name).catch(() => {});
    await g.customLevels.save(level);
  }, seedPrefabs("Edit Prefabs"));
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("custom:edit-prefabs");
  });
  await expect(page.locator("#placement-bar")).toBeVisible();
  await page.locator("#edit-toggle").click();
  await page.locator("#place-kind").selectOption("select");
  const selected = () =>
    page.evaluate(() => window.__game!.placement().selected);
  const prefabs = () =>
    page.evaluate(
      async () =>
        (await window.__game!.customLevels.load("Edit Prefabs")).prefabs,
    );
  // Move the snowman into the lane; the truck smashes it.
  await clickAt(page, 10, 1.5, -20);
  await expect(page.locator("#place-status")).toContainText("Selected snow-1");
  await expect.poll(selected, { timeout: 15000 }).toBe("snow-1");
  await expect(page.locator("#sel-rotate")).toBeDisabled();
  await clickAt(page, 0, 0, -20);
  await expect(page.locator("#place-status")).toContainText("Moved snow-1");
  await page.locator("#edit-toggle").click();
  await page.evaluate(() => {
    const g = window.__game!;
    for (let i = 0; i < 30; i++)
      g.driveFrames(4, 16, () => ({ throttle: 1, steer: 0, brake: 0 }), false);
  });
  const smashed = await page.evaluate(
    () =>
      window
        .__game!.snapshot()
        .props.find((p) => p.id === "snow-1")?.broken,
  );
  expect(smashed).toBe(true);
  // The unimpeded truck finished the run; reboot to the play surface.
  await page.evaluate(() => {
    window.__game!.startTrack("custom:edit-prefabs");
  });
  await expect(page.locator("#placement-bar")).toBeVisible();
  // Duplicate and delete the book.
  await page.locator("#edit-toggle").click();
  await page.locator("#place-kind").selectOption("select");
  await clickAt(page, -10, 0.5, -20);
  await expect(page.locator("#place-status")).toContainText("Selected book-1");
  await page.locator("#sel-duplicate").click();
  await expect(page.locator("#place-status")).toContainText("Duplicated");
  await expect
    .poll(async () => (await prefabs()).length, { timeout: 15000 })
    .toBe(3);
  await clickAt(page, -10, 0.5, -20);
  await expect(page.locator("#place-status")).toContainText("Selected book-1");
  await page.locator("#sel-delete").click();
  await expect(page.locator("#place-status")).toContainText("Deleted book-1");
  await expect
    .poll(async () => (await prefabs()).length, { timeout: 15000 })
    .toBe(2);
  const final = await prefabs();
  expect(final.find((p) => p.id === "book-1")).toBeUndefined();
  expect(final.filter((p) => p.kind === "book")).toHaveLength(1);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "Edit Prefabs",
  );
});
