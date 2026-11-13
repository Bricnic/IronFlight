import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:sharkbite-run";
/** Run Sharkbite Run to the platform finish. Returns elapsed sim seconds. */
export function driveSharkbiteRunToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  const route = [
    [170, 0, 16, 6], [140, 0, 16, 6], [115, 0, 15, 5], [100, 0, 15, 8],
    [70, 0, 16, 8], [45, 12, 14, 8], [22, 32, 14, 8], [10, 55, 16, 6],
    [10, 73, 70, 6], [10, 105, 60, 8], [10, 130, 12, 6], [-10, 148, 10, 8],
    [-25, 160, 10, 6], [-45, 160, 10, 6], [-65, 160, 8, 5], [-85, 160, 8, 5],
    [-110, 160, 8, 6], [-140, 160, 8, 6], [-150, 160, 6, 6],
  ];
  let next = 0;
  let boosted = false;
  try {
    sim.startTrack(id);
    for (
      let i = 0;
      i < 240 / DT && sim.trackRun!.status === "running";
      i++
    ) {
      const p = sim.body.translation();
      const v = sim.body.linvel();
      if (Math.hypot(v.x, v.z) > 40) boosted = true;
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
      `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, checkpoint ${sim.trackRun!.checkpoint}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`,
    ).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(5);
    expect(boosted, "shark pool crossed at skimming speed").toBe(true);
    expect(
      sim.damageEvents.filter((e) => e.source === "shark-pool"),
    ).toHaveLength(0);
    expect(sim.body.translation().y).toBeGreaterThan(6);
    expect(sim.trackRun!.elapsed).toBeLessThan(240);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
