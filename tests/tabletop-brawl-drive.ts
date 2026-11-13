import { expect } from "vitest";
import { readFileSync } from "node:fs";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:tabletop-brawl";
/** Loop the Tabletop Brawl arena and gather every ring. Returns elapsed sim seconds. */
export function driveTabletopBrawlToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  const level = JSON.parse(
    readFileSync("levels/official/Tabletop Brawl.json", "utf8"),
  ) as { collectibles: { x: number; z: number }[] };
  const route = level.collectibles.map(({ x, z }) => [x, z, 14, 5]);
  let elapsed = 0;
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  try {
    sim.startTrack(id);
    let next = 0;
    for (
      let i = 0;
      i < 240 / DT && sim.trackRun!.status === "running";
      i++
    ) {
      elapsed = sim.time;
      const p = sim.body.translation();
      if (next < route.length) {
        const [wx, wz, , reach] = route[next];
        if (Math.hypot(wx - p.x, wz - p.z) < reach) next++;
      }
      const target = route[Math.min(next, route.length - 1)];
      const [x, z, speed] = target;
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
      `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, collected ${sim.trackRun!.collected.size}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`,
    ).toBe("completed");
    return elapsed;
  } finally {
    sim.dispose();
  }
}
