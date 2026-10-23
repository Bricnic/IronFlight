# Comic hazard and presentation update

Existing six-track work merged and pushed to origin/main first (803f910).

## Independently testable chunks

1. Preserve failed-run simulation and reveal results only after a two-second hold, followed by a three-second fade. Unit boundary checks and browser opacity/live-tick assertions.
2. Use the exact existing asphalt_02 material for all road/ramp surfaces. Cache two Poly Haven concrete variants for every new track's off-road floor, with world-scale tiled diffuse/normal/roughness UVs. Verify loaded maps and asset hashes. Keep Triple Loop grass. Record asset convention in PROJECT_MEMORY.md.
3. Add 25 hazards across five tracks, using eight reusable families: cursed book, giant teeth, chomping computer, contact-triggered color flippers, pressure hydrant, burning ramp section, boosted water road, and four-liquid potion stand. Crusher jaws and teeth have animated kinematic colliders. Ordinary road-edge detours remain possible. Add actual holes under water, with >200 MPH entry and 180 MPH retention, drag and fatal sinking.
4. Potions provide five seconds of doubled motor speed with blue jets, blurred vision, tall/narrow geometry or wide/flat geometry. Panel colliders and suspension connections follow scaling. Mixing distinct active liquids is a lethal overdose, so stands include an explicit warning.
5. Every family receives browser checks for modeled collision, an ordinary throttle bypass, and an ideal destructive encounter. Water additionally proves a boost-driven skim and failed slow entry. Every new track retains its complete normal-control playthrough and arena headroom check.
6. Render each family in the real game and manually compare its screenshot with the supplied book reference. Use the reference as a qualitative target: silhouette/readability, dimensional detail, material response, character/effects, and integration/contact each score out of 20. Polygon count is a separate minimum (100,000 triangles per hazard). Do not treat this rubric as an objective perceptual measurement. Revise weak models before recording final scores.

## Observed test-first evidence

- Result opacity unit test initially failed because the module did not exist; the implemented two-second hold/three-second fade passed.
- Comic catalog/water hysteresis/jaw-cycle tests initially failed because the hazard module did not exist; implementation passed.
- First physical integration failed Foundry and Skyline completion: the driver hit real jaw colliders. Ordinary obstacle-aware steering detours now complete all five tracks without changing damage or collision rules.
- The hydrant destructive fixture exposed checking post-collision speed; use incoming pre-contact speed for pressure rupture damage.
- All four potion durations, mixing damage, boost-enabled skim and actual sinking pass physical integration tests.
- Existing asset hash test exposed its stale four-texture count. It now explicitly requires all six named source assets, retaining every CC0/source URL/hash check.
- First browser book screenshot exposed an excessively flat page surface. Revised layered pages, dimensional mouth, bindings and cover details; all eight final families were captured and reviewed in [hazard-qa/README.md](hazard-qa/README.md).
- Initial jaw collider rotation differed from the visible open jaw. A failing pose regression now passes; actual closing contact destroys the truck.
- Inferno exposure reproduced the 79% integrity plateau. Whole-assembly fire damage now reaches zero. Shared 500ms flame envelopes, three-second smoke decay and underground lava shafts pass dedicated tests.
- Final geometry regressions exposed ground intruding into basin walls, duplicate water end-cap faces and a five-metre rendered/physical ramp mismatch. Shared geometry and trimmed ground apertures resolve them; physical drums match the fire-section art.
- Final acceptance consolidates 36 passing browser cases, full playthroughs of all five changed tracks, 185 unit tests, a passing production build and packaged keyboard smoke checks. Both arenas finish with more than 25% timer headroom.
