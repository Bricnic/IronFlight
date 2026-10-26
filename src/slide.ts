import RAPIER from "@dimforge/rapier3d-compat";
import { Quaternion, Vector3 } from "three";
import { DT } from "./clock";
import { slideProfileY, type Track } from "./tracks";
import type { Simulation } from "./simulation";
export const SLIDE_FLOW_ACCEL = 8;
export const SLIDE_DRAG = 0.5;
export const STRAFE_ACCEL = 12;
export const BOUNCE_SPEED = 30;
export type FlowBox = {
  x: number;
  z: number;
  yaw: number;
  w: number;
  len: number;
  dirx: number;
  dirz: number;
};
export type TrampDef = { x: number; y: number; z: number };
export type SlideDef = { flows: FlowBox[]; trampolines: TrampDef[] };
export function slideDefs(track?: Track): SlideDef {
  if (track?.custom) return { flows: [], trampolines: track.trampolines ?? [] };
  if (track?.id !== "sky-slide") return { flows: [], trampolines: [] };
  const flows: FlowBox[] = [];
  for (let i = 1; i < track.path.length; i++) {
    const a = track.path[i - 1],
      b = track.path[i],
      dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz);
    flows.push({
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      yaw: Math.atan2(dx, dz),
      w: 16,
      len: len + 4,
      dirx: dx / len,
      dirz: dz / len,
    });
  }
  return { flows, trampolines: [track.trampoline!] };
}
export function inFlow(box: FlowBox, x: number, z: number) {
  const dx = x - box.x,
    dz = z - box.z,
    c = Math.cos(box.yaw),
    s = Math.sin(box.yaw);
  return (
    Math.abs(dx * c - dz * s) < box.w / 2 &&
    Math.abs(dx * s + dz * c) < box.len / 2
  );
}
type Trampoline = {
  def: TrampDef;
  collider: RAPIER.Collider;
  bounces: number;
  contacts: number;
  lastBounce: number;
};
export class SlideSystems {
  private defs: SlideDef;
  private previousFlow?: FlowBox;
  private sensors: Trampoline[] = [];
  flowing = false;
  constructor(
    private sim: Simulation,
    defs: SlideDef = slideDefs(sim.courseTrack),
  ) {
    this.defs = defs;
    for (const t of defs.trampolines) {
      const collider = sim.world.createCollider(
        RAPIER.ColliderDesc.cuboid(5, 2, 5)
          .setTranslation(t.x, t.y + 2.5, t.z)
          .setSensor(true),
      );
      this.sensors.push({
        def: t,
        collider,
        bounces: 0,
        contacts: 0,
        lastBounce: -100,
      });
    }
    this.flowAt(sim.body.translation());
  }
  flowAt(position: { x: number; y: number; z: number }) {
    const box = this.defs.flows.find(
      (b) =>
        inFlow(b, position.x, position.z) &&
        (this.sim.courseTrack?.id !== "sky-slide" ||
          (position.y > slideProfileY(position.z) - 3 &&
            position.y < slideProfileY(position.z) + 6)),
    );
    this.flowing = !!box;
    return box;
  }
  applyFlow(box: FlowBox) {
    if (this.sim.courseTrack?.id === "sky-slide") {
      const v = this.sim.body.linvel();
      const along = v.x * box.dirx + v.z * box.dirz;
      const previous = this.previousFlow ?? box;
      const lateral = v.x * previous.dirz - v.z * previous.dirx;
      this.previousFlow = box;
      const speed = Math.max(
        (100 * this.sim.tuning.slideWaterSpeed) / 3.6,
        along,
      );
      const slip = lateral * Math.exp(-SLIDE_DRAG * DT);
      this.sim.body.setLinvel(
        {
          x: box.dirx * speed + box.dirz * slip,
          y: v.y,
          z: box.dirz * speed - box.dirx * slip,
        },
        true,
      );
      return;
    }
    const mass = this.sim.body.mass();
    this.sim.body.applyImpulse(
      {
        x: box.dirx * SLIDE_FLOW_ACCEL * mass * DT,
        y: 0,
        z: box.dirz * SLIDE_FLOW_ACCEL * mass * DT,
      },
      true,
    );
    const v = this.sim.body.linvel();
    this.sim.body.applyImpulse(
      {
        x: -v.x * SLIDE_DRAG * mass * DT,
        y: 0,
        z: -v.z * SLIDE_DRAG * mass * DT,
      },
      true,
    );
  }
  applyStrafe(steer: number) {
    const localX = new Vector3(1, 0, 0).applyQuaternion(
      new Quaternion().copy(this.sim.body.rotation()),
    );
    localX.y = 0;
    localX.normalize();
    this.sim.body.applyImpulse(
      localX.multiplyScalar(steer * STRAFE_ACCEL * this.sim.body.mass() * DT),
      true,
    );
  }
  bounce() {
    const v = this.sim.body.linvel();
    for (const s of this.sensors) {
      let touch = false;
      for (const state of this.sim.parts.values()) {
        if (
          state.collider &&
          this.sim.world.intersectionPair(s.collider, state.collider)
        ) {
          touch = true;
          break;
        }
      }
      if (!touch) continue;
      s.contacts++;
      if (v.y < 5 && this.sim.time - s.lastBounce > 1) {
        s.lastBounce = this.sim.time;
        s.bounces++;
        const ring = this.sim.courseTrack?.ring;
        if (ring && this.sim.courseTrack?.trampoline) {
          const p = this.sim.body.translation();
          const speed = Math.max(100 / 3.6, Math.hypot(v.x, v.z));
          const distance = Math.hypot(ring.x - p.x, ring.z - p.z);
          const t = distance / speed;
          // Preserve forward speed; scale lift to cross the upright ring at any water setting.
          const lift = (ring.y - p.y) / t - (this.sim.world.gravity.y * t) / 2;
          this.sim.body.setLinvel(
            { x: (ring.x - p.x) / t, y: lift, z: (ring.z - p.z) / t },
            true,
          );
          this.sim.body.setLinearDamping(0);
        } else
          this.sim.body.setLinvel({ x: v.x, y: BOUNCE_SPEED, z: v.z }, true);
        this.sim.bounced = true;
      }
    }
  }
  snapshot() {
    return {
      flowing: this.flowing,
      flows: this.defs.flows.length,
      trampolines: this.sensors.map((s) => ({
        x: s.def.x,
        z: s.def.z,
        bounces: s.bounces,
        contacts: s.contacts,
      })),
    };
  }
}
