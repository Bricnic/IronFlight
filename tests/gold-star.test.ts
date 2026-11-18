import { expect, it } from "vitest";
import { GoldStars } from "../src/gold-stars";
import { TRACKS, getTrack } from "../src/tracks";
import { GOLD_STAR_RADIUS, TrackRun } from "../src/track-run";
import { buildGoldStar, goldStarStats } from "../src/course-view";
import { officialFileTracks } from "../src/official-levels";
import {
  blankLevel,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}
const p = (z: number, x = 0, y = 2) => ({ x, y, z });
it("places gold stars with standard fields only and defaults y", () => {
  const level = blankLevel("Star Probe");
  level.prefabs = [
    { id: "gold-star-1", kind: "gold-star", x: 4, z: 40 },
    { id: "gold-star-2", kind: "gold-star", x: 8, y: 3, z: 60, yaw: 0.5, scale: 2 },
  ];
  const track = toTrack(validateCustomLevel(level));
  expect(track.goldStars).toEqual([
    { id: "gold-star-1", x: 4, y: 2, z: 40 },
    { id: "gold-star-2", x: 8, y: 3, z: 60, yaw: 0.5, scale: 2 },
  ]);
});
it("collects each star once within a 4-unit swept radius", () => {
  expect(GOLD_STAR_RADIUS).toBe(4);
  const track = {
    ...getTrack("foundry-run"),
    goldStars: [{ id: "gold-star-1", x: 0, y: 2, z: 10 }],
  };
  const run = new TrackRun(track);
  run.step(1, p(0), p(4), 1);
  expect(run.stars.size).toBe(0);
  run.step(1, p(4), p(8), 1);
  expect([...run.stars]).toEqual(["gold-star-1"]);
  run.step(1, p(8), p(12), 1);
  expect(run.stars.size).toBe(1);
  expect(run.snapshot().stars).toEqual(["gold-star-1"]);
  expect(run.snapshot().starCount).toBe(1);
});
it("collects stars in arena mode without completing the run", () => {
  const track = {
    ...getTrack("scrapyard-sweep"),
    collectibles: [{ id: "a", x: 0, z: 100, y: 2, radius: 2 }],
    goldStars: [{ id: "gold-star-1", x: 0, y: 2, z: 10 }],
  };
  const run = new TrackRun(track);
  run.step(1, p(0), p(12), 1);
  expect([...run.stars]).toEqual(["gold-star-1"]);
  expect(run.status).toBe("running");
});
it("banks stars per level and reloads them across sessions", () => {
  const storage = memory();
  const bank = new GoldStars(storage);
  expect(bank.collect("foundry-run", "gold-star-1")).toBe(true);
  expect(bank.collect("foundry-run", "gold-star-1")).toBe(false);
  expect(bank.has("foundry-run", "gold-star-1")).toBe(true);
  expect(bank.has("foundry-run", "gold-star-2")).toBe(false);
  const reloaded = new GoldStars(storage);
  expect(reloaded.stars("foundry-run")).toEqual(["gold-star-1"]);
  expect(reloaded.stars("skyline-circuit")).toEqual([]);
});
it("ignores unknown levels and corrupt storage", () => {
  const bank = new GoldStars(memory());
  expect(bank.collect("nope", "gold-star-1")).toBe(false);
  expect(bank.collect("foundry-run", "")).toBe(false);
  expect(bank.stars("nope")).toEqual([]);
  const corrupt = memory();
  corrupt.setItem("iron-flight-gold-stars-v1", "{oops");
  expect(new GoldStars(corrupt).stars("foundry-run")).toEqual([]);
  const junk = memory();
  junk.setItem(
    "iron-flight-gold-stars-v1",
    JSON.stringify({ version: 1, banked: { "foundry-run": ["gold-star-1", 7, ""], nope: ["x"] } }),
  );
  expect(new GoldStars(junk).stars("foundry-run")).toEqual(["gold-star-1"]);
});
it("builds a chrome-gold high-poly star", () => {
  const stats = goldStarStats(buildGoldStar());
  expect(stats.meshes).toBe(1);
  expect(stats.triangles).toBeGreaterThan(200);
  expect(stats.metalness).toBe(1);
  expect(stats.roughness).toBeLessThanOrEqual(0.2);
});
it("every official level hides exactly one star", () => {
  for (const track of [...TRACKS, ...officialFileTracks])
    expect(track.goldStars?.length, track.id).toBe(1);
});
