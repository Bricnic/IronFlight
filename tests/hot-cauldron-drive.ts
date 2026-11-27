import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";
import ROUTES from "./hot-cauldron-routes.json";

type Route = { route: number[][]; flyFrom?: number };
const IDS = [
  "custom:figure-eight-inferno",
  "custom:double-serpent",
  "custom:spiral-ascent",
  "custom:caldera-rim",
  "custom:ember-falls",
] as const;

function drive(
  id: string,
  route: number[][],
  flyFrom?: number,
): { elapsed: number; stars: string[]; wingsAt: number | null } {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  // Deterministic part-shedding: jump damage must not flip later jumps.
  const random = Math.random;
  let seed = 20260801;
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const sim = new Simulation();
  let next = 0;
  // The canyon leg is the longest route leg (approach end -> landing start).
  let gapLeg = 0;
  let gapLen = -1;
  for (let i = 0; i < route.length - 1; i++) {
    const d = Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]);
    if (d > gapLen) {
      gapLen = d;
      gapLeg = i;
    }
  }
  const out = { elapsed: 0, stars: [] as string[], wingsAt: null as number | null };
  try {
    sim.startTrack(id as `custom:${string}`);
    const trail: string[] = [];
    for (let i = 0; i < 240 / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      if (i % 300 === 0)
        trail.push(
          `${sim.trackRun!.elapsed.toFixed(0)}s:(${p.x.toFixed(0)},${p.y.toFixed(0)},${p.z.toFixed(0)})#${next}`,
        );
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      if (next < route.length) {
        const [wx, wz, , reach] = route[next];
        const dx = wx - p.x;
        const dz = wz - p.z;
        const ahead = dx * forwardX + dz * forwardZ;
        // Advance on arrival or when the waypoint falls behind: tight
        // curls otherwise trap pursuit in an orbit.
        if (Math.hypot(dx, dz) < reach || (ahead < -3 && Math.hypot(dx, dz) < 25)) next++;
      }
      const [x, z, speed] = route[Math.min(next, route.length - 1)];
      const aim = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(aim), Math.cos(aim));
      const v = sim.body.linvel();
      const pace = Math.hypot(v.x, v.z);
      if (flyFrom !== undefined && sim.flying && next >= flyFrom - 1) {
        // Canyon flight: cruise past the star, dive onto the landing road.
        // Progress = projection onto the gap leg, like the space dream's
        // positional dive (a route-end dive would fly over the landing).
        const [ax, az] = route[gapLeg];
        const [bx, bz] = route[gapLeg + 1];
        const abx = bx - ax;
        const abz = bz - az;
        const t = ((p.x - ax) * abx + (p.z - az) * abz) / (abx * abx + abz * abz);
        // Dive only past the star (t is on the F1->star leg): earlier dives
        // fly under it.
        const targetY = t > 0.85 ? 2.5 : 8.5;
        const forwardY = 2 * (q.y * q.z - q.w * q.x);
        const pitch = Math.asin(Math.max(-1, Math.min(1, forwardY)));
        const want = Math.max(-0.7, Math.min(0.45, (targetY - p.y) * 0.06));
        sim.step({
          throttle: pace < speed ? 1 : 0.2,
          steer: 0,
          airYaw: Math.max(-1, Math.min(1, error * 2)),
          airPitch: Math.max(-1, Math.min(1, (want - pitch) * 2.5)),
        });
        continue;
      }
      const cap = Math.abs(error) > 0.58 ? Math.min(6, speed) : speed;
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: pace < cap ? 1 : 0,
        brake: pace > cap + 0.65 ? 0.65 : 0,
      });
    }
    expect(
      sim.trackRun!.status,
      `${id} waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, checkpoint ${sim.trackRun!.checkpoint}, reason ${sim.trackRun!.reason}, elapsed ${sim.trackRun!.elapsed.toFixed(1)}, damage ${JSON.stringify((sim.damageEvents ?? []).slice(-6))}, trail ${trail.join(" ")}`,
    ).toBe("completed");
    out.elapsed = sim.trackRun!.elapsed;
    out.stars = [...sim.trackRun!.stars];
    out.wingsAt = sim.trackRun!.wingsAt;
    return out;
  } finally {
    Math.random = random;
    sim.dispose();
  }
}

/** Drive one Hot Cauldron race level to completion. */
export function driveHotCauldronLevelToCompletion(id: (typeof IDS)[number]) {
  const entry = (ROUTES as Record<string, Route>)[id];
  return drive(id, entry.route);
}

/** Fly the nightmare canyon to the far finish. */
export function driveHotCauldronDreamToCompletion() {
  const id = "custom:hot-cauldron-dream";
  const entry = (ROUTES as Record<string, Route>)[id];
  return drive(id, entry.route, entry.flyFrom);
}
