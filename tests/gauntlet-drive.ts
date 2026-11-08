import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";
import { VOLCANO_PERIOD } from "../src/gauntlet-timing";

const id = "custom:machine-gauntlet";
function race(vehicleId?: string) {
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  sim.startTrack(id);
  return sim;
}

/** Drive past the gauntlet machines, jump the crater, and curve around the slime. Returns the run's elapsed sim seconds. */
export function driveGauntletToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = race(vehicleId);
  const volcano = sim.dungeon.gauntlet.machines.get("volcano")!.h;
  const route = [
    [0, -132, 10, 5], [24.5, -99, 9, 6], [24.5, -47, 14, 7],
    [0, -11, 12, 7], [0, 95, 25, 9], [0, 117, 18, 7],
    [-17, 150, 17, 8], [-16, 176, 18, 8], [4, 208, 16, 7],
    [0, 233, 12, 8], [-3, 251, 11, 7], [-17, 268, 11, 7],
    [-34, 282, 11, 7], [-44, 302, 12, 8], [-46, 345, 18, 0],
  ];
  let next = 0;
  let waiting = false;
  let jumped = false;
  try {
    for (let i = 0; i < 85 / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      const velocity = sim.body.linvel();
      const speed = Math.hypot(velocity.x, velocity.z);
      const [wx, wz, , reach] = route[next];
      if (Math.hypot(wx - p.x, wz - p.z) < reach) {
        if (next === 3) waiting = true;
        else next++;
      }
      if (waiting) {
        const phase = (sim.time + volcano.phase) % VOLCANO_PERIOD;
        if (speed > 0.55 || phase < 3.1 || phase > 3.35) {
          sim.step({ brake: 1 });
          continue;
        }
        waiting = false;
        next++;
      }
      if (Math.abs(p.z - volcano.z) < 1 && Math.abs(p.x - volcano.x) < 6 && p.y > 19)
        jumped = true;
      const [x, z, targetSpeed] = route[next];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const aim = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(aim), Math.cos(aim));
      const cap = Math.abs(error) > 0.58 ? Math.min(7, targetSpeed) : targetSpeed;
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: speed < cap ? 1 : 0,
        brake: speed > cap + 0.65 ? 0.65 : 0,
      });
    }
    expect(sim.trackRun!.status, `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(jumped).toBe(true);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
