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

Open http://127.0.0.1:5173. W or Up accelerates; A/D or Left/Right steers relative to the driver's view. Hold S or Down to brake, then reverse once slowed; Space brakes without selecting reverse. R rebuilds, restarts and recenters the camera, restoring its default zoom. Click and drag inside the canvas to orbit the truck; scroll the mouse wheel up to zoom in and down to zoom out. Zoom is bounded between 6 and 45 meters and preserves your orbit angle. Route selection occupies the header outside the playable canvas. Hold W and keep a straight line to clear each route. Crossing the finish leaves the player in control rather than automatically applying full brakes. The playback selector offers 1x, 4x and 16x. The lab's selector targets one of 13 parts; its tools apply the same damage system as collisions and hazards.

Press the backtick key (`) for **Playtest tuning**. Requested defaults are acceleration **4.5x**, top speed **1.3x**, boost power **1.0x**, and coasting friction **8.5x**. The latest handling defaults are tire steering rate **1.9x**, maximum tire angle **25°**, shadow darkness **8.3x**, hammer spin **4.1x**, and dragon damage **3.0x**. Brake power, steering slew rate, dragon damage, hammer spin, handbrake multiplier, and shadow darkness have 1x–10x sliders. Maximum tire steering angle ranges from **5° to 90°**. Gravity ranges from **0.1x to 10x**, with a 1x default, and changes the physics world immediately. The handbrake defaults to 1.5x regular braking. Changes apply live and persist in this browser. **Store as Defaults** writes all current settings into `src/tuning-defaults.json` through the local development server; this file is the source config used by future builds and fresh browser sessions. **Reset tuning** reloads that same config. Source saving is available in `npm run dev`; the button is disabled in static production builds. The tuning storage uses v3 so older saved defaults do not override this iteration.

W/S and Up/Down blend braking into opposite-direction acceleration over the last 20 displayed speed units before stopping. Space applies the stronger handbrake. The HUD says MPH and retains the previous numerical values, as requested. The boost pad keeps its ground chevrons; its overhead boost banner has been removed. The pad still targets three times nominal top speed, with the requested 1x default power; the physics sweep is saved to `artifacts/boost-sweep.json`.

Heavy steering under power leaves permanent rubber ribbons until the arena is restarted. Real grounded tire slip determines the paths; alpha blending feathers the tread edges and the first/last 1.1 meters of each continuous stroke. `e2e/burnout.spec.ts` drives a semicircle and saves `artifacts/burnout-semicircle.png` for visual inspection.

Dragon bodies ease from stock black to a 50% red tint during the second before firing, stay red for the three-second firing window, then ease back to black over one second. Dragon jets grow from each mouth to the road center over 200 ms, ramping opacity through 25%, 50%, 75%, and 100%. At shutoff the trailing edge travels away from the mouth over 250 ms, leaving the oldest flames near the center to fade last. Damage and red/green signals follow the moving flame packet; full-strength dragon damage scales per physics tick. Landing on the roof destroys it and removes 70% total integrity; side landings destroy the corresponding door and remove 25%, with side wheels detaching at downward impact speeds above 7 and 11 m/s. Other body-first landings also cause significant damage. Detection requires an actual solid-surface contact, avoiding penalties while inverted in flight or attached to the loop.

Flames from the bars and dragons permanently darken the truck according to the integrity actually lost to fire, including its trim, glass, lights, and detached pieces. Smoke appears during exposure. Once direct fire damage exceeds 50% of original integrity, a one-shot smolder continues after leaving the flames: 5 percentage points per simulated second for five seconds, capped at 25 additional points. Smoke then stops; soot remains until rebuilding. Collision damage does not count toward ignition. Smolder damage also contributes to blackening, and a fully burned wreck is black.

The windshield is transparent, with two seats and a steering wheel on the driver's left. The consistent local convention is **+Z forward, +X driver left**, matching A/Left steering. The custom lava texture is copied from the supplied JFIF into `public/textures/custom-lava.jfif`, tiles in world-sized patches, drifts diagonally, and uses localized animated UV distortion for heat shimmer.

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

All material maps and fonts ship locally. `public/textures/manifest.json` records the four Poly Haven [CC0](https://polyhaven.com/license) sources, twelve original map URLs, sizes and SHA256 hashes. Run `node scripts/fetch-textures.mjs` to reproduce the cache. The hero truck has over 100,000 triangles and 320 instanced tread blocks. Its geometry is authored procedurally and does not require paid asset or generation services.

This is a desktop keyboard prototype with one jump and a post-finish loop per route, bounded visual dents and rigid body breakage. It has no soft body simulation, multiplayer, audio or career progression. GPU performance needs measurement on target devices; software-rendered browser tests establish correctness rather than a 60 fps guarantee. Rapier's embedded WebAssembly makes the initial JavaScript bundle relatively large.

Camera regression evidence includes projected coordinates of actual lamp-post landmarks across every route and a live normal-speed keyboard run. The tests reject backward parallax steps above 0.004 NDC and save the complete traces. Additional browser cases cover driving off the road onto grass, approaching grandstand steps, solid damaging lava, A/D direction, gentle braking and reverse, finish stability, mouse orbit, readable finish signs, and navigation outside the canvas at desktop and narrow widths.

Loop browser tests drive from the original starting line through the jump, boost, loop apex, upright landing and exit on every route at both 1x and 16x. Their driver issues only throttle and steering at each fixed physics tick. The development harness's `driveFrames` uses the same clock as normal playback, allowing precise test-driver input at increased speed. Dragon exposure, safe intervals, visible jets, slider ranges and persistence also have dedicated tests.


## Arena props and foundations

The runup beside each route has a breakable road sign, trash can, and oil barrel. The lab has the same three objects ahead and to the driver's left. Signs snap off their concrete sockets and fly with impact momentum. Trash cans topple, eject their lids, and scatter twelve physical pieces of litter. Barrels topple on ordinary impacts; impacts at **90+ displayed MPH** ignite them for six seconds. Standing within 3.6 meters of a burning barrel takes light fire damage, **1% of original integrity per second**. All props and debris rebuild with R or route/lab selection.

The lava has a thick fill in stone basins with grounded floors and perimeter walls. Its texture offset advances diagonally every simulation frame, while a shader adds localized heat distortion to the actual diffuse and emissive samples. Fire gantries and spike platforms have matching rendered and collidable supports down to the basin foundation. The truck's contact shadow now searches grass as well as road surfaces.

Grounded tire angles drive chassis yaw and lateral grip as well as the wheel meshes. `tests/arena-updates.test.ts` measures the resulting trajectories; its sweep writes `artifacts/steering-sweep.json`. `e2e/arena-updates.spec.ts` verifies source-config saving/reset, gravity, grass shadows, actual lava pixel changes, and physical impacts with all three props. It restores the original source config after testing Store as Defaults.
