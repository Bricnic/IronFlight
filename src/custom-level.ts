import { gates, type CustomTrackId, type Track } from "./tracks";
export const TEXTURE_IDS = [
  "asphalt_02",
  "grass_ground",
  "green_metal_rust",
  "rock_06",
  "concrete_floor_02",
  "concrete_layers_02",
  "cracked_red_ground",
  "dark_rock_02",
  "coast_sand_rocks_02",
  "brown_mud_leaves_01",
  "monastery_stone_floor",
  "blue_plaster_wall",
] as const;
export type TextureId = (typeof TEXTURE_IDS)[number];
export const PROP_PREFAB_KINDS = [
  "sign",
  "trash",
  "barrel",
  "gravestone",
  "snowman",
] as const;
export const COMIC_PREFAB_KINDS = [
  "book",
  "teeth",
  "computer",
  "flippers",
  "hydrant",
  "burner",
  "water",
  "potion",
] as const;
export const PREFAB_KINDS = [
  ...PROP_PREFAB_KINDS,
  ...COMIC_PREFAB_KINDS,
  "checkpoint",
] as const;
export type PrefabKind = (typeof PREFAB_KINDS)[number];
export const SOLID_KINDS = [
  "ground",
  "road",
  "container",
  "barrier",
  "ramp",
  "support",
  "lava",
] as const;
export type SolidKind = (typeof SOLID_KINDS)[number];
export interface CustomSolid {
  id: string;
  kind: SolidKind;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  yaw?: number;
  angle?: number;
  color: number;
  texture?: string;
}
export interface CustomPrefab {
  id: string;
  kind: string;
  x: number;
  z: number;
  y?: number;
}
export interface CustomPoint {
  x: number;
  z: number;
  y?: number;
}
export type CustomMode = "race" | "arena" | "demolition";
export interface CustomLevel {
  name: string;
  mode: CustomMode;
  spawn: { x: number; y: number; z: number; yaw: number };
  checkpoints: CustomPoint[];
  collectibles?: CustomPoint[];
  demolish?: CustomPoint[];
  solids: CustomSolid[];
  prefabs: CustomPrefab[];
  medals: { gold: number; silver: number; bronze: number };
  limit?: number;
}
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;
const finite = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n);
function check(errors: string[], ok: unknown, message: string) {
  if (!ok) errors.push(message);
}
function checkPoint(errors: string[], p: CustomPoint, label: string) {
  check(errors, p && finite(p.x) && finite(p.z), `${label} needs finite x/z`);
  check(errors, p.y === undefined || finite(p.y), `${label} needs finite y`);
}
function unique(errors: string[], ids: string[], label: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    check(errors, typeof id === "string" && id.length > 0, `${label} needs ids`);
    check(errors, !seen.has(id), `duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}
/** Strict validation; throws one Error listing every problem. */
export function validateCustomLevel(input: unknown): CustomLevel {
  const errors: string[] = [];
  const level = input as CustomLevel;
  check(errors, !!level && typeof level === "object", "level must be an object");
  const name = (level as CustomLevel)?.name;
  check(
    errors,
    typeof name === "string" && NAME_PATTERN.test(name),
    "name must be 1-64 chars of letters, numbers, spaces, - or _",
  );
  const mode = (level as CustomLevel)?.mode;
  check(errors, mode === "race" || mode === "arena" || mode === "demolition", `mode must be race, arena or demolition`);
  const spawn = (level as CustomLevel)?.spawn;
  check(
    errors,
    !!spawn && finite(spawn.x) && finite(spawn.y) && finite(spawn.z) && finite(spawn.yaw),
    "spawn needs finite x/y/z/yaw",
  );
  const medals = (level as CustomLevel)?.medals;
  check(
    errors,
    !!medals &&
      medals.gold > 0 &&
      medals.gold < medals.silver &&
      medals.silver < medals.bronze,
    "medals need 0 < gold < silver < bronze",
  );
  const limit = (level as CustomLevel)?.limit;
  check(errors, limit === undefined || limit > 0, "limit must be positive");
  const checkpoints = Array.isArray((level as CustomLevel)?.checkpoints)
    ? (level as CustomLevel).checkpoints
    : [];
  check(
    errors,
    Array.isArray((level as CustomLevel)?.checkpoints),
    "checkpoints must be an array",
  );
  checkpoints.forEach((p, i) => checkPoint(errors, p, `checkpoint ${i}`));
  const prefabCheckpoints = Array.isArray((level as CustomLevel)?.prefabs)
    ? (level as CustomLevel).prefabs.filter((p) => p?.kind === "checkpoint")
    : [];
  prefabCheckpoints.forEach((p, i) =>
    checkPoint(errors, p, `checkpoint prefab ${i}`),
  );
  if (mode === "race")
    check(
      errors,
      checkpoints.length + prefabCheckpoints.length >= 1,
      "race levels need at least one checkpoint",
    );
  const collectibles = (level as CustomLevel)?.collectibles ?? [];
  check(errors, Array.isArray(collectibles), "collectibles must be an array");
  collectibles.forEach((p, i) => checkPoint(errors, p, `collectible ${i}`));
  if (mode === "arena") {
    check(errors, collectibles.length >= 1, "arena levels need a collectible");
    check(errors, typeof limit === "number" && limit > 0, "arena levels need a time limit");
  }
  const demolish = (level as CustomLevel)?.demolish ?? [];
  check(errors, Array.isArray(demolish), "demolish must be an array");
  demolish.forEach((p, i) => checkPoint(errors, p, `demolish target ${i}`));
  if (mode === "demolition") {
    check(errors, demolish.length >= 1, "demolition levels need a target");
    check(errors, typeof limit === "number" && limit > 0, "demolition levels need a time limit");
  }
  const solids = Array.isArray((level as CustomLevel)?.solids)
    ? (level as CustomLevel).solids
    : [];
  check(errors, solids.length >= 1, "levels need at least one solid");
  unique(
    errors,
    solids.map((s) => s?.id),
    "solid",
  );
  for (const [i, s] of solids.entries()) {
    check(errors, (SOLID_KINDS as readonly string[]).includes(s?.kind), `solid ${i} has an unknown kind`);
    check(
      errors,
      finite(s?.x) && finite(s?.y) && finite(s?.z),
      `solid ${s?.id ?? i} needs finite x/y/z`,
    );
    check(
      errors,
      s?.w > 0 && s?.h > 0 && s?.d > 0,
      `solid ${s?.id ?? i} needs a positive size`,
    );
    check(
      errors,
      s?.yaw === undefined || finite(s.yaw),
      `solid ${s?.id ?? i} needs a finite yaw`,
    );
    check(
      errors,
      s?.angle === undefined || finite(s.angle),
      `solid ${s?.id ?? i} needs a finite angle`,
    );
    check(
      errors,
      Number.isInteger(s?.color) && (s?.color ?? -1) >= 0 && (s?.color ?? -1) <= 0xffffff,
      `solid ${s?.id ?? i} needs an integer color`,
    );
    check(
      errors,
      s?.texture === undefined || (TEXTURE_IDS as readonly string[]).includes(s.texture),
      `solid ${s?.id ?? i} has an unknown texture`,
    );
  }
  const prefabs = Array.isArray((level as CustomLevel)?.prefabs)
    ? (level as CustomLevel).prefabs
    : [];
  check(errors, Array.isArray((level as CustomLevel)?.prefabs), "prefabs must be an array");
  unique(
    errors,
    prefabs.map((p) => p?.id),
    "prefab",
  );
  for (const [i, p] of prefabs.entries()) {
    check(
      errors,
      (PREFAB_KINDS as readonly string[]).includes(p?.kind),
      `prefab ${p?.id ?? i} has an unknown kind`,
    );
    check(
      errors,
      finite(p?.x) && finite(p?.z) && (p?.y === undefined || finite(p.y)),
      `prefab ${p?.id ?? i} needs finite x/z`,
    );
  }
  if (errors.length) throw new Error(`Invalid custom level: ${errors.join("; ")}`);
  return {
    name,
    mode,
    spawn: { ...spawn },
    checkpoints: checkpoints.map((p) => ({ ...p })),
    ...(collectibles.length ? { collectibles: collectibles.map((p) => ({ ...p })) } : {}),
    ...(demolish.length ? { demolish: demolish.map((p) => ({ ...p })) } : {}),
    solids: solids.map((s) => ({ ...s })),
    prefabs: prefabs.map((p) => ({ ...p })),
    medals: { ...medals },
    ...(limit === undefined ? {} : { limit }),
  };
}
export function customSlug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "custom"
  );
}
function hashColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 0xffffff;
}
/** Adapt a validated level to a playable Track. */
export function toTrack(level: CustomLevel): Track {
  const gatePoints = [
    ...level.checkpoints,
    ...level.prefabs.filter((p) => p.kind === "checkpoint"),
  ];
  const path = [
    { x: level.spawn.x, z: level.spawn.z },
    ...gatePoints.map((p) => ({ x: p.x, z: p.z })),
  ];
  const checkpoints = gates(path).map((g, i) => ({
    ...g,
    y: gatePoints[i].y ?? 2,
  }));
  const base = {
    id: `custom:${customSlug(level.name)}` as CustomTrackId,
    name: level.name,
    description: `Custom level "${level.name}".`,
    color: hashColor(level.name),
    thumbnail: "/tracks/custom.svg",
    spawn: { ...level.spawn },
    path,
    medals: { ...level.medals },
    custom: level,
  };
  if (level.mode === "arena")
    return {
      ...base,
      mode: "arena",
      checkpoints: [],
      collectibles: (level.collectibles ?? []).map((p, i) => ({
        x: p.x,
        z: p.z,
        y: p.y ?? 1.7,
        id: `pickup-${i + 1}`,
        radius: 3.5,
      })),
      limit: level.limit!,
      feasibility: level.limit! * 0.75,
    };
  if (level.mode === "demolition")
    return {
      ...base,
      mode: "demolition",
      checkpoints: [],
      collectibles: [],
      demolish: (level.demolish ?? []).map((p, i) => ({
        x: p.x,
        z: p.z,
        y: p.y ?? 1.5,
        id: `stone-${i + 1}`,
        radius: 3.5,
      })),
      limit: level.limit!,
      feasibility: level.limit! * 0.75,
    };
  return {
    ...base,
    mode: "race",
    checkpoints,
    collectibles: [],
    ...(level.limit === undefined
      ? {}
      : { limit: level.limit, feasibility: level.limit * 0.75 }),
  };
}
/** A drivable skeleton the editor can open: ground, road, one gate. */
export function blankLevel(name: string): CustomLevel {
  return {
    name,
    mode: "race",
    spawn: { x: 0, y: 2.1, z: -40, yaw: 0 },
    checkpoints: [{ x: 0, z: 40 }],
    solids: [
      {
        id: "ground",
        kind: "ground",
        x: 0,
        y: -0.6,
        z: 0,
        w: 200,
        h: 1.2,
        d: 200,
        color: 0x6d817c,
        texture: "grass_ground",
      },
      {
        id: "road-1",
        kind: "road",
        x: 0,
        y: 0.015,
        z: 0,
        w: 24,
        h: 0.03,
        d: 110,
        color: 0x303e49,
        texture: "asphalt_02",
      },
    ],
    prefabs: [],
    medals: { gold: 30, silver: 45, bronze: 60 },
  };
}
export function solidDefaults(kind: SolidKind) {
  const defaults: Record<
    SolidKind,
    { w: number; h: number; d: number; color: number; angle?: number }
  > = {
    ground: { w: 200, h: 1.2, d: 200, color: 0x6d817c },
    road: { w: 24, h: 0.03, d: 100, color: 0x303e49 },
    container: { w: 8, h: 5.2, d: 16, color: 0xac623f },
    barrier: { w: 6, h: 1.6, d: 5, color: 0xe6c16a },
    ramp: { w: 16, h: 0.35, d: 12, color: 0x8a8f96, angle: -0.124 },
    support: { w: 2, h: 8, d: 2, color: 0x555c60 },
    lava: { w: 20, h: 0.5, d: 20, color: 0xff5a1f },
  };
  return defaults[kind];
}
export type Placement =
  | {
      type: "solid";
      kind: SolidKind;
      x: number;
      z: number;
      y?: number;
      w?: number;
      h?: number;
      d?: number;
      texture?: string;
    }
  | { type: "prefab"; kind: string; x: number; z: number; y?: number }
  | { type: "checkpoint"; x: number; z: number; y?: number };
function nextPlacementId(prefix: string, taken: Set<string>) {
  let n = taken.size + 1;
  while (taken.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}
/** Commit one in-game placement, returning the updated level. */
export function placeInLevel(
  level: CustomLevel,
  placement: Placement,
): CustomLevel {
  if (placement.type === "solid") {
    const defaults = solidDefaults(placement.kind);
    const taken = new Set(level.solids.map((s) => s.id));
    const h = placement.h ?? defaults.h;
    const solid: CustomSolid = {
      id: nextPlacementId(placement.kind, taken),
      kind: placement.kind,
      x: placement.x,
      y: placement.y ?? h / 2,
      z: placement.z,
      w: placement.w ?? defaults.w,
      h,
      d: placement.d ?? defaults.d,
      color: defaults.color,
      ...(defaults.angle === undefined ? {} : { angle: defaults.angle }),
      ...(placement.texture === undefined
        ? {}
        : { texture: placement.texture }),
    };
    return { ...level, solids: [...level.solids, solid] };
  }
  if (placement.type === "prefab") {
    if (!(PREFAB_KINDS as readonly string[]).includes(placement.kind))
      throw new Error(`Unknown prefab kind: ${placement.kind}`);
    const taken = new Set(level.prefabs.map((p) => p.id));
    const prefab: CustomPrefab = {
      id: nextPlacementId(placement.kind, taken),
      kind: placement.kind,
      x: placement.x,
      z: placement.z,
      ...(placement.y === undefined ? {} : { y: placement.y }),
    };
    return { ...level, prefabs: [...level.prefabs, prefab] };
  }
  return {
    ...level,
    checkpoints: [
      ...level.checkpoints,
      {
        x: placement.x,
        z: placement.z,
        ...(placement.y === undefined ? {} : { y: placement.y }),
      },
    ],
  };
}
/** Append a live gate to a playable track, mirroring gates() math. */
export function appendCheckpoint(
  track: Track,
  x: number,
  z: number,
  y = 2,
) {
  const previous = track.path[track.path.length - 1];
  track.path.push({ x, z });
  const length = Math.hypot(x - previous.x, z - previous.z);
  const fallback =
    track.checkpoints.length > 0
      ? track.checkpoints[track.checkpoints.length - 1]
      : { nx: 0, nz: 1 };
  const gate = {
    x,
    z,
    id: `gate-${track.checkpoints.length + 1}`,
    nx: length > 1e-6 ? (x - previous.x) / length : fallback.nx,
    nz: length > 1e-6 ? (z - previous.z) / length : fallback.nz,
    width: 24,
    y,
    height: 8,
  };
  track.checkpoints.push(gate);
  return gate;
}
const registry = new Map<string, Track>();
export function registerCustomTrack(track: Track) {
  if (!track.id.startsWith("custom:"))
    throw new Error(`Custom track ids start with custom:: ${track.id}`);
  registry.set(track.id, track);
}
export function customTrackIds() {
  return [...registry.keys()];
}
export function getCustomTrack(id: string) {
  return registry.get(id);
}
