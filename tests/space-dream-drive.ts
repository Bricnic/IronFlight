import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:space-dream";
/** Driven route as [x, z, speed, reach] waypoints with a flight segment. */
export const SPACE_DREAM_ROUTE = [
  [0, 60, 14, 8], [-8, 120, 12, 8], [8, 180, 12, 8],
  [0, 250, 14, 8], [0, 330, 14, 8], [55, 380, 10, 9],
  [0, 430, 12, 8], [0, 480, 16, 8], [0, 535, 20, 12],
  [0, 600, 14, 10], [0, 665, 14, 8],
];
/** Fly the crater gap to the tower finish. Returns elapsed sim seconds. */
export function driveSpaceDreamToCompletion(): {
  elapsed: number;
  wingsAt: number | null;
  stars: string[];
} {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  const sim = new Simulation();
  const route = SPACE_DREAM_ROUTE;
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
        // Attitude-aware flight: cruise mid-band over the gap,
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
