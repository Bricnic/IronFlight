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
  await expect(page.locator("#place-status")).toContainText("Selected brick-1", { timeout: 15000 })
  await expect.poll(selected, { timeout: 15000 }).toBe("brick-1");
  await clickAt(page, 0, 0, -20);
  await expect(page.locator("#place-status")).toContainText("Moved brick-1", { timeout: 15000 });
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
  await expect(page.locator("#place-status")).toContainText("Selected brick-1", { timeout: 15000 })
  await page.locator("#sel-rotate").click();
  await expect(page.locator("#place-status")).toContainText("Rotated brick-1", { timeout: 15000 });
  expect(
    (await solids()).find((s) => s.id === "brick-1")?.yaw,
  ).toBeCloseTo(Math.PI / 4, 5);
  await page.locator("#place-texture").selectOption("rock_06");
  await expect(page.locator("#place-status")).toContainText("Retextured brick-1", { timeout: 15000 })
  expect((await solids()).find((s) => s.id === "brick-1")?.texture).toBe(
    "rock_06",
  );
  await page.locator("#sel-duplicate").click();
  await expect(page.locator("#place-status")).toContainText("Duplicated", { timeout: 15000 });
  await expect
    .poll(async () => (await solids()).length, { timeout: 15000 })
    .toBe(4);
  const copyId = await selected();
  expect(copyId).not.toBe("brick-1");
  await page.locator("#place-kind").selectOption("select");
  await clickAt(page, 0, 1.5, -20);
  await expect(page.locator("#place-status")).toContainText("Selected brick-1", { timeout: 15000 })
  await page.locator("#sel-delete").click();
  await expect(page.locator("#place-status")).toContainText("Deleted brick-1", { timeout: 15000 });
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
  await expect(page.locator("#place-status")).toContainText("Selected snow-1", { timeout: 15000 });
  await expect.poll(selected, { timeout: 15000 }).toBe("snow-1");
  await expect(page.locator("#sel-rotate")).toBeDisabled();
  await clickAt(page, 0, 0, -20);
  await expect(page.locator("#place-status")).toContainText("Moved snow-1", { timeout: 15000 });
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
  await expect(page.locator("#place-status")).toContainText("Selected book-1", { timeout: 15000 });
  await page.locator("#sel-duplicate").click();
  await expect(page.locator("#place-status")).toContainText("Duplicated", { timeout: 15000 });
  await expect
    .poll(async () => (await prefabs()).length, { timeout: 15000 })
    .toBe(3);
  await clickAt(page, -10, 0.5, -20);
  await expect(page.locator("#place-status")).toContainText("Selected book-1", { timeout: 15000 });
  await page.locator("#sel-delete").click();
  await expect(page.locator("#place-status")).toContainText("Deleted book-1", { timeout: 15000 });
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

test("playtest select moves, duplicates and deletes checkpoints", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(async (level) => {
    const g = window.__game!;
    await g.customLevels.remove(level.name).catch(() => {});
    await g.customLevels.save(level);
  }, seedLevel("Edit Gates"));
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("custom:edit-gates");
  });
  await expect(page.locator("#placement-bar")).toBeVisible();
  await page.locator("#edit-toggle").click();
  await page.locator("#place-kind").selectOption("select");
  const placement = () => page.evaluate(() => window.__game!.placement());
  const disk = () =>
    page.evaluate(
      async () =>
        (await window.__game!.customLevels.load("Edit Gates")).checkpoints,
    );
  expect((await placement()).checkpoints).toHaveLength(1);
  expect((await placement()).checkpointLabels).toEqual(["FINISH"]);
  expect((await placement()).runCheckpoint).toBe(0);
  // Select the gate banner, then move the gate off the straight.
  await clickAt(page, 0, 5, 40);
  await expect(page.locator("#place-status")).toContainText("Selected gate-1", { timeout: 15000 });
  expect((await placement()).selectedKind).toBe("checkpoint");
  await expect(page.locator("#sel-rotate")).toBeDisabled();
  await expect(page.locator("#sel-duplicate")).toBeEnabled();
  await expect(page.locator("#sel-delete")).toBeEnabled();
  await clickAt(page, -10, 0, 80);
  await expect(page.locator("#place-status")).toContainText("Moved gate-1", { timeout: 15000 });
  await expect
    .poll(async () => (await placement()).checkpoints[0]?.x, {
      timeout: 15000,
    })
    .toBeCloseTo(-10, 0);
  expect((await placement()).checkpoints[0]?.z).toBeCloseTo(80, 0);
  const moved = (await disk())[0]!;
  expect(moved.x).toBeCloseTo(-10, 0);
  expect(moved.z).toBeCloseTo(80, 0);
  // Duplicate, then park the copy clear of the original's banner.
  await page.locator("#sel-duplicate").click();
  await expect(page.locator("#place-status")).toContainText("Duplicated gate-1", { timeout: 15000 })
  await expect
    .poll(async () => (await placement()).checkpoints.length, {
      timeout: 15000,
    })
    .toBe(2);
  expect((await placement()).checkpoints.map((g) => g.id)).toEqual([
    "gate-1",
    "gate-2",
  ]);
  expect((await placement()).checkpointLabels).toEqual([
    "CHECKPOINT 1",
    "FINISH",
  ]);
  expect((await placement()).selected).toBe("gate-2");
  await clickAt(page, 10, 0, 80);
  await expect(page.locator("#place-status")).toContainText("Moved gate-2", { timeout: 15000 });
  await expect
    .poll(async () => (await placement()).checkpoints[1]?.x, {
      timeout: 15000,
    })
    .toBeCloseTo(10, 0);
  // Select gate-1, drive through it (edit mode stays on so the
  // selection survives), then delete it from the live run.
  await clickAt(page, -10, 5, 80);
  await expect(page.locator("#place-status")).toContainText("Selected gate-1", { timeout: 15000 });
  const ran = await page.evaluate(() => {
    const g = window.__game!;
    for (let i = 0; i < 250; i++) {
      if (g.placement().runCheckpoint === 1) break;
      g.driveFrames(
        4,
        16,
        (s) => ({
          throttle: 1,
          steer: Math.max(-0.4, Math.min(0.4, (-6 - s.position.x) * 0.08)),
          brake: 0,
        }),
        false,
      );
    }
    return g.placement().runCheckpoint;
  });
  expect(ran).toBe(1);
  expect((await placement()).selected).toBe("gate-1");
  await page.locator("#sel-delete").click();
  await expect(page.locator("#place-status")).toContainText("Deleted gate-1", { timeout: 15000 });
  await expect
    .poll(async () => (await placement()).checkpoints.length, {
      timeout: 15000,
    })
    .toBe(1);
  expect((await placement()).checkpoints[0]?.id).toBe("gate-2");
  expect((await placement()).runCheckpoint).toBe(0);
  expect((await placement()).checkpointLabels).toEqual(["FINISH"]);
  expect((await placement()).selected).toBe(null);
  const survivor = (await disk())[0]!;
  expect(survivor.x).toBeCloseTo(10, 0);
  expect(survivor.z).toBeCloseTo(80, 0);
  // The truck drove past the gates; reboot to the spawn view, then the
  // last gate refuses to delete so the level stays valid.
  await page.evaluate(() => {
    window.__game!.startTrack("custom:edit-gates");
  });
  await expect(page.locator("#placement-bar")).toBeVisible();
  await page.locator("#edit-toggle").click();
  await page.locator("#place-kind").selectOption("select");
  await clickAt(page, 10, 5, 80);
  await expect(page.locator("#place-status")).toContainText("Selected gate-2", { timeout: 15000 });
  await page.locator("#sel-delete").click();
  await expect(page.locator("#place-status")).toContainText("at least one checkpoint", { timeout: 15000 })
  expect((await placement()).checkpoints).toHaveLength(1);
  expect((await placement()).selected).toBe("gate-2");
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "Edit Gates",
  );
});

test("playtest select edits checkpoint prefabs as gates", async ({ page }) => {
  const seed: CustomLevel = {
    ...seedLevel("Edit Gate Prefabs"),
    prefabs: [{ id: "cp-1", kind: "checkpoint", x: 6, z: 60 }],
  };
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(async (level) => {
    const g = window.__game!;
    await g.customLevels.remove(level.name).catch(() => {});
    await g.customLevels.save(level);
  }, seed);
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("custom:edit-gate-prefabs");
  });
  await expect(page.locator("#placement-bar")).toBeVisible();
  await page.locator("#edit-toggle").click();
  await page.locator("#place-kind").selectOption("select");
  const placement = () => page.evaluate(() => window.__game!.placement());
  const stored = () =>
    page.evaluate(
      async () =>
        (await window.__game!.customLevels.load("Edit Gate Prefabs")).prefabs,
    );
  expect((await placement()).checkpoints.map((g) => g.id)).toEqual([
    "gate-1",
    "gate-2",
  ]);
  await clickAt(page, 6, 5, 60);
  await expect(page.locator("#place-status")).toContainText("Selected gate-2", { timeout: 15000 });
  expect((await placement()).selectedKind).toBe("checkpoint");
  await clickAt(page, 12, 0, 60);
  await expect(page.locator("#place-status")).toContainText("Moved gate-2", { timeout: 15000 });
  await expect
    .poll(async () => (await stored()).find((p) => p.id === "cp-1")?.x, {
      timeout: 15000,
    })
    .toBeCloseTo(12, 0);
  await page.locator("#sel-delete").click();
  await expect(page.locator("#place-status")).toContainText("Deleted gate-2", { timeout: 15000 });
  await expect
    .poll(async () => (await placement()).checkpoints.length, {
      timeout: 15000,
    })
    .toBe(1);
  expect(await stored()).toHaveLength(0);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "Edit Gate Prefabs",
  );
});
