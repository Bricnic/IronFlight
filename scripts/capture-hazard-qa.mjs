import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { comicHazards } from "../src/comic-hazards.ts";
import { TRACKS } from "../src/tracks.ts";
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const kinds = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "book",
      "teeth",
      "computer",
      "flippers",
      "hydrant",
      "burner",
      "water",
      "potion",
    ];
await mkdir("docs/hazard-qa", { recursive: true });
const rows = [];
try {
  await page.goto("http://127.0.0.1:5173/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => document.fonts.ready);
  for (const kind of kinds) {
    const track = TRACKS.find((t) =>
      comicHazards(t).some((h) => h.kind === kind),
    );
    const h = comicHazards(track).find((h) => h.kind === kind);
    await page.evaluate(
      ({ track, h }) => {
        const g = window.__game;
        g.pause(true);
        g.startTrack(track.id);
        g.place(
          { x: h.x - (h.kind === "burner" ? 10 : 0), y: 2.1, z: h.z - 18 },
          0,
        );
        g.hazardOverview(h.id);
      },
      { track, h },
    );
    await page.waitForLoadState("networkidle");
    await page.evaluate((id) => window.__game.hazardOverview(id), h.id);
    const stats = await page.evaluate(
      (id) => window.__game.stats().comicHazards.find((h) => h.id === id),
      h.id,
    );
    if (stats.triangles < 100000) throw Error(`Insufficient detail: ${kind}`);
    await page.screenshot({ path: `docs/hazard-qa/${kind}.png` });
    rows.push({ ...stats, track: track.name, file: `${kind}.png` });
    console.log(JSON.stringify(rows.at(-1)));
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  await writeFile(
    "docs/hazard-qa/geometry.json",
    JSON.stringify({ rows, errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
