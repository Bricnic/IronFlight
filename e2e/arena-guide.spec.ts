import { test, expect, type Page } from "@playwright/test";

async function yellowPixels(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const canvas = document.querySelector(`${sel} canvas`) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i] > 200 && data[i + 1] > 180 && data[i + 2] < 120) n++;
    }
    return n;
  }, selector);
}

test("arena minimap clears chests and guides after 15s idle", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game!;
    g.startTrack("custom:tabletop-brawl");
    g.pause(true);
  });
  await page.waitForLoadState("networkidle");
  const before = await yellowPixels(page, "#level-hud");
  const first = await page.evaluate(() => {
    const t = window.__game!.track("custom:tabletop-brawl");
    return t.collectibles[0];
  });
  await page.evaluate((p) => {
    const g = window.__game!;
    g.place({ x: p.x, y: 2.1, z: p.z }, 0);
    g.pause(false);
    g.advanceFrames(5, 1, {});
    g.pause(true);
  }, first);
  const after = await yellowPixels(page, "#level-hud");
  console.log("YELLOW BEFORE/AFTER:", before, after);
  expect(after).toBeLessThan(before);
  await expect(page.locator("#hud-guide")).toBeHidden();
  // Idle past 15s without collecting: the arrow appears.
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(false);
    g.advanceFrames(130, 8, {});
    g.pause(true);
  });
  await expect(page.locator("#hud-guide")).toBeVisible();
  // The badge names the nearest uncollected ring or chest and its distance.
  const expected = await page.evaluate(() => {
    const g = window.__game!;
    const track = g.track("custom:tabletop-brawl");
    const snap = g.snapshot();
    const done = new Set(snap.run!.collected);
    let best: { label: string; distance: number } | null = null;
    for (const p of track.collectibles) {
      if (done.has(p.id)) continue;
      const d = Math.hypot(p.x - snap.position.x, p.z - snap.position.z);
      if (!best || d < best.distance)
        best = { label: p.kind === "chest" ? "CHEST" : "RING", distance: d };
    }
    return best!;
  });
  await expect(page.locator("#hud-guide-label")).toHaveText(
    `${expected.label} ${Math.round(expected.distance)}m`,
  );
  const angle = await page.evaluate(
    () => document.querySelector<HTMLElement>("#hud-guide-arrow")!.style.transform,
  );
  expect(angle).toMatch(/rotate\(-?\d+(\.\d+)?deg\)/);
  // Collecting again hides the arrow until the next idle stretch.
  const second = await page.evaluate(() => {
    const g = window.__game!;
    const t = g.track("custom:tabletop-brawl");
    return t.collectibles[1];
  });
  await page.evaluate((p) => {
    const g = window.__game!;
    g.place({ x: p.x, y: 2.1, z: p.z }, 0);
    g.pause(false);
    g.advanceFrames(5, 1, {});
    g.pause(true);
  }, second);
  await expect(page.locator("#hud-guide")).toBeHidden();
});
