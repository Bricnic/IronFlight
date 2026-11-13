import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
import {
  IDEAL_PACE_HI,
  idealLineLength,
  idealLineSeconds,
} from "../scripts/ideal-line.mjs";

const SCRIPT = "scripts/ideal-line.mjs";

it("pins the official pace band top", () => {
  expect(IDEAL_PACE_HI).toBe(12.7);
});

it("measures a race by its spawn+checkpoint polyline", () => {
  const level = {
    mode: "race",
    spawn: { x: 0, z: 0 },
    checkpoints: [
      { x: 30, z: 0 },
      { x: 30, z: 40 },
    ],
  };
  expect(idealLineLength(level)).toBeCloseTo(70, 6);
  expect(idealLineSeconds(level)).toBeCloseTo(70 / 12.7, 6);
});

it("measures an arena by its greedy collectible tour", () => {
  const level = {
    mode: "arena",
    spawn: { x: 0, z: 0 },
    collectibles: [
      { x: 10, z: 0 },
      { x: 10, z: 10 },
      { x: 0, z: 10 },
    ],
  };
  expect(idealLineLength(level)).toBeCloseTo(30, 6);
  expect(idealLineSeconds(level)).toBeCloseTo(30 / 12.7, 6);
});

it("measures demolition by its demolish-target tour", () => {
  const level = {
    mode: "demolition",
    spawn: { x: 0, z: 0 },
    demolish: [
      { x: 6, z: 0 },
      { x: 6, z: 8 },
    ],
  };
  expect(idealLineLength(level)).toBeCloseTo(14, 6);
});

it("exits 0 above --min and 1 below it", () => {
  const pass = execFileSync(
    process.execPath,
    [SCRIPT, "levels/official/Tabletop Brawl.json", "--min", "30"],
    { encoding: "utf8" },
  );
  expect(Number(pass.trim())).toBeGreaterThanOrEqual(30);
  let failed = false;
  try {
    execFileSync(
      process.execPath,
      [SCRIPT, "levels/official/Tabletop Brawl.json", "--min", "999"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch {
    failed = true;
  }
  expect(failed).toBe(true);
});

it("reports --json with the file and seconds", () => {
  const out = execFileSync(
    process.execPath,
    [SCRIPT, "levels/official/Sharkbite Run.json", "--json"],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(out);
  expect(parsed.file).toContain("Sharkbite Run.json");
  expect(parsed.seconds).toBeGreaterThanOrEqual(30);
});
