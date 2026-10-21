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
