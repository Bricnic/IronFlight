import { readFileSync } from "node:fs";
import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { SNAP_CYCLE } from "../src/dungeon-hazards";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";

/**
 * Gold-star placement proofs for official levels [12, 24): Ring Chase
 * through Mistletoe Mile in order.json. Each level hides exactly one
 * standard-fields gold-star prefab 15u+ off the ideal line but within
 * 30u of a visible landmark, and each test drives the sim from spawn
 * to the star.
 */
type Waypoint = [x: number, z: number, speed: number, reach: number];
type Vec = { x: number; y: number; z: number };
const STAR_ID = "gold-star-1";
const FILES = [
  "Ring Chase.json",
  "Block Party.json",
  "Frostfire Pass.json",
  "Volcano Loop.json",
  "Toybox Road.json",
  "Gumdrop Meadows.json",
  "Lollipop Loop.json",
  "Peppermint Pass.json",
  "Chocolate Chasm.json",
  "Sugar Rush Summit.json",
  "Tinsel Town.json",
  "Mistletoe Mile.json",
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
it("Ring Chase: turns to the southwest corner lamp and collects the star", { timeout: 120000 }, () => {
  const file = "Ring Chase.json";
  const star = expectStarGeometry(file, { x: -140, y: 1.9, z: -144 }, "lamp-nw");
  const sim = race(file);
  try {
    // Turn in open ground: straight at the ring first, then back to the corner.
    const diag = driveRoute(sim, [[-100, -100, 9, 6], [-140, -144, 7, 0]], 60, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Block Party: crosses the bumper arena to the southwest corner and collects the star", { timeout: 180000 }, () => {
  const file = "Block Party.json";
  const star = expectStarGeometry(file, { x: -62, y: 10.9, z: -50.5 }, "arena-floor");
  const sim = race(file);
  try {
    // Through the gate, in the arena's east gap, out the south gap: the
    // star waits just outside the south wall, past spawn-camera range.
    const route: Waypoint[] = [
      [0, 60, 10, 6], [0, 30, 10, 6], [0, 8, 9, 5],
      [0, -8, 9, 5], [-8, -16, 8, 4], [-16, -24, 7, 4],
      [-30, -28, 7, 4], [-45, -40, 7, 5], [-55, -48, 6, 4], [-62, -50.5, 6, 0],
    ];
    const diag = driveRoute(sim, route, 120, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Frostfire Pass: runs the west straight and bottom road to the east corner pad and collects the star", { timeout: 120000 }, () => {
  const file = "Frostfire Pass.json";
  const star = expectStarGeometry(file, { x: 36, y: 10.9, z: 58 }, "corner-pad-e");
  const sim = race(file);
  try {
    const route: Waypoint[] = [
      [-30, -40, 12, 6], [-30, 0, 12, 6], [-30, 40, 10, 6],
      [-20, 54, 9, 5], [10, 54, 10, 5], [30, 54, 9, 4], [36, 58, 7, 0],
    ];
    const diag = driveRoute(sim, route, 90, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Volcano Loop: circles the loop and collects the star on the boost pad", { timeout: 240000 }, () => {
  const file = "Volcano Loop.json";
  const star = expectStarGeometry(file, { x: -84, y: 1.9, z: -100 }, "boost-gap");
  const sim = race(file);
  try {
    // Loop line copied from tests/volcano-loop-drive.ts, truncated at the pad.
    const route: Waypoint[] = [
      [100, -60, 14, 8], [100, 0, 14, 8], [100, 30, 12, 7],
      [90, 75, 10, 8], [60, 100, 10, 7], [30, 100, 9, 6],
      [-10, 100, 12, 8], [-60, 100, 12, 8], [-90, 80, 10, 8],
      [-100, 40, 12, 7], [-100, 10, 10, 6], [-100, -30, 12, 8],
      [-100, -70, 10, 6], [-97, -95, 9, 7], [-84, -100, 8, 0],
    ];
    const diag = driveRoute(sim, route, 240, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Toybox Road: runs the north verge to the flagpole and collects the star", { timeout: 180000 }, () => {
  const file = "Toybox Road.json";
  const star = expectStarGeometry(file, { x: 130, y: 1.9, z: 95 }, "flagpole-ride");
  const sim = race(file);
  try {
    // North of the clips, raptors, robot and spinosaurus the whole way.
    const route: Waypoint[] = [
      [-120, 56, 8, 5], [-120, 62, 8, 5], [-100, 85, 10, 6], [-40, 90, 12, 6],
      [20, 88, 12, 6], [60, 90, 12, 6], [100, 94, 10, 5], [130, 95, 8, 0],
    ];
    const diag = driveRoute(sim, route, 120, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Gumdrop Meadows: cuts cross-country to the mid-track stall and collects the star", { timeout: 120000 }, () => {
  const file = "Gumdrop Meadows.json";
  const star = expectStarGeometry(file, { x: 48, y: 1.9, z: 44 }, "gm-stall-3-0");
  const sim = race(file);
  try {
    // West of both snap traps, round the checkpoint arch's west post,
    // then south of the mid-track stall.
    const route: Waypoint[] = [
      [-150, -60, 10, 6], [-62, -26, 10, 6], [-78, 32, 9, 5],
      [-20, 55, 9, 5], [48, 44, 8, 0],
    ];
    const diag = driveRoute(sim, route, 120, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Lollipop Loop: runs the south verge to the far corner and collects the star", { timeout: 120000 }, () => {
  const file = "Lollipop Loop.json";
  const star = expectStarGeometry(file, { x: 140, y: 1.9, z: -20 }, "ll-decor-2-0");
  const sim = race(file);
  try {
    // South of the gummy vice, east of the far straight.
    const route: Waypoint[] = [
      [-40, -95, 10, 6], [75, -80, 12, 6], [110, -40, 10, 5], [140, -20, 8, 0],
    ];
    const diag = driveRoute(sim, route, 120, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Peppermint Pass: cuts east to the second-leg stall and collects the star", { timeout: 120000 }, () => {
  const file = "Peppermint Pass.json";
  const star = expectStarGeometry(file, { x: 62, y: 1.9, z: -48 }, "pp-stall-1-0");
  const sim = race(file);
  try {
    // North of the jawbreaker crusher, then a smooth bend well east of
    // the stall: tight finals round the stall corner orbit and pinball.
    const route: Waypoint[] = [
      [-60, -95, 10, 6], [20, -90, 10, 6], [50, -70, 7, 5], [62, -48, 6, 0],
    ];
    const diag = driveRoute(sim, route, 120, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Chocolate Chasm: runs the south verge of the first leg and collects the star", { timeout: 120000 }, () => {
  const file = "Chocolate Chasm.json";
  const star = expectStarGeometry(file, { x: 50, y: 1.9, z: -128 }, "cc-decor-0-6");
  const sim = race(file);
  try {
    // South of the sugar chomper, by the gumdrop tree at the far corner.
    const route: Waypoint[] = [
      [-100, -145, 10, 6], [0, -135, 12, 6], [50, -128, 8, 0],
    ];
    const diag = driveRoute(sim, route, 120, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Sugar Rush Summit: runs the south verge west to the lamp and collects the star", { timeout: 120000 }, () => {
  const file = "Sugar Rush Summit.json";
  const star = expectStarGeometry(file, { x: -120, y: 1.9, z: -168 }, "sr-decor-0-7");
  const sim = race(file);
  try {
    // South of the slammer and crusher on the first straight.
    const route: Waypoint[] = [
      [20, -170, 10, 6], [-40, -170, 10, 6], [-120, -168, 9, 0],
    ];
    const diag = driveRoute(sim, route, 120, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Tinsel Town: times the chomper and collects the star on the junction pad", { timeout: 180000 }, () => {
  const file = "Tinsel Town.json";
  const star = expectStarGeometry(file, { x: 30, y: 1.9, z: -4 }, "tt-arch-2");
  const sim = race(file);
  try {
    const chomper = sim.dungeon.mechanisms.find((m) => m.h.id === "tt-chomper")!.h;
    // Road line from tests/christmas-drive.ts, truncated at pad-0: wait
    // outside the chomper strike zone for the hold to release, then sprint.
    const route: Waypoint[] = [
      [-240, -60, 14, 8], [-180, -60, 10, 5], [-170, -60, 14, 5],
      [-120, -60, 14, 8], [-90, -60, 12, 8], [-30, -60, 12, 8],
      [0, -45, 10, 6], [30, -20, 10, 6], [30, -10, 8, 4], [30, -4, 7, 0],
    ];
    const diag = driveRoute(sim, route, 150, star, {
      at: 1,
      ready: (s) => {
        const v = s.body.linvel();
        const t = snapPhase(s.time + chomper.phase);
        return Math.hypot(v.x, v.z) <= 0.6 && t >= 2.6 && t < 2.95;
      },
    });
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Mistletoe Mile: times the nutcracker and collects the star by the junction pine", { timeout: 180000 }, () => {
  const file = "Mistletoe Mile.json";
  const star = expectStarGeometry(file, { x: 0, y: 1.9, z: 50 }, "mm-tree-1");
  const sim = race(file);
  try {
    const nutcracker = sim.dungeon.mechanisms.find((m) => m.h.id === "mm-nutcracker")!.h;
    // Diagonal road line from tests/christmas-drive.ts, truncated at pad-0,
    // then east to the pine: wait outside the nutcracker strike zone for
    // the hold to release, then sprint between its posts.
    const route: Waypoint[] = [
      [-240, -64, 12, 8], [-200, -48, 12, 6], [-178, -40.5, 8, 4],
      [-150, -30, 12, 6], [-100, -12, 12, 6], [-50, 8, 12, 6],
      [-20, 20, 10, 5], [-10, 35, 9, 5], [0, 50, 8, 0],
    ];
    const diag = driveRoute(sim, route, 150, star, {
      at: 2,
      ready: (s) => {
        const v = s.body.linvel();
        const t = snapPhase(s.time + nutcracker.phase);
        return Math.hypot(v.x, v.z) <= 0.6 && t >= 2.6 && t < 2.95;
      },
    });
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
