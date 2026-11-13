import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initPhysics } from "../src/simulation";
import { getBackgroundTemplate } from "../src/backgrounds";
import { officialFileTracks } from "../src/official-levels";
import { idealLineSeconds } from "../scripts/ideal-line.mjs";
import { driveSharkbiteRunToCompletion } from "./sharkbite-run-drive";

beforeAll(initPhysics);

const file = "levels/official/Sharkbite Run.json";

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

it("stages the annotated route: blocks, potion, cacti jump, sharks, dino tunnel, platform", () => {
  const level = load();
  expect(level.name).toBe("Sharkbite Run");
  expect(level.mode).toBe("race");
  expect(level.backgroundTemplate).toBe("desert-mesas");
  expect(getBackgroundTemplate(level.backgroundTemplate).name).toBe("desert-mesas");
  expect(level.limit).toBe(240);
  expect(level.checkpoints.map((c) => c.name)).toEqual([
    "Potion Bend",
    "Cactus Landing",
    "Shark Exit",
    "Dino Maw",
    "Gray Platform",
  ]);
  const kinds = level.prefabs.map((p) => p.kind);
  for (const kind of ["loose-blocks", "potion", "cacti-patch", "shark-pool", "raptor"])
    expect(kinds, `prefab ${kind}`).toContain(kind);
  expect(level.prefabs.filter((p) => p.kind === "loose-blocks")).toHaveLength(22);
  const ids = level.solids.map((s) => s.id);
  for (const id of ["sr-kicker", "sr-climb", "sr-platform", "sr-mouth-roof"])
    expect(ids, `solid ${id}`).toContain(id);
  const platform = level.solids.find((s) => s.id === "sr-platform")!;
  const finish = level.checkpoints[level.checkpoints.length - 1];
  expect(finish.y).toBeCloseTo(platform.y + platform.h / 2 + 2, 1);
  expect(level.medals.gold).toBeGreaterThan(0);
  expect(level.medals.silver).toBeGreaterThan(level.medals.gold);
  expect(level.medals.bronze).toBeGreaterThan(level.medals.silver);
  expect(level.medals.bronze).toBeLessThanOrEqual(level.limit);
  const track = officialFileTracks.find((t) => t.id === "custom:sharkbite-run")!;
  expect(track).toBeDefined();
  expect(track.thumbnail).toBe("/tracks/sharkbite-run.png");
});

it("keeps the raptor off the racing line", () => {
  const level = load();
  const raptors = level.prefabs.filter((p) => p.kind === "raptor");
  expect(raptors.length).toBeGreaterThan(0);
  for (const gate of level.checkpoints)
    for (const raptor of raptors)
      expect(
        Math.hypot(gate.x - raptor.x, gate.z - raptor.z),
        `${raptor.id} vs ${gate.name}`,
      ).toBeGreaterThanOrEqual(15);
});

it("needs at least 30 seconds on the ideal line, and gold stays achievable", () => {
  const level = load();
  const ideal = idealLineSeconds(level);
  expect(ideal, `ideal ${ideal.toFixed(1)}s`).toBeGreaterThanOrEqual(30);
  expect(ideal, "gold achievable").toBeLessThanOrEqual(level.medals.gold);
});

it("smashes, jumps, skims and climbs to the platform finish", () => {
  const elapsed = driveSharkbiteRunToCompletion();
  expect(elapsed).toBeLessThan(240);
});
