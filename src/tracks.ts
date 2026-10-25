export const TRACK_IDS = [
  "triple-loop",
  "harbor-sprint",
  "foundry-run",
  "skyline-circuit",
  "scrapyard-sweep",
  "inferno-vault",
  "canyon-plunge",
  "haunted-hollow",
  "sky-slide",
] as const;
export type TrackId = (typeof TRACK_IDS)[number];
export type Point = { x: number; z: number };
export type Checkpoint = Point & {
  id: string;
  nx: number;
  nz: number;
  width: number;
  y: number;
  height: number;
};
export type Collectible = Point & { id: string; y: number; radius: number };
export type Demolishable = Point & { id: string; y: number; radius: number };
export type Track = {
  id: TrackId;
  name: string;
  mode: "race" | "arena" | "demolition";
  controls?: "drive" | "strafe";
  trampoline?: Point & { y: number };
  ring?: Point & { y: number; radius: number };
  demolish?: Demolishable[];
  description: string;
  legacy?: boolean;
  thumbnail: string;
  color: number;
  spawn: Point & { y: number; yaw: number };
  path: Point[];
  checkpoints: Checkpoint[];
  collectibles: Collectible[];
  medals: { gold: number; silver: number; bronze: number };
  limit?: number;
  feasibility?: number;
};
const points = (pairs: number[][]): Point[] =>
  pairs.map(([x, z]) => ({ x, z }));
export function gates(path: Point[], width = 24): Checkpoint[] {
  return path.slice(1).map((p, i) => {
    const previous = path[i],
      length = Math.hypot(p.x - previous.x, p.z - previous.z);
    return {
      ...p,
      id: `gate-${i + 1}`,
      nx: (p.x - previous.x) / length,
      nz: (p.z - previous.z) / length,
      width,
      y: 2,
      height: 8,
    };
  });
}
const harbor = points([
  [0, -100],
  [0, -40],
  [15, 20],
  [-15, 90],
  [25, 160],
  [10, 230],
  [30, 300],
]);
const foundry = points([
  [0, -100],
  [0, -50],
  [0, 0],
  [15, 60],
  [15, 120],
  [-15, 180],
  [0, 240],
  [0, 300],
]);
const skyline = Array.from({ length: 17 }, (_, i) => ({
  x: 80 * Math.sin((i * Math.PI) / 8),
  z: -80 * Math.cos((i * Math.PI) / 8),
}));
const scrap = points([
  [0, -45],
  [25, -30],
  [45, 0],
  [35, 30],
  [0, 50],
  [-30, 35],
  [-50, 0],
  [-30, -35],
  [0, 0],
  [25, 20],
  [-15, 15],
  [0, 70],
]);
const inferno = points([
  [0, -55],
  [35, -35],
  [65, 0],
  [45, 45],
  [0, 70],
  [-45, 45],
  [-65, 0],
  [-35, -35],
  [0, 0],
  [0, 105],
]);
// Provisional expansion geometry; course chunks finalize heights and hazards.
const canyon = points([
  [0, -100],
  [0, 300],
  [0, 700],
  [0, 845],
  [0, 900],
  [0, 1300],
  [0, 1700],
  [0, 2100],
  [0, 2500],
]);
const hollow = points([
  [-135, -85],
  [135, -85],
  [135, 105],
  [-135, 105],
  [-100, 70],
  [100, 70],
  [100, -70],
  [-100, -70],
  [-40, -30],
  [40, -30],
  [40, 30],
  [-40, 30],
]);
const slide = points([
  [0, -100],
  [0, 300],
  [60, 700],
  [60, 1100],
  [-60, 1500],
  [-60, 1900],
  [0, 2300],
]);
// Sky Slide water-channel surface height: 100 m at the top plaza, easing to
// 2 m where the channel meets the trampoline pad. Single source for the gate
// heights below and the ramp solids in course.ts.
export function slideProfileY(z: number) {
  const t = Math.max(0, Math.min(1, (2300 - z) / 2400));
  return 2 + 98 * t * t;
}
function race(
  id: TrackId,
  name: string,
  description: string,
  color: number,
  path: Point[],
  times: number[],
  yaw = 0,
  limit?: number,
): Track {
  return {
    id,
    name,
    description,
    color,
    mode: "race",
    thumbnail: `/tracks/${id}.svg`,
    spawn: { ...path[0], y: 2.1, yaw },
    path,
    checkpoints: gates(path),
    collectibles: [],
    medals: { gold: times[0], silver: times[1], bronze: times[2] },
    ...(limit ? { limit, feasibility: limit * 0.75 } : {}),
  };
}
function arena(
  id: TrackId,
  name: string,
  description: string,
  color: number,
  path: Point[],
  limit: number,
  times: number[],
): Track {
  const t = race(
    id,
    name,
    description,
    color,
    [{ x: 0, z: -90 }, ...path],
    times,
  );
  return {
    ...t,
    mode: "arena",
    checkpoints: [],
    limit,
    feasibility: limit * 0.75,
    collectibles: path.map((p, i) => ({
      ...p,
      y: 1.7,
      id: `pickup-${i + 1}`,
      radius: 3.5,
    })),
  };
}
function demo(
  id: TrackId,
  name: string,
  description: string,
  color: number,
  targets: Point[],
  limit: number,
  times: number[],
): Track {
  const t = race(id, name, description, color, [{ x: 0, z: -90 }], times);
  return {
    ...t,
    mode: "demolition",
    checkpoints: [],
    limit,
    feasibility: limit * 0.75,
    demolish: targets.map((p, i) => ({
      ...p,
      y: 1.5,
      id: `stone-${i + 1}`,
      radius: 3.5,
    })),
  };
}
export const TRACKS: Track[] = [
  {
    ...race(
      "triple-loop",
      "Triple Loop",
      "Three legendary lanes. Clear the jump, brave the dragons and complete the loop.",
      0xf5a45c,
      [
        { x: -24, z: -65 },
        { x: -24, z: 85 },
        { x: -24, z: 195 },
        { x: -12, z: 390 },
      ],
      [35, 50, 75],
    ),
    legacy: true,
  },
  race(
    "harbor-sprint",
    "Harbor Sprint",
    "Sweep through the docks, cargo chicanes and checkpoint gates.",
    0x65c8e8,
    harbor,
    [35, 50, 75],
  ),
  race(
    "foundry-run",
    "Foundry Run",
    "Launch through a working foundry. Watch the hammer and timed flames.",
    0xff8153,
    foundry,
    [40, 60, 90],
  ),
  race(
    "skyline-circuit",
    "Skyline Circuit",
    "One full lap. Link the sweeping sectors and cross the line.",
    0xb1a0ff,
    skyline,
    [45, 65, 95],
    Math.PI / 2,
  ),
  arena(
    "scrapyard-sweep",
    "Scrapyard Sweep",
    "Collect all 12 salvage tokens before the scrapyard clock runs out.",
    0xc8dc6c,
    scrap,
    120,
    [60, 90, 120],
  ),
  arena(
    "inferno-vault",
    "Inferno Vault",
    "Recover 10 energy cores between fire, machinery and lava vaults.",
    0xffbd48,
    inferno,
    150,
    [75, 110, 150],
  ),
  {
    ...race(
      "canyon-plunge",
      "Canyon Plunge",
      "Drop the great ramp, clear the canyon and run the axe gauntlet.",
      0xe08a4c,
      canyon,
      [150, 210, 270],
      0,
      300,
    ),
    spawn: { x: 0, z: -100, y: 82.1, yaw: 0 },
    checkpoints: gates(canyon).map((g, i) => ({
      ...g,
      y: [56, 29, 19, 5, 5, 5, 5, 5][i],
    })),
  },
  demo(
    "haunted-hollow",
    "Haunted Hollow",
    "Smash all 12 gravestones before the ghosts wear the truck down.",
    0x9a6fd0,
    hollow,
    300,
    [150, 210, 270],
  ),
  {
    ...race(
      "sky-slide",
      "Sky Slide",
      "Ride the rapids, strafe the falls and ring the trampoline.",
      0x4fb8ff,
      slide,
      [150, 210, 270],
      0,
      300,
    ),
    controls: "strafe",
    spawn: { x: 0, z: -100, y: 102.1, yaw: 0 },
    checkpoints: gates(slide).map((g) => ({
      ...g,
      y: Math.round((slideProfileY(g.z) + 2.1) * 10) / 10,
    })),
    trampoline: { x: 0, z: 2360, y: 0 },
    ring: { x: 0, z: 2440, y: 20, radius: 10 },
  },
];
export function getTrack(id: string): Track {
  const track = TRACKS.find((t) => t.id === id);
  if (!track) throw new RangeError(`Unknown track: ${id}`);
  return track;
}
export function validateTracks(tracks: Track[]) {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const t of tracks) {
    if (ids.has(t.id)) errors.push(`Duplicate track ${t.id}`);
    ids.add(t.id);
    if (
      !(
        t.medals.gold > 0 &&
        t.medals.gold < t.medals.silver &&
        t.medals.silver < t.medals.bronze
      )
    )
      errors.push(`Invalid medals ${t.id}`);
    if (!Number.isFinite(t.spawn.x + t.spawn.y + t.spawn.z + t.spawn.yaw))
      errors.push(`Invalid spawn ${t.id}`);
    if (
      t.mode === "arena" &&
      (!t.limit ||
        t.feasibility !== t.limit * 0.75 ||
        t.medals.bronze > t.limit ||
        !t.collectibles.length)
    )
      errors.push(`Invalid arena ${t.id}`);
    if (
      t.mode === "demolition" &&
      (!t.limit ||
        t.feasibility !== t.limit * 0.75 ||
        t.medals.bronze > t.limit ||
        !t.demolish?.length)
    )
      errors.push(`Invalid demolition ${t.id}`);
    if (t.mode === "race" && !t.checkpoints.length)
      errors.push(`Missing gates ${t.id}`);
    if (t.mode === "race" && t.limit && t.medals.bronze > t.limit)
      errors.push(`Medal beyond limit ${t.id}`);
    if (t.mode === "race" && t.limit && t.feasibility !== t.limit * 0.75)
      errors.push(`Missing headroom ${t.id}`);
    if (t.controls === "strafe" && !t.ring)
      errors.push(`Strafe without ring ${t.id}`);
    if (new Set(t.collectibles.map((p) => p.id)).size !== t.collectibles.length)
      errors.push(`Duplicate pickups ${t.id}`);
    if (
      new Set((t.demolish ?? []).map((p) => p.id)).size !==
      (t.demolish ?? []).length
    )
      errors.push(`Duplicate targets ${t.id}`);
  }
  return errors;
}
