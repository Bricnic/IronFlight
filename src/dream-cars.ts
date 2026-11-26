import type { BestTimes } from "./best-times";
import type { GoldStars } from "./gold-stars";
import { isStarRelocated } from "./gold-star-migrations";
import {
  LEVEL_COLLECTIONS,
  type CollectionId,
} from "./level-collections";
import { hasGold } from "./level-unlocks";
import { getTrack } from "./tracks";
import { getVehicle } from "./vehicles";

/** Dream car per collection, in LEVEL_COLLECTIONS order. */
export const DREAM_CARS: { collection: CollectionId; car: string }[] = [
  { collection: "sweet-celebrations", car: "cake-cruiser" },
  { collection: "winter-wonderland", car: "gingerbread-glider" },
  { collection: "spooky-places", car: "haunted-hearse" },
  { collection: "toybox-adventures", car: "windup-wonder" },
  { collection: "stunt-parks", car: "loop-launcher" },
  { collection: "industrial-mayhem", car: "slag-hauler" },
  { collection: "outdoor-adventures", car: "canyon-camper" },
  { collection: "space", car: "meteor-prospector" },
];

export function dreamCarForCollection(collection: CollectionId): string {
  return DREAM_CARS.find((d) => d.collection === collection)!.car;
}

export function dreamCarCollection(carId: string): CollectionId | undefined {
  return DREAM_CARS.find((d) => d.car === carId)?.collection;
}

export function isDreamCar(carId: string): boolean {
  return DREAM_CARS.some((d) => d.car === carId);
}

/**
 * Dream-car gate: gold medal AND the dream level's gold star banked.
 * Derived from existing records, so earned cars unlock immediately.
 */
export function isDreamCarUnlocked(
  carId: string,
  scores: BestTimes,
  starBank?: GoldStars,
): boolean {
  const collectionId = dreamCarCollection(carId);
  if (!collectionId) return true;
  const collection = LEVEL_COLLECTIONS.find((c) => c.id === collectionId)!;
  const dream = collection.dream;
  if (!dream) return true;
  if (!hasGold(dream, scores)) return false;
  for (const s of getTrack(dream).goldStars ?? [])
    if (!starBank?.isLit(dream, s, isStarRelocated(dream, s.id))) return false;
  return true;
}

/** Garage copy for a locked dream car. */
export function dreamCarRequirement(carId: string): string {
  const collectionId = dreamCarCollection(carId);
  const collection = LEVEL_COLLECTIONS.find((c) => c.id === collectionId)!;
  const car = getVehicle(carId);
  return `Locked — earn a gold medal and find the gold star on ${getTrack(collection.dream!).name} to unlock the ${car.name}.`;
}
