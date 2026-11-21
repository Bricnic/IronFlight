import { readFileSync } from "node:fs";
import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";

/**
 * Gold-star placement proofs for the 3 mystic-caves levels. Each level hides
 * exactly one standard-fields gold-star prefab 15u+ off the ideal line but
 * within 30u of a visible landmark; each test drives the full track,
 * collects the star on the way, and finishes the run.
 */
type Waypoint = [x: number, z: number, speed: number, reach: number];
type Vec = { x: number; y: number; z: number };
const STAR_ID = "gold-star-1";
const FILES = ["Mystic Caverns.json", "Firefly Grotto.json", "Lavabridge Abyss.json"];

beforeAll(async () => {
  await initPhysics();
  for (const file of FILES)
    registerCustomTrack(
      officialFileTracks.find((t) => t.sourceFile === `levels/official/spooky-places/${file}`)!,
    );
});

function trackId(file: string) {
  return officialFileTracks.find((t) => t.sourceFile === `levels/official/spooky-places/${file}`)!.id;
}
function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
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
type LevelJson = {
  mode: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  checkpoints: { x: number; z: number }[];
  prefabs: { id: string; kind: string; x: number; y?: number; z: number }[];
  solids?: { id: string; kind: string; name?: string; x: number; z: number }[];
};
const levelJson = (file: string): LevelJson =>
  JSON.parse(readFileSync(`levels/official/spooky-places/${file}`, "utf8"));
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
  const line = [{ x: level.spawn.x, z: level.spawn.z }, ...level.checkpoints];
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
/** Normal pedal/steering pursuit of one waypoint (gold-star-official-a pattern). */
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
/** Follow waypoints to the finish, tracking star collection along the way. */
function driveRoute(sim: Simulation, route: Waypoint[], budgetSec: number, star: Vec): DriveDiag {
  let next = 0;
  let minDist = Infinity;
  for (let i = 0; i < Math.floor(budgetSec / DT) && sim.trackRun!.status === "running"; i++) {
    const p = sim.body.translation();
    minDist = Math.min(minDist, Math.hypot(p.x - star.x, p.y - star.y, p.z - star.z));
    const [wx, wz, , reach] = route[next];
    if (next < route.length - 1) {
      const dCur = Math.hypot(wx - p.x, wz - p.z);
      const [nx, nz] = route[next + 1];
      const dNext = Math.hypot(nx - p.x, nz - p.z);
      // Advance on arrival, or when blown past a tight waypoint toward the
      // next one: without this the truck U-turns on narrow bridges.
      if (dCur < reach || (dCur < 15 && dNext < dCur)) next++;
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

it("Mystic Caverns: climbs the rock pass, collects the peak star, finishes", { timeout: 180000 }, () => {
  const file = "Mystic Caverns.json";
  const star = expectStarGeometry(file, { x: 140, y: 7.9, z: 90 }, "mc-crystal-2");
  const sim = race(file);
  try {
    const route: Waypoint[] = [
      [0, -150, 10, 8], [0, -100, 10, 8], [35, -65, 9, 8], [70, -40, 9, 8],
      [100, 5, 9, 8], [120, 50, 8, 6], [132, 72, 6, 4], [140, 90, 6, 4],
      [130, 98, 5, 4], [120, 106, 5, 4], [110, 114, 6, 4], [100, 120, 7, 5],
      [90, 130, 8, 6], [45, 145, 9, 8], [0, 150, 9, 8],
      [-50, 135, 9, 8], [-90, 100, 9, 8], [-108, 50, 9, 8], [-110, 0, 9, 8],
      [-95, -45, 9, 8], [-80, -80, 9, 0],
    ];
    const diag = driveRoute(sim, route, 220, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.status, `${file} finished`).toBe("completed");
    expect(sim.trackRun!.elapsed, `${file} elapsed ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});

it("Firefly Grotto: sprints the plank bridge, collects the approach star, finishes", { timeout: 180000 }, () => {
  const file = "Firefly Grotto.json";
  const star = expectStarGeometry(file, { x: 50, y: 7.9, z: 55 }, "fg-arch-top");
  const sim = race(file);
  try {
    const route: Waypoint[] = [
      [-35, -150, 10, 8], [-70, -120, 9, 8], [-70, -75, 9, 8], [-70, -30, 9, 8],
      [-35, -5, 9, 8], [0, 20, 8, 6], [25, 38, 8, 5], [50, 55, 8, 4],
      [70, 60, 12, 4], [100, 60, 12, 5], [125, 60, 11, 4], [140, 60, 8, 4],
      [150, 60, 6, 4], [158, 61, 6, 4], [162, 66, 5, 4], [160, 74, 5, 5],
      [156, 86, 6, 5], [153, 100, 7, 5], [151, 120, 8, 6], [150, 140, 9, 8],
      [125, 160, 9, 8], [90, 175, 9, 8], [40, 180, 9, 0],
    ];
    const diag = driveRoute(sim, route, 200, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.status, `${file} finished`).toBe("completed");
    expect(sim.trackRun!.elapsed, `${file} elapsed ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});

it("Lavabridge Abyss: crosses the arch, collects the loop star, finishes", { timeout: 180000 }, () => {
  const file = "Lavabridge Abyss.json";
  const star = expectStarGeometry(file, { x: 40, y: 1.9, z: 210 }, "la-grove-b-mush-0");
  const sim = race(file);
  try {
    const route: Waypoint[] = [
      [-115, -160, 10, 8], [-80, -150, 9, 8], [-80, -105, 9, 8], [-80, -60, 9, 8],
      [-55, -45, 8, 6], [-30, -30, 7, 5], [-8, -38, 6, 4], [10, -42, 6, 4],
      [20, -36, 6, 3], [20, -27, 6, 3], [20, -20, 6, 3], [20, -10, 6, 4],
      [20, 0, 6, 4], [20, 10, 6, 4], [20, 20, 6, 4], [20, 30, 6, 4],
      [20, 40, 6, 4], [20, 50, 6, 4], [20, 60, 6, 4], [20, 70, 6, 4], [20, 80, 6, 4],
      [20, 100, 7, 5], [50, 120, 8, 6], [80, 140, 9, 8], [110, 155, 9, 8],
      [140, 170, 9, 8], [110, 190, 9, 8], [70, 205, 9, 6], [40, 210, 8, 5],
      [0, 200, 9, 8], [-60, 190, 9, 0],
    ];
    const diag = driveRoute(sim, route, 220, star);
    expectCollected(diag, file);
    expect(sim.trackRun!.status, `${file} finished`).toBe("completed");
    expect(sim.trackRun!.elapsed, `${file} elapsed ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
