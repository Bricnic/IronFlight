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

async function placeAt(
  page: Page,
  kind: string,
  x: number,
  y: number,
  z: number,
) {
  await page.locator("#place-kind").selectOption(kind);
  const aim = await page.evaluate(
    (point) => window.__game!.project(point),
    { x, y, z },
  );
  await page.mouse.click(aim.x, aim.y);
}

test("playtest placements appear in the wireframe and save to disk", async ({
  page,
}) => {
  await startCustom(page, "Sync Zone");
  await page.locator("#edit-toggle").click();
  await placeAt(page, "brick", 0, 0, -20);
  await expect(page.locator("#place-status")).toContainText("Brick saved");
  await page.locator("#edit-toggle").click();
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__game!.editor().solids), {
      timeout: 15000,
    })
    .toBe(3);
  await expect(
    page.locator('#editor-objects li[data-key="solid:barrier-3"]'),
  ).toBeVisible();
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText("Saved Sync Zone");
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("Sync Zone"),
  );
  expect(loaded.solids).toHaveLength(3);
  expect(loaded.solids.at(-1)).toMatchObject({ kind: "barrier" });
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "Sync Zone",
  );
});

test("resumed playtests keep the collisions of placed walls", async ({
  page,
}) => {
  await startCustom(page, "Sync Wall");
  await page.locator("#edit-toggle").click();
  await placeAt(page, "wall", 0, 0, -20);
  await expect(page.locator("#place-status")).toContainText("Wall saved");
  await page.locator("#edit-toggle").click();
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__game!.editor().solids), {
      timeout: 15000,
    })
    .toBe(3);
  await page.locator("#editor-playtest").click();
  await expect(page.locator("#level-editor")).toBeHidden({ timeout: 20000 });
  const wall = (
    await page.evaluate(() => window.__game!.customLevels.load("Sync Wall"))
  ).solids.at(-1)!;
  const end = await page.evaluate(() => {
    const g = window.__game!;
    for (let i = 0; i < 30; i++)
      g.driveFrames(4, 16, () => ({ throttle: 1, steer: 0, brake: 0 }), false);
    return g.snapshot().position.z;
  });
  expect(end).toBeLessThan(wall.z);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "Sync Wall",
  );
});
