import { beforeAll, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { BestTimes } from "../src/best-times";
import { GoldStars } from "../src/gold-stars";
import { registerCustomTrack } from "../src/custom-level";
import { getTrack } from "../src/tracks";
import {
  officialFileTracks,
  officialTracks,
  stepUnlockedTrackId,
} from "../src/official-levels";
import {
  LEVEL_COLLECTIONS,
  collectionForTrack,
  collectionOrderIds,
} from "../src/level-collections";
import {
  UNLOCK_BASE,
  UnlockSeen,
  goldCount,
  hasGold,
  hasPlayed,
  isDreamUnlocked,
  starProgress,
  unlockedCount,
  unlockedIds,
} from "../src/level-unlocks";
import type { LevelCollection } from "../src/level-collections";

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
  const medals = getTrack(trackId).medals;
  return {
    trackId,
    variant: trackId === "triple-loop" ? "easy" : "default",
    status: "completed" as const,
    elapsed: medals.gold,
    splits: [] as number[],
  };
}

it("covers all 54 official levels in 7 collections with no duplicates", () => {
  expect(LEVEL_COLLECTIONS).toHaveLength(7);
  expect(LEVEL_COLLECTIONS.map((c) => c.name)).toEqual([
    "Sweet Celebrations",
    "Winter Wonderland",
    "Spooky Places",
    "Toybox Adventures",
    "Stunt Parks",
    "Industrial Mayhem",
    "Outdoor Adventures",
  ]);
  const ids = collectionOrderIds();
  expect(ids).toHaveLength(54);
  expect(new Set(ids).size).toBe(54);
  expect(new Set(ids)).toEqual(new Set(officialTracks.map((t) => t.id)));
  for (const track of officialTracks)
    expect(collectionForTrack(track.id)?.trackIds).toContain(track.id);
});

it("ships one artwork file per collection", () => {
  for (const c of LEVEL_COLLECTIONS) {
    expect(c.art.startsWith("/collections/")).toBe(true);
    expect(existsSync(`public${c.art}`), c.id).toBe(true);
  }
});

it("stores every official file level in a collection subfolder", () => {
  expect(officialFileTracks).toHaveLength(46);
  for (const track of officialFileTracks) {
    expect(track.sourceFile?.startsWith("levels/official/")).toBe(true);
    const rel = track.sourceFile!.slice("levels/official/".length);
    expect(rel.includes("/"), `${track.id} lives in a subfolder`).toBe(true);
    expect(existsSync(track.sourceFile!)).toBe(true);
  }
});

it("unlocks the first two tracks per collection on a fresh save", () => {
  const scores = new BestTimes(memoryStorage());
  for (const c of LEVEL_COLLECTIONS) {
    expect(unlockedCount(c, scores)).toBe(Math.min(2, c.trackIds.length));
    expect(unlockedIds(c, scores)).toEqual(c.trackIds.slice(0, 2));
    expect(goldCount(c, scores)).toBe(0);
  }
  expect(UNLOCK_BASE).toBe(2);
});

it("unlocks one more track per gold medal in that collection only", () => {
  const scores = new BestTimes(memoryStorage());
  const sweet = LEVEL_COLLECTIONS[0];
  const winter = LEVEL_COLLECTIONS[1];
  scores.record(goldRun(sweet.trackIds[0]) as never);
  expect(hasGold(sweet.trackIds[0], scores)).toBe(true);
  expect(hasPlayed(sweet.trackIds[0], scores)).toBe(true);
  expect(unlockedCount(sweet, scores)).toBe(3);
  expect(unlockedIds(sweet, scores)).toEqual(sweet.trackIds.slice(0, 3));
  // Other collections are unaffected.
  expect(unlockedCount(winter, scores)).toBe(2);
  // Re-earning gold on the same track unlocks nothing new.
  scores.record({ ...goldRun(sweet.trackIds[0]), elapsed: getTrack(sweet.trackIds[0]).medals.gold - 1 } as never);
  expect(unlockedCount(sweet, scores)).toBe(3);
  // Gold on every track unlocks the whole collection, capped at its size.
  for (const id of sweet.trackIds) scores.record(goldRun(id) as never);
  expect(unlockedCount(sweet, scores)).toBe(sweet.trackIds.length);
});

it("counts triple-loop gold across its easy/medium/hard variants", () => {
  const scores = new BestTimes(memoryStorage());
  const stunt = LEVEL_COLLECTIONS.find((c) => c.id === "stunt-parks")!;
  expect(stunt.trackIds[0]).toBe("triple-loop");
  scores.record({
    trackId: "triple-loop",
    variant: "hard",
    status: "completed",
    elapsed: getTrack("triple-loop").medals.gold,
    splits: [],
  } as never);
  expect(hasGold("triple-loop", scores)).toBe(true);
  expect(unlockedCount(stunt, scores)).toBe(3);
});

it("tracks gold-star progress per collection", () => {
  const stars = new GoldStars(memoryStorage());
  const outdoor = LEVEL_COLLECTIONS.find((c) => c.id === "outdoor-adventures")!;
  const empty = starProgress(outdoor, stars);
  expect(empty.lit).toBe(0);
  expect(empty.total).toBeGreaterThan(0);
  const first = outdoor.trackIds[0];
  const def = getTrack(first).goldStars![0];
  stars.collect(first, def.id, { x: def.x, y: def.y, z: def.z });
  const after = starProgress(outdoor, stars);
  expect(after.lit).toBe(1);
  expect(after.total).toBe(empty.total);
});

it("locks the dream level until every other course has gold and stars", () => {
  const scores = new BestTimes(memoryStorage());
  const starBank = new GoldStars(memoryStorage());
  const dreamy: LevelCollection = {
    id: "toybox-adventures",
    name: "Toybox",
    theme: "",
    art: "",
    trackIds: ["custom:block-party", "custom:toybox-road", "custom:tabletop-brawl"],
    dream: "custom:tabletop-brawl",
  };
  const others = ["custom:block-party", "custom:toybox-road"];
  expect(isDreamUnlocked(dreamy, scores, starBank)).toBe(false);
  expect(unlockedIds(dreamy, scores, starBank)).not.toContain(
    "custom:tabletop-brawl",
  );
  // Golds alone still lock it: the stars are missing.
  for (const id of others) scores.record(goldRun(id) as never);
  expect(unlockedCount(dreamy, scores)).toBe(3);
  expect(isDreamUnlocked(dreamy, scores, starBank)).toBe(false);
  expect(unlockedIds(dreamy, scores, starBank)).not.toContain(
    "custom:tabletop-brawl",
  );
  // Banking every other star opens the dream.
  for (const id of others) {
    const def = getTrack(id).goldStars![0];
    starBank.collect(id, def.id, { x: def.x, y: def.y, z: def.z });
  }
  expect(isDreamUnlocked(dreamy, scores, starBank)).toBe(true);
  expect(unlockedIds(dreamy, scores, starBank)).toContain(
    "custom:tabletop-brawl",
  );
  // Collections without a dream level are unaffected.
  const plain: LevelCollection = { ...dreamy, dream: undefined };
  expect(isDreamUnlocked(plain, scores, starBank)).toBe(true);
});

it("pins every declared dream level last in its collection", () => {
  for (const c of LEVEL_COLLECTIONS) {
    if (!c.dream) continue;
    expect(c.trackIds.at(-1)).toBe(c.dream);
    expect(getTrack(c.dream).name).toBe(`${c.name} Dream`);
  }
});

it("remembers which unlock animations have fully played", () => {
  const storage = memoryStorage();
  const seen = new UnlockSeen(storage);
  expect(seen.has("custom:dungeon")).toBe(false);
  seen.mark("custom:dungeon");
  expect(seen.has("custom:dungeon")).toBe(true);
  // Survives a reload through storage.
  expect(new UnlockSeen(storage).has("custom:dungeon")).toBe(true);
});

it("steps through unlocked levels only, with wraparound", () => {
  const scores = new BestTimes(memoryStorage());
  const unlocked = new Set(
    LEVEL_COLLECTIONS.flatMap((c) => unlockedIds(c, scores)),
  );
  // Fresh save: 2 per collection x 7 = 14 unlocked.
  expect(unlocked.size).toBe(14);
  // Locked tracks are skipped: dungeon (spooky #1, unlocked) next-unlocked
  // is haunted-hollow (spooky #2), not pumpkin-pass (spooky #3, locked).
  expect(stepUnlockedTrackId("custom:dungeon", 1, unlocked)).toBe(
    "haunted-hollow",
  );
  // Collection order: exhausting Sweet Celebrations crosses into Winter
  // Wonderland, the next collection.
  expect(
    stepUnlockedTrackId("custom:birthday-table-loop", 1, unlocked),
  ).toBe("custom:tinsel-town");
  expect(
    stepUnlockedTrackId("custom:tinsel-town", -1, unlocked),
  ).toBe("custom:birthday-table-loop");
  // Wraparound stays inside the unlocked set: last unlocked (sky-slide,
  // Outdoor #2) wraps to the first (birthday-cake-circuit, Sweet #1).
  expect(stepUnlockedTrackId("sky-slide", 1, unlocked)).toBe(
    "custom:birthday-cake-circuit",
  );
  let at: string | undefined;
  for (let i = 0; i < 30; i++) {
    at = stepUnlockedTrackId(at, 1, unlocked);
    expect(unlocked.has(at)).toBe(true);
  }
  // Empty set falls back to the full order instead of stranding the player.
  expect(stepUnlockedTrackId(undefined, 1, new Set())).toBe(
    "custom:birthday-cake-circuit",
  );
});
