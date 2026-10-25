# Vehicles / Editor / Performance plan

## Goal

Ship three features on top of the nine-track game with the same plan-first,
TDD, per-chunk-commit discipline: (1) a vehicle-select screen with four new
high-detail, fully deformable vehicles; (2) a level editor with wireframe and
in-game editing, disk-backed custom levels, per-primitive textures, prefabs
and playtest; (3) a settings page with low/med/high video quality that hits
60 fps per level in e2e on this machine.

## Success Criteria

- A "select vehicle" screen offers five vehicles: monster truck (existing),
  sports car, cop car, ambulance, school bus. Cop and ambulance flash their
  light bars above 90 game mph (horizontal m/s x 3.6, the HUD/comic-hazard
  convention — 25 m/s true). Every new mesh matches or beats the
  truck's detail (60k-125k triangles) and supports the existing per-part
  deformation pipeline (named part groups, first child deformable).
- Every level (9) is beaten end to end with every vehicle (5): a 45-run
  browser matrix, all `completed` with integrity > 0.
- Custom levels are stored on disk as files (dev-server `/__levels` endpoint
  mirroring the `/__tuning-defaults` plugin precedent, atomic writes,
  localhost-only; production falls back to localStorage plus JSON
  export/import).
- Two editing modes: a traditional wireframe editor screen (3D viewport with
  wireframe overlay, object list, property panel) and in-game realtime brick
  placement while driving, both saving to the level.
- A playtest button runs the custom level in the real simulation; custom
  levels validate (spawn + at least one checkpoint) before play.
- Every primitive carries a texture chosen from the cached Poly Haven set;
  prefabs include chomping books, snowmen, fire hydrants and checkpoints.
- A settings page hosts a video menu with low/med/high. Low reduces draw
  distance (camera far + fog), pixel ratio, shadows and any further quality
  needed until the per-level e2e fps probe reports >= 60 fps on this machine.
- Each chunk below is its own commit; unit gate stays green throughout.

## Approach

Mirror proven architecture; no new engines.

### Vehicles

- `src/vehicles.ts`: a `VehicleDef` catalog. All vehicles share the 13 part
  IDs in `PARTS` order (chassis, wheels, hood, roof, doors, bed, bumpers) so
  every `simulation.ts` call site keeps working; each def overrides
  per-part pos/size/mass/hp plus a mesh builder and optional light bar type.
- `Simulation` takes a vehicle id (default monster truck) and builds
  colliders, masses and health from its defs; snapshots expose it.
- `src/truck.ts` pattern repeats per vehicle: named group per part id,
  deformable first child, `*Stats` counters. `GameView.resetTruck` builds
  the active vehicle; the existing dent loop and `deformGeometry` apply
  unchanged. Cop/EMS light bars flip emissive in `update` above 90 mph.
- Select screen mirrors `level-select.ts`: cards, localStorage persistence,
  keyboard navigation (arrows + Space, L back). One `?vehicle=` flow through
  `startTrack`; harness gains a vehicle argument for the matrix.

### Editor

- `src/custom-level.ts`: `CustomLevel` JSON type + `validateCustomLevel`
  (name, race mode, spawn, >= 1 checkpoint, solids with manifest texture ids,
  prefabs with known kinds) + `toTrack` adapter producing a
  `custom:<name>` Track. `courseSolids` returns embedded solids for custom
  ids; `CourseView` maps per-solid texture ids through the existing `pbr`
  cache; prefabs reuse the comic/prop builders.
- Disk storage: `vite.config.ts` `/__levels` plugin (list/get/save/delete
  under `levels/`, same origin guard + atomic rename as tuning). Production:
  localStorage cache + export (download JSON) / import (file picker).
- Wireframe screen: new DOM screen + three viewport reusing CourseView with a
  wireframe material override, object list, add/delete/duplicate, property
  editor (position/size/color/texture id), simple orbit control. Playtest
  button validates then boots the real sim on the custom track.
- In-game placement: an edit toggle while driving a custom level; a ghost
  brick follows the aim ray, click commits it to the level and saves.
- Tests: unit for validation/serialization/adapter; e2e for wireframe
  create/save/load, in-game placement persistence, texture + prefab wiring,
  and a playtest completion.

### Performance

- `src/settings.ts`: `{ video: "low" | "medium" | "high" }` + localStorage;
  settings screen reachable from the menu with a video section. Defaults to
  high (current look).
- `applyVideoQuality` in the view layer: low = pixelRatio 0.5, shadows off,
  camera far + fog scaled in, anisotropy 1; medium = pixelRatio 1, 1024
  shadows, current distances; high = current (pixelRatio <= 1.5, 2048 PCFSoft
  shadows, full distances). Everything applies live, no reload.
- Fps probe: time 120 real `view.render()` calls mid-drive per level at low
  quality in e2e; assert >= 60 fps. If short, add sacrifices in order:
  smaller frame (0.35), contact-shadow only, foam/skid/particle suppression,
  reduced pixel ratio steps — never touching completion rules. Iterate per
  level until green.

## Steps

Each chunk is RED → GREEN → REFACTOR with its tests, a TDD log entry, and
its own commit, in this order:

0. **Plan record.** This file committed alone. No behavior changes.
1. **Vehicle platform.** RED: catalog/sim/select tests fail. GREEN:
   `vehicles.ts` with monster-truck def imported from `PARTS`, sim vehicle
   wiring, select screen + persistence + harness vehicle argument.
2. **Sports car.** RED: builder/stats/deform tests fail. GREEN: mesh >= truck
   detail, full deformation, sample e2e drive.
3. **Cop car + lights.** RED: builder/light-threshold tests fail. GREEN:
   mesh, light bar flashing only above 90 mph, e2e proof.
4. **Ambulance + lights.** Same shape as 3 with EMS colors.
5. **School bus.** Tall/long body on shared part slots, deformation, e2e.
6. **9x5 matrix.** RED: matrix spec fails. GREEN: every level completes with
   every vehicle in the browser.
7. **Level format + storage.** RED: validation/roundtrip tests fail. GREEN:
   `custom-level.ts`, `/__levels` plugin, localStorage + export/import.
8. **Wireframe editor.** RED: editor e2e fails. GREEN: editor screen, CRUD,
   textures per primitive, save/load.
9. **In-game placement + prefabs.** RED: placement e2e fails. GREEN: ghost
   brick, live save, prefab palette (books, snowmen, hydrants, checkpoints).
10. **Playtest.** RED: playtest e2e fails. GREEN: validation gate + real-sim
    boot + completion on a custom level.
11. **Settings + quality.** RED: settings/quality tests fail. GREEN:
    settings page, video toggle, live application of all three tiers.
12. **60 fps.** RED: per-level fps probes fail. GREEN: iterate sacrifices
    until every level reports >= 60 fps at low in e2e.
13. **Whole-release verification.** Full unit gate + full e2e + smoke,
    checked-in report, final commit.

## Validation Plan

- Unit/physics per chunk: `npx vitest run tests/<chunk-file>.test.ts` —
  RED before, GREEN after.
- Browser proof: focused `npx playwright test e2e/<spec>.ts` per chunk;
  vehicle matrix and fps probes run the real `driveTrack` drivers.
- Regression + release: `npm run check`, full `npx playwright test`,
  production build + `node scripts/smoke-production.mjs`.
- Highest-risk validation: the 45-run matrix wall time (single worker,
  ~30 min — run once per chunk 6 and once at release); fps iteration cost
  on software rendering; editor scope discipline (race mode only, manifest
  textures only, no custom uploads).

## Risks / Open Questions

- Per-vehicle part geometry changes handling; the matrix (not weakened
  rules) proves every combination.
- `/__levels` disk writes work in dev only; production uses
  localStorage + export/import and says so in the UI.
- 60 fps is measured as real render throughput under the shipped e2e
  software renderer; sacrifices apply to low tier only, high keeps the
  current look.
- Open questions: None. Vehicle stats, editor primitive set and quality
  tier values are reversible defaults.

## Sources

- [Poly Haven license (CC0)](https://polyhaven.com/license)
