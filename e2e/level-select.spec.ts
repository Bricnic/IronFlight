import { driveTrack } from "./course-driver";
import { test, expect } from "@playwright/test";
import { LEVEL_COLLECTIONS } from "../src/level-collections";
test("normal startup shows the collection grid and keeps the simulation paused", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await expect(
    page.getByRole("heading", { name: "Choose your collection.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".collection-card h2")).toHaveText(
    LEVEL_COLLECTIONS.map((c) => c.name),
  );
  for (const c of LEVEL_COLLECTIONS) {
    const card = page.locator(`[data-collection="${c.id}"]`);
    await expect(card.locator(".collection-levels")).toContainText(
      `${c.trackIds.length} levels`,
    );
    await expect(card.locator(".collection-gold")).toContainText("gold");
    await expect(card.locator(".collection-stars")).toContainText("stars");
    await expect(
      card.getByRole("img", { name: `${c.name} artwork`, exact: true }),
    ).toBeVisible();
  }
  expect(
    await page
      .locator(".collection-card img")
      .evaluateAll((images) =>
        images.every(
          (i) =>
            (i as HTMLImageElement).complete &&
            (i as HTMLImageElement).naturalWidth > 0,
        ),
      ),
  ).toBe(true);
  // Opening a collection shows its tracks in unlock order: the first two
  // playable, the rest locked with a lock overlay.
  await page.locator('[data-collection="sweet-celebrations"] button').click();
  await expect(page.locator("#collection-title")).toHaveText(
    "Sweet Celebrations",
  );
  await expect(page.locator(".track-card h2")).toHaveText([
    "Birthday Cake Circuit",
    "Birthday Table Loop",
    "Bouncy House",
    "Gumdrop Meadows",
    "Lollipop Loop",
    "Peppermint Pass",
    "Chocolate Chasm",
    "Sugar Rush Summit",
  ]);
  await expect(page.locator(".track-card.locked")).toHaveCount(6);
  await expect(page.locator(".track-lock")).toHaveCount(6);
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
  await page.locator('[data-collection="industrial-mayhem"] button').click();
  await page
    .getByRole("button", { name: "Play Foundry Run", exact: true })
    .click();
  await expect(page.locator("#level-select")).toBeHidden();
  await expect(page.locator("#run-progress")).toContainText("Checkpoint");
  expect(
    await page.evaluate(() => window.__game!.snapshot().run?.trackId),
  ).toBe("foundry-run");
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
  await page.locator('[data-collection="industrial-mayhem"] button').click();
  await page
    .getByRole("button", { name: "Play Foundry Run", exact: true })
    .click();
  const result = await driveTrack(page, "foundry-run", false);
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
  const card = page.locator('[data-track="foundry-run"]');
  await expect(card.locator(".best-time")).not.toHaveText("NO TIME SET");
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await page.locator('[data-collection="industrial-mayhem"] button').click();
  await expect(card.locator(".best-time")).toContainText(
    result.state.run!.elapsed.toFixed(1),
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
  await expect(page.locator(".collection-card")).toHaveCount(7);
  expect(
    await page
      .locator("#level-select")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
  await page.locator('[data-collection="industrial-mayhem"] button').click();
  await expect(page.locator(".track-card")).toHaveCount(10);
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

test("keyboard Space starts a focused track and arrow controls then drive it", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.locator('[data-collection="industrial-mayhem"] button').click();
  await page
    .getByRole("button", { name: "Play Foundry Run", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__game!.snapshot().run?.trackId))
    .toBe("foundry-run");
  await page.evaluate(() => window.__game!.pause(true));
  await page.keyboard.down("ArrowUp");
  await page.evaluate(() => window.__game!.advanceFrames(90, 1));
  await page.keyboard.up("ArrowUp");
  expect(
    await page.evaluate(() => window.__game!.snapshot().speed),
  ).toBeGreaterThan(3);
});

test("an expired arena shows a timeout result and cannot save a medal", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.locator('[data-collection="industrial-mayhem"] button').click();
  await page
    .getByRole("button", { name: "Play Inferno Vault", exact: true })
    .click();
  await page.evaluate(() => {
    window.__game!.pause(true);
    window.__game!.advanceFrames(600, 16, {});
  });
  const run = await page.evaluate(() => window.__game!.snapshot().run);
  expect(run?.status).toBe("failed");
  expect(run?.reason).toBe("timeout");
  expect(run?.medal).toBeNull();
  await page.evaluate(() => window.__game!.advanceFrames(301, 1, {}));
  await expect(
    page.getByRole("heading", { name: "Run ended", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#result-description")).toContainText(
    "Time ran out",
  );
  await page.locator("#result-level-select").click();
  await expect(
    page.locator('[data-track="inferno-vault"] .best-time'),
  ).toHaveText("NO TIME SET");
});
