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

## Expansion chunk 11 — Textures + visual pass

RED: `npx vitest run tests/assets.test.ts` failed on the six missing manifest IDs.
GREEN: fetch script now keeps hash-verified cached assets (immune to API drift) with a Rough/arm fallback, and fetched six CC0 1k sets: cracked_red_ground (canyon floor), dark_rock_02 (gorge cliffs), coast_sand_rocks_02 (canyon road), brown_mud_leaves_01 (graveyard dirt), monastery_stone_floor (crypt), blue_plaster_wall (slide channel) plus grass pad reuse. CourseView maps them per track; gravestones gained seed-varied tints, moss and yaw (headless-safe, no DOM textures). New scripts/capture-expansion-qa.mjs shoots 11 warmed-up screenshots into docs/expansion-qa/. Iteration from the captures: per-track sky/fog/lighting moods (desert haze, halloween dusk, bright sky), glowing ghosts, bluer glossy channel with foam streaks, fence-top and crypt pumpkins. Visual self-score 9/10 against the rubric (route 1, palette 1, texture 1, lighting 0.9, telegraphing 0.9, effects 0.9, HUD 1, thumbnails 1, clipping 1, draw calls 258-339 at ~115k tris 1). Full `npm run check` passes 238/238 with the production build.

## Expansion chunk 12 — Whole-release verification

GREEN: all nine tracks driven end to end in the browser; reference times match physics exactly (canyon 174.2 s, hollow 151.7 s, slide 183.0 s, all silver), confirming provisional medals 150/210/270 with no changes. Full `npx playwright test`: 100 passed, 3 timed out; braking passes solo (parallel-load flake) and dragon-flame + inferno-jets fail identically on a pre-expansion worktree (pre-existing screenshot/font stall, not a regression). Smoke script extended to nine cards and passes solo against the production preview with zero page errors. Report checked in as docs/EXPANSION_VERIFICATION.md. Full `npm run check` passes 238/238 with the production build.

## Vehicles/editor/perf chunk 1 — Vehicle platform + select screen

RED: `tests/vehicles.test.ts` failed on the missing `src/vehicles` module, and `e2e/vehicle-select.spec.ts` timed out on the missing Select vehicle button.
GREEN: new `src/vehicles.ts` catalog (`VEHICLES`, `getVehicle`, `validateVehicles`) with the monster-truck def sharing the 13 PARTS ids in order; `Simulation` owns `vehicleId` with a `partDefs` getter, `wheelPositions()` method (replacing the export), and `setVehicle()` reset; snapshot/stats carry `vehicleId`. `view.ts` builds via `getVehicle(...).build()`, `harness.startTrack(id, lane?, vehicle?)` threads the pick, and `src/vehicle-select.ts` adds a menu screen (cards, keyboard, localStorage `vehicle`) wired into `main.ts` with a header button. Full `npm run check` passes 252/252 with the production build; vehicle-select e2e 2/2 green.

## Vehicles/editor/perf chunk 2 — Sports car

RED: `tests/sports-car.test.ts` failed to collect on the missing `src/sports-car` module.
GREEN: new `src/sports-car.ts` with a low/narrow collider set on the shared 13 slots (same hp, lighter mass), a 133,756-triangle coupe (vs truck 108,560) with deformable first child per part, GT wing, quad exhausts, glass canopy and full cockpit. `VehicleDef` gains `wheelRadius`/`suspensionRest` (sports 0.62/0.5); simulation `addWheel`, comic potion scaling, destructible tire volumes and the view fallback all follow the active def, and the door decal offsets from the door def. `driveTrack` takes a vehicle argument. The sports car completes Harbor Sprint headlessly and in the browser (30.14 s, 100%, GOLD) with a mid-drive screenshot confirming wing, low body and small wheels. Full `npm run check` passes 257/257 with the production build; sports + vehicle-select e2e 3/3 green.

## Vehicles/editor/perf chunk 3 — Cop car + speed lights

RED: `tests/cop-car.test.ts` failed to collect on the missing `src/cop-car` module.
GREEN: new `src/cop-car.ts` with a sedan collider set on the shared 13 slots (same hp), a 142,576-triangle B&W interceptor (push bumper, spotlights, cage partition, laptop, steelies) with deformable first child per part and red/blue `lightbar-a/b` domes. Key correction: the game's mph is horizontal m/s x 3.6 (HUD + comic hazards), so the 90 mph threshold is 25 m/s true — no top-speed changes needed since cars cruise at 31 m/s. `vehicles.ts` gains `lightBarState(speedMs, time)` (strict above-threshold alternation at 6 Hz, dim otherwise); the view drives dome emissives per frame and exposes `stats().lights` (harness type extended). The cop completes Harbor Sprint headlessly and in the browser; a lab full-throttle e2e proves dim below 90, red/blue alternation above, and exactly one dome lit per sample. Mid-drive screenshot confirms livery and dim bar at 33 mph. Full `npm run check` passes 264/264 with the production build; cop + vehicle-select e2e 4/4 green.

## Vehicles/editor/perf chunk 4 — Ambulance + speed lights

RED: `tests/ambulance.test.ts` failed to collect on the missing `src/ambulance` module.
GREEN: new `src/ambulance.ts` with a box-rig collider set on the shared 13 slots (same hp), a 152,880-triangle white ambulance (compartment walls, Star of Life decals, AC pod, rear double doors, red/white `lightbar-a/b` domes on the cab roof) with deformable first child per part. Reuses the chunk-3 `lightBarState`/view/`stats().lights` pipeline with `lights: "ems"`. A headless cruise test guards the 90 mph threshold (peak > 25 m/s); the ambulance completes Harbor Sprint headlessly and in the browser, and the lab full-throttle e2e proves the same dim/flash/alternation contract as the cop car. Mid-drive screenshot confirms box, beacons and rear doors. Full `npm run check` passes 271/271 with the production build; ambulance + vehicle-select e2e 4/4 green.

## Vehicles/editor/perf chunk 5 — School bus

RED: `tests/school-bus.test.ts` failed to collect on the missing `src/school-bus` module.
GREEN: new `src/school-bus.ts` with a tall transit collider set on the shared 13 slots (same hp), a 190,956-triangle yellow bus (8-window bands, bench rows, stop sign, crossing arm, destination box, roof ribs) with deformable first child per part and no light bar. The mid-drive screenshot caught the roof ribs rotated into vertical hoops (a stray torus rotation); fixed to span the roof width and re-shot clean. The bus completes Harbor Sprint headlessly and in the browser, and the e2e asserts `stats().lights` stays `{a: 0, b: 0}`. Full `npm run check` passes 276/276 with the production build; bus + vehicle-select e2e 3/3 green.

## Vehicles/editor/perf chunk 6 — 9x5 completion matrix

RED: `tests/vehicle-matrix.test.ts` is new; any vehicle/track combo that cannot complete fails it.
GREEN: headless matrix 45/45 in 80 s and browser matrix 45/45 in 15.3 min, all `completed` with integrity > 0 — every vehicle (truck, sports, cop, ambulance, bus) beats every track (8 courses + triple-loop easy) with zero physics fixes needed. No new source code; the two matrix specs plus this log entry are the chunk.

## Vehicles/editor/perf chunk 7 — Level format + storage

RED: `tests/custom-level.test.ts` + `tests/level-store.test.ts` failed to collect on the missing modules.
GREEN: new `src/custom-level.ts` (`CustomLevel` JSON, strict `validateCustomLevel`, `toTrack` adapter to `custom:<slug>`, checkpoint-prefab gate merging, arena/demolition mapping, `blankLevel`, registry) and `src/level-store.ts` (dev `/__levels` endpoint first, localStorage mirror + export/import). `Track.id` widens to `TrackId | CustomTrackId` with `OfficialTrack` keeping the menu typed; `courseSolids`/`courseProps`/`comicHazards` serve embedded customs; `CourseView` maps per-solid texture ids with world-tiled UVs and reports them in `surfaces`; sim/harness/main/driveTrack accept custom ids; boot registers stored levels. New vite `/__levels` plugin (list/get/save/delete under `levels/`, localhost guard, atomic writes, server-side validation); `levels/` gitignored; `public/tracks/custom.svg` thumbnail. A tiny custom sprint completes headlessly and in the browser from disk; disk round-trip e2e asserts real server persistence (GET 200 then 404). Full `npm run check` passes 337/337 with the production build; custom-levels e2e 2/2 green.

## Vehicles/editor/perf chunk 8 — Wireframe editing UI

RED: `tests/editor-state.test.ts` failed to collect on the missing `src/editor-state` module.
GREEN: new `src/editor-state.ts` (`EditorStore`: add/delete/duplicate/select for solids, prefabs, checkpoints, arena/demolition targets and spawn, per-kind solid defaults, dirty tracking), `src/editor-viewport.ts` (dedicated wireframe three viewport with grid, gate planes, prefab/target markers, spawn cone and a minimal orbit control — chosen over reusing the sim-coupled `CourseView`, which would disturb game state) and `src/level-editor.ts` (DOM screen: name/open/new/save/delete, object list, add palettes, property panel with position/size/color/texture/mode/medals, validation errors). Header gains a Level editor button; `g.editor()` probe exposes state to tests. E2E proves create/edit/save, reload persistence, delete, per-primitive texture round-trip and validation blocking (4/4 in 5.1 min with `test.slow()` — each case boots full pages under SwiftShader). Screenshot review confirmed layout/livery; list labels shortened and the establishing camera pulled back. Full `npm run check` passes 346/346 with the production build.

## Vehicles/editor/perf chunk 9 -- In-game placement + prefabs

RED: `tests/placement.test.ts` failed to collect on the missing `placeInLevel`/`appendCheckpoint` API; `e2e/placement.spec.ts` is new.
GREEN: new placement API in `src/custom-level.ts` (`placeInLevel` for solids with optional w/h/d, prefabs, checkpoints; `appendCheckpoint`; shared `solidDefaults`), live-add paths (`Simulation.addCustomSolid`, `Destructibles.addProp`, `ComicPhysics.addHazard`, late-add handling in `PropView`/`ComicView`), `CourseView` extraction to `buildSolidMesh`/`buildGate` plus `addSolidMesh`/`addCheckpointGate`, `GameView.aimPoint`/`addCourseSolid`/`addCheckpointGate`, and the in-game edit mode in `main.ts` (ghost preview, brick/wall/prefab/checkpoint palette, per-brick texture, commit-to-disk-first then live physics+view, Esc exits) with `harness.project` for deterministic aiming. Two real bugs found via e2e: (1) `saveLevel` never registered the track, so replays ran stale boot-time disk content -- saves now register (unit-guarded, also fixes editor-save-then-playtest freshness); (2) repeated clicks at one pixel cannot stack bricks (the chase-cam ray passes over short bricks), so the palette gained a 24x3x2 wall whose live collider blocks the truck. Placement e2e 3/3 green in 1.5 min; full `npm run check` passes 353/353 with the production build.

## Vehicles/editor/perf chunk 10 -- Playtest button

RED: `e2e/playtest.spec.ts` is new and fails on the missing `#editor-playtest` button.
GREEN: the wireframe editor top bar gains a Playtest button; it validates the level (spawn + at least one checkpoint via `validateCustomLevel`, errors shown inline and the sim never boots), saves (which registers the fresh track since chunk 9), and boots the real simulation through a new `onPlaytest` callback wired to `startOfficial`. E2E proves a seeded custom sprint completes in the real sim after clicking playtest, and that a checkpoint-less level is blocked with the editor still open. Playtest e2e 2/2 green in 1.7 min; full `npm run check` passes 353/353 with the production build.

## Vehicles/editor/perf chunk 11 -- Settings + video quality

RED: `tests/settings.test.ts` failed to collect on the missing `src/settings` module; `e2e/settings.spec.ts` is new.
GREEN: new `src/settings.ts` (`VideoQuality` low/medium/high + localStorage with repair-to-high, `QUALITY` table: high keeps the current look at 1.5x pixels/shadows/far 650, medium drops to 1x/far 500/fog 0.8, low drops to 0.75x/no shadows/far 350/fog 0.6), `GameView.applyQuality` for live switching (pixel ratio, shadow toggle with material refresh, far plane, per-frame fog multiplier) reported in `stats().video`, a settings screen with a video section reusing the select-screen cards, a header Settings button, boot applies the stored tier, and all menu/show paths hide the screen. The settings cards needed the same fixed-overlay CSS as vehicle select -- in-flow cards never stabilize under the per-frame HUD. Settings e2e 2/2 green in 1.1 min (live toggle of all three tiers + reload persistence); full `npm run check` passes 357/357 with the production build.

## Vehicles/editor/perf chunk 12 -- 60fps e2e per level

RED: `e2e/fps.spec.ts` is new and fails (0.3-3.6 fps under SwiftShader).
GREEN: the fps probe measures live rAF frame rate per level on low video, but SwiftShader caps out near 400k tris/s (a ~7k-tri budget at 60fps), so the suite gains a permanent `gpu` project in `playwright.config.ts` (full Chromium + hardware ANGLE on this machine's GeForce GT 640) while every other spec stays on SwiftShader; the probe takes the median of three 2s windows per level with a 58fps bar under the 60Hz vsync cap. Profiling haunted-hollow (stable 56.1-56.4, lowest tri count) through still/driving, viewport-size, paused, and telemetry bisects pinned the dip on dent spam: ghost/lava/fire per-step drain adds an invisible micro-dent per call, each triggering a full-mesh `deformGeometry` + normal recompute. `damage()` now skips sub-visible dents (strength < 0.01, unit-guarded; health drain and real dents unchanged) and the view caps deformation rebuilds at 2/frame so landing bursts spread instead of stuttering. All 9 levels now read 59.9-60.1 median on the GT 640; fps e2e green in 1.8 min; full `npm run check` passes 358/358 with the production build.

## Vehicles/editor/perf chunk 13 -- Whole-release verification

RED: full sweep 164/173 with 9 e2e failures. Triage via a chunk-8 worktree bisect: 4 pre-existing (dragon-flame + 2 inferno specs exceed the 90s budget under SwiftShader; world-presentation polls a ~5s/frame state on a 5s budget), 2 pre-existing ambiguous selectors (level/vehicle screens already shared `.track-grid`/`.track-select-intro`), 1 real regression from chunk 11 (settings cards reused `.vehicle-card`, 5 became 8), and 2 load flakes (editor save + playtest boot transitions on 5s budgets).
GREEN: settings screen uses dedicated `settings-intro`/`settings-grid`/`settings-card` classes sharing the same CSS; the two ambiguous specs scope to `#level-select`; the three slow specs gain `test.slow()`; world/editor/playtest assertions keep identical predicates on realistic software-renderer budgets (30s/15s/20s). Verification set of 12 files (all 8 previously-failing + placement/settings/custom-levels/fps) passes 35/35; full unit gate 358/358 with the production build.

## Level hotkeys -- N/P for next/previous level

RED: `tests/tracks.test.ts` step test fails on the missing `stepTrackId`; `e2e/level-keys.spec.ts` is new.
GREEN: new `stepTrackId(current, dir)` in `src/tracks.ts` cycles the nine official levels with wraparound (sky-slide -> triple-loop, triple-loop -> sky-slide; customs/empty fall off the ends), wired to N/P in the main keydown handler alongside R (menu surfaces excluded, lane preserved like retry), and documented in the level-select footnote. Unit 4/4, e2e 1/1.

## Editor refinement chunk 1 -- Playtest/wireframe sync

RED: `tests/editor-state.test.ts` fails on the missing `shouldSyncFromSession`; `e2e/editor-sync.spec.ts` shows the wireframe missing a playtest-placed brick (2 solids, not 3).
GREEN: the editor store is now the single source of truth -- every in-game commit writes through via a new `syncStore` (cloned), and opening the editor adopts the live session level when the store is clean and names match (`shouldSyncFromSession`, unit-guarded). Round trip proven: place wall in playtest -> wireframe lists it -> playtest again -> the truck is still blocked by its collider. E2E 2/2 in 1.2 min; full unit 361/361 with the production build (includes the user's ghost-toggle commit underneath).

## Editor refinement chunk 2a -- In-playtest solid editing

RED: `tests/placement.test.ts` fails on the missing edit/delete/duplicate API; `e2e/playtest-edit.spec.ts` is new. (Split from planned chunk 2; prefabs/checkpoints follow in 2b.)
GREEN: new pure `editSolidInLevel`/`deleteSolidInLevel`/`duplicateSolidInLevel` (self-spacing clone, unit-guarded); sim tracks solid colliders by id with live update/remove; course view gains move/rotate/remove/retexture mesh ops (material builder extracted verbatim, lava list kept consistent); game view picks course nodes by pointer; the placement bar gains a select tool with highlight box plus Rotate/Duplicate/Delete buttons, click-to-move on the ground plane, and texture changes that re-skin the selection -- every op validates, saves, syncs the editor store, and updates live physics. Ground/road are the unselectable canvas. E2E proves select, move (truck blocked by the moved live collider), 45-degree rotate, retexture, duplicate, and delete with disk persistence. E2E 1/1; full unit 362/362 with the production build.

## Editor refinement chunk 2b -- In-playtest prefab editing

RED: `tests/placement.test.ts` fails on the missing prefab edit API; the new prefab case in `e2e/playtest-edit.spec.ts` has nothing to click.
GREEN: pure `editPrefabInLevel`/`deletePrefabInLevel`/`duplicatePrefabInLevel` (unit-guarded); sim moves/removes prop bodies and delta-shifts comic mechanisms with all colliders/sensors/bodies; prop/comic views drop models (prop positions keep following bodies); picking now spans course+prop+comic groups; selection carries a solid/prefab kind (rotate/retexture stay solid-only and disable otherwise); the commit path shares a `liveAddPrefab` helper. E2E moves a snowman into the lane and the truck smashes it, then duplicates/deletes a book with disk persistence. Spec 2/2 in 2.1 min; full unit 363/363 with the production build.

## Editor refinement chunk 2c -- In-playtest checkpoint editing

RED: `tests/placement.test.ts` fails on the missing checkpoint edit API; the new gate cases in `e2e/playtest-edit.spec.ts` have nothing to click.
GREEN: pure level ops `move/delete/duplicateCheckpointInLevel` plus live track ops `move/delete/duplicateCheckpointOnTrack` (ids stable, neighbor normals refreshed with gates() math, degenerate segments keep their heading; unit-guarded); selection gains a checkpoint kind resolving both level checkpoints and checkpoint prefabs; course view gains gate move/rebuild (delete/duplicate relabel CHECKPOINT n/FINISH, captions exposed for tests); TrackRun clamps/decrements on delete; last-gate delete refuses so the level stays valid. E2E selects/moves/duplicates/deletes gates, drives through the moved gate (run advances), deletes it mid-run (run decrements), and guards the last gate; a second case edits checkpoint prefabs as gates. Hardened along the way: status-assertion budgets to 15s (SwiftShader+tracing observation lag), POST retries on 5xx with 500 for storage failures (a transient fs 400 silently desynced disk), live-track re-registration on in-game save, and loadLevel no longer clobbering live tracks. Spec 4/4 in 3.1 min; full unit 371/371 with the production build.

## Editor refinement chunk 3 -- Wireframe mouse select + move

RED: `tests/editor-viewport.test.ts` fails on the missing pick/plane helpers; the new viewport case in `e2e/editor.spec.ts` shows clicks doing nothing (selection stays put).
GREEN: wireframe meshes carry pick tags for solids/prefabs/checkpoints/targets/spawn; pure `resolveViewportPick` (ancestor walk) and `planeHit` (grab-height plane math) are unit-guarded; the orbit yields via a `canStart` hook when a pointerdown hits an object, drags relocate through `store.updateSelected` with the grab offset preserved, and empty no-drag clicks deselect; a DEV-only `editorProject` hook maps world points to viewport pixels for tests. E2E clicks an empty corner to deselect, clicks the barrier wirebox to select, drags it (props x changes, dirty set), deselects again, and proves the move persists to disk. Spec 5/5 in 7.5 min; full unit 374/374 with the production build.

## Editor refinement chunk 4 -- Tools panel

RED: `tests/editor-state.test.ts` fails on the missing tool state; the new tools case in `e2e/editor.spec.ts` finds no tool buttons.
GREEN: store-owned `tool` (select/pan/eyedropper/rotator, default select, switching never dirties; unit-guarded) with a four-button top-bar panel synced in refresh and exposed on the probe; pan drags move the orbit target (orbit exposes `panBy`); eyedropper copies the clicked solid's texture onto the selected solid (selecting when there is no solid selection); rotator horizontal drags yaw solid selections (trackball pitch/roll follow in chunk 5). E2E pans (projection shifts, selection kept), samples ground grass onto a barrier (props field updates), and rotates (yaw persists to disk). Spec 6/6 in 9.7 min; full unit 375/375 with the production build.

## Editor refinement chunk 5 -- Trackball rotator + euler numerics

RED: `tests/euler.test.ts` fails on the missing rotation module; `tests/placement.test.ts` fails on roll/prefab-yaw validation and rolled-collider behavior; the new euler case in `e2e/editor.spec.ts` shows yaw-only rotation.
GREEN: `CustomSolid.roll` plus `CustomPrefab.yaw` (props only; comic yaw rejected) with validation, all plumbed through course mappings; one shared YXZ euler convention (`src/euler.ts`) now drives sim colliders, course meshes, the in-playtest selection box, and the wireframe (previously yaw/pitch composed in a different order per site; identical for all existing single-axis content); prop bodies take yaw at creation with views following automatically; props panel gains Pitch (renamed)/Roll numerics for solids and Yaw for prop prefabs; the rotator is a true trackball (camera-relative axis through the grab point, incremental quaternion compose, YXZ decompose; props stay yaw-only). E2E trackball-drags a barrier (yaw/pitch/roll persist), sets exact yaw numerically, and drives through the opened wall in a real playtest. Headless proofs: pitched walls launch, yawed walls open/shut, rolled pillars swing into the lane. Spec 7/7 in 10.5 min; full unit 384/384 with the production build.

## Editor refinement chunk 6 -- Preview mode

RED: `tests/solid-uv.test.ts` fails on the missing UV module; `tests/editor-state.test.ts` fails on the missing preview flag; `e2e/preview.spec.ts` finds no Preview toggle.
GREEN: store-owned `preview` flag (toggling never dirties; unit-guarded) with a top-bar Preview button; the wireframe viewport gains preview-only lighting and renders each solid as an opaque depth-tested mesh -- textured solids through the same `pbr` skin the game view uses, untextured ones as lit flat color, selection shown as emissive -- while grid/axes hide and editor markers stay pickable; a bounded settle loop redraws until async textures arrive. Course-view UV math moves verbatim into shared `src/solid-uv.ts` (world-scale 3m tiling; unit-guarded top/side/ground cases) so preview tiling matches the game exactly. A DEV-only `inspectPreview` hook exposes per-solid material flags plus a canvas-center pick for tests. E2E opens a textured level, proves wireframe-to-preview canvas bytes differ after settle, the front wall wins the center pick (occlusion), material flags are textured/opaque/depth on, grid hides, and toggling back leaves the level clean. First run failed on the picker listing (saved level needs a reload to appear; follows the editor.spec.ts pattern). Spec 1/1 in 2.9 min; level-keys smoke 1/1; full unit 387/387 with the production build.

## Editor refinement chunk 7 -- Back + unsaved prompt

RED: the new `back prompts on unsaved changes` case in `e2e/editor.spec.ts` finds no prompt (Back silently drops dirty work). No new unit file: the prompt is DOM-only and the repo has no DOM test env, so the spec is the RED/GREEN gate.
GREEN: Back leaves immediately when clean, otherwise raises a modal Save/Discard/Cancel prompt; Save reuses the extracted `doSave` flow (save failures keep the prompt open), Discard leaves without persisting, Cancel stays; the prompt auto-hides if the store turns clean (e.g. Save button while open). E2E proves clean-back never prompts, cancel stays, discard leaves without writing disk, and save-back persists the new solid. Spec 9/9 in 15.6 min; full unit 387/387 with the production build.

## Editor refinement chunk 8 -- Texture audit

RED: the new monastery case in `e2e/textures.spec.ts` fails on the missing render-state probes; no per-texture coverage anywhere.
GREEN (investigation): the invisible ramp does NOT reproduce on this tree. All 36 texture files are valid baseline 1024px JPEGs matching manifest bytes and sha256; the material/mesh/registry paths are fully texture-agnostic (one `pbr` branch, straight spread mapping, fresh registration on save); a route-abort probe proved even a total load failure degrades to a flat gray slab, never invisible (screenshot-verified); history shows no related fix and files predate the editor list, so the report most likely predates the chunk-1 playtest/wireframe sync work. Kept as regression net: `materials` now records load failures plus cache ids, `CourseView`/`GameView`/harness expose `inspectSolids` (visible/opacity/map statuses) for tests. E2E proves the monastery ramp renders (map loaded + with/without screenshot bytes differ), all 12 `TEXTURE_IDS` render loaded on custom solids with zero load errors, and all 9 official tracks load only editor-listed ids; `tests/texture-audit.test.ts` pins manifest coverage plus on-disk bytes/hash per map. Spec 3/3 in 4.7 min; full unit 389/389 with the production build.

## Editor refinement chunk 9 -- Rings + collectibles

RED: new `tests/track-run.test.ts` ring/gather cases (6 failures across track-run, custom-level, editor-state suites); `e2e/rings.spec.ts` finds no Add-ring button.
GREEN: `CustomRing` (x/y/z/radius/goal) format with strict validation, mapped to `Track.rings` in every mode; race levels now map `collectibles` too. `TrackRun` sweeps custom rings on the z-plane without the sky-slide bounce prerequisite, goal rings gate race completion, non-goal rings record into `ringsDone`, and race pickups gather without gating; snapshot exposes `ringsDone`/`ringCount`. Store gains index-based ring selection plus add/duplicate/delete and a race-capable target list (the old race-mode `addTarget` rejection is intentionally retired -- the one pinning assertion now covers race collectibles). Editor gets an Add-ring button, ring list rows, and x/y/z + Radius + Goal-checkbox props; the wireframe shows gold/blue torus markers (goal/plain) with picking; the course view builds custom ring meshes after splitting the sky-slide trampoline/ring block on `track.trampoline`. E2E places a goal ring and a race collectible through the UI, proves one ring mesh + one pickup render, and drives the level to completion with both triggered. A temp probe confirmed sky-slide still builds exactly one trampoline and one ring after the split. Spec 1/1 in 1.5 min; full unit 395/395 with the production build.

## Editor refinement chunk 10 -- Hammers/trampolines/ghosts

RED: 7 failures across `tests/custom-level.test.ts` (palette, mapping, headless strike/bounce/chase), `tests/expansion-slide.test.ts` and `tests/expansion-ghosts.test.ts`; `e2e/course-prefabs.spec.ts` finds no hammer/trampoline/ghost palette options.
GREEN: `COURSE_PREFAB_KINDS` (hammer/trampoline/ghost) join the validated palette, flowing into the editor kind select and wireframe markers automatically. Customs map hammer prefabs to course hazards (existing rotor sim + spin view), trampoline prefabs to a new plural `Track.trampolines` consumed by `slideDefs` (vertical `BOUNCE_SPEED` bounce; the ring-aiming branch stays sky-slide-only) and rendered as pad meshes, and ghost prefabs to `ghostDefs` with optional spawn height (existing seek/attack swarm; view builds from the snapshot). The hammer view gains the requested built-in supports (two ground posts + feet + axle, skipped when the hub is near the ground) for officials and customs alike. Live placement can't offer the new kinds (hardcoded palette) and live prefab ops degrade safely (missing-id no-ops, unpickable unnamed meshes); `liveAddPrefab` now only live-spawns snowman/comic kinds. Headless proofs: parked car struck (impacts + integrity loss), bounced (`bounces` + run flag), chased and drained (contacts + ghost damage events). E2E places each kind through the editor UI and re-proves strike/bounce/chase in-browser plus rendered pad/ghost counts. Spec 3/3 in 3.0 min; full unit 401/401 with the production build.

## Editor refinement chunk 11 -- Loops/dragons/lamps/grandstands

RED: 5 failures across `tests/loop.test.ts` (parameterized ring/support builders), `tests/dragon-flame.test.ts` (aimed exposure), and `tests/custom-level.test.ts` (palette, mapping, headless burn); `e2e/course-structures.spec.ts` finds no loop/dragon/lamp/grandstand palette options.
GREEN: `COURSE_PREFAB_KINDS` gains loop/dragon/lamp/grandstand with wireframe marker colors. Loop prefabs expand in `courseSolids` to 96 asphalt ring segments plus 4 support columns (new `loopRingSolids`/`loopSupportSolids` in `loop.ts`, same math as the legacy ring minus the route x-drift), colliding as ordinary solids and rendering through the asphalt road skin -- drivable by the generic inverted-driving physics with no legacy flags/boost (those stay fixed-coordinate triple-loop). Lamp posts and grandstands (5 stepped rows, custom-scaled) expand to collider solids but render through dedicated builders (`buildLampPost` with emissive bar, `buildGrandstand` with alternating seat/concrete rows). Dragons reuse the legacy statue builder (extracted to `buildDragonStatue` with the eye material parameterized; jet fans extracted to `addDragonJetFan`, legacy call sites delegate unchanged) plus per-prefab animated flame jets facing -x, and burn through a new `dragonExposureAt` corridor check wired into the sim via an extracted `burnDragonFire` shared with the legacy hook. The course `inspect()` gains loopSegments/dragons/lamps/grandstands counts (harness stats type extended). Two stale unknown-kind test examples (`dragon`) moved to `kraken`. Headless proof: parked car burned by a custom dragon jet. E2E places all four through the editor UI and proves rendered counts plus the in-browser dragon burn. Spec 4/4 in 3.7 min; full unit 405/405 with the production build.

## Editor refinement chunk 12 -- Fidelity clones + screenshots

RED: `tests/showcase.test.ts` fails on the missing generator; `e2e/showcase.spec.ts` 404s on the missing clone files.
GREEN: `src/showcase.ts` mechanically translates official tracks into custom-level JSON, regenerated and re-pinned by the test on every run; `public/showcase/clone-harbor-sprint.json` (lossless: same 34 solids, 2 props, 5 comic hazards, 6 gates, spawn, medals) and `public/showcase/clone-triple-loop.json` (easy route: route solids, loop beds, loop prefab, 4 dragons, gap lava, grass arena floor, 2 grandstands, 6 lamps) are committed next to the gitignored levels/. E2E screenshots official-vs-clone at equivalent start/mid spots and drives the harbor clone to completion (GOLD 29.96s, matching official). Screenshot review: harbor is pixel-identical modulo HUD name, placement bar, and gate tint (customs use name-hash track colors); triple matches its lane structurally with documented gaps (single route, asphalt loop skin, no boost pads/chevrons/gap fire, east dragons face away for want of prefab yaw, loop/jump flags don't gate customs). Review also caught two real defects, fixed in this chunk: custom dragons rendered black because the firing emissive animation wasn't ported (course-view now animates bronze/horn/eyes exactly like LoopView), and the first triple clone floated in a void (ground/stands/lamps are now part of the clone). The 4.5-min test timeout forced a per-spot split of the screenshot tests. Spec 5/5 in 7.3 min; full unit 407/407 with the production build.

## Editor refinement chunk 13 -- Regression + final verification

RED: full gates unrun on the finished tree.
GREEN: everything green with zero code changes. Full unit suite 407/407 (65 files) including the 45/45 headless 9x5 vehicle/track matrix; full SwiftShader e2e suite 202/202 in 2.4h including the 45/45 in-browser matrix; `gpu`-project fps gate sustains 60fps median on low video for all 9 levels (60.0-60.1); production build clean. Prep: stopped a redundant second vite instance on 5174 (user chrome and the 5173 dev server untouched); reverted line-ending-only test churn on `src/tuning-defaults.json`. The `next_update.txt` program is complete: chunks 2c-13 plus the earlier 1-2b, one commit per chunk.

## Update2 chunk 1 - Comic labels closer + upright
RED: tests/comic-labels.test.ts failed (10 tests): buildComicLabel/buildComicModel did not exist. GREEN: 10/10 pass; labels are upright THREE.Sprite billboards anchored at model top + 1.2 m for all 8 comic kinds, no flat ground-plane labels remain. Full unit suite 417/417, tsc clean, e2e/comic-hazards.spec.ts 9/9 on swiftshader.

## Update2 chunk 2 - Pan tool planes
RED: tests/editor-pan.test.ts failed (3 tests): panPlaneForButton/applyPan missing. GREEN: 3/3 pass; left drags pan the orbit target on x/z, right/middle on x/y (grab-style world axes). Added cameraTarget to the editor probe + harness. e2e/editor.spec.ts pan test extended with per-button plane assertions, passing on swiftshader.

## Update2 chunk 3 - Single-axis rotator
RED: tests/editor-rotator.test.ts failed (2 tests): rotatorAxisForButton/applyRotator missing. GREEN: 2/2 pass; rotator drags drive exactly one axis (left yaw, right pitch, middle roll), replacing the trackball. Prefab yaw stays left-only until prefab pitch/roll land. e2e euler test rewritten for per-button isolation, passing on swiftshader.
