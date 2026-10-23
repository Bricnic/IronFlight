import { readFile, writeFile } from "node:fs/promises";
import { getTrack } from "../src/tracks.ts";
const cases = new Map(),
  runs = new Map();
function walk(suite) {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests ?? []) {
      const r = test.results?.at(-1);
      if (!r) continue;
      cases.set(`${spec.file ?? suite.file}:${spec.title}`, r.status);
      if (r.status === "passed")
        for (const a of r.attachments ?? [])
          if (a.name === "completion" && a.body) {
            const s = JSON.parse(Buffer.from(a.body, "base64").toString());
            if (s.run?.status === "completed") runs.set(s.run.trackId, s);
          }
    }
  for (const child of suite.suites ?? []) walk(child);
}
for (const file of process.argv.slice(2)) {
  const r = JSON.parse(await readFile(file, "utf8"));
  for (const s of r.suites ?? []) walk(s);
}
const failed = [...cases].filter(([, s]) => s !== "passed");
if (cases.size !== 36 || failed.length)
  throw Error(
    `Need all 36 cases: ${cases.size}, unresolved ${JSON.stringify(failed)}`,
  );
if (runs.size !== 5)
  throw Error(`Need five complete course runs: ${runs.size}`);
const courses = [...runs].map(([id, s]) => {
  const t = getTrack(id);
  if (s.integrity <= 0 || (t.limit && s.run.elapsed > t.feasibility))
    throw Error(`Invalid completion ${id}`);
  return {
    track: t.name,
    time: s.run.elapsed,
    integrity: s.integrity,
    limit: t.limit ?? null,
    headroom: t.limit ? (t.limit - s.run.elapsed) / t.limit : null,
  };
});
const geometry = JSON.parse(
  await readFile("docs/hazard-qa/geometry.json", "utf8"),
);
if (
  geometry.rows.length !== 8 ||
  geometry.errors.length ||
  geometry.rows.some((r) => r.triangles < 100000)
)
  throw Error("Hazard render acceptance failed");
await writeFile(
  "docs/hazard-qa/verification.json",
  JSON.stringify(
    { browserCases: cases.size, courses, geometry: geometry.rows },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ browserCases: cases.size, courses }, null, 2));
