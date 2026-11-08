import { vehicle } from "./themed-vehicles";

/**
 * Pipeline-generated vehicles (scripts/generate-vehicles.mjs).
 *
 * Each build run appends ONE entry with the shared `vehicle()` helper, e.g.
 *   vehicle("jet-sled", "Jet Sled", "Blurb.", [0x8a93a6, 0xd8402a, 0x222222, 1.1, 5], (k) => {
 *     ... // ConceptVehicleKit modeling — see src/themed-vehicles.ts for examples
 *   }),
 * plus whatever kit/body imports that entry needs. Keep every entry
 * kit-built on the standard 4-wheel chassis: vehicles.ts spreads
 * standardChassis over this array, so physics match the Monster Truck and the
 * drive-proof routes pass unchanged. Visuals are free (F1, trike, sled, ...)
 * but the wheels must stay four treaded assemblies at the kit hardpoints.
 *
 * Ledger rule (enforced by tests/new-vehicles.test.ts): every id here must
 * appear in visual-plan/refs/gemini/generated/briefs.json, with concept art
 * at visual-plan/refs/gemini/generated/<id>.jpg and a showroom preview at
 * public/vehicles/<id>.png (800x450).
 */
export const GENERATED_VEHICLES = [
  // Build runs append vehicle(...) entries here, one per run.
];
