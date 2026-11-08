/**
 * Browser performance benchmark: per-level load latency, per-frame JS CPU
 * cost distribution (p50/p75/p90/max), over-budget frames per minute, and
 * render cost (draw calls / triangles / geometries / textures).
 *
 * Frame CPU is measured with __game.advanceFrames(1,...) which runs the full
 * sim step + view.render(draw=false) + hud without rasterization, so it is
 * fast and meaningful even on SwiftShader software GL. Draw calls and
 * triangle counts proxy GPU cost; loadSyncMs includes one rasterized frame.
 *
 * Usage: node scripts/perf-browser.mjs [--seconds N] [--out path] [--frames N]
 *
 * Starts `npm run dev` itself on 127.0.0.1:5173, drives headless Chromium
 * (SwiftShader software GL — absolute fps is NOT comparable to real GPUs,
 * but before/after deltas on this machine are), then shuts down.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
function opt(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}
const out = opt("--out", "artifacts/perf-browser.json");
const frames = Number(opt("--frames", "150")) || 150;
const BASE = "http://127.0.0.1:5173";

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)];
}

async function waitForServer(url, timeoutMs = 90000) {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() - start > timeoutMs) throw new Error("dev server timed out");
    await new Promise((r) => setTimeout(r, 500));
  }
}

const server = spawn("npm run dev -- --port 5173", [], {
  cwd: root,
  shell: true,
  stdio: "ignore",
});
let browser;
try {
  await waitForServer(BASE);
  browser = await chromium.launch({
    args: [
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-gpu-sandbox",
      "--no-sandbox",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  await page.goto(BASE);
  await page.waitForFunction(() => !!window.__game, null, { timeout: 90000 });
  await page.waitForTimeout(1500);

  const levelIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".track-card")).map((el) => ({
      id: el.dataset.track,
      name: el.querySelector("h2")?.textContent ?? el.dataset.track,
    })),
  );
  console.log(`levels: ${levelIds.length}`);

  const rows = [];
  for (const { id, name } of levelIds) {
    const load = await page.evaluate(
      (trackId) =>
        new Promise((resolve) => {
          const g = window.__game;
          const t0 = performance.now();
          g.pause(true);
          g.startTrack(trackId);
          const syncMs = performance.now() - t0;
          g.pause(false);
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              resolve({ syncMs, firstFrameMs: performance.now() - t0 }),
            ),
          );
        }),
      id,
    );
    // Warm up, then time individual update frames (sim + view JS + hud, no raster).
    await page.evaluate(() => window.__game.advanceFrames(10, 1, { throttle: 0.8 }));
    const cpu = await page.evaluate(
      ({ n }) => {
        const g = window.__game;
        const samples = [];
        for (let i = 0; i < n; i++) {
          const t0 = performance.now();
          g.advanceFrames(1, 1, {
            throttle: 0.8,
            steer: Math.sin(i / 20) * 0.3,
          });
          samples.push(performance.now() - t0);
        }
        return samples;
      },
      { n: frames },
    );
    const stats = await page.evaluate(() => window.__game.stats());
    const sorted = [...cpu].sort((a, b) => a - b);
    const over = cpu.filter((d) => d > 8).length;
    const frameBudget = 1000 / 60;
    rows.push({
      id,
      name,
      loadSyncMs: +load.syncMs.toFixed(2),
      firstFrameMs: +load.firstFrameMs.toFixed(2),
      cpuFrames: cpu.length,
      cpuP50Ms: +percentile(sorted, 50).toFixed(3),
      cpuP75Ms: +percentile(sorted, 75).toFixed(3),
      cpuP90Ms: +percentile(sorted, 90).toFixed(3),
      cpuMaxMs: +sorted[sorted.length - 1].toFixed(3),
      overBudgetPerMin: +((over / cpu.length) * (60000 / frameBudget)).toFixed(1),
      overBudgetPct: +((over / cpu.length) * 100).toFixed(1),
      drawCalls: stats.drawCalls,
      triangles: stats.renderTriangles ?? stats.triangles,
      geometries: stats.geometries,
      textures: stats.textures,
      videoTier: stats.video?.tier,
    });
    console.log(JSON.stringify(rows[rows.length - 1]));
  }
  mkdirSync(dirname(out) === "." ? "artifacts" : dirname(out), { recursive: true });
  const payload = {
    created: new Date().toISOString(),
    commit: process.env.GIT_COMMIT ?? "unknown",
    frames,
    viewport: "960x540",
    renderer: "swiftshader",
    rows,
  };
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(`wrote ${out}`);
} finally {
  await browser?.close();
  server.kill();
}
