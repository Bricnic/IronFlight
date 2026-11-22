import { test, expect } from "@playwright/test";

test("Lavabridge Abyss rooftop caterpillar keeps crawling without leaving its platform", async ({ page }, info) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  const fixture = await page.evaluate(() => {
    const g = window.__game!; g.startTrack("custom:lavabridge-abyss"); g.pause(true);
    const level = g.track("custom:lavabridge-abyss").custom!;
    const cat = level.prefabs.find(p => p.kind === "cave-caterpillar" && (p.y ?? 0) > 5)!;
    const roof = level.solids.find(s => s.id === "la-tun1-roof")!;
    return { cat, roof };
  });
  await page.evaluate(cat => window.__game!.frameSpot(cat.x, cat.y! + 2, cat.z, 18, 0.7, 0.35), fixture.cat);
  await page.screenshot({ path: info.outputPath("lavabridge-caterpillar-start.png") });
  const samples = await page.evaluate(id => {
    const g = window.__game!, samples = [];
    for (let i = 0; i < 10; i++) {
      g.advanceFrames(180, 1, {});
      samples.push(g.snapshot().dungeon.hazards.find(m => m.id === id)!);
    }
    return samples;
  }, fixture.cat.id);
  const { roof } = fixture, sin = Math.sin(roof.yaw ?? 0), cos = Math.cos(roof.yaw ?? 0);
  for (const sample of samples) {
    const dx = sample.x - roof.x, dz = sample.z - roof.z;
    expect(Math.abs(cos * dx - sin * dz)).toBeLessThan(roof.w / 2);
    expect(Math.abs(sin * dx + cos * dz)).toBeLessThan(roof.d / 2);
  }
  expect(samples.at(-1)!.trips).toBeGreaterThan(0);
  expect(samples.some(p => Math.hypot(p.x - fixture.cat.x, p.z - fixture.cat.z) > 2)).toBe(true);
  await page.evaluate(({ cat, last }) => window.__game!.frameSpot(last.x, cat.y! + 2, last.z, 18, 0.7, 0.35), { cat: fixture.cat, last: samples.at(-1)! });
  await page.screenshot({ path: info.outputPath("lavabridge-caterpillar-after-30s.png") });
});
