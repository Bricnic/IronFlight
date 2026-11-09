import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:block-party";

/** [x, z, targetSpeed, reach] waypoints down the photo's road line. */
const route = [
  [0, 60, 14, 6], [0, 30, 14, 6], [0, 8, 12, 5],
  [0, -8, 14, 5], [0, -25, 13, 5], [0, -40, 12, 5],
  [0, -46, 10, 4], [0, -52, 12, 4], [0, -64, 13, 5],
  [3, -80, 10, 4], [3, -88, 9, 4], [-3, -98, 9, 4],
  [-2, -106, 10, 4], [0, -112, 11, 4], [0, -118, 12, 4],
  [0, -127, 12, 0],
];

function driveStep(sim: Simulation, x: number, z: number, targetSpeed: number) {
  const p = sim.body.translation();
  const velocity = sim.body.linvel();
  const speed = Math.hypot(velocity.x, velocity.z);
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

/** Drive the reference line: gate, wyvern pass, tile path, pipes, block smash. Returns elapsed sim seconds. */
export function driveBlockPartyToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  try {
    sim.startTrack(id);
    const start = sim.looseBlocks.blocks.map((b) => ({
      ...b.body.translation(),
    }));
    let next = 0;
    for (
      let i = 0;
      i < 240 / DT && sim.trackRun!.status === "running" && next < route.length;
      i++
    ) {
      const p = sim.body.translation();
      const [wx, wz, , reach] = route[next];
      if (Math.hypot(wx - p.x, wz - p.z) < Math.max(reach, 0.5)) {
        next++;
        continue;
      }
      const [x, z, targetSpeed] = route[next];
      driveStep(sim, x, z, targetSpeed);
    }
    expect(
      sim.trackRun!.status,
      `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`,
    ).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(3);
    const smashed = sim.looseBlocks.blocks.filter((b, i) => {
      const p = b.body.translation();
      return Math.hypot(p.x - start[i].x, p.z - start[i].z) > 2;
    }).length;
    expect(smashed).toBeGreaterThanOrEqual(3);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
