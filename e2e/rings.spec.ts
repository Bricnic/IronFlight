import { test, expect } from "@playwright/test";
import { driveTrack } from "./course-driver";
test.slow();
test("editor places a goal ring and a collectible; driving triggers both", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("e2e-rings").catch(() => {}),
  );
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await page.locator("#editor-name").fill("e2e-rings");
  await page.locator("#editor-new").click();
  await page.locator("#editor-add-ring").click();
  await expect(
    page.locator('#editor-objects li[data-key="ring:0"]'),
  ).toBeVisible();
  await page.locator('#editor-props input[data-prop="z"]').fill("20");
  await page.locator('#editor-props input[data-prop="y"]').fill("3");
  await page.locator('#editor-props input[data-prop="radius"]').fill("6");
  await page.locator('#editor-props input[data-prop="goal"]').check();
  await page.locator("#editor-add-target").click();
  await page.locator('#editor-props input[data-prop="z"]').fill("-20");
  const probe = await page.evaluate(() => window.__game!.editor());
  expect(probe).toMatchObject({ rings: 1, targets: 1 });
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText("Saved e2e-rings", {
    timeout: 15000,
  });
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("custom:e2e-rings");
  });
  await expect(page.locator("#placement-bar")).toBeVisible({ timeout: 20000 });
  const art = await page.evaluate(() => window.__game!.stats().officialCourse);
  expect(art.rings).toBe(1);
  expect(art.pickups).toBe(1);
  const result = await driveTrack(page, "custom:e2e-rings", false);
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.run?.collected).toEqual(["pickup-1"]);
  expect(result.state.run?.ringsDone).toEqual([0]);
  await page.evaluate((name) => window.__game!.customLevels.remove(name),
    "e2e-rings",
  );
});
