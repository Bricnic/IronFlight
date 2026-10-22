import { driveTrack } from "./course-driver";
import { test, expect } from "@playwright/test";
import { TRACKS } from "../src/tracks";
test("normal startup shows six illustrated tracks and keeps the simulation paused", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await expect(
    page.getByRole("heading", { name: "Choose your track.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".track-card")).toHaveCount(6);
  for (const t of TRACKS) {
    await expect(
      page.getByRole("button", { name: `Play ${t.name}`, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: `${t.name} route preview`, exact: true }),
    ).toBeVisible();
  }
  expect(
    await page
      .locator(".track-card img")
      .evaluateAll((images) =>
        images.every(
          (i) =>
            (i as HTMLImageElement).complete &&
            (i as HTMLImageElement).naturalWidth > 0,
        ),
      ),
  ).toBe(true);
  const time = await page.evaluate(() => window.__game!.snapshot().time);
  await page.keyboard.down("w");
  await page.waitForTimeout(400);
  await page.keyboard.up("w");
  expect(await page.evaluate(() => window.__game!.snapshot().time)).toBe(time);
  await page.screenshot({ path: info.outputPath("level-select.png") });
});
test("selecting a track starts its real attempt; restart and menu preserve player tuning", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page
    .getByRole("button", { name: "Play Harbor Sprint", exact: true })
    .click();
  await expect(page.locator("#level-select")).toBeHidden();
  await expect(page.locator("#run-progress")).toContainText("Checkpoint");
  expect(
    await page.evaluate(() => window.__game!.snapshot().run?.trackId),
  ).toBe("harbor-sprint");
  await page.evaluate(() => {
    window.__game!.pause(true);
    window.__game!.setTuning({ turningPower: 0.6 });
    window.__game!.advanceFrames(60, 1, { throttle: 1 });
  });
  await page.keyboard.press("r");
  expect(
    await page.evaluate(() => window.__game!.snapshot().run?.elapsed),
  ).toBeLessThan(0.1);
  expect(
    await page.evaluate(() => window.__game!.snapshot().tuning.turningPower),
  ).toBe(0.6);
  await page.getByRole("button", { name: "Level select", exact: true }).click();
  await expect(page.locator("#level-select")).toBeVisible();
});

test("a completed UI-selected course awards a medal and reloads its best time", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page
    .getByRole("button", { name: "Play Harbor Sprint", exact: true })
    .click();
  const result = await driveTrack(page, "harbor-sprint", false);
  expect(result.state.run?.status).toBe("completed");
  await expect(
    page.getByRole("heading", { name: "Track complete!", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#result-medal")).toHaveText(
    result.state.run!.medal!.toUpperCase(),
  );
  await expect(page.locator("#personal-best")).toHaveText("NEW PERSONAL BEST");
  await page.screenshot({ path: info.outputPath("medal-result.png") });
  await page.locator("#result-level-select").click();
  const card = page.locator('[data-track="harbor-sprint"]');
  await expect(card.locator(".best-time")).not.toHaveText("NO TIME SET");
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await expect(card.locator(".best-time")).toContainText(
    result.state.run!.elapsed.toFixed(2),
  );
  await expect(card.locator(".best-medal")).toHaveText(
    result.state.run!.medal!.toUpperCase(),
  );
});

test("level selection fits narrow screens and works when storage is blocked", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await expect(page.locator(".track-card")).toHaveCount(6);
  expect(
    await page
      .locator("#level-select")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Play Inferno Vault", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("narrow-level-select.png") });
  await page
    .getByRole("button", { name: "Play Inferno Vault", exact: true })
    .click();
  expect(
    await page.evaluate(() => window.__game!.snapshot().run?.trackId),
  ).toBe("inferno-vault");
});
