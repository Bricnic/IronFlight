import { Quaternion, Vector3 } from "three";
import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { TEETER } from "../src/dungeon-hazards";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:screwball-run";
/** Driven route as [x, z, speed, reach] waypoints, shared with the coverage test. */
export const SCREWBALL_ROUTE = [
  [0, 445, 14, 8], [0, 420, 18, 8], [0, 400, 20, 8], [0, 380, 20, 8],
  [0, 350, 15, 8], [0, 330, 15, 8], [0, 318, 12, 6], [0, 300, 12, 8],
  [0, 282, 12, 6], [0, 250, 15, 8], [0, 210, 15, 8], [0, 180, 15, 8],
  [0, 140, 15, 8], [0, 100, 15, 8], [0, 60, 15, 8], [0, 40, 15, 10],
];
/** Run Screwball Run to the finish. Returns elapsed sim seconds. */
export function driveScrewballToCompletion(): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  const route = SCREWBALL_ROUTE;
  let next = 0;
  let ebPrev: number | undefined;
  let releaseStreak = 0;
  try {
    sim.startTrack(id);
    const trail: string[] = [];
    for (
      let i = 0;
      i < 240 / DT && sim.trackRun!.status === "running";
      i++
    ) {
      const p = sim.body.translation();
      if (i % 240 === 0)
        trail.push(
          `${sim.trackRun!.elapsed.toFixed(0)}s:(${p.x.toFixed(0)},${p.y.toFixed(0)},${p.z.toFixed(0)})#${next}`,
        );
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
      // Timed crossing: the stepped deck gives no traction while it sweeps,
      // so the truck stops back at z 340+, then releases for a max-drop
      // entry at ~13: it lands past the scoop zone near the pivot, rides
      // out, and launches off the far end onto the road. Release falling
      // off the high peak; the ~4.9 s run-up lands arrival at deep low.
      let hold = false;
      if (next >= 5 && next <= 7 && p.z > 340) {
        const mech = sim.dungeon.mechanisms.find(
          (m) => m.h.kind === "teeter-totter",
        );
        if (mech?.body) {
          const bq = mech.body.rotation();
          const end = new Vector3(0, -TEETER.h / 2, TEETER.d / 2)
            .applyQuaternion(new Quaternion(bq.x, bq.y, bq.z, bq.w));
          const eb = mech.body.translation().y + end.y;
          const rate = ebPrev === undefined ? 0 : (eb - ebPrev) / DT;
          ebPrev = eb;
          releaseStreak =
            eb > 4 && rate < -1 && pace < 3 ? releaseStreak + 1 : 0;
          hold = releaseStreak < 3;
        }
      }
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: hold ? 0 : pace < cap ? 1 : 0,
        brake: hold ? 1 : pace > cap + 0.65 ? 0.65 : 0,
      });
    }
    expect(
      sim.trackRun!.status,
      `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, checkpoint ${sim.trackRun!.checkpoint}, reason ${sim.trackRun!.reason}, elapsed ${sim.trackRun!.elapsed.toFixed(1)}, trail ${trail.join(" ")}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`,
    ).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(4);
    expect(
      sim.damageEvents.some((e) => e.source === "speed-tube"),
      "tube ride",
    ).toBe(true);
    expect(
      sim.props.props.find((p) => p.definition.id === "snowball-1")!.broken,
      "snowball smashed",
    ).toBe(true);
    expect(
      sim.damageEvents.filter((e) => e.source === "mailbox"),
    ).toHaveLength(0);
    expect(sim.trackRun!.elapsed).toBeLessThan(240);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
