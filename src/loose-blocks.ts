import R from "@dimforge/rapier3d-compat";
import { Vector3 } from "three";
import type { Track } from "./tracks";
import type { Simulation } from "./simulation";

/** Edge length of one letter cube. */
export const LOOSE_BLOCK_SIZE = 1.5;
/** Foam-light mass: the truck plows through a stack without slowing. */
export const LOOSE_BLOCK_MASS = 2;
/** Fraction of a part's max HP dealt when a block falls onto the truck. */
export const LOOSE_BLOCK_DAMAGE = 0.1;
/** Downward block speed that counts as falling onto the truck. */
export const LOOSE_BLOCK_FALL_SPEED = 2;
/** Per-block damage cooldown in seconds. */
export const LOOSE_BLOCK_COOLDOWN = 1;
/** Glass tower pane dimensions in world units. */
export const GLASS_PANE_SIZE = { w: 4, h: 0.5, d: 4 } as const;
export const GLASS_PANE_MASS = 3;
/** Fraction of a part's max HP dealt when a pane falls onto the truck. */
export const GLASS_PANE_DAMAGE = 0.05;
/** A pane landing hard on the floor bursts into this many shards. */
export const GLASS_SHARD_COUNT = 5;
export const GLASS_SHARD_SIZE = { w: 0.7, h: 0.12, d: 0.7 } as const;
export const GLASS_SHARD_MASS = 0.2;
/** Downward pane speed that shatters on floor contact. */
export const GLASS_SHATTER_FALL_SPEED = 2;

export type LooseBlock = {
  kind: string;
  id: string;
  x: number;
  z: number;
  y?: number;
};

/** Custom levels serve whatever loose blocks the author placed. */
export function looseBlockHazards(track?: Track): LooseBlock[] {
  if (!track?.custom) return [];
  return track.custom.prefabs
    .filter((p) => p.kind === "loose-blocks" || p.kind === "glass-pane")
    .map((p) => ({
      id: p.id,
      kind: p.kind,
      x: p.x,
      z: p.z,
      ...(p.y === undefined ? {} : { y: p.y }),
    }));
}

type BlockState = {
  h: LooseBlock;
  body: R.RigidBody;
  collider: R.Collider;
  lastHit: number;
};

export class LooseBlocks {
  blocks: BlockState[] = [];
  private incoming = new Map<BlockState, Vector3>();
  captureVelocities() {
    for (const b of this.blocks)
      this.incoming.set(b, new Vector3().copy(b.body.linvel()));
  }
  constructor(private sim: Simulation) {
    if (!sim.courseTrack) return;
    for (const h of looseBlockHazards(sim.courseTrack)) this.addBlock(h);
  }
  /** Live placement: add one block without resetting the run. */
  addBlock(h: LooseBlock): BlockState {
    const world = this.sim.world;
    const glass = h.kind === "glass-pane";
    const shard = h.kind === "glass-shard";
    const dims = shard ? GLASS_SHARD_SIZE : glass ? GLASS_PANE_SIZE : null;
    const hx = dims ? dims.w / 2 : LOOSE_BLOCK_SIZE / 2;
    const hy = dims ? dims.h / 2 : LOOSE_BLOCK_SIZE / 2;
    const hz = dims ? dims.d / 2 : LOOSE_BLOCK_SIZE / 2;
    const body = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(h.x, (h.y ?? 0) + hy, h.z)
        .setLinearDamping(0.15)
        .setAngularDamping(0.4)
        .setCcdEnabled(true),
    );
    const collider = world.createCollider(
      R.ColliderDesc.cuboid(hx, hy, hz)
        .setMass(shard ? GLASS_SHARD_MASS : glass ? GLASS_PANE_MASS : LOOSE_BLOCK_MASS)
        .setFriction(0.55)
        .setRestitution(0.15),
      body,
    );
    const state: BlockState = { h: { ...h }, body, collider, lastHit: -Infinity };
    this.blocks.push(state);
    return state;
  }
  /** Live editing: shift one block and stop it dead. */
  moveBlock(id: string, x: number, y: number, z: number) {
    const b = this.blocks.find((bb) => bb.h.id === id);
    if (!b) return;
    b.h.x = x;
    b.h.y = y;
    b.h.z = z;
    b.body.setTranslation(
      { x, y: y + (b.h.kind === "glass-pane" ? GLASS_PANE_SIZE.h : LOOSE_BLOCK_SIZE) / 2, z },
      true,
    );
    b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
  /** Live editing: drop one block and its body. */
  removeBlock(id: string) {
    const at = this.blocks.findIndex((bb) => bb.h.id === id);
    if (at < 0) return;
    const [b] = this.blocks.splice(at, 1);
    this.incoming.delete(b);
    this.sim.world.removeCollider(b.collider, true);
    this.sim.world.removeRigidBody(b.body);
  }
  private partContact(b: BlockState, parts: Map<number, string>) {
    let hit: string | null = null;
    this.sim.world.contactPairsWith(b.collider, (other) => {
      const id = parts.get(other.handle);
      if (!id || hit) return;
      this.sim.world.contactPair(b.collider, other, (manifold) => {
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
    for (const b of this.blocks) {
      if (b.h.kind === "glass-shard") continue;
      const falling = (this.incoming.get(b) ?? b.body.linvel()).y;
      if (falling > -LOOSE_BLOCK_FALL_SPEED) continue;
      if (s.time - b.lastHit < LOOSE_BLOCK_COOLDOWN) continue;
      const hit = this.partContact(b, parts);
      if (!hit) continue;
      b.lastHit = s.time;
      const def = s.partDefs.find((p) => p.id === hit)!;
      const rate = b.h.kind === "glass-pane" ? GLASS_PANE_DAMAGE : LOOSE_BLOCK_DAMAGE;
      s.damage(hit, def.hp * rate);
      s.damageEvents.push({ source: b.h.kind, part: hit, time: s.time });
    }
    const shattered: BlockState[] = [];
    for (const b of this.blocks) {
      if (b.h.kind !== "glass-pane") continue;
      const falling = (this.incoming.get(b) ?? b.body.linvel()).y;
      if (falling > -GLASS_SHATTER_FALL_SPEED) continue;
      if (!this.floorContact(b)) continue;
      shattered.push(b);
    }
    for (const b of shattered) this.shatter(b);
  }
  /** True while touching static world geometry (floor, road, walls). */
  private floorContact(b: BlockState) {
    let grounded = false;
    this.sim.world.contactPairsWith(b.collider, (other) => {
      if (grounded) return;
      const parent = other.parent();
      if (parent && parent.bodyType() !== R.RigidBodyType.Fixed) return;
      this.sim.world.contactPair(b.collider, other, (manifold) => {
        if (manifold.numSolverContacts() > 0) grounded = true;
      });
    });
    return grounded;
  }
  /** Burst one landed pane into deterministic shards. */
  private shatter(b: BlockState) {
    const p = b.body.translation();
    const id = b.h.id;
    this.removeBlock(id);
    const kicks = [
      { ox: 0, oz: 0, vx: 0, vz: 0 },
      { ox: 0.9, oz: 0, vx: 2.5, vz: 0 },
      { ox: -0.9, oz: 0, vx: -2.5, vz: 0 },
      { ox: 0, oz: 0.9, vx: 0, vz: 2.5 },
      { ox: 0, oz: -0.9, vx: 0, vz: -2.5 },
    ];
    for (let i = 0; i < GLASS_SHARD_COUNT; i++) {
      const kick = kicks[i % kicks.length];
      const shard = this.addBlock({
        id: `${id}-shard-${i}`,
        kind: "glass-shard",
        x: p.x + kick.ox,
        y: Math.max(0.4, p.y),
        z: p.z + kick.oz,
      });
      shard.body.setLinvel({ x: kick.vx, y: 2, z: kick.vz }, true);
      shard.body.setAngvel({ x: i * 2 - 4, y: 0, z: 4 - i * 2 }, true);
    }
  }
  snapshot() {
    return this.blocks.map((b) => {
      const p = b.body.translation();
      return {
        id: b.h.id,
        x: p.x,
        y: p.y,
        z: p.z,
        contacts: 0,
      };
    });
  }
}
