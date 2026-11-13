// Compare two benchmark sweeps: node scripts/perf/compare.mjs <before.json> <after.json
// Prints per-level and sweep-mean % changes for the primary metrics and flags
// >5% improvements (ship candidates) and >2% regressions (blockers).
import { readFile } from "node:fs/promises";
const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error("usage: node scripts/perf/compare.mjs <before.json> <after.json>");
  process.exit(2);
}
const before = JSON.parse(await readFile(beforePath, "utf8"));
const after = JSON.parse(await readFile(afterPath, "utf8"));
const METRICS = ["load_ms", "fps_mean", "p50", "p75", "p90", "p99", "drops_per_min"];
const HIGHER_BETTER = new Set(["fps_mean"]);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
const levelMedian = (run, id, m) => {
  const vals = (run.levels[id]?.reps ?? [])
    .filter((r) => !r.error && typeof r[m] === "number")
    .map((r) => r[m]);
  return median(vals);
};
const pctChange = (b, a, higherBetter) => {
  if (b === null || a === null || b === 0) return null;
  const d = ((a - b) / Math.abs(b)) * 100;
  return higherBetter ? d : -d; // positive always means better
};
const ids = [...new Set([...Object.keys(before.levels), ...Object.keys(after.levels)])].sort();
const rows = [];
for (const id of ids) {
  for (const m of METRICS) {
    const b = levelMedian(before, id, m);
    const a = levelMedian(after, id, m);
    const d = pctChange(b, a, HIGHER_BETTER.has(m));
    if (d !== null) rows.push({ scope: id, metric: m, before: b, after: a, delta: d });
  }
}
for (const m of METRICS) {
  const bs = ids.map((id) => levelMedian(before, id, m)).filter((v) => v !== null);
  const as = ids.map((id) => levelMedian(after, id, m)).filter((v) => v !== null);
  if (!bs.length || !as.length) continue;
  const b = bs.reduce((x, y) => x + y, 0) / bs.length;
  const a = as.reduce((x, y) => x + y, 0) / as.length;
  rows.push({ scope: "SWEEP-MEAN", metric: m, before: b, after: a, delta: pctChange(b, a, HIGHER_BETTER.has(m)) });
}
console.log("scope                 metric        before      after       change");
for (const r of rows) {
  const flag = r.delta >= 5 ? "  <-- WIN" : r.delta <= -2 ? "  <-- REGRESSION" : "";
  console.log(
    `${r.scope.padEnd(21)} ${r.metric.padEnd(11)} ${r.before.toFixed(2).padStart(9)} ${r.after.toFixed(2).padStart(9)} ${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(1)}%${flag}`,
  );
}
const wins = rows.filter((r) => r.delta >= 5);
const regs = rows.filter((r) => r.delta <= -2);
console.log(`\n${wins.length} improvements >5%, ${regs.length} regressions >2%`);
