import type { Track } from "./tracks.ts";
import { DUNGEON_PREFAB_KINDS, type DinosaurKind } from "./custom-level.ts";
export type DungeonKind = (typeof DUNGEON_PREFAB_KINDS)[number];
export type DungeonHazard = {
  id: string;
  kind: DungeonKind;
  x: number;
  z: number;
  phase: number;
  y?: number;
  yaw?: number;
};
/** Custom levels serve whatever dungeon prefabs the author placed. */
export function dungeonHazards(track?: Track): DungeonHazard[] {
  if (!track?.custom) return [];
  return track.custom.prefabs
    .filter((p) =>
      (DUNGEON_PREFAB_KINDS as readonly string[]).includes(p.kind),
    )
    .map((p, i) => ({
      id: p.id,
      kind: p.kind as DungeonKind,
      x: p.x,
      z: p.z,
      // Stagger neighbors so adjacent traps never snap in sync.
      phase: i * 1.7,
      ...(p.y === undefined ? {} : { y: p.y }),
      ...(p.yaw === undefined ? {} : { yaw: p.yaw }),
    }));
}
/** Open crossing window, violent 0.2 s slam, shut hold, quick reopen. 3.2-second cycle. */
export const SNAP_CYCLE = 3.2;
function cycle(time: number) {
  return ((time % SNAP_CYCLE) + SNAP_CYCLE) % SNAP_CYCLE;
}
/** 1 while fully open, 0 while fully shut; shared by physics and views. */
export function snapOpenness(time: number) {
  const t = cycle(time);
  const slam = (v: number) => {
    v = Math.max(0, Math.min(1, v));
    return v * v;
  };
  if (t < 1.7) return 1;
  if (t < 1.9) return 1 - slam((t - 1.7) / 0.2);
  if (t < 2.6) return 0;
  if (t < 3.2) {
    const u = (t - 2.6) / 0.6;
    return 1 - (1 - u) * (1 - u);
  }
  return 1;
}
/** Cycle position where the slam starts striking. */
export const SNAP_STRIKE_START = 1.75;
/** True from mid-slam through the end of the hold. */
export function snapStriking(time: number) {
  const t = cycle(time);
  return t >= SNAP_STRIKE_START && t < 2.6;
}
/** Strike-zone radius and downward slam per trap kind; the shut trap is instantly lethal. */
export const DUNGEON_STRIKE: Record<
  "hands" | "scissors" | "clippers",
  { radius: number; slam: number }
> = {
  hands: { radius: 8, slam: 4 },
  scissors: { radius: 7, slam: 0 },
  clippers: { radius: 7.5, slam: 5 },
};
/** Cage furniture dimensions, shared by the collider builder and the artist. */
export const CAGE = { w: 3, h: 4, d: 3 } as const;
/**
 * Clipper crusher furniture, shared by colliders and models. Hands and
 * scissors have no furniture: the truck drives straight through their
 * footprint and must time the crossing between slams. The clipper back
 * is a wall while its mouth stays open; the rails are low enough to
 * roll over, so only the back (`z` local offset) collides.
 */
export const CLIPPER_BACK = { w: 8.5, h: 3.5, d: 3.5, z: -3.0 } as const;

export const DINOSAUR_BITE: Record<DinosaurKind, { height: number; reach: number }> = {
  raptor: { height: 3.5, reach: 4.3 },
  pterosaur: { height: 3, reach: 4.8 },
  spinosaurus: { height: 1.9, reach: 5 },
};
export const DINOSAUR_COOLDOWN = 1.8;
export const DINOSAUR_LUNGE = 1.4;
export function dinosaurPose(elapsed: number) {
  const open = Math.max(0, Math.min(1, elapsed / 0.24, (0.46 - elapsed) / 0.13));
  const lunge = Math.max(0, Math.min(1, (elapsed - 0.24) / 0.19, (0.82 - elapsed) / 0.27));
  const turn = Math.max(0, Math.min(1, elapsed / 0.24, (1 - elapsed) / 0.28));
  return { open, lunge, turn, striking: elapsed >= 0.43 && elapsed <= 0.55 };
}
