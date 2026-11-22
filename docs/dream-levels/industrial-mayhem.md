# Industrial Mayhem Dream — visual plan

Target: match `public/collections/industrial-mayhem.jpg` (waterfront
factory at dusk: smokestacks, cranes, power pylons, scrapyard,
gears, pipes, slime/lava channels, excavators, blue-to-pink sky).

## Prefabs

Reuse: `barrel` (smashable roadside), `boost-pad`, `lamp`
(floodlights).
New `INDUSTRIAL_DREAM_PREFAB_KINDS` family (solid, non-lethal,
dungeon pipe):

| Kind | Thumbnail element | Poly budget | Animation |
|---|---|---|---|
| smokestack | tapered stack, beacon | 3k | beacon pulse + smoke rise |
| power-pylon | lattice tower | 4k | — |
| gear-works | meshed gears | 4k | counter-rotation |
| scrap-pile | crushed cars, gears | 4k | — |
| pipe-arch | pipe gantry over road | 2k | — |
| slime-tank | glass slime tank | 3k | bubble bob |

## Level: `levels/official/industrial-mayhem/Industrial Mayhem Dream.json`

Foundry waterfront tour (race, ideal ≥40s): pipe gates →
scrap lanes → gear court → pylon row → stack alley → ramp
flight over the coolant gap → tank farm → crusher finish.

- Hazard track: butt-jointed tiles (safety yellow/graphite),
  joint gaps, deep bases for the hard sun.
- Ground: concrete + cool gray tint (pavement).
- Wings on the main path ~12s from spawn, before the ramp.
- Gold star on the flight arc.
- Medals from the measured ideal line (gold ≈ ideal × 1.5).
- Background: custom `industrial-dream` (dusk sky, stacks,
  cranes, containers, white clouds).
- Autoclip/zfight scan clean; proofs: completion, wings ≥10s, star.

## Validation and proofs

- Drive proof, embed check, registration test, wiring guard covers this
  collection automatically.
- Screenshot-vs-thumbnail review from live chase views.
- Per-collection commit + push; count bumps 52→53 / 44→45.
