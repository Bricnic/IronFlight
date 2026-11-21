# Iron Flight

A single-player Three.js/Rapier monster-truck game. Start at level select, choose a checkpoint race or timed collection arena, and earn bronze, silver or gold from your best completed time. Personal bests persist in this browser.

**Triple Loop** preserves the original three-lane arena: Ignition, The Gauntlet and Danger Zone. A timed attempt clears a lane's jump, survives its dragon pass, physically completes its loop and crosses the exit. **Foundry Run** and **Skyline Circuit** add checkpoint racing; **Scrapyard Sweep** gives 120 seconds for twelve salvage tokens, and **Inferno Vault** gives 150 seconds for ten cores. The destruction lab remains available from the menu.

The [six-track release plan](docs/TRACK_RELEASE_PLAN.md) mirrors the Google Doc written before this expansion. [TDD log](docs/TDD_LOG.md) records each test-first commit; [release verification](docs/TRACK_VERIFICATION.md) records full-course times and arena timer headroom.

[Development plan in Google Docs](https://docs.google.com/document/d/1E_5qXSCu0N-1NdFFvin0qWNOtgDhwoNtkgRmU2YiEZA) was authored before implementation. A repository copy is in [docs/PLAN.md](docs/PLAN.md); test evidence is in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Run

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
```

On Windows, double-click `start.cmd` to install missing dependencies, start the server, and open the game.

Open http://127.0.0.1:5173 and choose a track. The level-select screen pauses the simulation. Use arrow keys to choose a track and Space to start. L returns to level select. W/Up accelerates; A/D or Left/Right steers; S/Down brakes then reverses; Space is the handbrake. R restarts the selected attempt and recenters the camera. Drag to orbit and scroll to zoom between 6 and 45 meters. Triple Loop's lane buttons restart that lane. Official finishes and timeouts show a result panel with Retry and Level select. The playback selector offers 1x, 4x and 16x, using the same fixed physics timestep. The lab's thirteen-part selector applies the same damage system as collisions and hazards.

Level select opens on seven collections (Sweet Celebrations, Winter Wonderland, Spooky Places, Toybox Adventures, Stunt Parks, Industrial Mayhem, Outdoor Adventures), each with full artwork and compact gold-medal and gold-star totals. Open a collection to see its tracks in unlock order. Each collection starts with its first two tracks unlocked; every gold medal earned in that collection unlocks one more track. Locked tracks show darkened with a lock icon, and newly earned tracks burst open with a gold lock animation the first time they are viewed. Earning the gold that unlocks a track shows a celebration message with confetti naming the new track.

N and P cycle through unlocked official levels in collection order (Sweet Celebrations through Outdoor Adventures, unlock order within each), skipping locked tracks. After completing a level, choose **Next level** to continue to the next unlocked level. The paths listed in `levels/official/order.json` (for example, `/official/stunt-parks/Fairground.json`, relative to `levels/`) are added after Sky Slide in the order shown there. Each entry can also set a thumbnail and description for the level card. Official level files live in collection subfolders under `levels/official/`.

The level editor's Open level menu includes level files in `levels/` and its subfolders at any depth, grouped by folder. Saving keeps the original file location even if the level's name changes; the Folder field saves to (or moves to) a subdirectory under `levels/`, creating it as needed. New and imported levels default to `levels/` (or the current Folder value). Environment templates and other JSON metadata are excluded from the menu.

Shift/Ctrl-click list rows or viewport objects to select several. **Group** creates a named, collapsible group; **Ungroup** separates it again. Selecting any group member selects the whole group for movement, rotation, duplication and deletion. Locking a member locks the group. Group names can be edited in the properties panel and are saved with the level. **Ctrl+C / Ctrl+V** copy and paste selected items or groups, including between levels, with independent IDs and group names. Text fields keep normal copy/paste. The vehicle-select C shortcut is inactive in the editor.

**Clip** supports every solid kind, including tiles, yawed solids and convex polygon footprints. Preview and collision geometry retain the actual outline of each piece. Pitched or rolled solids must still be made horizontal before clipping. Amber Undertow's tile sections and North Pole Summit's ice patches are organized into groups.

Press backtick (`) for **Playtest tuning**. The current defaults live in `src/tuning-defaults.json`; Store as Defaults saves all current settings there in the local development server, and Reset tuning reloads that config. Tuning and colors also persist in this browser. Source saving is disabled in production builds.

Steering rate, maximum tire angle (5–90 degrees) and actual turning power (0.1–10x) are independent. Gravity spans 0.1–10x. Primary and secondary color wheels recolor the paint and metal trim/rims, with brightness and hex entry; burn darkening remains applied. Acceleration, top speed, boost, coasting friction, brake power, dragon damage, hammer speed, handbrake strength and shadow darkness are also tunable.

Canyon Plunge has a separate **Canyon Plunge top speed** slider (1–10x), multiplied by the global top-speed setting. Its starting ramp extends thirty meters behind the truck, with ten hydrants staggered across the descent. Triple Loop's loop surfaces use translucent plastic so the truck remains visible.

Sky Slide's **Sky Slide water speed** slider sets a minimum flow speed from 100–1,000 displayed MPH (1–10x), defaulting to 250 MPH (2.5x). Twenty snowmen occupy every fifth segment of the channel. Impacts scatter snow and detach a random part, nudging the truck toward the edge. A/D strafe on the water; normal steering resumes on solid ground. The trampoline launches forward through an upright golden ring, including at maximum water speed.

Haunted Hollow's ghosts accelerate from about 22 MPH to 50 MPH as the twelve gravestones are destroyed. Each 20 percentage points of actual ghost damage tears off another random part. Press G to toggle ghosts. In Inferno Vault, the camera pans above the stage to watch the truck sink into lava.

W/S and Up/Down blend braking into opposite-direction acceleration over the last 20 displayed speed units before stopping. Space applies the stronger handbrake. The HUD says MPH and retains the previous numerical values, as requested. The boost pad keeps its ground chevrons; its overhead boost banner has been removed. The pad still targets three times nominal top speed, with power controlled by the saved tuning; the physics sweep is saved to `artifacts/boost-sweep.json`.

Heavy steering under power leaves permanent rubber ribbons until the arena is restarted. Real grounded tire slip determines the paths; alpha blending feathers the tread edges and the first/last 1.1 meters of each continuous stroke. `e2e/burnout.spec.ts` drives a semicircle and saves `artifacts/burnout-semicircle.png` for visual inspection.

Dragon bodies ease from stock black to a 50% red tint during the second before firing, stay red for the three-second firing window, then ease back to black over one second. Dragon jets grow from each mouth to the road center over 200 ms, ramping opacity through 25%, 50%, 75%, and 100%. At shutoff the trailing edge travels away from the mouth over 250 ms, leaving the oldest flames near the center to fade last. Damage and red/green signals follow the moving flame packet; full-strength dragon damage scales per physics tick. Landing on the roof destroys it and removes 70% total integrity; side landings destroy the corresponding door and remove 25%, with side wheels detaching at downward impact speeds above 7 and 11 m/s. Other body-first landings also cause significant damage. Detection requires an actual solid-surface contact, avoiding penalties while inverted in flight or attached to the loop.

Flames from the bars and dragons permanently darken the truck according to the integrity actually lost to fire, including its trim, glass, lights, and detached pieces. Smoke appears during exposure. Once direct fire damage exceeds 50% of original integrity, a one-shot smolder continues after leaving the flames: 5 percentage points per simulated second for five seconds, capped at 25 additional points. Smoke fades over three seconds after exposure or smolder ends, without extending damage; soot remains until rebuilding. Collision damage does not count toward ignition. Smolder damage also contributes to blackening, and a fully burned wreck is black.

The windshield is transparent, with two seats and a steering wheel on the driver's left. The consistent local convention is **+Z forward, +X driver left**, matching A/Left steering. The custom lava texture is copied from the supplied JFIF into `public/textures/custom-lava.jfif`, tiles in world-sized patches, drifts diagonally, and uses localized animated UV distortion for heat shimmer.

Hammer impacts use actual collision contacts. A heavy hit damages the struck part and nearby pieces, then throws the truck into the air with an impulse based on the rotor's tangential motion. The impulse is applied before breakage so detached panels and wheels inherit the launch and spin. One strike is registered per contact episode, and near misses cause no hammer damage. Browser tests verify launches and visible detachments at both 1x and 16x.

## Verify

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

Unit and integration tests exercise real Rapier physics without rendering. Browser tests exercise the running game, keyboard input, route success and failure, all independent part detachments, actual mesh dents, asset loads and repeated rebuild cleanup. CI runs both suites.

For a packaged-game check, run `npm run build` and `npx vite preview --host 127.0.0.1 --port 4173` in one terminal, then `node scripts/smoke-production.mjs` in another. It verifies the production level-select screen, absence of the development bridge, tuning controls and real keyboard jump clearance at 1x and 16x on the preserved Triple Loop lanes. Reports and screenshots go to `artifacts/`.

The development-only `window.__game` bridge supports stage selection, pause, frame stepping, inputs, telemetry, geometry signatures and render statistics. `advanceFrames(720, 1, {throttle: 1})` and `advanceFrames(45, 16, {throttle: 1})` each run 12 simulated seconds at the same 120 Hz physics timestep. These deterministic tests bypass wall-clock waiting, but use the same clock and physics as the game. Separate live playback tests drive complete jumps using keyboard input at real time and 16x. JSON results and telemetry attachments are saved in `artifacts/e2e-report.json`; screenshots and failure traces are in `test-results/`. The bridge is absent from production builds.

## Design

- `tracks.ts` defines six tracks; `track-run.ts` validates swept checkpoints, unique pickups, timers and medals. `best-times.ts` isolates persisted records; `level-select.ts` provides selection and results. `course.ts` supplies shared new-track physics/render geometry; `course-view.ts` renders its gates, pickups and machinery.
- `simulation.ts` owns dynamic bodies, suspension, collision geometry, hazards and finish detection. `routes.ts` supplies the shared render and collision definitions.
- `arena.ts` supplies shared geometry for collidable grass, grandstand steps, lamp posts and damaging solid lava. Off-roading is allowed. `camera.ts` follows interpolated vehicle poses with a rear-centered view and pointer orbit; its position and aim share one anchor to avoid background jolts.
- `loop.ts` supplies the shared loop, approach, exit and statue collision geometry, along with deterministic dragon timing. `loop-view.ts` builds the textured loop and dragon statues. `tuning.ts` validates live settings; `debug-menu.ts` provides the saved playtest sliders.
- `damage.ts` defines the named assembly: two chassis sections, four wheels, hood, roof, doors, bed and bumpers. Attached panels contribute colliders and mass. Destroying a part removes its collider and creates physical debris with inherited velocity. Wheels lose suspension and drive force; chassis severing releases the rear pieces and cuts propulsion.
- `truck.ts` deterministically builds the detailed hero truck. High polygon visual geometry stays separate from low cost colliders. Deformation is localized mesh displacement, not a soft body solver.
- `view.ts` renders PBR surfaces, lighting, chase camera, debris and effects. Poly Haven metal textures supply weathering and normals; lava uses a rock base with emissive fissures, and fire uses animated shader billboards with a rock roughness map as noise.

## Assets and limits

To make a vehicle concept from an in-game screenshot, set `GEMINI_API_KEY` in your terminal from a billing-enabled Gemini API project. The Node script sends the screenshot and vehicle brief to Nano Banana 2 and saves a 1K JPEG. [Gemini image generation guide](https://ai.google.dev/gemini-api/docs/image-generation)

```sh
node scripts/generate-vehicle-concept.mjs public/vehicles/monster-truck.png artifacts/stunt-motorcycle.jpg "An off-road stunt motorcycle with two oversized block-tread tires, an orange tank, a black crash cage, and exposed suspension"
```

All material maps and fonts ship locally. `public/textures/manifest.json` records the six Poly Haven [CC0](https://polyhaven.com/license) sources, eighteen original map URLs, sizes and SHA256 hashes. Run `node scripts/fetch-textures.mjs` to reproduce the cache. The hero truck has over 100,000 triangles and 320 instanced tread blocks. Its geometry is authored procedurally and does not require paid asset or generation services.

This is a desktop keyboard prototype with six tracks, local medals, bounded visual dents and rigid-body breakage. It has no soft-body simulation, multiplayer or audio. GPU performance needs measurement on target devices; software-rendered browser tests establish correctness rather than a 60 fps guarantee. Rapier's embedded WebAssembly makes the initial JavaScript bundle relatively large.

Camera regression evidence includes projected coordinates of actual lamp-post landmarks across every route and a live normal-speed keyboard run. The tests reject backward parallax steps above 0.004 NDC and save the complete traces. Additional browser cases cover driving off the road onto grass, approaching grandstand steps, solid damaging lava, A/D direction, gentle braking and reverse, finish stability, mouse orbit, readable finish signs, and navigation outside the canvas at desktop and narrow widths.

Loop browser tests drive from the original starting line through the jump, boost, loop apex, upright landing and exit on every route at both 1x and 16x. Their driver issues only throttle and steering at each fixed physics tick. The development harness's `driveFrames` uses the same clock as normal playback, allowing precise test-driver input at increased speed. Dragon exposure, safe intervals, visible jets, slider ranges and persistence also have dedicated tests.


## Arena props and foundations

The runup beside each route has a breakable road sign, trash can, and oil barrel. The lab has the same three objects ahead and to the driver's left. Signs snap off their concrete sockets and fly with impact momentum. Trash cans topple, eject their lids, and scatter twelve physical pieces of litter. Barrels topple on ordinary impacts; impacts at **90+ displayed MPH** ignite them for six seconds. Standing within 3.6 meters of a burning barrel takes light fire damage, **1% of original integrity per second**. All props and debris rebuild with R or route/lab selection.

The lava has a thick fill in stone basins with grounded floors and perimeter walls. Its texture offset advances diagonally every simulation frame, while a shader adds localized heat distortion to the actual diffuse and emissive samples. Fire gantries and spike platforms have matching rendered and collidable supports down to the basin foundation. The truck's contact shadow now searches grass as well as road surfaces.

Grounded tire angles drive chassis yaw and lateral grip as well as the wheel meshes. `tests/arena-updates.test.ts` measures the resulting trajectories; its sweep writes `artifacts/steering-sweep.json`. `e2e/arena-updates.spec.ts` verifies source-config saving/reset, gravity, grass shadows, actual lava pixel changes, and physical impacts with all three props. It restores the original source config after testing Store as Defaults.


## Comic hazard update

Failed attempts keep the world, fire and debris active. Results remain invisible for two simulation seconds, then fade in over three seconds. The run result and medal decision remain frozen while destruction continues.

The five newer tracks have 25 additional hazards: cursed books, giant jaws, fatal-error laptops, contact-triggered colour flippers, pressure hydrants, burning jump sections, boosted water troughs and potion stands. Each crusher uses moving solid jaw/tooth colliders with a visible opening/warning cycle; detours remain available. Hydrants launch the truck, with pressure rupture on a 90+ MPH entry. Water requires more than 200 displayed MPH to begin skimming and more than 180 to keep skimming. Its approach pad boosts the truck, water adds drag, and slow entries sink through a real opening in the concrete.

Potion colours: blue doubles motor top speed for five seconds and emits blue jets; grey clouds vision; purple makes the body tall/narrow; amber makes it flat/wide. Collider and suspension connection dimensions follow body scaling. Mixing distinct active potions destroys the truck; effects expire or clear on restart. Ground plaques and the HUD explain the rules.

All road and ramp surfaces use the same Poly Haven asphalt as Triple Loop. New-track floors use two concrete variants with diffuse, normal and roughness maps tiled at world scale. Triple Loop retains grass. Asset conventions are recorded in [docs/PROJECT_MEMORY.md](docs/PROJECT_MEMORY.md).

Inferno's jets grow and shrink over 500ms and can burn the entire truck to zero integrity. Its lava surfaces sit 4.2 metres below ground in stone-lined shafts with real ground openings. Integrity and Run Time labels and values use 14pt type.

Verification: `npx playwright test e2e/comic-hazards.spec.ts e2e/comic-effects.spec.ts e2e/courses.spec.ts e2e/world-presentation.spec.ts e2e/inferno-regressions.spec.ts`. To reproduce in-game visual evidence, run the dev server and `node scripts/capture-hazard-qa.mjs`. The [reference-based review and screenshots](docs/hazard-qa/README.md) include current full-course times and acceptance evidence.

### Ghost toggle and garage previews

Press backtick to open Playtest tuning, then uncheck **Enable graveyard ghosts** to hide Haunted Hollow's ghosts and stop their movement and damage. The setting persists in this browser across reloads and restarts; Reset tuning enables ghosts again.

Vehicle selection uses screenshots from the game camera in `public/vehicles/`. To regenerate them, start the dev server and run `node scripts/capture-vehicle-previews.mjs`. Pass vehicle IDs to capture a subset.

The Dune Buggy, Rally Hatch, Racing Semi, Armored Scout, Ice Cream Van, and Baja Beetle were modeled from the Nano Banana 2 concepts in `visual-plan/refs/gemini/`. Their meshes use the shared four-wheel chassis and thirteen damage parts.

The twenty themed vehicles use the same chassis and damage system. Their original Gemini images and generation briefs are in `visual-plan/refs/gemini/themed/`.


## Editor models, resizing and angles

The editor uses the game models for every prefab in both static preview and wireframe. Frame selection fits the camera to the selected geometry.

Choose Resize, then drag on a flat face of a selected solid or prefab. The closest edge or corner follows the pointer while the opposite side stays fixed. Solids resize along the chosen axes; prefabs and grouped selections resize proportionally, including their collision shapes, interactions and hazard areas. Each drag is one Undo step. Prefab Size is a multiplier; existing prefab-specific Scale values remain compatible.

All editor angle fields display and accept degrees, including negative angles and multiple turns. Level JSON continues to store radians.

`e2e/editor-prefab-gallery.spec.ts` creates a new level and places all 118 prefab types individually, capturing wireframe and preview screenshots under `artifacts/prefab-gallery`. The resize and degree browser tests cover rotated face drags, Undo, saved prefab gameplay sizes, and 45, 90, 135, -45, -90, -135, 180, 360 and 720 degrees on all three solid axes.


The right property panel includes Lock/Unlock and Select all of this kind. Multi-selection hides the object name and edits shared properties in bulk: common values are shown directly, differing values show `(various)`, and entering a value applies it to every selected object in one Undo step. Inspector coordinates and angles are absolute; viewport gestures preserve relative placement. Matching-kind selection skips locked objects. User groups still lock together. The object list collapses kinds with three or more instances by default, with user groups displayed inside those kind sections. Duplicate, Delete selected and Edit spawn sit below Copy/Paste and above the list.


Object help labels are off by default. Enable Show object help text in Settings to display instructional billboards above hazards; the choice applies immediately and is remembered independently of video quality and weather. Confetti keeps animating after a successful finish while gameplay remains frozen, and clears when entering a menu.


The Select level header button stays available on every screen. Open Destruction lab from the level-selection menu; return using Select level. Collection cards keep their existing footprint while fitting the complete artwork above a title and compact gold/star progress.


In the level editor, middle-mouse drag always orbits the camera, including over unlocked objects and while using another tool. Shift does not turn middle-drag into a pan. Rotator uses left drag for yaw and right drag for pitch; roll remains editable in its degree field.

Hold middle+left to pan along the ground, or middle+right to pan vertically. Either button order works; releasing the secondary button returns to orbit. Ctrl+Shift+click includes locked objects in the selection without unlocking them.

Preview includes checkpoint frames and a static monster truck at spawn. Enable **Preview game lighting** in Level settings to use the gameplay light colors, exposure, environment and fog. **Force night** overrides the background's permanent-night rule; existing mystic-cave levels retain night until explicitly changed. Turning it off allows the weather chosen in Settings.

The editor's **World grid** controls spacing (five units by default), visibility and red X / green Y / blue Z lines. **Snap XYZ**, **Snap X**, **Snap Y** and **Snap Z** round each selected solid or prefab independently to the nearest world coordinate. Enable **Snap to world grid** for snapped dragging; hold Control for smooth movement. Snapping respects locks and supports undo. Grid controls are editor preferences for the current session; preview hides grid lines.

Level and World grid settings start collapsed. Every prefab exposes **Light (lumens)** and **Light color**, including bulk editing. Ordinary prefabs default to zero output; cave fairies and fireflies default to 150 lumens, teal glow mushrooms to 500, and soft-yellow birthday candles to 250. Candle lights follow the flame tip through resizing, rotation and gameplay movement. The nearest 16 emitting prefabs use real point lights, shared between gameplay and editor preview.

Headlights use shadowed spotlights, so walls block their illumination and prefab surfaces cast floor shadows. The old unoccluded decorative cones have been removed. Shadow rendering follows the video-quality setting.

In the editor, wheel scrolling moves the camera and orbit pivot physically forward/backward. There is no minimum/maximum travel distance, the field of view stays fixed, and pan sensitivity does not shrink after scrolling inward.

Glow mushrooms have solid tapered stems and domed caps. Their **Size** is explicit and scales both appearance and collision; moving one never changes its dimensions. Existing mushrooms in Mystic Caverns, Firefly Grotto and Lavabridge Abyss retain their previous in-game sizes through saved size values.
