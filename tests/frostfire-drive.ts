import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:frostfire-pass";

/** [x, z, targetSpeed, reach] waypoints around the sketch's U. */
const route = [
  [-30, -40, 14, 6], [-30, 0, 14, 6], [-30, 28, 8, 5],
  [-30, 40, 5, 4], [-28, 47, 4, 3], [-22, 52, 4, 3], [-12, 54, 7, 4],
  [0, 54, 10, 5], [12, 54, 8, 4], [20, 53, 5, 4], [26, 50, 4, 3],
  [30, 44, 5, 4], [31, 36, 7, 4], [29, 28, 8, 4], [27, 18, 10, 4],
  [26.5, 8, 11, 4], [26.5, -1, 12, 3], [29.2, -8, 12, 3],
  [30, -25, 12, 5], [30, -38, 11, 4],
  [30, -45, 12, 4], [30, -56, 12, 4], [30, -66, 12, 0],
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

/** Drive the U: dashed straight, bottom turn, book dodge, block/coal smash, snowman burst. Returns elapsed sim seconds. */
export function driveFrostfireToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  try {
    sim.startTrack(id);
    const blockStarts = sim.looseBlocks.blocks.map((b) => ({
      ...b.body.translation(),
    }));
    const coalStarts = sim.burningCoals.coals.map((c) => ({
      ...c.body.translation(),
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
    expect(
      sim.damageEvents.some((e) => e.source === "snowman"),
    ).toBe(true);
    const smashed = sim.looseBlocks.blocks.filter((b, i) => {
      const q = b.body.translation();
      return (
        Math.hypot(q.x - blockStarts[i].x, q.z - blockStarts[i].z) > 2
      );
    }).length;
    const scattered = sim.burningCoals.coals.filter((c, i) => {
      const q = c.body.translation();
      return (
        Math.hypot(q.x - coalStarts[i].x, q.z - coalStarts[i].z) > 2 ||
        q.y < coalStarts[i].y - 1
      );
    }).length;
    expect(smashed).toBeGreaterThanOrEqual(3);
    expect(scattered).toBeGreaterThanOrEqual(1);
    console.log(
      "CALIB",
      sim.trackRun!.elapsed.toFixed(1),
      sim.snapshot(false).integrity.toFixed(3),
    );
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
