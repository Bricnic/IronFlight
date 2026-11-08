import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:jurassic-junction";
/** Drive the Jurassic Junction bends to the raised finish, clearing the slime. Returns the run's elapsed sim seconds. */
export function driveJurassicToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  sim.startTrack(id);
  // Centerline waypoints through the bends. The driver only uses normal controls.
  const route = [
    [-62, 50, 7], [-56, 30, 9], [-56, -37, 7], [-33, -45, 9],
    [61, -45, 8], [67, -57, 10], [67, -112, 25], [67, -126, 7],
    [49, -130, 9], [-19, -130, 7], [-23, -150, 9], [-23, -225, 18],
  ];
  let next = 0;
  let overSlime = false;
  try {
    for (let i = 0; i < 80 / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      const reach = next === 3 ? 10 : next === 5 || next === 8 || next === 10 ? 8 : 5;
      if (next < route.length - 1 && Math.hypot(route[next][0] - p.x, route[next][1] - p.z) < reach)
        next++;
      if (p.z < -89 && p.z > -91 && Math.abs(p.x - 67) < 11 && p.y > 11)
        overSlime = true;
      const [x, z, maxSpeed] = route[next];
      const heading = sim.body.rotation();
      const forwardX = 2 * (heading.x * heading.z + heading.w * heading.y);
      const forwardZ = 1 - 2 * (heading.x ** 2 + heading.y ** 2);
      const desired = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(desired), Math.cos(desired));
      const velocity = sim.body.linvel();
      const speed = Math.hypot(velocity.x, velocity.z);
      const cap = Math.min(maxSpeed, Math.abs(error) > 0.55 ? 6 : Infinity);
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: speed < cap ? 1 : 0,
        brake: speed > cap + 0.6 ? 0.6 : 0,
      });
    }
    expect(sim.trackRun!.status, `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}`).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(overSlime).toBe(true);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
