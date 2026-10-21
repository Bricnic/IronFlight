import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?test=lava");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    window.__game!.pause(true);
    window.__game!.select("easy");
  });
  await page.waitForLoadState("networkidle");
});

test("low-angle basin orbit does not cause texture jumps at fixed surface points", async ({
  page,
}, info) => {
  const frames: number[][][] = [];
  for (const angle of [-0.002, -0.001, 0, 0.001, 0.002]) {
    frames.push(
      await page.evaluate((angle) => window.__game!.basinProbe(angle), angle),
    );
  }
  const changes: number[] = [];
  for (let frame = 1; frame < frames.length; frame++)
    for (let point = 0; point < frames[frame].length; point++)
      changes.push(
        Math.max(
          ...frames[frame][point].map((v, c) =>
            Math.abs(v - frames[frame - 1][point][c]),
          ),
        ),
      );
  const jumps = changes.filter((v) => v > 18).length / changes.length;
  await info.attach("basin orbit pixel changes", {
    body: JSON.stringify({ jumps, max: Math.max(...changes), changes }),
    contentType: "application/json",
  });
  expect(Math.max(...changes)).toBeLessThan(8);
  expect(jumps).toBeLessThan(0.002);
  await page.screenshot({ path: "artifacts/basin-low-angle-fixed.png" });
});

test("a detached wheel burns, smokes, chars and disappears below lava over two seconds", async ({
  page,
}) => {
  await page.evaluate(() => {
    const g = window.__game!;
    g.dropPartInLava("wheel-fl");
    for (
      let frame = 0;
      frame < 120 && !g.snapshot().parts["wheel-fl"].lava;
      frame++
    )
      g.advanceFrames(1, 1, {});
    g.lavaOverview();
  });
  const entry = await page.evaluate(
    () => window.__game!.snapshot().parts["wheel-fl"],
  );
  expect(entry.lava).not.toBeNull();
  await page.evaluate(() => window.__game!.advanceFrames(30, 1, {}));
  const half = await page.evaluate(() => ({
    part: window.__game!.snapshot().parts["wheel-fl"],
    mesh: window.__game!.visualPart("wheel-fl"),
    effects: window.__game!.stats().lavaParts,
  }));
  expect(half.part.lava!.progress).toBeGreaterThan(0.2);
  expect(half.part.lava!.progress).toBeLessThan(0.35);
  expect(half.mesh.visible).toBe(true);
  expect(half.mesh.lavaScorch).toBeGreaterThan(0.3);
  expect(half.effects.find((p) => p.id === "wheel-fl")).toMatchObject({
    fire: true,
    smoke: true,
  });
  await page.screenshot({ path: "artifacts/lava-wheel-burning.png" });
  await page.evaluate(() => window.__game!.advanceFrames(90, 1, {}));
  expect(
    await page.evaluate(() => window.__game!.visualPart("wheel-fl").visible),
  ).toBe(false);
  expect(
    await page.evaluate(() =>
      window.__game!.stats().lavaParts.find((p) => p.id === "wheel-fl"),
    ),
  ).toMatchObject({ fire: false, smoke: false });
  await page.screenshot({ path: "artifacts/lava-wheel-submerged.png" });
});
