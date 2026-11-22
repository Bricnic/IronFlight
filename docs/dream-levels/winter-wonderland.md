# Winter Wonderland Dream — visual plan

Target: match `public/collections/winter-wonderland.jpg` (purple dusk,
snow peaks, gingerbread village + castle, skaters' ice pond, rainbow
road, ski lift, frosted pines, peppermint buoys, candy lamps, bunting,
balloons, gifts, sleds).

## Prefabs

Reuse: `christmas-tree`, `christmas-lantern`, `christmas-light-arch`,
`christmas-market-stall`, `candy-cane-arch`, `lollipop-stand`,
`snowman`, `bunting-string`, `balloon-pole`, `gift-box`.
New `WINTER_DREAM_PREFAB_KINDS` family (solid, non-lethal, dungeon pipe):

| Kind | Thumbnail element | Poly budget | Animation |
|---|---|---|---|
| gingerbread-house | candy-roof cottages | 4k | — (window glow emissive) |
| gingerbread-castle | hero castle, towers | 8k | — |
| frosted-pine | snow-dusted evergreen | 3k | — |
| peppermint-buoy | striped ice float | 1.5k | bob + spin |
| ski-lift-tower | candy tower + hanging cabin | 3k | cabin sway |
| sled | wooden sled | 1k | — |

Boosts: `christmas-tree` (denser snow tiers) if the thumbnail demands it
after first review.

## Level: `levels/official/winter-wonderland/Winter Wonderland Dream.json`

Twilight village tour (race, ideal ≥45s): bunting start gate → frosted
pine slalom → gingerbread square → frozen pond ring (road loop around
the ice) → ski-lift row → ramp flight over the gorge → castle
courtyard finish.

- Wings on the main path ~12s from spawn, before the ramp.
- Gold star on the flight arc.
- Medals from the measured ideal line (gold ≈ ideal × 1.5).
- Custom `winter-dream` background (purple dusk, snow hills, village,
  moon); snow_01 + new Gemini ice texture; rainbow road via tinted
  candy_cream_01 segments.
- Autoclip/zfight scan clean; proofs: completion, wings ≥10s, star.

## Validation and proofs

- Drive proof, embed check, registration test, dream-lock e2e extended.
- Screenshot-vs-thumbnail review from live chase views.
- Per-collection commit + push; count bumps 48→49 / 40→41.
