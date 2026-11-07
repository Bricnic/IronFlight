import R from "@dimforge/rapier3d-compat";
import { Quaternion, Vector3 } from "three";
import { DT } from "./clock";
import type { Simulation, Input } from "./simulation";
import type { CustomPrefab } from "./custom-level";

export const CAROUSEL_RADIUS = 26;
export const CAROUSEL_SLOT_RADIUS = 17;
export const CAROUSEL_SLOTS = 12;
export const CAROUSEL_OMEGA = 0.14;
export const TRAP_SLOTS = [2, 5, 9];
export const BUMPER_ARENA = { halfWidth: 32, halfDepth: 25 };
const MPH60 = 60 * 0.44704;

/** Equal-mass vehicles each lose 25% at 60 mph closing speed. Heavier cars
 * take proportionally less damage from the same reduced-mass impulse. */
export function bumperDamage(
  speed: number,
  ownMass: number,
  otherMass: number,
) {
  const impulse =
    ((ownMass * otherMass) / (ownMass + otherMass)) * Math.max(0, speed);
  return Math.min(1, (0.25 * impulse) / (ownMass * 0.5 * MPH60));
}
function randomFor(id: string) {
  let seed =
    [...id].reduce(
      (s, c) => Math.imul(s ^ c.charCodeAt(0), 16777619),
      2166136261,
    ) >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export type Carousel = {
  p: CustomPrefab;
  body: R.RigidBody;
  angle: number;
  traps: { slot: number; sensor: R.Collider; exploded: number }[];
};
export type Bumper = {
  id: string;
  arena: CustomPrefab;
  body: R.RigidBody;
  collider: R.Collider;
  health: number;
  aggressive: boolean;
  incoming: Vector3;
  touching: boolean;
  patrol: number;
  mode: "cruise" | "wander" | "ram-player" | "ram-car" | "reverse";
  targetId: string | null;
  target: { x: number; z: number };
  nextDecision: number;
  lastStrike: number;
  random: () => number;
};
export type Balloon = {
  p: CustomPrefab;
  x: number;
  y: number;
  z: number;
  nextDrop: number;
  random: () => number;
  phase: number;
};
export type Banana = {
  id: number;
  x: number;
  y: number;
  z: number;
  vy: number;
  grounded: boolean;
  groundedAt: number;
  expires: number;
  sensor: R.Collider;
  random: () => number;
};

export class Fairground {
  carousels: Carousel[] = [];
  bumpers: Bumper[] = [];
  balloons: Balloon[] = [];
  bananas: Banana[] = [];
  slipUntil = -1;
  slipSteer = 0;
  private nextSteer = 0;
  private random = randomFor("fairground-skids");
  private bananaId = 0;
  private bumperContacts = new Set<string>();
  riding: string | null = null;
  rideSeconds = 0;
  explosions = 0;
  impacts: {
    time: number;
    id: string;
    closingSpeed: number;
    playerDamage: number;
    bumperDamage: number;
  }[] = [];
  drops: { time: number; balloon: string; interval: number }[] = [];
  constructor(private sim: Simulation) {
    for (const p of sim.courseTrack?.custom?.prefabs ?? []) {
      if (p.kind === "carousel") this.addCarousel(p);
      if (p.kind === "bumper-arena") this.addArena(p);
      if (p.kind === "hot-air-balloon") {
        const random = randomFor(p.id);
        this.balloons.push({
          p,
          x: p.x,
          y: p.y ?? 42,
          z: p.z,
          nextDrop: 5 + random() * 5,
          random,
          phase: random() * 6.28,
        });
      }
    }
  }
  get slipping() {
    return this.sim.time < this.slipUntil;
  }
  deckVelocity() {
    const c = this.carousels.find((c) => c.p.id === this.riding);
    if (!c) return new Vector3();
    const p = this.sim.body.translation(),
      omega = CAROUSEL_OMEGA * this.sim.tuning.carouselSpeed;
    return new Vector3(omega * (p.z - c.p.z), 0, -omega * (p.x - c.p.x));
  }
  controls(input: Input): Input {
    if (!this.slipping) return input;
    if (this.sim.time >= this.nextSteer) {
      this.nextSteer = this.sim.time + 0.1;
      this.slipSteer =
        (this.random() < 0.5 ? -1 : 1) * (0.55 + this.random() * 0.45);
    }
    return { throttle: 0, brake: 0, handbrake: 0, steer: this.slipSteer };
  }
  private box(
    body: R.RigidBody,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    yaw = 0,
    sensor = false,
  ) {
    return this.sim.world.createCollider(
      R.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
        .setTranslation(x, y, z)
        .setRotation(
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
        )
        .setFriction(1.4)
        .setSensor(sensor),
      body,
    );
  }
  private addCarousel(p: CustomPrefab) {
    const body = this.sim.world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        p.x,
        p.y ?? 0,
        p.z,
      ),
    );
    this.sim.world.createCollider(
      R.ColliderDesc.cylinder(0.5, CAROUSEL_RADIUS)
        .setTranslation(0, 0.5, 0)
        .setFriction(1.8),
      body,
    );
    this.sim.world.createCollider(
      R.ColliderDesc.cylinder(5, 2.5).setTranslation(0, 6, 0),
      body,
    );
    const carousel: Carousel = { p, body, angle: 0, traps: [] };
    for (let i = 0; i < CAROUSEL_SLOTS; i++) {
      const a = (i * Math.PI * 2) / CAROUSEL_SLOTS;
      const sx = Math.sin(a),
        cz = Math.cos(a);
      // Wide open outer entrances, solid inner rails and two low side rails.
      this.box(body, sx * 12.5, 1.5, cz * 12.5, 7.5, 1, 0.35, a);
      for (const side of [-1, 1])
        this.box(
          body,
          sx * 17 + cz * side * 4.2,
          1.35,
          cz * 17 - sx * side * 4.2,
          0.3,
          0.7,
          8.5,
          a,
        );
      if (TRAP_SLOTS.includes(i)) {
        const sensor = this.box(
          body,
          sx * 17,
          2.2,
          cz * 17,
          6.5,
          2.3,
          6.5,
          a,
          true,
        );
        carousel.traps.push({ slot: i, sensor, exploded: -100 });
      }
    }
    this.carousels.push(carousel);
  }
  private addArena(p: CustomPrefab) {
    const base = this.sim.world.createRigidBody(
      R.RigidBodyDesc.fixed().setTranslation(p.x, p.y ?? 0, p.z),
    );
    // Four generous entrances; perimeter bumpers are real collision geometry.
    for (const side of [-1, 1]) {
      for (const offset of [-1, 1]) {
        this.box(base, side * 32, 1, offset * 17, 1, 2, 16);
        this.box(base, offset * 22, 1, side * 25, 20, 2, 1);
      }
    }
    for (let i = 0; i < 6; i++) {
      const x = p.x + ((i % 3) - 1) * 13,
        z = p.z + (i < 3 ? -10 : 10);
      const body = this.sim.world.createRigidBody(
        R.RigidBodyDesc.dynamic()
          .setTranslation(x, (p.y ?? 0) + 1.2, z)
          .enabledRotations(false, true, false)
          .setLinearDamping(0.3)
          .setAngularDamping(4)
          .setCcdEnabled(true),
      );
      const collider = this.sim.world.createCollider(
        R.ColliderDesc.cuboid(1.6, 1.15, 2.2)
          .setMass(3000)
          .setFriction(0.15)
          .setRestitution(0.6),
        body,
      );
      this.bumpers.push({
        id: `${p.id}-car-${i + 1}`,
        arena: p,
        body,
        collider,
        health: 1,
        aggressive: false,
        incoming: new Vector3(),
        touching: false,
        patrol: i * 1.047,
        mode: i % 3 === 0 ? "cruise" : i % 3 === 1 ? "ram-car" : "wander",
        targetId: `${p.id}-car-${((i + 1) % 6) + 1}`,
        target: {
          x: p.x + Math.sin(i * 2) * 23,
          z: p.z + Math.cos(i * 2) * 16,
        },
        nextDecision: 0.6 + i * 0.23,
        lastStrike: -100,
        random: randomFor(`${p.id}-car-${i + 1}`),
      });
    }
  }
  private playerIntersects(sensor: R.Collider) {
    return [...this.sim.parts.values()].some(
      (part) =>
        part.collider && this.sim.world.intersectionPair(sensor, part.collider),
    );
  }
  private backOff(car: Bumper, from: { x: number; z: number }) {
    if (car.mode === "reverse" && car.nextDecision > this.sim.time) return;
    car.mode = "reverse";
    car.aggressive = false;
    car.target = { x: from.x, z: from.z };
    car.nextDecision = this.sim.time + 0.8 + car.random() * 0.6;
  }
  before() {
    if (!this.carousels.length && !this.bumpers.length && !this.balloons.length)
      return;
    const s = this.sim,
      player = s.body.translation();
    this.riding = null;
    for (const c of this.carousels) {
      const omega = CAROUSEL_OMEGA * s.tuning.carouselSpeed;
      c.angle += omega * DT;
      c.body.setNextKinematicRotation(
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), c.angle),
      );
      const dx = player.x - c.p.x,
        dz = player.z - c.p.z,
        radius = Math.hypot(dx, dz);
      // Tire traction on a moving deck: seek its point velocity, rather than
      // teleporting/parenting the truck. Momentum survives driving off the rim.
      if (
        radius < CAROUSEL_RADIUS + 0.5 &&
        radius > 4 &&
        player.y > (c.p.y ?? 0) + 1 &&
        player.y < (c.p.y ?? 0) + 4.4 &&
        [0, 1, 2, 3].some(
          (i) =>
            s.vehicle.wheelGroundObject(i)?.parent()?.handle === c.body.handle,
        )
      ) {
        this.riding = c.p.id;
        this.rideSeconds += DT;
        const velocity = s.body.linvel();
        const restriction = s.tuning.carouselRestriction / 5;
        const gain = Math.min(1, DT * 20 * restriction);
        s.body.applyImpulse(
          {
            x: (omega * dz - velocity.x) * s.body.mass() * gain,
            y: 0,
            z: (-omega * dx - velocity.z) * s.body.mass() * gain,
          },
          true,
        );
        const spin = s.body.angvel();
        s.body.setAngvel(
          {
            x: spin.x,
            y:
              spin.y +
              (omega + Math.sin(s.steeringAngle) * 0.5 - spin.y) *
                Math.min(1, restriction),
            z: spin.z,
          },
          true,
        );
      }
    }
    for (const car of this.bumpers) {
      const pos = car.body.translation(),
        a = car.arena;
      const playerInside =
        Math.abs(player.x - a.x) < 31 && Math.abs(player.z - a.z) < 24;
      if (
        s.time >= car.nextDecision ||
        (car.mode === "ram-player" && !playerInside)
      ) {
        const roll = car.random();
        const peers = this.bumpers.filter(
          (other) => other !== car && other.arena === a && other.health > 0,
        );
        const attackers = peers.filter(
          (other) => other.mode === "ram-player",
        ).length;
        car.mode =
          playerInside && roll < 0.25 && attackers < 2
            ? "ram-player"
            : roll < 0.55 && peers.length
              ? "ram-car"
              : roll < 0.7
                ? "reverse"
                : roll < 0.85
                  ? "wander"
                  : "cruise";
        car.targetId = peers.length
          ? peers[Math.floor(car.random() * peers.length)].id
          : null;
        car.target =
          car.mode === "reverse"
            ? {
                x: pos.x + Math.sin(car.patrol + s.time) * 5,
                z: pos.z + Math.cos(car.patrol + s.time) * 5,
              }
            : {
                x: a.x + (car.random() * 2 - 1) * 24,
                z: a.z + (car.random() * 2 - 1) * 17,
              };
        car.nextDecision =
          s.time +
          (car.mode === "reverse"
            ? 0.7 + car.random() * 0.6
            : 1.5 + car.random() * 2);
      }
      car.aggressive =
        car.health > 0 && car.mode === "ram-player" && playerInside;
      const phase = s.time * 0.2 + car.patrol;
      const peer = this.bumpers.find(
        (other) => other.id === car.targetId && other.health > 0,
      );
      const target = car.aggressive
        ? player
        : car.mode === "ram-car" && peer
          ? peer.body.translation()
          : car.mode === "cruise"
            ? { x: a.x + Math.sin(phase) * 21, z: a.z + Math.cos(phase) * 15 }
            : car.mode === "reverse"
              ? { x: pos.x * 2 - car.target.x, z: pos.z * 2 - car.target.z }
              : car.target;
      let dx = target.x - pos.x,
        dz = target.z - pos.z;
      // Avoid piling up on uninvolved cars; a deliberate charge may still
      // close the gap to its chosen opponent.
      for (const other of this.bumpers) {
        if (
          other === car ||
          other.arena !== a ||
          (car.mode === "ram-car" && other.id === car.targetId)
        )
          continue;
        const p = other.body.translation(),
          ox = pos.x - p.x,
          oz = pos.z - p.z;
        const distance = Math.hypot(ox, oz);
        if (distance > 0.01 && distance < 7) {
          dx += (ox / distance) * (7 - distance) * 5;
          dz += (oz / distance) * (7 - distance) * 5;
        }
      }
      if (Math.abs(pos.x - a.x) > 28) dx = (a.x - pos.x) * 3;
      if (Math.abs(pos.z - a.z) > 21) dz = (a.z - pos.z) * 3;
      const length = Math.hypot(dx, dz) || 1,
        speed =
          car.health <= 0
            ? 0
            : (car.aggressive
                ? 9
                : car.mode === "ram-car"
                  ? 7
                  : car.mode === "reverse"
                    ? 3
                    : 4) * s.tuning.bumperSpeed;
      const v = car.body.linvel(),
        gain = Math.min(1, DT * 2);
      car.body.applyImpulse(
        {
          x: ((dx / length) * speed - v.x) * car.body.mass() * gain,
          y: 0,
          z: ((dz / length) * speed - v.z) * car.body.mass() * gain,
        },
        true,
      );
      if (speed) {
        const forward = new Vector3(0, 0, 1).applyQuaternion(
          new Quaternion().copy(car.body.rotation()),
        );
        const error =
          Math.atan2(dx, dz) +
          (car.mode === "reverse" ? Math.PI : 0) -
          Math.atan2(forward.x, forward.z);
        car.body.setAngvel(
          {
            x: 0,
            y: Math.max(
              -2.5,
              Math.min(2.5, Math.atan2(Math.sin(error), Math.cos(error)) * 4),
            ),
            z: 0,
          },
          true,
        );
      }
      car.incoming.copy(car.body.linvel());
    }
    for (const balloon of this.balloons) {
      balloon.x = balloon.p.x + Math.sin(s.time * 0.06 + balloon.phase) * 14;
      balloon.z = balloon.p.z + Math.cos(s.time * 0.05 + balloon.phase) * 14;
      balloon.y =
        (balloon.p.y ?? 42) + Math.sin(s.time * 0.3 + balloon.phase) * 2;
      if (s.time >= balloon.nextDrop) {
        const interval = 5 + balloon.random() * 5;
        balloon.nextDrop = s.time + interval;
        this.drops.push({ time: s.time, balloon: balloon.p.id, interval });
        const sensor = s.world.createCollider(
          R.ColliderDesc.ball(1.3)
            .setTranslation(balloon.x, balloon.y - 7, balloon.z)
            .setSensor(true),
        );
        this.bananas.push({
          id: ++this.bananaId,
          x: balloon.x,
          y: balloon.y - 7,
          z: balloon.z,
          vy: 0,
          grounded: false,
          groundedAt: -1,
          expires: Infinity,
          sensor,
          random: balloon.random,
        });
      }
    }
    for (const b of this.bananas) {
      if (!b.grounded) {
        b.vy -= 9.81 * DT;
        b.y += b.vy * DT;
        if (b.y <= 0.22) {
          b.y = 0.22;
          b.grounded = true;
          b.groundedAt = s.time;
          b.expires = s.time + 5 + b.random() * 2;
        }
        b.sensor.setTranslation({ x: b.x, y: b.y, z: b.z });
      }
    }
    for (let i = 0; i < 4; i++) {
      if (s.parts.get(s.partDefs[i + 2].id)!.body) continue;
      s.vehicle.setWheelFrictionSlip(
        i,
        this.slipping ? 0.15 : this.riding ? 0.2 : 2.5,
      );
      s.vehicle.setWheelSideFrictionStiffness(
        i,
        this.slipping ? 0.02 : this.riding ? 0.05 : 1.1,
      );
    }
    if (this.slipping)
      s.body.applyTorqueImpulse(
        {
          x: 0,
          y: this.slipSteer * s.body.principalInertia().y * DT * 4,
          z: 0,
        },
        true,
      );
  }
  after(incoming: Vector3) {
    const s = this.sim;
    let bumperHit = false;
    for (const c of this.carousels)
      for (const trap of c.traps) {
        if (trap.exploded > -100 || !this.playerIntersects(trap.sensor))
          continue;
        trap.exploded = s.time;
        this.explosions++;
        const pos = s.body.translation(),
          dx = pos.x - c.p.x,
          dz = pos.z - c.p.z,
          length = Math.hypot(dx, dz) || 1;
        s.body.applyImpulse(
          {
            x: (dx / length) * s.body.mass() * 12,
            y: s.body.mass() * 30,
            z: (dz / length) * s.body.mass() * 12,
          },
          true,
        );
        s.damage("hood", 95);
        s.damageEvents.push({
          source: "carousel-trap",
          part: "hood",
          time: s.time,
        });
      }
    for (const car of this.bumpers) {
      let contact = false;
      s.world.contactPairsWith(car.collider, (other) => {
        if (other.parent()?.handle !== s.body.handle) return;
        s.world.contactPair(car.collider, other, (manifold) => {
          if (manifold.numSolverContacts()) contact = true;
        });
      });
      if (contact) bumperHit = true;
      if (contact && !car.touching) {
        const normal = new Vector3()
          .copy(car.body.translation())
          .sub(s.body.translation());
        normal.y = 0;
        normal.normalize();
        const closing = Math.max(
          0,
          incoming.clone().sub(car.incoming).dot(normal),
        );
        if (closing > 1.5 && s.time - car.lastStrike > 0.6) {
          car.lastStrike = s.time;
          const playerDamage = bumperDamage(
            closing,
            s.body.mass(),
            car.body.mass(),
          );
          const damage = bumperDamage(closing, car.body.mass(), s.body.mass());
          car.health = Math.max(0, car.health - damage);
          for (const def of s.partDefs) s.damage(def.id, def.hp * playerDamage);
          this.impacts.push({
            time: s.time,
            id: car.id,
            closingSpeed: closing,
            playerDamage,
            bumperDamage: damage,
          });
          s.damageEvents.push({
            source: "bumper-car",
            part: "chassis-front",
            time: s.time,
          });
        }
        this.backOff(car, s.body.translation());
      }
      car.touching = contact;
    }
    const contacts = new Set<string>();
    for (let i = 0; i < this.bumpers.length; i++)
      for (let j = i + 1; j < this.bumpers.length; j++) {
        const a = this.bumpers[i],
          b = this.bumpers[j];
        if (a.arena !== b.arena) continue;
        let touching = false;
        s.world.contactPair(a.collider, b.collider, (manifold) => {
          if (manifold.numSolverContacts()) touching = true;
        });
        if (!touching) continue;
        const key = `${a.id}:${b.id}`;
        contacts.add(key);
        if (!this.bumperContacts.has(key)) {
          this.backOff(a, b.body.translation());
          this.backOff(b, a.body.translation());
        }
      }
    this.bumperContacts = contacts;
    for (const b of this.bananas) {
      const point = new Vector3(b.x, b.y, b.z);
      const wheelHit = s.partDefs.slice(2, 6).some((def) => {
        if (s.parts.get(def.id)!.body) return false;
        const centre = new Vector3(...def.pos)
          .applyQuaternion(new Quaternion().copy(s.body.rotation()))
          .add(s.body.translation());
        return centre.distanceTo(point) < 2.3;
      });
      if (wheelHit || this.playerIntersects(b.sensor)) {
        this.slipUntil = s.time + 1;
        this.nextSteer = s.time;
        b.expires = -1;
        s.damageEvents.push({
          source: "banana",
          part: "wheel-fl",
          time: s.time,
        });
      }
    }
    this.bananas = this.bananas.filter((b) => {
      if (b.expires > s.time) return true;
      s.world.removeCollider(b.sensor, true);
      return false;
    });
    return bumperHit;
  }
  snapshot() {
    return {
      carousels: this.carousels.map((c) => ({
        id: c.p.id,
        x: c.p.x,
        y: c.p.y ?? 0,
        z: c.p.z,
        angle: c.angle,
        traps: c.traps.map((t) => ({ slot: t.slot, exploded: t.exploded })),
      })),
      bumpers: this.bumpers.map((c) => ({
        id: c.id,
        ...c.body.translation(),
        rotation: { ...c.body.rotation() },
        health: c.health,
        aggressive: c.aggressive,
        mode: c.mode,
        targetId:
          c.mode === "ram-car"
            ? c.targetId
            : c.mode === "ram-player"
              ? "player"
              : null,
      })),
      balloons: this.balloons.map((b) => ({
        id: b.p.id,
        x: b.x,
        y: b.y,
        z: b.z,
        nextDrop: b.nextDrop,
      })),
      bananas: this.bananas.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        z: b.z,
        grounded: b.grounded,
        groundedAt: b.groundedAt,
        expires: b.expires,
      })),
      riding: this.riding,
      rideSeconds: this.rideSeconds,
      explosions: this.explosions,
      slipping: this.slipping,
      slipUntil: this.slipUntil,
      slipSteer: this.slipSteer,
      impacts: this.impacts.slice(-30),
      drops: this.drops.slice(-30),
    };
  }
}
