import { test, expect, type Page } from "@playwright/test";

test.slow();

const TRACK = "custom:spider-hollow" as const;

async function startHollow(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((track: typeof TRACK) => {
    const g = window.__game!;
    g.startTrack(track);
    g.pause(true);
  }, TRACK);
}

test("spider hunts trucks stuck in the web", async ({ page }) => {
  await startHollow(page);
  // Park deep in the silk and wait for the hunt.
  await page.evaluate(() => {
    const g = window.__game!;
    const web = g.snapshot().dungeon.hazards.find((h) => h.kind === "spider")!;
    g.place({ x: web.x + 6, y: 2, z: web.z }, 0);
    for (let f = 0; f < 100; f++) {
      g.advanceFrames(12, 1, { throttle: 1 });
      if (g.snapshot().dungeon.hazards.find((h) => h.kind === "spider")?.hunting)
        break;
    }
  });
  const hunting = await page.evaluate(
    () => window.__game!.snapshot().dungeon.hazards.find((h) => h.kind === "spider")?.hunting,
  );
  expect(hunting).toBe(true);
  await page.screenshot({ path: "test-results/hollow-spider-hunt.png" });
  // The hunt ends in a kill.
  await page.evaluate(() => {
    const g = window.__game!;
    for (let f = 0; f < 100 && g.snapshot().run?.status === "running"; f++)
      g.advanceFrames(12, 1, { throttle: 1 });
  });
  const run = await page.evaluate(() => window.__game!.snapshot().run);
  expect(run?.status).toBe("failed");
});

test("dummy pits kill wandering trucks", async ({ page }) => {
  await startHollow(page);
  const plunge = (x: number, y: number, z: number) =>
    page.evaluate(
      ([px, py, pz, track]) => {
        const g = window.__game!;
        g.startTrack(track);
        g.pause(true);
        g.place({ x: px, y: py, z: pz }, 0);
        for (let f = 0; f < 100 && g.snapshot().run?.status === "running"; f++)
          g.advanceFrames(12, 1, {});
        const status = g.snapshot().run?.status;
        (window as unknown as { __captureFreeze: boolean }).__captureFreeze = true;
        g.overhead(px, pz, 70);
        return status;
      },
      [x, y, z, TRACK] as const,
    );
  let status = await plunge(95, 2, 0);
  expect(status).toBe("failed");
  await page.screenshot({ path: "test-results/hollow-spike-pit.png" });
  status = await plunge(105, 2, -60);
  expect(status).toBe("failed");
  await page.screenshot({ path: "test-results/hollow-fire-pit.png" });
  status = await plunge(-5, 2, -60);
  expect(status).toBe("failed");
  await page.screenshot({ path: "test-results/hollow-slime-pit.png" });
});
