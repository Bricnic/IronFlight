import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initPhysics } from "../src/simulation";
import { getBackgroundTemplate } from "../src/backgrounds";
import { officialFileTracks } from "../src/official-levels";
import { idealLineSeconds } from "../scripts/ideal-line.mjs";
import { driveRockAndRollToCompletion } from "./rock-and-roll-drive";

beforeAll(initPhysics);

const file = "levels/official/Rock and Roll.json";

type Level = {
  name: string;
  backgroundTemplate: string;
  mode: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  checkpoints: { name: string; x: number; y: number; z: number }[];
  solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number }[];
  prefabs: { id: string; kind: string; x: number; z: number }[];
  medals: { gold: number; silver: number; bronze: number };
  limit: number;
};

function load(): Level {
  return JSON.parse(readFileSync(file, "utf8"));
}

it("stages the annotated route: screws, kicker, coals, seesaw, boulders, loop, gray straight", () => {
  const level = load();
  expect(level.name).toBe("Rock and Roll");
  expect(level.mode).toBe("race");
  expect(level.backgroundTemplate).toBe("toybox-volcano");
  expect(getBackgroundTemplate(level.backgroundTemplate).name).toBe("toybox-volcano");
  expect(level.limit).toBe(240);
  expect(level.checkpoints.map((c) => c.name)).toEqual([
    "Screw Exit",
    "Rocker Exit",
    "Boulder Pass",
    "Loop Bend",
    "Finish",
  ]);
  const kinds = level.prefabs.map((p) => p.kind);
  for (const kind of ["screw-field", "burning-coals", "rocker", "boulder", "loop", "raptor"])
    expect(kinds, `prefab ${kind}`).toContain(kind);
  expect(level.prefabs.filter((p) => p.kind === "boulder")).toHaveLength(2);
  expect(level.prefabs.filter((p) => p.kind === "burning-coals").length).toBeGreaterThanOrEqual(8);
  const ids = level.solids.map((s) => s.id);
  for (const id of ["rr-kicker", "rr-arch-lintel"])
    expect(ids, `solid ${id}`).toContain(id);
  expect(level.medals.gold).toBeGreaterThan(0);
  expect(level.medals.silver).toBeGreaterThan(level.medals.gold);
  expect(level.medals.bronze).toBeGreaterThan(level.medals.silver);
  expect(level.medals.bronze).toBeLessThanOrEqual(level.limit);
  const track = officialFileTracks.find((t) => t.id === "custom:rock-and-roll")!;
  expect(track).toBeDefined();
  expect(track.thumbnail).toBe("/tracks/rock-and-roll.png");
});

it("keeps the loop raptor off the racing line", () => {
  const level = load();
  const raptors = level.prefabs.filter((p) => p.kind === "raptor");
  expect(raptors.length).toBeGreaterThan(0);
  for (const gate of level.checkpoints)
    for (const raptor of raptors)
      expect(
        Math.hypot(gate.x - raptor.x, gate.z - raptor.z),
        `${raptor.id} vs ${gate.name}`,
      ).toBeGreaterThanOrEqual(10);
});

it("needs at least 30 seconds on the ideal line, and gold stays achievable", () => {
  const level = load();
  const ideal = idealLineSeconds(level);
  expect(ideal, `ideal ${ideal.toFixed(1)}s`).toBeGreaterThanOrEqual(30);
  expect(ideal, "gold achievable").toBeLessThanOrEqual(level.medals.gold);
});

it("survives screws, jumps, seesaws and boulders to the finish", () => {
  const elapsed = driveRockAndRollToCompletion();
  expect(elapsed).toBeLessThan(240);
});
