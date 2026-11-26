import { beforeAll, expect, it } from "vitest";
import { BestTimes } from "../src/best-times";
import { registerCustomTrack } from "../src/custom-level";
import { GoldStars } from "../src/gold-stars";
import { officialFileTracks } from "../src/official-levels";
import { LEVEL_COLLECTIONS } from "../src/level-collections";
import { getTrack } from "../src/tracks";
import { VEHICLES, getVehicle } from "../src/vehicles";
import {
  DREAM_CARS,
  dreamCarForCollection,
  dreamCarRequirement,
  isDreamCar,
  isDreamCarUnlocked,
} from "../src/dream-cars";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

beforeAll(() => {
  for (const track of officialFileTracks) registerCustomTrack(track);
});

function goldRun(trackId: string) {
  return {
    trackId,
    variant: "default",
    status: "completed" as const,
    elapsed: getTrack(trackId).medals.gold,
    splits: [] as number[],
  };
}

function bankDreamStar(starBank: GoldStars, dreamId: string) {
  const def = getTrack(dreamId).goldStars![0];
  starBank.collect(dreamId, def.id, { x: def.x, y: def.y, z: def.z });
}

it("maps one registered dream car per collection", () => {
  expect(DREAM_CARS).toHaveLength(LEVEL_COLLECTIONS.length);
  for (const c of LEVEL_COLLECTIONS) {
    const car = dreamCarForCollection(c.id);
    expect(isDreamCar(car)).toBe(true);
    expect(VEHICLES.some((v) => v.id === car)).toBe(true);
    expect(getVehicle(car).name.length).toBeGreaterThan(0);
  }
  expect(new Set(DREAM_CARS.map((d) => d.car)).size).toBe(DREAM_CARS.length);
});

it("locks dream cars until their dream has gold and star", () => {
  for (const c of LEVEL_COLLECTIONS) {
    const car = dreamCarForCollection(c.id);
    const dream = c.dream!;
    // Fresh save: locked.
    expect(
      isDreamCarUnlocked(car, new BestTimes(memoryStorage()), new GoldStars(memoryStorage())),
      car,
    ).toBe(false);
    // Gold alone: still locked.
    {
      const scores = new BestTimes(memoryStorage());
      scores.record(goldRun(dream) as never);
      expect(isDreamCarUnlocked(car, scores, new GoldStars(memoryStorage())), `${car} gold-only`).toBe(false);
    }
    // Star alone: still locked.
    {
      const stars = new GoldStars(memoryStorage());
      bankDreamStar(stars, dream);
      expect(isDreamCarUnlocked(car, new BestTimes(memoryStorage()), stars), `${car} star-only`).toBe(false);
    }
    // Both: unlocked, and other collections' cars stay locked.
    {
      const scores = new BestTimes(memoryStorage());
      const stars = new GoldStars(memoryStorage());
      scores.record(goldRun(dream) as never);
      bankDreamStar(stars, dream);
      expect(isDreamCarUnlocked(car, scores, stars), `${car} both`).toBe(true);
      for (const other of LEVEL_COLLECTIONS) {
        if (other.id === c.id) continue;
        expect(
          isDreamCarUnlocked(dreamCarForCollection(other.id), scores, stars),
          `${other.id} stays locked`,
        ).toBe(false);
      }
    }
  }
});

it("states the dream requirement for locked cars", () => {
  const text = dreamCarRequirement("cake-cruiser");
  expect(text).toContain("gold medal");
  expect(text).toContain("gold star");
  expect(text).toContain("Sweet Celebrations Dream");
  expect(text).toContain("Cake Cruiser");
});

it("leaves ordinary cars always unlocked", () => {
  expect(isDreamCar("monster-truck")).toBe(false);
  expect(
    isDreamCarUnlocked("monster-truck", new BestTimes(memoryStorage()), new GoldStars(memoryStorage())),
  ).toBe(true);
});
