# Iron Flight

A single player Three.js monster truck stunt game. Choose one of three arena routes, accelerate up the ramp, clear the hazards and land across the finish. Visit the destruction lab to dent panels, detach each piece or sever the chassis.

Keep driving past the finish for a boosted dragon pass and a full vertical loop. Dragon statues fire for three seconds, then rest for five; their eyes and the approach signal show red while firing and green while clear. The HUD counts down each window. Staying in the jets for 1.5 seconds removes about half the truck's integrity. Follow the loop's sideways curve onto its separate exit road.

[Development plan in Google Docs](https://docs.google.com/document/d/1E_5qXSCu0N-1NdFFvin0qWNOtgDhwoNtkgRmU2YiEZA) was authored before implementation. A repository copy is in [docs/PLAN.md](docs/PLAN.md); test evidence is in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Run

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. W or Up accelerates; A/D or Left/Right steers relative to the driver's view. Hold S or Down to brake, then reverse once slowed; Space brakes without selecting reverse. R rebuilds, restarts and recenters the camera. Click and drag inside the canvas to orbit the truck. Route selection occupies the header outside the playable canvas. Hold W and keep a straight line to clear each route. Crossing the finish leaves the player in control rather than automatically applying full brakes. The playback selector offers 1x, 4x and 16x. The lab's selector targets one of 13 parts; its tools apply the same damage system as collisions and hazards.

Press the backtick key (\`) to open or close **Playtest tuning**. Acceleration, top speed, boost power, coasting friction and tire steering rate all have 1.0x–10.0x sliders in 0.1x steps. Changes apply immediately and survive restarts and browser reloads on this origin. **Reset tuning** restores the tested defaults. The car now slows more quickly when coasting and the front tires gradually turn and recenter. Spiked hammers rotate at 1.5 times their previous speed.

The boost pad targets three times the selected nominal top speed. Its **3.0x power default** was selected through a physics sweep; power changes acceleration toward that target. At default tuning it reaches approximately 75 m/s and keeps all four tires contacting the loop at the apex. See [boost measurements](docs/BOOST_TUNING.md). Other slider combinations are available for experimentation; loop feasibility is tested at the defaults.

Hammer impacts use actual collision contacts. A heavy hit damages the struck part and nearby pieces, then throws the truck into the air with an impulse based on the rotor's tangential motion. The impulse is applied before breakage so detached panels and wheels inherit the launch and spin. One strike is registered per contact episode, and near misses cause no hammer damage. Browser tests verify launches and visible detachments at both 1x and 16x.

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
- `arena.ts` supplies shared geometry for collidable grass, grandstand steps, lamp posts and damaging solid lava. Off-roading is allowed. `camera.ts` follows interpolated vehicle poses with a rear-centered view and pointer orbit; its position and aim share one anchor to avoid background jolts.
- `loop.ts` supplies the shared loop, approach, exit and statue collision geometry, along with deterministic dragon timing. `loop-view.ts` builds the textured loop and dragon statues. `tuning.ts` validates live settings; `debug-menu.ts` provides the saved playtest sliders.
- `damage.ts` defines the named assembly: two chassis sections, four wheels, hood, roof, doors, bed and bumpers. Attached panels contribute colliders and mass. Destroying a part removes its collider and creates physical debris with inherited velocity. Wheels lose suspension and drive force; chassis severing releases the rear pieces and cuts propulsion.
- `truck.ts` deterministically builds the detailed hero truck. High polygon visual geometry stays separate from low cost colliders. Deformation is localized mesh displacement, not a soft body solver.
- `view.ts` renders PBR surfaces, lighting, chase camera, debris and effects. Poly Haven metal textures supply weathering and normals; lava uses a rock base with emissive fissures, and fire uses animated shader billboards with a rock roughness map as noise.

## Assets and limits

All material maps and fonts ship locally. `public/textures/manifest.json` records the four Poly Haven [CC0](https://polyhaven.com/license) sources, twelve original map URLs, sizes and SHA256 hashes. Run `node scripts/fetch-textures.mjs` to reproduce the cache. The hero truck has 103,884 triangles and 320 instanced tread blocks. Its geometry is authored procedurally and does not require paid asset or generation services.

This is a desktop keyboard prototype with one jump and a post-finish loop per route, bounded visual dents and rigid body breakage. It has no soft body simulation, multiplayer, audio or career progression. GPU performance needs measurement on target devices; software-rendered browser tests establish correctness rather than a 60 fps guarantee. Rapier's embedded WebAssembly makes the initial JavaScript bundle relatively large.

Camera regression evidence includes projected coordinates of actual lamp-post landmarks across every route and a live normal-speed keyboard run. The tests reject backward parallax steps above 0.004 NDC and save the complete traces. Additional browser cases cover driving off the road onto grass, approaching grandstand steps, solid damaging lava, A/D direction, gentle braking and reverse, finish stability, mouse orbit, readable finish signs, and navigation outside the canvas at desktop and narrow widths.

Loop browser tests drive from the original starting line through the jump, boost, loop apex, upright landing and exit on every route at both 1x and 16x. Their driver issues only throttle and steering at each fixed physics tick. The development harness's `driveFrames` uses the same clock as normal playback, allowing precise test-driver input at increased speed. Dragon exposure, safe intervals, visible jets, slider ranges and persistence also have dedicated tests.
