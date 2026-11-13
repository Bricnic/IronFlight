import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";
import { driveBlockPartyToCompletion } from "./block-party-drive";

const id = "custom:block-party";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});

const levelJson = () =>
  JSON.parse(readFileSync("levels/official/Block Party.json", "utf8")) as {
    solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number }[];
    checkpoints: { name: string; x: number; z: number }[];
    limit: number;
    medals: { gold: number; silver: number; bronze: number };
    backgroundTemplate: string;
    prefabs: { id: string; kind: string; x: number; z: number }[];
  };

it("stages the photo: gate, wyvern, tile path, pipes and a block wall", () => {
  const level = levelJson();
  const kinds = level.prefabs.map((p) => p.kind);
  expect(kinds.filter((k) => k === "loose-blocks")).toHaveLength(39);
  expect(kinds.filter((k) => k === "ember-wyvern")).toHaveLength(1);
  expect(kinds.filter((k) => k === "raptor")).toHaveLength(1);
  expect(kinds.filter((k) => k === "bumper-arena")).toHaveLength(1);
  const ids = level.solids.map((s) => s.id);
  for (const want of [
    "main-road",
    "gate-lintel",
    "zebra-tile",
    "teal-ring",
    "den-wall-n",
    "pipe-span",
    "chicane-a",
    "raptor-perch",
    "pipe2-span",
    "arena-floor",
    "lava-lake",
    "ext-road-3",
    "chicane-c",
    "chicane-d",
    "ext-road-4",
    "chicane-e",
    "chicane-f",
    "ext-road-5",
    "final-road-2",
  ])
    expect(ids).toContain(want);
  expect(level.checkpoints).toHaveLength(4);
  expect(level.backgroundTemplate).toBe("toybox-volcano");
});

it("completes the reference drive within the limit", () => {
  const elapsed = driveBlockPartyToCompletion();
  expect(elapsed).toBeGreaterThanOrEqual(30);
  const level = levelJson();
  expect(elapsed).toBeLessThan(level.limit);
  expect(level.medals.bronze).toBeLessThan(level.limit);
});

it("keeps the bumper arena off the checkpoint line", () => {
  const level = levelJson();
  const arena = level.prefabs.find((p) => p.kind === "bumper-arena")!;
  for (const cp of level.checkpoints) {
    expect(Math.hypot(cp.x - arena.x, cp.z - arena.z)).toBeGreaterThan(20);
  }
});

it("two red wyvern bites wreck a parked truck", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 2, y: 11.1, z: -6 }, true);
    sim.run(4, { brake: 1 });
    expect(
      sim.damageEvents.some((e) => e.source === "ember-wyvern"),
    ).toBe(true);
    expect(sim.status).toBe("wrecked");
  } finally {
    sim.dispose();
  }
});

it("keeps background shape bases on the lava from anywhere on the route", () => {
  const level = JSON.parse(
    readFileSync("levels/official/Block Party.json", "utf8"),
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
