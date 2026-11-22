# Toybox Adventures Dream — visual plan

Target: match `public/collections/toybox-adventures.jpg` (sunlit
playroom tabletop: rainbow wooden train track, LEGO brick arch and
towers, giant rubber duck, d20, domino rows, green gummy bear, toy
train, board-game stacks, pencils, paint pots, toy blocks, balloons).

## Prefabs

Reuse: `boost-pad` (roadside toys), `hot-air-balloon` (playroom
mobiles), `loose-blocks` scatter. (Teeter is a 16×30 drive-on
bridge, mailbox/trampoline semantics unfit — skipped.)
New `TOYBOX_DREAM_PREFAB_KINDS` family (solid, non-lethal, dungeon pipe):

| Kind | Thumbnail element | Poly budget | Animation |
|---|---|---|---|
| rubber-duck | giant bath duck | 3k | rock + bob |
| brick-arch | LEGO arch over road | 6k | — (studs) |
| domino | standing dominoes | 2k | — |
| toy-die | spinning d20 | 1k | slow spin |
| gummy-bear | translucent bear | 5k | wobble pulse |
| toy-train | wooden engine | 4k | — |

## Level: `levels/official/toybox-adventures/Toybox Adventures Dream.json`

Tabletop grand tour (race, ideal ≥40s): pencil rails → domino
rows → brick arch → duck corner → rainbow square → book canyon
→ ruler ramp flight over the floor gap → block-stack landing →
gummy finish.

- Rainbow road: butt-jointed colored segments (red/blue/yellow/
  green, same height, edges only) — no texture risk, no z-fight.
- Ground: Gemini `toy_table_wood` (warm beech tabletop).
- Wings on the main path ~12s from spawn, before the ramp.
- Gold star on the flight arc.
- Medals from the measured ideal line (gold ≈ ideal × 1.5).
- Background: custom `toybox-dream` (sunny day, toy-block rings,
  balloons, white clouds).
- Autoclip/zfight scan clean; proofs: completion, wings ≥10s, star.

## Validation and proofs

- Drive proof, embed check, registration test, wiring guard covers this
  collection automatically.
- Screenshot-vs-thumbnail review from live chase views.
- Per-collection commit + push; count bumps 50→51 / 42→43.
