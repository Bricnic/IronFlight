import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  CHRISTMAS_LETHAL_PREFAB_KINDS,
  CHRISTMAS_PREFAB_KINDS,
  PROP_PREFAB_KINDS,
  customSlug,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import { DUNGEON_STRIKE } from "../src/dungeon-hazards";
import { getBackgroundTemplate } from "../src/backgrounds";
import { officialFileTracks } from "../src/official-levels";
import { scanLevel, type ZLevel } from "../scripts/level-zfight.mjs";

const CHRISTMAS_DESTRUCTIBLES = [
  "christmas-ornament",
  "christmas-snow-boulder",
  "christmas-cracker-barrel",
  "christmas-gift-crate",
  "christmas-cocoa-cart",
];
// Observed official-race pace band (checkpoint-polyline units per gold second:
// Toybox Road 3.55 .. Machine Gauntlet 12.61); ideal-line estimates must land inside it.
const PACE_LO = 3.5;
const PACE_HI = 12.7;

const TRACKS = [
  { file: "Tinsel Town.json", gold: 50, limit: 150, bg: "christmas-village", lethals: 2 },
  { file: "Mistletoe Mile.json", gold: 75, limit: 200, bg: "christmas-village", lethals: 3 },
  { file: "Nutcracker Run.json", gold: 110, limit: 260, bg: "christmas-midnight", lethals: 4 },
  { file: "Sleigh Bell Sprint.json", gold: 145, limit: 340, bg: "christmas-village", lethals: 5 },
  { file: "North Pole Summit.json", gold: 180, limit: 420, bg: "christmas-midnight", lethals: 6 },
];

type Level = {
  name: string;
  mode: string;
  backgroundTemplate: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  checkpoints: { name: string; x: number; y: number; z: number; yaw: number }[];
  solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number; yaw?: number; color: number }[];
  prefabs: { id: string; kind: string; x: number; z: number; y?: number; yaw?: number }[];
  medals: { gold: number; silver: number; bronze: number };
  limit: number;
};

const load = (file: string): Level =>
  JSON.parse(readFileSync(`levels/official/${file}`, "utf8"));

function distToPath(x: number, z: number, path: { x: number; z: number }[]): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const ax = path[i - 1].x, az = path[i - 1].z;
    const dx = path[i].x - ax, dz = path[i].z - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

for (const spec of TRACKS) {
  it(`${spec.file} is a valid race track with an ideal line of ${spec.gold}s`, () => {
    const level = load(spec.file);
    expect(() => validateCustomLevel(level)).not.toThrow();
    expect(level.mode).toBe("race");
    expect(level.checkpoints.length).toBeGreaterThanOrEqual(3);
    expect(level.checkpoints.length).toBeLessThanOrEqual(5);
    expect(level.medals.gold).toBe(spec.gold);
    expect(level.medals.gold).toBeGreaterThanOrEqual(45);
    expect(level.medals.gold).toBeLessThanOrEqual(200);
    expect(level.medals.silver).toBeGreaterThan(level.medals.gold);
    expect(level.medals.bronze).toBeGreaterThan(level.medals.silver);
    expect(level.limit).toBe(spec.limit);
    expect(level.medals.bronze).toBeLessThanOrEqual(level.limit);
    expect(level.backgroundTemplate).toBe(spec.bg);
    expect(getBackgroundTemplate(level.backgroundTemplate).name).toBe(spec.bg);
    // Ideal-line estimate grounded in official-race pace: polyline length / gold.
    const path = [level.spawn, ...level.checkpoints];
    let poly = 0;
    for (let i = 1; i < path.length; i++)
      poly += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
    const pace = poly / level.medals.gold;
    expect(pace, `${spec.file} pace ${pace.toFixed(2)} u/s`).toBeGreaterThanOrEqual(PACE_LO);
    expect(pace, `${spec.file} pace ${pace.toFixed(2)} u/s`).toBeLessThanOrEqual(PACE_HI);
    // Medal-independent ideal-line bounds: a tool-assisted perfect run down
    // the middle of the track (no shortcuts) takes >= 45s, a slow steady
    // finisher still beats 300s, and gold stays achievable by that ideal.
    const perfect = poly / PACE_HI;
    const steady = poly / PACE_LO;
    expect(perfect, `${spec.file} perfect ${perfect.toFixed(1)}s`).toBeGreaterThanOrEqual(45);
    expect(steady, `${spec.file} steady ${steady.toFixed(1)}s`).toBeLessThanOrEqual(300);
    expect(perfect, `${spec.file} gold achievable`).toBeLessThanOrEqual(level.medals.gold);
    // Explicit vertical layers, no coplanar suspects.
    const { suspects } = scanLevel(level as unknown as ZLevel);
    expect(suspects, `${spec.file}: ${JSON.stringify(suspects)}`).toEqual([]);
    const tops = level.solids.map((s) => s.y + s.h / 2);
    expect(Math.min(...tops)).toBeCloseTo(0, 6);
    // Christmas dressing on every track.
    const kinds = level.prefabs.map((p) => p.kind);
    const decor = kinds.filter((k) => (CHRISTMAS_PREFAB_KINDS as readonly string[]).includes(k));
    expect(new Set(decor).size, `${spec.file} decor variety`).toBeGreaterThanOrEqual(3);
    const props = kinds.filter((k) => CHRISTMAS_DESTRUCTIBLES.includes(k));
    expect(new Set(props).size, `${spec.file} destructible variety`).toBeGreaterThanOrEqual(2);
    // Lethals sit on the road at deck height so the strike hits the car body.
    const lethals = level.prefabs.filter((p) =>
      (CHRISTMAS_LETHAL_PREFAB_KINDS as readonly string[]).includes(p.kind),
    );
    expect(lethals).toHaveLength(spec.lethals);
    for (const l of lethals) {
      expect(l.y ?? 0, `${l.id} deck height`).toBe(0);
      expect(
        DUNGEON_STRIKE[l.kind as keyof typeof DUNGEON_STRIKE],
        `${l.id} insta-lethal strike entry`,
      ).toBeDefined();
      expect(
        distToPath(l.x, l.z, path),
        `${l.id} centered on the ideal line`,
      ).toBeLessThanOrEqual(2);
    }
    // Wired into the official lineup with a real thumbnail.
    const track = toTrack(validateCustomLevel(level));
    expect(track.id).toBe(`custom:${customSlug(level.name)}`);
    const official = officialFileTracks.find((t) => t.id === track.id);
    expect(official, `${spec.file} in order.json`).toBeDefined();
    const thumb = `public${official!.thumbnail}`;
    expect(existsSync(thumb), `${thumb} exists`).toBe(true);
    const bytes = readFileSync(thumb);
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(640);
    expect(bytes.readUInt32BE(20)).toBeGreaterThanOrEqual(360);
  });
}

it("the five christmas tracks use every new decor, destructible, background and lethal", () => {
  for (const kind of CHRISTMAS_DESTRUCTIBLES)
    expect(PROP_PREFAB_KINDS as readonly string[]).toContain(kind);
  const kinds = new Set<string>();
  const bgs = new Set<string>();
  for (const spec of TRACKS) {
    const level = load(spec.file);
    bgs.add(level.backgroundTemplate);
    for (const p of level.prefabs) kinds.add(p.kind);
  }
  for (const kind of CHRISTMAS_PREFAB_KINDS) expect(kinds, `decor ${kind}`).toContain(kind);
  for (const kind of CHRISTMAS_DESTRUCTIBLES) expect(kinds, `destructible ${kind}`).toContain(kind);
  for (const kind of CHRISTMAS_LETHAL_PREFAB_KINDS) expect(kinds, `lethal ${kind}`).toContain(kind);
  expect([...bgs].sort()).toEqual(["christmas-midnight", "christmas-village"]);
});
