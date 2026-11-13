// CPU-profile one level during a scripted drive: PERF_PORT=5199 node scripts/perf/profile.mjs <level> [seconds]
// Uses CDP sampling profiler (real GPU launch config) and prints self-time by function.
// Output: artifacts/profile-<level>-<timestamp>.json (top functions + raw node table).
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const PORT = process.env.PERF_PORT ?? "5173";
const BASE = `http://127.0.0.1:${PORT}`;
const [level, secondsArg] = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (!level) {
  console.error("usage: node scripts/perf/profile.mjs <level-id> [seconds]");
  process.exit(2);
}
const SECONDS = Math.max(3, parseInt(secondsArg ?? "10", 10) || 10);
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
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(BASE + "/");
  await page.waitForFunction(() => !!window.__game);
  const name = await page
    .locator(`#level-select [data-track="${level}"] h2`)
    .textContent();
  await page.getByRole("button", { name: `Play ${name}`, exact: true }).click();
  await page.waitForFunction(() => !!window.__game.snapshot().run);
  await page.keyboard.down("w");
  await page.waitForTimeout(2000);
  const session = await page.context().newCDPSession(page);
  await session.send("Profiler.enable");
  await session.send("Profiler.setSamplingInterval", { interval: 250 });
  await session.send("Profiler.start");
  await page.waitForTimeout(SECONDS * 1000);
  const { profile } = await session.send("Profiler.stop");
  await page.keyboard.up("w").catch(() => {});
  const byFn = new Map();
  for (const node of profile.nodes ?? []) {
    const fn = node.callFrame?.functionName || "(anonymous)";
    const url = (node.callFrame?.url ?? "").split("/").pop();
    const key = `${fn} [${url}]`;
    byFn.set(key, (byFn.get(key) ?? 0) + (node.hitCount ?? 0));
  }
  const total = [...byFn.values()].reduce((a, b) => a + b, 0) || 1;
  const top = [...byFn.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([fn, hits]) => ({ fn, pct: (100 * hits) / total }));
  console.log(`level=${level} samples=${total}`);
  for (const t of top) console.log(`  ${t.pct.toFixed(1).padStart(5)}% ${t.fn}`);
  await mkdir("artifacts", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `artifacts/profile-${level.replace(/[^a-z0-9]+/gi, "-")}-${stamp}.json`;
  await writeFile(path, JSON.stringify({ level, seconds: SECONDS, top }, null, 1));
  console.log(`wrote ${path}`);
} finally {
  await browser.close();
}
