# Editor clip tool design

## Current repair

Fairground's foundation and six ride-plaza slabs overlapped its six lava pools.
The plaza tops were at 0.05, above the lava top at 0.03. Raising the lava or
using a rendering offset would leave the physical obstruction in place.

The one-off repair subtracts the exact X/Z footprint of every pool from both
layers, through each slab's full thickness. The foundation becomes 15 disjoint
boxes and the six affected plazas become four boxes each. This removes 576
square metres from the foundation and 96 square metres from each affected
plaza. All surviving boxes retain the original Y, thickness, texture, color,
and lock state. Lava and rim geometry stay unchanged. Both level JSONs receive
the same repair, retaining their respective level names.

This repair is baked into the JSON. There is no runtime or editor clip feature
yet; the one-off script is not a dependency of the level.

## User workflow

1. Select one or more editable solids and choose **Clip**.
2. Draw a rectangular cutter in the viewport, or enter its X/Z bounds. Offer
   **Use selected object as cutter** to carve a hole matching an existing lava
   pit. This operation leaves the cutter object intact by default.
3. Show the removed volume in red, retained pieces in their existing materials,
   and a count of affected solids and resulting pieces. List all overlapping
   layers so a raised plaza cannot silently keep covering the hole.
4. **Apply** commits the preview as one undoable edit. **Cancel** discards it.
   Escape cancels. Locked objects require unlocking before they can be targets.

The first version supports horizontal, axis-aligned ground/road boxes and a
vertical rectangular through-cut. Unsupported rotated solids should be
identified in the preview rather than silently approximated by world bounds.
General rotated box cuts and polygon/circle cutters can follow as a separate
geometry-model extension.

## Geometry and persistence

- Work in world metres using double precision. Intersect cutter and target
  rectangles, then partition the remainder into non-overlapping left, right,
  bottom-middle and top-middle strips. Empty intersections leave the target
  untouched. A cutter enclosing the target deletes it.
- Apply multiple cutters to the retained rectangles. Merge adjacent pieces
  only when they share a full edge and identical material, height and metadata.
- Use a small documented epsilon for degeneracy, not for expanding holes.
  Reject non-finite dimensions. Report tiny slivers in preview; never retain
  zero-size boxes or overlapping strips. Shared edges are allowed; shared
  top-face area is not.
- Preserve Y, thickness, color, texture, name and metadata. Generate stable,
  unique child IDs and readable names such as `Foundation / piece 02`.
  Preserve world-aligned texture phase so the new seams do not reset tiling.
- Phase one persists the resulting ordinary solids in the existing JSON
  schema. Mesh rendering and collision geometry consume those same boxes.
  A future non-destructive operation history would need an explicit schema
  version; do not require editor-only brushes to load or play a saved level.
- Applying a cut clears selection of deleted objects, selects the retained
  pieces, invalidates overlap-picking caches, marks the level dirty, and updates
  the viewport. Undo/redo restores geometry, names, IDs, selection and locks
  atomically. Saving and playtesting use the normal validated level pipeline.
- A through-cut may expose empty space beneath lava. The preview should show
  the resulting collision opening; a separate option can add a pit bottom.

## Verification

- Unit cases: contained hole, edge/corner notch, full removal, no intersection,
  touching edges, repeated/overlapping cutters, several layers, degeneracy,
  metadata/UV preservation, unique IDs and area/volume conservation.
- Assert no pair of retained boxes overlaps with positive area and no retained
  box covers the cutter. Check both rendering and physical support.
- Editor E2E: draw and numeric entry, previews, cancellation, locked targets,
  one-step undo/redo, name ordering, save/reload and playtest.
- Screenshot E2E: every exposed lava pool remains visibly molten from nearby
  camera angles. Compare samples at the same world positions to detect flicker
  between lava and pavement, and include geometry checks so coincident faces
  cannot be concealed by a rendering workaround.

## Related selection behavior

Repeated left clicks in the same small viewport area cycle through unique,
unlocked logical objects, nearest to farthest from the camera, then wrap.
Fill/wireframe meshes and exit faces are one stop. Camera/content changes and
clicks elsewhere restart the stack. Dragging operates on the currently selected
object and does not advance the click cycle. This makes stacked clipping targets
reachable without requiring temporary deletion of foreground objects.
