// Playwright perf benchmark for all levels (SwiftShader / software GL).
// Usage:
//   node scripts/perf-bench.mjs [--port 5173] [--drive-secs 10] [--out artifacts/perf-baseline.json]
// Measures per level:
//   - time to first frame after level-select click (ms)
//   - sustained FPS + frame-time p50/p75/p90 over a 10s drive (holding W)
//   - long-frame drops per minute (>34ms)
//   - draw calls + triangles via renderer info (window.__game.stats())
//   - JS heap (performance.memory when available)
// Writes JSON + Markdown baseline artifacts.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = opt("--port", process.env.PERF_PORT ?? "5179");
const DRIVE_SECS = Number(opt("--drive-secs", "10"));
const JSON_OUT = opt("--out", "artifacts/perf-baseline.json");
const URL = `http://127.0.0.1:${PORT}/`;

async function waitForServer(url, timeoutMs = 60000) {
  const t0 = Date.now();
  for (;;) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    if (Date.now() - t0 > timeoutMs) throw new Error(`Server not up: ${url}`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

let server = null;
async function ensureServer() {
  try {
    await waitForServer(URL, 4000);
    return;
  } catch {}
  console.log(`Starting vite dev on :${PORT} ...`);
  server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(PORT)], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
  });
  await waitForServer(URL, 120000);
}

function summarize(samples) {
  const times = [];
  for (let i = 1; i < samples.length; i++) times.push(samples[i] - samples[i - 1]);
  times.sort((a, b) => a - b);
  if (!times.length) return { fps: 0, p50: 0, p75: 0, p90: 0, dropsPerMin: 0, frames: 0, elapsedMs: 0 };
  const q = (p) => times[Math.min(times.length - 1, Math.floor(p * times.length))];
  const elapsed = samples[samples.length - 1] - samples[0];
  const drops = times.filter((t) => t > 34).length;
  return {
    fps: (times.length * 1000) / elapsed,
    p50: q(0.5),
    p75: q(0.75),
    p90: q(0.9),
    dropsPerMin: (drops * 60000) / elapsed,
    frames: times.length,
    elapsedMs: elapsed,
  };
}

try {
  await ensureServer();
  const browser = await chromium.launch({
    args: [
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-gpu-sandbox",
      "--no-sandbox",
    ],
  });
  const errors = [];
  let levels = [];
  {
    const probe = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    probe.on("pageerror", (e) => errors.push(String(e?.message ?? e).slice(0, 300)));
    try {
      await probe.goto(URL, { timeout: 60000, waitUntil: "domcontentloaded" });
      await probe.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
      await probe.waitForFunction(
        () => document.querySelectorAll("#level-select [data-track]").length > 0,
        null,
        { timeout: 60000 },
      );
      levels = await probe
        .locator("#level-select [data-track]")
        .evaluateAll((cards) =>
          cards.map((c) => ({
            id: c.dataset.track,
            name: c.querySelector("h2")?.textContent?.trim() ?? c.dataset.track,
          })),
        );
    } finally {
      await probe.close();
    }
  }
    console.log(`Benchmarking ${levels.length} levels: ${levels.map((l) => l.id).join(", ")}`);
    const results = [];
    for (const level of levels) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      page.on("pageerror", (e) => errors.push(`${level.id}: ${String(e?.message ?? e).slice(0, 200)}`));
      let loaded = false;
      for (let attempt = 1; attempt <= 3 && !loaded; attempt++) {
        try {
          await page.goto(URL, { timeout: 60000, waitUntil: "domcontentloaded" });
          await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
          await page.waitForFunction(
            () => document.querySelectorAll("#level-select [data-track]").length > 0,
            null,
            { timeout: 60000 },
          );
          loaded = true;
        } catch (err) {
          console.log(`${level.id}: load attempt ${attempt} failed, retrying...`);
          if (attempt === 3) throw err;
        }
      }
      try {
      const btn = page.locator(`#level-select [data-track="${level.id}"] button`);
      const t0 = Date.now();
      await btn.click();
      await page.waitForFunction(
        () => document.getElementById("level-select")?.hidden === true,
        null,
        { timeout: 30000 },
      );
      // First rendered frame after the click.
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
      );
      const ttfMs = Date.now() - t0;
      // Drive forward for DRIVE_SECS and collect rAF timestamps.
      await page.keyboard.down("w");
      const samples = await page.evaluate(
        (secs) =>
          new Promise((resolve) => {
            const ts = [];
            const start = performance.now();
            const tick = (t) => {
              ts.push(t);
              if (t - start < secs * 1000) requestAnimationFrame(tick);
              else resolve(ts);
            };
            requestAnimationFrame(tick);
          }),
        DRIVE_SECS,
      );
      await page.keyboard.up("w");
      const s = summarize(samples);
      const stats = await page.evaluate(() => {
        try {
          const st = window.__game.stats();
          return {
            drawCalls: st.drawCalls ?? null,
            triangles: st.renderTriangles ?? null,
            geometries: st.geometries ?? null,
            textures: st.textures ?? null,
            tier: st.video?.tier ?? null,
          };
        } catch {
          return { drawCalls: null, triangles: null, geometries: null, textures: null, tier: null };
        }
      });
      const heap = await page.evaluate(() => {
        const m = performance.memory;
        return m ? { usedMB: m.usedJSHeapSize / 1048576, totalMB: m.totalJSHeapSize / 1048576 } : null;
      });
      const row = {
        id: level.id,
        name: level.name,
        timeToFirstFrameMs: Math.round(ttfMs * 10) / 10,
        fps: Math.round(s.fps * 100) / 100,
        frameP50Ms: Math.round(s.p50 * 100) / 100,
        frameP75Ms: Math.round(s.p75 * 100) / 100,
        frameP90Ms: Math.round(s.p90 * 100) / 100,
        dropsPerMinOver34ms: Math.round(s.dropsPerMin * 100) / 100,
        frames: s.frames,
        drawCalls: stats.drawCalls,
        triangles: stats.triangles,
        geometries: stats.geometries,
        textures: stats.textures,
        videoTier: stats.tier,
        heapUsedMB: heap ? Math.round(heap.usedMB * 100) / 100 : null,
        heapTotalMB: heap ? Math.round(heap.totalMB * 100) / 100 : null,
      };
      results.push(row);
      console.log(
        `${row.id}: ttf=${row.timeToFirstFrameMs}ms fps=${row.fps} p50=${row.frameP50Ms} p90=${row.frameP90Ms} drops/min=${row.dropsPerMinOver34ms} calls=${row.drawCalls} tris=${row.triangles}`,
      );
      } catch (err) {
        console.log(`${level.id}: FAILED ${String(err).split("\n")[0]}`);
        results.push({ id: level.id, name: level.name, error: String(err).split("\n")[0] });
      } finally {
        await page.close().catch(() => {});
      }
    }
    const payload = {
      generatedAt: new Date().toISOString(),
      url: URL,
      driveSecs: DRIVE_SECS,
      viewport: { width: 1280, height: 720 },
      renderer: "swiftshader",
      pageErrors: errors,
      levels: results,
    };
    await mkdir("artifacts", { recursive: true });
    await writeFile(JSON_OUT, JSON.stringify(payload, null, 2) + "\n");
    const mdOut = JSON_OUT.replace(/\.json$/, ".md");
    const header =
      `| level | ttf ms | fps | p50 ms | p75 ms | p90 ms | drops/min>34ms | draw calls | triangles | heap MB |\n` +
      `|---|---|---|---|---|---|---|---|---|---|\n`;
    const rows = results
      .map(
        (r) =>
          `| ${r.id} | ${r.timeToFirstFrameMs} | ${r.fps} | ${r.frameP50Ms} | ${r.frameP75Ms} | ${r.frameP90Ms} | ${r.dropsPerMinOver34ms} | ${r.drawCalls} | ${r.triangles} | ${r.heapUsedMB} |`,
      )
      .join("\n");
    await writeFile(
      mdOut,
      `# Perf baseline (SwiftShader, ${DRIVE_SECS}s drive, 1280x720)\n\nGenerated ${payload.generatedAt} against ${URL}.\n\n${header}${rows}\n\nPage errors: ${errors.length ? errors.join(" | ") : "none"}\n`,
    );
    console.log(`Wrote ${JSON_OUT} and ${mdOut}`);
  await browser.close();
} finally {
  if (server) server.kill();
}
