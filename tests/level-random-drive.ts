import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack, toTrack } from "../src/custom-level";
import { GENERATOR_CLEARANCE } from "../src/level-random";
import { Simulation } from "../src/simulation";
import type { CustomLevel } from "../src/custom-level";

type Waypoint = { s: number; x: number; z: number; speed: number };

/**
 * Plan the weave route around a generated level's road-blocking traps.
 * Returns the route plus the path frames used to build it.
 */
export function planRoute(level: CustomLevel) {
  const pts = [
    { x: level.spawn.x, z: level.spawn.z },
    ...level.checkpoints.map((c) => ({ x: c.x, z: c.z })),
  ];
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  const frameAt = (s: number) => {
    const clamped = Math.max(0, Math.min(cum[cum.length - 1], s));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < clamped) i++;
    const a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const t = (clamped - cum[i - 1]) / len;
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      nx: -(b.z - a.z) / len,
      nz: (b.x - a.x) / len,
    };
  };
  const stationOf = (x: number, z: number) => {
    let best = { s: 0, lateral: 0, dist: Infinity };
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b.x - a.x, dz = b.z - a.z;
      const lenSq = dx * dx + dz * dz;
      const t = lenSq
        ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lenSq))
        : 0;
      const dist = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
      if (dist < best.dist) {
        const len = Math.sqrt(lenSq) || 1;
        best = {
          s: cum[i - 1] + len * t,
          lateral: ((x - a.x) * -dz + (z - a.z) * dx) / len,
          dist,
        };
      }
    }
    return best;
  };
  // Blocking traps sit on the road; the driven line weaves 15 clear of
  // each. Comic jaws are asymmetric (teeth 10.6 south), so each jaw weaves
  // to its own far side, blended into one smooth line.
  const JAWS = new Set(["book", "teeth", "computer", "donut"]);
  const teethClear = (x: number, z: number, lat: number, s: number) => {
    const tz = z - 10.6;
    const a = frameAt(s - 14), b = frameAt(s + 14);
    const ax = a.x + a.nx * lat, az = a.z + a.nz * lat;
    const bx = b.x + b.nx * lat, bz = b.z + b.nz * lat;
    const dx = bx - ax, dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    const t = lenSq
      ? Math.max(0, Math.min(1, ((x - ax) * dx + (tz - az) * dz) / lenSq))
      : 0;
    return Math.hypot(x - (ax + dx * t), tz - (az + dz * t));
  };
  const blockers = level.prefabs
    .filter(
      (p) =>
        p.kind in GENERATOR_CLEARANCE &&
        p.kind !== "ghost" &&
        stationOf(p.x, p.z).dist < 8,
    )
    .map((p) => ({ p, near: stationOf(p.x, p.z) }))
    .sort((a, b) => a.near.s - b.near.s);
  // Weave sides are chosen globally: adjacent traps share a side so the
  // blend never crosses zero between them; flips only span wide gaps.
  const pulls = (() => {
    const n = blockers.length;
    if (!n) return [] as { s: number; lateral: number }[];
    const teethPen = (i: number, side: number) => {
      const { p, near } = blockers[i];
      if (!JAWS.has(p.kind)) return 0;
      const clear = teethClear(p.x, p.z, near.lateral + side * 15, near.s);
      return clear < 9 ? 100000 + (9 - clear) * 10000 : 0;
    };
    const awayPref = (i: number, side: number) =>
      Math.sign(blockers[i].near.lateral) === side ? 2 : 0;
    const dp: number[][] = [];
    const prev: number[][] = [];
    for (let i = 0; i < n; i++) {
      dp.push([Infinity, Infinity]);
      prev.push([-1, -1]);
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? 1 : -1;
        const own = teethPen(i, side) + awayPref(i, side);
        if (i === 0) {
          dp[i][k] = own;
          continue;
        }
        const gap = blockers[i].near.s - blockers[i - 1].near.s;
        for (let pk = 0; pk < 2; pk++) {
          const flip = pk !== k ? (gap < 28 ? 10000 : 5) : 0;
          const c = dp[i - 1][pk] + flip + own;
          if (c < dp[i][k]) {
            dp[i][k] = c;
            prev[i][k] = pk;
          }
        }
      }
    }
    let k = dp[n - 1][0] <= dp[n - 1][1] ? 0 : 1;
    const sides: number[] = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      sides[i] = k === 0 ? 1 : -1;
      k = prev[i][k];
      if (k < 0 && i > 0) k = 0;
    }
    return blockers.map(({ near }, i) => ({
      s: near.s,
      lateral: near.lateral + sides[i] * 15,
    }));
  })();
  const weaveAt = (s: number) => {
    let num = 0, den = 0.01;
    for (const b of pulls) {
      const d = (s - b.s) / 6;
      const w = 1 / (1 + d * d * d * d);
      num += b.lateral * w;
      den += w;
    }
    return num / den;
  };
  const route: Waypoint[] = [];
  const total = cum[cum.length - 1];
  // Slow through checkpoint corners: entering at pace overshoots 15+ past
  // the turn, straight through any traps waiting on the next leg.
  const corners = cum.slice(1, -1);
  for (let s = 8; s < total; s += 8) {
    const f = frameAt(s);
    const lateral = weaveAt(s);
    const nearCorner = corners.some((c) => Math.abs(s - c) < 25);
    route.push({
      s,
      x: f.x + f.nx * lateral,
      z: f.z + f.nz * lateral,
      speed: nearCorner ? 5 : Math.abs(lateral) > 4 ? 8 : 12,
    });
  }
  {
    const f = frameAt(total);
    route.push({ s: total, x: f.x, z: f.z, speed: 12 });
  }
  return { route, stationOf, blockers, pulls, frameAt, total };
}

/**
 * Drive a generated level's checkpoint line to completion, weaving around
 * traps placed on the road. Returns elapsed sim seconds.
 */
export function driveGeneratedLevelToCompletion(level: CustomLevel): number {
  const track = toTrack(level);
  registerCustomTrack(track);
  const { route, stationOf } = planRoute(level);
  let elapsed = 0;
  const sim = new Simulation();
  try {
    sim.startTrack(track.id);
    let next = 0;
    const limit = track.limit ?? 300;
    const trail: string[] = [];
    // Stuck recovery: a weave that clips a jaw post or flanked solid pins
    // the car nose-in; back up (wiggling on alternate attempts) and retry.
    const STUCK_ITERS = Math.round(3 / DT);
    const REVERSE_ITERS = Math.round(1 / DT);
    let lastS = 0, lastProgress = 0, reversing = 0, recoveries = 0, reverseSteer = 0;
    for (let i = 0; i < limit / DT && sim.trackRun!.status === "running"; i++) {
      if (i % 120 === 0) {
        const t = sim.body.translation();
        trail.push(`${sim.trackRun!.elapsed.toFixed(0)}s:(${t.x.toFixed(0)},${t.z.toFixed(0)})#${next}`);
      }
      const p = sim.body.translation();
      const carS = stationOf(p.x, p.z).s;
      if (carS > lastS + 1) {
        lastS = carS;
        lastProgress = i;
      }
      const v = sim.body.linvel();
      const pace = Math.hypot(v.x, v.z);
      if (reversing > 0) {
        reversing--;
        sim.step({ steer: reverseSteer, throttle: -1, brake: 0 });
        continue;
      }
      if (i - lastProgress > STUCK_ITERS && pace < 1.5) {
        recoveries++;
        reversing = REVERSE_ITERS;
        reverseSteer = recoveries % 2 === 0 ? (recoveries % 4 === 0 ? 1 : -1) : 0;
        lastProgress = i;
        lastS = carS;
        continue;
      }
      // Advance by route progress, never by proximity: dodge points must be
      // driven through in order, so early arrival can't skip a weave.
      if (next < route.length) {
        if (carS > route[next].s - 2) next++;
      }
      const w = route[Math.min(next, route.length - 1)];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const aim = Math.atan2(w.x - p.x, w.z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(aim), Math.cos(aim));
      const cap = Math.abs(error) > 0.58 ? Math.min(6, w.speed) : w.speed;
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: pace < cap ? 1 : 0,
        brake: pace > cap + 0.65 ? 0.65 : 0,
      });
    }
    expect(
      sim.trackRun!.status,
      `${level.name}: waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, checkpoint ${sim.trackRun!.checkpoint}, reason ${sim.trackRun!.reason}, elapsed ${sim.trackRun!.elapsed.toFixed(1)}/${limit}, trail ${trail.join(" ")}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`,
    ).toBe("completed");
    expect(sim.trackRun!.elapsed).toBeLessThan(limit);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
