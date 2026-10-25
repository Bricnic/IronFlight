import R from "@dimforge/rapier3d-compat";
import { Quaternion, Vector3 } from "three";
import { DT } from "./clock";
import type { Simulation } from "./simulation";
import { getVehicle } from "./vehicles";
import {
  comicHazards,
  BURNER_RAMP,
  BURNER_SUPPORTS,
  BURNER_DRUM,
  mechanismAngle,
  waterMode,
  POTIONS,
  potionScale,
  type ComicHazard,
  type Potion,
} from "./comic-hazards";
type Mechanism = {
  h: ComicHazard;
  bodies: R.RigidBody[];
  colliders: R.Collider[];
  sensors: R.Collider[];
  triggered: number;
  skimming: boolean;
  sinking: number;
  contacts: number;
  ramp?: R.Collider;
};
export class ComicPhysics {
  mechanisms: Mechanism[] = [];
  effect?: Potion;
  effectUntil = 0;
  private incomingSpeed = 0;
  private appliedEffect?: Potion;
  private consumed = new Map<string, number>();
  constructor(private sim: Simulation) {
    if (!sim.courseTrack) return;
    const world = sim.world;
    for (const h of comicHazards(sim.courseTrack)) {
      const m: Mechanism = {
        h,
        bodies: [],
        colliders: [],
        sensors: [],
        triggered: -100,
        skimming: false,
        sinking: 0,
        contacts: 0,
      };
      this.mechanisms.push(m);
      const box = (
        x: number,
        y: number,
        z: number,
        w: number,
        height: number,
        d: number,
        sensor = false,
        body?: R.RigidBody,
      ) => {
        const c = world.createCollider(
          R.ColliderDesc.cuboid(w / 2, height / 2, d / 2)
            .setTranslation(
              body ? x : h.x + x,
              y + (body ? 0 : (h.y ?? 0)),
              body ? z : h.z + z,
            )
            .setSensor(sensor)
            .setFriction(0.75),
          body,
        );
        (sensor ? m.sensors : m.colliders).push(c);
        return c;
      };
      if (["book", "teeth", "computer", "flippers"].includes(h.kind)) {
        box(0, 0.25, 0, 12, 0.5, 12);
        if (h.kind === "flippers") box(0, 1.3, 0, 10, 2, 10, true);
        for (const side of [-1, 1]) box(side * 6.4, 1.5, 4.8, 0.65, 3, 2);
        const b = world.createRigidBody(
          R.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(h.x, 1.2, h.z + 5)
            .setRotation(
              new Quaternion().setFromAxisAngle(
                new Vector3(1, 0, 0),
                mechanismAngle(h, 0),
              ),
            ),
        );
        m.bodies.push(b);
        box(0, 0, -5, 12, 1.6, 12, false, b);
        // Matching individual teeth supplement the crushing plate collider.
        for (const side of [-1, 1])
          for (let i = 0; i < 9; i++) {
            const c = world.createCollider(
              R.ColliderDesc.cone(0.65, 0.34)
                .setTranslation((i - 4) * 1.25, side * 0.95, -10.6)
                .setRotation(
                  new Quaternion().setFromAxisAngle(
                    new Vector3(1, 0, 0),
                    side < 0 ? Math.PI : 0,
                  ),
                ),
              b,
            );
            m.colliders.push(c);
          }
      } else if (h.kind === "hydrant") {
        box(0, 0.15, 0, 5, 0.3, 5);
        const c = world.createCollider(
          R.ColliderDesc.cylinder(1.35, 0.85).setTranslation(
            h.x,
            (h.y ?? 0) + 1.5,
            h.z,
          ),
        );
        m.colliders.push(c);
        box(0, 3.5, 0, 5, 7, 5, true);
      } else if (h.kind === "burner") {
        box(0, 0.12, 0, 12, 0.24, 10);
        box(0, 2.5, 0, 12, 5, 10, true);
        // A real ramp, visibly and physically aligned with the burning section.
        const r = BURNER_RAMP;
        const ramp = world.createCollider(
          R.ColliderDesc.cuboid(r.w / 2, r.h / 2, r.d / 2)
            .setTranslation(h.x + r.x, r.y, h.z + r.z)
            .setRotation(
              new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), r.angle),
            ),
        );
        m.colliders.push(ramp);
        m.ramp = ramp;
        for (const side of [-1, 1]) {
          box(side * 6.5, 0.8, 0, 0.6, 1.6, 12);
        }
        for (const s of BURNER_SUPPORTS) box(s.x, s.y, s.z, s.w, s.h, s.d);
        for (const x of BURNER_DRUM.x)
          m.colliders.push(
            world.createCollider(
              R.ColliderDesc.cylinder(
                BURNER_DRUM.height / 2,
                BURNER_DRUM.radius,
              ).setTranslation(h.x + x, BURNER_DRUM.y, h.z),
            ),
          );
      } else if (h.kind === "water") {
        box(0, -4.3, 0, 12, 0.6, 24);
        box(0, -1.8, 0, 12, 9, 24, true);
        for (const side of [-1, 1]) box(side * 6.5, 0.2, 0, 1, 0.4, 26);
        for (const z of [-12.5, 12.5]) {
          box(0, -2, z, 12, 4, 1);
        }
        for (const side of [-1, 1]) box(side * 6.3, -2, 0, 0.6, 4, 24);
        box(0, 2, -27, 10, 4, 12, true); // boost sensor, physically on approach
      } else {
        box(0, 0.15, 0, 18, 0.3, 4);
        for (let i = 0; i < 4; i++) {
          const c = world.createCollider(
            R.ColliderDesc.ball(0.5)
              .setTranslation(h.x + (i - 1.5) * 4.4, 1.7, h.z)
              .setSensor(true),
          );
          m.sensors.push(c);
        }
        // Fragile glass stand has real collision, liquid contact uses sensors.
        for (let i = 0; i < 4; i++) box((i - 1.5) * 4.4, 0.6, 0, 1.4, 1.2, 1.4);
      }
    }
  }
  before() {
    const s = this.sim;
    this.incomingSpeed = Math.hypot(s.body.linvel().x, s.body.linvel().z) * 3.6;
    if (s.time >= this.effectUntil) this.effect = undefined;
    if (this.appliedEffect !== this.effect) {
      this.appliedEffect = this.effect;
      const [x, y, z] = potionScale(this.effect);
      for (const def of this.sim.partDefs) {
        const c = s.parts.get(def.id)?.collider;
        if (c) {
          c.setHalfExtents({
            x: (def.size[0] * x) / 2,
            y: (def.size[1] * y) / 2,
            z: (def.size[2] * z) / 2,
          });
          c.setTranslationWrtParent({
            x: def.pos[0] * x,
            y: def.pos[1] * y,
            z: def.pos[2] * z,
          });
        }
      }
      const ride = getVehicle(this.sim.vehicleId);
      ride.suspension.forEach((p, i) => {
        s.vehicle.setWheelRadius(i, ride.wheelRadius * y);
        s.vehicle.setWheelSuspensionRestLength(i, ride.suspensionRest * y);
        s.vehicle.setWheelChassisConnectionPointCs(i, {
          x: p[0] * x,
          y: p[1] * y,
          z: p[2] * z,
        });
      });
    }
    for (const m of this.mechanisms) {
      const angle = mechanismAngle(m.h, s.time, m.triggered);
      for (const b of m.bodies) {
        b.setNextKinematicTranslation({ x: m.h.x, y: 1.2, z: m.h.z + 5 });
        b.setNextKinematicRotation(
          new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle),
        );
      }
    }
  }
  private intersects(sensor: R.Collider) {
    for (const state of this.sim.parts.values())
      if (
        state.collider &&
        this.sim.world.intersectionPair(sensor, state.collider)
      )
        return true;
    return false;
  }
  private contact(c: R.Collider) {
    let hit = false;
    this.sim.world.contactPairsWith(c, (other) => {
      if (other.parent()?.handle === this.sim.body.handle)
        this.sim.world.contactPair(c, other, (manifold) => {
          if (manifold.numSolverContacts() > 0) hit = true;
        });
    });
    return hit;
  }
  after() {
    const s = this.sim,
      p = s.body.translation();
    for (const m of this.mechanisms) {
      const h = m.h;
      if (["book", "teeth", "computer", "flippers"].includes(h.kind)) {
        if (
          h.kind === "flippers" &&
          m.sensors.some((c) => this.intersects(c)) &&
          s.time - m.triggered > 6
        )
          m.triggered = s.time;
        const contact = m.colliders.some((c) => c.parent() && this.contact(c));
        if (contact) {
          m.contacts++;
          s.damageEvents.push({
            source: h.kind,
            part: "chassis-front",
            time: s.time,
          });
          s.damage("chassis-front", 10000);
        }
      } else if (h.kind === "hydrant") {
        if (
          m.sensors.some((c) => this.intersects(c)) &&
          s.time - m.triggered > 2
        ) {
          m.triggered = s.time;
          m.contacts++;
          s.body.applyImpulse(
            { x: 0, y: s.body.mass() * 32, z: s.body.mass() * 5 },
            true,
          );
          if (this.incomingSpeed > 90) s.damage("chassis-front", 10000);
          s.damage("hood", 95);
          s.damageEvents.push({
            source: "hydrant",
            part: "hood",
            time: s.time,
          });
        }
      } else if (h.kind === "burner") {
        if (this.intersects(m.sensors[0])) {
          m.contacts++;
          s.inFlames = true;
          for (const part of this.sim.partDefs)
            s.fireDamage(part.id, part.hp * DT * 0.85);
          if (s.time - m.triggered > 0.15) {
            m.triggered = s.time;
            s.damageEvents.push({
              source: "burner",
              part: "hood",
              time: s.time,
            });
          }
        }
      } else if (h.kind === "water") {
        if (this.intersects(m.sensors[1])) {
          const f = new Vector3(0, 0, 1).applyQuaternion(
            new Quaternion().copy(s.body.rotation()),
          );
          const speed = f.dot(s.body.linvel());
          if (speed < 72)
            s.body.applyImpulse(
              f.multiplyScalar(Math.min(3, 72 - speed) * s.body.mass()),
              true,
            );
        }
        if (this.intersects(m.sensors[0])) {
          m.contacts++;
          const v = s.body.linvel();
          m.skimming =
            waterMode(Math.hypot(v.x, v.z) * 3.6, m.skimming) === "skimming" &&
            m.sinking === 0;
          if (m.skimming) {
            s.body.setLinvel(
              { x: v.x * (1 - 0.16 * DT), y: 0, z: v.z * (1 - 0.16 * DT) },
              true,
            );
            s.body.setTranslation({ x: p.x, y: 1.65, z: p.z }, true);
          } else {
            m.sinking += DT;
            s.body.setLinvel({ x: v.x * 0.9, y: -1.8, z: v.z * 0.9 }, true);
            for (const part of this.sim.partDefs)
              s.damage(part.id, part.hp * DT * 0.45);
            if (m.sinking > 2.5) s.damage("chassis-front", 10000);
          }
        } else {
          m.skimming = false;
          m.sinking = 0;
        }
      } else if (h.kind === "potion") {
        for (let i = 0; i < 4; i++)
          if (
            this.intersects(m.sensors[i]) &&
            s.time - (this.consumed.get(`${h.id}:${i}`) ?? -100) > 6
          ) {
            this.consumed.set(`${h.id}:${i}`, s.time);
            // Mixing two active magical liquids is deliberately volatile.
            if (this.effect && this.effect !== POTIONS[i])
              s.damage("chassis-front", 10000);
            m.triggered = s.time;
            m.contacts++;
            this.effect = POTIONS[i];
            this.effectUntil = s.time + 5;
            s.damageEvents.push({
              source: `potion-${this.effect}`,
              part: "hood",
              time: s.time,
            });
          }
      }
    }
  }
  snapshot() {
    return {
      effect: this.effect ?? null,
      remaining: Math.max(0, this.effectUntil - this.sim.time),
      hazards: this.mechanisms.map((m) => ({
        id: m.h.id,
        kind: m.h.kind,
        x: m.h.x,
        z: m.h.z,
        colliders: m.colliders.length,
        sensors: m.sensors.length,
        contacts: m.contacts,
        ramp: m.ramp
          ? {
              position: { ...m.ramp.translation() },
              angle: 2 * Math.atan2(m.ramp.rotation().x, m.ramp.rotation().w),
            }
          : undefined,
        triggered: m.triggered,
        angle: mechanismAngle(m.h, this.sim.time, m.triggered),
        skimming: m.skimming,
        sinking: m.sinking,
      })),
    };
  }
}
