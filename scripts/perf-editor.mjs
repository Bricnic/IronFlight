import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

/**
 * Editor interaction benchmark: open/select/drag latency on a prefab-heavy
 * level (North Pole Summit: 454 solids, 5100 prefabs).
 *
 * Measures wall-clock select latency (list row click to selected UI),
 * drag cost per pointermove step, and rAF fps during drags. Absolute
 * numbers on SwiftShader software GL are NOT comparable to real GPUs, but
 * before/after deltas on one machine are (same caveat as perf-browser.mjs).
 *
 * Usage: PREVIEW_PORT=5173 node scripts/perf-editor.mjs [--out path]
 * Requires a dev server (npm run dev) on PREVIEW_PORT.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
function opt(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}
const out = opt("--out", "artifacts/perf-editor.json");
const PORT = process.env.PREVIEW_PORT ?? "5173";
const level = JSON.parse(
  readFileSync(`${root}/levels/official/winter-wonderland/North Pole Summit.json`, "utf8"),
);
const median = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const browser = await chromium.launch({
  args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const result = { level: "North Pole Summit", port: PORT, at: new Date().toISOString() };
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#level-editor").waitFor();
  let t0 = Date.now();
  await page.locator("#editor-levels").selectOption("official/winter-wonderland/North Pole Summit");
  await page.waitForFunction(() => window.__game.editor().prefabs === 5100, null, { timeout: 120000 });
  result.openMs = Date.now() - t0;
  await page.waitForTimeout(1000);
  // Expand prefab kind sections (dispatchEvent fallback: toggle clicks flake
  // while heavy refreshes re-render the list).
  for (let i = 0; i < 10; i++) {
    const collapsed = page.locator(
      'li.editor-kind-section[data-kind^="prefab:"] .editor-kind-toggle[aria-expanded="false"]',
    );
    if ((await collapsed.count()) === 0) break;
    try {
      await collapsed.first().click({ timeout: 8000 });
    } catch {
      await collapsed.first().dispatchEvent("click");
    }
    await page.waitForTimeout(500);
  }
  // SELECT: click 5 spread rows, time to selected UI.
  const rows = page.locator('li.editor-kind-section[data-kind^="prefab:"] li[data-key^="prefab:"]');
  const n = await rows.count();
  result.selectRows = n;
  const times = [];
  for (let i = 0; i < 5; i++) {
    t0 = Date.now();
    await rows.nth(Math.floor((i * n) / 5)).locator("span").click();
    await page.locator('li.editor-kind-section[data-kind^="prefab:"] li[data-key^="prefab:"].selected').first().waitFor({ timeout: 60000 });
    times.push(Date.now() - t0);
  }
  result.selectMs = { samples: times, median: median(times) };
  // DRAG: grab a mid-map prefab on canvas, 20 steps, rAF fps during.
  const target = level.prefabs[Math.floor(level.prefabs.length / 2)];
  result.dragKind = target.kind;
  const pt = await page.evaluate(
    (p) => window.__game.editorProject({ x: p.x, y: p.y ?? 2, z: p.z }),
    { x: target.x, y: target.y ?? 2, z: target.z },
  );
  await page.evaluate(() => {
    window.__frames = 0;
    const loop = () => {
      window.__frames++;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  await page.waitForTimeout(300);
  const f0 = await page.evaluate(() => window.__frames);
  t0 = Date.now();
  const STEPS = 20;
  for (let i = 1; i <= STEPS; i++) {
    await page.mouse.move(pt.x + i * 4, pt.y + i * 2);
    await page.waitForTimeout(16);
  }
  const wall = Date.now() - t0;
  const f1 = await page.evaluate(() => window.__frames);
  await page.mouse.up();
  result.drag = { steps: STEPS, wallMs: wall, msPerStep: wall / STEPS, fps: (f1 - f0) / (wall / 1000) };
  console.log(JSON.stringify(result, null, 2));
  mkdirSync(dirname(`${root}/${out}`), { recursive: true });
  writeFileSync(`${root}/${out}`, JSON.stringify(result, null, 2) + "\n");
} finally {
  await browser.close();
}
