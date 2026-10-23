# Six-track release verification

This records the original six-track release. The subsequent hazard expansion and Inferno fixes have current screenshots, full-course timings and acceptance evidence in [hazard-qa/README.md](hazard-qa/README.md).

The Google Doc plan was created and read back before implementation. Each functional chunk has a recorded RED/GREEN cycle in [TDD_LOG.md](TDD_LOG.md) and its own Git commit.

## Completed tracks

| Track | Lane | Completion | Timer | Time remaining | Integrity | Medal |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Triple Loop | easy | 16.65s | Race | — | 85.8% | gold |
| Triple Loop | medium | 16.65s | Race | — | 85.8% | gold |
| Triple Loop | hard | 16.65s | Race | — | 85.8% | gold |
| Harbor Sprint | default | 29.96s | Race | — | 100.0% | gold |
| Foundry Run | default | 28.05s | Race | — | 100.0% | gold |
| Skyline Circuit | default | 34.14s | Race | — | 100.0% | gold |
| Scrapyard Sweep | default | 53.22s | 120s | 66.78s (55.7%) | 100.0% | gold |
| Inferno Vault | default | 40.40s | 150s | 109.60s (73.1%) | 90.9% | gold |

Each completion starts at the real spawn and drives with throttle, steering and brakes only. No completion run uses pose/velocity edits, granted pickups, altered gravity, damage bypasses or test-only objective geometry. Browser playback at 16x still executes the same 120 Hz physics ticks. The shipped tuning remains unchanged. Triple Loop retains the entire original three-lane arena; each lane must clear its jump, physically traverse its loop and reach the exit.

## Acceptance results

- 156 unit tests pass across 32 files.
- 69 unique browser cases pass across the recorded batches.
- Both arenas complete within 75% of the published deadline: Scrapyard Sweep <=90s of 120s; Inferno Vault <=112.5s of 150s.
- Every new race completes all ordered checkpoints; Skyline Circuit completes all sixteen sectors.
- Normal startup shows six unique locally shipped SVG previews and stays paused.
- UI-selected completion awards a medal, records personal bests and reloads them. Slower/failed runs cannot replace a best; Triple Loop lane records are isolated.
- Retry preserves tuning; returning to selection pauses the run. Narrow 390 px layout and blocked browser storage are covered.
- Production TypeScript/Vite build passes.

## Production smoke

The packaged build passes four live keyboard jump-clearance checks: easy at 1x, and all three Triple Loop lanes at 16x. It verifies six selection cards, tuning controls, absence of the development bridge and zero browser errors. This smoke check covers the packaged opening jump; full track completion is established by the eight browser playthroughs above. Evidence: `artifacts/production-report.json`.

## Regression batches and evidence

The initial full-suite diagnostic found legacy camera fixtures that selected a generic canvas (now ambiguous because of the color wheels) and a fixed trace that continued into the loop under the user's faster saved defaults. The fixtures now explicitly select the legacy arena, target the driving canvas and limit the straight-line trace to the jump/finish. Camera direction, zoom limits, motion thresholds and completion assertions remain intact. Normal startup is tested separately through the actual level-select screen.

A new keyboard regression first failed when Space was swallowed on the selection screen. The game now handles driving keys only during play, preserving native button activation; Space-start and arrow-key driving pass. Loop regression fixtures now read the saved boost default and its physical target speed rather than stale literals. All physical contact, loop apex, landing and integrity assertions remain.

Raw Playwright JSON reports: `artifacts/e2e-initial-diagnostics.json`, `artifacts/e2e-legacy-results.json`, `artifacts/e2e-ui-keyboard-results.json`, `artifacts/e2e-course-results.json`, `artifacts/e2e-final-loop-results.json`. Browser traces, per-track completion telemetry and screenshots are attached to the matching Playwright results. Tests are in `e2e/courses.spec.ts`, `e2e/official-triple.spec.ts` and `e2e/level-select.spec.ts`; their test drivers never mutate truck or run state. Thumbnail generation: `node scripts/generate-track-thumbnails.mjs`.
