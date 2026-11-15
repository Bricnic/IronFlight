import { test, expect, type Page } from "@playwright/test";

test.slow();

const TRACK = "custom:screwball-run" as const;

async function startRun(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((track: typeof TRACK) => {
    const g = window.__game!;
    g.startTrack(track);
    g.pause(true);
  }, TRACK);
}

test("speed tube locks, boosts and shoots", async ({ page }) => {
  await startRun(page);
  const ride = await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: 0, y: 2, z: 445 }, Math.PI);
    g.setVelocity({ x: 0, y: 0, z: -12 });
    let tubed = false;
    let maxSpeed = 0;
    for (let f = 0; f < 100; f++) {
      g.advanceFrames(6, 1, { throttle: 1 });
      const s = g.snapshot();
      const pace = Math.hypot(s.velocity.x, s.velocity.z);
      maxSpeed = Math.max(maxSpeed, pace);
      if (s.dungeon.hazards.find((h) => h.id === "tube-1")?.tubed) tubed = true;
      if (s.position.z < 385) break;
    }
    return { tubed, maxSpeed, z: g.snapshot().position.z };
  });
  expect(ride.tubed).toBe(true);
  expect(ride.maxSpeed).toBeGreaterThan(20);
  expect(ride.z).toBeLessThan(385);
  await page.screenshot({ path: "test-results/screwball-tube.png" });
});

test("mailbox posts touching trucks and explodes", async ({ page }) => {
  await startRun(page);
  // Park beside the mailbox for a calm establishing shot. The sim has not
  // stepped yet so the sensor has not fired; the live render loop still
  // swings the chase camera into place.
  await page.evaluate(() => {
    window.__game!.place({ x: -6, y: -6, z: 300 }, -Math.PI / 2);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "test-results/screwball-mailbox.png" });
  // Now step the sim: the sensor fires and the abduction plays.
  await page.evaluate(() => {
    const g = window.__game!;
    for (let f = 0; f < 200; f++) {
      g.advanceFrames(6, 1, {});
      if (g.snapshot().dungeon.hazards.find((h) => h.id === "mailbox-1")?.posted)
        break;
    }
  });
  const posted = await page.evaluate(
    () => window.__game!.snapshot().dungeon.hazards.find((h) => h.id === "mailbox-1"),
  );
  expect(posted?.posted).toBe(true);
  // Step to the explosion, then catch the burst mid-flight.
  await page.evaluate(() => {
    const g = window.__game!;
    for (let f = 0; f < 200; f++) {
      g.advanceFrames(6, 1, {});
      if (g.snapshot().dungeon.hazards.find((h) => h.id === "mailbox-1")?.exploded)
        break;
    }
    g.advanceFrames(6, 1, {});
  });
  // The wreck smokes exactly like a burner-cooked truck.
  const fire = await page.evaluate(() => window.__game!.stats().fire);
  expect(fire.smokeVisible).toBe(true);
  expect(fire.smokeParticles).toBe(48);
  expect(fire.smokeStrength).toBeGreaterThan(0.2);
  await page.screenshot({ path: "test-results/screwball-burst.png" });
  // Let the sequence play out: shrink, parcel, shut, wait, explode, wreck.
  // Then pull back to the rim to watch debris and smoke clear the pit.
  const end = await page.evaluate(() => {
    const g = window.__game!;
    for (let f = 0; f < 100 && g.snapshot().run?.status === "running"; f++)
      g.advanceFrames(12, 1, {});
    const s = g.snapshot();
    return {
      status: s.run?.status,
      exploded: s.dungeon.hazards.find((h) => h.id === "mailbox-1")?.exploded,
      scorch: s.scorch,
      smoking: s.smoking,
    };
  });
  expect(end.exploded).toBe(true);
  expect(end.status).toBe("failed");
  expect(end.scorch).toBeGreaterThan(0.5);
  expect(end.smoking).toBe(true);
  await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: 16, y: 3, z: 300 }, -Math.PI / 2);
    g.advanceFrames(90, 1, {});
  });
  await page.screenshot({ path: "test-results/screwball-mailbox-burst.png" });
});
