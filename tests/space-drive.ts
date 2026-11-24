import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

/** Driven routes as [x, z, speed, reach] waypoints per space level. */
export const SPACE_ROUTES: Record<string, number[][]> = {
  "custom:airlock-approach": [
    [0, 60, 14, 8], [12, 100, 8, 3], [0, 150, 10, 8],
    [-19, 184, 10, 8], [-40, 190, 10, 8], [-100, 190, 14, 8],
    [-160, 190, 14, 8], [-180, 190, 10, 8], [-195, 190, 8, 6],
  ],
  "custom:station-ring": [
    [110, 110, 12, 8], [92, 106, 8, 6], [88, 100, 8, 3], [65, 127, 12, 8], [27, 165, 10, 8],
    [-27, 165, 10, 8], [-65, 127, 10, 8], [-65, 73, 10, 8],
    [-27, 35, 10, 8], [27, 35, 10, 8], [65, 73, 10, 8],
  ],
  "custom:solar-array": [
    [0, 60, 14, 8], [20, 150, 10, 8], [60, 160, 12, 8],
    [100, 172, 8, 3], [120, 160, 12, 8], [168, 172, 10, 8],
    [180, 200, 8, 8], [180, 260, 14, 8], [180, 330, 14, 8],
  ],
  "custom:reactor-core": [
    [-30, 40, 14, 8], [-30, 120, 14, 8], [-24, 175, 10, 8],
    [-21, 211, 8, 6], [0, 220, 8, 3], [21, 211, 8, 6],
    [30, 190, 10, 8], [30, 120, 14, 8], [30, 60, 14, 8], [30, 25, 10, 8],
  ],
  "custom:docking-bay": [
    [0, 30, 14, 8], [0, 100, 14, 8], [-12, 170, 8, 3],
    [0, 230, 12, 8], [-25, 275, 10, 8], [-70, 300, 10, 8],
    [-140, 300, 14, 8], [-200, 300, 14, 8], [-215, 300, 10, 8],
  ],
  "custom:crater-field": [
    [0, 50, 14, 8], [0, 130, 14, 8], [-18, 242, 10, 8],
    [-60, 260, 10, 8], [-140, 260, 10, 3], [-180, 260, 14, 8],
    [-225, 260, 10, 8],
  ],
  "custom:meteor-storm": [
    [0, 50, 14, 8], [0, 130, 12, 8], [15, 175, 10, 8],
    [80, 190, 12, 8], [100, 202, 8, 3], [140, 190, 12, 8],
    [185, 215, 10, 8], [200, 270, 12, 8], [200, 360, 14, 8],
    [200, 445, 14, 8],
  ],
};

/** Drive one space level to completion. Returns elapsed sim seconds. */
export function driveSpaceLevelToCompletion(id: `custom:${string}`): {
  elapsed: number;
  stars: string[];
} {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  const sim = new Simulation();
  const route = SPACE_ROUTES[id];
  let next = 0;
  const out = { elapsed: 0, stars: [] as string[] };
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
  out.elapsed = sim.trackRun!.elapsed;
  out.stars = [...sim.trackRun!.stars];
  return out;
}
