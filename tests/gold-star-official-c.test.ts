import { readFileSync, readdirSync } from "node:fs";
import { Quaternion, Vector3 } from "three";
import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { SNAP_CYCLE, TEETER } from "../src/dungeon-hazards";
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
/** Snap-trap cycle position for a mechanism phase (tests/toybox-road-drive.ts pattern). */
function snapPhase(time: number) {
  return ((((time % SNAP_CYCLE) + SNAP_CYCLE) % SNAP_CYCLE) + SNAP_CYCLE) % SNAP_CYCLE;
}
/** Follow waypoints until the star collects, the budget lapses, or the run ends. */
function driveRoute(
  sim: Simulation, route: Waypoint[], budgetSec: number, star: Vec,
  wait?: { at: number; ready: (sim: Simulation) => boolean }, endOnArrival = false,
): DriveDiag {
  let next = 0;
  let arrived = false;
  let released = false;
  let minDist = Infinity;
  for (let i = 0; i < Math.floor(budgetSec / DT) && sim.trackRun!.status === "running"; i++) {
    if (sim.trackRun!.stars.has(STAR_ID)) break;
    const p = sim.body.translation();
    minDist = Math.min(minDist, Math.hypot(p.x - star.x, p.y - star.y, p.z - star.z));
    const [wx, wz, , reach] = route[next];
    if (Math.hypot(wx - p.x, wz - p.z) < reach) {
      if (next === route.length - 1 && endOnArrival) break;
      if (wait && next === wait.at && !released) arrived = true;
      else if (next < route.length - 1) next++;
    }
    if (wait && next === wait.at && arrived && !released) {
      if (wait.ready(sim)) {
        released = true;
        next++;
      } else {
        sim.step({ brake: 1 });
        continue;
      }
    }
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
it("Nutcracker Run: bypasses the yeti north and collects the star by the second arch", { timeout: 120000 }, () => {
  const file = "Nutcracker Run.json";
  const star = expectStarGeometry(file, { x: -190, y: 1.9, z: -120 }, "nr-arch-1");
  const sim = race(file);
  try {
    // East on the road past the gift wall and snow boulder, jog
    // north past the yeti (14u clear), south of the ice patches
    // (8u+ clear), then east along the ice-free gap to the star
    // north of the arch: overshoot runs parallel to the lake.
    const route: Waypoint[] = [
      [-310, -140, 10, 6], [-280, -140, 10, 6], [-270, -126, 9, 5],
      [-240, -126, 10, 6], [-210, -120, 7, 5], [-190, -120, 5, 0],
    ];
    const diag = driveRoute(sim, route, 120, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Sleigh Bell Sprint: times the nutcracker and collects the star by the stall", { timeout: 180000 }, () => {
  const file = "Sleigh Bell Sprint.json";
  const star = expectStarGeometry(file, { x: -130, y: 1.9, z: -68 }, "sb-stall-0");
  const sim = race(file);
  try {
    const nutcracker = sim.dungeon.mechanisms.find((m) => m.h.id === "sb-nutcracker")!.h;
    // Road line from tests/christmas-drive.ts: wait outside the
    // nutcracker strike zone for the hold to release, sprint under
    // the arch and up the second leg, then a slow curve east to
    // the stall arcing 11u+ around the yeti. On road throughout:
    // zero ice contact by construction.
    const route: Waypoint[] = [
      [-280, -160, 12, 6], [-260, -160, 8, 6], [-220, -160, 14, 5],
      [-170, -160, 10, 6], [-155, -150, 8, 5], [-150, -130, 7, 5],
      [-150, -85, 8, 6], [-140, -75, 7, 5], [-130, -68, 5, 0],
    ];
    const diag = driveRoute(sim, route, 180, star, {
      at: 1,
      ready: (s) => {
        const v = s.body.linvel();
        const t = snapPhase(s.time + nutcracker.phase);
        return Math.hypot(v.x, v.z) <= 0.6 && t >= 2.6 && t < 2.9;
      },
    });
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("North Pole Summit: bypasses both traps south and collects by the cocoa cart", { timeout: 180000 }, () => {
  const file = "North Pole Summit.json";
  const star = expectStarGeometry(file, { x: -155, y: 1.9, z: -143 }, "np-prop-2");
  const sim = race(file);
  try {
    // South of the first straight past the nutcracker and vice (10u
    // clear), north of the lake (7u+ clear): slow staged legs hold
    // the tight corridor, then rejoin the road, pass under the
    // corner arch, and run north on solid slab to the cocoa cart.
    const route: Waypoint[] = [
      [-340, -170, 10, 6], [-335, -180, 7, 5], [-300, -180, 8, 5],
      [-260, -180, 8, 5], [-220, -180, 8, 5], [-190, -180, 8, 5],
      [-185, -170, 7, 5], [-155, -170, 10, 6], [-155, -150, 7, 5],
      [-155, -143, 5, 0],
    ];
    const diag = driveRoute(sim, route, 150, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
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
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Sharkbite Run: smashes the wall, jumps the cacti, collects at the lone barrel", { timeout: 180000 }, () => {
  const file = "Sharkbite Run.json";
  const star = expectStarGeometry(file, { x: -24, y: 1.9, z: 62 }, "barrel-2");
  const sim = race(file);
  try {
    // Route prefix from tests/sharkbite-run-drive.ts, then west off
    // the pool road to the barrel: 24u+ clear of the pool and boost.
    const route: Waypoint[] = [
      [170, 0, 16, 6], [140, 0, 16, 6], [115, 0, 15, 5], [100, 0, 15, 8],
      [70, 0, 16, 8], [45, 12, 14, 8], [22, 32, 14, 8], [-24, 62, 10, 0],
    ];
    const diag = driveRoute(sim, route, 150, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Rock and Roll: clears screws, coals and seesaw, collects at the north barrel", { timeout: 180000 }, () => {
  const file = "Rock and Roll.json";
  const star = expectStarGeometry(file, { x: 62, y: 1.9, z: 117 }, "barrel-1");
  const sim = race(file);
  try {
    // Route prefix from ROCK_AND_ROLL_ROUTE over the kicker, then
    // a gentle north curve past the coals and seesaw deck (6u+
    // clear) and east to the barrel: no right angles at all,
    // the chaotic rocker is never touched, boulders 60u+.
    const route: Waypoint[] = [
      [-120, 100, 14, 6], [-100, 100, 15, 8], [-70, 100, 15, 8],
      [-50, 100, 15, 6], [-36, 100, 15, 6], [-4, 100, 14, 6],
      [0, 108, 8, 5], [10, 113, 8, 5], [40, 116, 8, 5], [62, 117, 6, 0],
    ];
    const diag = driveRoute(sim, route, 150, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Shipyard: runs the quay road east and collects the star by the far barrel", { timeout: 180000 }, () => {
  const file = "Shipyard.json";
  const star = expectStarGeometry(file, { x: 93, y: 1.9, z: 70 }, "barrel-3");
  const sim = race(file);
  try {
    // Route prefix from SHIPYARD_ROUTE, then north-east off the road
    // to the barrel: 26u+ clear of the anchors, 15u+ off containers.
    const route: Waypoint[] = [
      [-20, 170, 14, 8], [-40, 148, 14, 8], [-55, 130, 10, 8],
      [-30, 116, 14, 8], [0, 100, 15, 8], [25, 86, 15, 8],
      [45, 75, 10, 8], [65, 66, 16, 8], [93, 70, 10, 0],
    ];
    const diag = driveRoute(sim, route, 150, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Spider Hollow: runs the hollow road south and collects the star by the barrel", { timeout: 180000 }, () => {
  const file = "Spider Hollow.json";
  const star = expectStarGeometry(file, { x: 74, y: 1.9, z: 40 }, "barrel-2");
  const sim = race(file);
  try {
    // Route prefix from SPIDER_HOLLOW_ROUTE, then a slow curve east
    // of the barrel to the star: 7u+ off the barrel, 25u+ clear of
    // the spike pit, 90u+ off the spider. No sharp fast turns.
    const route: Waypoint[] = [
      [-20, 190, 14, 8], [-40, 165, 14, 8], [-60, 140, 10, 8],
      [-35.9, 118.8, 14, 8], [-8.4, 103.8, 14, 8], [19.1, 88.8, 14, 8],
      [50, 80, 10, 8], [52, 60, 8, 6], [60, 52, 7, 5],
      [68, 46, 6, 4], [74, 40, 5, 0],
    ];
    const diag = driveRoute(sim, route, 150, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Screwball Run: rides the tube and teeter, threads screws, collects west of the barrel", { timeout: 240000 }, () => {
  const file = "Screwball Run.json";
  const star = expectStarGeometry(file, { x: -20, y: 1.9, z: 200 }, "barrel-2");
  const sim = race(file);
  try {
    // SCREWBALL_ROUTE prefix (tests/screwball-drive.ts) with its timed
    // teeter-totter release, then west around the screwfield (12u
    // clear of every station — the x=0 line threads live screws),
    // south past the field, and east to the star south of it.
    const route: Waypoint[] = [
      [0, 445, 14, 8], [0, 420, 18, 8], [0, 400, 20, 8], [0, 380, 20, 8],
      [0, 350, 15, 8], [0, 330, 15, 8], [0, 318, 12, 6], [0, 300, 12, 8],
      [0, 282, 12, 6], [0, 255, 12, 8], [-15, 245, 10, 6],
      [-33, 240, 10, 6], [-33, 200, 10, 6], [-20, 200, 6, 0],
    ];
    let next = 0;
    let minDist = Infinity;
    let ebPrev: number | undefined;
    let releaseStreak = 0;
    for (let i = 0; i < Math.floor(240 / DT) && sim.trackRun!.status === "running"; i++) {
      if (sim.trackRun!.stars.has(STAR_ID)) break;
      const p = sim.body.translation();
      minDist = Math.min(minDist, Math.hypot(p.x - star.x, p.y - star.y, p.z - star.z));
      const [wx, wz, , reach] = route[next];
      if (Math.hypot(wx - p.x, wz - p.z) < reach && next < route.length - 1) next++;
      const [x, z, speed] = route[next];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const aim = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(aim), Math.cos(aim));
      const v = sim.body.linvel();
      const pace = Math.hypot(v.x, v.z);
      const cap = Math.abs(error) > 0.58 ? Math.min(6, speed) : speed;
      let hold = false;
      if (next >= 5 && next <= 7 && p.z > 340) {
        const mech = sim.dungeon.mechanisms.find((m) => m.h.kind === "teeter-totter");
        if (mech?.body) {
          const bq = mech.body.rotation();
          const end = new Vector3(0, -TEETER.h / 2, TEETER.d / 2)
            .applyQuaternion(new Quaternion(bq.x, bq.y, bq.z, bq.w));
          const eb = mech.body.translation().y + end.y;
          const rate = ebPrev === undefined ? 0 : (eb - ebPrev) / DT;
          ebPrev = eb;
          releaseStreak = eb > 4 && rate < -1 && pace < 3 ? releaseStreak + 1 : 0;
          hold = releaseStreak < 3;
        }
      }
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: hold ? 0 : pace < cap ? 1 : 0,
        brake: hold ? 1 : pace > cap + 0.65 ? 0.65 : 0,
      });
    }
    expectCollected(diagOf(sim, minDist, next), file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
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
    // (Frozen star: spawn-visible by user order, never relocated.)
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
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
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
    const level = levelJson(file.replace(/^\/official\//, ""));
    const stars = level.prefabs.filter((p) => p.kind === "gold-star");
    expect(stars, `${file} hides one star`).toHaveLength(1);
    expect(stars[0].id, `${file} star id`).toBe(STAR_ID);
  }
  // No official JSON outside the lineup may hide (or miss) a star either.
  for (const file of readdirSync("levels/official")) {
    if (file === "order.json" || !file.endsWith(".json")) continue;
    expect(seen.has(`/official/${file}`), `${file} is listed in order.json`).toBe(true);
  }
});
