import { readFileSync } from "node:fs";
import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { LIME_JAW, LIME_JAW_PERIOD } from "../src/dungeon-hazards";
import { VOLCANO_PERIOD } from "../src/gauntlet-timing";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";

/**
 * Gold-star placement proofs for official levels [0, 12): Fairground through
 * Slime Surge in order.json. Each level hides exactly one standard-fields
 * gold-star prefab 15u+ off the ideal line but within 30u of a visible
 * landmark, and each test drives the sim from spawn to the star.
 */
type Waypoint = [x: number, z: number, speed: number, reach: number];
type Vec = { x: number; y: number; z: number };
const STAR_ID = "gold-star-1";
const FILES = [
  "Fairground.json",
  "Dungeon.json",
  "Jurassic Junction.json",
  "Emberfall Causeway.json",
  "Chompworks.json",
  "Machine Gauntlet.json",
  "Amber Undertow.json",
  "Fireside Sonata.json",
  "Pumpkin Pass.json",
  "Booster Gap.json",
  "Evil Tube Run.json",
  "Slime Surge.json",
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
/** Enter a guided pipe and ride it out (transit/shooter/amber/slime pattern). */
function rideTube(sim: Simulation, label: string, entrySec = 6, rideSec = 14) {
  for (let i = 0; i < Math.floor(entrySec / DT) && !sim.guidedPipe.snapshot(); i++)
    sim.step({ throttle: 1 });
  expect(sim.guidedPipe.snapshot()?.section, label).toBe("tube");
  for (let i = 0; i < Math.floor(rideSec / DT) && sim.guidedPipe.snapshot(); i++) sim.step({});
  expect(sim.guidedPipe.snapshot(), label).toBeNull();
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
it("Fairground: drives the south midway to the east grandstand and collects the star", { timeout: 180000 }, () => {
  const file = "Fairground.json";
  const star = expectStarGeometry(file, { x: 200, y: 1.9, z: -135 }, "grandstand-42");
  const sim = race(file);
  try {
    // The grandstand bank collider spans x[210,227], so the star waits
    // 10u west of its face and the route stays west of x=200.
    const route: Waypoint[] = [
      [0, -175, 10, 6], [150, -175, 10, 6], [200, -160, 9, 5], [200, -135, 8, 0],
    ];
    const diag = driveRoute(sim, route, 120, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Dungeon: drives the south corridor to the southeast gravestone and collects the star", { timeout: 180000 }, () => {
  const file = "Dungeon.json";
  const star = expectStarGeometry(file, { x: 162, y: 1.9, z: -166 }, "stone-2");
  const sim = race(file);
  try {
    const route: Waypoint[] = [
      [40, -195, 10, 6], [100, -195, 10, 6], [140, -185, 9, 5], [162, -166, 8, 0],
    ];
    const diag = driveRoute(sim, route, 120, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Jurassic Junction: crosses the bridge to the spinosaurus junction and collects the star", { timeout: 120000 }, () => {
  const file = "Jurassic Junction.json";
  const star = expectStarGeometry(file, { x: 64, y: 10.9, z: -42 }, "green-spinosaurus");
  const sim = race(file);
  try {
    // Route prefix from tests/jurassic-drive.ts, ending at the star.
    const route: Waypoint[] = [
      [-62, 50, 7, 5], [-56, 30, 9, 5], [-56, -37, 7, 5], [-33, -45, 9, 10],
      [61, -45, 8, 5], [64, -42, 7, 0],
    ];
    const diag = driveRoute(sim, route, 80, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Emberfall Causeway: drives the tower run to the pterosaur corner and collects the star", { timeout: 180000 }, () => {
  const file = "Emberfall Causeway.json";
  const star = expectStarGeometry(file, { x: -84, y: 13.9, z: 150 }, "gold-pterosaur");
  const sim = race(file);
  try {
    const route: Waypoint[] = [
      [102, -26, 9, 8], [76, -23, 11, 11], [33, -23, 7, 6],
      [29, -1, 12, 9], [29, 53, 16, 8], [29, 130, 25, 7],
      [29, 148, 7, 5], [4, 150, 10, 10], [-84, 150, 7, 0],
    ];
    const diag = driveRoute(sim, route, 85, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Chompworks: times the lime dinosaur and collects the star on the east straight", { timeout: 180000 }, () => {
  const file = "Chompworks.json";
  const star = expectStarGeometry(file, { x: 126, y: 10.9, z: 13 }, "lime-chomper");
  const sim = race(file);
  try {
    const route: Waypoint[] = [
      [0, -38, 12, 7], [-21, -35, 8, 9], [-108, -35, 17, 12],
      [-131, -30, 12, 8], [-145, -16, 11, 8], [-148, 2, 11, 8],
      [-142, 20, 11, 8], [-129, 32, 11, 8], [-111, 35, 10, 9],
      [63, 35, 18, 14], [78, 29, 9, 6], [82, 14, 8, 8],
      [82, -38, 12, 8], [88, -55, 9, 6], [104, -62, 9, 6],
      [119, -56, 9, 6], [126, -40, 9, 7], [126, -12, 9, 5],
      [126, 36, 16, 7], [119, 48, 8, 7], [103, 53, 9, 8],
      [23, 53, 15, 0],
    ];
    const diag = driveRoute(sim, route, 105, star, {
      at: 17,
      ready: (s) => {
        const v = s.body.linvel();
        const phase = s.time % LIME_JAW_PERIOD;
        return Math.hypot(v.x, v.z) <= 0.45 && phase >= 0.62 && phase <= 1.2;
      },
    });
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Machine Gauntlet: jumps the crater and collects the star on the gate apron", { timeout: 180000 }, () => {
  const file = "Machine Gauntlet.json";
  const star = expectStarGeometry(file, { x: 18, y: 10.9, z: 98 }, "gate-lane-18");
  const sim = race(file);
  try {
    const volcano = sim.dungeon.gauntlet.machines.get("volcano")!.h;
    // Route prefix from tests/gauntlet-drive.ts, ending at the star.
    const route: Waypoint[] = [
      [0, -132, 10, 5], [24.5, -99, 9, 6], [24.5, -47, 14, 7],
      [0, -11, 12, 7], [0, 84, 25, 9], [14, 94, 6, 5], [18, 98, 5, 0],
    ];
    const diag = driveRoute(sim, route, 85, star, {
      at: 3,
      ready: (s) => {
        const v = s.body.linvel();
        const phase = (s.time + volcano.phase) % VOLCANO_PERIOD;
        return Math.hypot(v.x, v.z) <= 0.55 && phase >= 3.1 && phase <= 3.35;
      },
    });
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Amber Undertow: takes the copper detour and collects the star by the turquoise opening", { timeout: 180000 }, () => {
  const file = "Amber Undertow.json";
  const star = expectStarGeometry(file, { x: -36.0227649079933, y: 11.9, z: -84.19528724068712 }, "copper-after-hole");
  const sim = race(file);
  try {
    // Back up on the start tile to make room for the turn onto the copper branch.
    for (let i = 0; i < 5 / DT && sim.body.translation().z > -148; i++) sim.step({ throttle: -0.3 });
    sim.run(0.4, { brake: 1 });
    const diag = driveRoute(sim, [[-22, -135, 4, 5], [-38, -119, 5, 6], [-45.5, -104, 4, 3], [-47, -94, 3.5, 3], [-44, -91, 3.5, 3], [star.x, star.z, 3, 0]], 90, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Fireside Sonata: detours to the bonus trampoline and collects the star", { timeout: 180000 }, () => {
  const file = "Fireside Sonata.json";
  const star = expectStarGeometry(file, { x: -28, y: 32.5, z: 32 }, "table-trampoline");
  const sim = race(file);
  try {
    const route: Waypoint[] = [
      [0, -170, 14, 8], [0, -120, 16, 10], [0, -75, 12, 8],
      [12, -45, 8, 6], [12, -22, 7, 5], [-6, 4, 6, 5], [0, 15, 8, 6],
      [-15, 35, 7, 5], [-28, 32, 6, 0],
    ];
    const diag = driveRoute(sim, route, 150, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Pumpkin Pass: drives the toy track past the loop and collects the star by the axe", { timeout: 180000 }, () => {
  const file = "Pumpkin Pass.json";
  const star = expectStarGeometry(file, { x: 96, y: 30.85, z: 150 }, "axe-3");
  const sim = race(file);
  try {
    const route: Waypoint[] = [
      [0, -78, 10, 6], [0, -60, 14, 8], [0, -40, 14, 8], [0, -20, 12, 6],
      [3, -11, 10, 5], [8, 0, 10, 5], [13, 10, 10, 5], [17, 19, 9, 5],
      [22, 28, 9, 5], [27, 38, 9, 5], [33, 48, 25, 6],
      [52, 79, 25, 9],
      [60, 90, 9, 5], [63, 97, 8, 4], [65, 105, 8, 5],
      [67, 113, 8, 5], [70, 121, 8, 5],
      [72, 130, 12, 6], [72, 142, 12, 6], [80, 152, 10, 5], [96, 150, 10, 0],
    ];
    const diag = driveRoute(sim, route, 150, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Booster Gap: clears both jumps and collects the star at the dino junction", { timeout: 240000 }, () => {
  const file = "Booster Gap.json";
  const star = expectStarGeometry(file, { x: 12, y: 30.9, z: 200 }, "dino-1");
  const sim = race(file);
  try {
    const route: Waypoint[] = [
      [0, -82, 10, 6], [0, -70, 12, 6], [0, -58, 12, 6],
      [0, -48, 10, 5],
      [0, -30, 25, 9],
      [0, -12, 10, 5], [0, 0, 10, 5],
      [0, 15, 14, 6], [0, 30, 60, 6], [0, 50, 30, 6],
      [0, 80, 30, 12],
      [0, 140, 10, 50],
      [2, 155, 9, 5], [4, 170, 8, 5], [8, 185, 8, 5], [12, 200, 8, 5],
      [6, 206, 7, 6], [0, 212, 7, 6], [-3, 220, 8, 4], [-6, 228, 8, 4],
      [-8, 240, 10, 5], [-8, 257, 8, 0],
    ];
    // Dino-junction timing copied from tests/booster-drive.ts.
    let next = 0;
    let minDist = Infinity;
    let junctionReleased = false;
    for (let i = 0; i < Math.floor(240 / DT) && sim.trackRun!.status === "running"; i++) {
      if (sim.trackRun!.stars.has(STAR_ID)) break;
      const p = sim.body.translation();
      minDist = Math.min(minDist, Math.hypot(p.x - star.x, p.y - star.y, p.z - star.z));
      const cdx = p.x - 22, cdz = p.z - 200;
      const jawAcross = cdx * Math.cos(4) - cdz * Math.sin(4);
      const jawForward = cdx * Math.sin(4) + cdz * Math.cos(4);
      const inJaws = Math.abs(jawAcross) <= LIME_JAW.halfWidth && jawForward >= LIME_JAW.back && jawForward <= LIME_JAW.tip;
      const jawEdge = jawForward < LIME_JAW.back ? LIME_JAW.back - jawForward : jawForward > LIME_JAW.tip ? jawForward - LIME_JAW.tip : Math.abs(jawAcross) > LIME_JAW.halfWidth ? Math.abs(jawAcross) - LIME_JAW.halfWidth : 0;
      const nearJunction = Math.hypot(cdx, cdz) < 48 && p.z < 202 && p.x > -2;
      const jawPhase = ((sim.time % LIME_JAW_PERIOD) + LIME_JAW_PERIOD) % LIME_JAW_PERIOD;
      const jawOpenLeft = jawPhase >= 0.48 && jawPhase < 4.17 ? 4.17 - jawPhase : 0;
      if (!junctionReleased && p.z > 145 && p.z < 170 && Math.abs(p.x) < 8) {
        const entryPhase = (sim.time + 3.0) % LIME_JAW_PERIOD;
        if (entryPhase >= 0.5 && entryPhase <= 0.9) junctionReleased = true;
        else {
          sim.step({ steer: 0, throttle: 0, brake: 1 });
          continue;
        }
      }
      if (nearJunction && !inJaws && jawEdge < 8 && jawOpenLeft < 3.5) {
        sim.step({ steer: 0, throttle: 0, brake: 1 });
        continue;
      }
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
      const junctionLeg = next >= 15 && next <= 18;
      const cap = Math.min(Math.abs(error) > 0.58 ? Math.min(6, speed) : speed, nearJunction && !inJaws && jawEdge < 15 ? 5 : 99, junctionLeg ? 6 : 99);
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: pace < cap ? (pace < 3 && (p.z > 200 || !nearJunction) ? 0.4 : 1) : 0,
        brake: pace > cap + 0.65 ? 0.65 : 0,
      });
    }
    expectCollected(diagOf(sim, minDist, next), file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Evil Tube Run: rides the transit tube and collects the star by the spike-jaw skull", { timeout: 240000 }, () => {
  const file = "Evil Tube Run.json";
  const star = expectStarGeometry(file, { x: 336, y: 10.9, z: -85 }, "skull-teeth");
  const sim = race(file);
  try {
    const route: Waypoint[] = [
      [-60, -120, 14, 6], [-66, -95, 10, 5], [-66, -70, 12, 5],
      [-60, -30, 12, 6], [-45, -18, 10, 5], [-28, -14, 12, 5],
      [-10, -10, 12, 5], [20, 8, 12, 6], [60, 11, 12, 5],
      [100, -14, 12, 6], [125, -16, 22, 5], [185, -16, 22, 6],
      [225, -16, 14, 5],
      [345, 10, 10, 6], [340, -10, 10, 6], [338, -30, 10, 6],
      [336, -55, 8, 5], [336, -85, 8, 0],
    ];
    driveRoute(sim, route.slice(0, 13), 150, star, undefined, true);
    rideTube(sim, "transit-tube");
    const diag = driveRoute(sim, route.slice(13), 150, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Slime Surge: jumps the crater and collects the star at the tube mouth", { timeout: 180000 }, () => {
  const file = "Slime Surge.json";
  const star = expectStarGeometry(file, { x: 0, y: 22.9, z: 148 }, "tube-1");
  const sim = race(file);
  try {
    const volcano = sim.dungeon.gauntlet.machines.get("volcano-1")!.h;
    const leg1: Waypoint[] = [
      [0, -150, 10, 5], [0, -120, 9, 4], [0, -96, 10, 5],
      [0, -76, 9, 4], [0, -50, 12, 6], [0, -32, 12, 5],
      [0, 20, 25, 9], [0, 55, 14, 7], [0, 95, 12, 7], [0, 140, 10, 5],
      [0, 148, 8, 0],
    ];
    const diag = driveRoute(sim, leg1, 100, star, {
      at: 5,
      ready: (s) => {
        const v = s.body.linvel();
        const phase = (s.time + volcano.phase) % VOLCANO_PERIOD;
        return Math.hypot(v.x, v.z) <= 0.55 && phase >= 3.1 && phase <= 3.35;
      },
    });
    if (!diag.collected) {
      // Push into the tube mouth in case the approach stopped a hair short.
      for (let i = 0; i < Math.floor(4 / DT) && sim.trackRun!.status === "running"; i++) {
        if (sim.trackRun!.stars.has(STAR_ID)) break;
        sim.step({ throttle: 1 });
      }
    }
    const pos = sim.body.translation();
    expectCollected(
      { ...diag, collected: sim.trackRun!.stars.has(STAR_ID), pos: { x: pos.x, y: pos.y, z: pos.z } },
      file,
    );
    expect(sim.trackRun!.elapsed, `${file} star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
