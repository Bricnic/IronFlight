import { test, expect, type Page } from "@playwright/test";
import { driveTrack } from "./course-driver";
import official from "../levels/official/Fairground.json" with { type: "json" };
import sourceDefaults from "../src/tuning-defaults.json" with { type: "json" };

test.setTimeout(300000);
test.use({ viewport: { width: 1100, height: 780 } });
async function start(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  // Gameplay proofs use a stable baseline, independently of saved preferences.
  await page.evaluate(() => window.__game!.setTuning({ carouselSpeed: 1, carouselRestriction: 5, bumperSpeed: 1 }));
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page
    .getByRole("button", { name: "Play Fairground", exact: true })
    .click();
  await page.evaluate(() => window.__game!.pause(true));
}

test("Fairground: all 26 rings are reachable by ordinary driving in under five minutes", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const art = await page.evaluate(() => window.__game!.stats().fairground);
  expect(art.carousels).toBe(official.prefabs.filter((p) => p.kind === "carousel").length);
  expect(art.bumpers).toBe(official.prefabs.filter((p) => p.kind === "bumper-arena").length * 6);
  expect(art.balloons).toBe(official.prefabs.filter((p) => p.kind === "hot-air-balloon").length);
  expect(art.triangles).toBeGreaterThan(150000);
  expect(art.carouselTriangles).toBeGreaterThan(150000);
  const result = await driveTrack(page, "custom:fairground", false);
  await info.attach("fairground-run", {
    body: JSON.stringify(result.state, null, 2),
    contentType: "application/json",
  });
  expect(result.state.run?.status, JSON.stringify(result.state)).toBe(
    "completed",
  );
  expect(result.state.run?.collected).toHaveLength(26);
  expect(result.state.run?.elapsed).toBeLessThanOrEqual(300);
  expect(result.state.integrity).toBeGreaterThan(0);
  expect(result.state.fairground.drops.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: info.outputPath("fairground-gold.png") });
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await expect(
    page.locator('[data-track="custom:fairground"] .best-time'),
  ).toHaveText(`${result.state.run!.elapsed.toFixed(2)}s`);
});

test("bumper and carousel speed sliders persist and reset", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.keyboard.press("Backquote");
  for (const key of ["bumperSpeed", "carouselSpeed", "carouselRestriction"]) {
    const slider = page.locator(`#tune-${key}`);
    await expect(slider).toHaveAttribute("min", "0.1");
    await expect(slider).toHaveAttribute("max", "10");
    await expect(slider).toHaveAttribute("step", "0.1");
    await slider.fill("2.4");
    await slider.dispatchEvent("input");
  }
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await page.keyboard.press("Backquote");
  await expect(page.locator("#tune-bumperSpeed")).toHaveValue("2.4");
  await expect(page.locator("#tune-carouselSpeed")).toHaveValue("2.4");
  await expect(page.locator("#tune-carouselRestriction")).toHaveValue("2.4");
  await page.getByRole("button", { name: "Reset tuning", exact: true }).click();
  await expect(page.locator("#tune-bumperSpeed")).toHaveValue(String(sourceDefaults.bumperSpeed));
  await expect(page.locator("#tune-carouselSpeed")).toHaveValue(String(sourceDefaults.carouselSpeed));
  await expect(page.locator("#tune-carouselRestriction")).toHaveValue(String(sourceDefaults.carouselRestriction));
});

test("the real Fairground carousel carries an unpowered car for at least 45 seconds", async ({
  page,
}, info) => {
  await start(page);
  const result = await page.evaluate(() => {
    const g = window.__game!;
    // One initial placement is test setup; every subsequent sample is physics
    // with no input, teleporting, velocity overrides or ride invulnerability.
    g.place({ x: -135, y: 3.1, z: -118 }, Math.PI / 2);
    const samples: {
      time: number;
      radius: number;
      x: number;
      z: number;
      riding: string | null;
      integrity: number;
    }[] = [];
    for (let i = 0; i < 45; i++) {
      g.driveFrames(4, 16, () => ({}), false);
      const s = g.snapshot();
      samples.push({
        time: s.time,
        radius: Math.hypot(s.position.x + 135, s.position.z + 135),
        x: s.position.x,
        z: s.position.z,
        riding: s.fairground.riding,
        integrity: s.integrity,
      });
    }
    g.advanceFrames(0, 1, {});
    return { state: g.snapshot(), samples };
  });
  await info.attach("carousel-ride-samples", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  expect(result.state.fairground.rideSeconds).toBeGreaterThan(45);
  expect(result.state.fairground.explosions).toBe(0);
  expect(result.state.fairground.carousels[0].angle).toBeGreaterThan(6.28);
  expect(
    result.samples.every(
      (s) => s.radius > 10 && s.radius < 25 && s.integrity > 0.9,
    ),
  ).toBe(true);
  let distance = 0;
  for (let i = 1; i < result.samples.length; i++)
    distance += Math.hypot(
      result.samples[i].x - result.samples[i - 1].x,
      result.samples[i].z - result.samples[i - 1].z,
    );
  expect(distance).toBeGreaterThan(80);
  await page.screenshot({ path: info.outputPath("carousel-ride.png") });
});
