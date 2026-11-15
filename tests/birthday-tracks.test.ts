import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  BIRTHDAY_PREFAB_KINDS,
  PROP_PREFAB_KINDS,
  customSlug,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import { getBackgroundTemplate } from "../src/backgrounds";
import { officialFileTracks } from "../src/official-levels";
import { idealLineSeconds } from "../scripts/ideal-line.mjs";
import { scanLevel, type ZLevel } from "../scripts/level-zfight.mjs";

// Observed official-race pace band (checkpoint-polyline units per gold second:
// Toybox Road 3.55 .. Machine Gauntlet 12.61); ideal-line estimates must land inside it.
const PACE_LO = 3.5;
const PACE_HI = 12.7;

const TRACKS = [
  { file: "Birthday Cake Circuit.json", gold: 130, limit: 300 },
  { file: "Birthday Table Loop.json", gold: 160, limit: 360 },
  { file: "Bouncy House.json", gold: 60, limit: 180 },
];

type Level = {
  name: string;
  mode: string;
  backgroundTemplate: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  checkpoints: { name: string; x: number; y: number; z: number }[];
  solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number; yaw?: number; color: number }[];
  prefabs: { id: string; kind: string; x: number; z: number; y?: number; yaw?: number; scale?: number; angle?: number; roll?: number; spots?: unknown; seed?: number; trigger?: number }[];
  medals: { gold: number; silver: number; bronze: number };
  limit: number;
};

const load = (file: string): Level =>
  JSON.parse(readFileSync(`levels/official/${file}`, "utf8"));

for (const spec of TRACKS) {
  it(`${spec.file} is a valid birthday race with a 30s+ ideal line`, () => {
    const level = load(spec.file);
    expect(() => validateCustomLevel(level)).not.toThrow();
    expect(level.mode).toBe("race");
    expect(level.medals.gold).toBe(spec.gold);
    expect(level.medals.silver).toBeGreaterThan(level.medals.gold);
    expect(level.medals.bronze).toBeGreaterThan(level.medals.silver);
    expect(level.limit).toBe(spec.limit);
    expect(level.medals.bronze).toBeLessThanOrEqual(level.limit);
    expect(level.backgroundTemplate).toBe("birthday");
    expect(getBackgroundTemplate(level.backgroundTemplate).name).toBe("birthday");
    expect(idealLineSeconds(level)).toBeGreaterThanOrEqual(30);
    // Ideal-line estimate grounded in official-race pace: polyline length / gold.
    const path = [level.spawn, ...level.checkpoints];
    let poly = 0;
    for (let i = 1; i < path.length; i++)
      poly += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
    const pace = poly / level.medals.gold;
    expect(pace, `${spec.file} pace ${pace.toFixed(2)} u/s`).toBeGreaterThanOrEqual(PACE_LO);
    expect(pace, `${spec.file} pace ${pace.toFixed(2)} u/s`).toBeLessThanOrEqual(PACE_HI);
    expect(poly / PACE_HI, `${spec.file} gold achievable`).toBeLessThanOrEqual(level.medals.gold);
    // Explicit vertical layers, no coplanar suspects, grounded at y=0.
    const { suspects } = scanLevel(level as unknown as ZLevel);
    expect(suspects, `${spec.file}: ${JSON.stringify(suspects)}`).toEqual([]);
    const tops = level.solids.map((s) => s.y + s.h / 2);
    expect(Math.min(...tops)).toBeCloseTo(0, 6);
    // New prefabs place with standard fields only.
    for (const p of level.prefabs) {
      expect(p.angle, `${p.id} pitch`).toBeUndefined();
      expect(p.roll, `${p.id} roll`).toBeUndefined();
      expect(p.spots, `${p.id} spots`).toBeUndefined();
      expect(p.seed, `${p.id} seed`).toBeUndefined();
      expect(p.trigger, `${p.id} trigger`).toBeUndefined();
    }
    // Wired into the official lineup with a real thumbnail.
    const track = toTrack(validateCustomLevel(level));
    expect(track.id).toBe(`custom:${customSlug(level.name)}`);
    const official = officialFileTracks.find((t) => t.id === track.id);
    expect(official, `${spec.file} in order.json`).toBeDefined();
    expect(official!.thumbnail).toBe(`/tracks/${customSlug(level.name)}.png`);
    const thumb = `public${official!.thumbnail}`;
    expect(existsSync(thumb), `${thumb} exists`).toBe(true);
    const bytes = readFileSync(thumb);
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(640);
    expect(bytes.readUInt32BE(20)).toBeGreaterThanOrEqual(360);
  });
}

it("Birthday Cake Circuit laps a radius-200 ring on a wide cake-top track", () => {
  const level = load("Birthday Cake Circuit.json");
  for (const c of level.checkpoints)
    expect(Math.hypot(c.x, c.z), c.name).toBeCloseTo(200, 0);
  expect(Math.hypot(level.spawn.x, level.spawn.z)).toBeCloseTo(200, 0);
  const roads = level.solids.filter((s) => s.kind === "road");
  expect(roads.length).toBeGreaterThanOrEqual(12);
  for (const r of roads) expect(r.w).toBeGreaterThanOrEqual(20);
  const kinds = level.prefabs.map((p) => p.kind);
  for (const kind of ["birthday-candle", "helium-balloon", "birthday-card"])
    expect(kinds, kind).toContain(kind);
});

it("Birthday Table Loop rounds the 500x300 corners", () => {
  const level = load("Birthday Table Loop.json");
  const corners = level.checkpoints.slice(0, 4);
  expect(corners).toHaveLength(4);
  for (const [i, c] of corners.entries()) {
    const sx = i === 0 || i === 3 ? -1 : 1;
    const sz = i < 2 ? -1 : 1;
    expect(Math.abs(c.x - sx * 250), c.name).toBeLessThanOrEqual(15);
    expect(Math.abs(c.z - sz * 150), c.name).toBeLessThanOrEqual(15);
  }
  const kinds = level.prefabs.map((p) => p.kind);
  for (const kind of ["birthday-candle", "helium-balloon", "birthday-card"])
    expect(kinds, kind).toContain(kind);
});

it("Bouncy House threads 3-4 wide planks over a full bouncy floor", () => {
  const level = load("Bouncy House.json");
  const planks = level.solids.filter(
    (s) => s.id.startsWith("leg-") || s.id.startsWith("link-"),
  );
  expect(planks.length).toBeGreaterThanOrEqual(5);
  for (const p of planks) {
    const lateral = p.id.startsWith("leg-") ? p.w : p.d;
    expect(lateral, `${p.id} width`).toBeGreaterThanOrEqual(3);
    expect(lateral, `${p.id} width`).toBeLessThanOrEqual(4);
    expect(p.y + p.h / 2, `${p.id} top`).toBeCloseTo(14, 0);
  }
  // Every checkpoint stands over a plank and over a bouncy pad.
  const pads = level.prefabs.filter((p) => p.kind === "bouncy-castle");
  expect(pads.length).toBeGreaterThan(0);
  const onPlank = (x: number, z: number) =>
    planks.some(
      (s) => Math.abs(x - s.x) <= s.w / 2 && Math.abs(z - s.z) <= s.d / 2,
    );
  const onPad = (x: number, z: number) =>
    pads.some((p) => {
      const half = (10 * (p.scale ?? 1)) / 2;
      return Math.abs(x - p.x) <= half && Math.abs(z - p.z) <= half;
    });
  for (const c of level.checkpoints) {
    expect(onPlank(c.x, c.z), `${c.name} over a plank`).toBe(true);
    expect(onPad(c.x, c.z), `${c.name} over a pad`).toBe(true);
  }
});

it("the three birthday tracks use every prior birthday kind plus the castle", () => {
  for (const kind of ["birthday-candle", "helium-balloon", "birthday-card"])
    expect(BIRTHDAY_PREFAB_KINDS as readonly string[]).toContain(kind);
  for (const kind of ["cookie", "cracker", "fruit"])
    expect(PROP_PREFAB_KINDS as readonly string[]).toContain(kind);
  const kinds = new Set<string>();
  for (const spec of TRACKS) {
    const level = load(spec.file);
    for (const p of level.prefabs) kinds.add(p.kind);
  }
  for (const kind of [
    "birthday-candle",
    "helium-balloon",
    "birthday-card",
    "cookie",
    "cracker",
    "fruit",
    "bouncy-castle",
  ])
    expect(kinds, kind).toContain(kind);
});

it("lists the birthday tracks last in build order", () => {
  const order = JSON.parse(readFileSync("levels/official/order.json", "utf8")) as {
    file: string;
    thumbnail: string;
  }[];
  expect(order.slice(-3).map((e) => e.file)).toEqual(TRACKS.map((t) => t.file));
  for (const e of order.slice(-3)) {
    expect(e.thumbnail.startsWith("/tracks/")).toBe(true);
    expect(e.thumbnail.endsWith(".png")).toBe(true);
  }
});
