import order from "../levels/official/order.json";
import { toTrack, validateCustomLevel } from "./custom-level";
import { TRACKS } from "./tracks";

type LevelEntry = { file: string; thumbnail?: string; description?: string };
const definitions = import.meta.glob<unknown>(
  ["../levels/official/*.json", "!../levels/official/order.json"],
  { eager: true, import: "default" },
);
const entries: LevelEntry[] = order;
export const officialFileTracks = entries.map(
  ({ file, thumbnail, description }) => {
    const definition = definitions[`../levels/official/${file}`];
    if (!definition)
      throw new Error(`Unknown official level in order.json: ${file}`);
    const track = toTrack(validateCustomLevel(definition));
    return {
      ...track,
      sourceFile: `levels/official/${file}`,
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
