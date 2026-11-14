import {
  customSlug,
  DUNGEON_PREFAB_KINDS,
  validateCustomLevel,
  type CustomLevel,
  type CustomPrefab,
} from "./custom-level";

/** Parameters for the editor Randomize dialog. */
export interface RandomLevelParams {
  checkpoints: number;
  lethals: number;
  decor: number;
  theme: "toys" | "christmas" | "ice" | "carnival" | "dungeon" | "random";
  width: number;
  length: number;
  name: string;
}

export const RANDOM_DEFAULTS = {
  checkpoints: 3,
  lethals: 10,
  decor: 10,
  theme: "random",
  width: 400,
  length: 400,
  name: "New-Level-001",
} as const;

/** Observed official pace band top, pinned like tests/candy-tracks.test.ts. */
const IDEAL_PACE = 12.7;
/** Import gate: every generated level must take this long on the ideal line. */
export const RANDOM_IDEAL_MIN = 30;

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
    ],
    decorSolid: [{ kind: "lamp", clearance: 12 }],
    decorProp: ["sign", "trash", "barrel", "skull", "pumpkin"],
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
      { kind: "christmas-icicle-shears", clearance: 15 },
      { kind: "christmas-tinsel-snapper", clearance: 15 },
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
      { kind: "christmas-icicle-shears", clearance: 15 },
      { kind: "christmas-tinsel-snapper", clearance: 15 },
    ],
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
      { kind: "ghost", clearance: 0 },
    ],
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
    decorSolid: [
      { kind: "cage", clearance: 14 },
      { kind: "candle", clearance: 12 },
      { kind: "jail-cell", clearance: 16 },
      { kind: "flagpole", clearance: 12 },
    ],
    decorProp: ["gravestone", "skull"],
  },
};

const THEME_KEYS = ["toys", "christmas", "ice", "carnival", "dungeon"] as const;
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
  if (!isInt(checkpoints) || checkpoints < 1 || checkpoints > 20)
    throw new Error("Checkpoints must be an integer from 1 to 20");
  if (!isInt(lethals) || lethals < 0 || lethals > 100)
    throw new Error("Lethal prefabs must be an integer from 0 to 100");
  if (!isInt(decor) || decor < 0 || decor > 100)
    throw new Error("Decor prefabs must be an integer from 0 to 100");
  if (!isInt(width) || width < 150 || width > 1000)
    throw new Error("Width must be an integer from 150 to 1000");
  if (!isInt(length) || length < 150 || length > 1000)
    throw new Error("Length must be an integer from 150 to 1000");
  const rand = mulberry32(seed);
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

  // Lethals flank the road: threatening but never on the driven line.
  const lethalPool = [...theme.lethal];
  for (let i = lethalPool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [lethalPool[i], lethalPool[j]] = [lethalPool[j], lethalPool[i]];
  }
  let ghosts = 0;
  let li = 0;
  for (let i = 0; i < lethals; i++) {
    let pick = lethalPool[li++ % lethalPool.length];
    if (pick.kind === "ghost") {
      if (ghosts >= GHOST_CAP)
        pick = lethalPool.find((p) => p.kind !== "ghost") ?? pick;
      else ghosts++;
    }
    let done = false;
    for (let attempt = 0; attempt < 20 && !done; attempt++) {
      const leg = Math.floor(rand() * legs);
      const t = 0.25 + rand() * 0.5;
      const a = path[leg], b = path[leg + 1];
      const px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t;
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const side = rand() < 0.5 ? -1 : 1;
      const offset = pick.clearance + rand() * 8;
      const p = {
        x: px + (-(b.z - a.z) / len) * side * offset,
        z: pz + ((b.x - a.x) / len) * side * offset,
      };
      p.x = Math.max(-width / 2 + 8, Math.min(width / 2 - 8, p.x));
      p.z = Math.max(-length / 2 + 8, Math.min(length / 2 - 8, p.z));
      if (distToPath(p, path) < pick.clearance || !apart(p, 6)) continue;
      placed.push(p);
      const prefab: CustomPrefab = { id: `lethal-${i}`, kind: pick.kind, x: p.x, z: p.z };
      if (isDungeonKind(pick.kind) || pick.kind === "dragon")
        prefab.yaw = rand() * Math.PI * 2;
      prefabs.push(prefab);
      done = true;
    }
    if (!done)
      throw new Error(
        `Could not place ${lethals} lethals with clearance; enlarge the map`,
      );
  }

  // Decor: solids stay clear of the road, props may litter it (spawn excepted).
  const spawn = path[0];
  for (let i = 0; i < decor; i++) {
    const useSolid =
      theme.decorSolid.length > 0 &&
      (theme.decorProp.length === 0 || rand() < 0.5);
    if (useSolid) {
      const pick = theme.decorSolid[Math.floor(rand() * theme.decorSolid.length)];
      let done = false;
      for (let attempt = 0; attempt < 200 && !done; attempt++) {
        const p = {
          x: (rand() - 0.5) * (width - 16),
          z: (rand() - 0.5) * (length - 16),
        };
        if (distToPath(p, path) < pick.clearance || !apart(p, 6)) continue;
        placed.push(p);
        const prefab: CustomPrefab = { id: `decor-${i}`, kind: pick.kind, x: p.x, z: p.z };
        if (pick.y !== undefined) prefab.y = pick.y;
        if (isDungeonKind(pick.kind)) prefab.yaw = rand() * Math.PI * 2;
        prefabs.push(prefab);
        done = true;
      }
      if (!done)
        throw new Error(
          `Could not place ${decor} decor with clearance; enlarge the map`,
        );
    } else {
      const kind = theme.decorProp[Math.floor(rand() * theme.decorProp.length)];
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
    spawn: { x: spawn.x, y: 2.1, z: spawn.z, yaw: yaw0 },
    checkpoints: path.slice(1).map((p, i) => ({
      name: i === path.length - 2 ? "Finish" : `Gate ${i + 1}`,
      x: p.x,
      z: p.z,
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
      ...path.slice(1).map((p, i) => {
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
      }),
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
  });
}

function isDungeonKind(kind: string) {
  return (DUNGEON_PREFAB_KINDS as readonly string[]).includes(kind);
}
