import RAPIER from "@dimforge/rapier3d-compat";
import { Quaternion, Vector3 } from "three";
import { DT } from "./clock";
import { ROUTES, routeSolids } from "./routes";
import { PARTS, type PartState } from "./damage";
import { HAZARDS, hammerAngle, type Hazard } from "./hazards";
import { arenaSolids } from "./arena";
import { DEFAULT_TUNING, validateTuning, type Tuning } from "./tuning";
import { LOOP, dragonFiring, loopSolids, loopScenerySolids } from "./loop";
export type Stage = "easy" | "medium" | "hard" | "lab";
export type Input = { throttle?: number; brake?: number; steer?: number };
export const wheelPositions = [
  new Vector3(-1.65, -0.35, 1.65),
  new Vector3(1.65, -0.35, 1.65),
  new Vector3(-1.65, -0.35, -1.65),
  new Vector3(1.65, -0.35, -1.65),
];
let ready: Promise<void> | undefined;
export function initPhysics() {
  return (ready ??= RAPIER.init());
}
export class Simulation {
  world!: RAPIER.World;
  body!: RAPIER.RigidBody;
  vehicle!: RAPIER.DynamicRayCastVehicleController;
  stage: Stage;
  time = 0;
  ticks = 0;
  airborneTicks = 0;
  landed = false;
  status: "driving" | "finished" | "wrecked" = "driving";
  parts = new Map<string, PartState>();
  private lastImpact = -1;
  damageEvents: { source: string; part: string; time: number }[] = [];
  private cooldown = new Map<string, number>();
  hazardBodies = new Map<string, RAPIER.RigidBody>();
  private surfaceKinds = new Map<number, string>();
  private visitedSurfaces = new Set<string>();
  previousPosition = new Vector3();
  previousRotation = new Quaternion();
  tuning = { ...DEFAULT_TUNING };
  steeringAngle = 0;
  boostTicks = 0;
  loopApex = false;
  loopCompleted = false;
  setTuning(values: Partial<Tuning>) {
    Object.assign(this.tuning, validateTuning(values));
  }
  constructor(stage: Stage = "lab") {
    this.stage = stage;
    this.reset(stage);
  }
  reset(stage: Stage = this.stage) {
    this.world?.free();
    this.stage = stage;
    this.time = 0;
    this.ticks = 0;
    this.airborneTicks = 0;
    this.landed = false;
    this.status = "driving";
    this.steeringAngle = 0;
    this.boostTicks = 0;
    this.loopApex = false;
    this.loopCompleted = false;
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = DT;
    this.parts.clear();
    this.lastImpact = -1;
    this.damageEvents = [];
    this.cooldown.clear();
    this.hazardBodies.clear();
    this.surfaceKinds.clear();
    this.visitedSurfaces.clear();
    if (stage === "lab")
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(200, 0.5, 300)
          .setTranslation(0, -0.5, 0)
          .setFriction(1),
      );
    else
      for (const s of [
        ...routeSolids(),
        ...arenaSolids(),
        ...loopSolids(),
        ...loopScenerySolids(),
      ]) {
        const collider = this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(s.w / 2, s.h / 2, s.d / 2)
            .setTranslation(s.x, s.y, s.z)
            .setRotation(
              new Quaternion().setFromAxisAngle(
                new Vector3(1, 0, 0),
                s.angle ?? 0,
              ),
            )
            .setFriction(1),
        );
        this.surfaceKinds.set(collider.handle, s.kind);
      }
    const route = ROUTES.find((r) => r.id === stage);
    this.body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(route?.x ?? 0, 2.1, stage === "lab" ? 0 : -65)
        .setLinearDamping(0.08)
        .setAngularDamping(1.2)
        .setCcdEnabled(true),
    );
    this.previousPosition.copy(this.body.translation());
    this.previousRotation.copy(this.body.rotation());
    for (const def of PARTS) {
      const state: PartState = { health: def.hp, dents: [] };
      this.parts.set(def.id, state);
      if (!def.id.startsWith("wheel"))
        state.collider = this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(
            def.size[0] / 2,
            def.size[1] / 2,
            def.size[2] / 2,
          )
            .setTranslation(def.pos[0], def.pos[1], def.pos[2])
            .setMass(def.mass)
            .setFriction(0.3),
          this.body,
        );
    }
    this.vehicle = this.world.createVehicleController(this.body);
    this.vehicle.indexUpAxis = 1;
    this.vehicle.setIndexForwardAxis = 2;
    wheelPositions.forEach((p, i) => {
      this.vehicle.addWheel(
        p,
        { x: 0, y: -1, z: 0 },
        { x: -1, y: 0, z: 0 },
        0.6,
        1.05,
      );
      this.vehicle.setWheelSuspensionStiffness(i, 35);
      this.vehicle.setWheelSuspensionCompression(i, 12);
      this.vehicle.setWheelSuspensionRelaxation(i, 14);
      this.vehicle.setWheelMaxSuspensionForce(i, 80000);
      this.vehicle.setWheelMaxSuspensionTravel(i, 0.45);
      this.vehicle.setWheelFrictionSlip(i, 2.5);
      this.vehicle.setWheelSideFrictionStiffness(i, 1.1);
    });
    if (stage !== "lab")
      for (const h of HAZARDS) {
        if (h.kind === "hammer") {
          const b = this.world.createRigidBody(
            RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
              h.x,
              h.y,
              h.z,
            ),
          );
          this.hazardBodies.set(h.id, b);
          this.world.createCollider(
            RAPIER.ColliderDesc.cuboid(3.6, 0.3, 0.45),
            b,
          );
          for (const side of [-1, 1])
            this.world.createCollider(
              RAPIER.ColliderDesc.cuboid(0.8, 0.8, 0.75).setTranslation(
                side * 3.6,
                0,
                0,
              ),
              b,
            );
          for (const side of [-1, 1])
            this.world.createCollider(
              RAPIER.ColliderDesc.cone(0.9, 0.65)
                .setTranslation(side * 5.1, 0, 0)
                .setRotation(
                  new Quaternion().setFromAxisAngle(
                    new Vector3(0, 0, 1),
                    (-side * Math.PI) / 2,
                  ),
                ),
              b,
            );
        }
        if (h.kind === "spikes")
          for (let x = -5; x <= 5; x += 2)
            this.world.createCollider(
              RAPIER.ColliderDesc.cone(1.2, 0.45).setTranslation(
                h.x + x,
                h.y,
                h.z,
              ),
            );
      }
  }
  step(input: Input = {}) {
    this.previousPosition.copy(this.body.translation());
    this.previousRotation.copy(this.body.rotation());
    const throttle = Math.max(-1, Math.min(1, input.throttle ?? 0)),
      brake = Math.max(0, Math.min(1, input.brake ?? 0)),
      steer = Math.max(-1, Math.min(1, input.steer ?? 0));
    const speed = this.body.linvel();
    const forward = new Vector3(0, 0, 1).applyQuaternion(
      new Quaternion().copy(this.body.rotation()),
    );
    const longitudinal = forward.dot(speed);
    const routeX = ROUTES.find((r) => r.id === this.stage)?.x;
    const position = this.body.translation();
    const onApproach =
      routeX !== undefined && Math.abs(position.x - routeX) < 6;
    const loopSuspension =
      routeX !== undefined && position.z > LOOP.z - LOOP.radius - 5;
    this.body.setAngularDamping(loopSuspension ? 0.25 : 1.2);
    for (let i = 0; i < 4; i++) {
      if (this.parts.get(PARTS[i + 2].id)!.body) continue;
      this.vehicle.setWheelMaxSuspensionForce(
        i,
        loopSuspension ? 500000 : 80000,
      );
      this.vehicle.setWheelSuspensionStiffness(i, loopSuspension ? 120 : 35);
    }
    if (
      onApproach &&
      position.y < 4 &&
      position.y > 0 &&
      position.z >= LOOP.boostStart &&
      position.z <= LOOP.boostEnd &&
      wheelPositions.filter((_, i) => this.vehicle.wheelIsInContact(i))
        .length >= 2 &&
      this.parts.get("chassis-front")!.health > 0 &&
      this.parts.get("chassis-rear")!.health > 0
    ) {
      const delta = Math.min(
        25 * this.tuning.boostPower * DT,
        Math.max(0, 75 * this.tuning.topSpeed - longitudinal),
      );
      this.body.applyImpulse(
        forward.clone().multiplyScalar(delta * this.body.mass()),
        true,
      );
      this.boostTicks++;
    }
    if (
      onApproach &&
      dragonFiring(this.time) &&
      position.y < 5 &&
      LOOP.dragonZ.some((z) => Math.abs(position.z - z) < 3)
    ) {
      for (const part of PARTS) this.damage(part.id, (part.hp * DT) / 3);
      if (this.time - (this.cooldown.get("dragon-fire") ?? -1) > 0.15) {
        this.cooldown.set("dragon-fire", this.time);
        this.damageEvents.push({
          source: "dragon-fire",
          part: "chassis-front",
          time: this.time,
        });
      }
    }
    const onLoop =
      routeX !== undefined &&
      Math.abs(position.x - routeX - 6) < 14 &&
      position.y > 3 &&
      Math.abs(position.z - LOOP.z) < LOOP.radius + 5;
    if (
      onLoop &&
      position.y > LOOP.radius * 1.8 &&
      wheelPositions.filter((_, i) => this.vehicle.wheelIsInContact(i))
        .length >= 2 &&
      new Vector3(0, 1, 0).applyQuaternion(
        new Quaternion().copy(this.body.rotation()),
      ).y < -0.7
    )
      this.loopApex = true;
    if (
      this.loopApex &&
      position.y < 3 &&
      longitudinal > 0 &&
      position.z > LOOP.z - 8 &&
      wheelPositions.filter((_, i) => this.vehicle.wheelIsInContact(i))
        .length >= 2
    )
      this.loopCompleted = true;
    const grounded = wheelPositions.some((_, i) =>
      this.vehicle.wheelIsInContact(i),
    );
    if (
      grounded &&
      brake === 0 &&
      this.parts.get("chassis-rear")!.health > 0 &&
      this.parts.get("chassis-front")!.health > 0
    ) {
      const taper = Math.max(
        0,
        1 -
          Math.abs(longitudinal) /
            ((throttle < 0 ? 8 : 25) * this.tuning.topSpeed),
      );
      // Extra arcade motor force acts through the center of mass to avoid a
      // tuning slider turning increased acceleration into an instant wheelie.
      this.body.applyImpulse(
        forward
          .clone()
          .multiplyScalar(
            throttle *
              (this.tuning.acceleration - 1) *
              12 *
              taper *
              this.body.mass() *
              DT,
          ),
        true,
      );
    }
    const steeringDelta = steer * 0.35 - this.steeringAngle;
    this.steeringAngle +=
      Math.sign(steeringDelta) *
      Math.min(Math.abs(steeringDelta), 0.9 * this.tuning.steeringRate * DT);
    // Rolling resistance only acts while grounded and coasting, never in flight.
    if (throttle === 0 && brake === 0 && grounded) {
      const delta = Math.min(
        Math.abs(longitudinal),
        1.8 * this.tuning.friction * DT,
      );
      this.body.applyImpulse(
        forward
          .clone()
          .multiplyScalar(-Math.sign(longitudinal) * delta * this.body.mass()),
        true,
      );
    }
    for (let i = 0; i < 4; i++) {
      const attached = !this.parts.get(PARTS[i + 2].id)!.body;
      const powered =
        this.parts.get("chassis-rear")!.health > 0 &&
        this.parts.get("chassis-front")!.health > 0;
      this.vehicle.setWheelEngineForce(
        i,
        attached && powered
          ? throttle *
              (throttle < 0 ? 6500 : 11000) *
              Math.max(
                0,
                1 -
                  Math.abs(longitudinal) /
                    ((throttle < 0 ? 8 : 25) * this.tuning.topSpeed),
              )
          : 0,
      );
      this.vehicle.setWheelBrake(i, attached ? brake * 30 : 0);
      this.vehicle.setWheelSteering(i, i < 2 ? this.steeringAngle : 0);
    }
    // Suspension only uses fixed surfaces. A rotating hammer must not become
    // driveable ground and inject suspension impulses into a passing tire.
    this.vehicle.updateVehicle(
      DT,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC |
        RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC,
    );
    for (const b of this.hazardBodies.values())
      b.setNextKinematicRotation(
        new Quaternion().setFromAxisAngle(
          new Vector3(0, 0, 1),
          hammerAngle(this.time + DT),
        ),
      );
    const before = new Vector3().copy(this.body.linvel());
    this.world.step();
    for (let i = 0; i < 4; i++) {
      const ground = this.vehicle.wheelGroundObject(i);
      const kind = ground && this.surfaceKinds.get(ground.handle);
      if (kind) this.visitedSurfaces.add(kind);
    }
    this.ticks++;
    this.time = this.ticks * DT;
    const impact = before.sub(this.body.linvel()).length();
    if (impact > 10 && this.time - this.lastImpact > 0.2) {
      this.lastImpact = this.time;
      this.damage("bumper-front", (impact - 10) * 4, new Vector3(0, 0, 0.15));
      this.damage("hood", (impact - 10) * 2, new Vector3(0, 0.2, 0.6));
      this.damageEvents.push({
        source: "collision",
        part: "hood",
        time: this.time,
      });
    }
    if (this.stage !== "lab")
      for (const h of HAZARDS)
        if (
          this.touches(h) &&
          this.time - (this.cooldown.get(h.id) ?? -1) > 0.15
        ) {
          this.cooldown.set(h.id, this.time);
          const targets =
            h.kind === "spikes"
              ? ["wheel-fl", "wheel-fr", "chassis-front"]
              : h.kind === "lava"
                ? PARTS.map((p) => p.id)
                : h.kind === "hammer"
                  ? ["door-left", "hood", "bumper-front"]
                  : ["hood", "roof", "door-left", "door-right"];
          for (const part of targets)
            this.damage(
              part,
              h.kind === "fire" ? 18 : h.kind === "lava" ? 80 : 120,
            );
          this.damageEvents.push({
            source: h.kind,
            part: targets[0],
            time: this.time,
          });
        }
    if (this.stage !== "lab")
      for (const lava of arenaSolids().filter((s) => s.kind === "lava")) {
        const p = this.body.translation();
        if (
          Math.abs(p.x - lava.x) < lava.w / 2 + 1 &&
          Math.abs(p.z - lava.z) < lava.d / 2 + 1 &&
          p.y < -3.5 &&
          this.time - (this.cooldown.get(lava.id) ?? -1) > 0.15
        ) {
          this.cooldown.set(lava.id, this.time);
          for (const part of PARTS) this.damage(part.id, 80);
          this.damageEvents.push({
            source: "lava",
            part: "chassis-front",
            time: this.time,
          });
        }
      }
    if (this.damageEvents.length > 64)
      this.damageEvents.splice(0, this.damageEvents.length - 64);
    const route = ROUTES.find((r) => r.id === this.stage),
      p = this.body.translation();
    if (route) {
      const contacts = wheelPositions.filter((_, i) =>
        this.vehicle.wheelIsInContact(i),
      ).length;
      if (p.z > 13 && p.z < route.gapEnd && contacts === 0)
        this.airborneTicks++;
      if (p.z > route.gapEnd + 3 && contacts >= 2 && this.airborneTicks > 20)
        this.landed = true;
      if (
        this.status === "driving" &&
        this.landed &&
        p.z >= route.finish &&
        Math.abs(p.x - route.x) < 6 &&
        contacts >= 2
      )
        this.status = "finished";
      if (this.status === "driving" && p.y < -7) this.status = "wrecked";
    }
  }
  run(seconds: number, input: Input = {}) {
    for (let i = 0; i < Math.round(seconds / DT); i++) this.step(input);
  }
  private touches(h: Hazard) {
    const p = new Vector3()
      .copy(this.body.translation())
      .sub(new Vector3(h.x, h.y, h.z));
    if (h.kind === "hammer") {
      p.applyAxisAngle(new Vector3(0, 0, 1), -hammerAngle(this.time));
      return Math.abs(p.x) < 6.8 && Math.abs(p.y) < 1.8 && Math.abs(p.z) < 2;
    }
    return (
      Math.abs(p.x) < 6 &&
      Math.abs(p.z) < (h.kind === "lava" ? 3 : 1.5) &&
      Math.abs(p.y) < (h.kind === "fire" ? 2.4 : 2)
    );
  }
  damage(id: string, amount: number, point = new Vector3(0.2, 0.2, 0.2)) {
    const state = this.parts.get(id);
    if (!state || !Number.isFinite(amount) || amount < 0)
      throw new RangeError("Invalid part or damage");
    if (state.health === 0 || amount === 0) return;
    state.health = Math.max(0, state.health - amount);
    const budget = Math.max(
      0,
      0.65 - state.dents.reduce((sum, d) => sum + d.strength, 0),
    );
    if (budget > 0 && state.dents.length < 8)
      state.dents.push({
        point: point.clone(),
        strength: Math.min(0.5, amount / 200, budget),
      });
    if (state.health > 0) return;
    const def = PARTS.find((p) => p.id === id)!;
    const q = new Quaternion().copy(this.body.rotation());
    const pos = new Vector3(...def.pos)
      .applyQuaternion(q)
      .add(this.body.translation());
    const velocity = this.body.velocityAtPoint(pos);
    if (state.collider) this.world.removeCollider(state.collider, true);
    state.collider = undefined;
    state.body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos.x, pos.y, pos.z)
        .setRotation(q)
        .setLinvel(velocity.x, velocity.y, velocity.z)
        .setAngvel(this.body.angvel())
        .setCcdEnabled(true),
    );
    const shape = id.startsWith("wheel")
      ? RAPIER.ColliderDesc.ball(1)
      : RAPIER.ColliderDesc.cuboid(
          def.size[0] / 2,
          def.size[1] / 2,
          def.size[2] / 2,
        );
    this.world.createCollider(
      shape.setMass(def.mass).setFriction(0.7),
      state.body,
    );
    const wheel = PARTS.slice(2, 6).findIndex((p) => p.id === id);
    if (wheel >= 0) {
      this.vehicle.setWheelMaxSuspensionForce(wheel, 0);
      this.vehicle.setWheelSuspensionStiffness(wheel, 0);
      this.vehicle.setWheelFrictionSlip(wheel, 0);
      this.vehicle.setWheelBrake(wheel, 0);
    }
    if (id === "chassis-front") {
      for (const p of PARTS) if (p.id !== id) this.damage(p.id, 10000);
      this.status = "wrecked";
    }
    if (id === "chassis-rear")
      for (const p of PARTS)
        if ("parent" in p && p.parent === id) this.damage(p.id, 10000);
  }
  snapshot() {
    const p = this.body.translation(),
      v = this.body.linvel();
    return {
      position: { x: p.x, y: p.y, z: p.z },
      velocity: { x: v.x, y: v.y, z: v.z },
      forward: new Vector3(0, 0, 1)
        .applyQuaternion(new Quaternion().copy(this.body.rotation()))
        .toArray(),
      wheelContacts: wheelPositions.filter((_, i) =>
        this.vehicle.wheelIsInContact(i),
      ).length,
      dragonFiring: dragonFiring(this.time),
      speed: Math.hypot(v.x, v.z),
      signedSpeed: new Vector3(0, 0, 1)
        .applyQuaternion(new Quaternion().copy(this.body.rotation()))
        .dot(v),
      upDot: new Vector3(0, 1, 0).applyQuaternion(
        new Quaternion().copy(this.body.rotation()),
      ).y,
      time: this.time,
      tuning: { ...this.tuning },
      steeringAngle: this.steeringAngle,
      boostTicks: this.boostTicks,
      loopApex: this.loopApex,
      loopCompleted: this.loopCompleted,
      integrity:
        [...this.parts.values()].reduce((sum, p) => sum + p.health, 0) /
        PARTS.reduce((sum, p) => sum + p.hp, 0),
      ticks: this.ticks,
      stage: this.stage,
      airborneTicks: this.airborneTicks,
      landed: this.landed,
      status: this.status,
      damageEvents: [...this.damageEvents],
      surfaces: [...this.visitedSurfaces],
      parts: Object.fromEntries(
        [...this.parts].map(([id, s]) => [
          id,
          {
            health: s.health,
            detached: !!s.body,
            dents: s.dents.length,
            position: s.body ? { ...s.body.translation() } : null,
          },
        ]),
      ),
    };
  }
  dispose() {
    this.world.free();
  }
}
