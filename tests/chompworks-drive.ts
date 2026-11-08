import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";
import { LIME_JAW_PERIOD } from "../src/dungeon-hazards";

const id = "custom:chompworks";
const track = officialFileTracks.find((t) => t.id === id)!;
/** Pass both themed checkpoints, time the dinosaur, and finish Chompworks. Returns the run's elapsed sim seconds. */
export function driveChompworksToCompletion(vehicleId?: string): number {
  registerCustomTrack(track);
  let elapsed = 0;
  expect(track.checkpoints.map((gate) => gate.appearance)).toEqual([
    "yellow-jaws", "blue-tile", undefined,
  ]);
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  sim.startTrack(id);
  const route = [
    [0, -38, 12, 7], [-21, -35, 8, 9], [-108, -35, 17, 12],
    [-131, -30, 12, 8], [-145, -16, 11, 8], [-148, 2, 11, 8],
    [-142, 20, 11, 8], [-129, 32, 11, 8], [-111, 35, 10, 9],
    [63, 35, 18, 14], [78, 29, 9, 6], [82, 14, 8, 8],
    [82, -38, 12, 8], [88, -55, 9, 6], [104, -62, 9, 6],
    [119, -56, 9, 6], [126, -40, 9, 7], [126, -12, 9, 5],
    [126, 36, 16, 7], [119, 48, 8, 7], [103, 53, 9, 8],
    [23, 53, 15, 0],
  ];
  let next = 0;
  let passedJaw = false;
  let waitingForJaw = false;
  try {
    expect(sim.fairground.balloons).toHaveLength(5);
    for (let i = 0; i < 105 / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      const velocity = sim.body.linvel();
      const speed = Math.hypot(velocity.x, velocity.z);
      const [wx, wz, , reach] = route[next];
      if (Math.hypot(wx - p.x, wz - p.z) < reach) {
        if (next === 17) waitingForJaw = true;
        else next++;
      }
      if (waitingForJaw) {
        const phase = sim.time % LIME_JAW_PERIOD;
        if (speed > 0.45 || phase < 0.62 || phase > 1.2) {
          sim.step({ brake: 1 });
          continue;
        }
        waitingForJaw = false;
        next++;
      }
      if (Math.abs(p.x - 126) < 6 && Math.abs(p.z - 13) < 1 && p.y > 9)
        passedJaw = true;
      const [x, z, targetSpeed] = route[next];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const desired = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(desired), Math.cos(desired));
      const cap = Math.abs(error) > 0.55 ? Math.min(6, targetSpeed) : targetSpeed;
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: speed < cap ? 1 : 0,
        brake: speed > cap + 0.65 ? 0.65 : 0,
      });
    }
    expect(sim.trackRun!.status, `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}`).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(passedJaw).toBe(true);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
