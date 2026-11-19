import { TRACK_IDS } from "./tracks";
import type { ScoreStorage } from "./best-times";

const KEY = "iron-flight-gold-stars-v1";

/** Banked position of a collected star, stored alongside found=true. */
export type GoldStarCoords = { x: number; y: number; z: number };
/**
 * Banked record per star. `coords` is absent on records written before
 * coordinates were banked (legacy string-array saves, or collects that
 * never supplied a position). Callers must handle missing coords
 * explicitly: stale for relocated stars, valid otherwise.
 */
export type GoldStarRecord = { found: true; coords?: GoldStarCoords };

function validId(id: string) {
  return (
    (TRACK_IDS as readonly string[]).includes(id) ||
    /^custom:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
  );
}

function validCoords(value: unknown): value is GoldStarCoords {
  return (
    typeof value === "object" &&
    value !== null &&
    Number.isFinite((value as GoldStarCoords).x) &&
    Number.isFinite((value as GoldStarCoords).y) &&
    Number.isFinite((value as GoldStarCoords).z)
  );
}

/** Gold stars banked per level, persisted like best times across sessions. */
export class GoldStars {
  private banked: Record<string, Record<string, GoldStarRecord>> = {};
  constructor(private storage: ScoreStorage) {
    try {
      const saved = JSON.parse(storage.getItem(KEY) ?? "null");
      if (
        saved?.version === 1 &&
        saved.banked &&
        typeof saved.banked === "object"
      )
        for (const [id, value] of Object.entries(saved.banked)) {
          if (!validId(id)) continue;
          // Legacy saves bank bare star-id arrays with no coordinates.
          if (Array.isArray(value)) {
            const ids = [...new Set(value)].filter(
              (s): s is string => typeof s === "string" && s.length > 0,
            );
            if (ids.length)
              this.banked[id] = Object.fromEntries(
                ids.map((s) => [s, { found: true as const }]),
              );
            continue;
          }
          if (value === null || typeof value !== "object") continue;
          const records: Record<string, GoldStarRecord> = {};
          for (const [starId, record] of Object.entries(
            value as Record<string, unknown>,
          )) {
            if (typeof starId !== "string" || !starId.length) continue;
            if (record === true) {
              records[starId] = { found: true };
              continue;
            }
            if (
              typeof record !== "object" ||
              record === null ||
              (record as GoldStarRecord).found !== true
            )
              continue;
            const coords = (record as GoldStarRecord).coords;
            // Pre-change records carry found=true with no coords; invalid
            // coords degrade to the same explicit coords-missing state.
            records[starId] =
              coords === undefined || !validCoords(coords)
                ? { found: true }
                : {
                    found: true,
                    coords: { x: coords.x, y: coords.y, z: coords.z },
                  };
          }
          if (Object.keys(records).length) this.banked[id] = records;
        }
    } catch {
      /* Private browsing or corrupt records must not prevent playing. */
    }
  }
  /** Star ids ever collected on this level (a copy). */
  stars(id: string): string[] {
    return Object.keys(this.banked[id] ?? {});
  }
  has(id: string, starId: string) {
    return this.banked[id]?.[starId]?.found === true;
  }
  /** Banked coordinates for a star, or null when missing/never banked. */
  coords(id: string, starId: string): GoldStarCoords | null {
    const found = this.banked[id]?.[starId]?.coords;
    return found ? { ...found } : null;
  }
  /**
   * Level-select lit check. Non-relocated stars use the legacy found-only
   * rule (pre-coordinate records stay valid); relocated stars additionally
   * require banked coords to exactly match the star's current position,
   * and missing coords count as stale (unlit).
   */
  isLit(
    trackId: string,
    star: { id: string; x: number; y: number; z: number },
    relocated: boolean,
  ): boolean {
    const record = this.banked[trackId]?.[star.id];
    if (record?.found !== true) return false;
    if (!relocated) return true;
    const at = record.coords;
    return (
      at !== undefined && at.x === star.x && at.y === star.y && at.z === star.z
    );
  }
  /**
   * Bank a star; true when newly collected. Re-collecting an already
   * banked star refreshes its coordinates when they differ (or were
   * never banked) and still returns false.
   */
  collect(id: string, starId: string, coords?: GoldStarCoords) {
    if (!validId(id) || typeof starId !== "string" || !starId.length)
      return false;
    if (coords !== undefined && !validCoords(coords)) return false;
    const known = this.banked[id] ?? (this.banked[id] = {});
    const existing = known[starId];
    if (existing) {
      if (
        coords &&
        (existing.coords === undefined ||
          existing.coords.x !== coords.x ||
          existing.coords.y !== coords.y ||
          existing.coords.z !== coords.z)
      ) {
        existing.coords = { ...coords };
        this.persist();
      }
      return false;
    }
    known[starId] =
      coords === undefined
        ? { found: true }
        : { found: true, coords: { ...coords } };
    this.persist();
    return true;
  }
  private persist() {
    try {
      this.storage.setItem(
        KEY,
        JSON.stringify({ version: 1, banked: this.banked }),
      );
    } catch {
      /* Keep the in-memory stars when storage is unavailable. */
    }
  }
}
