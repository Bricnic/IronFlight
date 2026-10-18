# Iron Flight

A single player Three.js monster truck stunt game. Choose one of three arena routes, accelerate up the ramp, clear the hazards and land across the finish. Visit the destruction lab to dent panels, detach each piece or sever the chassis.

[Development plan in Google Docs](https://docs.google.com/document/d/1E_5qXSCu0N-1NdFFvin0qWNOtgDhwoNtkgRmU2YiEZA) was authored before implementation. A repository copy is in [docs/PLAN.md](docs/PLAN.md); test evidence is in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Run

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. W or Up accelerates; A/D or Left/Right steers; S, Down or Space brakes; R rebuilds and restarts. Route buttons reset the truck onto the selected lane. Hold W and keep a straight line to clear each route. The playback selector offers 1x, 4x and 16x. The lab's selector targets one of 13 parts; its tools apply the same damage system as collisions and hazards.

## Verify

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

Unit and integration tests exercise real Rapier physics without rendering. Browser tests exercise the running game, keyboard input, route success and failure, all independent part detachments, actual mesh dents, asset loads and repeated rebuild cleanup. CI runs both suites.

For a packaged-game check, run `npm run build` and `npx vite preview --host 127.0.0.1 --port 4173` in one terminal, then `node scripts/smoke-production.mjs` in another. It verifies that the development bridge is absent and completes an easy jump at 1x plus all three routes at 16x using keyboard input and visible controls. Reports and screenshots go to `artifacts/`.

The development-only `window.__game` bridge supports stage selection, pause, frame stepping, inputs, telemetry, geometry signatures and render statistics. `advanceFrames(720, 1, {throttle: 1})` and `advanceFrames(45, 16, {throttle: 1})` each run 12 simulated seconds at the same 120 Hz physics timestep. These deterministic tests bypass wall-clock waiting, but use the same clock and physics as the game. Separate live playback tests drive complete jumps using keyboard input at real time and 16x. JSON results and telemetry attachments are saved in `artifacts/e2e-report.json`; screenshots and failure traces are in `test-results/`. The bridge is absent from production builds.

## Design

- `simulation.ts` owns dynamic bodies, suspension, collision geometry, hazards and finish detection. `routes.ts` supplies the shared render and collision definitions.
- `damage.ts` defines the named assembly: two chassis sections, four wheels, hood, roof, doors, bed and bumpers. Attached panels contribute colliders and mass. Destroying a part removes its collider and creates physical debris with inherited velocity. Wheels lose suspension and drive force; chassis severing releases the rear pieces and cuts propulsion.
- `truck.ts` deterministically builds the detailed hero truck. High polygon visual geometry stays separate from low cost colliders. Deformation is localized mesh displacement, not a soft body solver.
- `view.ts` renders PBR surfaces, lighting, chase camera, debris and effects. Poly Haven metal textures supply weathering and normals; lava uses a rock base with emissive fissures, and fire uses animated shader billboards with a rock roughness map as noise.

## Assets and limits

All material maps and fonts ship locally. `public/textures/manifest.json` records the four Poly Haven [CC0](https://polyhaven.com/license) sources, twelve original map URLs, sizes and SHA256 hashes. Run `node scripts/fetch-textures.mjs` to reproduce the cache. The hero truck has 103,884 triangles and 320 instanced tread blocks. Its geometry is authored procedurally and does not require paid asset or generation services.

This is a desktop keyboard prototype with one jump per route, bounded visual dents and rigid body breakage. It has no soft body simulation, multiplayer, audio or career progression. GPU performance needs measurement on target devices; software-rendered browser tests establish correctness rather than a 60 fps guarantee. Rapier's embedded WebAssembly makes the initial JavaScript bundle relatively large.
