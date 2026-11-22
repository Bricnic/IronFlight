# Stunt Parks Dream — visual plan

Target: match `public/collections/stunt-parks.jpg` (candy-pink
fairground: ferris wheels with cupcake gondolas, vertical loops,
spiral coaster, drop tower, ring of fire, rainbow grandstands,
carousel, lollipop trees, bunting, confetti, pastel sky).

## Prefabs

Reuse: `carousel` (r26, far roadside), `trampoline` (roadside pads),
`lollipop-stand`, `hot-air-balloon` (mobiles), `lamp`.
New `STUNT_DREAM_PREFAB_KINDS` family (solid, non-lethal, dungeon pipe):

| Kind | Thumbnail element | Poly budget | Animation |
|---|---|---|---|
| ferris-wheel | big wheel, gondolas | 8k | slow spin |
| ring-of-fire | flaming drive-through | 3k | flame flicker |
| drop-tower | striped tower + car | 3k | — |
| ticket-booth | booth + awning | 2k | — |
| marquee-star | star sign, bulbs | 2k | bulb pulse |

## Level: `levels/official/stunt-parks/Stunt Parks Dream.json`

Midway grand tour (race, ideal ≥40s): ticket gates → lollipop
lanes → ferris court → ring-of-fire arch → drop-tower row →
ramp flight over the midway gap → carousel green → star finish.

- Pastel track: butt-jointed colored tiles (pink/mint/lavender/
  peach deep bases for the hard sun), wood-track joint gaps.
- Ground: concrete + rose tint (pastel pavement).
- Wings on the main path ~12s from spawn, before the ramp.
- Gold star on the flight arc.
- Medals from the measured ideal line (gold ≈ ideal × 1.5).
- Background: custom `stunt-dream` (pink day, tents, balloons,
  flags, white clouds).
- Autoclip/zfight scan clean; proofs: completion, wings ≥10s, star.

## Validation and proofs

- Drive proof, embed check, registration test, wiring guard covers this
  collection automatically.
- Screenshot-vs-thumbnail review from live chase views.
- Per-collection commit + push; count bumps 51→52 / 43→44.
