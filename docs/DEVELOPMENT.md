# Development evidence

## Chunk 1 Foundation

Plan authored and read back in Google Docs before implementation. Source conversation read through the desktop chat reader. No project AGENTS.md found. Remote initially contained only main; master created at the same initial commit.

Red: `npm test -- tests/clock.test.ts` failed because the fixed clock module did not exist. Green: same command after implementation. Full gate: `npm run check`.

Simulation is 120 Hz. Playback supports 1x through 32x without increasing integration timestep.

## Chunk 2 Driving
Red: driving.test.ts failed on missing simulation, then exposed suspension oscillation. Increased compression and relaxation damping. Green: 6 tests, typecheck and build passed. Driving uses Rapier raycast suspension and a dynamic rigid body; tests cover rest, throttle, brake, steering and deterministic replay.

## Chunk 3 Routes and jump feasibility
Red: route tests failed before route data and finish telemetry existed. Green: all 11 tests and build passed. All three routes are driven from rest using throttle only, cross a physical gap, make wheel contact on the far platform, and reach their finish. Low throttle and misaligned steering do not finish. Rendering will use the same solid definitions as collision geometry.

## Chunk 4 Physical destruction
Red: damage tests failed before part model existed. Green: 29 tests and build passed. Tests destroy all 13 named parts on fresh vehicles, verify dynamic debris and reset, wheel force removal, rear assembly cascade, inherited velocity, and local mesh deformation. Corrected test expectation for rear assembly to five pieces (rear chassis, two wheels, bed and bumper). Panels use compound colliders while attached and independent bodies when detached. Normal collision velocity changes trigger the same damage path.

## Chunk 5 Destruction lab tools
Red: lab tests failed before tools module. Green: 31 tests and build passed. Dent, destroy, sever and reset tools use the production damage path. Unknown targets rejected; unrelated panels remain intact.

## Chunk 6 First playable and browser harness
Red: browser tests failed waiting for absent bridge. First live keyboard run additionally caught a negative initial requestAnimationFrame delta; elapsed time is now clamped to zero at startup. Playback dropdown releases focus for driving input. Green: 31 unit/integration tests, build and 10 browser tests passed. Includes six route playthroughs (1x and 16x), negative jumps, all 13 physical and rendered detachments through lab UI, keyboard driving/restart and live 16x playback. Browser screenshots and telemetry are written under test-results. Harness is dev-only.

## Chunk 7 Hazards
Red: hazard tests failed before hazard definitions. Green: 38 unit/integration tests, build and 10 browser tests passed with all hazards enabled. Fire has timed exposure and stops damaging after escape. Rotating hammer collision shapes are kinematic Rapier bodies; spikes have cone colliders. Lava damages all structural parts. Hazards use bounded cooldowns and the shared damage path; high speed impact state stays finite.

## Chunk 8 Hero art and local materials
Red: asset tests failed before truck builder; browser art tests failed before render statistics bridge. Green: 40 unit/integration tests, strict typecheck, production build and all 13 browser tests passed (4.5 minutes with software WebGL). Hero truck meets 60k to 125k triangle budget and has 320 instanced tread blocks. Twelve 1K PBR maps from four Poly Haven assets are cached with hashes; fonts are local. Fire uses animated billboards and rock-map noise; lava uses emissive fissures over rock. Visual review corrected dark metallic paint using environment lighting. Browser tests verify real dents, texture loading and eight rebuilds without renderer memory growth. All three final-art routes finish at 1x and 16x, and all 13 lab pieces detach.

## Chunk 9 Release hardening

Red: new behavioral regressions exposed reversed steering, brake force being restored on a detached wheel, excessive cumulative dents, and the initial lab selector not matching its tool target. A separate lab visibility test failed before course geometry was isolated from the lab. These issues are fixed. Added exact full-outcome comparison between 1x and 16x clocks, and a complete real-time keyboard playthrough.

The packaged-game smoke test caught a hard-route failure after changing routes at 16x that the immediate-launch tests missed. A new launch-delay matrix reproduced failures after 0.25, 0.5, 4 and 8 simulated seconds of waiting. Suspension raycasts were treating rotating hammers as driveable ground, imparting sideways impulses to tires. Excluding kinematic machinery from suspension queries fixes the entire eight-delay matrix. Hammer rigid-body collisions and hazard damage remain active. No position, velocity or trajectory correction was added.

Green: all 52 unit/integration tests, strict typecheck, production build and all 16 browser tests passed after the final physics fix. The browser suite took five minutes using software WebGL, with zero skipped, flaky or unexpected results. Captured and inspected the final hero truck and isolated lab screenshots. Hero geometry is 103,884 triangles. Source and tests are formatted with pinned Prettier. Third-party runtime and font licenses ship with the build. GPU frame-rate targets still need measurement on target hardware; this release uses bounded visual dents and rigid-body breakage.

The packaged-game smoke test then passed all four scenarios through visible controls and keyboard input: easy at 1x, and easy, medium and hard at 16x. It verified that the development bridge is absent and reported zero page or renderer errors. Reproduce with the preview server and `node scripts/smoke-production.mjs`; results and screenshots are in `artifacts/production-report.json` and `artifacts/production-*.png`.

## Review fix 1 Solid arena
Red: grass and lava support tests failed with the truck falling through; grandstand contact telemetry was absent. Shared arena dimensions now drive both render meshes and fixed Rapier colliders. Off-road driving no longer triggers a lane-boundary wreck. Green: 55 unit/integration tests, build and a browser scenario driving off the road, into grandstand steps and onto damaging solid lava passed.

## Review fix 2 Driving and finish stability
Corrected steering against the actual driver's rear-view screen axes, replacing the incorrect world-X assumption in the earlier regression. S brakes forward travel and then selects reverse; Space only brakes. Brake impulse reduced from 220 to 30 per wheel. Removed the forced full brake at finish. Green: 61 unit/integration tests and build; three browser scenarios use actual keyboard events for A/D and brake-to-reverse, and verify upright travel through all finish lines.

## Review fix 3 Camera tracking
Added fixed-step pose interpolation, a rear-centered camera with a shared position/aim anchor, time-based height and heading smoothing, and pointer-drag orbit with pitch limits. Red: camera unit tests failed before the rig existed. Green: 63 unit tests, build and three browser camera tests passed. Browser evidence records projected positions of real lamp-post landmarks for all three accelerate-jump-finish cycles and a live normal-speed keyboard run; reversals are bounded below 0.004 NDC (about 2 pixels on the test viewport). Mouse dragging is tested with actual pointer events.

## Review fix 4 Clear driving view and readable signs

Moved route selection into a header outside the canvas and reserved space for driving controls below it. Lab tools appear only in the lab. Replaced mirrored sign backs with independently oriented front and back faces. Red: layout tests measured 23,101 square pixels of navigation overlap with the canvas; sign orientation diagnostics were absent. Green: browser checks confirm zero overlap at 1280 and 800 pixel widths and readable approach-facing signs on all three routes. Inspected the layout and Ignition screenshots.

Final combined validation: all 63 unit/integration tests, strict typecheck, production build and all 25 browser tests passed, with zero skipped, flaky or unexpected results. Camera landmark traces measured zero backward steps on all three routes and the live keyboard playthrough. The packaged build passed easy at 1x and all three routes at 16x with 100% vehicle integrity, no page errors, and no development harness exposed.

## Playtest chunk 1 Live driving tuning
Red: four physics tests failed before tuning and steering slew existed; the browser test failed before the debug menu existed. Green: 67 unit/physics tests, strict typecheck/build, and four browser cases passed. Backtick toggles five live sliders with 1–10x ranges and 0.1x steps; browser-local values survive reload and restart. Coasting resistance increases without changing airborne drag; steering approaches and recenters at a bounded adjustable rate. Extra acceleration acts through the center of mass to avoid immediate torque-induced wheelies at high settings.

## Playtest chunk 2 Spiked hammers
Red: the speed/spike test failed at the original rotation rate; adding spikes exposed two launch-delay regressions. Moved the wider hammer assemblies outward to preserve a centered safe flight line. Green: all 16 targeted hammer, hazard and launch-delay tests passed; the combined 73-test suite and build also passed. Both cone tips have matching rendered meshes and physical colliders; hammer rotation is multiplied by 1.5.

## Playtest chunk 3 Physical loop, boost and dragon timing
Red: new loop tests failed before the course module existed. The first 1x power trial stalled below the apex; stronger boost then exposed suspension force limits. Added firmer loop suspension and separated the exit laterally from the entrance. A later negative test caught boosting airborne vehicles; the pad now requires at least two contacting tires. Green: 75 unit/integration tests and strict build passed. Swept 1, 1.5, 2, 2.5, 3 and 4x pad power using throttle/steering only; 3x reaches 74.95 m/s, keeps four tires in contact at the apex and completes with full integrity. Default power is 3x. Timed jets remove approximately 50% integrity after 1.5 seconds and deal no damage during their safe window. Dragon statues and support columns have solid physical cores. See docs/BOOST_TUNING.md for measurements.

## Playtest chunk 4 Dragon scenery and complete browser playthroughs

Added bronze dragon statues, animated horizontal fire jets, red/green timing signals, a marked boost pad, textured loop tracks and rails, extended solid grass, approach signs, and HUD fire countdowns and loop-completion feedback. The loop track meshes merge shared segment geometry to reduce draw calls. Reviewed dragon-fire, upright-exit and production tuning-menu screenshots.

The development-only driver harness supplies throttle and steering on each fixed physics tick while retaining the normal playback clock. Browser tests drive from the original starting line through the jump, boost, inverted apex, upright landing and exit road on all three routes at 1x and 16x. They measure peak speed and height, apex tire contacts, integrity, exit position and orientation. Additional browser checks cover visible fire cycling and actual 50% damage, plus live tuning ranges, persistence and gradual tire movement.

Final gate: 75 unit/integration tests, strict typecheck, production build and all 33 browser tests passed. The browser run took 11.5 minutes with software WebGL and had zero skipped, flaky or unexpected results. All six complete loop playthroughs passed. The packaged-build smoke test verified the tuning drawer and absence of the development harness, then completed easy at 1x and all three routes at 16x with 100% integrity and zero page or renderer errors. Reports remain reproducible under artifacts/ and test-results/.

## Playtest chunk 5 Hammer impact damage and launch momentum

Red: three new tests failed before explicit impact telemetry and launching behavior existed. A near-miss test also reproduced damage from the old broad hammer volume. Hammer strikes now read actual Rapier contact manifolds against attached vehicle colliders, including contact orientation and point. Each strike amplifies rotor tangential motion with a bounded upward impulse applied at the contact point before part destruction, preserving inherited momentum and spin in detached pieces. Damage affects the struck part and up to two nearby pieces, scales with impact speed, and can break panels, wheels or chassis sections. Contact-episode tracking plus a cooldown prevents repeated artificial launches while overlapping the same hammer.

Green: all 78 unit/integration tests, strict typecheck and production build passed. Three new browser cases verify substantial damage, rendered detachments and airborne motion at 1x and 16x, plus an intact near miss. The measured impact removed 24.3% integrity, detached a door and the bed, and produced 44.6 m/s upward speed at both playback rates. Reviewed the airborne-truck screenshot. Six additional browser playthroughs confirm every jump, loop and upright exit remains feasible at 1x and 16x. All nine targeted browser checks passed. Impact telemetry and screenshots are preserved under test-results/; the impact-only JSON report is artifacts/hammer-e2e-report.json, and the route-regression report is artifacts/e2e-report.json.

## Playtest chunk 6 Mouse-wheel camera zoom

Red: the new camera unit test failed before zoom existed; the browser case failed because wheel input had no camera-distance effect. Added proportional wheel zoom from 6 to 45 meters, normalizing pixel, line and page wheel units. The listener is restricted to the game canvas and prevents page scrolling there. Orbit angles remain unchanged, paused games still redraw the zoom, and restart restores the default 15.04-meter distance. Added the control hint and README instructions.

Green: all 79 unit/integration tests, strict typecheck and production build passed. All four camera browser cases passed: actual wheel zoom in/out, limits, UI isolation, cancellation and restart; existing pointer orbit; lamp-post motion across all three jump/finish cycles; and the live keyboard-driven camera regression. The final wheel case also passed after adding explicit waits for the rendered camera position. Camera regression results are preserved in artifacts/camera-regressions.json.
