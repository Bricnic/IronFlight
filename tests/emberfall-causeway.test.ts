import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";

const id = "custom:emberfall-causeway";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});

it("drives from the tower through the slime jump to the raptor finish", () => {
  const sim = new Simulation();
  sim.startTrack(id);
  // x, z, target speed, and distance at which to look ahead to the next point.
  const route = [
    [102, -26, 9, 8], [76, -23, 11, 11], [33, -23, 7, 6],
    [29, -1, 12, 9], [29, 53, 16, 8], [29, 130, 25, 7],
    [29, 148, 7, 5], [4, 150, 10, 10], [-84, 150, 7, 8],
    [-89, 177, 11, 9], [-89, 236, 17, 0],
  ];
  let next = 0;
  let clearedSlime = false;
  try {
    for (let i = 0; i < 85 / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      const [targetX, targetZ, , reach] = route[next];
      if (Math.hypot(targetX - p.x, targetZ - p.z) < reach) next++;
      if (Math.abs(p.z - 108) < 1 && Math.abs(p.x - 29) < 11 && p.y > 14)
        clearedSlime = true;
      const [x, z, maxSpeed] = route[next];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const desired = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(desired), Math.cos(desired));
      const { x: vx, z: vz } = sim.body.linvel();
      const speed = Math.hypot(vx, vz);
      const cap = Math.abs(error) > 0.55 ? Math.min(6, maxSpeed) : maxSpeed;
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: speed < cap ? 1 : 0,
        brake: speed > cap + 0.6 ? 0.6 : 0,
      });
    }
    expect(sim.trackRun!.status, `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}`).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(clearedSlime).toBe(true);
  } finally {
    sim.dispose();
  }
});
