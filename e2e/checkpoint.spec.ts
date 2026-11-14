import { test, expect, type Page } from "@playwright/test";

test.slow();

const TRACK = "foundry-run" as const;

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

async function startRace(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((track) => {
    const g = window.__game!;
    g.startTrack(track);
    g.pause(true);
  }, TRACK);
}

test("checkpoint banner shows ahead/behind deltas against the best", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "iron-flight-best-times-v1",
      JSON.stringify({
        version: 1,
        records: {
          "foundry-run:default": {
            time: 999,
            splits: [999, 0.01, 999, 999, 999, 999, 999],
          },
        },
      }),
    ),
  );
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((track) => {
    const g = window.__game!;
    g.startTrack(track);
    g.pause(true);
  }, TRACK);

  const first = await crossGate(page, 0);
  expect(first?.checkpoint).toBe(1);
  // Let the burst develop mid-flight; sim time freezes it for the shot.
  await page.evaluate(() => window.__game!.advanceFrames(30, 1, {}));
  await expect(page.locator("#checkpoint-banner")).toBeVisible();
  await expect(page.locator("#checkpoint-banner")).toHaveCSS("opacity", "1");
  await expect(page.locator("#checkpoint-banner strong")).toHaveText(
    "CHECKPOINT!",
  );
  await expect(page.locator("#checkpoint-delta")).toBeVisible();
  await expect(page.locator("#checkpoint-delta")).toHaveText(/^-\d+\.\d$/);
  await expect(page.locator("#checkpoint-delta")).toHaveClass(/ahead/);
  await expect(page.locator("#confetti")).toHaveAttribute("data-bursts", "1");
  await page.screenshot({ path: "test-results/checkpoint-ahead.png" });

  const second = await crossGate(page, 1);
  expect(second?.checkpoint).toBe(2);
  await page.evaluate(() => window.__game!.advanceFrames(30, 1, {}));
  await expect(page.locator("#checkpoint-delta")).toHaveText(/^\+\d+\.\d$/);
  await expect(page.locator("#checkpoint-delta")).toHaveClass(/behind/);
  await expect(page.locator("#confetti")).toHaveAttribute("data-bursts", "2");
  await page.screenshot({ path: "test-results/checkpoint-behind.png" });

  // Park behind gate 1 and idle past the banner lifetime.
  await page.evaluate((track) => {
    const g = window.__game!;
    const gate = g.track(track).checkpoints[0];
    g.place(
      { x: gate.x - gate.nx * 8, y: gate.y, z: gate.z - gate.nz * 8 },
      Math.atan2(gate.nx, gate.nz),
    );
    g.advanceFrames(300, 1, {});
  }, TRACK);
  await expect(page.locator("#checkpoint-banner")).toBeHidden();
  await expect(page.locator("#confetti")).toBeHidden();
});

test("checkpoint banner hides the delta without a best time", async ({
  page,
}) => {
  await startRace(page);
  const first = await crossGate(page, 0);
  expect(first?.checkpoint).toBe(1);
  await page.evaluate(() => window.__game!.advanceFrames(30, 1, {}));
  await expect(page.locator("#checkpoint-banner")).toBeVisible();
  await expect(page.locator("#checkpoint-banner")).toHaveCSS("opacity", "1");
  await expect(page.locator("#checkpoint-delta")).toBeHidden();
  await page.screenshot({ path: "test-results/checkpoint-no-best.png" });
});
