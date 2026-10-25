import { expect, it } from "vitest";
import { TRACKS, getTrack, stepTrackId, validateTracks } from "../src/tracks";
it("registers Triple Loop plus eight distinct tracks", () => {
  expect(TRACKS.map((t) => t.name)).toEqual([
    "Triple Loop",
    "Harbor Sprint",
    "Foundry Run",
    "Skyline Circuit",
    "Scrapyard Sweep",
    "Inferno Vault",
    "Canyon Plunge",
    "Haunted Hollow",
    "Sky Slide",
  ]);
  expect(TRACKS.filter((t) => t.mode === "arena")).toHaveLength(2);
  expect(TRACKS.filter((t) => t.mode === "demolition")).toHaveLength(1);
  expect(new Set(TRACKS.map((t) => t.thumbnail)).size).toBe(9);
  expect(getTrack("triple-loop").legacy).toBe(true);
  expect(validateTracks(TRACKS)).toEqual([]);
});
it("arena deadlines reserve at least a quarter of the timer for the completion test", () => {
  expect(getTrack("scrapyard-sweep").limit).toBe(120);
  expect(getTrack("inferno-vault").limit).toBe(150);
  for (const t of TRACKS.filter((t) => t.mode === "arena")) {
    expect(t.collectibles.length).toBeGreaterThanOrEqual(10);
    expect(t.feasibility).toBe(t.limit! * 0.75);
  }
});
it("steps to the next and previous level with wraparound", () => {
  expect(stepTrackId("harbor-sprint", 1)).toBe("foundry-run");
  expect(stepTrackId("harbor-sprint", -1)).toBe("triple-loop");
  expect(stepTrackId("sky-slide", 1)).toBe("triple-loop");
  expect(stepTrackId("triple-loop", -1)).toBe("sky-slide");
  expect(stepTrackId("custom:my-level", 1)).toBe("triple-loop");
  expect(stepTrackId("custom:my-level", -1)).toBe("sky-slide");
  expect(stepTrackId(undefined, 1)).toBe("triple-loop");
  expect(stepTrackId(undefined, -1)).toBe("sky-slide");
});
it("rejects duplicate IDs, invalid medal thresholds and impossible arena budgets", () => {
  expect(validateTracks([...TRACKS, TRACKS[0]])).not.toEqual([]);
  expect(
    validateTracks([
      { ...TRACKS[1], medals: { gold: 70, silver: 20, bronze: 10 } },
    ]),
  ).not.toEqual([]);
  expect(validateTracks([{ ...TRACKS[4], feasibility: 121 }])).not.toEqual([]);
});
