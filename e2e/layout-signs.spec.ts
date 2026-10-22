import { test, expect } from "@playwright/test";
test("level navigation stays outside the playable canvas at desktop and narrow widths", async ({
  page,
}, info) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => window.__game!.select("easy"));
  for (const width of [1280, 800]) {
    await page.setViewportSize({ width, height: 720 });
    const boxes = await page.evaluate(() => ({
      canvas: document
        .querySelector("#viewport canvas")!
        .getBoundingClientRect()
        .toJSON(),
      buttons: Array.from(document.querySelectorAll("[data-stage]")).map((e) =>
        e.getBoundingClientRect().toJSON(),
      ),
    }));
    for (const b of boxes.buttons) {
      expect(b.width).toBeGreaterThan(0);
      expect(
        Math.max(
          0,
          Math.min(b.right, boxes.canvas.right) -
            Math.max(b.left, boxes.canvas.left),
        ) *
          Math.max(
            0,
            Math.min(b.bottom, boxes.canvas.bottom) -
              Math.max(b.top, boxes.canvas.top),
          ),
      ).toBe(0);
    }
    await page.screenshot({
      path: info.outputPath(`unobstructed-${width}.png`),
    });
  }
});
test("Ignition and other finish signs face the approach without mirrored lettering", async ({
  page,
}, info) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => window.__game!.select("easy"));
  const signs = await page.evaluate(() => window.__game!.signs());
  expect(signs).toHaveLength(3);
  for (const sign of signs) {
    expect(sign.facingApproach).toBe(true);
    expect(sign.textRunsLeftToRight).toBe(true);
  }
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.place({ x: -24, y: 2, z: 60 }, 0);
  });
  await page.screenshot({ path: info.outputPath("ignition-readable.png") });
});
