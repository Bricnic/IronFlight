import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import R from "@dimforge/rapier3d-compat";
import { Simulation, initPhysics } from "../src/simulation";
import { blankLevel, registerCustomTrack, toTrack, type CustomSolid, type CustomLevel } from "../src/custom-level";

beforeAll(initPhysics);
function fixture(solids: CustomSolid[], y = 12, scale = 1) {
  const level = blankLevel("Caterpillar navigation");
  level.spawn = { x: 100, y: 2, z: -100, yaw: 0 };
  level.solids = [{ id: "lower-ground", kind: "ground", x: 0, y: -1, z: 0, w: 400, h: 2, d: 400, color: 0x777777 }, ...solids];
  level.prefabs = [{ id: "crawler", kind: "cave-caterpillar", x: 0, y, z: 0, resizeScale: scale }];
  const track = toTrack(level); registerCustomTrack(track);
  const sim = new Simulation(); sim.startTrack(track.id);
  const crawler = (scale === 1 ? sim.dungeon : sim.resizedPrefabs[0].sim.dungeon).mechanisms.find(m => m.h.id === "crawler")!.caterpillar!;
  crawler.dest = { x: 0, z: 100 };
  return { sim, crawler };
}
const platform: CustomSolid = { id: "platform", kind: "barrier", x: 0, y: 11, z: 0, w: 40, h: 2, d: 40, color: 0x777777 };

it("turns away from an elevated platform edge while continuing to crawl", () => {
  const { sim, crawler } = fixture([platform]);
  try {
    let travel = 0;
    for (let i = 0; i < 1200; i++) {
      const before = { ...crawler.pos }; sim.step({});
      travel += Math.hypot(crawler.pos.x - before.x, crawler.pos.z - before.z);
      expect(Math.abs(crawler.pos.x)).toBeLessThan(20);
      expect(Math.abs(crawler.pos.z)).toBeLessThan(20);
      // The head must remain above the platform too, not hang over the drop.
      expect(Math.abs(crawler.pos.x + Math.sin(crawler.yaw) * 5.9)).toBeLessThan(20);
      expect(Math.abs(crawler.pos.z + Math.cos(crawler.yaw) * 5.9)).toBeLessThan(20);
    }
    expect(crawler.trips).toBeGreaterThan(0); expect(travel).toBeGreaterThan(20);
  } finally { sim.dispose(); }
});

it("ignores lava sensors and lower floors when avoiding a gap", () => {
  const { sim, crawler } = fixture([
    { ...platform, z: -15, d: 30 }, { ...platform, id: "far-bank", z: 25, d: 30 },
    { ...platform, id: "lava-gap", kind: "lava", z: 5, d: 10 },
  ]);
  crawler.pos.z = -15; crawler.home.z = -15;
  try {
    for (let i = 0; i < 600; i++) { sim.step({}); expect(crawler.pos.z).toBeLessThan(0); }
    expect(crawler.trips).toBeGreaterThan(0);
  } finally { sim.dispose(); }
});

it("turns away from a wall on otherwise continuous ground", () => {
  const { sim, crawler } = fixture([{ ...platform, id: "wall", y: 3, z: 12, w: 200, h: 6, d: 2 }], 0);
  try {
    sim.run(8);
    expect(crawler.pos.z).toBeLessThan(11);
    expect(crawler.trips).toBeGreaterThan(0);
  } finally { sim.dispose(); }
});

it.each([
  { ...platform, w: 22, d: 60, yaw: Math.PI / 4 },
  { ...platform, footprint: [{ x: -20, z: -20 }, { x: 20, z: -20 }, { x: 0, z: 20 }] },
])("uses actual rotated or clipped platform geometry ($id)", solid => {
  const { sim, crawler } = fixture([solid]);
  try {
    for (let i = 0; i < 1200; i++) {
      sim.step({});
      const hit = sim.world.castRay(new R.Ray({ x: crawler.pos.x, y: 12.5, z: crawler.pos.z }, { x: 0, y: -1, z: 0 }), 2, true, R.QueryFilterFlags.EXCLUDE_SENSORS);
      expect(hit).not.toBeNull();
    }
    expect(crawler.trips).toBeGreaterThan(0);
  } finally { sim.dispose(); }
});

it("keeps a resized caterpillar's head on the platform", () => {
  const { sim, crawler } = fixture([platform], 12, 2);
  try {
    for (let i = 0; i < 900; i++) {
      sim.step({});
      const p = sim.resizedPrefabs[0].space.toWorld({ ...crawler.pos, y: 12 });
      expect(Math.abs(p.x + Math.sin(crawler.yaw) * 11.8)).toBeLessThan(20);
      expect(Math.abs(p.z + Math.cos(crawler.yaw) * 11.8)).toBeLessThan(20);
    }
    expect(crawler.trips).toBeGreaterThan(0);
  } finally { sim.dispose(); }
});

it("stays put when no supported direction fits", () => {
  const { sim, crawler } = fixture([{ ...platform, w: 2, d: 2 }]);
  try { sim.run(2); expect(crawler.pos).toEqual({ x: 0, z: 0 }); } finally { sim.dispose(); }
});

it("keeps the elevated Lavabridge Abyss caterpillar on its tunnel roof", () => {
  const level = JSON.parse(readFileSync("levels/official/spooky-places/Lavabridge Abyss.json", "utf8")) as CustomLevel;
  const placed = level.prefabs.find(p => p.kind === "cave-caterpillar" && (p.y ?? 0) > 5)!;
  expect(placed).toBeDefined();
  level.prefabs = [placed];
  const track = toTrack(level); registerCustomTrack(track);
  const sim = new Simulation(); sim.startTrack(track.id);
  const c = sim.dungeon.mechanisms.find(m => m.h.id === placed.id)!.caterpillar!;
  try {
    let travel = 0;
    for (let i = 0; i < 1800; i++) {
      const previous = { ...c.pos }; sim.step({}); travel += Math.hypot(c.pos.x - previous.x, c.pos.z - previous.z);
      const support = sim.world.castRay(new R.Ray({ ...c.pos, y: placed.y! + 0.75 }, { x: 0, y: -1, z: 0 }), 2.75, true, R.QueryFilterFlags.EXCLUDE_SENSORS | R.QueryFilterFlags.EXCLUDE_DYNAMIC);
      expect(support).not.toBeNull();
    }
    expect(travel).toBeGreaterThan(20); expect(c.trips).toBeGreaterThan(0);
  } finally { sim.dispose(); }
});
