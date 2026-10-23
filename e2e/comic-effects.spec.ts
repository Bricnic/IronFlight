import { test, expect } from "@playwright/test";
import { POTIONS } from "../src/comic-hazards";
for (const revealFrames of [0, 301])
  test(`R restarts a wrecked run with game-over reveal at ${revealFrames} frames`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    await page.evaluate((frames) => {
      const g = window.__game!;
      g.pause(true);
      g.startTrack("harbor-sprint");
      const h = g.snapshot().comic.hazards.find((h) => h.kind === "book")!;
      g.place({ x: h.x, y: 2.1, z: h.z }, 0);
      for (let i = 0; i < 240 && g.snapshot().status !== "wrecked"; i++)
        g.driveFrames(1, 1, () => ({}), false);
      g.advanceFrames(frames, 1, {});
    }, revealFrames);
    expect(
      await page.evaluate(() => window.__game!.snapshot().run?.status),
    ).toBe("failed");
    await expect(page.locator("#track-result")).toHaveCSS(
      "opacity",
      revealFrames ? "1" : "0",
    );
    if (revealFrames) await page.locator("#result-level-select").focus();
    await page.keyboard.press("r");
    const restarted = await page.evaluate(() => window.__game!.snapshot());
    expect(restarted.run?.status).toBe("running");
    expect(restarted.run?.trackId).toBe("harbor-sprint");
    expect(restarted.run?.elapsed).toBe(0);
    expect(restarted.integrity).toBe(1);
    await expect(page.locator("#track-result")).toBeHidden();
    await page.keyboard.down("ArrowUp");
    await page.evaluate(() => window.__game!.advanceFrames(90, 1));
    await page.keyboard.up("ArrowUp");
    expect(
      await page.evaluate(() => window.__game!.snapshot().speed),
    ).toBeGreaterThan(3);
  });
for (const [i, effect] of POTIONS.entries())
  test(`potion ${effect}: visible effect, five-second lifetime, reset`, async ({
    page,
  }, info) => {
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    const result = await page.evaluate(
      ({ i }) => {
        const g = window.__game!;
        g.pause(true);
        g.startTrack("harbor-sprint");
        const h = g.snapshot().comic.hazards.find((h) => h.kind === "potion")!;
        g.place({ x: h.x + (i - 1.5) * 4.4, y: 2, z: h.z }, 0);
        g.advanceFrames(6, 1, {});
        return { state: g.snapshot(), art: g.stats() };
      },
      { i },
    );
    expect(result.state.comic.effect).toBe(effect);
    expect(result.state.comic.remaining).toBeGreaterThan(4.8);
    const fx = result.art as any;
    if (effect === "nitro") expect(fx.potions.jets).toBe(true);
    if (effect === "fog") expect(fx.potions.filter).toContain("blur");
    if (effect === "tall") expect(fx.potions.hoodScale[1]).toBeGreaterThan(1.8);
    if (effect === "wide") expect(fx.potions.hoodScale[0]).toBeGreaterThan(1.7);
    await page.screenshot({ path: info.outputPath(`potion-${effect}.png`) });
    await page.evaluate(() => {
      const g = window.__game!;
      g.place({ x: 120, y: 2, z: 350 }, 0);
      g.advanceFrames(310, 1, {});
    });
    expect(
      await page.evaluate(() => window.__game!.snapshot().comic.effect),
    ).toBeNull();
    const reset = await page.evaluate(() => window.__game!.stats() as any);
    expect(reset.potions.jets).toBe(false);
    expect(reset.potions.filter).toBe("");
    expect(reset.potions.hoodScale).toEqual([1, 1, 1]);
  });
test("destroyed car keeps shedding debris throughout delayed game-over reveal", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("harbor-sprint");
    const h = g.snapshot().comic.hazards.find((h) => h.kind === "book")!;
    g.place({ x: h.x, y: 2.1, z: h.z }, 0);
    for (let i = 0; i < 240 && g.snapshot().status !== "wrecked"; i++)
      g.driveFrames(1, 1, () => ({}), false);
  });
  const first = await page.evaluate(() => window.__game!.snapshot());
  expect(first.status).toBe("wrecked");
  await expect(page.locator("#track-result")).toHaveCSS("opacity", "0");
  await page.evaluate(() => window.__game!.advanceFrames(120, 1, {}));
  expect(
    Number(
      await page
        .locator("#track-result")
        .evaluate((e) => getComputedStyle(e).opacity),
    ),
  ).toBeLessThan(0.01);
  await page.evaluate(() => window.__game!.advanceFrames(90, 1, {}));
  expect(
    Number(
      await page
        .locator("#track-result")
        .evaluate((e) => getComputedStyle(e).opacity),
    ),
  ).toBeCloseTo(0.5, 1);
  const moving = await page.evaluate(() => window.__game!.snapshot());
  expect(moving.parts.roof.position).not.toEqual(first.parts.roof.position);
  await page.screenshot({ path: info.outputPath("wreck-fade-half.png") });
  await page.evaluate(() => window.__game!.advanceFrames(91, 1, {}));
  await expect(page.locator("#track-result")).toHaveCSS("opacity", "1");
  const final = await page.evaluate(() => window.__game!.snapshot());
  expect(final.time).toBeGreaterThan(first.time + 5);
  expect(final.run?.elapsed).toBe(first.run?.elapsed);
});
