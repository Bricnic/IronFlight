## Goal

Add three new official tracks (7–9) to the demolition-derby game, following the same plan-first, TDD, per-chunk-commit discipline as the six-track release: each level must be proven completable by real driving in 120–300 simulation seconds, every obstacle needs a passing test, new surfaces use locally cached Poly Haven CC0 textures, and a screenshot-based visual review must score ≥ 8/10 before release.

## Success Criteria

- Three playable tracks on level select (nine cards): Canyon Plunge (downhill ramp → canyon jump → swinging-axe gauntlet), Haunted Hollow (Halloween graveyard: destroy all gravestones while ghosts chase and damage the truck), Sky Slide (waterslide: forced descent, strafe-only steering, edge falls wreck, trampoline bounce into a golden ring wins).
- Every track completes from its real spawn in ≥ 120 s and ≤ 300 s of simulation time, driven with ordinary inputs only (throttle/steer/brake/handbrake, strafe on the slide); no teleports, velocity edits, granted objectives, damage bypasses, or timer extensions in completion tests.
- Every obstacle (ramp jump, canyon gap, each axe line, each gravestone, ghost pressure, slide sections/edges, trampoline, ring) has a test proving it can be overcome, plus negative tests (fall wrecks, ring-without-bounce fails, idling under a ghost wrecks).
- New textures come from polyhaven.com (CC0), are cached locally, and are recorded with source URLs and hashes in `public/textures/manifest.json` via the existing fetch script.
- Screenshots taken for all three tracks; visual self-review scores ≥ 8/10 against the rubric below, iterating on textures/poly count until it does.
- Each chunk below is its own commit; TDD log and verification report are checked in; all six existing tracks still pass.

## Approach

Mirror the proven six-track architecture rather than inventing new systems: typed catalog in `src/tracks.ts`, pure run logic in `src/track-run.ts`, data-driven geometry in `src/course.ts` / `src/course-view.ts`, deterministic driving through `window.__game.driveFrames`, and browser proof in `e2e/*.spec.ts`.

### Track roster

**7. Canyon Plunge — stunt race.** Spawn at the top of a very large downhill ramp; checkpoints run top → ramp base → jump lip → canyon far side → axe gauntlet → finish. The canyon gap is sized so only a committed downhill run clears it. Giant pendulum axes hang over the gap exit corridor and a post-canyon gauntlet: contact launches the truck along the swing tangent with modest damage (one strike per contact episode, reusing the `hammer-impact.ts` precedent), phased so a timed line passes cleanly. Provisional medals 150/210/270 s, limit 300 s.

**8. Haunted Hollow — demolition arena.** Halloween graveyard: 12 breakable gravestones (new `destructibles.ts` kind, destroyed by truck contact above a light impulse threshold) spread through fenced lanes with pumpkins, dead trees, and fog. Four kinematic ghost chasers use seek steering slightly slower than truck top speed; while a ghost overlaps the truck it drains integrity per simulation second, so parking under one wrecks the truck but a moving destruction route survives. New `TrackRun` demolition objective (destroyed-ID set); provisional medals 150/210/270 s, limit 300 s.

**9. Sky Slide — slide run.** A long descending water channel with banked curves. Water flow applies a downhill force every tick while the truck is on the slide; A/D strafes (lateral slide velocity, no yaw steering) via a per-track `controls: "strafe"` flag consumed where `Input` becomes forces. Unrailed edge sections drop to ground far enough below that the existing `y < -15` wreck rule fires. The slide ends in a giant trampoline that sets a large safe upward velocity with no damage, and touching the golden ring (proximity check) with the `bounced` flag set completes the run — reusing the legacy `{landed, loopCompleted}` flag precedent in `TrackRun.step`. Provisional medals 150/210/270 s, limit 300 s.

### Architecture

- `src/tracks.ts`: add three IDs, new `demolition` mode (graveyard) and slide/ring metadata; extend `validateTracks` (ascending medals, limit 300, feasibility-style bounds, unique thumbnails). All three tracks carry `limit: 300`, which the existing `TrackRun` timeout check already enforces in any mode.
- `src/track-run.ts`: add destroyed-set objective, `bounced`/`ringTouched` flags, keep medal logic pure; length is enforced by mandatory objective sequences plus geometry, and proven by reference runs.
- `src/course.ts` / `src/course-view.ts`: extend `courseAvailable`, add solids (ramp, canyon walls/gap, axe frames, gravestones/fences/mausoleum, slide channel, trampoline, ring) and hazards (`axe` kind in `src/hazards.ts`; ghost definitions in a new `src/ghosts.ts` with pure pursuit helpers).
- `src/simulation.ts` (`Simulation` class): water flow force, strafe force mapping, trampoline velocity set, ghost contacts + drain, axe launch impulses. No test-only geometry or gravity changes.
- `src/controls.ts` + HUD/results: strafe key mapping on the slide, demolition progress and ring/bounce indicators, nine-card select (update the "Six places" copy and per-mode labels in `src/level-select.ts`), three new thumbnails via `scripts/generate-track-thumbnails.mjs` (extend diagrams for ring/demolition markers if needed).
- Test drivers: raise the `driveTrack` loop cap (today 650 iterations ≈ 173 sim-s max; 300 sim-s at 16x needs ≈ 1200 iterations, ~19 s of simulated wall time per run) and add slide-strafe and demolition-seeking driver variants that still issue only ordinary inputs.

## Steps

Each chunk is RED → GREEN → REFACTOR with its tests, a TDD log entry, and its own commit, in this order:

0. **Baseline + plan mirror.** Run `npm run check` and `npm run build` green; check in this plan as `docs/EXPANSION_RELEASE_PLAN.md` (mirrors the `TRACK_RELEASE_PLAN.md` convention). No behavior changes.
1. **Catalog.** RED: new `tests/expansion-tracks.test.ts` fails on missing IDs/modes/limits/thumbnails. GREEN: three catalog entries, validation, regenerated thumbnails.
2. **Run-state extensions.** RED: unit tests for demolition progress, ring-after-bounce flags, timeout-at-300, and negatives (ring without bounce, bounce without ring, duplicate destruction) fail. GREEN: extend `TrackRun`; keep medals pure.
3. **Ghosts.** RED: chase/drain/escape tests fail. GREEN: `src/ghosts.ts` pursuit + sim contact drain + translucent view; tune so escape is possible.
4. **Axes.** RED: pendulum strike/launch/episode tests fail. GREEN: `axe` hazard kind, phased pendulums, launch impulse, matching view.
5. **Gravestones.** RED: per-stone breakability tests fail. GREEN: destructible kind wired to the demolition objective.
6. **Slide systems.** RED: flow/strafe/edge/trampoline/ring unit tests fail. GREEN: water force, strafe mapping, edge-fall wreck, safe trampoline, ring completion.
7. **Canyon Plunge course.** RED: full-run test fails. GREEN: ramp/canyon/gauntlet geometry; full browser drive completes in [120, 300] s with positive integrity.
8. **Haunted Hollow course.** RED: full-clear test fails. GREEN: graveyard arena + ghosts; full browser clear completes in [120, 300] s with positive integrity.
9. **Sky Slide course.** RED: full-run test fails. GREEN: slide/trampoline/ring; full browser run completes in [120, 300] s with positive integrity.
10. **Menu, HUD, results.** RED: browser tests for nine cards, demolition/ring HUD, strafe hints, results/retry/menu, narrow layout fail. GREEN: wire UI to the existing adapters.
11. **Textures + visual pass.** Extend `scripts/fetch-textures.mjs` with new Poly Haven IDs (canyon rock, graveyard dirt, weathered stone, slide surface, water — 2k maps for hero surfaces where size allows), update the manifest, capture screenshots, score against the rubric, and iterate (better maps, denser slide/stone/axe/ghost geometry) until ≥ 8/10.
12. **Whole-release verification.** All nine tracks driven end-to-end, existing suites + production build + smoke pass, medal calibration from honest measurements, checked-in verification report with times, headroom, and screenshot evidence.

## Validation Plan

- Unit/physics per chunk: `npx vitest run tests/<chunk-file>.test.ts` (real Rapier, no rendering) — must show RED before and GREEN after each chunk.
- Browser proof per track: `npx playwright test e2e/expansion.spec.ts --grep "<Track>"` — full spawn-to-objective runs asserting status `completed`, elapsed within [120, 300], integrity > 0, plus per-obstacle and negative assertions; screenshots attached per run.
- Regression + release: `npm run check`, `npm run build`, full `npm run test:e2e`, production preview + `node scripts/smoke-production.mjs` extended to nine cards with zero browser errors.
- Visual rubric (1 point each, target ≥ 8): readable route/next-target; distinct per-level palette; close-up texture fidelity; lighting/shadow readability; hazard telegraphing (axe swing, ghost glow, water flow); effects (splash, bounce, destruction debris); HUD/result fit at desktop and 390 px; thumbnail accuracy; no clipping/z-fighting in captures; bounded draw calls. Capture with a script mirroring `scripts/capture-hazard-qa.mjs` into `docs/expansion-qa/`; each iteration re-scores from fresh screenshots.
- Highest-risk validation: the 120–300 s full browser runs (long-horizon driver stability, ghost balance, slide edge fairness) — tune geometry and driver speed bands, never the completion rules, to land in the window.

## Risks / Open Questions

- `git` is not installed in this environment (the repo has `.git` but `where.exe git` finds nothing), so commits cannot be created here until git is on PATH; changes will still be grouped per chunk so each can be committed separately at publish time.
- Three-minute simulation runs lengthen e2e wall time; mitigated by 16x deterministic drivers that still execute every 120 Hz tick, plus the existing keyboard spot-checks for feel (especially strafe).
- Ghost difficulty and slide fairness are tuning risks: ghosts must be escapable and the slide must be finishable without pixel-perfect strafing; both are proven by the positive-integrity completion tests, not by weakening the rules.
- New Poly Haven asset IDs are resolved at execution time through the existing API-driven fetch flow and recorded in the manifest; if a preferred texture is unavailable, the nearest same-role CC0 map is substituted and noted.
- Open questions: None. Track names, IDs, ghost/stone counts, and provisional medal times above are reversible defaults — say the word to change any of them.

## Sources

- [Poly Haven license (CC0)](https://polyhaven.com/license)
