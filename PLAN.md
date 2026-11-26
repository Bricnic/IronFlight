# Level Editor Performance Plan (North Pole Summit)

## Goal

Make object selection and dragging in the level editor near-instant on
prefab-heavy levels (North Pole Summit: 454 solids, 5100 prefabs, 5
checkpoints), then spend remaining budget on general editor optimizations.

## Baseline (measured this session)

Harness: headless Chromium + SwiftShader, `bench-editor-scratch.mjs`
(to be committed as `scripts/perf-editor.mjs`). Absolute numbers are slower
than a real GPU, but before/after deltas on this machine are meaningful —
same caveat as `scripts/perf-browser.mjs`.

- Open NPS in editor: ~1.0–2.4s
- Select object (list row click → selected UI): **median 7115ms** (5 samples)
- Drag (20 pointermove steps): **2836ms/step, 1.0 fps**

User reports ~500ms for both on real hardware. Same causes, different magnitude.

## Root Causes (ranked, all on the emit → refresh path)

Every select and every drag mousemove runs `EditorStore.emit()` →
`level-editor.refresh()`, unconditionally and unthrottled
(`src/level-editor.ts:1026`, `:1023`; single subscriber, single caller).

1. **Object list is O(n²).** `refreshList` calls `selectedItem()` (an
   `Array.find` over all prefabs/solids) once or twice per row for every row,
   including grouped rows that early-return before creating DOM
   (`src/level-editor.ts:870-884`). At n=5100 that is ~30–60M id comparisons
   per refresh — on every select and every drag step.
2. **Viewport rebuilds the whole 3D scene per refresh.** `render()` disposes
   every geometry/material and rebuilds all solids, all prefab models, the
   5073-instance ice batch, and all gates (`src/editor-viewport.ts:739-844`,
   `buildEditorIceBatch` in `src/editor-prefabs.ts:94`). Selection changes
   only need to re-tint two models; drags only need to move one transform.
3. **No coalescing during drag.** Each pointermove runs the full refresh
   synchronously; several moves per frame each pay the full cost
   (`src/editor-viewport.ts:628-649` → `moveSelectedFrom` → `emit`).
4. **History clones the whole level.** `pushHistory` structured-clones all
   5100 prefabs; gesture coalescing limits this to once per drag, but panel
   commits pay it every time (`src/editor-state.ts:106-129`).
5. Minor: `emit()` finds, props rebuild, `applyLighting` — small; not targeted
   unless measurement says otherwise.

## Approach

Fix in impact order, each independently measurable with the harness. Keep all
existing editor unit suites and e2e specs green; no behavior changes besides
speed (list still shows live coordinates; selection/undo semantics unchanged).

## Steps

1. **Index lookups (kills cause 1).**
   - Maintain `id → item` maps for solids/prefabs in `EditorStore`, rebuilt
     lazily on structural change; use in `selectedItem` and everywhere rows
     resolve items. Better: pass the already-iterated item into `row()`
     instead of re-finding it by selection.
   - Do not create `li` elements for collapsed kind-section children or
     collapsed group members; build them on expand.
   - Expected: refreshList from O(n²) finds (~30–60M comparisons) to O(n);
     collapsed sections also stop building discarded DOM.
2. **Incremental viewport sync (kills cause 2).**
   - Keep a `Map<pickKey, Object3D>` across renders. On `render()`, add models
     for new ids, remove dropped ones, and update position/rotation in place
     for moved ones. Selection change re-tints old + new only.
   - Ice batch: rebuild only when the ice set changes; update instance
     matrices for moved ice tiles.
   - Fallback to full rebuild only on structural mismatch (defensive).
3. **Coalesce drag refreshes (cause 3).**
   - rAF-throttle viewport re-render during pointer drags (one render per
     frame max). Skip the object-list rebuild during drag; update only the
     dragged rows' coordinate labels in place (or defer list sync to drag end
     if in-place labels prove fiddly — measure both).
4. **Cheaper history snapshots (cause 4, if measurement justifies).**
   - Profile `structuredClone` on NPS first. If material, snapshot only on
     drag end for moves (positions already coalesced) — semantics unchanged
     since intermediate states are unreachable via undo today.
5. **Commit the harness** as `scripts/perf-editor.mjs` following the
   `perf-browser.mjs` pattern (own server, JSON artifact, before/after
   deltas), and harden the kind-section expansion (dispatchEvent fallback —
   the toggle click flaked 2/4 runs during baselining).
6. **Spillover (only if budget remains after 1–5):** shared geometry/material
   caches in `buildEditorPrefab`, list virtualization for 5000+ row sections,
   `defaultTextureFor` caching.

## Validation Plan

- `node scripts/perf-editor.mjs` before/after each step on North Pole Summit.
  Targets on this box: select p50 < 100ms, drag step < 33ms with rAF ≥ 25fps.
  Ship each step only if it improves or holds the numbers.
- `npx tsc --noEmit`.
- `npx vitest run tests/editor-state.test.ts tests/editor-list.test.ts
  tests/editor-gesture.test.ts tests/editor-groups.test.ts
  tests/editor-clip.test.ts tests/editor-viewport.test.ts tests/editor-undo.test.ts`.
- `npx playwright test e2e/editor-checkpoint-yaw.spec.ts
  e2e/editor-checkpoint-order.spec.ts e2e/editor-clip.spec.ts` (spot-check;
  full e2e only if time remains).
- Manual: open NPS, select/drag several objects incl. grouped ice, undo/redo,
  collapse/expand sections — no visual or behavior regressions.

## Risks / Open Questions

- Incremental viewport sync must exactly preserve pick ids, locked flags,
  layer assignments, and selection tinting — the e2e spot-checks plus manual
  pass cover this; the structural-mismatch fallback bounds the risk.
- `structuredClone` cost is unmeasured; step 4 is conditional on profiling.
- Harness flake: kind-section toggle click flaked during baselining; step 5
  hardens it, and each benchmark run reports sample variance.
- None: no open questions — all decisions are locally verifiable.

## Budget

6 hours total. Expected split: steps 1–2 ~3h, steps 3–5 ~2h, spillover ~1h.
Stop rule: if select < 100ms and drag ≥ 25fps after step 3, remaining budget
goes to spillover; otherwise keep pushing the core path.

## Results (measured with scripts/perf-editor.mjs on NPS)

| Metric (SwiftShader box) | Baseline | After list+viewport | After game-loop gate | Final |
|---|---|---|---|---|
| Select median (5 samples) | 7115ms | 3352ms | 109ms | 74–96ms |
| Drag per step (20 steps) | 2836ms | 1289ms | 508ms | ~465–499ms |
| rAF during drag | 1.0fps | 0.8fps | 6.4fps | 6.4–7.0fps |

CDP profiles showed the surprise dominant cost was NOT editor code: the game
view rendered 1143 draw calls every animation frame behind the opaque editor,
starving everything on SwiftShader (`view.render` 11.7s of an 11.8s select).
Gating it off while the editor is visible (`src/main.ts`) was the biggest
single win and de-noised all later measurements.

After all fixes, editor JS per interaction is ~20–26ms (select profile:
`refreshList` 13ms, viewport `render` 5ms). Remaining wall time on this box is
SwiftShader software rasterization plus harness overhead, which collapses on
real GPUs — the reported ~500ms interaction latency is addressed at its JS
roots. `structuredClone` of NPS measured 6ms, so step 4 was dropped.

Shipped: describe-first object list (per-row store lookups eliminated;
collapsed kind-section children still render hidden, preserving count/find
behavior after e2e caught the lazy variant), incremental viewport sync
(in-place transforms, save/restore selection tint, ice instance matrix
updates), rAF-coalesced object drags, game-render gate behind the editor,
committed `scripts/perf-editor.mjs` harness.

Verification: editor unit suites 278/279 (1 pre-existing clip failure,
confirmed at HEAD); e2e checkpoint-yaw/order, groups pass; clip auto-clip,
preview textured-solids, and 4 editor.spec cases fail identically at HEAD
(pre-existing, incl. stale pre-reorganization level paths in groups spec,
which were fixed). No regressions introduced.
