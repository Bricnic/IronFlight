import { test, expect } from "@playwright/test";
import { HAZARDS } from "../src/hazards";

for (const rate of [1, 16])
  test(`spike hammer tears off panels and launches the truck at ${rate}x`, async ({
    page,
  }, info) => {
    await page.goto("/?test=hammer-impact");
    await page.waitForFunction(() => !!window.__game);
    const hammer = HAZARDS.find((h) => h.id === "hard-hammer")!;
    const result = await page.evaluate(
      ({ h, rate }) => {
        const g = window.__game!;
        g.pause(true);
        g.select("hard");
        const start = { x: h.x + 4.7, y: h.y + 0.5, z: h.z };
        g.place(start, 0);
        let peakY = start.y,
          peakUpward = 0;
        const samples: {
          time: number;
          y: number;
          vy: number;
          integrity: number;
        }[] = [];
        g.driveFrames(Math.ceil(78 / rate), rate, (s) => {
          peakY = Math.max(peakY, s.position.y);
          peakUpward = Math.max(peakUpward, s.velocity.y);
          if (s.ticks % 6 === 0)
            samples.push({
              time: s.time,
              y: s.position.y,
              vy: s.velocity.y,
              integrity: s.integrity,
            });
          return {};
        });
        const state = g.snapshot();
        const detached = Object.keys(state.parts).filter(
          (id) => state.parts[id].detached,
        );
        const rendered = detached.map((id) => g.visualPart(id));
        return { start, state, peakY, peakUpward, detached, rendered, samples };
      },
      { h: hammer, rate },
    );
    await info.attach("hammer-launch-telemetry", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
    expect(result.state.hammerImpacts).toHaveLength(1);
    expect(result.peakUpward).toBeGreaterThan(12);
    expect(result.peakY - result.start.y).toBeGreaterThan(8);
    expect(result.state.integrity).toBeLessThan(0.8);
    expect(result.detached.length).toBeGreaterThan(0);
    expect(result.rendered.every((part) => part.detached && part.visible)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`hammer-launch-${rate}x.png`),
    });
  });

test("a hammer near miss leaves the truck intact", async ({ page }) => {
  await page.goto("/?test=hammer-near-miss");
  await page.waitForFunction(() => !!window.__game);
  const h = HAZARDS.find((h) => h.id === "hard-hammer")!;
  const state = await page.evaluate((h) => {
    const g = window.__game!;
    g.pause(true);
    g.select("hard");
    g.place({ x: h.x + 6.7, y: h.y + 1.7, z: h.z + 1.9 }, 0);
    g.advanceFrames(1, 1, {});
    return g.snapshot();
  }, h);
  expect(state.hammerImpacts).toHaveLength(0);
  expect(state.integrity).toBe(1);
});
