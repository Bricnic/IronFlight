import { test, expect } from "@playwright/test";

test.slow();

test("paint shop sprays, fills, saves, and the garage offers the finish", async ({ page }, info) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Select vehicle" }).click();
  await expect(page.locator("#vehicle-select")).toBeVisible();
  await page.locator('[data-vehicle="monster-truck"] [data-paint-shop]').click();
  await expect(page.locator("#paint-shop")).toBeVisible();
  const box = (await page.locator("#paint-canvas").boundingBox())!;
  // Spray a stroke across the car.
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 12 });
  await page.mouse.up();
  // Bucket-fill whatever is under the center.
  await page.locator('[data-tool="bucket"]').click();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45);
  await page.screenshot({ path: info.outputPath("paint-shop.png") });
  await page.locator("#paint-name").fill("E2E Flames");
  await page.locator("#paint-save").click();
  await expect(page.locator("#paint-status")).toContainText("Saved");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("iron-flight-customizations-v1")!),
  );
  const customs = stored["monster-truck"].customs;
  expect(customs.map((c: { name: string }) => c.name)).toContain("E2E Flames");
  expect(customs[0].dabs.length).toBeGreaterThan(0);
  expect(customs[0].fills.length).toBe(1);
  expect(stored["monster-truck"].active).toBe(customs[0].id);
  // Garage offers default + the saved finish; picking applies it.
  await page.locator("#paint-back").click();
  await expect(page.locator("#vehicle-select")).toBeVisible();
  const row = page.locator('[data-vehicle="monster-truck"] .finish-row');
  await expect(row).toContainText("E2E Flames");
  await row.getByRole("button", { name: "Default finish" }).click();
  const active = await page.evaluate(() => {
    const raw = localStorage.getItem("iron-flight-customizations-v1") as string;
    const all = JSON.parse(raw) as Record<string, { active: string }>;
    return all["monster-truck"].active;
  });
  expect(active).toBe("default");
});

test("the active finish paints the in-game truck", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "iron-flight-customizations-v1",
      JSON.stringify({
        "monster-truck": {
          active: "seed1",
          customs: [
            {
              id: "seed1",
              name: "Seed",
              createdAt: 1,
              fills: [{ part: "hood", from: 0, to: 16711680, tolerance: 1 }],
              dabs: [
                { part: "hood", at: [0, 1, 0], normal: [0, 1, 0], color: 65280, size: 0.2 },
                { part: "hood", at: [0.5, 1, 0], normal: [0, 1, 0], color: 65280, size: 0.2 },
              ],
            },
          ],
        },
      }),
    );
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => window.__game!.startTrack("foundry-run"));
  await page.evaluate(() => window.__game!.advanceFrames(3, 1, {}));
  const paint = await page.evaluate(() => window.__game!.truckPaint());
  expect(paint.dabs).toBe(2);
  expect(paint.fills).toBeGreaterThan(0);
});

test("undo and reset restore the factory finish", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Select vehicle" }).click();
  await page.locator('[data-vehicle="monster-truck"] [data-paint-shop]').click();
  const box = (await page.locator("#paint-canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5, { steps: 6 });
  await page.mouse.up();
  await page.locator("#paint-undo").click();
  await page.locator("#paint-reset").click();
  await expect(page.locator("#paint-status")).toContainText("Factory finish");
  await page.locator("#paint-name").fill("Blank");
  await page.locator("#paint-save").click();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("iron-flight-customizations-v1")!)["monster-truck"].customs,
  );
  const blank = stored.find((c: { name: string }) => c.name === "Blank");
  expect(blank.dabs).toEqual([]);
  expect(blank.fills).toEqual([]);
});
