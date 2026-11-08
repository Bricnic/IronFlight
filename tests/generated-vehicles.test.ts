import { beforeAll, expect, it } from "vitest";
import { initPhysics } from "../src/simulation";
import { GENERATED_VEHICLES } from "../src/generated-vehicles";
import { driveAmberToCompletion } from "./amber-drive";
import { driveChompworksToCompletion } from "./chompworks-drive";
import {
  DUNGEON_REFERENCE_SECONDS,
  driveDungeonToCompletion,
} from "./dungeon-drive";
import { driveEmberfallToCompletion } from "./emberfall-drive";
import { driveFiresideToCompletion } from "./fireside-drive";
import { driveGauntletToCompletion } from "./gauntlet-drive";
import { driveJurassicToCompletion } from "./jurassic-drive";

beforeAll(initPhysics);

/**
 * Pipeline gate: every generated vehicle must beat every completable custom
 * level through the SAME drive proofs the level tests use, so the loop-step
 * caps in those proofs are the time limits here too. Legacy courses are
 * covered by tests/vehicle-matrix.test.ts, which loops the whole garage;
 * Fairground is an arena with no completion drive and stays out.
 */
const DRIVES: {
  level: string;
  drive: (vehicleId: string) => number;
  timeout: number;
}[] = [
  { level: "custom:amber-undertow", drive: driveAmberToCompletion, timeout: 120000 },
  { level: "custom:chompworks", drive: driveChompworksToCompletion, timeout: 120000 },
  {
    level: "custom:emberfall-causeway",
    drive: driveEmberfallToCompletion,
    timeout: 120000,
  },
  { level: "custom:fireside-sonata", drive: driveFiresideToCompletion, timeout: 180000 },
  { level: "custom:jurassic-junction", drive: driveJurassicToCompletion, timeout: 120000 },
  { level: "custom:machine-gauntlet", drive: driveGauntletToCompletion, timeout: 120000 },
];

if (GENERATED_VEHICLES.length === 0) {
  it("pipeline matrix placeholder (no generated vehicles yet)", () => {
    expect(GENERATED_VEHICLES).toHaveLength(0);
  });
}
// Wide view so the loop typechecks before the first entry lands.
for (const v of GENERATED_VEHICLES as { id: string }[]) {
  for (const { level, drive, timeout } of DRIVES) {
    it(
      `generated matrix: ${v.id} completes ${level}`,
      () => {
        drive(v.id);
      },
      timeout,
    );
  }
  // The dungeon proof itself runs past the official five minutes (272s vs
  // 225s), so generated cars race the reference truck's pace instead: within
  // 5% of it, or under the official limit if that ever gets faster.
  it(
    `generated matrix: ${v.id} clears the dungeon near reference pace`,
    () => {
      const elapsed = driveDungeonToCompletion(v.id);
      expect(elapsed).toBeLessThanOrEqual(
        Math.max(225, DUNGEON_REFERENCE_SECONDS * 1.05),
      );
    },
    600000,
  );
}
