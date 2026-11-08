import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:booster-gap";
/** Drive the Booster Gap toy track to the red brick, clearing both jumps. Returns the run's elapsed sim seconds. */
export function driveBoosterToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  try {
    sim.startTrack(id);
    const route = [
      [0, -82, 10, 6], [0, -70, 12, 6], [0, -58, 12, 6],
      [0, -48, 10, 5],
      [0, -30, 25, 9],
      [0, -12, 10, 5], [0, 0, 10, 5],
      [0, 15, 14, 6], [0, 30, 60, 6], [0, 50, 30, 6],
      [0, 80, 30, 12],
      [0, 140, 10, 50],
      [2, 155, 9, 5], [4, 170, 8, 5], [8, 185, 8, 5], [12, 200, 8, 5],
      [6, 206, 7, 4], [0, 212, 7, 4], [-3, 220, 8, 4], [-6, 228, 8, 4],
      [-8, 240, 10, 5], [-8, 257, 8, 0],
    ];
    let next = 0;
    let overSlime = false;
    let overGap = false;
    let boosted = false;
    for (
      let i = 0;
      i < 240 / DT && sim.trackRun!.status === "running";
      i++
    ) {
      const p = sim.body.translation();
      if (Math.hypot(0 - p.x, -28.64 - p.z) < 8 && p.y > 31) overSlime = true;
      if (Math.abs(p.x) < 10 && p.z > 72 && p.z < 102 && p.y > 33) overGap = true;
      if (sim.boostTicks > 0) boosted = true;
      const [wx, wz, , reach] = route[next];
      if (Math.hypot(wx - p.x, wz - p.z) < reach) next++;
      const [x, z, speed] = route[next];
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
    expect(overSlime).toBe(true);
    expect(overGap).toBe(true);
    expect(boosted).toBe(true);
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(sim.trackRun!.ringsDone).toContain(0);
    expect(sim.trackRun!.elapsed).toBeLessThan(240);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
