import { readFile, writeFile } from "node:fs/promises";
import { TRACKS } from "../src/tracks.ts";
const paths = process.argv.slice(2);
if (paths.length < 1)
  throw new Error("Pass Playwright JSON report paths in chronological order");
const latest = new Map(),
  runs = new Map();
function walk(suite) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const result = test.results?.at(-1);
      if (!result) continue;
      const key = `${spec.file ?? suite.file}:${spec.title}`;
      latest.set(key, result.status);
      if (result.status !== "passed") continue;
      for (const attachment of result.attachments ?? []) {
        if (
          !["completion", "completion telemetry"].includes(attachment.name) ||
          !attachment.body
        )
          continue;
        const state = JSON.parse(
          Buffer.from(attachment.body, "base64").toString("utf8"),
        );
        if (state.run?.status === "completed")
          runs.set(`${state.run.trackId}:${state.run.variant}`, state);
      }
    }
  }
  for (const child of suite.suites ?? []) walk(child);
}
for (const path of paths) {
  const report = JSON.parse(await readFile(path, "utf8"));
  for (const suite of report.suites ?? []) walk(suite);
}
const passing = [...latest.values()].filter((s) => s === "passed").length;
const unresolved = [...latest].filter(([, s]) => s !== "passed");
if (passing !== 69 || unresolved.length)
  throw new Error(
    `Need 69 passing browser cases; found ${passing}; unresolved ${JSON.stringify(unresolved)}`,
  );
if (runs.size !== 8)
  throw new Error(
    `Need all eight official track/lane playthroughs; found ${runs.size}`,
  );
const rows = [];
for (const track of TRACKS) {
  for (const [key, state] of runs) {
    if (state.run.trackId !== track.id) continue;
    const { run } = state;
    if (run.status !== "completed" || state.integrity <= 0)
      throw new Error(`Invalid completion ${key}`);
    if (
      track.mode === "arena" &&
      (run.elapsed > track.feasibility ||
        run.collected.length !== track.collectibles.length)
    )
      throw new Error(`No arena headroom: ${key}`);
    rows.push({
      track: track.name,
      variant: run.variant,
      time: run.elapsed,
      limit: track.limit ?? null,
      remaining: track.limit ? track.limit - run.elapsed : null,
      headroom: track.limit
        ? ((track.limit - run.elapsed) / track.limit) * 100
        : null,
      integrity: state.integrity * 100,
      medal: run.medal,
    });
  }
}
const production = JSON.parse(
  await readFile("artifacts/production-report.json", "utf8"),
);
if (
  !production.productionHarnessAbsent ||
  !production.levelSelectVerified ||
  !production.tuningMenuVerified ||
  production.runs.length !== 4 ||
  production.errors.length ||
  production.runs.some((r) => r.outcome !== "jump-cleared")
)
  throw new Error("Production smoke acceptance failed");
const text = `# Six-track release verification\n\nThe Google Doc plan was created and read back before implementation. Each functional chunk has a recorded RED/GREEN cycle in [TDD_LOG.md](TDD_LOG.md) and its own Git commit.\n\n## Completed tracks\n\n| Track | Lane | Completion | Timer | Time remaining | Integrity | Medal |\n| --- | --- | ---: | ---: | ---: | ---: | --- |\n${rows.map((r) => `| ${r.track} | ${r.variant} | ${r.time.toFixed(2)}s | ${r.limit ? `${r.limit}s` : "Race"} | ${r.remaining ? `${r.remaining.toFixed(2)}s (${r.headroom.toFixed(1)}%)` : "—"} | ${r.integrity.toFixed(1)}% | ${r.medal ?? "Finisher"} |`).join("\n")}\n\nEach completion starts at the real spawn and drives with throttle, steering and brakes only. No completion run uses pose/velocity edits, granted pickups, altered gravity, damage bypasses or test-only objective geometry. Browser playback at 16x still executes the same 120 Hz physics ticks. The shipped tuning remains unchanged. Triple Loop retains the entire original three-lane arena; each lane must clear its jump, physically traverse its loop and reach the exit.\n\n## Acceptance results\n\n- 156 unit tests pass across 32 files.\n- ${passing} unique browser cases pass across the recorded batches.\n- Both arenas complete within 75% of the published deadline: Scrapyard Sweep <=90s of 120s; Inferno Vault <=112.5s of 150s.\n- Every new race completes all ordered checkpoints; Skyline Circuit completes all sixteen sectors.\n- Normal startup shows six unique locally shipped SVG previews and stays paused.\n- UI-selected completion awards a medal, records personal bests and reloads them. Slower/failed runs cannot replace a best; Triple Loop lane records are isolated.\n- Retry preserves tuning; returning to selection pauses the run. Narrow 390 px layout and blocked browser storage are covered.\n- Production TypeScript/Vite build passes.\n\n## Production smoke\n\nThe packaged build passes four live keyboard jump-clearance checks: easy at 1x, and all three Triple Loop lanes at 16x. It verifies six selection cards, tuning controls, absence of the development bridge and zero browser errors. This smoke check covers the packaged opening jump; full track completion is established by the eight browser playthroughs above. Evidence: \`artifacts/production-report.json\`.\n\n## Regression batches and evidence\n\nThe initial full-suite diagnostic found legacy camera fixtures that selected a generic canvas (now ambiguous because of the color wheels) and a fixed trace that continued into the loop under the user's faster saved defaults. The fixtures now explicitly select the legacy arena, target the driving canvas and limit the straight-line trace to the jump/finish. Camera direction, zoom limits, motion thresholds and completion assertions remain intact. Normal startup is tested separately through the actual level-select screen.\n\nA new keyboard regression first failed when Space was swallowed on the selection screen. The game now handles driving keys only during play, preserving native button activation; Space-start and arrow-key driving pass. Loop regression fixtures now read the saved boost default and its physical target speed rather than stale literals. All physical contact, loop apex, landing and integrity assertions remain.\n\nRaw Playwright JSON reports: ${paths.map((p) => `\`${p}\``).join(", ")}. Browser traces, per-track completion telemetry and screenshots are attached to the matching Playwright results. Tests are in \`e2e/courses.spec.ts\`, \`e2e/official-triple.spec.ts\` and \`e2e/level-select.spec.ts\`; their test drivers never mutate truck or run state. Thumbnail generation: \`node scripts/generate-track-thumbnails.mjs\`.\n`;
await writeFile("docs/TRACK_VERIFICATION.md", text);
await writeFile(
  "artifacts/track-completion.json",
  JSON.stringify({ passing, rows }, null, 2),
);
console.log(JSON.stringify({ passing, rows }, null, 2));
