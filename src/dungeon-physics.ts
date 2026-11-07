import R from "@dimforge/rapier3d-compat";
import { DT } from "./clock";
import { Quaternion, Vector3 } from "three";
import type { Simulation } from "./simulation";
import {
  dungeonHazards,
  snapStriking,
  SNAP_CYCLE,
  DUNGEON_STRIKE,
  CAGE,
  CLIPPER_BACK,
  type DungeonHazard,
} from "./dungeon-hazards";
type Mechanism = {
  h: DungeonHazard;
  colliders: R.Collider[];
  contacts: number;
  lastCycle: number;
};
export class DungeonPhysics {
  mechanisms: Mechanism[] = [];
  constructor(private sim: Simulation) {
    if (!sim.courseTrack) return;
    for (const h of dungeonHazards(sim.courseTrack)) this.addHazard(h);
  }
  /** Live placement: add one hazard without resetting the run. */
  addHazard(h: DungeonHazard) {
    const world = this.sim.world;
    const m: Mechanism = {
      h: { ...h },
      colliders: [],
      contacts: 0,
      lastCycle: -1,
    };
    this.mechanisms.push(m);
    const yawQuat = () =>
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), h.yaw ?? 0);
    const solid = (
      w: number,
      hgt: number,
      d: number,
      lx: number,
      lz: number,
    ) => {
      // Local furniture offset rotated by yaw, matching root.rotation.y.
      const yaw = h.yaw ?? 0;
      const c = world.createCollider(
        R.ColliderDesc.cuboid(w / 2, hgt / 2, d / 2)
          .setTranslation(
            h.x + lx * Math.cos(yaw) + lz * Math.sin(yaw),
            (h.y ?? 0) + hgt / 2,
            h.z - lx * Math.sin(yaw) + lz * Math.cos(yaw),
          )
          .setRotation(yawQuat())
          .setFriction(0.8),
      );
      m.colliders.push(c);
    };
    if (h.kind === "cage") {
      solid(CAGE.w, CAGE.h, CAGE.d, 0, 0);
    } else if (h.kind === "clippers") {
      solid(CLIPPER_BACK.w, CLIPPER_BACK.h, CLIPPER_BACK.d, 0, CLIPPER_BACK.z);
    }
  }
  /** Live editing: shift one hazard and its furniture by delta. */
  moveHazard(id: string, x: number, y: number, z: number) {
    const m = this.mechanisms.find((mm) => mm.h.id === id);
    if (!m) return;
    const dx = x - m.h.x;
    const dy = y - (m.h.y ?? 0);
    const dz = z - m.h.z;
    m.h.x = x;
    m.h.y = y;
    m.h.z = z;
    for (const c of m.colliders) {
      const p = c.translation();
      c.setTranslation({ x: p.x + dx, y: p.y + dy, z: p.z + dz });
    }
  }
  /** Live editing: drop one hazard and its colliders. */
  removeHazard(id: string) {
    const at = this.mechanisms.findIndex((mm) => mm.h.id === id);
    if (at < 0) return;
    const [m] = this.mechanisms.splice(at, 1);
    for (const c of m.colliders) this.sim.world.removeCollider(c, true);
  }
  after() {
    const s = this.sim,
      p = s.body.translation();
    for (const m of this.mechanisms) {
      const h = m.h;
      const strike =
        DUNGEON_STRIKE[h.kind as keyof typeof DUNGEON_STRIKE];
      if (!strike) continue;
      const shifted = s.time + h.phase;
      const cycle = Math.floor(shifted / SNAP_CYCLE);
      if (!snapStriking(shifted) || cycle === m.lastCycle) continue;
      const dx = p.x - h.x,
        dz = p.z - h.z;
      if (dx * dx + dz * dz > strike.radius * strike.radius) continue;
      // Same-story only: deck traps ignore the undercroft and vice versa.
      if (Math.abs(p.y - ((h.y ?? 0) + 1.5)) > 4) continue;
      m.lastCycle = cycle;
      m.contacts++;
      // Instantly lethal, like the chomp books: one shut trap wrecks the truck.
      s.damage("chassis-front", 10000);
      if (strike.slam > 0)
        s.body.applyImpulse(
          { x: 0, y: -s.body.mass() * strike.slam, z: 0 },
          true,
        );
      s.damageEvents.push({
        source: h.kind,
        part: "chassis-front",
        time: s.time,
      });
    }
    // Lit candles always burn: catching fire like a mild oil barrel.
    let candleExposure = 0;
    for (const m of this.mechanisms) {
      if (m.h.kind !== "candle") continue;
      if (Math.abs(p.y - ((m.h.y ?? 0) + 1)) > 3) continue;
      const cdx = p.x - m.h.x,
        cdz = p.z - m.h.z;
      if (cdx * cdx + cdz * cdz < 9) candleExposure++;
    }
    if (candleExposure > 0) {
      s.inFlames = true;
      for (const part of s.partDefs)
        s.fireDamage(part.id, part.hp * 0.01 * DT * candleExposure);
    }
  }
  snapshot() {
    return {
      hazards: this.mechanisms.map((m) => ({
        id: m.h.id,
        kind: m.h.kind,
        x: m.h.x,
        z: m.h.z,
        colliders: m.colliders.length,
        contacts: m.contacts,
        striking: snapStriking(this.sim.time + m.h.phase),
      })),
    };
  }
}
