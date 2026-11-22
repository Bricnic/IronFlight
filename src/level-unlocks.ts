import type { BestTimes } from "./best-times";
import type { GoldStars } from "./gold-stars";
import { isStarRelocated } from "./gold-star-migrations";
import { getTrack } from "./tracks";
import type { LevelCollection } from "./level-collections";

/** Tracks unlocked in a fresh collection before any gold medal. */
export const UNLOCK_BASE = 2;

const SEEN_KEY = "iron-flight-unlock-seen-v1";

function bestMedal(trackId: string, scores: BestTimes): string | null {
  if (trackId === "triple-loop") {
    const best = (["easy", "medium", "hard"] as const)
      .map((v) => scores.best(trackId as "triple-loop", v))
      .filter((b): b is NonNullable<typeof b> => !!b)
      .sort((a, b) => a.time - b.time)[0];
    return best?.medal ?? null;
  }
  return scores.best(trackId as Parameters<BestTimes["best"]>[0])?.medal ?? null;
}

export function hasGold(trackId: string, scores: BestTimes): boolean {
  return bestMedal(trackId, scores) === "gold";
}

export function hasPlayed(trackId: string, scores: BestTimes): boolean {
  if (trackId === "triple-loop") {
    return (["easy", "medium", "hard"] as const).some(
      (v) => scores.best(trackId as "triple-loop", v) !== null,
    );
  }
  return (
    scores.best(trackId as Parameters<BestTimes["best"]>[0]) !== null
  );
}

export function goldCount(collection: LevelCollection, scores: BestTimes): number {
  return collection.trackIds.filter((id) => hasGold(id, scores)).length;
}

/** Unlocked slots: base two plus one per distinct gold in the collection. */
export function unlockedCount(
  collection: LevelCollection,
  scores: BestTimes,
): number {
  return Math.min(
    collection.trackIds.length,
    UNLOCK_BASE + goldCount(collection, scores),
  );
}

/**
 * Dream gate: every non-dream course needs a gold medal and all of its
 * gold stars banked. Collections without a dream level are always open.
 */
export function isDreamUnlocked(
  collection: LevelCollection,
  scores: BestTimes,
  starBank?: GoldStars,
): boolean {
  const dream = collection.dream;
  if (!dream) return true;
  for (const id of collection.trackIds) {
    if (id === dream) continue;
    if (!hasGold(id, scores)) return false;
    for (const s of getTrack(id).goldStars ?? [])
      if (!starBank?.isLit(id, s, isStarRelocated(id, s.id))) return false;
  }
  return true;
}

export function unlockedIds(
  collection: LevelCollection,
  scores: BestTimes,
  starBank?: GoldStars,
): string[] {
  const ids = [
    ...collection.trackIds.slice(0, unlockedCount(collection, scores)),
  ];
  if (collection.dream && !isDreamUnlocked(collection, scores, starBank))
    return ids.filter((id) => id !== collection.dream);
  return ids;
}

export function isUnlocked(
  collection: LevelCollection,
  trackId: string,
  scores: BestTimes,
  starBank?: GoldStars,
): boolean {
  return unlockedIds(collection, scores, starBank).includes(trackId);
}

/** Stars banked vs total across a collection. */
export function starProgress(
  collection: LevelCollection,
  starBank?: GoldStars,
): { lit: number; total: number } {
  let lit = 0;
  let total = 0;
  for (const id of collection.trackIds) {
    const defs = getTrack(id).goldStars ?? [];
    total += defs.length;
    for (const s of defs)
      if (starBank?.isLit(id, s, isStarRelocated(id, s.id))) lit++;
  }
  return { lit, total };
}

/** Persisted set of track ids whose unlock animation has fully played. */
export class UnlockSeen {
  private seen = new Set<string>();
  constructor(private storage: Pick<Storage, "getItem" | "setItem">) {
    try {
      const saved = JSON.parse(storage.getItem(SEEN_KEY) ?? "[]");
      if (Array.isArray(saved))
        for (const id of saved) if (typeof id === "string") this.seen.add(id);
    } catch {
      /* Corrupt or unavailable storage must not block the menu. */
    }
  }
  has(trackId: string): boolean {
    return this.seen.has(trackId);
  }
  mark(trackId: string) {
    if (this.seen.has(trackId)) return;
    this.seen.add(trackId);
    try {
      this.storage.setItem(SEEN_KEY, JSON.stringify([...this.seen]));
    } catch {
      /* Keep the in-memory set when storage is unavailable. */
    }
  }
}
