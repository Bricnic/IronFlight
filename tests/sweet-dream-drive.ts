import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

/** Player-input-only flight from the wings pickup to the cake's cherry. */
export function flySweetDreamToCherry() {
  registerCustomTrack(officialFileTracks.find(t => t.id === id)!);
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    const star = sim.courseTrack!.goldStars![0];
    expect(star.x).toBeCloseTo(-100, 0);
    expect(star.y).toBeGreaterThan(40);
    let flaps = 0, held = false, maxY = 0, maxZ = -Infinity;
    const trail: string[] = [];
    for (let frame = 0; frame < 120 / DT && !sim.trackRun!.stars.size; frame++) {
      const p = sim.body.translation(), v = sim.body.linvel(), q = sim.body.rotation();
      maxY = Math.max(maxY, p.y);
      maxZ = Math.max(maxZ, p.z);
      if (frame % 300 === 0) trail.push(`${(frame * DT).toFixed(0)}s:${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}`);
      const equipped = !!sim.trackRun!.wings;
      const target = equipped ? star : { x: 4, y: 2, z: 180 };
      const distance = Math.hypot(target.x - p.x, target.z - p.z);
      const yaw = Math.atan2(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y));
      const aim = Math.atan2(target.x - p.x, target.z - p.z) - yaw;
      const error = Math.atan2(Math.sin(aim), Math.cos(aim));
      const flap: boolean = equipped && !held && p.y < star.y + 2 && v.y < Math.min(5, (star.y + 1 - p.y) * 0.8);
      if (flap) flaps++;
      held = flap;
      const pace = Math.hypot(v.x, v.z);
      const speed = equipped ? Math.max(2, Math.min(12, distance * 0.35)) : 12;
      const forwardY = 2 * (q.y * q.z - q.w * q.x);
      const pitch = Math.asin(Math.max(-1, Math.min(1, forwardY)));
      sim.step({
        throttle: pace < speed ? 1 : 0,
        brake: !equipped && pace > speed + 1 ? 0.5 : 0,
        steer: Math.max(-1, Math.min(1, error * 1.5)),
        airPitch: sim.flying ? Math.max(-1, Math.min(1, -pitch * 2)) : 0,
        handbrake: Number(flap),
      });
      if (sim.status !== "driving") break;
    }
    expect(sim.trackRun!.stars.size, `flaps ${flaps}, maxY ${maxY}, trail ${trail.join(" | ")}, end ${JSON.stringify(sim.body.translation())}`).toBe(1);
    const ramp = sim.courseTrack!.custom!.solids.find(s => s.kind === "ramp")!;
    expect(maxZ).toBeLessThan(ramp.z - ramp.d / 2);
    return { stars: [...sim.trackRun!.stars], flaps, position: { ...sim.body.translation() } };
  } finally { sim.dispose(); }
}

const id = "custom:sweet-celebrations-dream";
/** Driven route as [x, z, speed, reach] waypoints with a flight segment. */
export const SWEET_DREAM_ROUTE = [
  [0, 60, 14, 8], [-8, 120, 12, 8], [8, 180, 12, 8],
  [0, 250, 14, 8], [0, 330, 14, 8], [55, 380, 10, 9],
  [0, 430, 12, 8], [0, 480, 16, 8], [0, 535, 20, 12],
  [0, 600, 14, 10], [0, 665, 14, 8],
];
/** Fly the chocolate gap to the cherry-hill finish. Returns elapsed sim seconds. */
export function driveSweetDreamToCompletion(): {
  elapsed: number;
  wingsAt: number | null;
  stars: string[];
} {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  const sim = new Simulation();
  const route = SWEET_DREAM_ROUTE;
  let next = 0;
  let out = { elapsed: 0, wingsAt: null as number | null, stars: [] as string[] };
  try {
    sim.startTrack(id);
    const trail: string[] = [];
    for (
      let i = 0;
      i < 240 / DT && sim.trackRun!.status === "running";
      i++
    ) {
      const p = sim.body.translation();
      if (i % 300 === 0)
        trail.push(
          `${sim.trackRun!.elapsed.toFixed(0)}s:(${p.x.toFixed(0)},${p.y.toFixed(0)},${p.z.toFixed(0)})#${next}`,
        );
      if (next < route.length) {
        const [wx, wz, , reach] = route[next];
        if (Math.hypot(wx - p.x, wz - p.z) < reach) next++;
      }
      const [x, z, speed] = route[Math.min(next, route.length - 1)];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const aim =
        Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(aim), Math.cos(aim));
      const v = sim.body.linvel();
      const pace = Math.hypot(v.x, v.z);
      if (sim.flying) {
        // Attitude-aware flight: cruise mid-band over the chocolate,
        // then dive early to land before the post-gap gate.
        const targetY = p.z < 545 ? 11 : 3;
        const forwardY = 2 * (q.y * q.z - q.w * q.x);
        const pitch = Math.asin(Math.max(-1, Math.min(1, forwardY)));
        const want = Math.max(-0.7, Math.min(0.45, (targetY - p.y) * 0.06));
        sim.step({
          throttle: pace < speed ? 1 : 0.2,
          steer: 0,
          airYaw: Math.max(-1, Math.min(1, error * 2)),
          airPitch: Math.max(-1, Math.min(1, (want - pitch) * 2.5)),
        });
        continue;
      }
      const cap = Math.abs(error) > 0.58 ? Math.min(6, speed) : speed;
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: pace < cap ? 1 : 0,
        brake: pace > cap + 0.65 ? 0.65 : 0,
      });
    }
    expect(
      sim.trackRun!.status,
      `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, checkpoint ${sim.trackRun!.checkpoint}, reason ${sim.trackRun!.reason}, elapsed ${sim.trackRun!.elapsed.toFixed(1)}, trail ${trail.join(" ")}`,
    ).toBe("completed");
    out = {
      elapsed: sim.trackRun!.elapsed,
      wingsAt: sim.trackRun!.wingsAt,
      stars: [...sim.trackRun!.stars],
    };
  } finally {
    sim.dispose();
  }
  return out;
}
