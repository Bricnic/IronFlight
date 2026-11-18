# Cake visual target (Stage 1)

Before reference: [refs/cake-before.png](refs/cake-before.png) — flat mud-rock
box tiers. This doc locks the replacement look and the drivable-top contract
later stages build on (trampoline / ramp / star placements).

## Palette

| Swatch | Hex | Use |
| --- | --- | --- |
| Chocolate sponge | `#6b3a1e` | tier walls (even tiers), cherry stem `#4a2410` |
| Pink sponge | `#ff7fa8` | tier walls (odd tiers) |
| Icing white | `#fff6f0` | icing sheets (over `marble_01`), even-tier drips |
| Drip pink | `#ff5f9e` | odd-tier drip skirts + tips |
| Mint | `#63d9b5` | piped wall bead on every tier |
| Cherry red | `#e02040` | cherry topper ball (clearcoat gloss) |
| Sprinkles | `#ff5f9e` `#63d9b5` `#4fa8ff` `#ffd23b` `#ffffff` | flat scatter on every tier top |

Shared builder: `buildBirthdayCake` in `src/birthday-view.ts`, driven by the
`BIRTHDAY_CAKES` spec in `src/dungeon-hazards.ts`. Both cakes share one code
path; only the tier list differs.

## Part list (per tier)

- Sponge body: lathe profile, sharp rim, flat top cap at exactly the tier
  top Y; radial segments `max(96, 3r)`; procedural crumb canvas texture.
- Icing sheet: flat disc at top + 0.04, marble-icing physical material
  (clearcoat 0.5).
- Drip skirt: scalloped band over the rim (drip every ~5u, 1.3–3.4u long),
  DoubleSide, plus a rounded tip sphere on each long drip.
- Wall bead: mint torus on the wall 0.4 below the top (never on the drive
  surface).
- Sprinkles: flat deterministic scatter, ≤0.3u proud of the top.
- Cherry topper (top tier only): stem cylinder matching its collider
  exactly, glossy cherry ball clearing truck roofs, mint leaf.

## Top heights (LOCKED, covered by `tests/birthday-cake.test.ts`)

- Birthday Cake Circuit (`birthday-cake-grand`, tiers r70 / r50 / r30):
  tops at **Y = 10 / 20 / 30**. Overall top Y = 30.
- Birthday Table Loop (`birthday-cake-table`, tiers r50 / r30):
  tops at **Y = 8 / 16**. Overall top Y = 16.
- Cherry stems: r = 1.2, h = 7 above the top tier (collider + visual).
- Flat drivable radius per tier ≈ r − 0.5 (icing sheet inset); only
  sub-unit trim sits outside the cylinder collider shells.
- Physics note: tall thin dynamics (candles) get walked off Rapier
  cylinder caps within ~6u of the rim — keep future top props ≥10u
  inside the rim. Cars (wide wheelbase) are unaffected.

## Acceptance criteria

- `npx tsc --noEmit` clean; `tests/birthday-cake.test.ts` green.
- Close-ups in `visual-plan/review/` show vivid pink/white/chocolate/mint
  icing cakes with drips, sprinkles, and cherry — no mud rock.
- Tops read flat and landable from the top-down shots; cherry centered.
- `public/tracks/birthday-cake-circuit.png` and
  `public/tracks/birthday-table-loop.png` re-captured from the new build.
