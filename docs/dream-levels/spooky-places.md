# Spooky Places Dream — visual plan

Target: match `public/collections/spooky-places.jpg` (purple night,
moon shard, glowing ghosts, bats, jack-o'-lanterns, dead trees,
tombstones, iron fence, skulls, cobblestone path, stone bridge over a
spectral river, gargoyle gate, glowing mushrooms, halloween bunting).

## Prefabs

Reuse: `gravestone`/`skull`/`pumpkin` smashable props, `ghost`
prefabs (GhostSwarm), `cave-bat`, `glow-mushroom`, `balloon-pole`,
`gift-box`, `lollipop-stand`.
New `SPOOKY_DREAM_PREFAB_KINDS` family (solid, non-lethal, dungeon pipe):

| Kind | Thumbnail element | Poly budget | Animation |
|---|---|---|---|
| jack-o-lantern | lit pumpkins on posts | 2k | flame flicker inside |
| dead-tree | gnarled trees + hanging minis | 4k | — |
| gargoyle | perched statues, glowing eyes | 4k | — (eye glow pulse) |
| iron-fence | fence runs with posts | 2k | — |
| spooky-bunting | orange/purple/black garland | 2k | flag wave (shared bunting core) |

## Level: `levels/official/spooky-places/Spooky Places Dream.json`

Night graveyard tour (race, ideal ≥45s): iron gates → tombstone
lanes → dead-tree grove → pumpkin patch → stone bridge over the
spectral river → gargoyle gate → ramp flight over the abyss →
mausoleum finish.

- Wings on the main path ~12s from spawn, before the ramp.
- Gold star on the flight arc.
- Medals from the measured ideal line (gold ≈ ideal × 1.5).
- Background: custom purple-dusk (`spooky-dream`, no forceNight —
  the fixed night rig clamps every sky to navy, so dusk carries the
  thumbnail's violet).
- Ground/road: dark grass + stone reuse; Gemini texture only if review
  demands (cobblestone?).
- Autoclip/zfight scan clean; proofs: completion, wings ≥10s, star.

## Validation and proofs

- Drive proof, embed check, registration test, wiring guard covers this
  collection automatically.
- Screenshot-vs-thumbnail review from live chase views.
- Per-collection commit + push; count bumps 49→50 / 41→42.
