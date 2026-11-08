import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { TRACKS, getTrack, validateTracks } from "../src/tracks";
import { getBackgroundTemplate } from "../src/backgrounds";
import { officialTracks, stepTrackId } from "../src/official-levels";
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
  expect(officialTracks.slice(-11).map((track) => track.name)).toEqual([
    "Fairground",
    "Dungeon",
    "Jurassic Junction",
    "Emberfall Causeway",
    "Chompworks",
    "Machine Gauntlet",
    "Amber Undertow",
    "Fireside Sonata",
    "Pumpkin Pass",
    "Booster Gap",
    "Evil Tube Run",
  ]);
  expect(stepTrackId("harbor-sprint", 1)).toBe("foundry-run");
  expect(stepTrackId("harbor-sprint", -1)).toBe("triple-loop");
  expect(stepTrackId("sky-slide", 1)).toBe("custom:fairground");
  expect(stepTrackId("custom:fairground", -1)).toBe("sky-slide");
  expect(stepTrackId("custom:fairground", 1)).toBe("custom:dungeon");
  expect(stepTrackId("custom:dungeon", -1)).toBe("custom:fairground");
  expect(stepTrackId("custom:dungeon", 1)).toBe("custom:jurassic-junction");
  expect(stepTrackId("custom:jurassic-junction", -1)).toBe("custom:dungeon");
  expect(stepTrackId("custom:jurassic-junction", 1)).toBe("custom:emberfall-causeway");
  expect(stepTrackId("custom:emberfall-causeway", -1)).toBe("custom:jurassic-junction");
  expect(stepTrackId("custom:emberfall-causeway", 1)).toBe("custom:chompworks");
  expect(stepTrackId("custom:chompworks", -1)).toBe("custom:emberfall-causeway");
  expect(stepTrackId("custom:chompworks", 1)).toBe("custom:machine-gauntlet");
  expect(stepTrackId("custom:machine-gauntlet", -1)).toBe("custom:chompworks");
  expect(stepTrackId("custom:machine-gauntlet", 1)).toBe("custom:amber-undertow");
  expect(stepTrackId("custom:amber-undertow", -1)).toBe("custom:machine-gauntlet");
  expect(stepTrackId("custom:amber-undertow", 1)).toBe("custom:fireside-sonata");
  expect(stepTrackId("custom:fireside-sonata", -1)).toBe("custom:amber-undertow");
  expect(stepTrackId("custom:fireside-sonata", 1)).toBe("custom:pumpkin-pass");
  expect(stepTrackId("custom:pumpkin-pass", -1)).toBe("custom:fireside-sonata");
  expect(stepTrackId("custom:pumpkin-pass", 1)).toBe("custom:booster-gap");
  expect(stepTrackId("custom:booster-gap", -1)).toBe("custom:pumpkin-pass");
  expect(stepTrackId("custom:booster-gap", 1)).toBe("custom:evil-tube-run");
  expect(stepTrackId("custom:evil-tube-run", -1)).toBe("custom:booster-gap");
  expect(stepTrackId("custom:evil-tube-run", 1)).toBe("triple-loop");
  expect(stepTrackId("triple-loop", -1)).toBe("custom:evil-tube-run");
  expect(stepTrackId("custom:my-level", 1)).toBe("triple-loop");
  expect(stepTrackId("custom:my-level", -1)).toBe("custom:evil-tube-run");
  expect(stepTrackId(undefined, 1)).toBe("triple-loop");
  expect(stepTrackId(undefined, -1)).toBe("custom:evil-tube-run");
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
it("every track resolves a background template", () => {
  for (const t of [...TRACKS, ...officialTracks.slice(-5)]) {
    expect(t.backgroundTemplate, t.id).toBeDefined();
    expect(getBackgroundTemplate(t.backgroundTemplate).name).toBe(
      t.backgroundTemplate,
    );
  }
});
it("every official level preview is a dedicated screenshot", () => {
  for (const track of officialTracks) {
    const file = `public${track.thumbnail}`;
    expect(existsSync(file), `${track.id} thumbnail ${track.thumbnail} exists`).toBe(true);
    expect(track.thumbnail.endsWith(".png"), `${track.id} preview is a screenshot, not an illustration`).toBe(true);
    const bytes = readFileSync(file);
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(bytes.readUInt32BE(16), `${track.id} width`).toBeGreaterThanOrEqual(640);
    expect(bytes.readUInt32BE(20), `${track.id} height`).toBeGreaterThanOrEqual(360);
  }
});
