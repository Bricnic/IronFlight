import { test, expect } from "@playwright/test";
import type { CustomTrackId } from "../src/tracks";

test.slow();

type Vec = { x: number; y: number; z: number };

async function start(page: import("@playwright/test").Page, id: CustomTrackId) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((trackId) => {
    window.__game!.pause(false);
    window.__game!.startTrack(trackId, "easy");
  }, id);
  await page.waitForTimeout(500);
}

async function place(page: import("@playwright/test").Page, p: Vec, yaw: number) {
  await page.evaluate(
    ({ p, yaw }) => window.__game!.place(p, yaw),
    { p, yaw },
  );
}

async function advance(page: import("@playwright/test").Page, frames: number, input = {}) {
  await page.evaluate(
    ({ frames, input }) => window.__game!.advanceFrames(frames, 1, input),
    { frames, input },
  );
}

async function shot(page: import("@playwright/test").Page, name: string) {
  await page.locator("#viewport").screenshot({ path: `test-results/mystic-play/${name}.png` });
}

function trackErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

test("mystic caverns: peak vista, venom vision, fleeing bats", async ({ page }) => {
  const errors = trackErrors(page);
  await start(page, "custom:mystic-caverns");
  // Rock-pass peak vista.
  await place(page, { x: 135, y: 8, z: 95 }, -2.0);
  await advance(page, 45);
  await shot(page, "caverns-peak");
  // Caterpillar portrait before bothering it.
  const cat0 = await page.evaluate(() => {
    const h = window.__game!.snapshot().dungeon.hazards.find((m) => m.kind === "cave-caterpillar")!;
    return { x: h.x, z: h.z };
  });
  await place(page, { x: cat0.x - 10, y: 2, z: cat0.z - 10 }, Math.atan2(10, 10));
  await advance(page, 45);
  await shot(page, "caverns-caterpillar");
  // Park on the caterpillar: 25% venom, flipped cloudy vision.
  const cat = await page.evaluate(() => {
    const h = window.__game!.snapshot().dungeon.hazards.find((m) => m.kind === "cave-caterpillar")!;
    return { x: h.x, z: h.z };
  });
  await place(page, { x: cat.x, y: 2, z: cat.z }, 0);
  await advance(page, 90);
  const poisonTaken = await page.evaluate(() => window.__game!.snapshot().poisonTaken as number);
  expect(poisonTaken).toBeGreaterThan(0);
  await shot(page, "caverns-poison");
  // Venom fades after the 3s window once clear of the crawler.
  await place(page, { x: 0, y: 2, z: -150 }, 0);
  await advance(page, 240);
  const faded = await page.evaluate(() => window.__game!.snapshot().poisonTaken as number);
  expect(faded).toBeLessThan(0.3);
  // Bat roost jump scare: approach and watch them flee.
  await place(page, { x: -12, y: 2, z: -95 }, Math.PI);
  await advance(page, 20);
  const fled = await page.evaluate(
    () => window.__game!.snapshot().dungeon.hazards.filter((m) => m.kind === "cave-bat" && m.fled).length,
  );
  expect(fled).toBeGreaterThan(0);
  await shot(page, "caverns-bats");
  // Moth dust piles up over time.
  await advance(page, 300);
  const piles = await page.evaluate(
    () => window.__game!.snapshot().dungeon.hazards.filter((m) => m.kind === "cave-moth").reduce((n, m) => n + (m.piles ?? 0), 0),
  );
  expect(piles).toBeGreaterThan(0);
  const texErrors = await page.evaluate(() => window.__game!.textureLoadErrors());
  expect(texErrors).toEqual([]);
  expect(errors).toEqual([]);
});

test("firefly grotto: plank bridge sprint over the lava rift", async ({ page }) => {
  const errors = trackErrors(page);
  await start(page, "custom:firefly-grotto");
  await place(page, { x: 55, y: 7.5, z: 60 }, Math.PI / 2);
  await advance(page, 30);
  await shot(page, "grotto-bridge-approach");
  // Full throttle east: outrun the collapsing deck.
  for (let i = 0; i < 20; i++) {
    const x = await page.evaluate(() => window.__game!.snapshot().position.x as number);
    if (x > 150) break;
    await advance(page, 30, { throttle: 1, steer: 0 });
  }
  const after = await page.evaluate(() => ({
    pos: window.__game!.snapshot().position as Vec,
    status: window.__game!.snapshot().status as string,
    shattered: window.__game!.snapshot().fragileIce.filter((t) => t.shattered).length,
  }));
  await shot(page, "grotto-bridge-crossed");
  expect(after.pos.x).toBeGreaterThan(140);
  expect(after.shattered).toBeGreaterThan(0);
  expect(after.status).toBe("driving");
  expect(errors).toEqual([]);
});

test("lavabridge abyss: arch crossing over the lava lake", async ({ page }) => {
  const errors = trackErrors(page);
  await start(page, "custom:lavabridge-abyss");
  await place(page, { x: 20, y: 2, z: -32 }, 0);
  await advance(page, 30);
  await shot(page, "abyss-arch-base");
  // Lane-keep up the arch: steer toward the centerline each chunk.
  let peakY = 0;
  let shotPeak = false;
  for (let i = 0; i < 40; i++) {
    const s = await page.evaluate(() => ({
      pos: window.__game!.snapshot().position as Vec,
      vel: window.__game!.snapshot().velocity as Vec,
      status: window.__game!.snapshot().status as string,
    }));
    peakY = Math.max(peakY, s.pos.y);
    if (!shotPeak && s.pos.z > 35 && s.pos.z < 50) {
      shotPeak = true;
      await shot(page, "abyss-arch-mid");
    }
    if (s.pos.z > 100 || s.status !== "driving") break;
    const steer = Math.max(-1, Math.min(1, (20 - s.pos.x) * 0.4 - s.vel.x * 0.15));
    await advance(page, 20, { throttle: 1, steer });
  }
  const after = await page.evaluate(() => ({
    pos: window.__game!.snapshot().position as Vec,
    status: window.__game!.snapshot().status as string,
  }));
  await shot(page, "abyss-arch-top");
  expect(peakY).toBeGreaterThan(8);
  expect(after.pos.z).toBeGreaterThan(100);
  expect(after.status).toBe("driving");
  // Far cavern vista toward the lake.
  await place(page, { x: 80, y: 2, z: 140 }, Math.PI);
  await advance(page, 45);
  await shot(page, "abyss-cavern");
  expect(errors).toEqual([]);
});
