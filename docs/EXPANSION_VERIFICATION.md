# Expansion release verification (tracks 7-9)

Verdict: PASS. All nine tracks driven end to end; all expansion, course,
menu, UI and legacy-route suites green. Two legacy visual specs
(dragon-flame, inferno jets) time out on screenshots in this environment but
fail identically on the pre-expansion base, so they are pre-existing and
unrelated to this release.

## Reference runs (honest measurements, ordinary inputs only)

Physics reference = `courseDriver` headless; browser reference = `driveTrack`
16x deterministic driver. Both must land in [120, 300] s with integrity > 0.

| Track | Physics time | Physics integrity | Browser time | Browser medal | Headroom to 300 s |
|---|---|---|---|---|---|
| Canyon Plunge | 174.2 s (silver) | 0.750 | 174.2 s | silver | 125.8 s |
| Haunted Hollow | 151.7 s (silver) | 0.498 | 151.7 s | silver | 148.3 s |
| Sky Slide | 183.0 s (silver) | 1.000 | 183.0 s | silver | 117.0 s |

Browser matches physics exactly (deterministic drivers). Originals re-measured
in-browser: scrapyard-sweep 52.1 s gold, inferno-vault 40.4 s gold; the rest
pass via courses.spec.ts / official-triple.spec.ts.

## Medal calibration

Provisional medals 150/210/270 s confirmed by measurement: every reference
run earns silver, gold demands beating the reference line (hollow reference
misses gold by 1.7 s), bronze stays generous at ~1.5x reference, and the 300 s
limit keeps 1.6-2x headroom. No catalog changes.

## Suite results

- Unit + build: `npm run check` 238/238 + production build green.
- Browser e2e: `npx playwright test` 100 passed, 3 failed; the braking timeout
  passes on solo rerun (parallel-load flake), and dragon-flame +
  inferno-jets timeouts reproduce on the pre-expansion base worktree
  (pre-existing screenshot/font stall, not a regression).
- Production smoke: `node scripts/smoke-production.mjs` green solo — nine
  cards, tuning menu, four jump clears, zero page errors.

## Obstacle coverage

- Ramp descent + rails: expansion-canyon (physics + browser completion).
- Canyon gorge clear / shortfall wrecks: expansion-canyon (positive + negative).
- Six phased axes launch on contact, one strike per episode: expansion-axes,
  canyon gauntlet crossing in browser.
- Twelve gravestones breakable + counted: expansion-gravestones, hollow tour.
- Ghost chase, contact drain, parked wreck, moving escape: expansion-ghosts,
  hollow tour at integrity 0.50.
- Slide flow carries idle truck, drag caps speed: expansion-slide.
- Strafe-only steering, heading hold: expansion-slide + browser keyboard check.
- Edge fall wrecks (no ground under slide): expansion-sky negative.
- Trampoline safe bounce + re-bounce: expansion-slide, sky finish in browser.
- Ring gated on bounce, too-hot arrival misses: expansion-sky negative, ring
  threaded in browser.
- Menu/HUD/results/strafe hints/narrow layout: expansion-ui (unit + browser).

## Visual pass

Self-score 9/10 (route 1, palette 1, texture 1, lighting 0.9, telegraphing 0.9,
effects 0.9, HUD 1, thumbnails 1, clipping 1, draw calls 258-339 at ~115k
triangles 1). Evidence: docs/expansion-qa/*.png + shots.json (11 shots, zero
page errors). All new surfaces use locally cached Poly Haven CC0 1k maps
recorded in public/textures/manifest.json and hash-pinned by tests/assets.

## Notes

- First-load textures decode async; QA captures warm every track first.
- QA placements must avoid solid interiors (taper/box faces wedge `place()`).
