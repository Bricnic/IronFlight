import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:rock-and-roll";
/** Run Rock and Roll to the gray-straight finish. Returns elapsed sim seconds. */
export function driveRockAndRollToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  const route = [
    [-120, 100, 14, 6], [-100, 100, 15, 8], [-70, 100, 15, 8],
    [-50, 100, 15, 6], [-36, 100, 15, 6], [-4, 100, 16, 8],
    [10, 100, 14, 6], [30, 100, 12, 6], [50, 100, 14, 8],
    [80, 108, 14, 8], [110, 122, 14, 8], [120, 120, 10, 8],
    [130, 95, 5, 6], [130, 72, 5, 6],
    [130, 50, 5, 6], [130, 30, 14, 8], [115, 15, 12, 8],
    [100, 0, 12, 6], [60, 0, 16, 8], [0, 0, 16, 8],
    [-70, 0, 16, 8], [-140, 0, 14, 6],
  ];
  let next = 0;
  let jumped = false;
  let rocked = false;
  try {
    sim.startTrack(id);
    for (
      let i = 0;
      i < 240 / DT && sim.trackRun!.status === "running";
      i++
    ) {
      const p = sim.body.translation();
      if (p.x > -45 && p.x < -5 && p.y > 3.5) jumped = true;
      const rocker = sim.dungeon.mechanisms.find((m) => m.h.id === "seesaw");
      if (rocker && (rocker.tilt ?? 0) > 0) rocked = true;
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
      `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, checkpoint ${sim.trackRun!.checkpoint}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`,
    ).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(5);
    expect(jumped, "kicker jump over the coals").toBe(true);
    expect(rocked, "seesaw tipped exit-down").toBe(true);
    expect(
      sim.damageEvents.filter(
        (e) => e.source === "boulder" || e.source === "burning-coals",
      ),
    ).toHaveLength(0);
    expect(sim.trackRun!.elapsed).toBeLessThan(240);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
