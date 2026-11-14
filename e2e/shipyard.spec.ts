import { test, expect, type Page } from "@playwright/test";

test.slow();

const TRACK = "custom:shipyard" as const;

async function startShipyard(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((track: typeof TRACK) => {
    const g = window.__game!;
    g.startTrack(track);
    g.pause(true);
  }, TRACK);
}

/** Drive through gate `index` from a teleport 8 units behind it. */
async function crossGate(page: Page, index: number) {
  return page.evaluate(
    ([i, track]) => {
      const g = window.__game!;
      const gate = g.track(track).checkpoints[i];
      g.place(
        { x: gate.x - gate.nx * 8, y: gate.y, z: gate.z - gate.nz * 8 },
        Math.atan2(gate.nx, gate.nz),
      );
      for (let f = 0; f < 240 && (g.snapshot().run?.checkpoint ?? 0) <= i; f++)
        g.advanceFrames(1, 1, { throttle: 1 });
      return g.snapshot().run;
    },
    [index, TRACK] as const,
  );
}

function pelicanStriking(page: Page) {
  return page.evaluate(
    (track) =>
      window
        .__game!.snapshot()
        .dungeon.hazards.find((h) => h.kind === "pelican"),
    TRACK,
  );
}

test("pelican bills overlap a truck in range", async ({ page }) => {
  await startShipyard(page);
  // Wait for it to perch, then park one car length ahead of its bill.
  await page.evaluate(() => {
    const g = window.__game!;
    for (let f = 0; f < 1200; f++) {
      const pelican = g.snapshot().dungeon.hazards.find((h) => h.kind === "pelican")!;
      if (!pelican.flying) break;
      g.advanceFrames(12, 1, {});
    }
    const pelican = g.snapshot().dungeon.hazards.find((h) => h.kind === "pelican")!;
    const yaw = pelican.yaw ?? 0;
    g.place(
      { x: pelican.x + Math.sin(yaw) * 4, y: 2, z: pelican.z + Math.cos(yaw) * 4 },
      yaw,
    );
  });
  // Step to the strike window, then freeze the bill mid-overlap.
  let striking = false;
  for (let i = 0; i < 40 && !striking; i++) {
    await page.evaluate(() => window.__game!.advanceFrames(6, 1, {}));
    striking = (await pelicanStriking(page))?.striking ?? false;
  }
  expect(striking).toBe(true);
  await page.screenshot({ path: "test-results/shipyard-pelican-strike.png" });
  // The strike lands: the truck is wrecked.
  await page.evaluate(() => window.__game!.advanceFrames(120, 1, {}));
  const run = await page.evaluate(() => window.__game!.snapshot().run);
  expect(run?.status).toBe("failed");
});

test("anchor hooks chain touches and dunks full-throttle trucks", async ({
  page,
}) => {
  await startShipyard(page);
  // Park on the ground chain facing away from the harbor pool.
  const fired = await page.evaluate((track: typeof TRACK) => {
    const g = window.__game!;
    const anchor = g.track(track).custom!.prefabs.find((p) => p.id === "anchor-1")!;
    const yaw = anchor.yaw ?? 0;
    g.place(
      {
        x: anchor.x + Math.sin(yaw) * 6,
        y: 2,
        z: anchor.z + Math.cos(yaw) * 6,
      },
      0,
    );
    for (let f = 0; f < 120; f++) {
      g.advanceFrames(1, 1, { brake: 1 });
      if (g.snapshot().dungeon.hazards.find((h) => h.id === "anchor-1")?.fired)
        return true;
    }
    return false;
  }, TRACK);
  expect(fired).toBe(true);
  // Mid-drag snapshot: the truck yanks toward the flying anchor.
  await page.evaluate(() => window.__game!.advanceFrames(90, 1, { throttle: 1 }));
  await page.screenshot({ path: "test-results/shipyard-anchor-drag.png" });
  // Floor it away: the winch still drowns the truck.
  const run = await page.evaluate(() => {
    const g = window.__game!;
    for (let f = 0; f < 2400 && g.snapshot().run?.status === "running"; f++)
      g.advanceFrames(1, 1, { throttle: 1 });
    return { run: g.snapshot().run, pos: g.snapshot().position };
  });
  expect(run.run?.status).toBe("failed");
  expect(run.pos.y).toBeLessThan(2);
});

test("ferry jump lands on deck and finishes the race", async ({ page }) => {
  await startShipyard(page);
  for (const gate of [0, 1, 2]) {
    const run = await crossGate(page, gate);
    expect(run?.checkpoint).toBe(gate + 1);
  }
  // Full speed at the ramp from up the quay.
  await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: 80, y: 2, z: 48 }, Math.PI / 2);
    for (let f = 0; f < 300; f++) {
      g.advanceFrames(1, 1, { throttle: 1 });
      if (g.snapshot().position.y > 5.5) break;
    }
  });
  await page.screenshot({ path: "test-results/shipyard-jump.png" });
  // Ride out the voyage, then drive the deck to the finish.
  const run = await page.evaluate(() => {
    const g = window.__game!;
    let lastX = -1;
    let still = 0;
    for (let f = 0; f < 6000 && g.snapshot().run?.status === "running"; f++) {
      const s = g.snapshot();
      const ship = s.dungeon.hazards.find((h) => h.id === "ferry")!;
      const p = s.position;
      if (s.run!.checkpoint === 3 && p.x > 115 && p.y > 2.5) {
        if (Math.abs(ship.x - lastX) < 0.01) still++;
        else still = 0;
        lastX = ship.x;
        if (still < 240) {
          g.advanceFrames(1, 1, { brake: 1 });
          continue;
        }
      }
      g.driveFrames(1, 1, (state) => {
        const aim =
          Math.atan2(230 - state.position.x, 38 - state.position.z) -
          Math.atan2(state.forward[0], state.forward[2]);
        const error = Math.atan2(Math.sin(aim), Math.cos(aim));
        return {
          steer: Math.max(-1, Math.min(1, error * 2.5)),
          throttle: 1,
          brake: 0,
        };
      }, false);
    }
    return g.snapshot().run;
  });
  await page.screenshot({ path: "test-results/shipyard-deck.png" });
  expect(run?.status).toBe("completed");
});
