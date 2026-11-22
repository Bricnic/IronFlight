# Sweet Celebrations Dream — visual plan

Target: match `public/collections/sweet-celebrations.jpg` (pink Candy Land
birthday: bunting, balloon poles, lollipop swirls, gumdrop trees, tiered
cakes with lit candles, cupcakes, gifts, party hats, candy-cane arch,
cherry hills, confetti).

## Prefabs

Existing kinds already cover the arch, trees, lollipops, cakes, and gifts
(`candy-cane-arch`, `gumdrop-tree`, `lollipop-stand`,
`birthday-cake-grand`, `christmas-gift-wall`), so this collection adds a
small `SWEET_DREAM_PREFAB_KINDS` family and boosts the reused heroes:

| Kind | New? | Poly budget | Animation |
|---|---|---|---|
| bunting-string | new | 2k | flag wave |
| balloon-pole | new (static; `helium-balloon` is a grabbing hazard) | 3k | cluster sway |
| cupcake | new | 2k | — |
| gift-box | new (pastel single; gift-wall is a Christmas wall) | 1.5k | — |
| party-hat | new | 1k | — |
| gumdrop-tree | boost existing | 4k+ | — |
| candy-cane-arch | boost existing | denser posts/arc | — |
| birthday-cake-grand | reuse, boost if thumbnail demands | — | existing |

New kinds live in `src/sweet-dream-view.ts` with dims in
`src/dungeon-hazards.ts`, dispatch from `buildDungeonModel`, poses via
`poseSweetDream`, and solid bumpable colliders in `dungeon-physics`
following the candy-decor precedent (no strike entries). The editor
palette picks them up automatically from `PREFAB_KINDS`.

## Level: `levels/official/sweet-celebrations/Sweet Celebrations Dream.json`

Candy Land tour (race, ideal line ≥45s, well above the 30s minimum):
frosting start plaza → gumdrop forest slalom → lollipop row →
cupcake-circle courtyard (grand cake looms beside it; its r70 tiers are
backdrop, not track) → candy-cane arch gate → gift-box canyon → ramp
launch (flight!) over a chocolate gap → cherry-hill climb → finish.

- Wings on the main path ~12s from spawn, before the ramp.
- Gold star placed on the flight arc (best collected while flying).
- Medals from the measured ideal line (gold ≈ ideal × 1.5).
- Smooth arc turns; autoclip pass on intersecting roads/walls; no z-fighting.

## Validation and proofs

- `node scripts/ideal-line.mjs … --min 30`, `validateCustomLevel` green.
- Drive proof: course completes; wings collected ≥10s in; star reachable.
- Screenshot-vs-thumbnail review; e2e dream-lock coverage on this collection.
- Unit tests for the prefab family (build + triangle floors + poses).

## Polish backlog (≥1h)

- Poly boost pass on the hero cake + trees; Gemini texture only if the
  flat candy colors fall short of the thumbnail (likely: frosting swirl).
- Confetti-atmosphere check; candle glow tuning against the pink sky.
- Per-collection commit + push with the DREAM thumbnail + order/collection
  wiring + count-test bumps (47→48 levels, 39→40 file tracks).
