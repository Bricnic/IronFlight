import { test, expect } from "@playwright/test";
import level from "../levels/official/Fairground.json" with { type: "json" };

test.setTimeout(180000);
test.use({ viewport: { width: 1100, height: 820 } });
test("every Fairground lava pit is exposed and stable under a small camera orbit", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.evaluate(() => {
    window.__game!.pause(true);
    window.__game!.startTrack("custom:fairground");
  });
  await page.waitForLoadState("networkidle");
  for (const pit of level.solids.filter((s) => s.kind === "lava")) {
    const captures: number[][][] = [];
    for (const angle of [-0.025, 0.025]) {
      const points = await page.evaluate(
        ({ pit, angle }) => {
          const g = window.__game!;
          g.lavaPitOverview(pit.id, angle);
          const samples: { x: number; y: number }[] = [];
          for (let row = 0; row < 7; row++)
            for (let col = 0; col < 11; col++)
              samples.push(
                g.project({
                  x: pit.x + (col / 10 - 0.5) * pit.w * 0.8,
                  y: pit.y + pit.h / 2,
                  z: pit.z + (row / 6 - 0.5) * pit.d * 0.8,
                }),
              );
          return samples;
        },
        { pit, angle },
      );
      const png = await page.screenshot({
        path: info.outputPath(`${pit.id}-${angle < 0 ? "left" : "right"}.png`),
      });
      const colors = await page.evaluate(
        async ({ base64, points }) => {
          const img = new Image();
          img.src = `data:image/png;base64,${base64}`;
          await img.decode();
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          return points.map((p) =>
            Array.from(
              ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data,
            ).slice(0, 3),
          );
        },
        { base64: png.toString("base64"), points },
      );
      const molten =
        colors.filter(([r, g, b]) => r > 60 && r > g * 1.2 && r > b * 1.5)
          .length / colors.length;
      expect(
        molten,
        `${pit.id}: the screenshot must show lava across its interior`,
      ).toBeGreaterThan(0.7);
      captures.push(colors);
    }
    // Compare the same world points, not screen coordinates. Coplanar faces
    // fighting for depth would flip large patches between lava and pavement.
    const stable = captures[0].filter(
      (a, i) =>
        Math.max(...a.map((v, c) => Math.abs(v - captures[1][i][c]))) < 65,
    ).length;
    expect(
      stable / captures[0].length,
      `${pit.id}: no depth-fighting during orbit`,
    ).toBeGreaterThan(0.9);
  }
});
