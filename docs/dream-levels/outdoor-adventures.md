# Outdoor Adventures Dream — visual plan

Target: match `public/collections/outdoor-adventures.jpg` (canyon
at pink sunset: waterfalls, river rafts, stone bridge, pines,
cacti, mesas, trail signs, compasses, paw-print trail).

## Prefabs

Reuse: `cacti-patch`, `sign`, `barrel` (trail drums),
`loose-blocks`.
New `OUTDOOR_DREAM_PREFAB_KINDS` family (solid, non-lethal,
dungeon pipe):

| Kind | Thumbnail element | Poly budget | Animation |
|---|---|---|---|
| pine-tree | tall pines | 3k | — |
| mesa-rock | layered butte | 3k | — |
| trail-arch | log trailhead gate | 2k | — |
| waterfall | cliff + falls + foam | 4k | foam pulse |
| raft-pond | pond + log raft | 3k | — |
| compass-rock | boulder + compass | 2k | needle spin |

## Level: `levels/official/outdoor-adventures/Outdoor Adventures Dream.json`

Canyon rim tour (race, ideal ≥40s): trailhead gates →
pine lanes → mesa court → waterfall bend → cactus row →
ramp flight over the gorge → raft pond → bridge finish.

- Trail tiles: butt-jointed colored tiles (tan/rust/teal deep
  bases), joint gaps.
- Ground: desert sand + warm tint.
- Wings on the main path ~12s from spawn, before the ramp.
- Gold star on the flight arc.
- Medals from the measured ideal line (gold ≈ ideal × 1.5).
- Background: custom `outdoor-dream` (pink sunset, mesas,
  pines, white clouds).
- Autoclip/zfight scan clean; proofs: completion, wings ≥10s, star.

## Validation and proofs

- Drive proof, embed check, registration test, wiring guard covers this
  collection automatically.
- Screenshot-vs-thumbnail review from live chase views.
- Per-collection commit + push; count bumps 53→54 / 45→46.
