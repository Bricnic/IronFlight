# Development evidence

## Chunk 1 Foundation

Plan authored and read back in Google Docs before implementation. Source conversation read through the desktop chat reader. No project AGENTS.md found. Remote initially contained only main; master created at the same initial commit.

Red: `npm test -- tests/clock.test.ts` failed because the fixed clock module did not exist. Green: same command after implementation. Full gate: `npm run check`.

Simulation is 120 Hz. Playback supports 1x through 32x without increasing integration timestep.

## Chunk 2 Driving
Red: driving.test.ts failed on missing simulation, then exposed suspension oscillation. Increased compression and relaxation damping. Green: 6 tests, typecheck and build passed. Driving uses Rapier raycast suspension and a dynamic rigid body; tests cover rest, throttle, brake, steering and deterministic replay.
