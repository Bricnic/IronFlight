import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initPhysics } from "../src/simulation";
import { driveToyboxRoadToCompletion } from "./toybox-road-drive";

beforeAll(initPhysics);

const file = "levels/official/Toybox Road.json";

type Level = {
  name: string;
  backgroundTemplate: string;
  mode: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  checkpoints: { name: string; x: number; y: number; z: number; yaw: number }[];
  solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number; yaw?: number }[];
  prefabs: { id: string; kind: string; x: number; z: number }[];
  medals: { gold: number; silver: number; bronze: number };
  limit: number;
};

function load(): Level {
  return JSON.parse(readFileSync(file, "utf8"));
}

it("stages the toy road: arena, clips, robot, flagpole, tower, dinos", () => {
  const level = load();
  expect(level.mode).toBe("race");
  expect(level.backgroundTemplate).toBe("city-skyline");
  expect(level.limit).toBe(240);
  expect(level.checkpoints).toHaveLength(4);
  const kinds = level.prefabs.map((p) => p.kind);
  for (const kind of [
    "bumper-arena-xl",
    "clip",
    "robot",
    "flagpole",
    "glass-pane",
    "pumpkin",
    "raptor",
  ])
    expect(kinds).toContain(kind);
  expect(kinds.filter((k) => k === "clip")).toHaveLength(3);
  expect(kinds.filter((k) => k === "glass-pane").length).toBeGreaterThanOrEqual(8);
  const roads = level.solids.filter((s) => s.kind === "road");
  expect(roads.length).toBeGreaterThanOrEqual(6);
  expect(roads.filter((s) => (s.yaw ?? 0) !== 0).length).toBeGreaterThanOrEqual(3);
  for (const dino of level.prefabs.filter((p) =>
    ["raptor", "pterosaur", "spinosaurus", "ember-wyvern"].includes(p.kind),
  )) {
    const near = Math.min(
      ...roads.map((s) => Math.hypot(dino.x - s.x, dino.z - s.z)),
    );
    expect(near, `${dino.id} hunts the road`).toBeLessThan(25);
  }
  expect(level.medals.gold).toBeGreaterThan(0);
  expect(level.medals.silver).toBeGreaterThan(level.medals.gold);
  expect(level.medals.bronze).toBeGreaterThan(level.medals.silver);
});

it("keeps timed traps clear of the gate line", () => {
  const level = load();
  const traps = level.prefabs.filter((p) =>
    ["clip", "robot"].includes(p.kind),
  );
  for (const gate of level.checkpoints)
    for (const trap of traps)
      expect(
        Math.hypot(gate.x - trap.x, gate.z - trap.z),
        `${trap.id} vs ${gate.name}`,
      ).toBeGreaterThanOrEqual(12);
});

it("drives the road, rides the pole and smashes the tower in under four minutes", () => {
  const elapsed = driveToyboxRoadToCompletion();
  expect(elapsed).toBeLessThan(240);
});
