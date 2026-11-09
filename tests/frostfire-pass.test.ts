import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";
import { driveFrostfireToCompletion } from "./frostfire-drive";

const id = "custom:frostfire-pass";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});

const levelJson = () =>
  JSON.parse(readFileSync("levels/official/Frostfire Pass.json", "utf8")) as {
    solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number }[];
    checkpoints: { name: string; x: number; z: number }[];
    limit: number;
    medals: { gold: number; silver: number; bronze: number };
    backgroundTemplate: string;
    prefabs: { id: string; kind: string; x: number; z: number; scale?: number }[];
  };

it("stages the sketch: book, blocks, coals, giant raptor and 3x snowman", () => {
  const level = levelJson();
  const byKind = (kind: string) =>
    level.prefabs.filter((p) => p.kind === kind);
  expect(byKind("book")).toHaveLength(1);
  expect(byKind("loose-blocks")).toHaveLength(10);
  expect(byKind("burning-coals")).toHaveLength(5);
  expect(byKind("snowman")).toHaveLength(1);
  expect(byKind("snowman")[0].scale).toBe(3);
  expect(byKind("raptor")).toHaveLength(1);
  expect(byKind("raptor")[0].scale).toBe(2);
  const ids = level.solids.map((s) => s.id);
  for (const want of [
    "leg1-road",
    "bottom-road",
    "leg2-road-n",
    "snow-pad",
    "flag-0-0",
    "lava-lake",
  ])
    expect(ids).toContain(want);
  expect(level.checkpoints).toHaveLength(3);
  expect(level.backgroundTemplate).toBe("alpine-peaks");
});

it("completes the reference drive within the limit", () => {
  const elapsed = driveFrostfireToCompletion();
  const level = levelJson();
  expect(elapsed).toBeLessThan(level.limit);
  expect(level.medals.bronze).toBeLessThan(level.limit);
});

it("the giant raptor rips parts off a parked truck", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 36, y: 11.1, z: -25 }, true);
    sim.run(3, { brake: 1 });
    const rips = sim.damageEvents.filter((e) => e.source === "raptor");
    expect(rips.length).toBeGreaterThanOrEqual(3);
    expect(sim.snapshot(false).integrity).toBeLessThan(0.8);
  } finally {
    sim.dispose();
  }
});

it("keeps background shape bases on the lava from anywhere on the route", () => {
  const level = JSON.parse(
    readFileSync("levels/official/Frostfire Pass.json", "utf8"),
  ) as {
    backgroundTemplate: string;
    spawn: { x: number; z: number };
    checkpoints: { x: number; z: number }[];
    rings?: { x: number; z: number }[];
    solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number }[];
  };
  const template = JSON.parse(
    readFileSync(`levels/backgrounds/${level.backgroundTemplate}.json`, "utf8"),
  ) as { shapes: { radius: number; y?: number }[] };
  const lava = level.solids.find((s) => s.kind === "lava")!;
  const lavaTop = lava.y + lava.h / 2;
  const points = [level.spawn, ...level.checkpoints, ...(level.rings ?? [])];
  const route = {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minZ: Math.min(...points.map((p) => p.z)),
    maxZ: Math.max(...points.map((p) => p.z)),
  };
  for (const ring of template.shapes.filter((s) => Math.abs(s.y ?? 0) < 10)) {
    expect(lava.x - lava.w / 2).toBeLessThanOrEqual(route.minX - ring.radius);
    expect(lava.x + lava.w / 2).toBeGreaterThanOrEqual(route.maxX + ring.radius);
    expect(lava.z - lava.d / 2).toBeLessThanOrEqual(route.minZ - ring.radius);
    expect(lava.z + lava.d / 2).toBeGreaterThanOrEqual(route.maxZ + ring.radius);
    expect(ring.y ?? 0).toBeLessThanOrEqual(lavaTop + 0.5);
    expect(ring.y ?? 0).toBeGreaterThanOrEqual(lavaTop - 6);
  }
});
