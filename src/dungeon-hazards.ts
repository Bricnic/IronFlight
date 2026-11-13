import type { Track } from "./tracks.ts";
import { DUNGEON_PREFAB_KINDS, type CandyLethalKind, type ChristmasLethalKind, type DinosaurKind } from "./custom-level.ts";
export type DungeonKind = (typeof DUNGEON_PREFAB_KINDS)[number];
export type DungeonHazard = {
  id: string;
  kind: DungeonKind;
  x: number;
  z: number;
  phase: number;
  y?: number;
  yaw?: number;
  scale?: number;
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
      ...(p.scale === undefined ? {} : { scale: p.scale }),
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
  "hands" | "scissors" | "clippers" | "cup" | "clip" | CandyLethalKind | ChristmasLethalKind,
  { radius: number; slam: number }
> = {
  hands: { radius: 8, slam: 4 },
  scissors: { radius: 7, slam: 0 },
  clippers: { radius: 7.5, slam: 5 },
  cup: { radius: 7, slam: 6 },
  clip: { radius: 7, slam: 6 },
  "jawbreaker-crusher": { radius: 7.5, slam: 5 },
  "candy-snap-jaws": { radius: 7.5, slam: 4 },
  "gummy-vice": { radius: 7, slam: 0 },
  "peppermint-slammer": { radius: 7, slam: 6 },
  "taffy-snapper": { radius: 7, slam: 4 },
  "licorice-shears": { radius: 7, slam: 0 },
  "sugar-chomper": { radius: 8, slam: 4 },
  "caramel-crusher": { radius: 7, slam: 6 },
  "christmas-nutcracker": { radius: 7.5, slam: 5 },
  "christmas-ice-vice": { radius: 7, slam: 0 },
  "christmas-toy-chomper": { radius: 7.5, slam: 4 },
  "christmas-yeti-jaws": { radius: 8, slam: 4 },
  "christmas-ornament-slammer": { radius: 7, slam: 6 },
  "christmas-sleigh-crusher": { radius: 7, slam: 6 },
  "christmas-icicle-shears": { radius: 11, slam: 0 },
  "christmas-tinsel-snapper": { radius: 11, slam: 4 },
};
/** Scrap-bot stomp: moderate timed damage, never instantly lethal. */
export const ROBOT_STOMP_RADIUS = 6;
export const ROBOT_STOMP_DAMAGE = 25;
/** Scrap-bot sweeping laser: periodic bursts, 30%/s exposure in 100ms ticks. */
export const ROBOT_LASER_RANGE = 18;
export const ROBOT_LASER_HALF_ANGLE = 0.09;
export const ROBOT_LASER_ARC = 1.1;
export const ROBOT_LASER_PERIOD = 4;
export const ROBOT_LASER_ON = 3;
export const ROBOT_LASER_CYCLE = 5;
export const ROBOT_LASER_DPS = 0.3;
export const ROBOT_LASER_TICK = 0.1;
export function robotLaserAngle(shifted: number) {
  return ROBOT_LASER_ARC * Math.sin((shifted / ROBOT_LASER_PERIOD) * Math.PI * 2);
}
export function robotLaserFiring(shifted: number) {
  const t = ((shifted % ROBOT_LASER_CYCLE) + ROBOT_LASER_CYCLE) % ROBOT_LASER_CYCLE;
  return t < ROBOT_LASER_ON;
}
/** Cage furniture dimensions, shared by the collider builder and the artist. */
export const CAGE = { w: 3, h: 4, d: 3 } as const;
/** Prickly-pear mound with saguaros; solid but never lethal, like candy decor. */
export const CACTI_PATCH = { w: 6, h: 2.5, d: 6 } as const;
/** Seesaw deck: cars board the low entry end and rock it to drive off. Travels local +z. */
export const ROCKER = {
  w: 14, h: 0.6, d: 26, pivotY: 1.85, maxTilt: 0.16, restTilt: -0.16, rate: 1.0,
} as const;
/** Lethal rolling stone: triggers near the car, rolls along its yaw heading. */
export const BOULDER = { radius: 2, trigger: 16, speed: 18 } as const;
/** Candy-land decor furniture, shared by the collider builder and the artist. Solid but never lethal: candy kinds have no DUNGEON_STRIKE entry. */
export const CANDY_ARCH = { postW: 1.6, postH: 10, postD: 1.6, postX: 6 } as const;
export const CANDY_TRUNK = { w: 2, h: 4, d: 2 } as const;
export const CANDY_STAND = { w: 4, h: 1.5, d: 4 } as const;
export const CANDY_CHOCOLATE = { w: 12, h: 3, d: 1.6 } as const;
export const CANDY_STALL = { w: 6, h: 4, d: 5 } as const;
export const CANDY_LAMP = { w: 1.6, h: 7, d: 1.6 } as const;
/** Candy press-trap gantry posts; cars drive between them under the moving stamp. */
export const CANDY_PRESS = { postW: 1.8, postH: 9, postD: 1.8, postX: 6 } as const;
/** Christmas decor furniture, shared by the collider builder and the artist. Solid but never lethal: christmas kinds have no DUNGEON_STRIKE entry. */
export const CHRISTMAS_ARCH = { postW: 1.6, postH: 10, postD: 1.6, postX: 6.5 } as const;
export const CHRISTMAS_TRUNK = { w: 2, h: 4, d: 2 } as const;
export const CHRISTMAS_STALL = { w: 6, h: 4, d: 5 } as const;
export const CHRISTMAS_LANTERN = { w: 1.6, h: 7, d: 1.6 } as const;
export const CHRISTMAS_GIFTS = { w: 12, h: 3, d: 1.6 } as const;
export const CHRISTMAS_DEER = { w: 4, h: 1.5, d: 4 } as const;
/** Wooden statue above the plinth; together they stop the truck like a wall. */
export const CHRISTMAS_DEER_BODY = { w: 2.4, h: 4.2, d: 2.8 } as const;
/** Christmas press-trap gantry posts; cars drive between them under the moving stamp. */
export const CHRISTMAS_PRESS = { postW: 1.8, postH: 9, postD: 1.8, postX: 6.5 } as const;
/**
 * Clipper crusher furniture, shared by colliders and models. Hands and
 * scissors have no furniture: the truck drives straight through their
 * footprint and must time the crossing between slams. The clipper back
 * is a wall while its mouth stays open; the rails are low enough to
 * roll over, so only the back (`z` local offset) collides.
 */
export const CLIPPER_BACK = { w: 8.5, h: 3.5, d: 3.5, z: -3.0 } as const;
/** Revolving window gate furniture, shared by colliders and models. */
export const WINDOW_GATE = {
  lane: 5, height: 5, top: 6, depth: 1.6,
  postX: 6.5, postW: 2, postH: 6,
  wallX: 10.25, wallW: 5.5, wallH: 4,
  lintelY: 6.75, lintelH: 1.5, span: 13, gateD: 2.4,
} as const;

export const LIME_JAW = { halfWidth: 8.2, back: 8, tip: 24, hinge: 6 } as const;
export const LIME_JAW_PERIOD = 5.4;
export function limeJawPose(time: number) {
  const opening = 1.7;
  const snapStart = 4.05;
  const snapEnd = 4.22;
  const t = ((time % LIME_JAW_PERIOD) + LIME_JAW_PERIOD) % LIME_JAW_PERIOD;
  const rise = Math.min(1, t / opening);
  const snap = Math.max(0, Math.min(1, (t - snapStart) / (snapEnd - snapStart)));
  return {
    openness: rise * rise * (3 - 2 * rise) * (1 - snap ** 2),
    striking: t < 0.48 || t >= 4.17,
  };
}

export const DINOSAUR_BITE: Record<DinosaurKind, { height: number; reach: number }> = {
  raptor: { height: 3.5, reach: 4.3 },
  pterosaur: { height: 3, reach: 4.8 },
  spinosaurus: { height: 1.9, reach: 5 },
  "ember-wyvern": { height: 3, reach: 4.8 },
};
export const DINOSAUR_COOLDOWN = 1.8;
export const DINOSAUR_LUNGE = 1.4;
export function dinosaurPose(elapsed: number) {
  // The jaw gapes as the head dives and snaps shut through the strike window.
  const open = Math.max(0, Math.min(1, elapsed / 0.3, (0.62 - elapsed) / 0.15));
  const lunge = Math.max(0, Math.min(1, (elapsed - 0.24) / 0.19, (0.82 - elapsed) / 0.27));
  const turn = Math.max(0, Math.min(1, elapsed / 0.24, (1 - elapsed) / 0.28));
  return { open, lunge, turn, striking: elapsed >= 0.43 && elapsed <= 0.55 };
}
