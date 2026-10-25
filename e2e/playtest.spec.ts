import { test, expect, type Page } from "@playwright/test";
import type { CustomLevel } from "../src/custom-level";
import { driveTrack } from "./course-driver";

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

async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#level-editor canvas")).toHaveCount(1);
}

test("playtest boots the real sim and completes the custom level", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(async (level) => {
    const g = window.__game!;
    await g.customLevels.remove(level.name).catch(() => {});
    await g.customLevels.save(level);
  }, seedLevel("Playtest Sprint"));
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await page.locator("#editor-levels").selectOption("Playtest Sprint");
  await expect(page.locator("#editor-status")).toContainText(
    "Opened Playtest Sprint",
  );
  await page.locator("#editor-playtest").click();
  await expect(page.locator("#level-editor")).toBeHidden();
  await expect(page.locator("#placement-bar")).toBeVisible();
  const result = await driveTrack(page, "custom:playtest-sprint", false);
  expect(result.state.run?.status).toBe("completed");
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "Playtest Sprint",
  );
});

test("playtest blocks levels that cannot be played", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("Playtest Broken").catch(() => {}),
  );
  await page.locator("#editor-name").fill("Playtest Broken");
  await page.locator("#editor-new").click();
  await page.locator('li[data-key="checkpoint:0"]').click();
  await page.locator("#editor-remove").click();
  await page.locator("#editor-playtest").click();
  await expect(page.locator("#editor-error")).not.toBeEmpty();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#placement-bar")).toBeHidden();
});
