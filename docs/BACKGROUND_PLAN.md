# Backgrounds Plan — distant landscapes for every level

## Goal

Replace the vague gray far distance (`scene.background`/`Fog(0xc5d0cf)` in
`src/view.ts`) with appealing per-level backgrounds: a gradient sky dome,
fog/atmosphere per template, distant textured 3D shapes (mountains, trees,
skyscrapers, cranes, tents, mesas…), and drifting clouds. Each of the 13
existing levels (9 built-in tracks + 4 official file levels) gets an
appropriate landscape stored as a `levels/backgrounds/*.json` template and
referenced from its level JSON as `backgroundTemplate`. The level import
path assigns a fitting background to newly imported levels. All new
textures come from Poly Haven through the existing cache pipeline.

## Success Criteria

- Every built-in track and every `levels/official/*.json` level renders its
  planned landscape (sky, shapes, clouds) with no gray void at distance.
- Each level JSON carries `backgroundTemplate`; every reference resolves to
  a validated template (test-enforced).
- New Poly Haven textures are cached with hashes in
  `public/textures/manifest.json` via `scripts/fetch-textures.mjs`; no
  texture-load errors; `TEXTURE_IDS` stays the single allow-list.
- `importLevel` stores a deterministic, appropriate background on levels
  that lack one; editor blank levels carry the default.
- `npm run check` (unit + typecheck + build) green; no existing test
  weakened (exact-list tests are extended, not loosened).

## Approach

Data-driven backgrounds resolved at track level, rendered by one new view.

- **Templates as data.** `levels/backgrounds/<name>.json` validated by
  `validateBackgroundTemplate` in a new pure module `src/backgrounds.ts`.
  Templates are bundled with `import.meta.glob` (same pattern as
  `src/official-levels.ts`), so they work in dev, preview, and production
  builds without a server round-trip. A `levels/backgrounds/` subdirectory
  is invisible to the `/__levels` dev listing (non-recursive `readdir`) and
  to the official-level glob, so no level plumbing changes.
- **Schema (integer colors match level-JSON convention).**
  `{ name, sky: {top, horizon}, fog: {color, near, far},
  sun: {color, intensity}, hemi: {sky, ground, intensity},
  underground?: bool, shapes: [{kind, texture?, count, radius, y,
  size:[min,max], seed}], clouds: {count, y:[lo,hi], radius:[lo,hi],
  color, opacity, drift, seed} }`. Unknown template names fall back to the
  `pastoral-hills` default at runtime; tests assert every shipped
  reference resolves.
- **Renderer.** New `src/background-view.ts` `BackgroundView extends
  T.Group`, following the `CourseView`/`DungeonView` rebuild-on-`courseTrack`
  -change pattern (`key`/`builtTrack`). Browser-built, so PBR via the
  existing `pbr()` helper is allowed (per `docs/PROJECT_MEMORY.md`;
  headless builders stay flat-shaded). Contents: gradient sky dome
  (BackSide sphere + small ShaderMaterial; `fog: false`), one merged mesh
  per shape ring (`mergeGeometries` precedent in `loop-view.ts`), and
  canvas-sprite clouds that drift in `update(time)`. Distant materials set
  `fog: false` with baked distance haze so low-quality fog ranges cannot
  swallow them; dome scale tracks `camera.far` so quality tiers (350/500/
  650) never clip it. No shadows on background meshes.
- **Deterministic placement.** Seeded PRNG (mulberry32) in `backgrounds.ts`
  lays out ring slots; pure and headless-testable. Node unit tests build
  `BackgroundView` with the `TextureLoader.load` mock precedent from
  `tests/track-improvements.test.ts`.
- **Track flow.** `Track.backgroundTemplate?` (optional, no
  `validateTracks` change). `toTrack` copies
  `level.backgroundTemplate`; built-in `TRACKS` entries get literals.
  `GameView` resolves `track.backgroundTemplate ??
  track.custom?.backgroundTemplate ?? default`, and the per-frame mood
  switch in `render()` (colors/fog/sun/hemi) is driven from the resolved
  template, preserving current values per mood (no test asserts them).
- **Import path.** `importLevel` (`src/level-store.ts` — the file-import
  path used by the editor) assigns `backgroundForLevel(level)` when the
  level has no `backgroundTemplate`: `underground` → cavern, then
  name-keyword match (harbor, city, canyon, haunted, volcano/lava,
  fair, foundry, sky/snow, dino/jungle), then mode fallback
  (arena/demolition/race defaults). Deterministic and unit-tested.
  `blankLevel` gains the default template. No new template files are
  generated per import (rejected: unbounded JSON sprawl); imports reuse
  the curated set.
- **Textures.** Reuse the 12 vendored PBR sets wherever they fit
  (rock/sand/concrete/grass/mud/stone/plaster) and add exactly two
  verified sets: `bark_brown_01` (tree trunks) and `snow_01` (alpine
  caps) — both confirmed via the Poly Haven API to expose 1k
  `Diffuse`/`nor_gl`/`Rough` JPGs that `fetch-textures.mjs` requires.
  Skyscraper windows, tent stripes, and cloud puffs are procedural
  canvas textures (precedent: contact shadow in `view.ts`, labels in
  `course-view.ts`). No Poly Haven water/city/window textures exist
  under those names (verified zero hits), so harbor water is a tinted
  plane. Exact-list tests (`tests/assets.test.ts`,
  `tests/custom-level.test.ts`) are extended with the two ids in
  manifest order; `texture-audit` and the `textures.spec.ts` e2e extend
  automatically. CC0 allows vendoring without attribution
  (https://polyhaven.com/license); manifest records sources/hashes and
  `THIRD_PARTY.md` already covers Poly Haven.

## Per-level landscapes

| Level | Template | Distant shapes (textured) | Sky / atmosphere |
|---|---|---|---|
| triple-loop | pastoral-hills (default) | grass hills, tree clusters | blue gradient, white cumulus drift |
| harbor-sprint | harbor-docks | cranes, container stacks, skyscraper silhouettes, tinted water plane | steel-blue overcast, gray-white clouds |
| foundry-run | foundry-district | smokestacks, industrial blocks | amber haze, smoke-tinted clouds |
| skyline-circuit | city-skyline | skyscraper ring, lit canvas windows | dusk blue, high thin clouds |
| scrapyard-sweep | scrapyard-flats | crane, container stacks, low scrap hills | hazy noon, pale clouds |
| inferno-vault | volcanic-fields | dark-rock peaks | ember sky, ash clouds |
| canyon-plunge | desert-mesas | red mesas, sand dunes | hot pale sky, few small clouds |
| haunted-hollow | haunted-night | dead trees, dark hills, moon disc | indigo night, slow dark clouds |
| sky-slide | alpine-peaks | snow-capped peaks, green foothills | bright azure, clouds above and below track |
| Fairground.json | fairground-park | striped tents, trees | festive light blue, puffy clouds |
| Dungeon.json | cavern-dark | close dark-rock walls, no dome/clouds | keep near-black underground air |
| Jurassic Junction.json | toybox-volcano | giant toy blocks, volcanic peaks | warm sky, orange-tinted clouds |
| Emberfall Causeway.json | ember-dusk | stacked-block silhouettes, dark peaks | burnt-orange dusk gradient, long clouds |

Shape kinds to build (each 10–20 lines, seeded ring placement):
hill, mountain, snow-peak, mesa, tree, dead-tree, skyscraper,
container-stack, crane, smokestack, tent, toy-block, rock-wall, moon.

## Steps

1. `src/backgrounds.ts` (TDD): template types, `validateBackgroundTemplate`,
   `getBackgroundTemplate` (glob registry + default fallback),
   `backgroundForLevel` heuristic, seeded `layoutRing` placement math.
   Tests: `tests/backgrounds.test.ts` (schema accept/reject, fallback,
   heuristic mapping, deterministic layouts).
2. Author `levels/backgrounds/*.json` (13 files above). Tests: every file
   validates; every built-in track id and official level resolves.
3. Level plumbing (TDD): `CustomLevel.backgroundTemplate?` + validation +
   preserved by `validateCustomLevel`'s rebuilt object; `Track` field;
   `toTrack` copy; built-in literals; `blankLevel` default. Update
   `levels/official/*.json` (4 files). Tests: custom-level, tracks,
   official-triple round-trips.
4. Textures: append `bark_brown_01`, `snow_01` to
   `scripts/fetch-textures.mjs` and `TEXTURE_IDS`; run the fetch; extend
   the exact-list tests. `texture-audit` + `textures.spec.ts` cover the
   rest.
5. `src/background-view.ts` (TDD): sky dome, shape builders, cloud
   sprites + drift, rebuild-on-track-change, far-plane dome scaling.
   Wire into `GameView` (construct, scene add, per-frame update) and
   migrate the mood switch to template values. Tests: build/wire with
   mocked `TextureLoader.load`; stats for draw-call sanity.
6. `importLevel` background assignment + tests (keeps explicit choice,
   assigns heuristic pick otherwise). Docs: record RED/GREEN in
   `docs/TDD_LOG.md`.
7. Full gate: `npm run check`. E2E note: no Playwright browsers are
   installed here, so browser suites cannot run in this environment;
   `textures.spec.ts`/`art.spec.ts` should run in CI; the unit suite
   plus static selector analysis stands in locally.

## Validation Plan

- `npx vitest run tests/backgrounds.test.ts tests/custom-level.test.ts tests/tracks.test.ts tests/level-store.test.ts tests/assets.test.ts tests/texture-audit.test.ts tests/track-improvements.test.ts` — focused suites for every touched contract.
- `npm run check` — full unit suite + `tsc --noEmit` + production build.
- `node scripts/fetch-textures.mjs` re-run is a no-op (`Kept …` for all
  assets) proving manifest/hash discipline.
- Manual: boot `npm run dev`, open each official level, confirm sky,
  shapes, and clouds render with no gray void and no console texture
  errors; drag orbit to check the horizon in all directions.
- Highest-risk check: the `backgrounds ↔ view` wiring (template values
  actually reaching sky/fog/sun) — covered by unit tests on the
  resolver plus a browser eyeball pass, since SwiftShader is
  unavailable here.

## Risks / Open Questions

- Root `levels/*.json` drafts (Caves, Frog, …) are untouched: they render
  with the default template until re-imported. Accepted: editing user
  drafts is out of scope.
- New texture binaries (~5 MB) must be committed for CI/e2e; `push.cmd`
  (`git add --all`) covers them.
- No editor UI for picking backgrounds yet — deliberate follow-up; the
  data field and import default unblock it.
- Shape count/draw calls have no automated gate here (fps suite needs a
  real GPU); merging + no-shadow + capped counts keep the budget
  conservative (~20 extra calls worst case).
- None open: no user questions — reversible defaults are stated above
  (fallback template, heuristic order, underground keeps dark air).

## Sources

- https://polyhaven.com/license — CC0 terms for all assets (use,
  redistribute, commercial OK; no attribution required).
- https://api.polyhaven.com/assets?t=textures — 869-texture catalog;
  zero hits for water/city/urban/window informed the procedural
  fallback for harbor water and windows.
- https://api.polyhaven.com/files/bark_brown_01 — 1k Diffuse/nor_gl/
  Rough confirmed.
- https://api.polyhaven.com/files/snow_01 — 1k Diffuse/nor_gl/Rough
  confirmed.
- https://api.polyhaven.com/files/rock_06 — reference response shape
  for the fetch script's key requirements.
