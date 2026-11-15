import R from "@dimforge/rapier3d-compat";
import { DT } from "./clock";
import { Euler, Quaternion, Vector3 } from "three";
import type { Simulation } from "./simulation";
import { isCandyDecor, isCandyLethal, isChristmasDecor, isChristmasLethal, isDinosaur, isGauntletMachine, type DinosaurKind } from "./custom-level";
import { GauntletPhysics } from "./gauntlet-physics";
import { SCREW_FIELD_SIZE } from "./gauntlet-timing";
import {
  ANCHOR,
  DINOSAUR_BITE,
  MAILBOX,
  mulberry32,
  PELICAN,
  pelicanPose,
  SHIP,
  shipSailed,
  SPEED_TUBE,
  SPIDER,
  TEETER,
  DINOSAUR_COOLDOWN,
  DINOSAUR_LUNGE,
  dinosaurPose,
  limeJawPose,
  LIME_JAW,
  dungeonHazards,
  snapStriking,
  SNAP_CYCLE,
  DUNGEON_STRIKE,
  ROBOT_STOMP_RADIUS,
  ROBOT_STOMP_DAMAGE,
  ROBOT_LASER_RANGE,
  ROBOT_LASER_HALF_ANGLE,
  ROBOT_LASER_DPS,
  ROBOT_LASER_TICK,
  robotLaserAngle,
  robotLaserFiring,
  CAGE,
  CACTI_PATCH,
  ROCKER,
  BOULDER,
  CANDY_ARCH,
  CANDY_TRUNK,
  CANDY_CHOCOLATE,
  CANDY_STALL,
  CANDY_LAMP,
  CANDY_PRESS,
  CHRISTMAS_ARCH,
  CHRISTMAS_TRUNK,
  CHRISTMAS_STALL,
  CHRISTMAS_LANTERN,
  CHRISTMAS_GIFTS,
  CHRISTMAS_DEER,
  CHRISTMAS_DEER_BODY,
  CHRISTMAS_PRESS,
  CLIPPER_BACK,
  WINDOW_GATE,
  type DungeonHazard,
} from "./dungeon-hazards";
type Mechanism = {
  h: DungeonHazard;
  colliders: R.Collider[];
  contacts: number;
  lastCycle: number;
  bite?: { started: number; turn: number; hit: boolean };
  laser?: { debt: number; lastEvent: number };
  body?: R.RigidBody;
  tilt?: number;
  triggered?: boolean;
  aboard?: boolean;
  pelican?: {
    spots: { x: number; z: number }[];
    index: number;
    phase: "guard" | "takeoff" | "fly" | "land";
    phaseT: number;
    flyFrom: { x: number; z: number };
    flyDist: number;
    pos: { x: number; y: number; z: number };
    yaw: number;
    bite?: { started: number; turn: number; hit: boolean };
  };
  anchor?: {
    fired: boolean;
    firedAt: number;
    hookLocal: { x: number; y: number; z: number };
    ropeLen: number;
    target: { x: number; z: number };
    sensors: R.Collider[];
  };
  ship?: { departedAt?: number; sailed?: number };
  spider?: {
    pos: { x: number; z: number };
    yaw: number;
    hunting: boolean;
  };
  tube?: { inside: boolean; cruise: number };
  mailbox?: {
    started?: number;
    exploded: boolean;
    carFrom: { x: number; y: number; z: number };
  };
};
export class DungeonPhysics {
  mechanisms: Mechanism[] = [];
  readonly gauntlet: GauntletPhysics;
  constructor(private sim: Simulation) {
    this.gauntlet = new GauntletPhysics(sim);
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
      baseY = 0,
    ) => {
      // Local furniture offset rotated by yaw, matching root.rotation.y.
      const yaw = h.yaw ?? 0;
      const c = world.createCollider(
        R.ColliderDesc.cuboid(w / 2, hgt / 2, d / 2)
          .setTranslation(
            h.x + lx * Math.cos(yaw) + lz * Math.sin(yaw),
            (h.y ?? 0) + baseY + hgt / 2,
            h.z - lx * Math.sin(yaw) + lz * Math.cos(yaw),
          )
          .setRotation(yawQuat())
          .setFriction(0.8),
      );
      m.colliders.push(c);
    };
    if (isChristmasLethal(h.kind)) {
      // Press traps keep solid side posts; the rest drive straight through
      // like hands/scissors and kill via the shared snap-strike check.
      if (
        h.kind === "christmas-nutcracker" ||
        h.kind === "christmas-ornament-slammer" ||
        h.kind === "christmas-sleigh-crusher"
      ) {
        solid(CHRISTMAS_PRESS.postW, CHRISTMAS_PRESS.postH, CHRISTMAS_PRESS.postD, -CHRISTMAS_PRESS.postX, 0);
        solid(CHRISTMAS_PRESS.postW, CHRISTMAS_PRESS.postH, CHRISTMAS_PRESS.postD, CHRISTMAS_PRESS.postX, 0);
      }
    } else if (isCandyLethal(h.kind)) {
      // Press traps keep solid side posts; the rest drive straight through
      // like hands/scissors and kill via the shared snap-strike check.
      if (
        h.kind === "jawbreaker-crusher" ||
        h.kind === "peppermint-slammer" ||
        h.kind === "caramel-crusher"
      ) {
        solid(CANDY_PRESS.postW, CANDY_PRESS.postH, CANDY_PRESS.postD, -CANDY_PRESS.postX, 0);
        solid(CANDY_PRESS.postW, CANDY_PRESS.postH, CANDY_PRESS.postD, CANDY_PRESS.postX, 0);
      }
    } else if (isGauntletMachine(h.kind)) {
      this.gauntlet.add(m.h);
      if (h.kind === "screw-field") solid(SCREW_FIELD_SIZE, 1.2, SCREW_FIELD_SIZE, 0, 0, -1.2);
      if (h.kind === "volcano")
        m.colliders.push(world.createCollider(R.ColliderDesc.cone(3.5, 6.7)
          .setTranslation(h.x, (h.y ?? 0) + 3.5, h.z)));
      if (h.kind === "window-gate") {
        solid(WINDOW_GATE.postW, WINDOW_GATE.postH, WINDOW_GATE.gateD, -WINDOW_GATE.postX, 0);
        solid(WINDOW_GATE.postW, WINDOW_GATE.postH, WINDOW_GATE.gateD, WINDOW_GATE.postX, 0);
        solid(WINDOW_GATE.wallW, WINDOW_GATE.wallH, WINDOW_GATE.gateD, -WINDOW_GATE.wallX, 0);
        solid(WINDOW_GATE.wallW, WINDOW_GATE.wallH, WINDOW_GATE.gateD, WINDOW_GATE.wallX, 0);
      }
    } else if (h.kind === "cage") {
      solid(CAGE.w, CAGE.h, CAGE.d, 0, 0);
    } else if (h.kind === "cacti-patch") {
      solid(CACTI_PATCH.w, CACTI_PATCH.h, CACTI_PATCH.d, 0, 0);
    } else if (h.kind === "rocker") {
      const body = world.createRigidBody(
        R.RigidBodyDesc.kinematicPositionBased().setTranslation(
          h.x,
          (h.y ?? 0) + ROCKER.pivotY,
          h.z,
        ),
      );
      m.body = body;
      m.tilt = ROCKER.restTilt;
      const deck = (x: number, y: number, z: number, w: number, hgt: number, d: number) => {
        m.colliders.push(
          world.createCollider(
            R.ColliderDesc.cuboid(w / 2, hgt / 2, d / 2)
              .setTranslation(x, y, z)
              .setFriction(0.9),
            body,
          ),
        );
      };
      deck(0, 0, 0, ROCKER.w, ROCKER.h, ROCKER.d);
      for (const side of [-1, 1])
        deck(side * (ROCKER.w / 2 - 0.4), 0.9, 0, 0.8, 1.2, ROCKER.d);
    } else if (h.kind === "boulder") {
      const body = world.createRigidBody(
        R.RigidBodyDesc.dynamic()
          .setTranslation(h.x, (h.y ?? 0) + BOULDER.radius + 0.1, h.z)
          .setLinearDamping(0.05)
          .setAngularDamping(0.1)
          .setCcdEnabled(true),
      );
      m.body = body;
      m.triggered = false;
      m.colliders.push(
        world.createCollider(
          R.ColliderDesc.ball(BOULDER.radius)
            .setMass(120)
            .setFriction(0.9)
            .setRestitution(0.1),
          body,
        ),
      );
    } else if (h.kind === "flagpole") {
      m.colliders.push(
        world.createCollider(
          R.ColliderDesc.cylinder(15, 0.4).setTranslation(
            h.x + 1.5 * Math.sin(h.yaw ?? 0),
            (h.y ?? 0) + 15,
            h.z + 1.5 * Math.cos(h.yaw ?? 0),
          ),
        ),
      );
    } else if (h.kind === "clippers") {
      solid(CLIPPER_BACK.w, CLIPPER_BACK.h, CLIPPER_BACK.d, 0, CLIPPER_BACK.z);
    } else if (isChristmasDecor(h.kind)) {
      // Bumpable scenery only: christmas decor kinds have no strike entry, so after() never fires.
      if (h.kind === "christmas-light-arch") {
        solid(CHRISTMAS_ARCH.postW, CHRISTMAS_ARCH.postH, CHRISTMAS_ARCH.postD, -CHRISTMAS_ARCH.postX, 0);
        solid(CHRISTMAS_ARCH.postW, CHRISTMAS_ARCH.postH, CHRISTMAS_ARCH.postD, CHRISTMAS_ARCH.postX, 0);
      } else if (h.kind === "christmas-tree") {
        solid(CHRISTMAS_TRUNK.w, CHRISTMAS_TRUNK.h, CHRISTMAS_TRUNK.d, 0, 0);
      } else if (h.kind === "christmas-market-stall") {
        solid(CHRISTMAS_STALL.w, CHRISTMAS_STALL.h, CHRISTMAS_STALL.d, 0, 0);
      } else if (h.kind === "christmas-lantern") {
        solid(CHRISTMAS_LANTERN.w, CHRISTMAS_LANTERN.h, CHRISTMAS_LANTERN.d, 0, 0);
      } else if (h.kind === "christmas-gift-wall") {
        solid(CHRISTMAS_GIFTS.w, CHRISTMAS_GIFTS.h, CHRISTMAS_GIFTS.d, 0, 0);
      } else if (h.kind === "christmas-reindeer") {
        solid(CHRISTMAS_DEER.w, CHRISTMAS_DEER.h, CHRISTMAS_DEER.d, 0, 0);
        solid(
          CHRISTMAS_DEER_BODY.w,
          CHRISTMAS_DEER_BODY.h,
          CHRISTMAS_DEER_BODY.d,
          0,
          0,
          CHRISTMAS_DEER.h,
        );
      }
    } else if (h.kind === "pelican") {
      // Three course spots, random start; explicit spots pin the rotation.
      const rng = h.seed !== undefined ? mulberry32(h.seed) : Math.random;
      const gates = this.sim.courseTrack?.checkpoints ?? [];
      let spots = h.spots ?? [];
      if (spots.length !== 3) {
        spots = Array.from({ length: 3 }, () => {
          if (!gates.length) return { x: h.x, z: h.z };
          const g = gates[Math.floor(rng() * gates.length) % gates.length];
          return { x: g.x, z: g.z };
        });
      }
      const index = Math.floor(rng() * 3) % 3;
      m.pelican = {
        spots,
        index,
        phase: "guard",
        phaseT: this.sim.time,
        flyFrom: { x: spots[index].x, z: spots[index].z },
        flyDist: 1,
        pos: { x: spots[index].x, y: h.y ?? 0, z: spots[index].z },
        yaw: h.yaw ?? 0,
      };
    } else if (h.kind === "anchor") {
      const body = world.createRigidBody(
        R.RigidBodyDesc.kinematicPositionBased().setTranslation(
          h.x,
          h.y ?? 0,
          h.z,
        ),
      );
      m.body = body;
      const yaw = h.yaw ?? 0;
      // Solid shank the truck can bump; the touch fires the hook.
      m.colliders.push(
        world.createCollider(
          R.ColliderDesc.cuboid(0.5, 2, 0.5)
            .setTranslation(0, 2, 0)
            .setFriction(0.8),
          body,
        ),
      );
      const sensors: R.Collider[] = [];
      const sensor = (lx: number, y: number, lz: number, r: number) => {
        const c = world.createCollider(
          R.ColliderDesc.ball(r).setTranslation(lx, y, lz).setSensor(true),
          body,
        );
        sensors.push(c);
        m.colliders.push(c);
      };
      sensor(0, 2, 0, 2.5);
      for (const d of [3, 6, 9, 12])
        sensor(Math.sin(yaw) * d, 0.6, Math.cos(yaw) * d, 1.7);
      m.anchor = {
        fired: false,
        firedAt: 0,
        hookLocal: { x: 0, y: 0, z: 0 },
        ropeLen: 0,
        target: { x: h.x, z: h.z },
        sensors,
      };
    } else if (h.kind === "spider") {
      // No colliders: the web is a drag zone and the spider kills by contact
      // distance, like a dinosaur bite without the lunge.
      m.spider = { pos: { x: h.x, z: h.z }, yaw: h.yaw ?? 0, hunting: false };
    } else if (h.kind === "speed-tube") {
      // Pure zone math: no colliders, the shell is visual only.
      m.tube = { inside: false, cruise: 0 };
    } else if (h.kind === "teeter-totter") {
      const yaw = h.yaw ?? 0;
      // Fixed, stepped rotation like the ship: raycast wheels never touch
      // kinematic decks, so the motor re-aims a fixed deck trucks can drive.
      const body = world.createRigidBody(
        R.RigidBodyDesc.fixed()
          .setTranslation(h.x, (h.y ?? 0) + TEETER.pivotY, h.z)
          .setRotation(
            new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
          ),
      );
      m.body = body;
      m.colliders.push(
        world.createCollider(
          R.ColliderDesc.cuboid(TEETER.w / 2, TEETER.h / 2, TEETER.d / 2).setFriction(0.9),
          body,
        ),
      );
    } else if (h.kind === "mailbox") {
      // Small solid body; the abduction zone around it fires first.
      const body = world.createRigidBody(
        R.RigidBodyDesc.fixed().setTranslation(h.x, (h.y ?? 0) + 2, h.z),
      );
      m.body = body;
      m.colliders.push(
        world.createCollider(
          R.ColliderDesc.cuboid(1.5, 2, 1.5).setFriction(0.6),
          body,
        ),
      );
      m.mailbox = {
        started: undefined,
        exploded: false,
        carFrom: { x: 0, y: 0, z: 0 },
      };
    } else if (h.kind === "ship") {
      const yaw = h.yaw ?? 0;
      // Fixed, not kinematic: raycast wheels never touch kinematic decks
      // (proven on the rocker), so the ship steps a fixed hull and carries
      // aboard trucks explicitly in before().
      const body = world.createRigidBody(
        R.RigidBodyDesc.fixed()
          .setTranslation(h.x, h.y ?? 0, h.z)
          .setRotation(
            new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
          ),
      );
      m.body = body;
      const deck = (
        x: number, y: number, z: number, w: number, hgt: number, d: number, friction: number,
      ) => {
        m.colliders.push(
          world.createCollider(
            R.ColliderDesc.cuboid(w / 2, hgt / 2, d / 2)
              .setTranslation(x, y, z)
              .setFriction(friction),
            body,
          ),
        );
      };
      // Deep slab, not the plank shell: jump landings spear through thin
      // kinematic plates and wedge. Top stays exactly at deck level.
      deck(0, SHIP.deckY - 1.5, 0, SHIP.w, 3, SHIP.d, 1.2);
      // Rails port, starboard and bow; the stern stays open for the landing.
      for (const side of [-1, 1])
        deck(
          side * (SHIP.w / 2 - SHIP.railT / 2), SHIP.deckY + SHIP.railH / 2, 0,
          SHIP.railT, SHIP.railH, SHIP.d, 0.6,
        );
      deck(
        0, SHIP.deckY + SHIP.railH / 2, SHIP.d / 2 - SHIP.railT / 2,
        SHIP.w, SHIP.railH, SHIP.railT, 0.6,
      );
      // Wheelhouse and container rows: solid deck furniture.
      deck(
        SHIP.cabin.x, SHIP.deckY + SHIP.cabin.h / 2, SHIP.cabin.z,
        SHIP.cabin.w, SHIP.cabin.h, SHIP.cabin.d, 0.6,
      );
      for (const side of [-1, 1])
        deck(
          side * SHIP.cargo.x, SHIP.deckY + SHIP.cargo.h / 2, SHIP.cargo.z,
          SHIP.cargo.w, SHIP.cargo.h, SHIP.cargo.d, 0.6,
        );
      m.ship = {};
    } else if (isCandyDecor(h.kind)) {
      // Bumpable scenery only: candy kinds have no strike entry, so after() never fires.
      if (h.kind === "candy-cane-arch") {
        solid(CANDY_ARCH.postW, CANDY_ARCH.postH, CANDY_ARCH.postD, -CANDY_ARCH.postX, 0);
        solid(CANDY_ARCH.postW, CANDY_ARCH.postH, CANDY_ARCH.postD, CANDY_ARCH.postX, 0);
      } else if (h.kind === "gumdrop-tree") {
        solid(CANDY_TRUNK.w, CANDY_TRUNK.h, CANDY_TRUNK.d, 0, 0);
      } else if (h.kind === "chocolate-barrier") {
        solid(CANDY_CHOCOLATE.w, CANDY_CHOCOLATE.h, CANDY_CHOCOLATE.d, 0, 0);
      } else if (h.kind === "cotton-candy-stall") {
        solid(CANDY_STALL.w, CANDY_STALL.h, CANDY_STALL.d, 0, 0);
      } else if (h.kind === "gumball-lamp") {
        solid(CANDY_LAMP.w, CANDY_LAMP.h, CANDY_LAMP.d, 0, 0);
      }
    }
  }
  /** Pre-step kinematic updates: rockers, anchors and the departing ship. */
  before() {
    const s = this.sim;
    for (const m of this.mechanisms) {
      if (m.h.kind === "ship" && m.body && m.ship) {
        const need =
          m.h.trigger ??
          Math.max(1, (s.courseTrack?.checkpoints.length ?? 2) - 1);
        const run = s.trackRun;
        if (
          m.ship.departedAt === undefined &&
          run &&
          run.status === "running" &&
          run.checkpoint >= need
        )
          m.ship.departedAt = s.time;
        const sailed = shipSailed(m.ship.departedAt, s.time);
        if (sailed === m.ship.sailed) continue;
        const prev = m.ship.sailed ?? 0;
        m.ship.sailed = sailed;
        const yaw = m.h.yaw ?? 0;
        const nx = m.h.x + Math.sin(yaw) * sailed;
        const nz = m.h.z + Math.cos(yaw) * sailed;
        const step = sailed - prev;
        m.body.setTranslation({ x: nx, y: m.h.y ?? 0, z: nz }, true);
        // Carry an aboard truck with the hull; fixed decks keep full traction.
        const p = s.body.translation();
        const dx = p.x - nx, dz = p.z - nz;
        const cos = Math.cos(yaw), sin = Math.sin(yaw);
        const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
        const deckTop = (m.h.y ?? 0) + SHIP.deckY;
        if (
          Math.abs(lx) < SHIP.w / 2 + 1 &&
          Math.abs(lz) < SHIP.d / 2 + 1 &&
          p.y > deckTop - 1.5 &&
          p.y < deckTop + 4
        )
          s.body.setTranslation(
            { x: p.x + Math.sin(yaw) * step, y: p.y, z: p.z + Math.cos(yaw) * step },
            true,
          );
        continue;
      }
      if (m.h.kind === "anchor" && m.body && m.anchor?.fired) {
        const a = m.anchor;
        const t = s.time - a.firedAt;
        const baseY = m.h.y ?? 0;
        const ease = (k: number) => {
          k = Math.max(0, Math.min(1, k));
          return k * k * (3 - 2 * k);
        };
        let x = m.h.x, y = baseY, z = m.h.z;
        if (t < ANCHOR.rise) {
          y = baseY + ANCHOR.cruiseHeight * ease(t / ANCHOR.rise);
        } else if (t < ANCHOR.flight) {
          const k = ease(
            (t - ANCHOR.rise) / (ANCHOR.flight - ANCHOR.rise),
          );
          x = m.h.x + (a.target.x - m.h.x) * k;
          z = m.h.z + (a.target.z - m.h.z) * k;
          y = baseY + ANCHOR.cruiseHeight;
        } else if (t < ANCHOR.plunge) {
          const k = (t - ANCHOR.flight) / (ANCHOR.plunge - ANCHOR.flight);
          x = a.target.x;
          z = a.target.z;
          y =
            baseY +
            ANCHOR.cruiseHeight +
            (ANCHOR.sinkDepth - ANCHOR.cruiseHeight) * k * k;
        } else {
          x = a.target.x;
          z = a.target.z;
          y = ANCHOR.sinkDepth;
        }
        m.body.setNextKinematicTranslation({ x, y, z });
        continue;
      }
      if (m.h.kind === "teeter-totter" && m.body) {
        const yaw = m.h.yaw ?? 0;
        const tilt =
          TEETER.restTilt +
          TEETER.amp *
            Math.sin(((s.time + m.h.phase) / TEETER.period) * Math.PI * 2);
        m.body.setRotation(
          new Quaternion()
            .setFromAxisAngle(new Vector3(0, 1, 0), yaw)
            .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), tilt)),
          true,
        );
        continue;
      }
      if (m.h.kind !== "rocker" || !m.body) continue;
      const yaw = m.h.yaw ?? 0;
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const p = s.body.translation();
      const dx = p.x - m.h.x, dz = p.z - m.h.z;
      const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
      const py = (m.h.y ?? 0) + ROCKER.pivotY;
      // Latching boarding: the entry edge stays pinned down until the car is
      // committed past it, so the rising deck can never trap the nose.
      const nearDeck =
        Math.abs(lx) < ROCKER.w / 2 && Math.abs(p.y - py) < 4;
      if (m.aboard) {
        if (
          lz > ROCKER.d / 2 + 2 ||
          lz < -ROCKER.d / 2 - 3 ||
          !nearDeck
        )
          m.aboard = false;
      } else if (
        lz > -ROCKER.d / 2 + 1 &&
        lz < ROCKER.d / 2 &&
        nearDeck
      ) {
        m.aboard = true;
      }
      let target: number = ROCKER.restTilt;
      if (m.aboard) {
        if (lz < -ROCKER.d / 2 + 8) target = ROCKER.restTilt;
        else if (lz > ROCKER.d / 2 - 2) target = m.tilt ?? ROCKER.restTilt;
        else
          target =
            Math.max(-1, Math.min(1, lz / (ROCKER.d / 2))) * ROCKER.maxTilt;
      }
      const cur = m.tilt ?? ROCKER.restTilt;
      const step = ROCKER.rate * DT;
      m.tilt = cur + Math.max(-step, Math.min(step, target - cur));
      m.body.setNextKinematicTranslation({ x: m.h.x, y: py, z: m.h.z });
      m.body.setNextKinematicRotation(
        new Quaternion().setFromEuler(new Euler(m.tilt, yaw, 0, "YXZ")),
      );
    }
  }
  /** Any active mailbox abduction (input override) or tube ride. */
  get mailboxHolding() {
    return this.mechanisms.some(
      (m) => m.mailbox && m.mailbox.started !== undefined && !m.mailbox.exploded,
    );
  }
  get speedTubeHolding() {
    return this.mechanisms.some((m) => m.tube?.inside ?? false);
  }
  /** Truck render scale during a mailbox abduction (1 when idle). */
  get mailboxShrink() {
    const mb = this.mechanisms.find((m) => m.mailbox)?.mailbox;
    if (!mb || mb.started === undefined) return 1;
    // The burst debris stays small: the truck never un-shrinks.
    if (mb.exploded) return 0.3;
    const t = this.sim.time - mb.started;
    if (t >= MAILBOX.shrink) return 0.01;
    const k = Math.max(0, t / MAILBOX.shrink);
    return 1 - (1 - 0.01) * (k * k * (3 - 2 * k));
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
    this.gauntlet.move(id, dx, dy, dz);
    if (m.body) {
      const p = m.body.translation();
      m.body.setTranslation({ x: p.x + dx, y: p.y + dy, z: p.z + dz }, true);
      return;
    }
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
    this.gauntlet.remove(id);
    for (const c of m.colliders) this.sim.world.removeCollider(c, true);
    if (m.body) this.sim.world.removeRigidBody(m.body);
  }
  /** Proximity boulder: rolls along its yaw heading once, lethal on contact. */
  private rollBoulder(m: Mechanism, p: R.Vector) {
    const s = this.sim;
    if (s.status !== "driving" || !m.body) return;
    if (!m.triggered) {
      const b = m.body.translation();
      if (Math.hypot(p.x - b.x, p.z - b.z) > BOULDER.trigger) return;
      m.triggered = true;
      const yaw = m.h.yaw ?? 0;
      const dir = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      m.body.setLinvel(
        { x: dir.x * BOULDER.speed, y: 0, z: dir.z * BOULDER.speed },
        true,
      );
      const axis = new Vector3(0, 1, 0).cross(dir);
      m.body.setAngvel(
        {
          x: (axis.x * BOULDER.speed) / BOULDER.radius,
          y: (axis.y * BOULDER.speed) / BOULDER.radius,
          z: (axis.z * BOULDER.speed) / BOULDER.radius,
        },
        true,
      );
      return;
    }
    for (const c of m.colliders) {
      let hit = false;
      this.sim.world.contactPairsWith(c, (other) => {
        if (other.parent()?.handle === s.body.handle)
          this.sim.world.contactPair(c, other, (manifold) => {
            if (manifold.numSolverContacts() > 0) hit = true;
          });
      });
      if (hit) {
        m.contacts++;
        s.damage("chassis-front", 10000);
        s.damageEvents.push({
          source: "boulder",
          part: "chassis-front",
          time: s.time,
        });
      }
    }
  }
  private attackWithDinosaur(m: Mechanism, kind: DinosaurKind, p: R.Vector) {
    const s = this.sim;
    if (s.status !== "driving") return;
    const { h } = m;
    const sc = h.scale ?? 1;
    const { height: baseHeight, reach: baseReach } = DINOSAUR_BITE[kind];
    const height = baseHeight * sc, reach = baseReach * sc;
    // Taller heads rear higher; grow the vertical window by the extra head
    // height so track-level cars stay in reach. Identical at scale 1.
    const dyTrigger = 3 * sc + baseHeight * (sc - 1);
    const dyStrike = 2.6 * sc + baseHeight * (sc - 1);
    const dx = p.x - h.x, dz = p.z - h.z;
    const dy = p.y - ((h.y ?? 0) + height);
    const yaw = h.yaw ?? 0;
    if (s.time - (m.bite?.started ?? -Infinity) >= DINOSAUR_COOLDOWN) {
      const aim = Math.atan2(dx, dz) - yaw;
      const turn = Math.atan2(Math.sin(aim), Math.cos(aim));
      // Aggro range stays flat: the lunge carries the bigger bite, and existing routes stay fair.
      if (Math.abs(turn) <= 1.25 && Math.abs(dy) <= dyTrigger && Math.hypot(dx, dz) <= 10)
        m.bite = { started: s.time, turn, hit: false };
    }
    const bite = m.bite;
    if (!bite || bite.hit) return;
    const pose = dinosaurPose(s.time - bite.started);
    if (!pose.striking || Math.abs(dy) > dyStrike) return;
    const angle = yaw + bite.turn * pose.turn;
    const x = Math.sin(angle), z = Math.cos(angle);
    const mouth = reach + pose.lunge * DINOSAUR_LUNGE * sc;
    if (Math.hypot(dx - x * mouth, dz - z * mouth) > 3.1 * sc) return;
    bite.hit = true;
    m.contacts++;
    const shove = s.body.mass() * 1.4;
    s.body.applyImpulse({ x: x * shove, y: 0, z: z * shove }, true);
    if (sc > 1) {
      this.ripWithDinosaur(kind, h, x, z, mouth, height);
      // Two bites to kill: the second landed bite finds the chassis.
      if (m.contacts >= 2) {
        s.damage("chassis-front", 10000);
        s.damageEvents.push({ source: kind, part: "chassis-front", time: s.time });
      }
    } else {
      s.damage("chassis-front", 32);
      s.damageEvents.push({ source: kind, part: "chassis-front", time: s.time });
    }
  }
  /** Giant pelican: guards each perch 3 s, flies the rotation, bills trucks in range. */
  private updatePelican(m: Mechanism, p: R.Vector) {
    const s = this.sim;
    const pel = m.pelican!;
    const baseY = m.h.y ?? 0;
    const next = (pel.index + 1) % pel.spots.length;
    if (pel.phase === "guard") {
      const spot = pel.spots[pel.index];
      pel.pos = { x: spot.x, y: baseY, z: spot.z };
      if (s.time - pel.phaseT >= PELICAN.guard) {
        pel.phase = "takeoff";
        pel.phaseT = s.time;
        pel.bite = undefined;
      }
    } else if (pel.phase === "takeoff") {
      const k = Math.min(1, (s.time - pel.phaseT) / PELICAN.takeoff);
      pel.pos.y = baseY + PELICAN.flyHeight * k * k;
      const spot = pel.spots[next];
      pel.yaw = Math.atan2(spot.x - pel.pos.x, spot.z - pel.pos.z);
      if (k >= 1) {
        pel.phase = "fly";
        pel.phaseT = s.time;
        pel.flyFrom = { x: pel.pos.x, z: pel.pos.z };
        pel.flyDist = Math.max(
          0.01,
          Math.hypot(spot.x - pel.pos.x, spot.z - pel.pos.z),
        );
      }
    } else if (pel.phase === "fly") {
      const k = Math.min(
        1,
        ((s.time - pel.phaseT) * PELICAN.flySpeed) / pel.flyDist,
      );
      const spot = pel.spots[next];
      pel.pos = {
        x: pel.flyFrom.x + (spot.x - pel.flyFrom.x) * k,
        y: baseY + PELICAN.flyHeight,
        z: pel.flyFrom.z + (spot.z - pel.flyFrom.z) * k,
      };
      if (k >= 1) {
        pel.phase = "land";
        pel.phaseT = s.time;
      }
    } else {
      const k = Math.min(1, (s.time - pel.phaseT) / PELICAN.land);
      const spot = pel.spots[next];
      pel.pos = {
        x: spot.x,
        y: baseY + PELICAN.flyHeight * (1 - k),
        z: spot.z,
      };
      if (k >= 1) {
        pel.phase = "guard";
        pel.phaseT = s.time;
        pel.index = next;
      }
    }
    if (s.status !== "driving" || pel.phase !== "guard") return;
    // Grounded attack: turn on the truck and overlap it with the bill.
    const dx = p.x - pel.pos.x, dz = p.z - pel.pos.z;
    const dy = p.y - (pel.pos.y + PELICAN.height);
    if (
      s.time - (pel.bite?.started ?? -Infinity) >= PELICAN.cooldown &&
      !pel.bite
    ) {
      const aim = Math.atan2(dx, dz) - pel.yaw;
      const turn = Math.atan2(Math.sin(aim), Math.cos(aim));
      if (
        Math.abs(turn) <= 1.4 &&
        Math.abs(dy) <= 4.5 &&
        Math.hypot(dx, dz) <= PELICAN.range
      )
        pel.bite = { started: s.time, turn, hit: false };
    }
    const bite = pel.bite;
    if (!bite || bite.hit) return;
    if (s.time - bite.started > 1.2) {
      pel.bite = undefined;
      return;
    }
    const pose = pelicanPose(s.time - bite.started);
    if (!pose.striking || Math.abs(dy) > 4.5) return;
    const angle = pel.yaw + bite.turn * pose.turn;
    const mx = pel.pos.x + Math.sin(angle) * PELICAN.reach;
    const mz = pel.pos.z + Math.cos(angle) * PELICAN.reach;
    if (Math.hypot(p.x - mx, p.z - mz) > PELICAN.kill) return;
    bite.hit = true;
    m.contacts++;
    s.damage("chassis-front", 10000);
    s.damageEvents.push({
      source: "pelican",
      part: "chassis-front",
      time: s.time,
    });
  }
  /** Deck anchor: touch it or its chain and it hooks the truck, then dunks it. */
  private updateAnchor(m: Mechanism) {
    const s = this.sim;
    if (s.status !== "driving" || !m.body) return;
    const a = m.anchor!;
    const tip = () => {
      const t = m.body!.translation();
      return { x: t.x, y: t.y + 4, z: t.z };
    };
    if (!a.fired) {
      let touch = false;
      for (const c of m.colliders) {
        if (c.isSensor()) continue;
        this.sim.world.contactPairsWith(c, (other) => {
          if (other.parent()?.handle !== s.body.handle) return;
          this.sim.world.contactPair(c, other, (manifold) => {
            if (manifold.numSolverContacts() > 0) touch = true;
          });
        });
        if (touch) break;
      }
      if (!touch)
        for (const sensor of a.sensors) {
          for (const state of s.parts.values()) {
            if (
              state.collider &&
              s.world.intersectionPair(sensor, state.collider)
            ) {
              touch = true;
              break;
            }
          }
          if (touch) break;
        }
      if (!touch) return;
      a.fired = true;
      a.firedAt = s.time;
      // Hook the chassis edge facing the anchor; the rope pulls from there.
      const car = s.body.translation();
      const head = tip();
      const dx = head.x - car.x, dz = head.z - car.z;
      const len = Math.hypot(dx, dz) || 1;
      const q = new Quaternion().copy(s.body.rotation()).invert();
      const local = new Vector3((dx / len) * 2, 0, (dz / len) * 2).applyQuaternion(q);
      a.hookLocal = { x: local.x, y: local.y, z: local.z };
      const hw = this.hookWorld(m);
      a.ropeLen =
        Math.hypot(hw.x - head.x, hw.y - head.y, hw.z - head.z) + ANCHOR.slack;
      let bd = Infinity;
      for (const pref of s.courseTrack?.custom?.prefabs ?? []) {
        if (pref.kind !== "water" && pref.kind !== "shark-pool" && pref.kind !== "ocean") continue;
        const d = Math.hypot(pref.x - m.h.x, pref.z - m.h.z);
        if (d < bd) {
          bd = d;
          a.target = { x: pref.x, z: pref.z };
        }
      }
      if (bd === Infinity) {
        const yaw = m.h.yaw ?? 0;
        a.target = { x: m.h.x + Math.sin(yaw) * 30, z: m.h.z + Math.cos(yaw) * 30 };
      }
      m.contacts++;
      s.damage("chassis-front", 5);
      s.damageEvents.push({
        source: "anchor",
        part: "chassis-front",
        time: s.time,
      });
      return;
    }
    // The winch reels the truck all the way into the dunk point.
    a.ropeLen = Math.max(2, a.ropeLen - ANCHOR.reel * DT);
    // Taut rope overrules the engine: drag the truck to the dunk point.
    const hook = this.hookWorld(m);
    const head = tip();
    const dx = head.x - hook.x, dy = head.y - hook.y, dz = head.z - hook.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    if (d > a.ropeLen) {
      const v = ANCHOR.dragSpeed / d;
      s.body.setLinvel({ x: dx * v, y: dy * v, z: dz * v }, true);
    }
  }
  /** Current world position of a hooked truck's chain point. */
  hookWorld(m: Mechanism) {
    const s = this.sim;
    const a = m.anchor!;
    const car = s.body.translation();
    const q = new Quaternion().copy(s.body.rotation());
    const w = new Vector3(a.hookLocal.x, a.hookLocal.y, a.hookLocal.z)
      .applyQuaternion(q)
      .add(new Vector3(car.x, car.y, car.z));
    return { x: w.x, y: w.y, z: w.z };
  }
  /** Hollow spider: silk drag zones stuck trucks, then the spider runs them down. */
  private updateSpider(m: Mechanism, p: R.Vector) {
    const s = this.sim;
    const sp = m.spider!;
    const h = m.h;
    const baseY = h.y ?? 0;
    const dx = p.x - h.x, dz = p.z - h.z;
    const inWeb =
      Math.hypot(dx, dz) <= SPIDER.webRadius && Math.abs(p.y - baseY) <= 5;
    const v = s.body.linvel();
    const pace = Math.hypot(v.x, v.z);
    if (inWeb && s.status === "driving") {
      // Silken drag plus a hard cap: momentum dies, the crawl stays slow.
      const damp = Math.max(0, 1 - SPIDER.drag * DT);
      let vx = v.x * damp, vz = v.z * damp;
      const capped = Math.hypot(vx, vz);
      if (capped > SPIDER.maxSpeed) {
        vx *= SPIDER.maxSpeed / capped;
        vz *= SPIDER.maxSpeed / capped;
      }
      s.body.setLinvel({ x: vx, y: v.y, z: vz }, true);
    }
    if (s.status !== "driving") return;
    const sdx = p.x - sp.pos.x, sdz = p.z - sp.pos.z;
    const carDist = Math.hypot(sdx, sdz);
    if (!sp.hunting) {
      if (
        inWeb &&
        pace <= SPIDER.stuckSpeed &&
        Math.abs(p.y - baseY) <= 5
      )
        sp.hunting = true;
      else return;
    }
    // Give up past the leash; otherwise sprint at the truck.
    if (
      carDist > SPIDER.webRadius + SPIDER.leash ||
      Math.abs(p.y - baseY) > 6
    ) {
      sp.hunting = false;
      return;
    }
    if (carDist <= SPIDER.kill && Math.abs(p.y - baseY) <= 4) {
      m.contacts++;
      s.damage("chassis-front", 10000);
      s.damageEvents.push({
        source: "spider",
        part: "chassis-front",
        time: s.time,
      });
      sp.hunting = false;
      return;
    }
    const step = SPIDER.runSpeed * DT;
    if (carDist > 0.01) {
      sp.pos.x += (sdx / carDist) * Math.min(step, carDist);
      sp.pos.z += (sdz / carDist) * Math.min(step, carDist);
      sp.yaw = Math.atan2(sdx, sdz);
    }
  }
  /** Straight speed tube: locked ride at 1.5x entry pace, shot out the end. */
  private updateSpeedTube(m: Mechanism, p: R.Vector) {
    const s = this.sim;
    const tube = m.tube!;
    const yaw = m.h.yaw ?? 0;
    const ax = Math.sin(yaw), az = Math.cos(yaw);
    const dx = p.x - m.h.x, dz = p.z - m.h.z;
    const along = dx * ax + dz * az;
    // Local x follows the same yaw frame as the solid() helper.
    const lateral = dx * Math.cos(yaw) - dz * Math.sin(yaw);
    const dy = p.y - (m.h.y ?? 0);
    const inside =
      Math.abs(along) < SPEED_TUBE.length / 2 &&
      Math.abs(lateral) < SPEED_TUBE.radius &&
      Math.abs(dy) < SPEED_TUBE.radius;
    if (!inside) {
      if (tube.inside && along >= SPEED_TUBE.length / 2 && s.status === "driving") {
        // Out the end: shot onward, steering back immediately.
        const v = s.body.linvel();
        const pace = Math.hypot(v.x, v.z);
        const shot = Math.max(pace, tube.cruise, SPEED_TUBE.exitBurst);
        s.body.setLinvel({ x: ax * shot, y: v.y, z: az * shot }, true);
        s.damageEvents.push({
          source: "speed-tube",
          part: "chassis-front",
          time: s.time,
        });
      }
      tube.inside = false;
      return;
    }
    if (s.status !== "driving") return;
    const v = s.body.linvel();
    if (!tube.inside) {
      tube.inside = true;
      tube.cruise = Math.max(
        Math.hypot(v.x, v.z) * SPEED_TUBE.boost,
        SPEED_TUBE.minCruise,
      );
    }
    // Locked to the axis at cruise; lateral drift bleeds away.
    const alongV = v.x * ax + v.z * az;
    const latX = v.x - alongV * ax, latZ = v.z - alongV * az;
    const damp = Math.max(0, 1 - 8 * DT);
    s.body.setLinvel(
      {
        x: ax * tube.cruise + latX * damp,
        y: v.y,
        z: az * tube.cruise + latZ * damp,
      },
      true,
    );
  }
  /** Killer mailbox: shrink, parcel, post, wait, then a smoking burst. */
  private updateMailbox(m: Mechanism, p: R.Vector) {
    const s = this.sim;
    const mb = m.mailbox!;
    const baseY = m.h.y ?? 0;
    if (mb.started === undefined) {
      if (s.status !== "driving") return;
      const dx = p.x - m.h.x, dz = p.z - m.h.z;
      const dy = p.y - baseY;
      if (
        Math.hypot(dx, dz) > MAILBOX.sensorR ||
        dy < MAILBOX.sensorBase ||
        dy > MAILBOX.sensorTop
      )
        return;
      mb.started = s.time;
      mb.carFrom = { x: p.x, y: p.y, z: p.z };
      // Freeze the truck for the show; the script drives from here.
      s.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true);
      s.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      s.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      m.contacts++;
      s.damageEvents.push({
        source: "mailbox",
        part: "chassis-front",
        time: s.time,
      });
      return;
    }
    if (mb.exploded) return;
    const t = s.time - mb.started;
    if (t >= MAILBOX.explode) {
      mb.exploded = true;
      // Scorched burst: every part detaches blackened and smoking, then the
      // chassis goes and the run wrecks like any cooked truck.
      const victims = [...s.parts.entries()].filter(
        ([id, part]) => !id.startsWith("chassis") && part.health > 0,
      );
      victims.forEach(([id, part], i) => {
        s.fireDamage(id, part.health);
        const body = s.parts.get(id)!.body!;
        const a = i * 2.4;
        const dir = new Vector3(Math.cos(a), 1.0, Math.sin(a)).normalize();
        const impulse = MAILBOX.burst * body.mass();
        body.applyImpulse(
          { x: dir.x * impulse, y: dir.y * impulse, z: dir.z * impulse },
          true,
        );
      });
      s.damage("chassis-front", 10000);
      s.damageEvents.push({
        source: "mailbox",
        part: "chassis-front",
        time: s.time,
      });
      return;
    }
    if (t >= MAILBOX.shrink) {
      // Parcel arc into the slot: freeze point, over the rim, down the slot.
      const k = Math.max(0, Math.min(1, (t - MAILBOX.shrink) / (MAILBOX.fly - MAILBOX.shrink)));
      const e = k * k * (3 - 2 * k);
      const from = mb.carFrom;
      const to = { x: m.h.x, y: baseY + 3.5, z: m.h.z };
      const mid = {
        x: (from.x + to.x) / 2,
        y: Math.max(from.y, to.y) + 4,
        z: (from.z + to.z) / 2,
      };
      const a = {
        x: from.x + (mid.x - from.x) * e,
        y: from.y + (mid.y - from.y) * e,
        z: from.z + (mid.z - from.z) * e,
      };
      const b = {
        x: mid.x + (to.x - mid.x) * e,
        y: mid.y + (to.y - mid.y) * e,
        z: mid.z + (to.z - mid.z) * e,
      };
      s.body.setTranslation(
        {
          x: a.x + (b.x - a.x) * e,
          y: a.y + (b.y - a.y) * e,
          z: a.z + (b.z - a.z) * e,
        },
        true,
      );
    }
  }
  /** Oversized bite: tear off the 3 parts nearest the mouth, splash 40% everywhere else. */
  private ripWithDinosaur(
    kind: DinosaurKind, h: DungeonHazard, x: number, z: number, mouth: number, height: number,
  ) {
    const s = this.sim;
    const q = new Quaternion().copy(s.body.rotation());
    const t = s.body.translation();
    const jaw = new Vector3(h.x + x * mouth, (h.y ?? 0) + height, h.z + z * mouth);
    const ripped = new Set(
      s.partDefs
        .filter((d) => !s.parts.get(d.id)!.body)
        .map((d) => ({ d, dist: new Vector3(...d.pos).applyQuaternion(q).add(t).distanceTo(jaw) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3)
        .map(({ d }) => d.id),
    );
    for (const id of ripped) {
      s.damage(id, s.parts.get(id)!.health);
      s.damageEvents.push({ source: kind, part: id, time: s.time });
    }
    for (const d of s.partDefs) {
      if (ripped.has(d.id)) continue;
      const st = s.parts.get(d.id)!;
      if (st.body || st.health <= 0) continue;
      s.damage(d.id, st.health * 0.4);
    }
  }
  after() {
    const launched = this.gauntlet.after();
    const s = this.sim,
      p = s.body.translation();
    for (const m of this.mechanisms) {
      const h = m.h;
      if (h.kind === "lime-chomper") {
        if (s.status !== "driving" || !limeJawPose(s.time + h.phase).striking) continue;
        const yaw = h.yaw ?? 0;
        const dx = p.x - h.x, dz = p.z - h.z;
        const across = dx * Math.cos(yaw) - dz * Math.sin(yaw);
        const forward = dx * Math.sin(yaw) + dz * Math.cos(yaw);
        const y = p.y - (h.y ?? 0);
        if (Math.abs(across) <= LIME_JAW.halfWidth && forward >= LIME_JAW.back &&
            forward <= LIME_JAW.tip && y >= -0.5 && y <= 5.8) {
          m.contacts++;
          s.damage("chassis-front", 10000);
          s.damageEvents.push({ source: h.kind, part: "chassis-front", time: s.time });
        }
        continue;
      }
      if (isDinosaur(h.kind)) {
        this.attackWithDinosaur(m, h.kind, p);
        continue;
      }
      if (h.kind === "robot") {
        const shifted = s.time + h.phase;
        const cycle = Math.floor(shifted / SNAP_CYCLE);
        if (snapStriking(shifted) && cycle !== m.lastCycle) {
          const rdx = p.x - h.x,
            rdz = p.z - h.z;
          if (
            rdx * rdx + rdz * rdz <= ROBOT_STOMP_RADIUS * ROBOT_STOMP_RADIUS &&
            Math.abs(p.y - ((h.y ?? 0) + 1.5)) <= 4
          ) {
            m.lastCycle = cycle;
            m.contacts++;
            s.damage("chassis-front", ROBOT_STOMP_DAMAGE);
            s.damageEvents.push({
              source: h.kind,
              part: "chassis-front",
              time: s.time,
            });
          }
        }
        // Sweeping laser: 30% of current health per second of beam exposure,
        // applied in 100ms ticks to every attached part.
        const ldx = p.x - h.x, ldz = p.z - h.z;
        if (
          s.status === "driving" &&
          robotLaserFiring(shifted) &&
          Math.hypot(ldx, ldz) < ROBOT_LASER_RANGE &&
          Math.abs(p.y - ((h.y ?? 0) + 1.5)) <= 4
        ) {
          const bearing = Math.atan2(ldx, ldz) - (h.yaw ?? 0);
          const aim = robotLaserAngle(shifted);
          const err = Math.atan2(Math.sin(bearing - aim), Math.cos(bearing - aim));
          if (Math.abs(err) <= ROBOT_LASER_HALF_ANGLE) {
            const laser = m.laser ?? (m.laser = { debt: 0, lastEvent: -100 });
            laser.debt += DT;
            while (laser.debt >= ROBOT_LASER_TICK) {
              laser.debt -= ROBOT_LASER_TICK;
              for (const d of s.partDefs) {
                const st = s.parts.get(d.id)!;
                if (st.body || st.health <= 0) continue;
                s.damage(d.id, st.health * ROBOT_LASER_DPS * ROBOT_LASER_TICK);
              }
              m.contacts++;
              if (s.time - laser.lastEvent > 0.5) {
                laser.lastEvent = s.time;
                s.damageEvents.push({
                  source: h.kind,
                  part: "chassis-front",
                  time: s.time,
                });
              }
            }
          }
        }
        continue;
      }
      if (h.kind === "boulder") {
        this.rollBoulder(m, p);
        continue;
      }
      if (h.kind === "pelican") {
        this.updatePelican(m, p);
        continue;
      }
      if (h.kind === "anchor") {
        this.updateAnchor(m);
        continue;
      }
      if (h.kind === "ship") continue;
      if (h.kind === "spider") {
        this.updateSpider(m, p);
        continue;
      }
      if (h.kind === "speed-tube") {
        this.updateSpeedTube(m, p);
        continue;
      }
      if (h.kind === "mailbox") {
        this.updateMailbox(m, p);
        continue;
      }
      if (h.kind === "teeter-totter") continue;
      if (h.kind === "rocker") continue;
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
    return launched;
  }
  snapshot() {
    return {
      hazards: this.mechanisms.map((m) => {
        const machine = this.gauntlet.inspect(m.h.id);
        const bodyPos =
          m.h.kind === "anchor" || m.h.kind === "ship"
            ? m.body?.translation()
            : undefined;
        const entry: {
          id: string;
          kind: string;
          x: number;
          z: number;
          colliders: number;
          contacts: number;
          striking: boolean;
          perch?: number;
          flying?: boolean;
          yaw?: number;
          fired?: boolean;
          departed?: boolean;
          hunting?: boolean;
          tubed?: boolean;
          posted?: boolean;
          exploded?: boolean;
          tilt?: number;
        } = {
          id: m.h.id,
          kind: m.h.kind,
          x: machine?.x ?? bodyPos?.x ?? m.pelican?.pos.x ?? m.h.x,
          z: machine?.z ?? bodyPos?.z ?? m.pelican?.pos.z ?? m.h.z,
          colliders: m.colliders.length + (machine?.colliders ?? 0),
          contacts: machine?.contacts ?? m.contacts,
          striking: machine?.striking ?? (m.h.kind === "lime-chomper"
            ? limeJawPose(this.sim.time + m.h.phase).striking
            : isDinosaur(m.h.kind)
              ? !!m.bite && dinosaurPose(this.sim.time - m.bite.started).striking
              : m.h.kind === "pelican"
                ? !!m.pelican?.bite &&
                  pelicanPose(this.sim.time - m.pelican.bite.started).striking
                : m.h.kind === "anchor"
                  ? !!m.anchor?.fired
                  : m.h.kind === "ship"
                    ? m.ship?.departedAt !== undefined &&
                      shipSailed(m.ship.departedAt, this.sim.time) < SHIP.distance
                    : m.h.kind === "spider"
                      ? !!m.spider?.hunting
                      : m.h.kind === "speed-tube"
                        ? !!m.tube?.inside
                        : m.h.kind === "mailbox"
                          ? m.mailbox?.started !== undefined && !m.mailbox.exploded
                          : m.h.kind === "teeter-totter"
                            ? false
                            : snapStriking(this.sim.time + m.h.phase)),
        };
        if (m.pelican) {
          entry.perch = m.pelican.index;
          entry.flying = m.pelican.phase !== "guard";
          entry.yaw = m.pelican.yaw;
        }
        if (m.anchor) entry.fired = m.anchor.fired;
        if (m.ship) entry.departed = m.ship.departedAt !== undefined;
        if (m.spider) {
          entry.x = m.spider.pos.x;
          entry.z = m.spider.pos.z;
          entry.hunting = m.spider.hunting;
        }
        if (m.tube) entry.tubed = m.tube.inside;
        if (m.mailbox) {
          entry.posted = m.mailbox.started !== undefined;
          entry.exploded = m.mailbox.exploded;
        }
        if (m.h.kind === "teeter-totter")
          entry.tilt =
            TEETER.restTilt +
            TEETER.amp *
              Math.sin(
                ((this.sim.time + m.h.phase) / TEETER.period) * Math.PI * 2,
              );
        return entry;
      }),
    };
  }
}
