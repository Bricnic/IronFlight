import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { SNAP_CYCLE } from "../src/dungeon-hazards";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:toybox-road";
const TOWER = { x: 160, z: 70 };

function cycle(time: number) {
  return ((((time % SNAP_CYCLE) + SNAP_CYCLE) % SNAP_CYCLE) + SNAP_CYCLE) % SNAP_CYCLE;
}

/** Drive Toybox Road: gate exit, timed clips, pole ride, tower smash. Returns elapsed sim seconds. */
export function driveToyboxRoadToCompletion(): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  const route: [number, number, number, number, string?][] = [
    [-120, 56, 8, 5], [-120, 70, 10, 6],
    [-71, 70, 12, 5, "clip-0"], [-44, 70, 20, 5],
    [-20, 70, 12, 5], [-8, 60, 12, 5, "clip-1"],
    [8, 58, 20, 5], [25, 52, 12, 4],
    [40, 58, 12, 5],
    [62, 67, 12, 5, "clip-2"], [76, 70, 20, 5],
    [87, 76, 10, 4], [95, 78, 8, 3],
    [106, 80, 10, 4], [115, 73, 8, 2], [122, 73, 8, 2],
    [128, 73, 8, 2], [140, 73, 10, 4], [150, 68, 14, 6],
    [165, 70, 14, 5], [172, 70, 10, 5],
  ];
  let next = 0;
  let sprinting: { x: number; z: number; tx: number; tz: number } | null = null;
  let towerDist = Infinity;
  let riding = false;
  try {
    sim.startTrack(id);
    for (let i = 0; i < 240 / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      towerDist = Math.min(towerDist, Math.hypot(TOWER.x - p.x, TOWER.z - p.z));
      if (sim.guidedPipe.snapshot()) {
        riding = true;
        sim.step({});
        continue;
      }
      // Ride over: skip the approach lane, head for the tower.
      if (riding && p.x > 135) next = Math.max(next, 18);
      if (next < route.length) {
        const [wx, wz, , reach] = route[next];
        if (Math.hypot(wx - p.x, wz - p.z) < reach) next++;
      }
      const [x, z, speed, , clipId] = sprinting
        ? [sprinting.tx, sprinting.tz, 14, 0, undefined]
        : route[Math.min(next, route.length - 1)];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const aim = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(aim), Math.cos(aim));
      const steer = Math.max(-1, Math.min(1, error * 2.5));
      const v = sim.body.linvel();
      const pace = Math.hypot(v.x, v.z);
      if (next < route.length && clipId && !sprinting && Math.hypot(x - p.x, z - p.z) < 20) {
        // Slow down early, then full-grip creep into alignment while the trap
        // is shut, then commit to the sprint once the hold releases.
        const mech = sim.dungeon.mechanisms.find((m) => m.h.id === clipId)!;
        const t = cycle(sim.time + mech.h.phase);
        const d = Math.hypot(x - p.x, z - p.z);
        if (t >= 2.6 && t < 2.8 && d <= 11 && Math.abs(error) < 0.5) {
          const exit = route[Math.min(next + 1, route.length - 1)];
          sprinting = { x, z, tx: exit[0], tz: exit[1] };
        } else if (pace > 6 || d <= 8) sim.step({ brake: 1, steer });
        else sim.step({ throttle: 0.18, steer });
        if (!sprinting) continue;
      }
      if (sprinting && Math.hypot(sprinting.x - p.x, sprinting.z - p.z) > 12)
        sprinting = null;
      const cap = sprinting
        ? 14
        : Math.abs(error) > 0.58 ? Math.min(6, speed) : speed;
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
    expect(sim.trackRun!.checkpoint).toBe(4);
    expect(riding).toBe(true);
    expect(sim.guidedPipe.knocked?.id).toBe("flagpole-ride");
    expect(towerDist, "tower smash distance").toBeLessThan(3);
    expect(sim.trackRun!.elapsed).toBeLessThan(240);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
