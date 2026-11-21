/** Official level collections, grouped by scenery and theme. */
import type { CustomTrackId, TrackId } from "./tracks";

export type CollectionId =
  | "sweet-celebrations"
  | "winter-wonderland"
  | "spooky-places"
  | "toybox-adventures"
  | "stunt-parks"
  | "industrial-mayhem"
  | "outdoor-adventures";

export interface LevelCollection {
  id: CollectionId;
  name: string;
  theme: string;
  art: string;
  /** Track ids in unlock order (directive order). */
  trackIds: (TrackId | CustomTrackId)[];
}

export const LEVEL_COLLECTIONS: LevelCollection[] = [
  {
    id: "sweet-celebrations",
    name: "Sweet Celebrations",
    theme:
      "Birthday parties and candy worlds, featuring cakes, candles, sweets and colorful decorations.",
    art: "/collections/sweet-celebrations.jpg",
    trackIds: [
      "custom:birthday-cake-circuit",
      "custom:birthday-table-loop",
      "custom:bouncy-house",
      "custom:gumdrop-meadows",
      "custom:lollipop-loop",
      "custom:peppermint-pass",
      "custom:chocolate-chasm",
      "custom:sugar-rush-summit",
    ],
  },
  {
    id: "winter-wonderland",
    name: "Winter Wonderland",
    theme: "Christmas villages, frozen lakes and snowy mountain courses.",
    art: "/collections/winter-wonderland.jpg",
    trackIds: [
      "custom:tinsel-town",
      "custom:mistletoe-mile",
      "custom:nutcracker-run",
      "custom:sleigh-bell-sprint",
      "custom:north-pole-summit",
      "custom:frostfire-pass",
    ],
  },
  {
    id: "spooky-places",
    name: "Spooky Places",
    theme:
      "Haunted landscapes and dungeon environments, with ghosts, gravestones, skulls, Halloween decorations and sinister creatures.",
    art: "/collections/spooky-places.jpg",
    trackIds: [
      "custom:dungeon",
      "haunted-hollow",
      "custom:pumpkin-pass",
      "custom:spider-hollow",
      "custom:mystic-caverns",
      "custom:firefly-grotto",
      "custom:lavabridge-abyss",
    ],
  },
  {
    id: "toybox-adventures",
    name: "Toybox Adventures",
    theme:
      "Oversized toys, household objects and tabletop obstacle courses, with giant toy creatures and colored tracks.",
    art: "/collections/toybox-adventures.jpg",
    trackIds: [
      "custom:block-party",
      "custom:toybox-road",
      "custom:tabletop-brawl",
      "custom:fireside-sonata",
      "custom:booster-gap",
      "custom:rock-and-roll",
      "custom:screwball-run",
      "custom:jurassic-junction",
      "custom:emberfall-causeway",
      "custom:chompworks",
    ],
  },
  {
    id: "stunt-parks",
    name: "Stunt Parks",
    theme:
      "Purpose-built stunt and amusement parks centered on loops, rings, rides and arena attractions.",
    art: "/collections/stunt-parks.jpg",
    trackIds: ["triple-loop", "custom:fairground", "custom:ring-chase"],
  },
  {
    id: "industrial-mayhem",
    name: "Industrial Mayhem",
    theme:
      "Machinery, hazardous infrastructure and urban environments, with industrial fire, lava and slime courses, city, scrapyard and waterfront settings.",
    art: "/collections/industrial-mayhem.jpg",
    trackIds: [
      "foundry-run",
      "inferno-vault",
      "custom:machine-gauntlet",
      "custom:amber-undertow",
      "custom:evil-tube-run",
      "custom:slime-surge",
      "custom:volcano-loop",
      "skyline-circuit",
      "scrapyard-sweep",
      "custom:shipyard",
    ],
  },
  {
    id: "outdoor-adventures",
    name: "Outdoor Adventures",
    theme:
      "Natural terrain courses with canyon drops, mountain rapids, desert obstacles and water crossings.",
    art: "/collections/outdoor-adventures.jpg",
    trackIds: ["canyon-plunge", "sky-slide", "custom:sharkbite-run"],
  },
];

const byTrack = new Map<string, LevelCollection>();
for (const c of LEVEL_COLLECTIONS)
  for (const id of c.trackIds) byTrack.set(id, c);

export function collectionForTrack(trackId: string): LevelCollection | undefined {
  return byTrack.get(trackId);
}

export function collectionById(id: CollectionId): LevelCollection {
  const found = LEVEL_COLLECTIONS.find((c) => c.id === id);
  if (!found) throw new RangeError(`Unknown collection: ${id}`);
  return found;
}

/** Every official track id in collection order (for cross-collection walks). */
export function collectionOrderIds(): (TrackId | CustomTrackId)[] {
  return LEVEL_COLLECTIONS.flatMap((c) => c.trackIds);
}
