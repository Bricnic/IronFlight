import { test, expect } from "vitest";
import { comicHazards, jawAngle, waterMode } from "../src/comic-hazards";
import { TRACKS } from "../src/tracks";
test("all five new tracks have a dense mix of grounded comic hazards", () => {
  const kinds = new Set<string>();
  const covered = TRACKS.filter((t) => comicHazards(t).length > 0);
  expect(covered.map((t) => t.id).sort()).toEqual([
    "foundry-run",
    "harbor-sprint",
    "inferno-vault",
    "scrapyard-sweep",
    "skyline-circuit",
  ]);
  for (const t of covered) {
    const hazards = comicHazards(t);
    expect(hazards.length).toBeGreaterThanOrEqual(4);
    expect(new Set(hazards.map((h) => h.id)).size).toBe(hazards.length);
    hazards.forEach((h) => {
      expect(Number.isFinite(h.x + h.z)).toBe(true);
      kinds.add(h.kind);
    });
  }
  expect(kinds.size).toBeGreaterThanOrEqual(8);
});
test("chomp cycle is smooth, visibly opens and closes", () => {
  expect(jawAngle(0)).toBeGreaterThan(0.8);
  expect(jawAngle(3)).toBeLessThan(0.08);
  for (let t = 0; t < 6; t += 0.01)
    expect(Math.abs(jawAngle(t + 0.01) - jawAngle(t))).toBeLessThan(0.04);
});
test("water requires 200 MPH entry and sinks below 180 MPH", () => {
  expect(waterMode(199, false)).toBe("sinking");
  expect(waterMode(201, false)).toBe("skimming");
  expect(waterMode(190, true)).toBe("skimming");
  expect(waterMode(180, true)).toBe("skimming");
  expect(waterMode(179, true)).toBe("sinking");
});
