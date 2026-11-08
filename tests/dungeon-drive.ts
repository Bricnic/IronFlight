import { expect } from "vitest";
import { Simulation } from "../src/simulation";
import {
  DUNGEON_STRIKE,
  SNAP_CYCLE,
  SNAP_STRIKE_START,
  snapStriking,
} from "../src/dungeon-hazards";
import original from "../levels/official/Dungeon.json";
import {
  toTrack,
  validateCustomLevel,
  registerCustomTrack,
} from "../src/custom-level";

/** Reference pace of the default truck; the matrix allows 5% over it. */
export const DUNGEON_REFERENCE_SECONDS = 272;

/** Serpentine route: south bays, maze gaps, undercroft, ramps, deck sweep. */
export const DUNGEON_ROUTE: { x: number; z: number; chest?: number }[] = [
  { x: 60, z: -160, chest: 0 },
  { x: -100, z: -140, chest: 1 },
  { x: 150, z: -80, chest: 2 },
  { x: 150, z: 0, chest: 3 },
  { x: 100, z: 40, chest: 4 },
  { x: 40, z: 5 },
  { x: -100, z: 40, chest: 5 },
  { x: -140, z: 45 },
  { x: -160, z: 80 },
  { x: -150, z: 100, chest: 6 },
  { x: -120, z: 170, chest: 7 },
  { x: 0, z: 185, chest: 8 },
  { x: 60, z: 150, chest: 9 },
  { x: -100, z: 120 },
  { x: -140, z: 105 },
  { x: -170, z: 60 },
  { x: -170, z: 80 },
  { x: -170, z: 100 },
  { x: -170, z: 120 },
  { x: -170, z: 145 },
  { x: -140, z: 160, chest: 10 },
  { x: -60, z: 160, chest: 11 },
  { x: 0, z: 180 },
  { x: 0, z: 190, chest: 12 },
  { x: 80, z: 195, chest: 13 },
  { x: 140, z: 190, chest: 14 },
];

/** Collect all 15 dungeon chests. Returns the run's elapsed sim seconds. */
export function driveDungeonToCompletion(vehicleId?: string): number {
  let elapsed = 0;
  const track = toTrack(validateCustomLevel(original));
  registerCustomTrack(track);
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  try {
    sim.startTrack(track.id);
    let leg = 0,
      blockedFor = 0,
      reverseUntil = -1,
      legSince = 0;
    for (
      let i = 0;
      i < 120 * 300 && sim.trackRun?.status === "running";
      i++
    ) {
      const s = sim.snapshot(false);
      if (process.env.PROOF_TRACE && i % 30 === 0 && leg >= 2 && leg <= 4) {
        let best = "";
        for (const m of sim.dungeon.mechanisms) {
          const strike = DUNGEON_STRIKE[m.h.kind as keyof typeof DUNGEON_STRIKE];
          if (!strike) continue;
          const gap = Math.hypot(m.h.x - s.position.x, m.h.z - s.position.z);
          if (gap > strike.radius + 40) continue;
          const pos = (((s.time + m.h.phase) % SNAP_CYCLE) + SNAP_CYCLE) % SNAP_CYCLE;
          best += ` ${m.h.id}:gap${gap.toFixed(1)}/pos${pos.toFixed(2)}`;
        }
        console.log(`tr t=${s.time.toFixed(1)} leg=${leg} x=${s.position.x.toFixed(1)} z=${s.position.z.toFixed(1)} v=${s.signedSpeed.toFixed(1)}${best}`);
      }
      const wp = DUNGEON_ROUTE[Math.min(leg, DUNGEON_ROUTE.length - 1)];
      const id = `pickup-${(wp.chest ?? 0) + 1}`;
      const reached =
        wp.chest === undefined
          ? Math.hypot(wp.x - s.position.x, wp.z - s.position.z) < 12
          : (s.run?.collected.includes(id) ?? false);
      if (reached && leg < DUNGEON_ROUTE.length - 1) {
        leg++;
        legSince = s.time;
        if (process.env.PROOF_TRACE) console.log(`leg ${leg} t=${s.time.toFixed(1)}`);
      }
      const gate = DUNGEON_ROUTE[leg];
      // Never cut under the deck beside the ramp: re-approach from the base.
      const recovery =
        gate.z > 85 &&
        gate.z < 145 &&
        Math.abs(gate.x) > 150 &&
        s.position.z > 80 &&
        s.position.z < 140 &&
        s.position.y < 4 &&
        (s.position.x < -182 || s.position.x > -158);
      // Drive beyond transit gates like courseDriver: aim past the gate
      // toward the next leg so hairpins carve through instead of orbiting
      // the pin. Chest legs aim at the pickup so collection always triggers.
      const transitGate = gate.chest === undefined;
      let t = recovery ? { x: -170, z: 85 } : gate;
      if (!recovery && transitGate && leg < DUNGEON_ROUTE.length - 1) {
        const nx = DUNGEON_ROUTE[leg + 1];
        const gx = nx.x - gate.x,
          gz = nx.z - gate.z,
          gl = Math.hypot(gx, gz) || 1;
        if (Math.hypot(gate.x - s.position.x, gate.z - s.position.z) < 22)
          t = { x: gate.x + (gx / gl) * 12, z: gate.z + (gz / gl) * 12 };
      }
      const desired = Math.atan2(t.x - s.position.x, t.z - s.position.z),
        heading = Math.atan2(s.forward[0], s.forward[2]);
      const error = Math.atan2(
        Math.sin(desired - heading),
        Math.cos(desired - heading),
      );
      // Lethal traps: timed crossings only. Near any zone the current
      // leg threads, creep to the edge, hold for the open window, dash.
      let hold = 0;
      let cap = 99;
      {
        const from = leg === 0 ? { x: 0, z: -195 } : DUNGEON_ROUTE[leg - 1];
        const sx = gate.x - from.x, sz = gate.z - from.z;
        const segLen2 = sx * sx + sz * sz || 1;
        const ttruck = Math.max(0, Math.min(1, ((s.position.x - from.x) * sx + (s.position.z - from.z) * sz) / segLen2));
        for (const m of sim.dungeon.mechanisms) {
          const strike = DUNGEON_STRIKE[m.h.kind as keyof typeof DUNGEON_STRIKE];
          if (!strike) continue;
          if (Math.abs(s.position.y - ((m.h.y ?? 0) + 1.5)) > 4) continue;
          const tt = Math.max(0, Math.min(1, ((m.h.x - from.x) * sx + (m.h.z - from.z) * sz) / segLen2));
          const near = Math.hypot(m.h.x - (from.x + tt * sx), m.h.z - (from.z + tt * sz));
          if (near > strike.radius + 22) continue;
          const gap = Math.hypot(m.h.x - s.position.x, m.h.z - s.position.z);
          if (gap <= strike.radius || gap > strike.radius + 32) continue;
          if (ttruck > tt + 0.05) continue;
          const pos = ((s.time + m.h.phase) % SNAP_CYCLE + SNAP_CYCLE) % SNAP_CYCLE;
          const strikingNow = snapStriking(s.time + m.h.phase);
          const remaining = strikingNow ? 0 : (SNAP_STRIKE_START - pos + SNAP_CYCLE) % SNAP_CYCLE;
          if (near > strike.radius + 2) {
            cap = Math.min(cap, 10);
            if (gap <= strike.radius + 6 && remaining < 1.5) hold = 3;
            continue;
          }
          cap = Math.min(cap, 4.5);
          const clr = Math.min(near, strike.radius);
          const chord = 2 * Math.sqrt(Math.max(0, strike.radius * strike.radius - clr * clr));
          const needed = (Math.max(0, gap - strike.radius) + chord + 3) / 11 + 0.5;
          if (remaining < needed)
            hold = Math.max(hold, gap <= strike.radius + 4 ? 3 : gap <= strike.radius + 14 ? 4 : 2);
        }
      }
      if (hold === 3) {
        sim.step({ throttle: 0, steer: 0, brake: 1 });
        blockedFor = 0;
        continue;
      }
      if (hold === 2) {
        sim.step({
          throttle: s.signedSpeed < 4 ? 0.4 : 0,
          steer: Math.max(-1, Math.min(1, error * 3)),
          brake: s.signedSpeed > 5 ? 1 : 0,
        });
        blockedFor = 0;
        continue;
      }
      if (hold === 4) {
        sim.step({
          throttle: s.signedSpeed < 2 ? 0.3 : 0,
          steer: Math.max(-1, Math.min(1, error * 3)),
          brake: s.signedSpeed > 2.5 ? 0.8 : 0,
        });
        blockedFor = 0;
        continue;
      }
      // Slow early for sharp turns after chest gates (avoid wide exit arcs).
      let turnCap = 99;
      if (leg + 1 < DUNGEON_ROUTE.length) {
        const pv = leg === 0 ? { x: 0, z: -195 } : DUNGEON_ROUTE[leg - 1];
        const nx = DUNGEON_ROUTE[leg + 1];
        const ax = gate.x - pv.x, az = gate.z - pv.z;
        const bx = nx.x - gate.x, bz = nx.z - gate.z;
        const cos = (ax * bx + az * bz) / (Math.hypot(ax, az) * Math.hypot(bx, bz) || 1);
        if (cos < 0.5 && Math.hypot(gate.x - s.position.x, gate.z - s.position.z) < 45) turnCap = 5;
      }
      if (s.signedSpeed > Math.min(cap, turnCap)) {
        sim.step({
          throttle: 0,
          steer: Math.max(-1, Math.min(1, error * 3)),
          brake: 1,
        });
        blockedFor = 0;
        continue;
      }
      // A human reverses out of dead ends; so does this proof.
      blockedFor = s.speed < 0.6 ? blockedFor + 1 / 120 : 0;
      if (blockedFor > 1.2) {
        reverseUntil = s.time + 1.3;
        blockedFor = 0;
      }
      if (s.time < reverseUntil) {
        sim.step({
          throttle: -0.7,
          steer: Math.max(-1, Math.min(1, -error * 3)),
          brake: 0,
        });
        continue;
      }
      const nearRamp = gate.z > 60 && gate.z < 150 && Math.abs(gate.x) > 150;
      const climb = gate.z > 90 && gate.z < 145 && Math.abs(gate.x) > 160;
      const onDeck = s.position.y > 4;
      // Transit gates need a tight line: a human lifts off near the gate and
      // crawls if a hairpin starts to circle.
      const transit = gate.chest === undefined;
      const distGate = Math.hypot(gate.x - s.position.x, gate.z - s.position.z);
      let speed = climb
        ? 12
        : nearRamp || onDeck
          ? 8
          : Math.abs(error) > 0.6
            ? 6
            : Math.abs(error) > 0.25
              ? 10
              : 15;
      if (transit && distGate < 14) speed = Math.min(speed, 5);
      if (transit && distGate < 30 && s.time - legSince > 8)
        speed = Math.min(speed, 3);
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 3)),
        throttle: s.signedSpeed < speed ? 1 : 0,
        brake: s.signedSpeed > speed + 1 ? 0.35 : 0,
      });
    }
    expect(
      sim.trackRun?.status,
      JSON.stringify({ run: sim.trackRun?.snapshot(), p: sim.body.translation(), leg }),
    ).toBe("completed");
    expect(sim.trackRun?.collected.size).toBe(15);
    expect(sim.snapshot(false).integrity).toBeGreaterThan(0.3);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
