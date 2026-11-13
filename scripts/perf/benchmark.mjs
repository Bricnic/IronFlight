// Performance benchmark sweep across the official level lineup.
// Usage: PERF_PORT=5199 node scripts/perf/benchmark.mjs [--levels a,b] [--reps N] [--drive-seconds S]
// Measures, per level (medians across reps):
//   load_ms        click Play on level select -> run active, textures settled, 3 frames drawn
//   frame p50/p75/p90/p99 (ms) over a scripted W + weave drive at default (high) settings
//   drops_per_min  frames with delta > 34ms, scaled to a minute
//   fps_mean       frames / elapsed over the same window
// Context per level: draw calls, render triangles, geometries, textures, JS heap, run status.
// Output: artifacts/perf-<timestamp>.json plus a console table. Compare runs with
// scripts/perf/compare.mjs. Requires a dev server (real GPU via the gpu-project
// launch config, like e2e/fps.spec.ts).
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

function idleCpu() {
  try {
    const out = execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 1 | Select-Object -ExpandProperty CounterSamples | Select-Object -ExpandProperty CookedValue",
      ],
      { timeout: 20000, stdio: ["ignore", "pipe", "ignore"] },
    ).toString();
    const vals = out.split(/\s+/).map(Number).filter(Number.isFinite);
    return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
  } catch {
    return null;
  }
}
const CPU_BEFORE = idleCpu();
console.log(
  `idle CPU before sweep: ${CPU_BEFORE === null ? "unknown" : `${CPU_BEFORE.toFixed(0)}%`}`,
);
if (
  CPU_BEFORE !== null &&
  CPU_BEFORE > 55 &&
  !process.argv.includes("--force")
) {
  console.error(
    "machine too busy for reliable numbers; retry when quiet (or --force)",
  );
  process.exit(3);
}

const PORT = process.env.PERF_PORT ?? "5173";
const BASE = `http://127.0.0.1:${PORT}`;
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.findIndex((a) => a === `--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const subset = (flag("levels", "") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const REPS = Math.max(1, parseInt(flag("reps", "1"), 10) || 1);
const DRIVE_S = Math.max(4, parseInt(flag("drive-seconds", "12"), 10) || 12);

const pct = (sorted, q) => {
  if (!sorted.length) return null;
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at), hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
};

function summarize(deltas, elapsedMs) {
  const sorted = [...deltas].sort((a, b) => a - b);
  const drops = deltas.filter((d) => d > 34).length;
  return {
    frames: deltas.length,
    fps_mean: deltas.length > 1 ? (1000 * deltas.length) / elapsedMs : null,
    p50: pct(sorted, 0.5),
    p75: pct(sorted, 0.75),
    p90: pct(sorted, 0.9),
    p99: pct(sorted, 0.99),
    drops_per_min: (drops * 60000) / elapsedMs,
  };
}

async function settled(page) {
  await page.waitForFunction(
    () => {
      const g = window.__game;
      if (!g || !g.snapshot().run) return false;
      return g
        .inspectSolids()
        .every(
          ({ map, normalMap, roughnessMap }) =>
            ![map, normalMap, roughnessMap].includes("pending"),
        );
    },
    null,
    { timeout: 30000 },
  );
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let n = 0;
        const tick = () => (++n >= 3 ? resolve() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
  );
}

async function collectFrames(page, seconds) {
  return page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const deltas = [];
        let last = performance.now();
        const t0 = last;
        const tick = (t) => {
          deltas.push(t - last);
          last = t;
          if (t - t0 < ms) requestAnimationFrame(tick);
          else resolve({ deltas, elapsedMs: t - t0 });
        };
        requestAnimationFrame(tick);
      }),
    seconds * 1000,
  );
}

async function weave(page, seconds) {
  const keys = ["a", "d"];
  let i = 0;
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end - 600) {
    const key = keys[i++ % 2];
    await page.keyboard.down(key);
    await page.waitForTimeout(450);
    await page.keyboard.up(key);
    await page.waitForTimeout(1550);
  }
}

async function measureLevel(page, id, name) {
  const result = { id, name, error: null };
  try {
    await page
      .getByRole("heading", { name: "Choose your track.", exact: true })
      .waitFor({ timeout: 15000 });
    const t0 = performance.now();
    await page
      .getByRole("button", { name: `Play ${name}`, exact: true })
      .click({ timeout: 10000 });
    await settled(page);
    result.load_ms = performance.now() - t0;
    if (process.argv.includes("--static")) {
      // Deterministic R&D mode: park at spawn, no input, fixed view.
      await page.evaluate(() => {
        const g = window.__game;
        const s = g.track(g.snapshot().run.trackId).spawn;
        g.place({ x: s.x, y: s.y, z: s.z }, s.yaw ?? 0);
      });
      await page.waitForTimeout(2000);
      const { deltas, elapsedMs } = await collectFrames(page, DRIVE_S);
      Object.assign(result, summarize(deltas, elapsedMs));
    } else {
      await page.keyboard.down("w");
      try {
        await page.waitForTimeout(2000);
        const [{ deltas, elapsedMs }] = await Promise.all([
          collectFrames(page, DRIVE_S),
          weave(page, DRIVE_S),
        ]);
        Object.assign(result, summarize(deltas, elapsedMs));
      } finally {
        for (const k of ["w", "a", "d"])
          await page.keyboard.up(k).catch(() => {});
      }
    }
    const ctx = await page.evaluate(() => {
      const g = window.__game;
      const s = g.stats();
      return {
        draw_calls: s.drawCalls,
        render_triangles: s.renderTriangles,
        geometries: s.geometries,
        textures: s.textures,
        heap_mb:
          performance.memory != null
            ? performance.memory.usedJSHeapSize / 1048576
            : null,
        tier: s.video.tier,
        vehicle: s.vehicleId,
        status: g.snapshot().run?.status ?? null,
      };
    });
    Object.assign(result, ctx);
  } catch (e) {
    result.error = String(e).split("\n")[0].slice(0, 220);
  }
  try {
    await page.keyboard.press("l");
    await page
      .getByRole("heading", { name: "Choose your track.", exact: true })
      .waitFor({ timeout: 10000 });
  } catch {
    try {
      await page.goto(BASE + "/");
      await page
        .getByRole("heading", { name: "Choose your track.", exact: true })
        .waitFor({ timeout: 15000 });
    } catch {}
  }
  return result;
}

const browser = await chromium.launch({
  channel: "chromium",
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=default",
    "--enable-gpu",
    "--ignore-gpu-blocklist",
  ],
});
const out = {
  meta: null,
  levels: {},
};
try {
  const probe = await browser.newPage();
  await probe.goto("about:blank");
  const gpu = await probe.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
  });
  await probe.close();
  out.meta = {
    date: new Date().toISOString(),
    gpu,
    viewport: { width: 1280, height: 720 },
    drive_seconds: DRIVE_S,
    reps: REPS,
    base: BASE,
    static: process.argv.includes("--static"),
    cpu_before: CPU_BEFORE,
  };
  console.log(`GPU: ${gpu}`);
  const WARMUP = flag("warmup", "custom:fairground");
  if (WARMUP !== "0") {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    try {
      await page.goto(BASE + "/");
      await page.waitForFunction(() => !!window.__game);
      const name = await page
        .locator(`#level-select [data-track="${WARMUP}"] h2`)
        .textContent()
        .catch(() => null);
      if (name) {
        await page
          .getByRole("button", { name: `Play ${name}`, exact: true })
          .click({ timeout: 10000 });
        await page
          .waitForFunction(() => !!window.__game.snapshot().run, null, {
            timeout: 20000,
          })
          .catch(() => {});
        await page.keyboard.down("w").catch(() => {});
        await page.waitForTimeout(6000);
        await page.keyboard.up("w").catch(() => {});
      }
      console.log(`warmed up on ${WARMUP}`);
    } catch (e) {
      console.log(`warmup skipped: ${String(e).split("\n")[0].slice(0, 120)}`);
    } finally {
      await page.close();
    }
  }
  for (let rep = 1; rep <= REPS; rep++) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    try {
      await page.goto(BASE + "/");
      await page.waitForFunction(() => !!window.__game);
      const lineup = await page
        .locator("#level-select [data-track]")
        .evaluateAll((cards) =>
          cards.map((card) => ({
            id: card.dataset.track,
            name: card.querySelector("h2")?.textContent ?? card.dataset.track,
          })),
        );
      const queue = subset.length
        ? lineup.filter((t) => subset.includes(t.id))
        : lineup;
      if (!queue.length) throw new Error("level filter matched nothing");
      console.log(`rep ${rep}/${REPS}: ${queue.length} levels`);
      for (const { id, name } of queue) {
        const r = await measureLevel(page, id, name);
        (out.levels[id] ??= { name, reps: [] }).reps.push(r);
        const s =
          r.error ??
          `load=${r.load_ms.toFixed(0)}ms fps=${r.fps_mean.toFixed(1)} p90=${r.p90.toFixed(1)}ms drops/min=${r.drops_per_min.toFixed(1)}`;
        console.log(`  ${id}: ${s}`);
      }
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

await mkdir("artifacts", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const path = `artifacts/perf-${stamp}.json`;
out.meta.cpu_after = idleCpu();
console.log(
  `idle CPU after sweep: ${out.meta.cpu_after === null ? "unknown" : `${out.meta.cpu_after.toFixed(0)}%`}`,
);
await writeFile(path, JSON.stringify(out, null, 1));
console.log(`wrote ${path}`);
