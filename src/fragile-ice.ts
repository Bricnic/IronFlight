import R from "@dimforge/rapier3d-compat";
import { DT } from "./clock";
import type { Track } from "./tracks";
import type { Simulation } from "./simulation";

/** Edge length of one ice sheet; fields are grids of these tiles. */
export const FRAGILE_ICE_SIZE = 5;
/** Shatter chance when two wheels rest on one tile. */
export const FRAGILE_ICE_SHATTER_CHANCE = 0.1;
/** Seconds of freezing water before the truck is a wreck, like the water prefab. */
export const FRAGILE_ICE_SINK_SECONDS = 2.5;
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
  x: number;
  z: number;
  y?: number;
};

/** Custom levels serve whatever ice tiles the author floated over the pits. */
export function fragileIceHazards(track?: Track): FragileIceTile[] {
  if (!track?.custom) return [];
  return track.custom.prefabs
    .filter((p) => p.kind === "fragile-ice")
    .map((p) => ({
      id: p.id,
      x: p.x,
      z: p.z,
      ...(p.y === undefined ? {} : { y: p.y }),
    }));
}

export type FragileIceState = {
  h: FragileIceTile;
  sheet: R.Collider | null;
  sensor: R.Collider;
  shattered: boolean;
  armed: boolean;
  wheels: number;
  sinking: number;
  contacts: number;
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
    this.sim.damageEvents.push({ source: "fragile-ice", part: "chassis-front", time: this.sim.time });
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
  private sink() {
    const s = this.sim;
    const dunked = this.tiles.filter((t) => t.shattered && this.intersects(t.sensor));
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
      x: t.h.x,
      z: t.h.z,
      shattered: t.shattered,
      wheels: t.wheels,
      sinking: t.sinking,
      contacts: t.contacts,
    }));
  }
}
