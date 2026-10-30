# Update2 Plan — `direction/update2.txt` (7 items)

Follow-up to `docs/EDITOR_REFINEMENT_PLAN.md`. TDD, one commit per chunk.

## Chunk 1 — Comic labels closer + upright
File: `src/comic-view.ts` (`build`, label at ~L672-679: flat plane,
`rotation.x=-PI/2`, 20 m away at z=-20).
Change: replace ground plane with an upright billboard `THREE.Sprite`
directly above each model (Box3 top + margin). Extract exported
`buildComicLabel(h, topY)` + export model builder for tests (mirror
`buildAxeMesh` pattern). Applies to all 8 kinds (book/teeth/computer/
flippers/hydrant/burner/water/potion).
Tests: `tests/comic-labels.test.ts` (stub `document` canvas): one Sprite
per model, within ~8 m of origin, above model top, title text drawn.
Regression: existing `e2e/comic-hazards.spec.ts` passes.

## Chunk 2 — Pan tool: x/z left, x/y right/middle
File: `src/editor-viewport.ts` (pan tool plane routing; `planeHit`).
Change: pan drag plane selected by pointer button: left → x/z ground
plane, right/middle → x/y vertical plane. Keep orbit/pick behavior for
other tools unchanged.
Tests: `tests/editor-pan.test.ts`: pure button→plane mapping + drag
delta application per plane.

## Chunk 3 — Rotator: single-axis yaw/pitch/roll
File: `src/editor-viewport.ts` (rotator trackball), `src/euler.ts`.
Change: rotator drags rotate exactly one axis by button: left → yaw (Y),
right → pitch (X), middle → roll (Z), replacing trackball for this tool.
Keep `solidQuaternion` YXZ composition; numeric entry unchanged.
Tests: extend `tests/editor-viewport.test.ts` / `tests/euler.test.ts`:
single-axis deltas, other axes untouched.

## Chunk 4 — Undo/redo, rolling 100
File: `src/editor-state.ts` (`EditorStore`).
Change: snapshot stack (cap 100, drop oldest) over store commits:
solid/prefab/checkpoint add/move/edit/delete/retexture/duplicate.
Undo/redo restore snapshots + selection; dirty flag follows.
Tests: `tests/editor-undo.test.ts`: push/undo/redo, cap eviction at 100,
dirty + selection semantics.

## Chunk 5 — Show default texture name
File: `src/level-editor.ts` (texture box), `src/course-view.ts`
(`solidMaps` default logic per track/kind).
Change: shared `defaultTextureFor(trackId, kind)` helper; texture box
shows the implicit default name instead of `(none)` when no override.
Tests: `tests/default-texture.test.ts`: every solid kind × track
resolves; editor shows default, override still wins.

## Chunk 6 — Prefab yaw/pitch/roll + triple-loop dragons
Files: `src/custom-level.ts` (`CustomPrefab.yaw` + validation L266-276 —
widen to prop/course kinds as needed), `src/course.ts`,
`src/prop-view.ts` / `src/course-view.ts` (T.Group wrapper: physics body
keeps yaw-only/identity, visual group applies full euler — physics
stays axis-aligned), `src/loop-view.ts` (dragon yaw), wireframe prefab
markers, editor prefab panel numeric fields.
Data fix: `public/showcase/clone-triple-loop.json` — set the two dragon
yaws to match reference.
Tests: `tests/prefab-rotation.test.ts` (validation + euler compose +
view wrapper angles); render coverage test asserting clone dragons face
reference headings; existing suites pass.

## Chunk 7 — Loop-de-loop E2E on Clone Triple Loop + iterate
File: new `e2e/clone-loop.spec.ts`, level data
`public/showcase/clone-triple-loop.json` (+ generator `src/showcase.ts`
if the fix belongs there).
Change: scripted drive through the loop-de-loop; iterate on level
(approach, boost, loop flag/geometry) until the E2E passes.
Tests: E2E green; full gates (`npx vitest run`, `npm run check`,
relevant e2e files) before final commit.

## Gates per chunk
`npx vitest run tests/<chunk>.test.ts`, `npx tsc --noEmit`, then commit.
Final: full unit + `npm run check` + affected e2e.
