# Themed Level-Set Generation

You are generating a themed set of race levels and their assets for this repo
(a Vite + TypeScript + three.js + Rapier demolition-racing game).
This file is the whole assignment; `scripts/generate-levels.cmd` invokes it via
`muse exec --prompt-file`. The driver also exports `LEVEL_GEN_*` overrides.

## 1. Inputs

1. Read `config/level-gen.json`.
2. Apply overrides from environment variables when set (driver `KEY=VALUE`
   args arrive this way; all values are strings):
   `LEVEL_GEN_THEME`, `LEVEL_GEN_LEVELS`, `LEVEL_GEN_DECOR`,
   `LEVEL_GEN_DESTRUCTIBLES`, `LEVEL_GEN_BACKGROUNDS`, `LEVEL_GEN_LETHALS`,
   `LEVEL_GEN_GEMINI` (`true`/`false`), `LEVEL_GEN_MODE`,
   `LEVEL_GEN_GOLD_MIN`, `LEVEL_GEN_GOLD_MAX`, `LEVEL_GEN_IDEAL_MIN`,
   `LEVEL_GEN_IDEAL_MAX`, `LEVEL_GEN_PREVIEW_VEHICLE`.
   Numbers parse as integers; `gemini` parses as boolean.
3. Effective values decide everything below. Log them first.

## 2. Discover conventions (read-only first)

Inspect before writing: `src/custom-level.ts` (level JSON schema,
`PREFAB_KINDS`, `validateCustomLevel`, `mode:"race"` requirements),
`src/tracks.ts`, `src/official-levels.ts`, `levels/official/order.json`,
`levels/backgrounds/*.json` + `src/backgrounds.ts`, one existing race level,
`src/destructibles.ts`, `src/dungeon-hazards.ts`, `src/dungeon-physics.ts`,
`src/candy-view.ts` + `src/candy-lethal-view.ts` (prior themed set to mirror),
`scripts/capture-level-previews.mjs`, `scripts/level-zfight.mjs`,
`tests/candy-tracks.test.ts` (per-set test to mirror),
`tests/track-previews.test.ts` (auto-covers the lineup), and `package.json`
scripts. The gate is `npm run check` (vitest + `tsc --noEmit` + vite build).

## 3. Design images (reference only, never shipped)

For each of the N decor items, M destructibles, K backgrounds, L lethal
prefabs, plus one top-down minimap concept per level:

- If `gemini` is true: call `node scripts/gemini-image.mjs --prompt P --out F
  --keyfile <configured path>` (it auto-discovers `gemini*.txt` siblings and
  retries rejected keys). If every key fails, fall back to the session image
  tool and disclose the substitution per image.
- If `gemini` is false: use the session image tool directly.
- Save to `generated_images/<theme>-<slug>.png`. These stay untracked.

## 4. Implement

- Kind names: theme-prefixed, lowercase-hyphenated, zero hits for collisions.
- Decor: non-lethal scenery through the dungeon pipeline (consts, colliders,
  view builders, editor palette), following the candy precedent.
- Destructibles: prop kinds with heights/masses/debris, view builders.
- Backgrounds: `levels/backgrounds/<slug>.json` day/night variants validating
  under `validateBackgroundTemplate`.
- Lethals: insta-kill strike entries; strike geometry at car-body height
  (~y 1.0-2.2 above deck); animated views.
- Levels: `levels/official/<Name>.json`, `mode` from config, >=1 checkpoint
  (5 recommended), >=1 solid, medals `0 < gold < silver < bronze`,
  `goldMin <= gold <= goldMax`, `bronze <= limit`, varied difficulty across
  the set (narrowing road width, more lethals, longer ideal lines), all kinds
  used at least once across the set, no z-fighting (explicit vertical layers;
  scan every level with `scripts/level-zfight.mjs`), spawn/checkpoints on the
  ground slab, `backgroundTemplate` set.
- Ideal-line bounds (medal-independent, computed from the spawn+checkpoint
  polyline and the observed official pace band `PACE_LO = 3.5`,
  `PACE_HI = 12.7` u/s pinned in `tests/candy-tracks.test.ts`): a
  tool-assisted perfect run down the middle of the track, no shortcuts,
  takes `poly / PACE_HI >= idealMin` seconds; a slow steady finisher takes
  `poly / PACE_LO <= idealMax` seconds; and gold stays achievable by that
  ideal (`poly / PACE_HI <= gold`). A level whose perfect time is under
  `idealMin` is too short: extend the course, never loosen the bounds.
- Wire `levels/official/order.json` and update `tests/tracks.test.ts` lineup
  assertions the same way prior sets did.
- Tests: add `tests/<theme>-tracks.test.ts` mirroring
  `tests/candy-tracks.test.ts` (validates every new level, pins gold/limit,
  asserts the gold band AND the medal-independent ideal-line bounds,
  coverage of all new kinds, z-fight scan) plus focused
  `tests/<theme>-*.test.ts` suites for the new assets.

## 5. Previews (real in-game screenshots)

1. Start the dev server (`npm run dev`); never disturb other processes' ports.
2. `node scripts/capture-level-previews.mjs [--random-vehicle|--vehicle <id>
   per LEVEL_GEN_PREVIEW_VEHICLE] <new track ids...>`.
3. Stop only the server you started. Verify each PNG exists and is large/rich
   (the preview test enforces this); view at least one.

## 6. Validate

1. `node scripts/level-zfight.mjs scan` on every new level: 0 suspects.
2. Full `npm run check`: exit 0.
3. Confirm `tests/track-previews.test.ts` covers the new thumbnails.

## 7. Publish (only when green)

- `git fetch`, then `git status`: all changes must be explained by this run.
- If behind remote: `git pull --no-rebase`, re-run step 6 (full gate) on the
  merge. Never force-push, never rebase.
- `git add` named files only: levels, backgrounds, order.json, thumbnails,
  sources, tests. Never `generated_images/`, never broad `git add .`.
- Commit with a descriptive message, then `git push origin main`.
- If validation is red or the tree has unexplained changes: do NOT commit or
  push; report the blockers instead.

## 8. Report

Counts delivered vs config, per-level gold/silver/bronze/limit table, design
receipts (live Gemini vs fallback per image), validation evidence (gate exit
code, suite counts, z-fight results), push SHA or blockers. Never print API
keys or key material.
