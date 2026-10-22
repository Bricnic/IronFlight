# Six-track release TDD log

Plan created and verified in Google Docs before code changes:
https://docs.google.com/document/d/1oyz52eFcbRmh5SKPqrrowwraZRPU8f-e1iCF-pbw6ag

## Chunk 0 — Historical baseline (not new TDD)

Preserve the complete existing playtest implementation and user tuning as the Triple Loop foundation.
`npm run check`: 131/132 tests passed; the boost-sweep fixture omitted the user-selected 3.2x value. Including that value exposed its second implicit assumption: 1x boost was calibrated at gravity 1, while the user now stores 1.7. The fixture now includes the actual selected boost and explicitly calibrates its sweep at gravity 1, without changing source defaults.
`npx vitest run tests/loop.test.ts`: 7 passed. All other 125 tests passed in the baseline run. Production build checked before committing.

## Chunk 1 — Track catalog
RED: `npx vitest run tests/tracks.test.ts` failed: missing `src/tracks` module.
GREEN: the same command passes all 3 tests: six unique official tracks, two arena budgets with 25% headroom, and metadata validation.

## Chunk 2 — Objective state machine
RED: `npx vitest run tests/track-run.test.ts` failed because the run-state module did not exist.
GREEN: `npx vitest run tests/track-run.test.ts tests/tracks.test.ts` passes 8 tests. Covers swept gates, ordering, direction, height/width rejection, unique swept pickups, deadline success/failure, wreck failure, real stunt flags and inclusive medal boundaries. Completed/failed runs freeze.

## Chunk 3 — Persistent personal bests
RED: `npx vitest run tests/best-times.test.ts` failed: missing best-time adapter.
GREEN: the adapter and run tests pass (8 tests). Faster completed attempts replace records, slower/failed/invalid attempts do not; gold/silver/bronze are derived from thresholds, Triple Loop lanes are isolated, and corrupt or blocked storage remains playable.

## Chunk 4 — Official Triple Loop attempts
RED: `npx vitest run tests/official-triple.test.ts` failed in all three lanes because `startTrack` did not exist.
GREEN: the same three physics tests pass. The legacy jump-only finish cannot complete an official attempt; each lane must physically traverse the loop and reach its exit. The loop test driver now waits until the loop approach before applying loop steering, rather than steering toward the loop while still airborne over the opening jump.
`npx playwright test e2e/official-triple.spec.ts`: all 3 complete browser playthroughs pass (Ignition, The Gauntlet, Danger Zone), using ordinary throttle/steering and the shipped tuning. Tests assert loop apex, actual loop completion, upright exit, checkpoint completion and positive integrity.

## Chunk 5 — Harbor Sprint and shared course construction
RED: `npx vitest run tests/course.test.ts` failed: missing course-construction module.
GREEN: both course tests pass, including a full physical drive through all six gates with >80% integrity. `npx playwright test e2e/courses.spec.ts` passes its complete Harbor Sprint drive and checks rendered gate progression and shared course solids. Production build passes.
Shared physical/render geometry, cargo containers, collidable chicane barriers, destructible dock props and visible numbered checkpoint/finish gates are implemented. Legacy arena/loop geometry is hidden and excluded from new course physics. Test-driver snapshots omit verbose skid-point arrays; this changes no simulation behavior.

## Chunk 6 — Foundry Run
RED: `npx vitest run tests/foundry.test.ts` failed with “Course not implemented: foundry-run”.
GREEN: foundry and harbor physics tests pass (4 tests). Foundry completion includes an actual ramp launch above 3.1 m and positive integrity; supported hammer machinery and a six-second timed flame cycle have real colliders and matching visuals.
`npx playwright test e2e/courses.spec.ts --grep Foundry`: full browser drive passes. The browser test helper now returns its sampled peak height (its initial omission was caught by the new launch assertion).

## Chunk 7 — Skyline Circuit
RED: `npx vitest run tests/skyline.test.ts` failed on missing circuit construction; its premature start-line crossing check was already green through the shared gate state machine.
GREEN: both circuit tests pass. Includes sixteen ordered sectors, collidable perimeter rails and chicane blocks, with no immediate start-line shortcut. `npx playwright test e2e/courses.spec.ts --grep Skyline` passes the entire physical lap with >80% integrity and all visible gates cleared.
