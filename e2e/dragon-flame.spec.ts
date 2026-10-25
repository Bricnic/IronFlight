import { test, expect } from "@playwright/test";
// SwiftShader renders + readbacks make this spec exceed the default 90s.
test.slow();
test("dragon flame advances from its mouth and the shutdown tail clears outward", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/?test=dragon-flame-packet");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.select("easy");
    g.place({ x: -24, y: 2, z: 205 }, 0);
  });
  const samples = [];
  for (const [ms, head, opacity] of [
    [50, 0.0625, 0.25],
    [100, 0.25, 0.5],
    [150, 0.5, 0.75],
    [200, 1, 1],
  ]) {
    const state = await page.evaluate(() => {
      const g = window.__game!;
      g.advanceFrames(3, 1, {});
      return g.stats();
    });
    expect(state.flame.head).toBeCloseTo(head);
    expect(state.flame.tail).toBe(0);
    expect(state.flame.opacity).toBeCloseTo(opacity);
    expect(state.jetsVisible).toBe(6);
    samples.push(state.flame);
    await page.screenshot({ path: `artifacts/dragon-ignite-${ms}ms.png` });
  }
  await page.evaluate(() => window.__game!.advanceFrames(168, 1, {}));
  for (const [ms, tail, opacity] of [
    [50, 0.25, 1],
    [100, 0.5, 0.75],
    [150, 0.75, 0.5],
    [200, 0.875, 0.25],
    [250, 0, 0],
  ]) {
    const state = await page.evaluate(() => {
      const g = window.__game!;
      g.advanceFrames(3, 1, {});
      return g.stats();
    });
    expect(state.flame.tail).toBeCloseTo(tail);
    expect(state.flame.opacity).toBeCloseTo(opacity);
    expect(state.jetsVisible).toBe(opacity ? 6 : 0);
    if (opacity) expect(state.flame.head).toBe(1);
    samples.push(state.flame);
    await page.screenshot({ path: `artifacts/dragon-shutoff-${ms}ms.png` });
  }
  expect(errors).toEqual([]);
  await info.attach("flame-packets", {
    body: JSON.stringify(samples),
    contentType: "application/json",
  });
});
