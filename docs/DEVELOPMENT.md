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
