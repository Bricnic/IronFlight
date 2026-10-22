import { test, expect } from "@playwright/test";
const tracks = [
  "harbor-sprint",
  "foundry-run",
  "skyline-circuit",
  "scrapyard-sweep",
  "inferno-vault",
] as const;
test("failed runs wait, fade and keep the world ticking", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("scrapyard-sweep");
    g.advanceFrames(7201, 1, {});
  });
  const initial = await page.evaluate(() => window.__game!.snapshot());
  expect(initial.run?.status).toBe("failed");
  const result = page.locator("#track-result");
  await expect(result).toHaveCSS("opacity", "0");
  await page.evaluate(() => window.__game!.advanceFrames(119, 1, {}));
  await expect(result).toHaveCSS("opacity", "0");
  await page.evaluate(() => window.__game!.advanceFrames(91, 1, {}));
  expect(
    Number(await result.evaluate((e) => getComputedStyle(e).opacity)),
  ).toBeCloseTo(0.5, 1);
  await page.evaluate(() => window.__game!.advanceFrames(90, 1, {}));
  await expect(result).toHaveCSS("opacity", "1");
  expect(
    (await page.evaluate(() => window.__game!.snapshot())).time,
  ).toBeGreaterThan(initial.time + 4.9);
  // Real RAF playback continues even with the result fully visible.
  await page.evaluate(() => window.__game!.pause(false));
  const time = await page.evaluate(() => window.__game!.snapshot().time);
  await expect
    .poll(() => page.evaluate(() => window.__game!.snapshot().time))
    .toBeGreaterThan(time + 0.2);
});
for (const id of tracks)
  test(`${id} has loaded tiled concrete and shared asphalt`, async ({
    page,
  }, info) => {
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    await page.evaluate((id) => {
      window.__game!.pause(true);
      window.__game!.startTrack(id);
    }, id);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window.__game!.stats().officialCourse as any).surfaces.filter(
              (s: any) => s.map,
            ).length,
        ),
      )
      .toBeGreaterThan(0);
    const surfaces = await page.evaluate(
      () => (window.__game!.stats().officialCourse as any).surfaces,
    );
    expect(surfaces.find((s: any) => s.id === "ground").map).toContain(
      "concrete_",
    );
    if (!id.includes("sweep") && !id.includes("vault"))
      expect(
        surfaces
          .filter((s: any) => s.id.startsWith("road-"))
          .every((s: any) => s.map.includes("asphalt_02")),
      ).toBe(true);
    await page.screenshot({ path: info.outputPath(`${id}-materials.png`) });
  });
