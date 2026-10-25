# Level Editor Refinement — Release Plan

Follow-up to the vehicles/editor/perf stream (`docs/VEHICLES_EDITOR_PERF_PLAN.md`).
Goal: a full-featured level editor with playtest/wireframe sync, mouse tools,
preview, all textures, all placeables, and high-fidelity clones of levels 1+2.

Assumption: "first and second levels" are `TRACK_IDS[0..1]` =
triple-loop (legacy route track with loop-de-loop + dragons) and
harbor-sprint (course track). The requested placeable set matches exactly
what those two levels contain.

## Success Criteria

- Objects placed during playtest appear in the wireframe view, survive
  save-to-disk, and keep their collisions across editor/playtest round trips.
- In the playtest view the player can select an existing object and rotate,
  relocate, delete, retexture, and duplicate it.
- Wireframe view: mouse selection, drag-to-move, click-empty deselects, and
  a tools panel (pan / select / eyedropper-for-texture / rotator). The
  rotator behaves like a trackball (camera-relative, grab-point-relative).
  Yaw, pitch, and roll are numerically editable for every object.
- A preview button renders the scene without playtesting: the car never
  drives, full editing stays available.
- The editor has a back-to-level-select button; with unsaved changes it
  offers to save first (save / discard / cancel).
- The `monastery_stone_floor` invisible-ramp bug is fixed; every texture
  used by the normal game renders in custom levels; every editor-listed
  texture is proven to render in e2e.
- The editor can place rings, generic collectibles, spinning spike hammers
  with supports, loop-de-loops, goal rings, trampolines, ghosts, dragons,
  lamp posts, and grandstands — each simulated and rendered.
- `showcase/clone-triple-loop.json` and `showcase/clone-harbor-sprint.json`
  (checked in, NOT gitignored) are high-fidelity clones proven by
  side-by-side screenshots at equivalent points; a regression test rebuilds
  equivalent levels from scratch via the editor APIs and load+playtests the
  saved files.

## Key Design Decisions

- Single source of truth: the `EditorStore` level object. In-game commits
  write through to the store; opening the editor reloads from the live
  session when one exists, else disk. No more three-way divergence
  (store vs sim track vs disk).
- Rotation format: solids gain optional `pitch`/`roll` next to `yaw`
  (validated, default 0); physics colliders and all three views (wireframe,
  course, ghost preview) apply YXZ euler. Prefabs/points gain optional
  `yaw` (visual only except where the sim needs it).
- Tools live in the wireframe viewport with a shared pointer state machine:
  pan (drag orbits? no — pan moves target; orbit stays on right-drag and
  wheel zoom as today), select (click pick / drag move on ground plane),
  eyedropper (click copies that solid's texture into the texture field),
  rotator (trackball from grab point + camera basis).
- Preview = a rendered mode of the editor viewport reusing the course
  solid/hazard/prop builders against the store level, with the sim never
  constructed. Editing stays live; exiting preview restores wireframe.
- New placeables extend `CustomLevel` with small typed arrays
  (`rings`, `trampolines`, `hammers`, `loops`, `dragons`, `ghosts`,
  `lamps`, `grandstands`) reusing the existing sim/view subsystems by
  parameterizing their current track-gated constructors. Collectibles
  already exist for arena mode; race mode gains them as generic pickups
  plus an `Add collectible` / `Add ring` / `Add goal ring` UI.
- Showcase levels live in `showcase/*.json`, registered read-only at boot
  (playable + openable in the editor), and are compared screenshot-wise
  against the originals from fixed camera bookmarks at matched progress.

## Chunks (TDD, one commit each)

1. **Playtest/wireframe sync.** RED: e2e places a brick in playtest,
   returns to the editor, wireframe lacks it; save drops it; resumed
   playtest has no collision. GREEN: commit write-through to the store +
   editor-show reload from live session; round-trip e2e green.
2. **In-playtest object editing.** RED: clicking an existing object in
   playtest selects nothing. GREEN: click-select with highlight, drag
   relocate on the ground plane, R rotate 45°, Delete removes, texture
   select re-skins, duplicate clones; all write through + save; e2e per
   op.
3. **Wireframe mouse select + move.** RED: viewport clicks do nothing.
   GREEN: raycast pick → store.select, drag moves on y=object plane,
   empty click deselects; e2e proves select/move/deselect.
4. **Tools panel.** RED: no tool UI. GREEN: pan/select/eyedropper/rotator
   buttons; pan drag moves target; eyedropper click loads texture into
   the props texture field; e2e per tool.
5. **Trackball rotator + euler numerics.** RED: no pitch/roll anywhere.
   GREEN: `pitch`/`roll` (+ prefab `yaw`) format + validation + store +
   props panel numerics + collider/view support; rotator drags rotate
   around the camera-relative axis through the grab point; e2e rotates
   a barrier and drives the new shape.
6. **Preview mode.** RED: no preview button. GREEN: rendered viewport
   mode over the store level (solids/hazards/props/rings), car absent,
   editing live; exit restores wireframe; e2e screenshots preview vs
   playtest first frame for similarity.
7. **Back + unsaved prompt.** RED: no way back except header; changes
   silently lost. GREEN: editor Back button returns to level select;
   dirty state raises save/discard/cancel; e2e covers all three paths.
8. **Texture audit.** RED: monastery ramp repro renders invisible; no
   per-texture coverage. GREEN: root-caused fix; e2e renders every
   `TEXTURE_IDS` entry on a custom solid and asserts visible pixels;
   e2e asserts every texture id referenced by official tracks is in
   the editor list and renders.
9. **Rings + collectibles.** RED: cannot place either. GREEN: `rings`
   (x/y/z/radius, goal flag?) + race-mode collectibles format, store,
   editor buttons, wireframe markers, course view + sim (ring trigger
   completes the run when goal); e2e places + triggers both.
10. **Placeable hazards 1 (hammer/trampoline/ghost).** RED: kinds
    rejected. GREEN: format + validation + editor UI + sim/view
    parameterization (hammer supports + rotor, trampoline bounce,
    ghost chase/attack); e2e proves each behaves in a custom level.
11. **Placeable set 2 (loop/dragon/lamp/grandstand/goal-ring).**
    RED: kinds rejected. GREEN: same vertical slice; loop socket the
    truck can drive; dragon flame jet; lamp/grandstand scenery with
    colliders; goal ring distinct from plain rings; e2e per item.
12. **Fidelity clones.** RED: no showcase files. GREEN: build both
    clones through the editor APIs, screenshot real-vs-clone from
    matched bookmarks, iterate until high fidelity, save to
    `showcase/` and check in.
13. **Clone regression + final verification.** RED: no regression
    coverage. GREEN: e2e rebuilds equivalent levels from scratch,
    loads + playtests the saved showcase files to completion; full
    unit gate + full e2e + report.

## Verification Strategy

- Every chunk: RED test first, GREEN implementation, `tsc`, focused
  unit + e2e, full unit suite, production build, TDD log entry, commit.
- Screenshots live under `artifacts/` (gitignored) except the two
  `showcase/*.json` levels, which are reviewed generated content.
- Final chunk re-runs the whole unit suite and the full e2e sweep.
