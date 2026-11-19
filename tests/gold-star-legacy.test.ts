import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { TRACKS, getTrack, type TrackId } from "../src/tracks";
import { courseProps, courseSolids } from "../src/course";
import { arenaSolids } from "../src/arena";
import { initPhysics, Simulation } from "../src/simulation";
import { courseDriver } from "./course-driver";

/**
 * Gold-star placement proofs for the 8 code-defined legacy tracks in
 * src/tracks.ts. Each track hides exactly one standard-fields star 15u+
 * off the ideal line but within 30u of a named landmark, and each test
 * drives the sim from spawn to the star. Routes are untouched; only the
 * star positions in tracks.ts were hand-placed.
 */
type Waypoint = [x: number, z: number, speed: number, reach: number];
type Vec = { x: number; y: number; z: number };
const STAR_ID = "gold-star-1";

beforeAll(initPhysics);

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
/** Arena/demolition ideal line: greedy nearest-neighbor tour from spawn. */
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
/** Static placement asserts: one standard-fields star, off-line, near its landmark. */
function expectStarGeometry(id: TrackId, expectedStar: Vec, expectedLandmarkId: string, minOffLine = 15) {
  const track = getTrack(id);
  const stars = track.goldStars ?? [];
  expect(stars, `${id} hides one star`).toHaveLength(1);
  const [star] = stars;
  expect(star.id, `${id} star id`).toBe(STAR_ID);
  for (const key of Object.keys(star))
    expect(["id", "x", "y", "z", "yaw", "scale"], `${id} standard fields`).toContain(key);
  const placed: Vec = { x: star.x, y: star.y, z: star.z };
  expect(placed, `${id} star position`).toEqual(expectedStar);
  const line =
    track.mode === "race"
      ? [{ x: track.spawn.x, z: track.spawn.z }, ...track.path.slice(1)]
      : track.mode === "arena"
        ? greedyTour(track.spawn, track.collectibles)
        : greedyTour(track.spawn, track.demolish ?? []);
  const dLine = polyDist(placed.x, placed.z, line);
  expect(dLine, `${id} star sits ${dLine.toFixed(1)}u off the ideal line`).toBeGreaterThanOrEqual(minOffLine);
  const landmarks: { id: string; x: number; z: number }[] =
    id === "triple-loop"
      ? arenaSolids()
      : [...courseSolids(track), ...courseProps(track)];
  if (track.ring) landmarks.push({ id: "ring", x: track.ring.x, z: track.ring.z });
  if (track.trampoline)
    landmarks.push({ id: "trampoline", x: track.trampoline.x, z: track.trampoline.z });
  let nearest = Infinity;
  for (const s of landmarks)
    nearest = Math.min(nearest, Math.hypot(s.x - placed.x, s.z - placed.z));
  expect(nearest, `${id} nearest landmark ${nearest.toFixed(1)}u`).toBeLessThanOrEqual(30);
  const landmark = landmarks.find((s) => s.id === expectedLandmarkId);
  expect(landmark, `${id} landmark ${expectedLandmarkId} exists`).toBeDefined();
  const dMark = Math.hypot(landmark!.x - placed.x, landmark!.z - placed.z);
  expect(dMark, `${id} landmark ${expectedLandmarkId} sits ${dMark.toFixed(1)}u away`).toBeLessThanOrEqual(30);
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
it("Triple Loop: cuts west across the runup to the floodlight pole and collects the star", { timeout: 120000 }, () => {
  const star = expectStarGeometry("triple-loop", { x: -45, y: 2, z: -80 }, "pole--57--90");
  const sim = new Simulation();
  sim.startTrack("triple-loop");
  try {
    const diag = driveRoute(sim, [[-45, -80, 8, 0]], 40, star);
    expectCollected(diag, "triple-loop");
    expect(sim.trackRun!.elapsed, `triple-loop star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Foundry Run: runs the road north and cuts west to the fourth block star", { timeout: 120000 }, () => {
  const star = expectStarGeometry("foundry-run", { x: -31, y: 2.1, z: 79 }, "foundry-block--1-3");
  const sim = new Simulation();
  sim.startTrack("foundry-run");
  try {
    // Up the launch straight past the ramp, along the second leg,
    // then west across the third leg to the star: 10u+ clear of the
    // burner, 20u+ clear of the teeth and hammer, south of the flame.
    const route: Waypoint[] = [
      [0, -50, 10, 6], [0, 0, 10, 6], [8, 60, 10, 6],
      [-15, 79, 8, 5], [-31, 79, 6, 0],
    ];
    const diag = driveRoute(sim, route, 120, star);
    expectCollected(diag, "foundry-run");
    expect(sim.trackRun!.elapsed, `foundry-run star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Skyline Circuit: rounds the ring west and collects the star at the far rail", { timeout: 180000 }, () => {
  const star = expectStarGeometry("skyline-circuit", { x: 0, y: 2, z: 96 }, "circuit-rail-96-24");
  const sim = new Simulation();
  sim.startTrack("skyline-circuit");
  try {
    // Round the ring counterclockwise past the west road, line up
    // through the north gate waypoint, then run straight at the far
    // outer rail: 11u+ clear of the book crusher, 14u+ clear of the
    // burner, 6u+ clear of the finish hydrant — the final waypoint
    // aims exactly at the star so it banks 4u short of the rail and
    // no rail is ever touched.
    const route: Waypoint[] = [
      [-30.6, -73.9, 10, 6], [-56.6, -56.6, 10, 6], [-73.9, -30.6, 10, 6],
      [-80, 0, 10, 6], [-73.9, 30.6, 10, 6], [-56.6, 56.6, 10, 6],
      [-30.6, 73.9, 10, 6], [-6, 79, 5, 3], [0, 96, 4, 0],
    ];
    const diag = driveRoute(sim, route, 150, star);
    expectCollected(diag, "skyline-circuit");
    expect(sim.trackRun!.elapsed, `skyline-circuit star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Scrapyard Sweep: cuts past the east corner stack to the start sign star", { timeout: 120000 }, () => {
  const star = expectStarGeometry("scrapyard-sweep", { x: 84, y: 1.9, z: -70 }, "scrap-prop-1-0");
  const sim = new Simulation();
  sim.startTrack("scrapyard-sweep");
  try {
    // Straight cut across the yard, 20u south of the corner stack
    // and 30u+ clear of every crusher.
    const diag = driveRoute(sim, [[84, -70, 8, 0]], 60, star);
    expectCollected(diag, "scrapyard-sweep");
    expect(sim.trackRun!.elapsed, `scrapyard-sweep star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Inferno Vault: cuts to the east apron store and collects the star", { timeout: 120000 }, () => {
  const star = expectStarGeometry("inferno-vault", { x: 75, y: 1.9, z: -60 }, "vault-store-0");
  const sim = new Simulation();
  sim.startTrack("inferno-vault");
  try {
    const diag = driveRoute(sim, [[75, -60, 8, 0]], 40, star);
    expectCollected(diag, "inferno-vault");
    expect(sim.trackRun!.elapsed, `inferno-vault star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Canyon Plunge: clears the gorge and collects the star on the axe-dodge line", { timeout: 240000 }, () => {
  // EXCEPTION to the 15u+ rule, with reason: canyon-plunge's far road
  // is fenced its whole length by 2-high plunge rails (x = +/-14, z
  // 880..2500) that high-center any truck that touches them, the ramp
  // is only 20 wide with the same rails, the gorge kills anything
  // south, and the run completes at the z=2500 gate — so no 15u+
  // off-line point is drivable. Verified by probe: pressing, grinding
  // or crossing the rail beaches the truck at y~3 every time, and the
  // z<880 landing window admits no U-turn (32u turn vs 12u of room
  // above the gorge). The star instead sits at 10.5u off-line on the
  // proven axe-dodge line, still beside the first axe gantry.
  const star = expectStarGeometry("canyon-plunge", { x: 10.5, y: 2, z: 935 }, "axe-post-0-1", 10);
  const track = getTrack("canyon-plunge");
  const sim = new Simulation();
  sim.startTrack("canyon-plunge");
  try {
    // Ride the proven course driver down the ramp, over the gorge and
    // on past the first axe: its dodge line runs right through the star.
    let minDist = Infinity;
    for (let i = 0; i < Math.floor(150 / DT) && sim.trackRun!.status === "running"; i++) {
      if (sim.trackRun!.stars.has(STAR_ID)) break;
      const p = sim.body.translation();
      minDist = Math.min(minDist, Math.hypot(p.x - star.x, p.y - star.y, p.z - star.z));
      sim.step(courseDriver(sim.snapshot(false), track));
    }
    expectCollected(diagOf(sim, minDist, 0), "canyon-plunge");
    expect(sim.trackRun!.elapsed, `canyon-plunge star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Haunted Hollow: crosses to the crypt door and collects the star", { timeout: 120000 }, () => {
  const star = expectStarGeometry("haunted-hollow", { x: 105, y: 1.9, z: -100 }, "crypt-base");
  const sim = new Simulation();
  sim.startTrack("haunted-hollow");
  try {
    const diag = driveRoute(sim, [[105, -100, 10, 0]], 60, star);
    expectCollected(diag, "haunted-hollow");
    expect(sim.trackRun!.elapsed, `haunted-hollow star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("Sky Slide: threads the sky ring and collects the star mid-flight", { timeout: 120000 }, () => {
  const star = expectStarGeometry("sky-slide", { x: 1, y: 19.5, z: 2426 }, "ring");
  const track = getTrack("sky-slide");
  const sim = new Simulation();
  sim.startTrack("sky-slide");
  try {
    // Ride the proven strafe driver down the rapids and off the
    // trampoline: the flight arc to the ring runs right through the
    // star, 126u past the end of the slide path.
    let minDist = Infinity;
    for (let i = 0; i < Math.floor(150 / DT) && sim.trackRun!.status === "running"; i++) {
      if (sim.trackRun!.stars.has(STAR_ID)) break;
      const p = sim.body.translation();
      minDist = Math.min(minDist, Math.hypot(p.x - star.x, p.y - star.y, p.z - star.z));
      sim.step(courseDriver(sim.snapshot(false), track));
    }
    expectCollected(diagOf(sim, minDist, 0), "sky-slide");
    expect(sim.trackRun!.elapsed, `sky-slide star collected at ${sim.trackRun!.elapsed.toFixed(1)}s`).toBeGreaterThanOrEqual(10);
    expect(sim.trackRun!.snapshot().stars).toEqual([STAR_ID]);
  } finally {
    sim.dispose();
  }
});
it("every legacy track hides exactly one gold star", () => {
  expect(TRACKS).toHaveLength(8);
  for (const track of TRACKS) {
    expect(track.goldStars, track.id).toHaveLength(1);
    expect(track.goldStars![0].id, track.id).toBe(STAR_ID);
  }
});
