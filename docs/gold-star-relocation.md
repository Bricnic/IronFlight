# Gold-star relocation (stage 1)

How moved gold stars invalidate stale banked records, and how the
spawn-visibility probe proves every star hides from the spawn camera.

## Relocation registry

File: `levels/gold-star-migrations.json`. Maps `"trackId:starId"` -> `true`,
one entry per star that was MOVED after banking began:

```json
{
  "foundry-run:gold-star-1": true,
  "custom:fairground:gold-star-1": true
}
```

Custom track ids already contain a colon, so those keys hold two. The file
starts EMPTY (`{}`); later stages add entries ONLY for stars they move.

Helper: `isStarRelocated(trackId, starId)` in
`src/gold-star-migrations.ts`.

## Banked record shape

`GoldStars` (`src/gold-stars.ts`) persists
`{ version: 1, banked: { [trackId]: { [starId]: { found: true, coords } } } }`
where `coords` is `{ x, y, z }` copied from the star definition at collect
time (`src/main.ts` banks them). Records written before coordinates existed
(legacy `{ [trackId]: string[] }` saves, or `found: true` with no `coords`)
load as found-with-explicitly-missing-coords.

## Level-select check

`GoldStars.isLit(trackId, star, relocated)` (`src/level-select.ts` calls it
per star icon):

- Not found -> gray, always.
- Found, NOT relocated -> lit (legacy found-only rule; old records stay valid).
- Found, relocated -> lit only if banked coords EXACTLY equal the star's
  current `{ x, y, z }` (`===` per axis). Missing coords count as stale
  (gray). Re-collecting a moved star refreshes its banked coords.

## Spawn-visibility probe

Harness: `window.__game.starHiddenFromSpawn(trackId)` (`src/harness.ts`,
`src/main.ts`, `GameView.starVisibility` in `src/view.ts`). It loads the
track, settles ~1s (60 physics frames at spawn), then reports:

EXACT RULE: `hidden = (!inFrustum) || occluded || (distance > 150)`

- `inFrustum`: star center inside the settled spawn-camera frustum
  (three.js `Frustum.containsPoint`).
- `occluded`: three.js raycast from the camera to the star center hits
  solid level geometry more than 1u short of the star. Occluders are the
  course solids, lamp posts, and grandstands (`CourseView.occluderMeshes`),
  or the arena/course meshes on the legacy lane stage. Stars, labels,
  ghosts, effects, the truck, and the background never occlude.
- `distance`: camera-to-star distance; beyond `STAR_RECOGNITION_RANGE`
  (150u, `src/view.ts`) the star is unrecognizable and counts as hidden.
- `reason` names the first satisfied hidden-term in the order
  `outside-frustum`, `occluded`, `beyond-range`, else `visible`.

Sweep: `e2e/gold-star-visibility.spec.ts` runs the probe for all 44 tracks,
screenshots each spawn view to `test-results/gold-star-spawn-<id>.png`, and
asserts `hidden=true`. Filter to one track with
`npx playwright test gold-star-visibility -g <track-id>`.

## Track id list (44)

Legacy 8 (`TRACK_IDS` in `src/tracks.ts`):

- triple-loop, foundry-run, skyline-circuit, scrapyard-sweep,
  inferno-vault, canyon-plunge, haunted-hollow, sky-slide

Official 36 (`custom:<slug>` of each level name, `levels/official/`):

- custom:fairground, custom:dungeon, custom:jurassic-junction,
  custom:emberfall-causeway, custom:chompworks, custom:machine-gauntlet,
  custom:amber-undertow, custom:fireside-sonata, custom:pumpkin-pass,
  custom:booster-gap, custom:evil-tube-run, custom:slime-surge,
  custom:ring-chase, custom:block-party, custom:frostfire-pass,
  custom:volcano-loop, custom:toybox-road, custom:gumdrop-meadows,
  custom:lollipop-loop, custom:peppermint-pass, custom:chocolate-chasm,
  custom:sugar-rush-summit, custom:tinsel-town, custom:mistletoe-mile,
  custom:nutcracker-run, custom:sleigh-bell-sprint,
  custom:north-pole-summit, custom:tabletop-brawl, custom:sharkbite-run,
  custom:rock-and-roll, custom:shipyard, custom:spider-hollow,
  custom:screwball-run, custom:birthday-cake-circuit,
  custom:birthday-table-loop, custom:bouncy-house

Every track hides exactly one `gold-star-1` (legacy positions in
`src/tracks.ts`, official positions as `gold-star` prefabs in
`levels/official/*.json`).
