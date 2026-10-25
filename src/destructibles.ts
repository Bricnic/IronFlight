import RAPIER from "@dimforge/rapier3d-compat";
import { Quaternion, Vector3 } from "three";
import { ROUTES } from "./routes.ts";
import { PARTS, type PartState } from "./damage.ts";
export type PropKind = "sign" | "trash" | "barrel" | "gravestone" | "snowman";
export type PropDefinition = {
  id: string;
  kind: PropKind;
  x: number;
  z: number;
  ground: number;
};
export type TrashPiece = {
  lid?: boolean;
  body: RAPIER.RigidBody;
  size: number[];
  color: number;
};
export type PropState = {
  definition: PropDefinition;
  body: RAPIER.RigidBody;
  colliders: RAPIER.Collider[];
  joint?: RAPIER.ImpulseJoint;
  broken: boolean;
  spilled: boolean;
  burningUntil: number;
  pieces: TrashPiece[];
  lastHit: number;
};
export function propDefinitions(lab = false): PropDefinition[] {
  const lanes = lab ? [{ id: "lab", x: 0 }] : ROUTES;
  return lanes.flatMap((r) =>
    (["sign", "trash", "barrel"] as const).map((kind, i) => ({
      id: `${r.id}-${kind}`,
      kind,
      x: r.x + 10,
      z: lab ? 10 + i * 12 : -45 + i * 12,
      ground: lab ? 0 : -0.12,
    })),
  );
}
function propHeight(kind: string) {
  if (kind === "sign") return 1.6;
  if (kind === "snowman") return 1.4;
  if (kind === "gravestone") return 0.9;
  if (kind === "trash") return 0.65;
  return 0.7;
}
export class Destructibles {
  readonly props: PropState[] = [];
  private incoming = new Map<PropState, Vector3>();
  private freshlyDestroyed: string[] = [];
  takeDestroyed() {
    const ids = [...this.freshlyDestroyed];
    this.freshlyDestroyed = [];
    return ids;
  }
  captureVelocities() {
    for (const p of this.props)
      this.incoming.set(p, new Vector3().copy(p.body.linvel()));
  }
  constructor(
    readonly world: RAPIER.World,
    lab: boolean,
    definitions = propDefinitions(lab),
  ) {
    for (const definition of definitions) this.addProp(definition);
  }
  /** Live placement: add one prop without resetting the run. */
  addProp(definition: PropDefinition) {
    const world = this.world;
    {
      const { kind, x, z, ground } = definition,
        sign = kind === "sign",
        stone = kind === "gravestone",
        height = propHeight(kind);
      const body = world.createRigidBody(
        (kind === "snowman"
          ? RAPIER.RigidBodyDesc.fixed()
          : RAPIER.RigidBodyDesc.dynamic()
        )
          .setTranslation(x, ground + height, z)
          .setLinearDamping(0.12)
          .setAngularDamping(0.3)
          .setCcdEnabled(true),
      );
      const colliders: RAPIER.Collider[] = [];
      let joint: RAPIER.ImpulseJoint | undefined;
      if (sign) {
        colliders.push(
          world.createCollider(
            RAPIER.ColliderDesc.cuboid(0.065, 1.6, 0.065).setMass(8),
            body,
          ),
        );
        colliders.push(
          world.createCollider(
            RAPIER.ColliderDesc.cuboid(0.9, 0.45, 0.08)
              .setTranslation(0, 1, 0)
              .setMass(12),
            body,
          ),
        );
        const base = world.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(x, ground + 0.05, z),
        );
        world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.1, 0.3), base);
        joint = world.createImpulseJoint(
          RAPIER.JointData.fixed(
            { x: 0, y: 0, z: 0 },
            new Quaternion(),
            { x: 0, y: -1.55, z: 0 },
            new Quaternion(),
          ),
          base,
          body,
          true,
        );
        joint.setContactsEnabled(false);
      } else if (kind === "snowman")
        colliders.push(
          world.createCollider(
            RAPIER.ColliderDesc.ball(1.3).setSensor(true),
            body,
          ),
        );
      else if (stone)
        colliders.push(
          world.createCollider(
            RAPIER.ColliderDesc.cuboid(0.7, 0.9, 0.25)
              .setMass(120)
              .setFriction(0.7),
            body,
          ),
        );
      else
        colliders.push(
          world.createCollider(
            RAPIER.ColliderDesc.cylinder(height, kind === "trash" ? 0.48 : 0.5)
              .setMass(kind === "trash" ? 18 : 85)
              .setFriction(0.65)
              .setRestitution(0.12),
            body,
          ),
        );
      this.props.push({
        definition,
        body,
        colliders,
        joint,
        broken: false,
        spilled: false,
        burningUntil: 0,
        pieces: [],
        lastHit: -1,
      });
    }
  }
  /** Live editing: relocate one prop body, stopping it dead. */
  moveProp(id: string, x: number, ground: number, z: number) {
    const prop = this.props.find((p) => p.definition.id === id);
    if (!prop) return;
    prop.definition = { ...prop.definition, x, z, ground };
    prop.body.setTranslation(
      { x, y: ground + propHeight(prop.definition.kind), z },
      true,
    );
    prop.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    prop.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
  /** Live editing: drop one prop and its bodies. */
  removeProp(id: string) {
    const at = this.props.findIndex((p) => p.definition.id === id);
    if (at < 0) return;
    const [prop] = this.props.splice(at, 1);
    this.incoming.delete(prop);
    for (const c of prop.colliders) this.world.removeCollider(c, true);
    for (const p of prop.pieces) this.world.removeRigidBody(p.body);
    if (prop.joint) this.world.removeImpulseJoint(prop.joint, true);
    this.world.removeRigidBody(prop.body);
  }
  update(
    truck: RAPIER.RigidBody,
    parts: Map<string, PartState>,
    wheels: Vector3[],
    incoming: Vector3,
    time: number,
    wheelRadius = 1.05,
    suspensionRest = 0.6,
  ) {
    const truckColliders = new Set(
      [...parts.values()].flatMap((p) =>
        p.collider ? [p.collider.handle] : [],
      ),
    );
    const q = new Quaternion().copy(truck.rotation()),
      root = new Vector3().copy(truck.translation());
    let fireExposure = 0;
    for (const prop of this.props) {
      const position = new Vector3().copy(prop.body.translation());
      if (
        (prop.definition.kind === "snowman" && prop.broken) ||
        position.distanceToSquared(root) > 64
      )
        continue;
      let contact = false;
      for (const collider of prop.colliders) {
        if (prop.definition.kind === "snowman")
          for (const state of parts.values())
            if (
              state.collider &&
              this.world.intersectionPair(collider, state.collider)
            )
              contact = true;
        this.world.contactPairsWith(collider, (other) => {
          if (!truckColliders.has(other.handle)) return;
          this.world.contactPair(collider, other, (m) => {
            for (let j = 0; j < m.numContacts(); j++)
              if (m.contactDist(j) <= 0.01) contact = true;
          });
        });
        // Rapier's suspension wheels are rays, so their tire volumes must also
        // transfer collisions to small props below the chassis.
        for (let i = 0; i < 4 && !contact; i++) {
          if (parts.get(PARTS[i + 2].id)!.body) continue;
          const center = wheels[i].clone();
          center.y -= suspensionRest;
          center.applyQuaternion(q).add(root);
          const hit = collider.contactShape(
            new RAPIER.Ball(wheelRadius),
            center,
            new Quaternion(),
            0,
          );
          if (hit && hit.distance <= 0.01) contact = true;
        }
      }
      const away = position.clone().sub(root);
      away.y = 0;
      away.normalize();
      const relative = incoming
        .clone()
        .sub(this.incoming.get(prop) ?? prop.body.linvel());
      relative.y = 0;
      const closing = Math.max(0, relative.dot(away));
      if (contact && closing > 0.6 && time - prop.lastHit > 0.3) {
        prop.lastHit = time;
        if (prop.definition.kind === "sign" && prop.joint) {
          this.world.removeImpulseJoint(prop.joint, true);
          prop.joint = undefined;
          prop.broken = true;
        }
        const direction =
          relative.lengthSq() > 0 ? relative.clone().normalize() : away;
        const impulse = direction.multiplyScalar(
          prop.body.mass() * Math.min(45, closing * 0.85),
        );
        prop.body.applyImpulse(impulse, true);
        truck.applyImpulse(impulse.clone().negate(), true);
        const axis = new Vector3(0, 1, 0)
          .cross(away)
          .multiplyScalar(prop.body.mass() * Math.min(9, closing) * 0.35);
        prop.body.applyTorqueImpulse(axis, true);
        if (prop.definition.kind === "trash" && !prop.spilled) {
          prop.spilled = true;
          this.spill(prop, time);
        }
        if (prop.definition.kind === "snowman" && !prop.broken) {
          prop.broken = true;
          this.rubble(prop);
          for (const c of prop.colliders) this.world.removeCollider(c, true);
          prop.colliders = [];
          this.freshlyDestroyed.push(prop.definition.id);
        }
        if (
          prop.definition.kind === "gravestone" &&
          !prop.broken &&
          closing > 2.5
        ) {
          prop.broken = true;
          this.rubble(prop);
          this.freshlyDestroyed.push(prop.definition.id);
        }
        if (
          prop.definition.kind === "barrel" &&
          relative.length() * 3.6 >= 90 - 1e-6
        )
          prop.burningUntil = Math.max(prop.burningUntil, time + 6);
      }
      if (prop.burningUntil > time && position.distanceTo(root) < 3.6)
        fireExposure++;
    }
    return fireExposure;
  }
  private spill(prop: PropState, time: number) {
    const position = prop.body.translation(),
      velocity = prop.body.linvel();
    const lid = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y + 0.8, position.z)
        .setLinvel(velocity.x * 0.6 + 1.5, 4, velocity.z * 0.6)
        .setAngvel({ x: 3, y: 2, z: 4 })
        .setCcdEnabled(true),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cylinder(0.04, 0.51).setMass(1.5),
      lid,
    );
    prop.pieces.push({
      body: lid,
      size: [1.02, 0.08, 1.02],
      color: 0x293431,
      lid: true,
    });
    for (let i = 0; i < 12; i++) {
      const a = i * 2.39996,
        size = [
          0.08 + (i % 3) * 0.025,
          0.04 + (i % 2) * 0.06,
          0.1 + (i % 4) * 0.025,
        ];
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(
            position.x + Math.cos(a) * 0.6,
            position.y + 0.8 + (i % 3) * 0.08,
            position.z + Math.sin(a) * 0.6,
          )
          .setLinvel(
            velocity.x * 0.6 + Math.cos(a) * 2,
            2 + (i % 4),
            velocity.z * 0.6 + Math.sin(a) * 2,
          )
          .setAngvel({ x: i + 1, y: 2, z: -i })
          .setCcdEnabled(true),
      );
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(
          ...(size.map((v) => v / 2) as [number, number, number]),
        )
          .setMass(0.08)
          .setFriction(0.7),
        body,
      );
      prop.pieces.push({
        body,
        size,
        color: [0xc2b9a6, 0x779288, 0xc59b64, 0xe2ded3][i % 4],
      });
    }
  }
  private rubble(prop: PropState) {
    const position = prop.body.translation(),
      velocity = prop.body.linvel();
    for (let i = 0; i < (prop.definition.kind === "snowman" ? 12 : 4); i++) {
      const a = i * 1.5708 + 0.4,
        size = [0.3 + (i % 2) * 0.15, 0.2 + (i % 3) * 0.1, 0.25];
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(
            position.x + Math.cos(a) * 0.8,
            position.y + 0.6,
            position.z + Math.sin(a) * 0.8,
          )
          .setLinvel(
            velocity.x * 0.5 + Math.cos(a) * 3,
            3 + (i % 2),
            velocity.z * 0.5 + Math.sin(a) * 3,
          )
          .setAngvel({ x: i + 2, y: 1, z: -i })
          .setCcdEnabled(true),
      );
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(
          ...(size.map((v) => v / 2) as [number, number, number]),
        )
          .setMass(6)
          .setFriction(0.7),
        body,
      );
      prop.pieces.push({
        body,
        size,
        color:
          prop.definition.kind === "snowman"
            ? [0xffffff, 0xdeefff, 0xff8b28, 0x202830][i % 4]
            : [0x9aa0a3, 0x7d8487, 0x8f979b, 0x6e7477][i],
      });
    }
  }
  snapshot(time: number) {
    return this.props.map((p) => ({
      id: p.definition.id,
      kind: p.definition.kind,
      position: { ...p.body.translation() },
      velocity: { ...p.body.linvel() },
      broken: p.broken,
      spilled: p.spilled,
      trashPieces: p.pieces.length,
      burning: p.burningUntil > time,
      burningUntil: p.burningUntil,
    }));
  }
}
