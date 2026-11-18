import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";

/**
 * Gold-star placement proofs for official levels [24, 34): Nutcracker Run
 * through Bouncy House in order.json (the final ten of the 34 official
 * levels excluding the cake/table pair). Each level hides exactly one
 * standard-fields gold-star prefab 15u+ off the ideal line but within
 * 30u of a visible landmark, and each test drives the sim from spawn
 * to the star.
 */
type Waypoint = [x: number, z: number, speed: number, reach: number];
type Vec = { x: number; y: number; z: number };
const STAR_ID = "gold-star-1";
const FILES = [
  "Nutcracker Run.json",
  "Sleigh Bell Sprint.json",
  "North Pole Summit.json",
  "Tabletop Brawl.json",
  "Sharkbite Run.json",
  "Rock and Roll.json",
  "Shipyard.json",
  "Spider Hollow.json",
  "Screwball Run.json",
  "Bouncy House.json",
];

beforeAll(async () => {
  await initPhysics();
  for (const file of FILES)
    registerCustomTrack(
      officialFileTracks.find((t) => t.sourceFile === `levels/official/${file}`)!,
    );
});

function trackId(file: string) {
  return officialFileTracks.find((t) => t.sourceFile === `levels/official/${file}`)!.id;
}
function segDist(
  px: number, pz: number, ax: number, az: number, bx: number, bz: number,
) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(ax + dx * t - px, az + dz * t - pz);
}
function polyDist(px: number, pz: number, pts: { x: number; z: number }[]) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++)
    best = Math.min(best, segDist(px, pz, pts[i - 1].x, pts[i - 1].z, pts[i].x, pts[i].z));
  return best;
}
/** Arena ideal line: greedy nearest-neighbor tour from spawn (scripts/ideal-line.mjs). */
function greedyTour(spawn: { x: number; z: number }, points: { x: number; z: number }[]) {
  const tour = [{ x: spawn.x, z: spawn.z }];
  const rest = points.map((p) => ({ x: p.x, z: p.z }));
  let at = tour[0];
  while (rest.length) {
    let bi = 0;
    for (let i = 1; i < rest.length; i++)
      if (Math.hypot(at.x - rest[i].x, at.z - rest[i].z) < Math.hypot(at.x - rest[bi].x, at.z - rest[bi].z)) bi = i;
    at = rest.splice(bi, 1)[0];
    tour.push(at);
  }
  return tour;
}
type LevelJson = {
  mode: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  checkpoints: { x: number; z: number }[];
  collectibles?: { x: number; z: number }[];
  prefabs: { id: string; kind: string; x: number; y?: number; z: number }[];
  solids?: { id: string; kind: string; name?: string; x: number; z: number }[];
};
const levelJson = (file: string): LevelJson =>
  JSON.parse(readFileSync(`levels/official/${file}`, "utf8"));
/** Static placement asserts: one standard-fields star, off-line, near its landmark. */
function expectStarGeometry(file: string, expectedStar: Vec, expectedLandmarkId: string) {
  const level = levelJson(file);
  const stars = level.prefabs.filter((p) => p.kind === "gold-star");
  expect(stars, `${file} hides one star`).toHaveLength(1);
  const [star] = stars;
  expect(star.id, `${file} star id`).toBe(STAR_ID);
  for (const key of Object.keys(star))
    expect(["id", "kind", "x", "y", "z", "yaw", "scale"], `${file} standard fields`).toContain(key);
  const placed: Vec = { x: star.x, y: star.y ?? 2, z: star.z };
  expect(placed, `${file} star position`).toEqual(expectedStar);
  const line =
    level.mode === "arena"
      ? greedyTour(level.spawn, level.collectibles ?? [])
      : [{ x: level.spawn.x, z: level.spawn.z }, ...level.checkpoints];
  const dLine = polyDist(placed.x, placed.z, line);
  expect(dLine, `${file} star sits ${dLine.toFixed(1)}u off the ideal line`).toBeGreaterThanOrEqual(15);
  let nearest = Infinity;
  for (const p of level.prefabs) {
    if (p.kind === "gold-star") continue;
    nearest = Math.min(nearest, Math.hypot(p.x - placed.x, p.z - placed.z));
  }
  for (const s of level.solids ?? []) {
    if (!s.name || s.kind === "lava" || s.kind === "slime" || s.kind === "water") continue;
    if (s.id.startsWith("ceil-")) continue;
    nearest = Math.min(nearest, Math.hypot(s.x - placed.x, s.z - placed.z));
  }
  expect(nearest, `${file} nearest landmark ${nearest.toFixed(1)}u`).toBeLessThanOrEqual(30);
  const landmark =
    level.prefabs.find((p) => p.id === expectedLandmarkId) ??
    (level.solids ?? []).find((s) => s.id === expectedLandmarkId);
  expect(landmark, `${file} landmark ${expectedLandmarkId} exists`).toBeDefined();
  const dMark = Math.hypot(landmark!.x - placed.x, landmark!.z - placed.z);
  expect(dMark, `${file} landmark ${expectedLandmarkId} sits ${dMark.toFixed(1)}u away`).toBeLessThanOrEqual(30);
  return placed;
}
/** Normal pedal/steering pursuit of one waypoint (tests/screwball-drive.ts pattern). */
function pursuit(sim: Simulation, x: number, z: number, speed: number) {
  const p = sim.body.translation();
  const q = sim.body.rotation();
  const forwardX = 2 * (q.x * q.z + q.w * q.y);
  const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
  const aim = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
  const error = Math.atan2(Math.sin(aim), Math.cos(aim));
  const v = sim.body.linvel();
  const pace = Math.hypot(v.x, v.z);
  const cap = Math.abs(error) > 0.58 ? Math.min(6, speed) : speed;
  sim.step({
    steer: Math.max(-1, Math.min(1, error * 2.5)),
    throttle: pace < cap ? 1 : 0,
    brake: pace > cap + 0.65 ? 0.65 : 0,
  });
}
type DriveDiag = {
  collected: boolean; minDist: number; next: number; pos: Vec; status: string; elapsed: number;
};
function diagOf(sim: Simulation, minDist: number, next: number): DriveDiag {
  const pos = sim.body.translation();
  return {
    collected: sim.trackRun!.stars.has(STAR_ID),
    minDist, next,
    pos: { x: pos.x, y: pos.y, z: pos.z },
    status: sim.trackRun!.status,
    elapsed: sim.trackRun!.elapsed,
  };
}
/** Follow waypoints until the star collects, the budget lapses, or the run ends. */
function driveRoute(
  sim: Simulation, route: Waypoint[], budgetSec: number, star: Vec,
): DriveDiag {
  let next = 0;
  let minDist = Infinity;
  for (let i = 0; i < Math.floor(budgetSec / DT) && sim.trackRun!.status === "running"; i++) {
    if (sim.trackRun!.stars.has(STAR_ID)) break;
    const p = sim.body.translation();
    minDist = Math.min(minDist, Math.hypot(p.x - star.x, p.y - star.y, p.z - star.z));
    const [wx, wz, , reach] = route[next];
    if (Math.hypot(wx - p.x, wz - p.z) < reach && next < route.length - 1) next++;
    const [x, z, speed] = route[next];
    pursuit(sim, x, z, speed);
  }
  return diagOf(sim, minDist, next);
}
function expectCollected(diag: DriveDiag, label: string) {
  expect(
    diag.collected,
    `${label}: closest approach ${diag.minDist.toFixed(1)}u at waypoint ${diag.next}, ` +
      `pos ${JSON.stringify(diag.pos)}, status ${diag.status}, elapsed ${diag.elapsed.toFixed(1)}s`,
  ).toBe(true);
}
function race(file: string) {
  const sim = new Simulation();
  sim.startTrack(trackId(file));
  return sim;
}
it("Nutcracker Run: cuts north past the start arch and collects the star", { timeout: 120000 }, () => {
  const file = "Nutcracker Run.json";
  const star = expectStarGeometry(file, { x: -320, y: 1.9, z: -122 }, "nr-tree-0");
  const sim = race(file);
  try {
    const diag = driveRoute(sim, [[-320, -122, 8, 0]], 40, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Sleigh Bell Sprint: cuts north past the start arch and collects the star", { timeout: 120000 }, () => {
  const file = "Sleigh Bell Sprint.json";
  const star = expectStarGeometry(file, { x: -310, y: 1.9, z: -142 }, "sb-deer-0");
  const sim = race(file);
  try {
    const diag = driveRoute(sim, [[-310, -142, 8, 0]], 40, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("North Pole Summit: cuts north past the start arch and collects the star", { timeout: 120000 }, () => {
  const file = "North Pole Summit.json";
  const star = expectStarGeometry(file, { x: -348, y: 1.9, z: -152 }, "np-tree-0");
  const sim = race(file);
  try {
    const diag = driveRoute(sim, [[-348, -152, 8, 0]], 40, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Tabletop Brawl: crosses the table to the southwest lamp and collects the star", { timeout: 180000 }, () => {
  const file = "Tabletop Brawl.json";
  const star = expectStarGeometry(file, { x: -140, y: 1.9, z: 140 }, "lamp-sw");
  const sim = race(file);
  try {
    const diag = driveRoute(sim, [[-132, -40, 9, 6], [-140, 140, 9, 0]], 90, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Sharkbite Run: sidesteps to the start sign and collects the star", { timeout: 120000 }, () => {
  const file = "Sharkbite Run.json";
  const star = expectStarGeometry(file, { x: 218, y: 1.9, z: 18 }, "sign-1");
  const sim = race(file);
  try {
    const diag = driveRoute(sim, [[218, 18, 8, 0]], 40, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Rock and Roll: sidesteps to the start barrel and collects the star", { timeout: 120000 }, () => {
  const file = "Rock and Roll.json";
  const star = expectStarGeometry(file, { x: -128, y: 1.9, z: 82 }, "barrel-2");
  const sim = race(file);
  try {
    const diag = driveRoute(sim, [[-128, 82, 8, 0]], 40, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Shipyard: dips ahead of the start boxes and collects the star", { timeout: 120000 }, () => {
  const file = "Shipyard.json";
  const star = expectStarGeometry(file, { x: -1, y: 1.9, z: 163 }, "box-1");
  const sim = race(file);
  try {
    const diag = driveRoute(sim, [[-1, 163, 8, 0]], 40, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Spider Hollow: detours to the hollow raptor and collects the star", { timeout: 120000 }, () => {
  const file = "Spider Hollow.json";
  const star = expectStarGeometry(file, { x: -45, y: 1.9, z: 200 }, "hollow-raptor");
  const sim = race(file);
  try {
    const diag = driveRoute(sim, [[-45, 200, 8, 0]], 60, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Screwball Run: sidesteps past the start tube and collects the star", { timeout: 120000 }, () => {
  const file = "Screwball Run.json";
  const star = expectStarGeometry(file, { x: 17, y: 1.9, z: 425 }, "box-1");
  const sim = race(file);
  try {
    const diag = driveRoute(sim, [[17, 425, 9, 0]], 60, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Bouncy House: tips off the west edge mid-leg and collects the star mid-bounce", { timeout: 180000 }, () => {
  const file = "Bouncy House.json";
  const star = expectStarGeometry(file, { x: -17, y: 28, z: 57 }, "food-1");
  const sim = race(file);
  try {
    // Crawl the plank to mid-leg, stop dead, then tip off the west edge:
    // the whole floor is bouncy (scale-4 pads tile it), so the car can
    // never drive down there — instead the second launch carries it
    // straight through the star's 4u sphere and the test banks it there.
    let next = 0;
    let minDist = Infinity;
    let stopped = false;
    const route: Waypoint[] = [[0, 60, 5, 4], [-19, 60, 2.5, 0]];
    for (let i = 0; i < Math.floor(120 / DT) && sim.trackRun!.status === "running"; i++) {
      if (sim.trackRun!.stars.has(STAR_ID)) break;
      const p = sim.body.translation();
      minDist = Math.min(minDist, Math.hypot(p.x - star.x, p.y - star.y, p.z - star.z));
      const v = sim.body.linvel();
      if (next === 0 && Math.hypot(0 - p.x, 60 - p.z) < 4) {
        if (Math.hypot(v.x, v.z) < 0.5) {
          stopped = true;
          next = 1;
        } else {
          sim.step({ brake: 1 });
          continue;
        }
      }
      const [wx, wz, , reach] = route[next];
      if (Math.hypot(wx - p.x, wz - p.z) < reach && next < route.length - 1) next++;
      const [x, z, speed] = route[next];
      pursuit(sim, x, z, speed);
    }
    const diag = diagOf(sim, minDist, next);
    expect(stopped, `${file}: stopped at mid-leg before the drop`).toBe(true);
    expectCollected(diag, file);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("every official level JSON hides exactly one gold-star prefab", () => {
  const order = JSON.parse(readFileSync("levels/official/order.json", "utf8")) as { file: string }[];
  expect(order.length).toBeGreaterThan(0);
  const seen = new Set<string>();
  for (const { file } of order) {
    seen.add(file);
    const level = levelJson(file);
    const stars = level.prefabs.filter((p) => p.kind === "gold-star");
    expect(stars, `${file} hides one star`).toHaveLength(1);
    expect(stars[0].id, `${file} star id`).toBe(STAR_ID);
  }
  // No official JSON outside the lineup may hide (or miss) a star either.
  for (const file of readdirSync("levels/official")) {
    if (file === "order.json" || !file.endsWith(".json")) continue;
    expect(seen.has(file), `${file} is listed in order.json`).toBe(true);
  }
});
