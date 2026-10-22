import { courseSolids, courseHazards, courseProps } from "./course";
import { getTrack, type TrackId } from "./tracks";
import { TrackRun } from "./track-run";
import { Destructibles } from "./destructibles";
import RAPIER from "@dimforge/rapier3d-compat";
import { Quaternion, Vector3 } from "three";
import { DT } from "./clock";
import { ROUTES, routeSolids } from "./routes";
import { PARTS, type PartState } from "./damage";
import { HAZARDS, hammerAngle, hazardActive, type Hazard } from "./hazards";
import { arenaSolids } from "./arena";
import { DEFAULT_TUNING, validateTuning, type Tuning } from "./tuning";
import {
  LOOP,
  dragonFlame,
  dragonExposure,
  loopSolids,
  loopScenerySolids,
} from "./loop";
import { hammerStrike, type HammerImpact } from "./hammer-impact";
export type Stage =
  | "easy"
  | "medium"
  | "hard"
  | "lab"
  | Exclude<TrackId, "triple-loop">;
export type Input = {
  throttle?: number;
  brake?: number;
  steer?: number;
  handbrake?: number;
};
export const wheelPositions = [
  new Vector3(1.65, -0.35, 1.65),
  new Vector3(-1.65, -0.35, 1.65),
  new Vector3(1.65, -0.35, -1.65),
  new Vector3(-1.65, -0.35, -1.65),
];
let ready: Promise<void> | undefined;
export function initPhysics() {
  return (ready ??= RAPIER.init());
}
export class Simulation {
  world!: RAPIER.World;
  props!: Destructibles;
  private events!: RAPIER.EventQueue;
  body!: RAPIER.RigidBody;
  vehicle!: RAPIER.DynamicRayCastVehicleController;
  stage: Stage;
  trackRun?: TrackRun;
  courseTrack?: ReturnType<typeof getTrack>;
  activeHazards: Hazard[] = [];
  time = 0;
  ticks = 0;
  airborneTicks = 0;
  landed = false;
  status: "driving" | "finished" | "wrecked" = "driving";
  parts = new Map<string, PartState>();
  // The view supplies complete model bounds, including cage, arches and tread.
  // Headless physics falls back to the matching collider dimensions.
  partBounds = new Map(
    PARTS.map((def) => [
      def.id,
      {
        min: new Vector3(...def.size).multiplyScalar(-0.5),
        max: new Vector3(...def.size).multiplyScalar(0.5),
      },
    ]),
  );
  private lastImpact = -1;
  damageEvents: { source: string; part: string; time: number }[] = [];
  private cooldown = new Map<string, number>();
  hazardBodies = new Map<string, RAPIER.RigidBody>();
  hammerImpacts: HammerImpact[] = [];
  private hammerContacts = new Set<string>();
  private hammerColliderOwners = new Map<number, string>();
  private surfaceKinds = new Map<number, string>();
  private visitedSurfaces = new Set<string>();
  previousPosition = new Vector3();
  previousRotation = new Quaternion();
  tuning = { ...DEFAULT_TUNING };
  fireDamageTaken = 0;
  smolderDamageTaken = 0;
  smolderRemaining = 0;
  private smolderTriggered = false;
  inFlames = false;
  get scorch() {
    return Math.min(1, this.fireDamageTaken + this.smolderDamageTaken);
  }
  get smoking() {
    return this.inFlames || this.smolderRemaining > 1e-9;
  }
  steeringAngle = 0;
  boostTicks = 0;
  hammerPhase = 0;
  skidStrokes: { wheel: number; points: Vector3[] }[] = [];
  private activeSkids = new Map<number, number>();
  loopApex = false;
  loopCompleted = false;
  setTuning(values: Partial<Tuning>) {
    Object.assign(this.tuning, validateTuning(values));
    if (this.world)
      this.world.gravity = { x: 0, y: -9.81 * this.tuning.gravity, z: 0 };
  }
  constructor(stage: Stage = "lab") {
    this.stage = stage;
    this.reset(stage);
  }
  startTrack(id: TrackId, lane: "easy" | "medium" | "hard" = "easy") {
    const track = getTrack(id);
    this.reset(track.legacy ? lane : (id as Stage));
    if (!track.legacy) {
      this.trackRun = new TrackRun(track);
      return;
    }
    const x = ROUTES.find((r) => r.id === lane)!.x;
    this.trackRun = new TrackRun(
      {
        ...track,
        checkpoints: track.checkpoints.map((g) => ({ ...g, x: g.x + x + 24 })),
      },
      lane,
    );
  }
  reset(stage: Stage = this.stage) {
    this.trackRun = undefined;
    this.courseTrack = ["lab", "easy", "medium", "hard"].includes(stage)
      ? undefined
      : getTrack(stage);
    this.activeHazards = this.courseTrack
      ? courseHazards(this.courseTrack)
      : stage === "lab"
        ? []
        : HAZARDS;
    this.world?.free();
    this.events?.free();
    this.events = new RAPIER.EventQueue(true);
    this.stage = stage;
    this.time = 0;
    this.ticks = 0;
    this.airborneTicks = 0;
    this.landed = false;
    this.status = "driving";
    this.fireDamageTaken = 0;
    this.smolderDamageTaken = 0;
    this.smolderRemaining = 0;
    this.smolderTriggered = false;
    this.inFlames = false;
    this.steeringAngle = 0;
    this.boostTicks = 0;
    this.hammerPhase = 0;
    this.skidStrokes = [];
    this.activeSkids.clear();
    this.loopApex = false;
    this.loopCompleted = false;
    this.world = new RAPIER.World({
      x: 0,
      y: -9.81 * this.tuning.gravity,
      z: 0,
    });
    this.world.timestep = DT;
    this.parts.clear();
    this.lastImpact = -1;
    this.damageEvents = [];
    this.cooldown.clear();
    this.hazardBodies.clear();
    this.hammerImpacts = [];
    this.hammerContacts.clear();
    this.hammerColliderOwners.clear();
    this.surfaceKinds.clear();
    this.visitedSurfaces.clear();
    if (stage === "lab")
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(200, 0.5, 300)
          .setTranslation(0, -0.5, 0)
          .setFriction(1),
      );
    else
      for (const s of this.courseTrack
        ? courseSolids(this.courseTrack)
        : [
            ...routeSolids(),
            ...arenaSolids(),
            ...loopSolids(),
            ...loopScenerySolids(),
          ]) {
        const collider = this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(s.w / 2, s.h / 2, s.d / 2)
            .setTranslation(s.x, s.y, s.z)
            .setRotation(
              new Quaternion()
                .setFromAxisAngle(new Vector3(1, 0, 0), s.angle ?? 0)
                .multiply(
                  new Quaternion().setFromAxisAngle(
                    new Vector3(0, 1, 0),
                    "yaw" in s ? (s.yaw ?? 0) : 0,
                  ),
                ),
            )
            .setFriction(1)
            .setSensor(s.kind === "lava"),
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
    if (this.courseTrack) {
      const spawn = this.courseTrack.spawn;
      this.body.setTranslation(spawn, true);
      this.body.setRotation(
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), spawn.yaw),
        true,
      );
    }
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
    this.props = new Destructibles(
      this.world,
      stage === "lab",
      this.courseTrack ? courseProps(this.courseTrack) : undefined,
    );
    if (stage !== "lab")
      for (const h of this.activeHazards) {
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
        if (h.kind === "hammer") {
          const rotor = this.hazardBodies.get(h.id)!;
          for (const side of [-1, 1])
            for (const dir of [
              new Vector3(0, 1, 0),
              new Vector3(0, -1, 0),
              new Vector3(0, 0, 1),
              new Vector3(0, 0, -1),
            ]) {
              this.world.createCollider(
                RAPIER.ColliderDesc.cone(0.65, 0.45)
                  .setTranslation(side * 3.6, dir.y * 1.4, dir.z * 1.4)
                  .setRotation(
                    new Quaternion().setFromUnitVectors(
                      new Vector3(0, 1, 0),
                      dir,
                    ),
                  ),
                rotor,
              );
            }
        }
        if (h.kind === "fire")
          this.world.createCollider(
            RAPIER.ColliderDesc.cuboid(6, 0.125, 0.3)
              .setTranslation(h.x, h.y - 1.2, h.z)
              .setFriction(0.6),
          );
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
  private hammerHooks: RAPIER.PhysicsHooks = {
    filterContactPair: (a, b) => {
      const id =
        this.hammerColliderOwners.get(a) ?? this.hammerColliderOwners.get(b);
      // Keep detecting the contact episode, but let the launched truck and debris
      // clear the new perpendicular spikes without being caught by the same head.
      return id && this.time - (this.cooldown.get(id) ?? -1) < 0.45
        ? RAPIER.SolverFlags.EMPTY
        : RAPIER.SolverFlags.COMPUTE_IMPULSE;
    },
    filterIntersectionPair: () => true,
  };
  step(input: Input = {}) {
    this.previousPosition.copy(this.body.translation());
    this.previousRotation.copy(this.body.rotation());
    this.inFlames = false;
    const throttle = Math.max(-1, Math.min(1, input.throttle ?? 0)),
      brake = Math.max(0, Math.min(1, input.brake ?? 0)),
      handbrake = Math.max(0, Math.min(1, input.handbrake ?? 0)),
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
    const dragonIntensity =
      routeX === undefined ? 0 : dragonExposure(this.time, position.x - routeX);
    if (
      onApproach &&
      dragonIntensity > 0 &&
      position.y < 5 &&
      LOOP.dragonZ.some((z) => Math.abs(position.z - z) < 3)
    ) {
      this.inFlames = true;
      for (const part of PARTS)
        this.fireDamage(
          part.id,
          (part.hp * DT * this.tuning.dragonDamage * dragonIntensity) / 3,
        );
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
    const attachedWheels = wheelPositions.map(
      (_, i) => !this.parts.get(PARTS[i + 2].id)!.body,
    );
    const contactCount = attachedWheels.filter(
      (attached, i) => attached && this.vehicle.wheelIsInContact(i),
    ).length;
    const grounded = contactCount > 0;
    const driveShare = attachedWheels.filter(Boolean).length / 4;
    const braking =
      Math.max(brake, handbrake * this.tuning.handbrakePower) *
      this.tuning.brakePower;
    if (
      grounded &&
      handbrake === 0 &&
      this.parts.get("chassis-rear")!.health > 0 &&
      this.parts.get("chassis-front")!.health > 0
    ) {
      const taper = Math.max(
        0,
        1 -
          Math.max(0, longitudinal * Math.sign(throttle)) /
            ((throttle < 0 ? 8 : 25) * this.tuning.topSpeed),
      );
      // Extra arcade motor force acts through the center of mass to avoid a
      // tuning slider turning increased acceleration into an instant wheelie.
      this.body.applyImpulse(
        forward
          .clone()
          .multiplyScalar(
            throttle *
              driveShare *
              (this.tuning.acceleration - 1) *
              12 *
              taper *
              this.body.mass() *
              DT,
          ),
        true,
      );
    }
    const steeringDelta =
      (steer * this.tuning.maxSteeringAngle * Math.PI) / 180 -
      this.steeringAngle;
    this.steeringAngle +=
      Math.sign(steeringDelta) *
      Math.min(Math.abs(steeringDelta), 0.9 * this.tuning.steeringRate * DT);
    // Match the actual chassis turn to the grounded front tire angle. Rapier's
    // limited lateral grip alone understeers against the powerful arcade motor.
    const frontGrip =
      [0, 1].filter(
        (i) =>
          !this.parts.get(PARTS[i + 2].id)!.body &&
          this.vehicle.wheelIsInContact(i),
      ).length / 2;
    const localUp = new Vector3(0, 1, 0).applyQuaternion(
      new Quaternion().copy(this.body.rotation()),
    );
    if (frontGrip > 0 && localUp.y > 0.7 && !onLoop) {
      const yaw = new Vector3().copy(this.body.angvel()).dot(localUp);
      const targetYaw =
        (longitudinal *
          Math.sin(this.steeringAngle) *
          this.tuning.turningPower) /
        3.3;
      const delta = (targetYaw - yaw) * Math.min(1, 18 * DT) * frontGrip;
      this.body.applyTorqueImpulse(
        localUp.clone().multiplyScalar(delta * this.body.principalInertia().y),
        true,
      );
      const lateral = new Vector3(1, 0, 0).applyQuaternion(
        new Quaternion().copy(this.body.rotation()),
      );
      lateral.y = 0;
      lateral.normalize();
      const slip = lateral.dot(this.body.linvel());
      this.body.applyImpulse(
        lateral.multiplyScalar(
          -slip * this.body.mass() * Math.min(1, 6 * DT) * frontGrip,
        ),
        true,
      );
    }
    // Rolling resistance only acts while grounded and coasting, never in flight.
    if (throttle === 0 && brake === 0 && handbrake === 0 && grounded) {
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
    // Rapier wheel brakes take an impulse per tick. Multiplying that impulse
    // at ground level makes the tall truck somersault. Keep the progressive
    // four-wheel service brake and apply additional tuned deceleration at COM.
    // Clamp to current speed so even maximum handbrake cannot reverse motion.
    if (grounded && braking > 0) {
      const horizontal = new Vector3(speed.x, 0, speed.z);
      const magnitude = horizontal.length();
      const extraDeceleration = Math.min(60, Math.max(0, braking - 1) * 4);
      if (magnitude > 0)
        this.body.applyImpulse(
          horizontal.multiplyScalar(
            (-Math.min(magnitude, (extraDeceleration * DT * contactCount) / 4) *
              this.body.mass()) /
              magnitude,
          ),
          true,
        );
      // Brake-only pitch/roll damping preserves steering, airborne tumbles,
      // hammer launches, and intentional inverted driving on the loop.
      if (contactCount >= 2 && localUp.y > 0.7 && !onLoop) {
        const rotation = new Quaternion().copy(this.body.rotation());
        const omega = new Vector3()
          .copy(this.body.angvel())
          .applyQuaternion(rotation.clone().invert());
        const correction = localUp
          .clone()
          .cross(new Vector3(0, 1, 0))
          .applyQuaternion(rotation.clone().invert());
        const inertia = this.body.principalInertia();
        this.body.applyTorqueImpulse(
          new Vector3(
            (correction.x * 10 - omega.x * 8) * inertia.x * DT,
            0,
            (correction.z * 10 - omega.z * 8) * inertia.z * DT,
          ).applyQuaternion(rotation),
          true,
        );
      }
    }
    // Equal motor force at all four wheels: both axles drive in either direction.
    // Detached wheels receive neither drive nor brake impulses.
    for (let i = 0; i < 4; i++) {
      const attached = attachedWheels[i];
      const powered =
        this.parts.get("chassis-rear")!.health > 0 &&
        this.parts.get("chassis-front")!.health > 0;
      this.vehicle.setWheelEngineForce(
        i,
        attached && powered && handbrake === 0
          ? throttle *
              (throttle < 0 ? 6500 : 11000) *
              Math.max(
                0,
                1 -
                  Math.max(0, longitudinal * Math.sign(throttle)) /
                    ((throttle < 0 ? 8 : 25) * this.tuning.topSpeed),
              )
          : 0,
      );
      this.vehicle.setWheelBrake(i, attached ? Math.min(1, braking) * 30 : 0);
      // Under throttle, lateral slip leaves rubber and allows a controlled power slide.
      this.vehicle.setWheelFrictionSlip(
        i,
        attached
          ? Math.abs(throttle) > 0.2 && Math.abs(steer) > 0.4
            ? 1.35
            : 2.5
          : 0,
      );
      this.vehicle.setWheelSteering(i, i < 2 ? this.steeringAngle : 0);
    }
    // Suspension only uses fixed surfaces. A rotating hammer must not become
    // driveable ground and inject suspension impulses into a passing tire.
    this.vehicle.updateVehicle(
      DT,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC |
        RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC |
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
    );
    this.hammerPhase += hammerAngle(DT) * this.tuning.hammerSpeed;
    for (const b of this.hazardBodies.values())
      b.setNextKinematicRotation(
        new Quaternion().setFromAxisAngle(
          new Vector3(0, 0, 1),
          this.hammerPhase,
        ),
      );
    const before = new Vector3().copy(this.body.linvel());
    for (const [id, rotor] of this.hazardBodies)
      for (let i = 0; i < rotor.numColliders(); i++) {
        const collider = rotor.collider(i);
        if (!this.hammerColliderOwners.has(collider.handle)) {
          collider.setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS);
          this.hammerColliderOwners.set(collider.handle, id);
        }
      }
    this.updateLava();
    this.props.captureVelocities();
    this.world.step(this.events, this.hammerHooks);
    for (let i = 0; i < 4; i++) {
      const ground = this.vehicle.wheelGroundObject(i);
      const kind = ground && this.surfaceKinds.get(ground.handle);
      if (kind) this.visitedSurfaces.add(kind);
    }
    this.ticks++;
    this.time = this.ticks * DT;
    const impact = before.distanceTo(this.body.linvel());
    const hammerHit = this.resolveHammerImpacts(before);
    this.resolveLanding(before, impact);
    this.recordSkids(throttle, steer);
    if (!hammerHit && impact > 10 && this.time - this.lastImpact > 0.2) {
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
      for (const h of this.activeHazards)
        if (
          h.kind !== "hammer" &&
          h.kind !== "lava" &&
          hazardActive(h, this.time) &&
          this.touches(h)
        ) {
          if (h.kind === "fire") this.inFlames = true;
          if (this.time - (this.cooldown.get(h.id) ?? -1) <= 0.15) continue;
          this.cooldown.set(h.id, this.time);
          const targets =
            h.kind === "spikes"
              ? ["wheel-fl", "wheel-fr", "chassis-front"]
              : ["hood", "roof", "door-left", "door-right"];
          for (const part of targets)
            if (h.kind === "fire") this.fireDamage(part, 18);
            else this.damage(part, 120);
          this.damageEvents.push({
            source: h.kind,
            part: targets[0],
            time: this.time,
          });
        }
    const barrelExposure = this.props.update(
      this.body,
      this.parts,
      wheelPositions,
      before,
      this.time,
    );
    if (barrelExposure > 0) {
      this.inFlames = true;
      for (const part of PARTS)
        this.fireDamage(part.id, part.hp * 0.01 * DT * barrelExposure);
    }
    this.updateSmolder();
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
    this.trackRun?.step(
      DT,
      this.previousPosition,
      this.body.translation(),
      this.status === "wrecked" ? 0 : this.remainingHealth() / this.fullHealth,
      { landed: this.landed, loopCompleted: this.loopCompleted },
    );
  }
  run(seconds: number, input: Input = {}) {
    for (let i = 0; i < Math.round(seconds / DT); i++) this.step(input);
  }
  private updateLava() {
    if (this.stage === "lab") return;
    const pools = (
      this.courseTrack ? courseSolids(this.courseTrack) : arenaSolids()
    ).filter((s) => s.kind === "lava");
    for (const def of PARTS) {
      const state = this.parts.get(def.id)!;
      if (!state.lava) {
        const q = new Quaternion().copy((state.body ?? this.body).rotation());
        const position = state.body
          ? new Vector3().copy(state.body.translation())
          : new Vector3(...def.pos)
              .applyQuaternion(q)
              .add(this.body.translation());
        // Project the complete, potentially asymmetric part bounds onto world Y.
        const bounds = this.partBounds.get(def.id)!;
        let minY = 0,
          maxY = 0;
        for (let axis = 0; axis < 3; axis++) {
          const y = new Vector3().setComponent(axis, 1).applyQuaternion(q).y;
          minY +=
            y *
            (y >= 0
              ? bounds.min.getComponent(axis)
              : bounds.max.getComponent(axis));
          maxY +=
            y *
            (y >= 0
              ? bounds.max.getComponent(axis)
              : bounds.min.getComponent(axis));
        }
        const pool = pools.find(
          (p) =>
            Math.abs(position.x - p.x) < p.w / 2 &&
            Math.abs(position.z - p.z) < p.d / 2 &&
            position.y + minY <= p.y + p.h / 2 &&
            position.y + maxY >= p.y - p.h / 2,
        );
        if (!pool) continue;
        // First contact destroys/detaches the part. It retains its actual entry
        // orientation, then viscous lava arrests its fall instead of bouncing it.
        this.damage(def.id, 10000);
        const body = state.body!;
        body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        for (let i = 0; i < body.numColliders(); i++)
          body.collider(i).setSensor(true);
        state.lava = {
          entered: this.time,
          progress: 0,
          surface: pool.y + pool.h / 2,
          startY: position.y,
          endY: pool.y + pool.h / 2 - maxY - 0.08,
          scorch: 0,
        };
        this.damageEvents.push({
          source: "lava",
          part: def.id,
          time: this.time,
        });
      }
      const lava = state.lava;
      lava.progress = Math.min(1, (this.time + DT - lava.entered) / 2);
      lava.scorch = Math.min(1, lava.progress * 1.4);
      const position = state.body!.translation();
      state.body!.setNextKinematicTranslation({
        x: position.x,
        z: position.z,
        y: lava.startY + (lava.endY - lava.startY) * lava.progress,
      });
    }
  }
  private recordSkids(throttle: number, steer: number) {
    const q = new Quaternion().copy(this.body.rotation());
    for (let i = 0; i < 4; i++) {
      const point = this.vehicle.wheelContactPoint(i);
      const ground = this.vehicle.wheelGroundObject(i);
      const velocity = point
        ? this.body.velocityAtPoint(point)
        : this.body.linvel();
      const lateral = new Vector3(1, 0, 0).applyQuaternion(q).dot(velocity);
      const slipping =
        Math.abs(throttle) > 0.2 &&
        Math.abs(steer) > 0.4 &&
        Math.abs(lateral) > 0.4 &&
        Math.hypot(velocity.x, velocity.z) > 2 &&
        !this.parts.get(PARTS[i + 2].id)!.body &&
        this.vehicle.wheelIsInContact(i) &&
        point &&
        ground &&
        (this.vehicle.wheelContactNormal(i)?.y ?? 0) > 0.5;
      if (!slipping) {
        this.activeSkids.delete(i);
        continue;
      }
      let index = this.activeSkids.get(i);
      if (index === undefined) {
        index = this.skidStrokes.length;
        this.activeSkids.set(i, index);
        this.skidStrokes.push({ wheel: i, points: [] });
      }
      const points = this.skidStrokes[index].points;
      const p = new Vector3().copy(point).add(new Vector3(0, 0.025, 0));
      if (!points.length || points[points.length - 1].distanceTo(p) > 0.16)
        points.push(p);
    }
  }
  private resolveLanding(incoming: Vector3, impact: number) {
    if (
      incoming.y > -2 ||
      impact < 2 ||
      this.time - (this.cooldown.get("landing") ?? -1) < 0.8
    )
      return;
    const q = new Quaternion().copy(this.body.rotation());
    const up = new Vector3(0, 1, 0).applyQuaternion(q);
    const left = new Vector3(1, 0, 0).applyQuaternion(q);
    const forward = new Vector3(0, 0, 1).applyQuaternion(q);
    const contacts = wheelPositions.filter((_, i) =>
      this.vehicle.wheelIsInContact(i),
    ).length;
    if (
      up.y > -0.45 &&
      Math.abs(left.y) < 0.55 &&
      Math.abs(forward.y) < 0.55 &&
      contacts > 0
    )
      return;
    let contact = false;
    for (const part of this.parts.values())
      if (part.collider) {
        this.world.contactPairsWith(part.collider, (other) => {
          if (other.parent() && !other.parent()!.isFixed()) return;
          this.world.contactPair(part.collider!, other, (manifold) => {
            for (let j = 0; j < manifold.numContacts(); j++)
              if (
                manifold.contactDist(j) < 0.01 &&
                Math.abs(manifold.normal().y) > 0.4
              )
                contact = true;
          });
        });
      }
    if (!contact) return;
    this.cooldown.set("landing", this.time);
    const roof = up.y < -0.45;
    const sideLanding = !roof && Math.abs(left.y) >= 0.55;
    const side = left.y < 0 ? "left" : "right";
    const target = roof
      ? "roof"
      : sideLanding
        ? `door-${side}`
        : forward.y < -0.55
          ? "bumper-front"
          : forward.y > 0.55
            ? "bumper-rear"
            : "hood";
    const forced = [target];
    if (sideLanding && incoming.y < -7)
      forced.push(side === "left" ? "wheel-fl" : "wheel-fr");
    if (sideLanding && incoming.y < -11)
      forced.push(side === "left" ? "wheel-rl" : "wheel-rr");
    const total = PARTS.reduce((n, p) => n + p.hp, 0);
    let budget = total * (roof ? 0.7 : 0.25);
    for (const id of forced) {
      budget -= this.parts.get(id)!.health;
      this.damage(id, 10000);
    }
    const remaining = [...this.parts.values()].reduce(
      (n, p) => n + p.health,
      0,
    );
    const ratio = Math.min(1, Math.max(0, budget) / remaining);
    const amounts = [...this.parts].map(
      ([id, p]) => [id, p.health * ratio] as const,
    );
    for (const [id, amount] of amounts) this.damage(id, amount);
    this.damageEvents.push({
      source: roof
        ? "roof-landing"
        : sideLanding
          ? "side-landing"
          : "body-landing",
      part: target,
      time: this.time,
    });
  }
  private resolveHammerImpacts(incoming: Vector3) {
    const attached = new Map(
      [...this.parts]
        .filter(([, p]) => !!p.collider)
        .map(([id, p]) => [p.collider!.handle, id]),
    );
    const contacts = new Set<string>();
    const strikes: {
      id: string;
      part: string;
      point: Vector3;
      normal: Vector3;
      radius: Vector3;
    }[] = [];
    for (const [id, rotor] of this.hazardBodies) {
      let best: (typeof strikes)[number] | undefined;
      for (let i = 0; i < rotor.numColliders(); i++) {
        const hammer = rotor.collider(i);
        this.world.contactPairsWith(hammer, (other) => {
          const part = attached.get(other.handle);
          if (!part) return;
          this.world.contactPair(hammer, other, (manifold, flipped) => {
            for (let j = 0; j < manifold.numContacts(); j++) {
              if (manifold.contactDist(j) > 0.005) continue;
              const local = flipped
                ? manifold.localContactPoint2(j)
                : manifold.localContactPoint1(j);
              if (!local) continue;
              const point = new Vector3()
                .copy(local)
                .applyQuaternion(new Quaternion().copy(hammer.rotation()))
                .add(hammer.translation());
              const radius = point.clone().sub(rotor.translation());
              const normal = new Vector3()
                .copy(manifold.normal())
                .multiplyScalar(flipped ? -1 : 1);
              if (!best || radius.lengthSq() > best.radius.lengthSq())
                best = { id, part, point, radius, normal };
            }
          });
        });
      }
      if (best) {
        contacts.add(id);
        if (
          !this.hammerContacts.has(id) &&
          this.time - (this.cooldown.get(id) ?? -1) > 0.45
        )
          strikes.push(best);
      }
    }
    this.hammerContacts = contacts;
    for (const hit of strikes) {
      if (this.parts.get("chassis-front")!.health <= 0) continue;
      this.cooldown.set(hit.id, this.time);
      const strike = hammerStrike(hit.radius, hit.normal, incoming);
      // Apply before breakage so newly freed parts inherit the launch and spin.
      this.body.applyImpulseAtPoint(
        strike.deltaVelocity.clone().multiplyScalar(this.body.mass()),
        hit.point,
        true,
      );
      const q = new Quaternion().copy(this.body.rotation()).invert();
      const local = hit.point
        .clone()
        .sub(this.body.translation())
        .applyQuaternion(q);
      const nearby = PARTS.filter(
        (p) => p.id !== hit.part && !this.parts.get(p.id)!.body,
      )
        .map((p) => ({ p, distance: new Vector3(...p.pos).distanceTo(local) }))
        .filter((p) => p.distance < 3.5)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 2);
      for (const [id, amount] of [
        [hit.part, strike.damage],
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
        this.damage(id, amount, dent);
      }
      this.damageEvents.push({
        source: "hammer",
        part: hit.part,
        time: this.time,
      });
      this.hammerImpacts.push({
        id: hit.id,
        part: hit.part,
        time: this.time,
        point: hit.point.toArray(),
        deltaVelocity: strike.deltaVelocity.toArray(),
        damage: strike.damage,
      });
      if (this.hammerImpacts.length > 16) this.hammerImpacts.shift();
    }
    return strikes.length > 0;
  }
  private touches(h: Hazard) {
    const p = new Vector3()
      .copy(this.body.translation())
      .sub(new Vector3(h.x, h.y, h.z));
    return (
      Math.abs(p.x) < 6 &&
      Math.abs(p.z) < (h.kind === "lava" ? 3 : 1.5) &&
      Math.abs(p.y) < (h.kind === "fire" ? 2.4 : 2)
    );
  }
  /** Only integrity actually removed by flames counts toward ignition and soot. */
  fireDamage(id: string, amount: number) {
    const before = this.remainingHealth();
    this.damage(id, amount);
    this.fireDamageTaken += (before - this.remainingHealth()) / this.fullHealth;
  }
  private readonly fullHealth = PARTS.reduce((sum, p) => sum + p.hp, 0);
  private remainingHealth() {
    return [...this.parts.values()].reduce((sum, p) => sum + p.health, 0);
  }
  private updateSmolder() {
    if (!this.smolderTriggered && this.fireDamageTaken > 0.5 + 1e-9) {
      this.smolderTriggered = true;
      this.smolderRemaining = 0.25;
      return;
    }
    if (this.smolderRemaining <= 1e-9) {
      this.smolderRemaining = 0;
      return;
    }
    const fraction = Math.min(this.smolderRemaining, 0.05 * DT);
    // Distribute a fixed fraction of ORIGINAL integrity across surviving parts.
    // Five seconds consumes the one-shot budget even if the truck is already wrecked.
    const health = this.remainingHealth();
    const ratio =
      health > 0 ? Math.min(1, (fraction * this.fullHealth) / health) : 0;
    const amounts = [...this.parts].map(
      ([id, p]) => [id, p.health * ratio] as const,
    );
    for (const [id, amount] of amounts) this.damage(id, amount);
    this.smolderDamageTaken +=
      (health - this.remainingHealth()) / this.fullHealth;
    this.smolderRemaining = Math.max(0, this.smolderRemaining - fraction);
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
  snapshot(includeSkidPoints = true) {
    const p = this.body.translation(),
      v = this.body.linvel();
    return {
      run: this.trackRun?.snapshot() ?? null,
      position: { x: p.x, y: p.y, z: p.z },
      velocity: { x: v.x, y: v.y, z: v.z },
      forward: new Vector3(0, 0, 1)
        .applyQuaternion(new Quaternion().copy(this.body.rotation()))
        .toArray(),
      wheelContacts: wheelPositions.filter((_, i) =>
        this.vehicle.wheelIsInContact(i),
      ).length,
      dragonFiring: dragonFlame(this.time).opacity > 0,
      fireDamageTaken: this.fireDamageTaken,
      smolderDamageTaken: this.smolderDamageTaken,
      smolderRemaining: this.smolderRemaining,
      inFlames: this.inFlames,
      smoking: this.smoking,
      scorch: this.scorch,
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
      skidStrokes: (includeSkidPoints ? this.skidStrokes : []).map((s) => ({
        wheel: PARTS[s.wheel + 2].id,
        points: s.points.map((p) => p.toArray()),
      })),
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
      hammerImpacts: this.hammerImpacts.map((hit) => ({
        ...hit,
        point: [...hit.point],
        deltaVelocity: [...hit.deltaVelocity],
      })),
      surfaces: [...this.visitedSurfaces],
      props: this.props.snapshot(this.time),
      gravity: { ...this.world.gravity },
      parts: Object.fromEntries(
        [...this.parts].map(([id, s]) => [
          id,
          {
            health: s.health,
            lava: s.lava ? { ...s.lava } : null,
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
    this.events.free();
  }
}
