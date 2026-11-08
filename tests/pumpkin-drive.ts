import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:pumpkin-pass";
/** Drive the Pumpkin Pass toy track to the finish, clearing the slime. Returns the run's elapsed sim seconds. */
export function drivePumpkinToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  try {
    sim.startTrack(id);
    const route = [
      [0, -78, 10, 6], [0, -60, 14, 8], [0, -40, 14, 8], [0, -20, 12, 6],
      [3, -11, 10, 5], [8, 0, 10, 5], [13, 10, 10, 5], [17, 19, 9, 5],
      [22, 28, 9, 5], [27, 38, 9, 5], [33, 48, 25, 6],
      [52, 79, 25, 9],
      [60, 90, 9, 5], [63, 97, 8, 4], [65, 105, 8, 5],
      [67, 113, 8, 5], [70, 121, 8, 5],
      [72, 130, 12, 6], [72, 142, 12, 6], [72, 158, 10, 0],
    ];
    let next = 0;
    let overSlime = false;
    for (
      let i = 0;
      i < 240 / DT && sim.trackRun!.status === "running";
      i++
    ) {
      const p = sim.body.translation();
      if (Math.hypot(50.48 - p.x, 75.79 - p.z) < 9 && p.y > 31)
        overSlime = true;
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
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(sim.trackRun!.ringsDone).toContain(0);
    expect(sim.trackRun!.elapsed).toBeLessThan(240);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
