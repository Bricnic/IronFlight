import RAPIER from "@dimforge/rapier3d-compat";
import { Quaternion, Vector3 } from "three";
import { PARTS } from "./damage";
import { hammerStrike } from "./hammer-impact";
import type { Track } from "./tracks";
import type { Simulation } from "./simulation";
export const AXE_AMPLITUDE = 1.0;
export const AXE_PERIOD = 5;
const OMEGA = (2 * Math.PI) / AXE_PERIOD;
export const axeAngle = (time: number, phase: number) =>
  AXE_AMPLITUDE * Math.sin(OMEGA * time + phase);
export const axeAngularVelocity = (time: number, phase: number) =>
  AXE_AMPLITUDE * OMEGA * Math.cos(OMEGA * time + phase);
export type AxeDef = {
  id: string;
  x: number;
  y: number;
  z: number;
  phase: number;
};
export function axeDefs(track?: Track): AxeDef[] {
  if (track?.id !== "canyon-plunge") return [];
  return [950, 1050, 1400, 1600, 1800, 2000].map((z, i) => ({
    id: `axe-${i + 1}`,
    x: 0,
    y: 9,
    z,
    phase: (i * Math.PI) / 3,
  }));
}
type Axe = {
  def: AxeDef;
  body: RAPIER.RigidBody;
  angle: number;
  velocity: number;
  contacts: boolean;
  lastStrike: number;
};
export type AxeImpact = {
  id: string;
  part: string;
  time: number;
  point: number[];
  deltaVelocity: number[];
  damage: number;
};
export class AxeArray {
  axes: Axe[] = [];
  impacts: AxeImpact[] = [];
  constructor(
    private sim: Simulation,
    track: Track | undefined = sim.courseTrack,
  ) {
    for (const def of axeDefs(track)) {
      const body = sim.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
          def.x,
          def.y,
          def.z,
        ),
      );
      sim.world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.25, 4, 0.25).setTranslation(0, -4, 0),
        body,
      );
      sim.world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.35, 1.8, 1.6).setTranslation(0, -7, 0),
        body,
      );
      this.axes.push({
        def,
        body,
        angle: 0,
        velocity: 0,
        contacts: false,
        lastStrike: -100,
      });
    }
  }
  update() {
    for (const axe of this.axes) {
      axe.angle = axeAngle(this.sim.time, axe.def.phase);
      axe.velocity = axeAngularVelocity(this.sim.time, axe.def.phase);
      axe.body.setNextKinematicRotation(
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), axe.angle),
      );
    }
  }
  resolve(incoming: Vector3) {
    const attached = new Map(
      [...this.sim.parts]
        .filter(([, p]) => !!p.collider)
        .map(([id, p]) => [p.collider!.handle, id]),
    );
    let struck = false;
    for (const axe of this.axes) {
      let best:
        | { part: string; point: Vector3; radius: Vector3; normal: Vector3 }
        | undefined;
      for (let i = 0; i < axe.body.numColliders(); i++) {
        const blade = axe.body.collider(i);
        this.sim.world.contactPairsWith(blade, (other) => {
          const part = attached.get(other.handle);
          if (!part) return;
          this.sim.world.contactPair(blade, other, (manifold, flipped) => {
            for (let j = 0; j < manifold.numContacts(); j++) {
              if (manifold.contactDist(j) > 0.005) continue;
              const local = flipped
                ? manifold.localContactPoint2(j)
                : manifold.localContactPoint1(j);
              if (!local) continue;
              const point = new Vector3()
                .copy(local)
                .applyQuaternion(new Quaternion().copy(blade.rotation()))
                .add(blade.translation());
              const radius = point.clone().sub(axe.body.translation());
              const normal = new Vector3()
                .copy(manifold.normal())
                .multiplyScalar(flipped ? -1 : 1);
              if (!best || radius.lengthSq() > best.radius.lengthSq())
                best = { part, point, radius, normal };
            }
          });
        });
      }
      const touching = !!best,
        wasTouching = axe.contacts;
      axe.contacts = touching;
      if (!best || wasTouching || this.sim.time - axe.lastStrike <= 0.45)
        continue;
      if (this.sim.parts.get("chassis-front")!.health <= 0) continue;
      axe.lastStrike = this.sim.time;
      const strike = hammerStrike(best.radius, best.normal, incoming, axe.velocity);
      this.sim.body.applyImpulseAtPoint(
        strike.deltaVelocity.clone().multiplyScalar(this.sim.body.mass()),
        best.point,
        true,
      );
      const q = new Quaternion().copy(this.sim.body.rotation()).invert();
      const local = best.point
        .clone()
        .sub(this.sim.body.translation())
        .applyQuaternion(q);
      const nearby = PARTS.filter(
        (p) => p.id !== best!.part && !this.sim.parts.get(p.id)!.body,
      )
        .map((p) => ({
          p,
          distance: new Vector3(...p.pos).distanceTo(local),
        }))
        .filter((p) => p.distance < 3.5)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 2);
      for (const [id, amount] of [
        [best.part, strike.damage],
        ...nearby.map(({ p }) => [p.id, strike.damage * 0.65]),
      ] as [string, number][]) {
        const def = PARTS.find((p) => p.id === id)!;
        const dent = local
          .clone()
          .sub(new Vector3(...def.pos))
          .clamp(
            new Vector3(...def.size).multiplyScalar(-0.5),
            new Vector3(...def.size).multiplyScalar(0.5),
          );
        this.sim.damage(id, amount, dent);
      }
      this.sim.damageEvents.push({
        source: "axe",
        part: best.part,
        time: this.sim.time,
      });
      this.impacts.push({
        id: axe.def.id,
        part: best.part,
        time: this.sim.time,
        point: best.point.toArray(),
        deltaVelocity: strike.deltaVelocity.toArray(),
        damage: strike.damage,
      });
      if (this.impacts.length > 16) this.impacts.shift();
      struck = true;
    }
    return struck;
  }
  snapshot() {
    return {
      axes: this.axes.map((a) => ({
        id: a.def.id,
        x: a.def.x,
        z: a.def.z,
        angle: a.angle,
        velocity: a.velocity,
        contacts: a.contacts,
      })),
    };
  }
}
