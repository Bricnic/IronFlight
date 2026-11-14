import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack, toTrack } from "../src/custom-level";
import { Simulation } from "../src/simulation";
import type { CustomLevel } from "../src/custom-level";

/** Drive a generated level's checkpoint line to completion. Returns elapsed sim seconds. */
export function driveGeneratedLevelToCompletion(level: CustomLevel): number {
  const track = toTrack(level);
  registerCustomTrack(track);
  const pts = [
    { x: level.spawn.x, z: level.spawn.z },
    ...level.checkpoints.map((c) => ({ x: c.x, z: c.z })),
  ];
  const route: [number, number, number, number][] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    route.push([(a.x + b.x) / 2, (a.z + b.z) / 2, 12, 8]);
    route.push([b.x, b.z, 12, 8]);
  }
  let elapsed = 0;
  const sim = new Simulation();
  try {
    sim.startTrack(track.id);
    let next = 0;
    const limit = track.limit ?? 300;
    for (let i = 0; i < limit / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      if (next < route.length) {
        const [wx, wz, , reach] = route[next];
        if (Math.hypot(wx - p.x, wz - p.z) < reach) next++;
      }
      const [x, z, speed] = route[Math.min(next, route.length - 1)];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const aim = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
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
      `${level.name}: waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, checkpoint ${sim.trackRun!.checkpoint}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`,
    ).toBe("completed");
    expect(sim.trackRun!.elapsed).toBeLessThan(limit);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
