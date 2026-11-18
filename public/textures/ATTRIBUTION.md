# Texture attribution (birthday cake refresh)

## Poly Haven (CC0, public domain)

- `marble_01_*` — smooth white marble used as the glossy icing/fondant
  surface on the birthday cake centerpieces.
  Source: <https://polyhaven.com/a/marble_01>
  License: CC0 (see `manifest.json` for file hashes and download URLs).

Food-specific textures (frosting, sponge, chocolate) do not exist in the
Poly Haven catalog (verified via the API: `cake`, `chocolate`,
`strawberry`, `waffle_01`, `ice_cream`, `sugar`, `candy_01`, `cream`,
`cheese_01` all 404; `white_marble` ships no normal map so it cannot
satisfy the repo's diffuse/normal/roughness manifest contract). The cake
sponge crumb, chocolate streaks, and frosting swirls below are
procedural canvas textures instead (see `src/birthday-view.ts`,
`cakeSideTexture` / `cakeTopTexture`), which also match the game's
stylized look better than photoscanned stone.

## Procedural (repo-authored, no license needed)

- Sponge crumb speckle, chocolate streaks, frosting swirl: generated at
  runtime on `<canvas>` with deterministic fills. No third-party source.
