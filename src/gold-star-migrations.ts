/**
 * Gold-star relocation registry.
 *
 * FORMAT: levels/gold-star-migrations.json maps "trackId:starId" -> true,
 * one entry per star that was MOVED after banking began. Examples:
 *   { "foundry-run:gold-star-1": true }
 *   { "custom:fairground:gold-star-1": true }
 * (Custom track ids already contain a colon, so those keys hold two.)
 *
 * The registry starts EMPTY. Later stages populate it ONLY for stars they
 * move; every other star keeps the legacy found-only level-select check,
 * so pre-coordinate banked records stay valid.
 */
import raw from "../levels/gold-star-migrations.json";

const registry = raw as Record<string, unknown>;

/** True when this exact star was relocated and needs a coords match. */
export function isStarRelocated(trackId: string, starId: string): boolean {
  return registry[`${trackId}:${starId}`] === true;
}

/** Every relocated "trackId:starId" key currently in the registry. */
export function relocatedStarKeys(): string[] {
  return Object.keys(registry).filter((key) => registry[key] === true);
}
