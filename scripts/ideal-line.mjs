// Ideal-line length/time estimate for a level JSON file.
// Race: spawn+checkpoint polyline. Arena: greedy nearest-neighbor tour from
// spawn through every collectible. Demolition: same tour over demolish targets.
// Pace band top is pinned to the observed official band (tests/candy-tracks.test.ts).
// Usage:
//   node scripts/ideal-line.mjs <level.json> [--min 30] [--json]
export const IDEAL_PACE_HI = 12.7;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** Greedy tour length from spawn through every point. */
function tourLength(spawn, points) {
  let length = 0;
  let at = spawn;
  const rest = [...points];
  while (rest.length) {
    let best = 0;
    for (let i = 1; i < rest.length; i++)
      if (dist(at, rest[i]) < dist(at, rest[best])) best = i;
    length += dist(at, rest[best]);
    at = rest.splice(best, 1)[0];
  }
  return length;
}
export function idealLineLength(level) {
  const spawn = level.spawn;
  if (level.mode === "arena")
    return tourLength(spawn, level.collectibles ?? []);
  if (level.mode === "demolition")
    return tourLength(spawn, level.demolish ?? []);
  const path = [spawn, ...(level.checkpoints ?? [])];
  let length = 0;
  for (let i = 1; i < path.length; i++) length += dist(path[i - 1], path[i]);
  return length;
}
export function idealLineSeconds(level) {
  return idealLineLength(level) / IDEAL_PACE_HI;
}
async function main(argv) {
  const { readFile } = await import("node:fs/promises");
  const file = argv.find((a) => !a.startsWith("-"));
  if (!file) throw new Error("Usage: ideal-line.mjs <level.json> [--min 30] [--json]");
  const minIdx = argv.indexOf("--min");
  const min = minIdx >= 0 ? Number(argv[minIdx + 1]) : undefined;
  const asJson = argv.includes("--json");
  const level = JSON.parse(await readFile(file, "utf8"));
  const seconds = idealLineSeconds(level);
  if (asJson) console.log(JSON.stringify({ file, seconds }));
  else console.log(seconds.toFixed(1));
  if (min !== undefined && !(seconds >= min)) {
    console.error(`${file}: ideal line ${seconds.toFixed(1)}s is under the ${min}s minimum`);
    process.exitCode = 1;
  }
}
if (process.argv[1]?.endsWith("ideal-line.mjs")) await main(process.argv.slice(2));
