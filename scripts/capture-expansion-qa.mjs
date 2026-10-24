import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(120000);
await page.addInitScript(() => {
  const native = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) =>
    native((time) => {
      if (!window.__qaFreeze) callback(time);
    });
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const only = new Set(process.argv.slice(2));
const shots = [
  { name: "canyon-top", track: "canyon-plunge", at: [0, 81.4, -90], yaw: 0, settle: 30 },
  { name: "canyon-lip", track: "canyon-plunge", at: [0, 20, 790], yaw: 0, settle: 30 },
  { name: "canyon-gauntlet", track: "canyon-plunge", at: [0, 5, 890], yaw: 0, settle: 60 },
  { name: "hollow-stones", track: "haunted-hollow", at: [0, 2.1, -60], yaw: 0, settle: 60 },
  { name: "hollow-crypt", track: "haunted-hollow", at: [100, 2.1, -70], yaw: Math.PI, settle: 60 },
  { name: "hollow-stone-close", track: "haunted-hollow", at: [-140, 2.1, -91], yaw: 0, settle: 120 },
  { name: "hollow-smash", track: "haunted-hollow", at: [-135, 2.1, -89], yaw: 0, settle: 25, input: { throttle: 1 } },
  { name: "slide-top", track: "sky-slide", at: [0, 101.4, -90], yaw: 0, settle: 30 },
  { name: "slide-mid", track: "sky-slide", at: [28.5, 60, 490], yaw: 0, settle: 60 },
  { name: "slide-finish", track: "sky-slide", at: [0, 2.1, 2300], yaw: 0, settle: 30 },
  { name: "slide-ring", track: "sky-slide", at: [0, 2.1, 2359], yaw: 0, settle: 55 },
];
await mkdir("docs/expansion-qa", { recursive: true });
const rows = [];
try {
  await page.goto("http://127.0.0.1:5173/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    window.__game.pause(true);
    window.__qaFreeze = true;
  });
  await page.waitForTimeout(100);
  await page.waitForTimeout(2000);
  for (const track of ["canyon-plunge", "haunted-hollow", "sky-slide"]) {
    await page.evaluate((id) => {
      const g = window.__game;
      g.pause(true);
      g.startTrack(id);
      g.advanceFrames(10, 1, {});
    }, track);
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.__game.advanceFrames(5, 1, {}));
  }
  for (const shot of shots.filter((s) => !only.size || only.has(s.name))) {
    await page.evaluate(
      ({ track, at, yaw, settle, input }) => {
        const g = window.__game;
        g.pause(true);
        g.startTrack(track);
        g.place({ x: at[0], y: at[1], z: at[2] }, yaw);
        g.advanceFrames(settle, 1, input ?? {});
      },
      shot,
    );
    await page.waitForFunction(
      () => window.__game.stats().officialCourse.surfaces.every((s) => !!s.map),
      null,
      { polling: 100 },
    );
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.__game.advanceFrames(5, 1, {}));
    const stats = await page.evaluate(() => {
      const s = window.__game.stats();
      return {
        drawCalls: s.drawCalls,
        renderTriangles: s.renderTriangles,
        surfaces: s.officialCourse.surfaces.length,
      };
    });
    await page.screenshot({ path: `docs/expansion-qa/${shot.name}.png` });
    rows.push({ ...shot, ...stats });
    console.log(JSON.stringify(rows.at(-1)));
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  let combined = rows;
  if (only.size) {
    try {
      const prior = JSON.parse(
        await readFile("docs/expansion-qa/shots.json", "utf8"),
      );
      const names = new Set(rows.map((r) => r.name));
      combined = [...prior.rows.filter((r) => !names.has(r.name)), ...rows];
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  await writeFile(
    "docs/expansion-qa/shots.json",
    JSON.stringify({ rows: combined, errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
