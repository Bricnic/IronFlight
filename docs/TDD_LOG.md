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

## Final geometry and visual acceptance

RED: basin geometry assertions found ground intersecting stone wall footprints and duplicated water end-cap top planes (only seven unique planes for nine colliders). GREEN: cut the outer rim footprint from the ground and remove redundant shallow end caps. Unit checks and the water/skim/pit browser batch pass.

RED: the burning-ramp browser pose check found rendered world Z=12 versus physical Z=7. GREEN: a shared ramp/support definition supplies both renderer and physics, with support heights derived from the slope. Added solid drum cylinders matching the visible drums. The browser test now checks actual position/angle, a clean jump and destructive fire exposure; all pass. The affected 25-test unit batch and production build pass after these changes.

Final unretouched captures cover all eight families, plus closed-book, active-hydrant and Inferno-pit views. The subjective five-category review is in hazard-qa/README.md. Capture console/page errors: zero. The chronological browser verifier resolves 36 unique passing cases and five complete normal-input course runs. Packaged smoke passes six-card selection, tuning and four keyboard jump runs with no browser errors. Source tuning defaults are preserved.

## Restart from game over

RED: pressing R after a physical book wreck left the run failed. The key handler returned for every non-play surface before checking restart. GREEN: process R on play/results before the driving-input guard, retaining menu button activation and editable-field handling. Browser regressions cover the invisible initial hold and fully revealed results with a focused menu button; both confirm the same track restarts at zero elapsed time, full integrity, a hidden results panel and working arrow acceleration. Repeated keydown events do not repeatedly rebuild. Production build passes.

# Three-track expansion TDD log

Plan: docs/EXPANSION_RELEASE_PLAN.md (Canyon Plunge, Haunted Hollow, Sky Slide).

## Expansion chunk 0 -- Baseline (not new TDD)

Environment provisioned: git 2.56.0 and Node.js 24.22.1 installed; repo-local commit identity matches existing history.
`npm run check`: 185/185 unit tests pass across 37 files; production build passes. No code changes; the expansion plan is checked in as the chunk 0 snapshot.

## Expansion chunk 1 — Track catalog

RED: `npx vitest run tests/expansion-tracks.test.ts` failed 4/4 on unknown track IDs and missing thumbnails.
GREEN: catalog gains canyon-plunge (race), haunted-hollow (demolition) and sky-slide (strafe race), each with limit 300, feasibility 225 and provisional 150/210/270 medals; validation covers demolition targets, strafe rings and race headroom. The thumbnail script was broken on main under plain node (extensionless ESM imports); its import closure now uses explicit .ts extensions and all nine SVGs regenerate with no churn to the original six. Comic-hazard coverage is pinned to its original five tracks while the physics completion loop keys off courseAvailable, so it auto-expands as courses land. Full `npm run check` passes and `e2e/level-select.spec.ts` passes 6/6 with nine cards. Selecting an expansion track throws "Course not implemented" until its course chunk; demolition HUD/labels land with chunk 10.

## Expansion chunk 2 — Run objectives

RED: `npx vitest run tests/expansion-run.test.ts` failed 3/4: demolition runs completed instantly through the zero-checkpoint race branch, and ring/bounce ordering was unenforced (the timeout/wreck contract test was already green).
GREEN: TrackRun gains a demolition branch over reported destroyed IDs (duplicates ignored, empty target lists never auto-complete), latched bounce plus swept ring proximity that only counts after the bounce, and ring-gated race completion. Snapshot adds destroyed/demolishCount/bounced/ringDone for the later HUD chunk. Full `npm run check` passes 193/193 with the production build.

## Expansion chunk 3 — Ghosts

RED: `npx vitest run tests/expansion-ghosts.test.ts` failed to collect: missing ghosts module and mesh builders.
GREEN: new GhostSwarm mirrors the ComicPhysics before/after pattern — four seek-steered ghosts at 13 m/s (below the 32.5 m/s stock top speed, so a moving truck escapes), 4 m overlap radius, 5%/s proportional drain that wrecks a parked truck in 20 s with ghost damage events. Simulation constructs the swarm, steps update/attack around world.step and exposes it in snapshots. Mechanics run against a real lab-stage sim driving the shipped methods in shipped order; translucent sheet-phantom meshes are built headless with geometry stats. CourseView.update wiring and browser proof follow with the hollow course in chunk 8. Full `npm run check` passes 199/199 with the production build.

## Expansion chunk 4 — Swinging axes

RED: `npx vitest run tests/expansion-axes.test.ts` failed to collect: missing axes module, sim wiring and mesh builders.
GREEN: new AxeArray hangs six phased pendulums (amplitude 1.0 rad, 5 s period, distinct phases) with kinematic handle/blade colliders; strikes reuse hammerStrike with the live swing velocity so launch direction follows the swing, gated by a one-strike-per-contact-episode rule plus 0.45 s cooldown. The first strike test teleported inside the blade and penetration resolution bled the launch; encounters now park beside the blade so the swing sweeps in, mirroring the hammer tests. Axes live in their own module rather than a hazards.ts kind, matching the GhostSwarm/ComicPhysics split; CourseView.update wiring and crossing proof follow with the canyon course in chunk 7. Full `npm run check` passes 206/206 with the production build.

## Expansion chunk 5 — Gravestones

RED: `npx vitest run tests/expansion-gravestones.test.ts` failed 6/6 on the missing kind, props and meshes.
GREEN: new gravestone prop kind breaks above 2.5 m/s closing speed with rubble debris, reports each stone id exactly once through takeDestroyed, and hollow courseProps mirror the catalog demolition targets. Three fixes along the way: the drain call moved out of the optional trackRun chain (arguments never evaluated without a run), the stone cap became a real hemisphere for honest triangle density, and the PropView update test moved to chunk 8 browser coverage because fire-material texture loading needs DOM. Full `npm run check` passes 211/211 with the production build.

## Expansion chunk 6 — Slide systems

RED: `npx vitest run tests/expansion-slide.test.ts` failed to collect: missing slide module, sim wiring and mesh builders.
GREEN: new SlideSystems owns flow boxes (8 m/s push with drag capped at 16 m/s, rolling resistance skipped while flowing), strafe mode (lateral impulse, slippery tires, heading-hold autopilot tracking flow direction or spawn yaw), and trampoline sensors (30 m/s safe bounce with 1 s cooldown, latched bounced flag for the run). Fixes along the way: a missing private constructor modifier, bounce resolution moved after impact detection so launches never count as collisions, and heading hold replacing damping alone against drift yaw. Full `npm run check` passes 220/220 with the production build. CourseView slide/trampoline/ring integration and full-run proof follow with the slide course in chunk 9.

## Expansion chunk 7 — Canyon Plunge

RED: `npx vitest run tests/expansion-canyon.test.ts` failed 3/3 with the course unimplemented.
GREEN: 945 m elevated ramp (80 m drop) with rails and piers, kicker lip, 21 m gorge with cliff faces and floor, runout upslope with taper, and six axe gantries whose z positions match the axe defs by test. CourseView renders axe rotors from sim state with an inspect count wired through harness stats. A drive trace showed the reference line eating axe-1 and wedging on the runout end face, so the runout tapers down, gantry posts moved outside the rails, and both test drivers hold an x=+10.5 line within 120 m of an axe once past the lip gate (blade tip reach 7.75 m). Full physics and browser drives complete inside [120, 225] s with positive integrity; shortfall into the gorge wrecks. Full `npm run check` passes 224/224 with the production build and the canyon e2e passes with screenshots.

## Expansion chunk 8 — Haunted Hollow

RED: `npx vitest run tests/expansion-hollow.test.ts` failed with the course unimplemented, then the full tour wrecked: 13 m/s ghosts pinned the demolition-crawl driver and fence corners wedged it.
GREEN: fenced arena with corner crypt and dead trees, twelve gravestones on a spiral demolition tour with 15 m fence margins, ghost phantom rendering wired through CourseView with a harness ghost count, and both test drivers seeking catalog demolition targets. Balance tuning along the way: three ghosts at 12 m/s (outrun at cruise, parity in corners, punishment on reversals) with 3%/s drain, and the demolition crawl removed so the reference line holds 15 m/s. Parked-under-ghosts still wrecks (chunk-3 test extended to a 40 s kill window). The reference tour completes in 151.7 s at integrity 0.50 — ghosts cost half the truck, tense but fair. Full `npm run check` passes 228/228 with the production build and the hollow e2e passes with screenshots.

## Expansion chunk 9 — Sky Slide

RED: `npx vitest run tests/expansion-sky.test.ts` failed 4/4 on the missing course.
GREEN: 2.4 km water channel from 100 m down to a 2 m exit (one pitched ramp per path segment from the shared `slideProfileY`, corners gentle at 8.5 degrees so flow carries the truck through), finish pad only with no ground under the slide so edge falls reach the wreck plane, sky piers, start gantry and finish posts. The slide tip high-centered the truck on the first full run, so a taper ramp glides the channel into the pad (canyon-taper precedent). Both test drivers gained a pure-pursuit strafe branch: lateral centering at zero throttle on the slide, coast/brake/creep phases on the runout to park on the trampoline for a near-vertical bounce through the ring. CourseView renders the trampoline and golden ring from the builders, tints the channel blue, and elevates gate banners to their logical heights (legacy gates unchanged at y=0); ring tracks label their last gate CHECKPOINT instead of FINISH. The reference run completes in 183.0 s at integrity 1.0; edge falls wreck and too-hot arrivals bounce past the ring. Full `npm run check` passes 233/233 with the production build and all three expansion e2e runs pass with screenshots.

## Expansion chunk 10 — Menu, HUD, results

RED: `npx vitest run tests/expansion-ui.test.ts` failed to collect on the missing copy module, and the menu e2e failed on "Six places".
GREEN: new pure `src/run-copy.ts` owns mode labels (DEMOLITION, SLIDE RUN, per-arena collection), per-mode objective/progress/timeout copy, and a NaN-proof progress fraction; menu shows "Nine places" and results blame timeouts on the right route. HUD wires the copy live: graveyard counts "n / 12 smashed" with a ghost warning, the slide coaches strafe with bounce-then-ring progress, and the footer STEER hint flips to STRAFE on the slide (keys already mapped through the shared steer channel). The narrow e2e caught footer overflow at 390 px, fixed by wrapping the footer and lifting the status/telemetry stack. Full `npm run check` passes 238/238 with the production build; UI e2e 5/5 and menu e2e 6/6 pass with screenshots.
