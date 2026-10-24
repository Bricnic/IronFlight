import { expect, it } from "vitest";
import { existsSync } from "node:fs";
import { TRACKS, TRACK_IDS, getTrack, validateTracks } from "../src/tracks";
it("registers three expansion tracks alongside the original six", () => {
  expect([...TRACK_IDS]).toEqual([
    "triple-loop",
    "harbor-sprint",
    "foundry-run",
    "skyline-circuit",
    "scrapyard-sweep",
    "inferno-vault",
    "canyon-plunge",
    "haunted-hollow",
    "sky-slide",
  ]);
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
  expect(new Set(TRACKS.map((t) => t.thumbnail)).size).toBe(9);
  expect(validateTracks(TRACKS)).toEqual([]);
});
it("gives every expansion track a 300s limit with medals inside the window", () => {
  for (const id of ["canyon-plunge", "haunted-hollow", "sky-slide"] as const) {
    const track = getTrack(id);
    expect(track.limit).toBe(300);
    expect(track.feasibility).toBe(225);
    expect(track.medals.bronze).toBeLessThanOrEqual(300);
  }
  expect(getTrack("canyon-plunge").mode).toBe("race");
  expect(getTrack("haunted-hollow").mode).toBe("demolition");
  expect(getTrack("haunted-hollow").demolish).toHaveLength(12);
  expect(getTrack("sky-slide").controls).toBe("strafe");
  expect(getTrack("sky-slide").ring).toMatchObject({ y: expect.any(Number) });
});
it("rejects invalid expansion budgets and objectives", () => {
  const canyon = getTrack("canyon-plunge");
  expect(
    validateTracks([
      { ...canyon, medals: { gold: 300, silver: 200, bronze: 100 } },
    ]),
  ).not.toEqual([]);
  expect(
    validateTracks([
      { ...canyon, medals: { gold: 150, silver: 210, bronze: 301 } },
    ]),
  ).not.toEqual([]);
  const hollow = getTrack("haunted-hollow");
  expect(validateTracks([{ ...hollow, demolish: [] }])).not.toEqual([]);
  const slide = getTrack("sky-slide");
  expect(validateTracks([{ ...slide, ring: undefined }])).not.toEqual([]);
});
it("ships a readable thumbnail file per expansion track", () => {
  for (const id of ["canyon-plunge", "haunted-hollow", "sky-slide"])
    expect(existsSync(`public/tracks/${id}.svg`)).toBe(true);
});
