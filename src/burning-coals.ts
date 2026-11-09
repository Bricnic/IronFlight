import R from "@dimforge/rapier3d-compat";
import type { Track } from "./tracks";
import type { Simulation } from "./simulation";

/** Edge length of one coal lump. */
export const BURNING_COAL_SIZE = 0.9;
/** Dense little lumps: heavier than foam blocks, still kickable. */
export const BURNING_COAL_MASS = 3;
/** Flat HP burn per part contact. */
export const BURNING_COAL_BURN = 25;
/** Per-coal burn cooldown in seconds. */
export const BURNING_COAL_COOLDOWN = 1;

export type BurningCoal = {
  id: string;
  x: number;
  z: number;
  y?: number;
};

/** Custom levels serve whatever coals the author perched on the blocks. */
export function burningCoalHazards(track?: Track): BurningCoal[] {
  if (!track?.custom) return [];
  return track.custom.prefabs
    .filter((p) => p.kind === "burning-coals")
    .map((p) => ({
      id: p.id,
      x: p.x,
      z: p.z,
      ...(p.y === undefined ? {} : { y: p.y }),
    }));
}

type CoalState = {
  h: BurningCoal;
  body: R.RigidBody;
  collider: R.Collider;
  lastHit: number;
};

export class BurningCoals {
  coals: CoalState[] = [];
  constructor(private sim: Simulation) {
    if (!sim.courseTrack) return;
    for (const h of burningCoalHazards(sim.courseTrack)) this.addCoal(h);
  }
  /** Live placement: add one coal without resetting the run. */
  addCoal(h: BurningCoal) {
    const world = this.sim.world;
    const half = BURNING_COAL_SIZE / 2;
    const body = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(h.x, (h.y ?? 0) + half, h.z)
        .setLinearDamping(0.1)
        .setAngularDamping(0.3)
        .setCcdEnabled(true),
    );
    const collider = world.createCollider(
      R.ColliderDesc.cuboid(half, half, half)
        .setMass(BURNING_COAL_MASS)
        .setFriction(0.5)
        .setRestitution(0.3),
      body,
    );
    this.coals.push({ h: { ...h }, body, collider, lastHit: -Infinity });
  }
  /** Live editing: shift one coal and stop it dead. */
  moveCoal(id: string, x: number, y: number, z: number) {
    const c = this.coals.find((cc) => cc.h.id === id);
    if (!c) return;
    c.h.x = x;
    c.h.y = y;
    c.h.z = z;
    c.body.setTranslation(
      { x, y: y + BURNING_COAL_SIZE / 2, z },
      true,
    );
    c.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    c.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
  /** Live editing: drop one coal and its body. */
  removeCoal(id: string) {
    const at = this.coals.findIndex((cc) => cc.h.id === id);
    if (at < 0) return;
    const [c] = this.coals.splice(at, 1);
    this.sim.world.removeCollider(c.collider, true);
    this.sim.world.removeRigidBody(c.body);
  }
  private partContact(c: CoalState, parts: Map<number, string>) {
    let hit: string | null = null;
    this.sim.world.contactPairsWith(c.collider, (other) => {
      const id = parts.get(other.handle);
      if (!id || hit) return;
      this.sim.world.contactPair(c.collider, other, (manifold) => {
        if (manifold.numSolverContacts() > 0) hit = id;
      });
    });
    return hit;
  }
  after() {
    const s = this.sim;
    if (s.status !== "driving") return;
    const parts = new Map<number, string>();
    for (const def of s.partDefs) {
      const collider = s.parts.get(def.id)?.collider;
      if (collider) parts.set(collider.handle, def.id);
    }
    for (const c of this.coals) {
      if (s.time - c.lastHit < BURNING_COAL_COOLDOWN) continue;
      const hit = this.partContact(c, parts);
      if (!hit) continue;
      c.lastHit = s.time;
      s.damage(hit, BURNING_COAL_BURN);
      s.damageEvents.push({ source: "burning-coals", part: hit, time: s.time });
    }
  }
  snapshot() {
    return this.coals.map((c) => {
      const p = c.body.translation();
      return {
        id: c.h.id,
        x: p.x,
        y: p.y,
        z: p.z,
        contacts: 0,
      };
    });
  }
}
