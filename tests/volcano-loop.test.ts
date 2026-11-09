import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initPhysics } from "../src/simulation";
import { volcanoPhase } from "../src/gauntlet-timing";
import { driveVolcanoLoopToCompletion } from "./volcano-loop-drive";

beforeAll(initPhysics);

const file = "levels/official/Volcano Loop.json";

type Level = {
  name: string;
  backgroundTemplate: string;
  mode: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  checkpoints: { name: string; x: number; y: number; z: number; yaw: number }[];
  solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number }[];
  prefabs: { id: string; kind: string; x: number; z: number; phase?: number }[];
  medals: { gold: number; silver: number; bronze: number };
  limit: number;
};

function load(): Level {
  return JSON.parse(readFileSync(file, "utf8"));
}

it("stages the sketch loop: gates, book, hands, cup, volcano, boost", () => {
  const level = load();
  expect(level.mode).toBe("race");
  expect(level.backgroundTemplate).toBe("toybox-volcano");
  expect(level.limit).toBe(240);
  expect(level.checkpoints).toHaveLength(5);
  const kinds = level.prefabs.map((p) => p.kind);
  for (const kind of ["book", "hands", "cup", "volcano", "boost-pad"])
    expect(kinds).toContain(kind);
  const lava = level.solids.filter((s) => s.kind === "lava");
  expect(lava.length).toBeGreaterThanOrEqual(3);
  expect(level.medals.gold).toBeGreaterThan(0);
  expect(level.medals.silver).toBeGreaterThan(level.medals.gold);
  expect(level.medals.bronze).toBeGreaterThan(level.medals.silver);
});

it("gives timed traps explicit phases so they actually strike", () => {
  const level = load();
  for (const prefab of level.prefabs)
    if (["hands", "cup", "volcano"].includes(prefab.kind))
      expect(
        prefab.phase,
        `${prefab.id} phase (NaN would freeze the cycle)`,
      ).toBeDefined();
  expect(volcanoPhase(2).erupting).toBe(true);
  expect(volcanoPhase(5).erupting).toBe(false);
});

it("keeps hazards clear of the gate line", () => {
  const level = load();
  const hazards = level.prefabs.filter((p) =>
    ["book", "hands", "cup", "volcano"].includes(p.kind),
  );
  for (const gate of level.checkpoints)
    for (const hazard of hazards)
      expect(
        Math.hypot(gate.x - hazard.x, gate.z - hazard.z),
        `${hazard.id} vs ${gate.name}`,
      ).toBeGreaterThanOrEqual(12);
});

it("finishes the loop in the watermelon car in under four minutes", () => {
  const elapsed = driveVolcanoLoopToCompletion("watermelon-car");
  expect(elapsed).toBeLessThan(240);
});
