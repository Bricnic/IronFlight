import {
  customSlug,
  DUNGEON_PREFAB_KINDS,
  PREFAB_KINDS,
  validateCustomLevel,
  type CustomLevel,
  type CustomPrefab,
} from "./custom-level";

/** Parameters for the editor Randomize dialog. */
export interface RandomLevelParams {
  checkpoints: number;
  lethals: number;
  decor: number;
  /** Percent of lethals placed on the road to weave around (0-100). */
  blockingPercent: number;
  /** Prefab diversity 1-10: 1 draws theme pools only, 10 draws everything. */
  diversity: number;
  theme: "toys" | "christmas" | "ice" | "carnival" | "dungeon" | "caves" | "space" | "random";
  width: number;
  length: number;
  name: string;
}

export const RANDOM_DEFAULTS = {
  checkpoints: 3,
  lethals: 10,
  decor: 10,
  blockingPercent: 40,
  diversity: 1,
  theme: "random",
  width: 400,
  length: 400,
  name: "New-Level-001",
} as const;

/** Observed official pace band top, pinned like tests/candy-tracks.test.ts. */
const IDEAL_PACE = 12.7;
/** Import gate: every generated level must take this long on the ideal line. */
export const RANDOM_IDEAL_MIN = 30;
/** Flanked threats stay at least this far off the path (beyond weave reach). */
export const FLANK_MIN = 32;
/**
 * Chance a prefab pick ignores the theme pool: 0 at diversity 1, 50% at 5,
 * 100% at 10 (piecewise linear through those anchors).
 */
export function diversityUnrelatedProb(diversity: number): number {
  if (diversity <= 1) return 0;
  if (diversity >= 10) return 1;
  return diversity <= 5 ? (diversity - 1) / 8 : 0.5 + (diversity - 5) / 10;
}
/**
 * Off-theme pool: every placeable prefab kind. Checkpoint prefabs register
 * as real race gates, so they stay out — a random gate could strand the
 * run off the road network.
 */
export const DIVERSITY_POOL = [...PREFAB_KINDS].filter((k) => k !== "checkpoint");

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type LethalPick = { kind: string; clearance: number };
type DecorPick = { kind: string; clearance: number; y?: number };
type ThemeDef = {
  background: string;
  texture: string;
  color: number;
  lethal: LethalPick[];
  /** Small-footprint lethals safe to block the road (weaved around). */
  blocking: string[];
  decorSolid: DecorPick[];
  decorProp: string[];
};

/**
 * Prefab pools per theme. Clearances keep the driven centerline out of every
 * strike zone (snap radius + margin) and every solid footprint, so a simple
 * waypoint driver beats any layout without timing traps.
 */
const THEMES: Record<string, ThemeDef> = {
  toys: {
    background: "pastoral-hills",
    texture: "grass_ground",
    color: 12107409,
    lethal: [
      { kind: "book", clearance: 12 },
      { kind: "teeth", clearance: 12 },
      { kind: "computer", clearance: 12 },
      { kind: "flippers", clearance: 12 },
      { kind: "donut", clearance: 12 },
      { kind: "raptor", clearance: 12 },
      { kind: "pterosaur", clearance: 12 },
      { kind: "spinosaurus", clearance: 12 },
      { kind: "ember-wyvern", clearance: 12 },
    ],
    blocking: [
      "book",
      "teeth",
      "computer",
      "donut",
      "raptor",
      "pterosaur",
      "spinosaurus",
      "ember-wyvern",
    ],
    decorSolid: [
      { kind: "lamp", clearance: 12 },
      { kind: "speed-tube", clearance: 32 },
    ],
    decorProp: ["sign", "trash", "barrel", "skull", "pumpkin", "snowball"],
  },
  christmas: {
    background: "christmas-village",
    texture: "snow_01",
    color: 14674418,
    lethal: [
      { kind: "christmas-nutcracker", clearance: 12 },
      { kind: "christmas-ice-vice", clearance: 11 },
      { kind: "christmas-toy-chomper", clearance: 12 },
      { kind: "christmas-yeti-jaws", clearance: 12 },
      { kind: "christmas-ornament-slammer", clearance: 11 },
      { kind: "christmas-sleigh-crusher", clearance: 11 },
      { kind: "christmas-icicle-shears", clearance: 34 },
      { kind: "christmas-tinsel-snapper", clearance: 34 },
    ],
    blocking: [
      "christmas-nutcracker",
      "christmas-ice-vice",
      "christmas-toy-chomper",
      "christmas-yeti-jaws",
      "christmas-ornament-slammer",
      "christmas-sleigh-crusher",
    ],
    decorSolid: [
      { kind: "christmas-tree", clearance: 18 },
      { kind: "christmas-light-arch", clearance: 18 },
      { kind: "christmas-market-stall", clearance: 18 },
      { kind: "christmas-lantern", clearance: 18 },
      { kind: "christmas-gift-wall", clearance: 18 },
      { kind: "christmas-reindeer", clearance: 18 },
    ],
    decorProp: [
      "christmas-ornament",
      "christmas-snow-boulder",
      "christmas-cracker-barrel",
      "christmas-gift-crate",
      "christmas-cocoa-cart",
    ],
  },
  ice: {
    background: "alpine-peaks",
    texture: "snow_01",
    color: 14674418,
    lethal: [
      { kind: "christmas-ice-vice", clearance: 11 },
      { kind: "christmas-yeti-jaws", clearance: 12 },
      { kind: "christmas-icicle-shears", clearance: 34 },
      { kind: "christmas-tinsel-snapper", clearance: 34 },
    ],
    blocking: ["christmas-ice-vice", "christmas-yeti-jaws"],
    decorSolid: [
      { kind: "christmas-lantern", clearance: 18 },
      { kind: "christmas-reindeer", clearance: 18 },
    ],
    decorProp: ["snowman", "christmas-snow-boulder"],
  },
  carnival: {
    background: "fairground-park",
    texture: "grass_ground",
    color: 12107409,
    lethal: [
      { kind: "hammer", clearance: 14 },
      { kind: "dragon", clearance: 15 },
      { kind: "ghost", clearance: 32 },
    ],
    blocking: ["dragon"],
    decorSolid: [
      { kind: "carousel", clearance: 35 },
      { kind: "bumper-arena", clearance: 40 },
      { kind: "loop", clearance: 15 },
      { kind: "lamp", clearance: 12 },
      { kind: "trampoline", clearance: 20 },
      { kind: "hot-air-balloon", clearance: 40, y: 25 },
    ],
    decorProp: [],
  },
  dungeon: {
    background: "cavern-dark",
    texture: "monastery_stone_floor",
    color: 12106946,
    lethal: [
      { kind: "hands", clearance: 12 },
      { kind: "scissors", clearance: 11 },
      { kind: "clippers", clearance: 12 },
      { kind: "cup", clearance: 11 },
      { kind: "clip", clearance: 11 },
      { kind: "robot", clearance: 20 },
      { kind: "lime-chomper", clearance: 25 },
    ],
    blocking: ["hands", "scissors", "clippers", "cup", "clip"],
    decorSolid: [
      { kind: "cage", clearance: 14 },
      { kind: "candle", clearance: 12 },
      { kind: "jail-cell", clearance: 16 },
      { kind: "flagpole", clearance: 12 },
    ],
    decorProp: ["gravestone", "skull"],
  },
  caves: {
    background: "mystic-cave",
    texture: "glow_moss_01",
    color: 1712176,
    lethal: [
      { kind: "cave-caterpillar", clearance: 12 },
      { kind: "cave-moth", clearance: 12 },
    ],
    // Venom is survivable (25% + one part), so the crawler can sit on the
    // road; the moth's falling dust stays flanking-only.
    blocking: ["cave-caterpillar"],
    decorSolid: [{ kind: "glow-mushroom", clearance: 12 }],
    decorProp: ["cave-bat", "cave-fairy", "firefly"],
  },
  space: {
    background: "moon-surface",
    texture: "moon_regolith_01",
    color: 16777215,
    lethal: [
      { kind: "meteor", clearance: 12 },
      { kind: "alien", clearance: 12 },
      { kind: "asteroid", clearance: 12 },
    ],
    // Confusion deals no damage, so aliens can block the road; meteors
    // fall at fixed flanked points and asteroids cruise at safe altitude.
    // UFOs stay out: wander plus 42-range lasers would outgun the driver.
    blocking: ["alien"],
    decorSolid: [
      { kind: "station-pillar", clearance: 12 },
      { kind: "solar-panel", clearance: 12 },
      { kind: "satellite-dish", clearance: 12 },
      { kind: "moon-rock", clearance: 12 },
      { kind: "station-tower", clearance: 18 },
      { kind: "habitat-dome", clearance: 20 },
    ],
    decorProp: ["supply-crate", "oxygen-tank"],
  },
};

const THEME_KEYS = ["toys", "christmas", "ice", "carnival", "dungeon", "caves", "space"] as const;
/** Lethal kinds allowed to block the road, per theme. */
export const BLOCKING_ELIGIBLE: Record<string, string[]> = Object.fromEntries(
  Object.entries(THEMES).map(([name, t]) => [name, [...t.blocking]]),
);
/** Minimum path distance per prefab kind, derived from the theme pools. */
export const GENERATOR_CLEARANCE: Record<string, number> = Object.fromEntries(
  Object.values(THEMES).flatMap((t) => [
    ...t.lethal.map((p) => [p.kind, p.clearance] as const),
    ...t.decorSolid.map((p) => [p.kind, p.clearance] as const),
  ]),
);
/** Ghosts chase, so a swarm would outrun the waypoint driver: at most two. */
const GHOST_CAP = 2;

type Point = { x: number; z: number };

function distToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  const t = lenSq ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq)) : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}

function distToPath(p: Point, path: Point[]) {
  let best = Infinity;
  for (let i = 1; i < path.length; i++)
    best = Math.min(best, distToSegment(p, path[i - 1], path[i]));
  return best;
}

/**
 * Next free level name. Numeric `-NNN` suffixes increment preserving width;
 * plain names gain `-002`, `-003`, ... Rejects registered track-id collisions
 * too, since registering silently overwrites.
 */
export function nextAvailableName(base: string, takenNames: string[], takenIds: string[]): string {
  const taken = (name: string) =>
    takenNames.includes(name) || takenIds.includes(`custom:${customSlug(name)}`);
  if (!taken(base)) return base;
  const match = base.match(/^(.*)-(\d+)$/);
  const prefix = match ? match[1] : base;
  const width = match ? match[2].length : 3;
  let n = match ? parseInt(match[2], 10) + 1 : 2;
  for (let i = 0; i < 10000; i++, n++) {
    const candidate = `${prefix}-${String(n).padStart(width, "0")}`;
    if (!taken(candidate)) return candidate;
  }
  throw new Error(`No free name near ${base}`);
}

function isInt(n: unknown) {
  return typeof n === "number" && Number.isInteger(n);
}

/** Procedurally built race: S-road, flanked lethals, scattered decor. Validated. */
export function generateRandomLevel(params: RandomLevelParams, seed: number): CustomLevel {
  const { checkpoints, lethals, decor, width, length } = params;
  const diversity = params.diversity ?? 1;
  if (!isInt(checkpoints) || checkpoints < 1 || checkpoints > 20)
    throw new Error("Checkpoints must be an integer from 1 to 20");
  if (!isInt(lethals) || lethals < 0 || lethals > 100)
    throw new Error("Lethal prefabs must be an integer from 0 to 100");
  if (!isInt(decor) || decor < 0 || decor > 100)
    throw new Error("Decor prefabs must be an integer from 0 to 100");
  if (
    !isInt(params.blockingPercent) ||
    params.blockingPercent < 0 ||
    params.blockingPercent > 100
  )
    throw new Error("Blocking path percent must be an integer from 0 to 100");
  if (!isInt(width) || width < 150 || width > 1000)
    throw new Error("Width must be an integer from 150 to 1000");
  if (!isInt(length) || length < 150 || length > 1000)
    throw new Error("Length must be an integer from 150 to 1000");
  if (!isInt(diversity) || diversity < 1 || diversity > 10)
    throw new Error("Diversity must be an integer from 1 to 10");
  const rand = mulberry32(seed);
  // Off-theme draw, or null to keep the themed pick. Draws no randomness
  // at diversity 1, so default output is byte-identical to themed-only.
  const unrelatedP = diversityUnrelatedProb(diversity);
  const offTheme = (): string | null => {
    if (unrelatedP <= 0 || rand() >= unrelatedP) return null;
    return DIVERSITY_POOL[Math.floor(rand() * DIVERSITY_POOL.length)];
  };
  const themeKey =
    params.theme === "random"
      ? THEME_KEYS[Math.floor(rand() * THEME_KEYS.length)]
      : params.theme;
  const theme = THEMES[themeKey];
  if (!theme) throw new Error(`Unknown theme: ${params.theme}`);

  // S-curve route from south to north with alternating lateral swing.
  const margin = 30;
  const amp = Math.max(10, Math.min(0.2 * width, width / 2 - 60));
  const path: Point[] = [];
  const legs = checkpoints;
  for (let i = 0; i <= legs; i++) {
    const z = length / 2 - margin - (i * (length - 2 * margin)) / legs;
    const side = i === 0 ? 0 : i % 2 === 1 ? 1 : -1;
    const x =
      i === 0
        ? (rand() - 0.5) * amp
        : side * amp + (rand() - 0.5) * 30;
    path.push({ x, z });
  }
  const poly = path
    .slice(1)
    .reduce((sum, p, i) => sum + Math.hypot(p.x - path[i].x, p.z - path[i].z), 0);
  const ideal = poly / IDEAL_PACE;
  if (ideal < RANDOM_IDEAL_MIN)
    throw new Error(
      `Generated level is too short (ideal ${ideal.toFixed(1)}s < ${RANDOM_IDEAL_MIN}s); increase size or checkpoints`,
    );

  const prefabs: CustomPrefab[] = [];
  const placed: Point[] = [];
  const apart = (p: Point, min: number) =>
    placed.every((q) => Math.hypot(p.x - q.x, p.z - q.z) >= min);

  const shuffle = <T>(items: T[]) => {
    const pool = [...items];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  };
  const clampBounds = (p: Point) => {
    p.x = Math.max(-width / 2 + 8, Math.min(width / 2 - 8, p.x));
    p.z = Math.max(-length / 2 + 8, Math.min(length / 2 - 8, p.z));
    return p;
  };
  const offsetPoint = (leg: number, t: number, offset: number) => {
    const a = path[leg], b = path[leg + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return {
      x: a.x + (b.x - a.x) * t + (-(b.z - a.z) / len) * offset,
      z: a.z + (b.z - a.z) * t + ((b.x - a.x) / len) * offset,
    };
  };
  // Blocking traps sit on the road so drivers weave around them. Spread per
  // leg with room to settle: 45+ past each gate (a 90-degree corner needs
  // ~30 to turn and rejoin the line) and 25+ before the next gate; press
  // posts and dragon jets align with the road so the weave line stays clear
  // of furniture.
  const EXIT_MARGIN = 45, ENTRY_MARGIN = 25, TRAP_GAP = 25;
  const blockingCount = Math.round((lethals * params.blockingPercent) / 100);
  const PRESS = new Set([
    "christmas-nutcracker",
    "christmas-ornament-slammer",
    "christmas-sleigh-crusher",
  ]);
  const blockingPool = shuffle(theme.blocking);
  const legLens: number[] = [];
  for (let i = 1; i < path.length; i++)
    legLens.push(Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
  const legCap = legLens.map((len) => {
    const usable = len - EXIT_MARGIN - ENTRY_MARGIN;
    return usable < 0 ? 0 : 1 + Math.floor(usable / TRAP_GAP);
  });
  const totalCap = legCap.reduce((a, b) => a + b, 0);
  if (blockingCount > totalCap)
    throw new Error(
      `Too many blocking traps for this course; enlarge the map or reduce them`,
    );
  const legLoad = legCap.map(() => 0);
  for (let i = 0; i < blockingCount; i++) {
    let leg = -1;
    for (let l = 0; l < legs; l++)
      if (legLoad[l] < legCap[l] && (leg < 0 || legLens[l] > legLens[leg])) leg = l;
    legLoad[leg]++;
    const k = legLoad[leg];
    const frac = k / (legCap[leg] + 1);
    const a = path[leg], b = path[leg + 1];
    const len = legLens[leg] || 1;
    const t = (EXIT_MARGIN + frac * (len - EXIT_MARGIN - ENTRY_MARGIN)) / len;
    const px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t;
    const lateral = rand() * 10 - 5;
    const p = clampBounds({
      x: px + (-(b.z - a.z) / len) * lateral,
      z: pz + ((b.x - a.x) / len) * lateral,
    });
    if (distToPath(p, path) > 6.5)
      throw new Error(`Could not place blocking trap ${i + 1}; enlarge the map`);
    placed.push(p);
    const kind = offTheme() ?? blockingPool[i % blockingPool.length];
    const prefab: CustomPrefab = {
      id: `lethal-${i}`,
      kind,
      x: p.x,
      z: p.z,
      ...(themeKey === "toys" ? { y: TOYS_TRAP_Y } : {}),
    };
    if (PRESS.has(kind) || kind === "dragon")
      prefab.yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
    else if (isDungeonKind(kind)) prefab.yaw = rand() * Math.PI * 2;
    prefabs.push(prefab);
  }
  // The rest flank the road: threatening but never on the driven line.
  const lethalPool = shuffle(theme.lethal);
  let ghosts = 0;
  let li = 0;
  for (let i = blockingCount; i < lethals; i++) {
    let pick = lethalPool[li++ % lethalPool.length];
    if (pick.kind === "ghost") {
      if (ghosts >= GHOST_CAP)
        pick = lethalPool.find((p) => p.kind !== "ghost") ?? pick;
      else ghosts++;
    }
    const wild = offTheme();
    const flankKind = wild ?? pick.kind;
    const flankClearance = wild ? 12 : pick.clearance;
    let done = false;
    for (let attempt = 0; attempt < 20 && !done; attempt++) {
      const side = rand() < 0.5 ? -1 : 1;
      // Flanked threats stay beyond weave reach so dodges never cross them.
      const offset = Math.max(flankClearance, FLANK_MIN) + rand() * 6;
      const leg = Math.floor(rand() * legs);
      const t = 0.25 + rand() * 0.5;
      const a = path[leg], b = path[leg + 1];
      const p = clampBounds(offsetPoint(leg, t, side * offset));
      if (distToPath(p, path) < Math.max(flankClearance, FLANK_MIN) || !apart(p, 6)) continue;
      placed.push(p);
      const prefab: CustomPrefab = { id: `lethal-${i}`, kind: flankKind, x: p.x, z: p.z };
      if (flankKind === "lime-chomper" || flankKind === "dragon") {
        // Long zones/jets face away from the road, never across it.
        const bx = a.x + (b.x - a.x) * t, bz = a.z + (b.z - a.z) * t;
        const ax = p.x - bx, az = p.z - bz;
        const len = Math.hypot(ax, az) || 1;
        prefab.yaw =
          flankKind === "dragon"
            ? Math.atan2(az / len, -(ax / len))
            : Math.atan2(ax / len, az / len);
      } else if (isDungeonKind(flankKind)) prefab.yaw = rand() * Math.PI * 2;
      prefabs.push(prefab);
      done = true;
    }
    if (!done)
      throw new Error(
        `Could not place ${lethals} lethals with clearance; enlarge the map`,
      );
  }

  // Decor: solids stay beyond weave reach like flanked lethals (a lantern
  // beside a dodge line pins the car); small props may litter it (spawn
  // excepted).
  const spawn = path[0];
  for (let i = 0; i < decor; i++) {
    const useSolid =
      theme.decorSolid.length > 0 &&
      (theme.decorProp.length === 0 || rand() < 0.5);
    if (useSolid) {
      const pick = theme.decorSolid[Math.floor(rand() * theme.decorSolid.length)];
      const wild = offTheme();
      const decorKind = wild ?? pick.kind;
      const floor = Math.max(wild ? 12 : pick.clearance, FLANK_MIN);
      let done = false;
      for (let attempt = 0; attempt < 200 && !done; attempt++) {
        const p = {
          x: (rand() - 0.5) * (width - 16),
          z: (rand() - 0.5) * (length - 16),
        };
        if (distToPath(p, path) < floor || !apart(p, 6)) continue;
        placed.push(p);
        const prefab: CustomPrefab = { id: `decor-${i}`, kind: decorKind, x: p.x, z: p.z };
        if (!wild && pick.y !== undefined) prefab.y = pick.y;
        if (isDungeonKind(decorKind)) prefab.yaw = rand() * Math.PI * 2;
        prefabs.push(prefab);
        done = true;
      }
      if (!done)
        throw new Error(
          `Could not place ${decor} decor with clearance; enlarge the map`,
        );
    } else {
      const kind = offTheme() ?? theme.decorProp[Math.floor(rand() * theme.decorProp.length)];
      let p = { x: 0, z: 0 };
      for (let attempt = 0; attempt < 200; attempt++) {
        p = {
          x: (rand() - 0.5) * (width - 16),
          z: (rand() - 0.5) * (length - 16),
        };
        if (Math.hypot(p.x - spawn.x, p.z - spawn.z) >= 6 && apart(p, 3)) break;
      }
      placed.push(p);
      prefabs.push({
        id: `decor-${i}`,
        kind,
        x: p.x,
        z: p.z,
        yaw: rand() * Math.PI * 2,
      });
    }
  }

  const gold = Math.ceil(ideal * 1.5);
  const silver = Math.ceil(gold * 1.5);
  const bronze = Math.ceil(gold * 2.2);
  const yaw0 = Math.atan2(path[1].x - path[0].x, path[1].z - path[0].z);
  return validateCustomLevel({
    name: params.name,
    mode: "race",
    spawn: { x: spawn.x, y: themeKey === "toys" ? TOYS_DECK_TOP + 2.1 : 2.1, z: spawn.z, yaw: yaw0 },
    checkpoints: path.slice(1).map((p, i) => ({
      name: i === path.length - 2 ? "Finish" : `Gate ${i + 1}`,
      x: p.x,
      z: p.z,
      ...(themeKey === "toys" ? { y: TOYS_DECK_Y } : {}),
    })),
    solids: [
      {
        id: "ground",
        kind: "ground",
        x: 0,
        y: -0.65,
        z: 0,
        w: width,
        h: 1.3,
        d: length,
        color: theme.color,
        texture: theme.texture,
      },
      ...buildRoads(path, themeKey),
      {
        id: "lava-n",
        kind: "lava" as const,
        x: 0,
        y: -0.02,
        z: -length / 2 - 15,
        w: width + 60,
        h: 0.1,
        d: 30,
        color: 16738850,
      },
      {
        id: "lava-s",
        kind: "lava" as const,
        x: 0,
        y: -0.02,
        z: length / 2 + 15,
        w: width + 60,
        h: 0.1,
        d: 30,
        color: 16738850,
      },
      {
        id: "lava-w",
        kind: "lava" as const,
        x: -width / 2 - 15,
        y: -0.02,
        z: 0,
        w: 30,
        h: 0.1,
        d: length,
        color: 16738850,
      },
      {
        id: "lava-e",
        kind: "lava" as const,
        x: width / 2 + 15,
        y: -0.02,
        z: 0,
        w: 30,
        h: 0.1,
        d: length,
        color: 16738850,
      },
    ],
    prefabs,
    medals: { gold, silver, bronze },
    limit: bronze + 60,
    backgroundTemplate: theme.background,
    ...(themeKey === "space" ? { gravityScale: 0.5 } : {}),
  });
}

/** Bright translucent-look plastic chunks, like toybox magnetile track. */
const MAGNETILE = [0xff3b5c, 0x2b7de2, 0x2fd35f, 0xf2c200, 0xff8a1e, 0x9a5fe0];
/** Toys road deck: tile center height, top surface, and half-width. */
const TOYS_DECK_Y = 8;
const TOYS_DECK_TOP = TOYS_DECK_Y + 0.03;
const TOYS_ROAD_W = 48;
/** Blocking traps sit on the deck for toys, on the grass otherwise. */
const TOYS_TRAP_Y = 8.1;

type RoadSolid = {
  id: string;
  kind: "road" | "tile" | "barrier" | "support";
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  yaw: number;
  color: number;
  texture?: string;
};

function buildRoads(path: Point[], themeKey: string): RoadSolid[] {
  if (themeKey !== "toys") {
    return path.slice(1).map((p, i) => {
      const a = path[i];
      const lengthSeg = Math.hypot(p.x - a.x, p.z - a.z);
      return {
        id: `road-${i + 1}`,
        kind: "road" as const,
        x: (a.x + p.x) / 2,
        y: 0.015 + i * 0.008,
        z: (a.z + p.z) / 2,
        w: 20,
        h: 0.03,
        d: lengthSeg + 12,
        yaw: Math.atan2(p.x - a.x, p.z - a.z),
        color: 3161673,
        texture: "asphalt_02",
      };
    });
  }
  // Toybox magnetile road: an elevated tile deck on support pillars, like
  // the floating track in toybox levels. Wide enough (±24) that the weave
  // driver (max ±20 lateral) never leaves the deck; edge lips contain
  // shoves. Spawn, gates, and blocking traps all ride at deck height.
  const out: RoadSolid[] = [];
  let seq = 0;
  path.slice(1).forEach((p, i) => {
    const a = path[i];
    const lengthSeg = Math.hypot(p.x - a.x, p.z - a.z);
    const n = Math.max(1, Math.round(lengthSeg / 14));
    const yaw = Math.atan2(p.x - a.x, p.z - a.z);
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      // ±20 runoffs past each joint catch corner overshoot (falls strand).
      const lead = k === 0 ? 20 : 0, trail = k === n - 1 ? 20 : 0;
      const mid = (t0 + t1) / 2 + (trail - lead) / 2 / lengthSeg;
      out.push({
        id: `road-${i + 1}-${k}`,
        kind: "tile" as const,
        x: a.x + (p.x - a.x) * mid,
        y: TOYS_DECK_Y + seq * 0.001,
        z: a.z + (p.z - a.z) * mid,
        w: TOYS_ROAD_W,
        h: 0.06,
        d: ((t1 - t0) * lengthSeg + lead + trail) - 0.04,
        yaw,
        color: MAGNETILE[seq % MAGNETILE.length],
      });
      seq++;
    }
    // Edge lips plus support pillars down to the grass.
    const len = lengthSeg || 1;
    const nx = -(p.z - a.z) / len, nz = (p.x - a.x) / len;
    const mx = (a.x + p.x) / 2, mz = (a.z + p.z) / 2;
    for (const side of [-1, 1]) {
      out.push({
        id: `lip-${i + 1}-${side < 0 ? "l" : "r"}`,
        kind: "barrier" as const,
        x: mx + nx * side * (TOYS_ROAD_W / 2 + 0.5),
        y: TOYS_DECK_TOP + 0.6,
        z: mz + nz * side * (TOYS_ROAD_W / 2 + 0.5),
        w: 1.5,
        h: 2,
        d: lengthSeg + 40,
        yaw,
        color: 0xe8ecf0,
      });
    }
    const supports = Math.max(1, Math.round(lengthSeg / 20));
    for (let k = 0; k < supports; k++) {
      const t = (k + 0.5) / supports;
      out.push({
        id: `support-${i + 1}-${k}`,
        kind: "support" as const,
        x: a.x + (p.x - a.x) * t,
        y: TOYS_DECK_Y / 2,
        z: a.z + (p.z - a.z) * t,
        w: 2,
        h: TOYS_DECK_Y,
        d: 2,
        yaw: 0,
        color: 0x767c76,
      });
    }
  });
  return out;
}

function isDungeonKind(kind: string) {
  return (DUNGEON_PREFAB_KINDS as readonly string[]).includes(kind);
}
