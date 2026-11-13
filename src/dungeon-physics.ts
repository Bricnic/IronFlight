import R from "@dimforge/rapier3d-compat";
import { DT } from "./clock";
import { Quaternion, Vector3 } from "three";
import type { Simulation } from "./simulation";
import { isCandyDecor, isCandyLethal, isChristmasDecor, isChristmasLethal, isDinosaur, isGauntletMachine, type DinosaurKind } from "./custom-level";
import { GauntletPhysics } from "./gauntlet-physics";
import { SCREW_FIELD_SIZE } from "./gauntlet-timing";
import {
  DINOSAUR_BITE,
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
        return {
          id: m.h.id,
          kind: m.h.kind,
          x: machine?.x ?? m.h.x,
          z: machine?.z ?? m.h.z,
          colliders: m.colliders.length + (machine?.colliders ?? 0),
          contacts: machine?.contacts ?? m.contacts,
          striking: machine?.striking ?? (m.h.kind === "lime-chomper"
            ? limeJawPose(this.sim.time + m.h.phase).striking
            : isDinosaur(m.h.kind)
              ? !!m.bite && dinosaurPose(this.sim.time - m.bite.started).striking
              : snapStriking(this.sim.time + m.h.phase)),
        };
      }),
    };
  }
}
