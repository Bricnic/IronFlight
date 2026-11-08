import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { TRACK_IDS } from "../src/tracks";
import { officialTracks } from "../src/official-levels";
import { registerCustomTrack } from "../src/custom-level";

for (const t of officialTracks) if (t.custom) registerCustomTrack(t);

/**
 * Headless physics benchmark: per-level sim load + step cost.
 * Skipped unless PERF=1 so `npm test` stays fast.
 * Run: PERF=1 npx vitest run tests/perf-sim.test.ts
 * Writes: artifacts/perf-sim.json
 */
const run = process.env.PERF === "1" ? describe : describe.skip;

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)];
}

run("perf: simulation baseline", () => {
  beforeAll(initPhysics, 60000);

  it("measures load + step cost for every level", () => {
    const levels = [
      ...TRACK_IDS.map((id) => ({ id, name: id })),
      ...officialTracks.map((t) => ({ id: t.id as string, name: t.name })),
    ].filter((l, i, all) => all.findIndex((o) => o.id === l.id) === i);
    const rows: Record<string, unknown>[] = [];
    for (const { id, name } of levels) {
      const sim = new Simulation("easy");
      const loadStart = performance.now();
      sim.startTrack(id as never);
      const loadMs = performance.now() - loadStart;
      // Warm up physics caches, then time a 10-sim-second drive.
      sim.run(1, { throttle: 0.8 });
      const samples: number[] = [];
      const steps = 600;
      const stepStart = performance.now();
      for (let i = 0; i < steps; i++) {
        const t0 = performance.now();
        sim.step({ throttle: 0.8, steer: Math.sin(i / 40) * 0.3 });
        samples.push(performance.now() - t0);
      }
      const stepTotal = performance.now() - stepStart;
      samples.sort((a, b) => a - b);
      const sum = samples.reduce((a, b) => a + b, 0);
      rows.push({
        id,
        name,
        loadMs: +loadMs.toFixed(3),
        stepAvgMs: +(sum / samples.length).toFixed(4),
        stepP50Ms: +percentile(samples, 50).toFixed(4),
        stepP75Ms: +percentile(samples, 75).toFixed(4),
        stepP90Ms: +percentile(samples, 90).toFixed(4),
        stepMaxMs: +samples[samples.length - 1].toFixed(4),
        stepsPerSec: Math.round((steps / stepTotal) * 1000),
      });
      sim.dispose();
    }
    mkdirSync("artifacts", { recursive: true });
    const payload = {
      created: new Date().toISOString(),
      commit: process.env.GIT_COMMIT ?? "unknown",
      rows,
    };
    writeFileSync("artifacts/perf-sim.json", JSON.stringify(payload, null, 2));
    appendFileSync(
      "artifacts/perf-sim.log",
      `${payload.created} ${payload.commit} stepsPerSec=${rows.map((r) => r.stepsPerSec).join(",")}\n`,
    );
    for (const r of rows) console.log(JSON.stringify(r));
    expect(rows.length).toBeGreaterThan(0);
  });
});
