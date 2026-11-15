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
  spots?: { x: number; z: number }[];
  seed?: number;
  trigger?: number;
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
      ...(p.spots === undefined ? {} : { spots: p.spots.map((s) => ({ ...s })) }),
      ...(p.seed === undefined ? {} : { seed: p.seed }),
      ...(p.trigger === undefined ? {} : { trigger: p.trigger }),
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

/** Giant pelican: twice the truck, guards each perch 3 s, then flies the rotation. */
export const PELICAN = {
  guard: 3,
  takeoff: 0.8,
  land: 0.8,
  flyHeight: 12,
  flySpeed: 22,
  /** Aggro range, about one car length from the perch. */
  range: 5.5,
  /** Bill tip reach from the perch when the strike lands. */
  reach: 7,
  /** Kill radius around the bill tip. */
  kill: 3.5,
  cooldown: 2.2,
  /** Head height above the perch while guarding. */
  height: 5,
} as const;
/** Pelican bite: 1.1 s lunge, bill overlaps the truck through the strike window. */
export function pelicanPose(elapsed: number) {
  const open = Math.max(0, Math.min(1, elapsed / 0.28, (0.72 - elapsed) / 0.18));
  const lunge = Math.max(0, Math.min(1, (elapsed - 0.25) / 0.2, (0.95 - elapsed) / 0.3));
  const turn = Math.max(0, Math.min(1, elapsed / 0.25, (1.1 - elapsed) / 0.3));
  return { open, lunge, turn, striking: elapsed >= 0.45 && elapsed <= 0.6 };
}
/** Deck anchor: touch it or its chain and it hooks the truck, then dunks it. */
export const ANCHOR = {
  /** Ground chain reach toward the road. */
  chain: 12,
  /** Rope slack past the hook distance. */
  slack: 5,
  /** Winch rate reeling the truck in once hooked. */
  reel: 4,
  /** Drag velocity while the rope is taut; the engine cannot beat a velocity set. */
  dragSpeed: 16,
  rise: 0.7,
  flight: 2.2,
  plunge: 3.0,
  cruiseHeight: 14,
  sinkDepth: -4,
} as const;
/** Departing ship: sails the channel on its checkpoint trigger, then holds. */
export const SHIP = {
  w: 24,
  deckY: 4,
  deckH: 1.2,
  d: 56,
  railH: 1.1,
  railT: 0.8,
  speed: 3.5,
  distance: 70,
  /** Wheelhouse, offset to port so starboard stays a straight lane to the finish. */
  cabin: { x: -7, w: 8, h: 4, d: 6, z: 19 },
  /** Container rows flanking the lane, shared by colliders and models. */
  // Crate outer faces (x + w/2 = 11) stop 0.2 short of the rail inner faces
  // (w/2 - railT = 11.2): flush faces z-fight with the white side rails.
  cargo: { x: 8.5, w: 5, h: 3, d: 40, z: -4 },
} as const;
export function shipSailed(departedAt: number | undefined, time: number) {
  if (departedAt === undefined) return 0;
  return Math.min(SHIP.distance, Math.max(0, time - departedAt) * SHIP.speed);
}

/** Straight speed tube: no steering inside, 1.5x cruise, shot out the end. */
export const SPEED_TUBE = {
  length: 40,
  radius: 4,
  boost: 1.5,
  minCruise: 15,
  exitBurst: 25,
} as const;
/** Automated teeter-totter: motorized sine rocking over the mailbox pit. */
export const TEETER = {
  w: 16,
  h: 0.8,
  d: 30,
  pivotY: -0.2,
  restTilt: 0,
  // ±26°: the raised end bottom clears 5.9, so a truck (~4 tall) fits
  // underneath to visit the mailbox; the low end still clears the pit floor.
  // The 12 s period keeps the sweep gentle: enter at low, ride up, exit flat.
  amp: 0.45,
  period: 12,
} as const;
/** Killer mailbox: shrink, parcel, post, wait, explode. Timeline in seconds. */
export const MAILBOX = {
  sensorR: 18,
  sensorBase: 0,
  sensorTop: 2.5,
  shrink: 0.9,
  fly: 1.5,
  explode: 2.5,
  burst: 10,
} as const;
/** Hollow spider: a giant sticky web; slow trucks inside get run down. */
export const SPIDER = {
  /** Web radius; the spider nests at the center. */
  webRadius: 20,
  /** Silken drag applied per second inside the web. */
  drag: 5,
  /** Nothing crosses silk faster than this. */
  maxSpeed: 8,
  /** Below this speed inside the web, the truck counts as stuck. */
  stuckSpeed: 5,
  /** Spider sprint; outruns the silk crawl, so only edge-grazers escape. */
  runSpeed: 6,
  /** Contact kill radius around the spider. */
  kill: 3.2,
  /** The hunt breaks off past the web plus this leash. */
  leash: 8,
} as const;
/** Deterministic RNG for seeded prefabs (pelican spots in tests). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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
