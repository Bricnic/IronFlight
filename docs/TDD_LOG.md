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

## Chunk 8 — Scrapyard Sweep
RED: both scrapyard tests failed because the course was not implemented. The first physical implementation then timed out at 11/12 pickups: a scrap stack obstructed the final approach.
GREEN: move the obstructing stack to a reachable side zone, keeping the same 3.5 m pickup radius, damage, physics and 120-second timer. Both physics tests pass. `npx playwright test e2e/courses.spec.ts --grep Scrapyard` collects all twelve unique tokens within 90 simulation seconds with >50% integrity and verifies visible pickups disappear. Course pickup labels face the chase camera; gate labels face their valid approach direction.

## Chunk 9 — Inferno Vault
RED: both inferno tests failed because the course was not implemented.
GREEN: physical construction includes two enclosed lava vaults, supported timed flame gantries, rotating machinery and ten reachable cores. No core is placed in lava. Both physics tests pass. `npx playwright test e2e/courses.spec.ts --grep Inferno` completes all ten cores in <=112.5 simulation seconds with >40% integrity and no visible pickups remaining. The same drifting lava material and viscosity implementation are used as Triple Loop.

## Chunk 10 — Level select, results and thumbnails
RED: `npx playwright test e2e/level-select.spec.ts --grep "normal startup"` failed because no level-select heading or cards existed.
GREEN: all 4 level-select browser tests pass: six illustrated cards, paused normal startup, starting/restarting with tuning retained, real full-course completion from a UI selection, result medal/personal best, persisted best on reload, and a 390 px layout with blocked storage. Production build passes; all 156 unit tests passed after UI integration.
The restart test caught unpausing an explicitly paused test session; retry now preserves pause state. Thumbnails are unique generated SVG route/arena diagrams from the actual track catalog and shared course geometry (`node scripts/generate-track-thumbnails.mjs`). The initial screen, objective HUD, countdown, retry, menu, result and medal flows use the same simulation as the development bridge. No test-only completion hooks were added.

## Chunk 11 — Complete release verification and regressions
RED: the initial full browser diagnostic exposed legacy fixtures selecting generic canvases (ambiguous after color wheels) and a straight-camera trace continuing into the loop at the saved faster defaults. Explicit legacy stage selection, viewport targeting and a jump/finish-length trace preserve the original strict motion assertions. The focused 19-case legacy batch passes.
RED: the new Space-start browser regression could not start a run because driving input handling swallowed native button activation. Restrict driving keys to the play surface. GREEN: Space-start/arrow driving and failed-timer/no-medal cases both pass.
RED: legacy loop assertions expected boost power 1 and a speed below 65 despite the user-saved 3.2 boost and a 97.5 physical target. Read the source defaults and derive the physical speed bound; keep all contact, apex, landing and integrity checks. GREEN: all 13 final loop/official/tuning/color cases pass.
RED: the production smoke fixture hard-coded boost 3 instead of the saved 3.2. GREEN: source-config-driven tuning checks, six production selection cards, absent development bridge and four real keyboard jump-clearance runs pass with zero browser errors.
Final acceptance: 156 unit tests across 32 files pass; production TypeScript/Vite build passes; 69 unique browser cases pass across chronological verification batches. The reproducible summary script rejects missing cases or any unresolved failures and verifies all eight physical track/lane completions. Scrapyard Sweep completes in 53.22/120 seconds; Inferno Vault in 40.40/150 seconds. Every full-course driver uses ordinary throttle, steering and braking only. Detailed telemetry is summarized in TRACK_VERIFICATION.md; the original Google Doc has the measured results appended.

## Comic hazards and presentation — October 22, 2026

The six-track release was first merged with origin/main and pushed at 803f910. The following changes were developed in separately committed chunks.

- Textures (dc4227a): five browser cases confirm loaded concrete floors and the same asphalt maps as Triple Loop. Expanded the manifest hash/license test to require the two newly cached concrete variants, retaining all map integrity checks. World-scale UVs preserve detail; PROJECT_MEMORY.md records Poly Haven asset conventions.
- Result reveal (8ade224): missing-module RED followed by passing boundary tests for a two-second hold and three-second fade. Browser tests verify opacity progression, frozen result time, moving debris and real RAF world ticks after failure.
- Comic hazards (5b44ba1): catalog tests initially failed on a missing module. Added 25 placements from eight dense procedural families. Full normal-control runs initially hit crushers; obstacle-aware steering now proves real bypass routes. Warning posts initially obstructed detours and were replaced by ground plaques. A slow-water case initially coasted out; sinking drag now arrests it. A fire jump initially clipped flames; the launch ramp now begins earlier and clears the entire burning section without fire contact. Nitro is measured at over 1.6 times the normal attained speed in its five-second window. Scaled wheel radii and suspension geometry match the visual body scaling.
- Initial jaw pose: an explicit regression observed collider quaternion x=0 while the visible open book required sin(1.12/2). Initial kinematic rotation now matches the rendered jaw. The truck remains alive beneath an open book, then is destroyed by actual closing contact. Book and contact-triggered flipper browser tests pass with the corrected pose.

## Inferno follow-ups — October 22, 2026

RED: a parked truck under the real Inferno jet stopped at 0.7924528301886793 integrity. Only the hood, roof and doors received damage. Flame ticks now damage the surviving whole assembly as well as exposed panels; the test reaches exactly zero and accounts for all integrity loss through fire/smolder, with no hammer or lava damage.

RED: the flame-envelope function was absent, smoke stopped immediately after leaving a jet, and Inferno lava remained one metre above ground. GREEN: shared 500ms grow/shrink envelopes drive actual flame mesh height, shader alpha and damage; smoke fades over three seconds without extending the capped afterburn damage; both lava pools have real ground apertures, stone-lined shafts and lava surfaces 4.2m below ground. Tests prove free fall before contact and subsequent lava sinking. Telemetry labels and values use exactly 14pt, with larger panels and a narrow-screen layout.

All 185 unit tests across 37 files pass. The production build passes. Six Inferno/fire browser cases and a four-case crusher/pit follow-up pass; all original 31 hazard-release acceptance cases are resolved passing across the verification batches. Final screenshots, geometry counts and the subjective visual review are maintained in docs/hazard-qa/.
