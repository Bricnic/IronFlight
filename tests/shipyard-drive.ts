import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:shipyard";
/** Driven route as [x, z, speed, reach] waypoints, shared with the coverage test. */
export const SHIPYARD_ROUTE = [
  [-20, 170, 14, 8], [-40, 148, 14, 8], [-55, 130, 10, 8],
  [-30, 116, 14, 8], [0, 100, 15, 8], [25, 86, 15, 8],
  [45, 75, 10, 8], [65, 66, 16, 8], [85, 54, 18, 8],
  [95, 48, 22, 6], [104, 44, 28, 8], [160, 40, 14, 10],
  [200, 40, 14, 10], [230, 38, 14, 10],
];
/** Run Shipyard to the ferry-deck finish. Returns elapsed sim seconds. */
export function driveShipyardToCompletion(): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  const route = SHIPYARD_ROUTE;
  let next = 0;
  let jumped = false;
  let sailed = false;
  try {
    sim.startTrack(id);
    const trail: string[] = [];
    for (
      let i = 0;
      i < 240 / DT && sim.trackRun!.status === "running";
      i++
    ) {
      const p = sim.body.translation();
      if (i % 240 === 0) {
        const ferry = sim.dungeon.mechanisms.find((m) => m.h.id === "ferry");
        trail.push(
          `${sim.trackRun!.elapsed.toFixed(0)}s:(${p.x.toFixed(0)},${p.y.toFixed(0)},${p.z.toFixed(0)})#${next}sa${(ferry?.ship?.sailed ?? -1).toFixed(0)}`,
        );
      }
      if (p.x > 108 && p.x < 135 && p.y > 5.5) jumped = true;
      const ship = sim.dungeon.mechanisms.find((m) => m.h.id === "ferry");
      if (ship?.ship?.departedAt !== undefined) sailed = true;
      // Ride the ferry out: sit tight past the lip until she anchors, or the
      // finish gate (at her final berth) sails out from under the bow. Never
      // U-turn on deck afterward: the cargo rows wedge turning trucks.
      const arrived = (ship?.ship?.sailed ?? 0) >= 68;
      if (
        sim.trackRun!.checkpoint === 3 && p.x > 115 && p.y > 2.5 && !arrived
      ) {
        sim.step({ steer: 0, throttle: 0, brake: 1 });
        continue;
      }
      if (arrived && next < 12) next = 12;
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
      `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, checkpoint ${sim.trackRun!.checkpoint}, reason ${sim.trackRun!.reason}, elapsed ${sim.trackRun!.elapsed.toFixed(1)}, trail ${trail.join(" ")}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`,
    ).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(4);
    expect(jumped, "ramp jump over the channel").toBe(true);
    expect(sailed, "ferry departed on gate 3").toBe(true);
    expect(
      sim.damageEvents.filter(
        (e) => e.source === "pelican" || e.source === "anchor",
      ),
    ).toHaveLength(0);
    expect(sim.trackRun!.elapsed).toBeLessThan(240);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
