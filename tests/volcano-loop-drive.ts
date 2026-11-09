import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:volcano-loop";
/** Run the Volcano Loop gates in the watermelon car, boosting the lava gap. Returns elapsed sim seconds. */
export function driveVolcanoLoopToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  const route = [
    [100, -60, 14, 8], [100, 0, 14, 8], [100, 30, 12, 7],
    [90, 75, 10, 8], [60, 100, 10, 7], [30, 100, 9, 6],
    [-10, 100, 12, 8], [-60, 100, 12, 8], [-90, 80, 10, 8],
    [-100, 40, 12, 7], [-100, 10, 10, 6], [-100, -30, 12, 8],
    [-100, -70, 10, 6], [-97, -95, 9, 7], [-84, -100, 30, 5],
    [-40, -100, 16, 10], [-30, -100, 10, 6],
  ];
  let next = 0;
  let boosted = false;
  let gapMinY = Infinity;
  try {
    sim.startTrack(id);
    for (
      let i = 0;
      i < 240 / DT && sim.trackRun!.status === "running";
      i++
    ) {
      const p = sim.body.translation();
      if (sim.boostTicks > 0) boosted = true;
      if (p.x > -70 && p.x < -54 && Math.abs(p.z + 100) < 12)
        gapMinY = Math.min(gapMinY, p.y);
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
      `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`,
    ).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(5);
    expect(boosted).toBe(true);
    expect(gapMinY, "lava gap crossing height").toBeGreaterThan(-2);
    expect(sim.trackRun!.elapsed).toBeLessThan(240);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
