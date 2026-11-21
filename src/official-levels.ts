import order from "../levels/official/order.json";
import { toTrack, validateCustomLevel } from "./custom-level";
import { collectionOrderIds } from "./level-collections";
import { TRACKS } from "./tracks";

type LevelEntry = { file: string; thumbnail?: string; description?: string };
const definitions = import.meta.glob<unknown>(
  ["../levels/official/**/*.json", "!../levels/official/order.json"],
  { eager: true, import: "default" },
);
const entries: LevelEntry[] = order;
export const officialFileTracks = entries.map(
  ({ file, thumbnail, description }) => {
    const definition = definitions[`../levels${file}`];
    if (!definition)
      throw new Error(`Unknown official level in order.json: ${file}`);
    const track = toTrack({
      ...validateCustomLevel(definition),
      sourcePath: file.slice(1, -5),
    });
    return {
      ...track,
      sourceFile: `levels${file}`,
      thumbnail: thumbnail ?? track.thumbnail,
      description: description ?? track.description,
    };
  },
);

export const officialTracks = [...TRACKS, ...officialFileTracks];
const ids = officialTracks.map((track) => track.id);
if (new Set(ids).size !== ids.length)
  throw new Error("Duplicate official level in order.json");

/** Step through the official lineup, with wraparound at both ends. */
export function stepTrackId(current: string | undefined, dir: 1 | -1) {
  const at = ids.findIndex((id) => id === current);
  if (at < 0) return dir === 1 ? ids[0] : ids[ids.length - 1];
  return ids[(at + dir + ids.length) % ids.length];
}

/**
 * Step through unlocked official levels only, in collection order (Sweet
 * Celebrations through Outdoor Adventures, unlock order within each),
 * skipping locked ones with wraparound. Falls back to the full order
 * when nothing is unlocked (fresh saves always unlock the first two per
 * collection, so this is only a safety net for inconsistent state).
 */
export function stepUnlockedTrackId(
  current: string | undefined,
  dir: 1 | -1,
  unlocked: ReadonlySet<string> | readonly string[],
) {
  const allowed = unlocked instanceof Set ? unlocked : new Set(unlocked);
  const order = collectionOrderIds();
  const lineup = order.filter((id) => allowed.has(id));
  const pool = lineup.length ? lineup : order;
  const at = pool.findIndex((id) => id === current);
  if (at < 0) return dir === 1 ? pool[0] : pool[pool.length - 1];
  return pool[(at + dir + pool.length) % pool.length];
}
