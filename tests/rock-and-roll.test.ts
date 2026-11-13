import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initPhysics } from "../src/simulation";
import { getBackgroundTemplate } from "../src/backgrounds";
import { officialFileTracks } from "../src/official-levels";
import { idealLineSeconds } from "../scripts/ideal-line.mjs";
import {
  ROCK_AND_ROLL_ROUTE,
  driveRockAndRollToCompletion,
} from "./rock-and-roll-drive";

beforeAll(initPhysics);

const file = "levels/official/Rock and Roll.json";

type Level = {
  name: string;
  backgroundTemplate: string;
  mode: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  checkpoints: { name: string; x: number; y: number; z: number }[];
  solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number; yaw?: number }[];
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

it("keeps the whole driven route on road slabs with no gaps", () => {
  const level = load();
  const roads = level.solids.filter((s) => s.kind === "road");
  expect(roads.length).toBeGreaterThan(0);
  const covered = (x: number, z: number) =>
    roads.some((s) => {
      const yaw = s.yaw ?? 0;
      const dx = x - s.x, dz = z - s.z;
      const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
      const lz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      return Math.abs(lx) <= s.w / 2 && Math.abs(lz) <= s.d / 2;
    });
  const points: [number, number][] = [[level.spawn.x, level.spawn.z]];
  for (const [x, z] of ROCK_AND_ROLL_ROUTE) points.push([x, z]);
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    const length = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d <= length; d += 2) {
      const t = length ? d / length : 0;
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      expect(covered(x, z), `road gap at (${x.toFixed(1)},${z.toFixed(1)})`).toBe(true);
    }
  }
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
