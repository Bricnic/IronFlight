import { test, expect, type Page } from "@playwright/test";
import { getTrack, type TrackId } from "../src/tracks";
async function startCourse(page: Page, id: TrackId) {
  await page.goto(`/?test=course-${id}`);
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((trackId: TrackId) => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack(trackId);
  }, id);
}
test("menu counts nine places with per-mode labels", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await expect(page.locator(".track-select-intro")).toContainText(
    "Nine places to send it.",
  );
  await expect(page.locator(".track-card")).toHaveCount(9);
  const mode = (id: string) =>
    page.locator(`[data-track="${id}"] .track-mode`);
  await expect(mode("haunted-hollow")).toHaveText("DEMOLITION");
  await expect(mode("sky-slide")).toHaveText("SLIDE RUN");
  await expect(mode("canyon-plunge")).toHaveText("CHECKPOINT RACE");
  await expect(mode("scrapyard-sweep")).toHaveText("120s COLLECTION");
});
test("graveyard HUD counts smashed stones and warns about ghosts", async ({
  page,
}) => {
  await startCourse(page, "haunted-hollow");
  await expect(page.locator("#run-progress")).toHaveText("0 / 12 smashed");
  await expect(page.locator("#state-copy")).toContainText("ghost");
  expect(
    await page.locator("#progress").evaluate((e) => e.style.width),
  ).not.toContain("NaN");
  await page.evaluate(
    ({ track }) => {
      const g = window.__game!;
      g.driveFrames(
        240,
        16,
        (s) => {
          const t = track.demolish!.find(
            (p) => !s.run!.destroyed.includes(p.id),
          )!;
          const desired = Math.atan2(
            t.x - s.position.x,
            t.z - s.position.z,
          );
          const heading = Math.atan2(s.forward[0], s.forward[2]);
          const error = Math.atan2(
            Math.sin(desired - heading),
            Math.cos(desired - heading),
          );
          return {
            steer: Math.max(-1, Math.min(1, error * 3)),
            throttle: 1,
            brake: 0,
          };
        },
        false,
      );
    },
    { track: getTrack("haunted-hollow") },
  );
  const smashed = await page.evaluate(
    () => window.__game!.snapshot().run?.destroyed.length,
  );
  expect(smashed).toBeGreaterThan(0);
  await expect(page.locator("#run-progress")).toContainText("/ 12 smashed");
});
test("slide HUD coaches strafe and tracks bounce then ring", async ({
  page,
}) => {
  await startCourse(page, "sky-slide");
  await expect(page.locator("#run-progress")).toContainText("bounce, then ring");
  await expect(page.locator("#state-copy")).toContainText("strafe");
  await expect(page.locator("#steer-label")).toHaveText("STRAFE");
  await page.evaluate(
    ({ track }) => {
      const g = window.__game!;
      g.driveFrames(
        30,
        16,
        (s) => {
          const pts = track.path;
          const idx = Math.min(s.run!.checkpoint, pts.length - 2);
          const a = pts[idx],
            b = pts[idx + 1];
          const dx = b.x - a.x,
            dz = b.z - a.z,
            len = Math.hypot(dx, dz) || 1,
            fx = dx / len,
            fz = dz / len;
          const along = Math.max(
            0,
            Math.min(
              len,
              (s.position.x - a.x) * fx + (s.position.z - a.z) * fz,
            ),
          );
          const ahead = Math.min(len, along + 30);
          const e =
            (a.x + fx * ahead - s.position.x) * fz -
            (a.z + fz * ahead - s.position.z) * fx;
          return {
            steer: Math.max(-1, Math.min(1, e * 0.08)),
            throttle: 0,
            brake: 0,
          };
        },
        false,
      );
    },
    { track: getTrack("sky-slide") },
  );
  expect(
    await page.evaluate(() => window.__game!.snapshot().run?.checkpoint),
  ).toBeGreaterThanOrEqual(1);
  await expect(page.locator("#run-progress")).toContainText("Checkpoint 1 / 6");
  const before = await page.evaluate(() => ({
    x: window.__game!.snapshot().position.x,
    forward: window.__game!.snapshot().forward,
  }));
  await page.keyboard.down("ArrowLeft");
  await page.evaluate(() => window.__game!.advanceFrames(45, 1));
  await page.keyboard.up("ArrowLeft");
  const after = await page.evaluate(() => ({
    x: window.__game!.snapshot().position.x,
    forward: window.__game!.snapshot().forward,
  }));
  expect(after.x).toBeGreaterThan(before.x + 1);
  expect(after.forward[2]).toBeGreaterThan(0.95);
});
test("a ghost wreck shows retry and level select", async ({ page }) => {
  await startCourse(page, "haunted-hollow");
  await page.evaluate(() => {
    window.__game!.advanceFrames(150, 16, {});
  });
  const run = await page.evaluate(() => window.__game!.snapshot().run);
  expect(run?.status).toBe("failed");
  expect(run?.reason).toBe("wrecked");
  await page.evaluate(() => window.__game!.advanceFrames(301, 1, {}));
  await expect(
    page.getByRole("heading", { name: "Run ended", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#result-description")).toContainText("wrecked");
  await page.locator("#retry-track").click();
  expect(
    await page.evaluate(() => window.__game!.snapshot().run?.status),
  ).toBe("running");
  await page.getByRole("button", { name: "Level select", exact: true }).click();
  await expect(page.locator("#level-select")).toBeVisible();
  await expect(page.locator(".track-card")).toHaveCount(9);
});
test("narrow screens fit play and result", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startCourse(page, "canyon-plunge");
  await page.evaluate(() => {
    const g = window.__game!;
    g.driveFrames(60, 16, () => ({ throttle: 1, steer: 0, brake: 0 }), false);
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(page.locator("#run-progress")).toBeVisible();
  await page.screenshot({ path: info.outputPath("narrow-play.png") });
  await startCourse(page, "haunted-hollow");
  await page.evaluate(() => {
    window.__game!.advanceFrames(150, 16, {});
    window.__game!.advanceFrames(301, 1, {});
  });
  await expect(
    page.getByRole("heading", { name: "Run ended", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("narrow-result.png") });
});
