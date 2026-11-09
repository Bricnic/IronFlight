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

export type LooseBlock = {
  id: string;
  x: number;
  z: number;
  y?: number;
};

/** Custom levels serve whatever loose blocks the author placed. */
export function looseBlockHazards(track?: Track): LooseBlock[] {
  if (!track?.custom) return [];
  return track.custom.prefabs
    .filter((p) => p.kind === "loose-blocks")
    .map((p) => ({
      id: p.id,
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
  addBlock(h: LooseBlock) {
    const world = this.sim.world;
    const half = LOOSE_BLOCK_SIZE / 2;
    const body = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(h.x, (h.y ?? 0) + half, h.z)
        .setLinearDamping(0.15)
        .setAngularDamping(0.4)
        .setCcdEnabled(true),
    );
    const collider = world.createCollider(
      R.ColliderDesc.cuboid(half, half, half)
        .setMass(LOOSE_BLOCK_MASS)
        .setFriction(0.55)
        .setRestitution(0.15),
      body,
    );
    this.blocks.push({ h: { ...h }, body, collider, lastHit: -Infinity });
  }
  /** Live editing: shift one block and stop it dead. */
  moveBlock(id: string, x: number, y: number, z: number) {
    const b = this.blocks.find((bb) => bb.h.id === id);
    if (!b) return;
    b.h.x = x;
    b.h.y = y;
    b.h.z = z;
    b.body.setTranslation(
      { x, y: y + LOOSE_BLOCK_SIZE / 2, z },
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
      const falling = (this.incoming.get(b) ?? b.body.linvel()).y;
      if (falling > -LOOSE_BLOCK_FALL_SPEED) continue;
      if (s.time - b.lastHit < LOOSE_BLOCK_COOLDOWN) continue;
      const hit = this.partContact(b, parts);
      if (!hit) continue;
      b.lastHit = s.time;
      const def = s.partDefs.find((p) => p.id === hit)!;
      s.damage(hit, def.hp * LOOSE_BLOCK_DAMAGE);
      s.damageEvents.push({ source: "loose-blocks", part: hit, time: s.time });
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
