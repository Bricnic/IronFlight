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
