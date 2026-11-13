import { readFile } from "node:fs/promises";
const j = JSON.parse(
  await readFile(process.argv[2] ?? "artifacts/perf-2026-11-09T00-21-20-432Z.json", "utf8"),
);
const ids = process.argv.slice(3);
const list = ids.length ? ids : Object.keys(j.levels).sort();
for (const id of list) {
  const L = j.levels[id];
  if (!L) continue;
  console.log(`=== ${id}`);
  for (const r of L.reps) {
    if (r.error) {
      console.log(`  ERROR ${r.error}`);
      continue;
    }
    console.log(
      `  load=${Math.round(r.load_ms)} fps=${r.fps_mean.toFixed(1)} ` +
        `p50=${r.p50.toFixed(1)} p90=${r.p90.toFixed(1)} p99=${r.p99.toFixed(1)} ` +
        `drops=${r.drops_per_min.toFixed(0)} dc=${r.draw_calls} tris=${r.render_triangles} ` +
        `geo=${r.geometries} tex=${r.textures} heap=${r.heap_mb?.toFixed(0)}MB status=${r.status}`,
    );
  }
}
