import R from "@dimforge/rapier3d-compat";
import { Euler, Quaternion, Vector3 } from "three";
import { DT } from "./clock";
import type { Track } from "./tracks";
import type { Simulation } from "./simulation";

/** Edge length of one ice sheet; fields are grids of these tiles. */
export const FRAGILE_ICE_SIZE = 5;
/** Shatter chance when two wheels rest on one tile. */
export const FRAGILE_ICE_SHATTER_CHANCE = 0.1;
/** Seconds of freezing water before the truck is a wreck, like the water prefab. */
export const FRAGILE_ICE_SINK_SECONDS = 2.5;
/** Rickety planks groan, then give way behind a moving truck. */
export const RICKETY_COLLAPSE_DELAY = 0.6;
export const FRAGILE_SHARD_COUNT = 6;
/** Bounded cleanup for debris that falls into an empty chasm. */
const RICKETY_DEBRIS_LIFETIME = 12;
const SHARD_RADIUS = 0.45;
export function fragileShardLocal(i: number) {
  const a = i / FRAGILE_SHARD_COUNT * Math.PI * 2 + 0.4;
  return { pos: new Vector3(Math.cos(a) * (FRAGILE_ICE_SIZE / 2 - 0.5), 0.1, Math.sin(a) * (FRAGILE_ICE_SIZE / 2 - 0.5)), rot: new Euler(i * 1.3, a, i * 0.7) };
}
export type PlankDebris = {
  position: Vector3;
  velocity: Vector3;
  rotation: Quaternion;
  spin: Quaternion;
  active: boolean;
  grounded: boolean;
};
/** Freezing water burns like the water prefab: 45% of each part per second. */
const FRAGILE_ICE_DAMAGE_RATE = 0.45;
/** Visible water surface below the rim. */
export const FRAGILE_ICE_WATER_Y = -0.8;

const SHEET_TOP = 0.02;
const SHEET_H = 0.3;
// Sheets and sensors stop 2cm short of the tile edge so adjacent tiles never
// touch: thousands of coincident static pairs would stall the broadphase.
// (Basins live in the level as shared per-lake solids; a lone editor-placed
// tile with no pit still works as a damage pool, like plaza water.)
const SHEET_W = FRAGILE_ICE_SIZE - 0.04;
const SENSOR_W = FRAGILE_ICE_SIZE - 0.1;

export type FragileIceTile = {
  id: string;
  kind: "fragile-ice" | "rickety-plank";
  x: number;
  z: number;
  y?: number;
  yaw?: number;
};

/** Custom levels serve whatever ice tiles the author floated over the pits. */
export function fragileIceHazards(track?: Track): FragileIceTile[] {
  if (!track?.custom) return [];
  return track.custom.prefabs
    .filter((p) => p.kind === "fragile-ice" || p.kind === "rickety-plank")
    .map((p) => ({
      id: p.id,
      kind: p.kind as FragileIceTile["kind"],
      x: p.x,
      z: p.z,
      ...(p.y === undefined ? {} : { y: p.y }),
      ...(p.yaw === undefined ? {} : { yaw: p.yaw }),
    }));
}

export type FragileIceState = {
  h: FragileIceTile;
  sheet: R.Collider | null;
  sensor: R.Collider;
  shattered: boolean;
  armed: boolean;
  armedAt: number;
  wheels: number;
  sinking: number;
  contacts: number;
  debris?: PlankDebris[];
  debrisUntil?: number;
};

export class FragileIce {
  tiles: FragileIceState[] = [];
  private sheets = new Map<number, FragileIceState>();
  /** Roll source; tests stub this for deterministic shatter checks. */
  rng: () => number = Math.random;
  constructor(private sim: Simulation) {
    if (!sim.courseTrack) return;
    for (const h of fragileIceHazards(sim.courseTrack)) this.addTile(h);
  }
  /** Live placement: add one tile without resetting the run. */
  addTile(h: FragileIceTile) {
    const world = this.sim.world;
    const baseY = h.y ?? 0;
    const yawQ = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      h.yaw ?? 0,
    );
    const box = (
      x: number,
      y: number,
      z: number,
      w: number,
      height: number,
      d: number,
      sensor = false,
    ) => {
      const c = world.createCollider(
        R.ColliderDesc.cuboid(w / 2, height / 2, d / 2)
          .setTranslation(h.x + x, baseY + y, h.z + z)
          .setRotation(yawQ.clone())
          .setSensor(sensor)
          .setFriction(0.8),
      );
      return c;
    };
    const sheet = box(0, SHEET_TOP - SHEET_H / 2, 0, SHEET_W, SHEET_H, SHEET_W);
    const sensor = box(0, -1.5, 0, SENSOR_W, 7, SENSOR_W, true);
    const tile: FragileIceState = {
      h: { ...h },
      sheet,
      sensor,
      shattered: false,
      armed: false,
      armedAt: 0,
      wheels: 0,
      sinking: 0,
      contacts: 0,
    };
    this.tiles.push(tile);
    this.sheets.set(sheet.handle, tile);
  }
  /** Live editing: shift one tile and its basin by delta. */
  moveTile(id: string, x: number, y: number, z: number) {
    const t = this.tiles.find((tt) => tt.h.id === id);
    if (!t) return;
    const dx = x - t.h.x;
    const dy = y - (t.h.y ?? 0);
    const dz = z - t.h.z;
    t.h.x = x;
    t.h.y = y;
    t.h.z = z;
    for (const shard of t.debris ?? []) shard.position.add(new Vector3(dx, dy, dz));
    for (const c of [...(t.sheet ? [t.sheet] : []), t.sensor]) {
      const p = c.translation();
      c.setTranslation({ x: p.x + dx, y: p.y + dy, z: p.z + dz });
    }
  }
  /** Live editing: drop one tile. */
  removeTile(id: string) {
    const at = this.tiles.findIndex((tt) => tt.h.id === id);
    if (at < 0) return;
    const [t] = this.tiles.splice(at, 1);
    if (t.sheet) this.sheets.delete(t.sheet.handle);
    for (const c of [...(t.sheet ? [t.sheet] : []), t.sensor])
      this.sim.world.removeCollider(c, true);
  }
  private shatter(t: FragileIceState) {
    if (t.sheet) {
      this.sheets.delete(t.sheet.handle);
      this.sim.world.removeCollider(t.sheet, true);
      t.sheet = null;
    }
    t.shattered = true;
    t.armed = false;
    t.contacts++;
    if (t.h.kind === "rickety-plank") {
      const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), t.h.yaw ?? 0);
      t.debrisUntil = this.sim.time + RICKETY_DEBRIS_LIFETIME;
      t.debris = Array.from({ length: FRAGILE_SHARD_COUNT }, (_, i) => {
        const local = fragileShardLocal(i);
        return {
          position: local.pos.clone().applyQuaternion(yaw).add(new Vector3(t.h.x, t.h.y ?? 0, t.h.z)),
          velocity: new Vector3(local.pos.x * 0.35, -0.5 - i * 0.1, local.pos.z * 0.35).applyQuaternion(yaw),
          rotation: new Quaternion().setFromEuler(local.rot).premultiply(yaw),
          spin: new Quaternion().setFromEuler(new Euler((i - 2) * DT, (i % 2 ? 1 : -1) * DT, (3 - i) * DT)),
          active: true, grounded: false,
        };
      });
    }
    this.sim.damageEvents.push({ source: t.h.kind, part: "chassis-front", time: this.sim.time });
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
  /** Shared dunking clock: one instance of water effects no matter how many broken sensors overlap. */
  sinking = 0;
  private updateDebris() {
    const s = this.sim, world = s.world;
    for (const tile of this.tiles) for (const shard of tile.debris ?? []) {
      if (!shard.active) continue;
      if (s.time >= tile.debrisUntil!) { shard.active = false; continue; }
      if (shard.grounded) continue;
      const g = world.gravity, v = shard.velocity;
      v.set(v.x + g.x * DT, v.y + g.y * DT, v.z + g.z * DT);
      const distance = shard.velocity.length() * DT;
      if (distance < 1e-9) continue;
      const direction = shard.velocity.clone().normalize();
      const hit = world.castRayAndGetNormal(
        new R.Ray(shard.position, direction), distance + SHARD_RADIUS, true,
        R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_KINEMATIC,
        undefined, undefined, undefined,
        collider => !collider.isSensor() || s.surfaceKind(collider.handle) === "lava",
      );
      if (hit && s.surfaceKind(hit.collider.handle) === "lava") { shard.active = false; continue; }
      shard.position.addScaledVector(direction, hit ? Math.max(0, hit.timeOfImpact - SHARD_RADIUS - 0.001) : distance);
      if (hit) {
        if (hit.normal.y > 0.5 && shard.velocity.y < 0) { shard.grounded = true; shard.velocity.set(0, 0, 0); }
        else {
          const normal = new Vector3(hit.normal.x, hit.normal.y, hit.normal.z);
          shard.velocity.addScaledVector(normal, -1.2 * shard.velocity.dot(normal));
        }
      }
      shard.rotation.multiply(shard.spin);
    }
  }
  private sink() {
    const s = this.sim;
    // Rickety planks span lava or chasms: falling through meets that fate,
    // never freezing water.
    const dunked = this.tiles.filter(
      (t) => t.h.kind === "fragile-ice" && t.shattered && this.intersects(t.sensor),
    );
    for (const t of this.tiles) {
      if (t.shattered && this.intersects(t.sensor)) {
        t.contacts++;
        t.sinking += DT;
      } else {
        t.sinking = 0;
      }
    }
    if (dunked.length === 0) {
      this.sinking = 0;
      return;
    }
    this.sinking += DT;
    const v = s.body.linvel();
    s.body.setLinvel({ x: v.x * 0.9, y: -1.8, z: v.z * 0.9 }, true);
    for (const part of s.partDefs)
      s.damage(part.id, part.hp * DT * FRAGILE_ICE_DAMAGE_RATE);
    if (this.sinking > FRAGILE_ICE_SINK_SECONDS) {
      s.damage("chassis-front", 10000);
      s.damageEvents.push({ source: "fragile-ice", part: "chassis-front", time: s.time });
    }
  }
  after() {
    const s = this.sim;
    this.updateDebris();
    if (s.status !== "driving") return;
    const counts = new Map<FragileIceState, number>();
    for (let i = 0; i < 4; i++) {
      if (s.parts.get(s.partDefs[i + 2].id)!.body) continue;
      if (!s.vehicle.wheelIsInContact(i)) continue;
      const ground = s.vehicle.wheelGroundObject(i);
      const tile = ground ? this.sheets.get(ground.handle) : undefined;
      if (!tile || tile.shattered) continue;
      counts.set(tile, (counts.get(tile) ?? 0) + 1);
    }
    for (const t of this.tiles) {
      t.wheels = counts.get(t) ?? 0;
      if (t.shattered) continue;
      if (t.h.kind === "rickety-plank") {
        // Groan on first touch, give way shortly after: at speed the deck
        // collapses behind the truck; stopping on it drops straight through.
        if (t.wheels >= 1 && !t.armed) {
          t.armed = true;
          t.armedAt = s.time;
        }
        if (t.armed && s.time - t.armedAt >= RICKETY_COLLAPSE_DELAY)
          this.shatter(t);
        continue;
      }
      // One roll per visit: re-arms only after dropping below two wheels.
      if (t.wheels >= 2) {
        if (!t.armed) {
          t.armed = true;
          if (this.rng() < FRAGILE_ICE_SHATTER_CHANCE) this.shatter(t);
        }
      } else {
        t.armed = false;
      }
    }
    this.sink();
  }
  snapshot() {
    return this.tiles.map((t) => ({
      id: t.h.id,
      kind: t.h.kind,
      x: t.h.x,
      z: t.h.z,
      shattered: t.shattered,
      wheels: t.wheels,
      sinking: t.sinking,
      contacts: t.contacts,
      ...(t.debris ? { shards: t.debris.filter(s => s.active).map(s => ({ x: s.position.x, y: s.position.y, z: s.position.z })) } : {}),
    }));
  }
}
