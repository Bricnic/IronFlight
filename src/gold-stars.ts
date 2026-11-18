import { TRACK_IDS } from "./tracks";
import type { ScoreStorage } from "./best-times";
const KEY = "iron-flight-gold-stars-v1";
function validId(id: string) {
  return (
    (TRACK_IDS as readonly string[]).includes(id) ||
    /^custom:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
  );
}
/** Gold stars banked per level, persisted like best times across sessions. */
export class GoldStars {
  private banked: Record<string, string[]> = {};
  constructor(private storage: ScoreStorage) {
    try {
      const saved = JSON.parse(storage.getItem(KEY) ?? "null");
      if (
        saved?.version === 1 &&
        saved.banked &&
        typeof saved.banked === "object"
      )
        for (const [id, value] of Object.entries(saved.banked)) {
          if (!validId(id) || !Array.isArray(value)) continue;
          const ids = [...new Set(value)].filter(
            (s): s is string => typeof s === "string" && s.length > 0,
          );
          if (ids.length) this.banked[id] = ids;
        }
    } catch {
      /* Private browsing or corrupt records must not prevent playing. */
    }
  }
  /** Star ids ever collected on this level (a copy). */
  stars(id: string): string[] {
    return [...(this.banked[id] ?? [])];
  }
  has(id: string, starId: string) {
    return (this.banked[id] ?? []).includes(starId);
  }
  /** Bank a star; true when newly collected. Unknown levels are ignored. */
  collect(id: string, starId: string) {
    if (!validId(id) || typeof starId !== "string" || !starId.length)
      return false;
    const known = this.banked[id] ?? (this.banked[id] = []);
    if (known.includes(starId)) return false;
    known.push(starId);
    try {
      this.storage.setItem(
        KEY,
        JSON.stringify({ version: 1, banked: this.banked }),
      );
    } catch {
      /* Keep the in-memory stars when storage is unavailable. */
    }
    return true;
  }
}
