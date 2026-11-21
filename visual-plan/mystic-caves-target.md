# Mystic Caves visual target

Three permanent-night cave race levels: Mystic Caverns, Firefly Grotto, Lavabridge Abyss.

## Palette

- Rock: deep indigo `#2a2350` to teal-slate `#3a5a5a`; fog near-black blue.
- Glows: mushroom cyan `#4ff5e0`, fairy magenta `#ff6fe0`, firefly gold `#ffd23b`,
  moth dust green `#80ec27`, crystal violet `#9a6fff`, lava orange `#ff5a1f`.
- Brass/copper trim on bridges; rickety planks weathered brown.

## Textures (public/textures, diffuse+normal+roughness + manifest)

- `cave_wall_01`: user-supplied Gemini cave wall (tessellated repeat 6-10x).
- `glow_moss_01`: dark mossy stone with glowing cyan specks (Gemini).
- `crystal_vein_01`: near-black rock with violet crystal veins (Gemini).
- Normal maps derived from diffuse luminance (Sobel); roughness from inverse glow.

## Background: mystic-cave (levels/backgrounds/mystic-cave.json)

- Sky top/horizon near-black blue; fog color `#0a0e24`, near 40, far 220.
- Hemi dim (0.35), env 0.15, underground true; rock-wall + glow-crystal shapes.
- Permanent night: weather.night forced true on mystic levels.

## Lighting

- Headlights dimmed on mystic levels: Tuning `headlightDim` 0.1-1.0, default 0.35,
  debug slider in debug menu; scales spot 3500, cone opacity 0.06, bulb 3.
- Glow decor: emissive + additive makeGlowTexture sprites; real PointLight pool
  cap 8, nearest-to-car (candle-lights pattern).

## Prefabs (new MYSTIC family, high-poly primitives)

- `cave-caterpillar`: 8 segments (~2.5k tris), emissive spots, crawl anim;
  random destinations within 100u of spawn; touch = poison.
- `cave-moth`: pelican-like flyer, flapping wings; sprinkles green dust that
  falls, piles, fades over 3s; dust/pile/crash = poison.
- `cave-bat`: perched clusters on walls/ceilings; flee (flap away + fade) when
  car within 18u; harmless; jump-scare placement around corners.
- `glow-mushroom`: cap + gills + stem (~1.2k tris), cyan emissive + glow sprite.
- `cave-fairy`: small body + additive wings, magenta glow, bobbing wander.
- `firefly`: gold glow-sprite swarm, wandering Lissajous paths.

## Poison (venom, 3s)

- View: camera rotateZ(PI) + canvas blur/cloudy filter, fading with remaining.
- Damage: 25% of original integrity over 3s (smolder-style tick) + 1 part lost
  (breakRandomPart) at onset; vision fully restored after.

## Levels

- Race mode, 4-6 checkpoints, pace band 3.5-12.7 u/s (gold pace), tracks long
  with smooth arched turns (no kinked rectangles), heavy verticality.
- Mystic Caverns: winding tunnels opening into a great cavern.
- Firefly Grotto: fairy/firefly grotto + collapsing plank bridge (pieces fall
  behind the car, FragileIce-analogue timing).
- Lavabridge Abyss: narrow arched bridge over a lava lake.
- Exactly one gold-star-1 each (>=15u off ideal line, <=30u of landmark,
  hidden from spawn, headless-drive collected).

## Acceptance

- npm run check green; mystic-tracks.test.ts pace/geometry suite green.
- Screenshots of each level vs this PRD: palette, glow, no z-fighting.
- Playtest: drive each level spawn->finish; poison + bats + bridges observed.
