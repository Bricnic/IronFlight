Google Doc: https://docs.google.com/document/d/1oyz52eFcbRmh5SKPqrrowwraZRPU8f-e1iCF-pbw6ag

Demolition Derby: Six-track release plan
Implementation plan • October 20, 2026

Outcome and constraints
Preserve the current game as the first official track, Triple Loop. Add five distinct tracks, open on a six-card level select screen, and award bronze/silver/gold medals from each track’s best completed time. This document is written and verified before any implementation code changes.
Existing truck handling, tuning, colors, damage, lava, props, camera controls, and the destruction lab remain available. Preserve all current uncommitted playtest work in a dedicated baseline commit before adding the new systems. Do not combine that historical work with new track commits.
Use the current Three.js/Rapier simulation and its fixed 120 Hz timestep. Official track completion must come from actual driving and objective checks. Test helpers may issue ordinary throttle, steering and braking; they may not teleport, edit velocity, mark checkpoints, grant collectibles, bypass damage, or extend the timer during completion tests.
The existing level contains three parallel jump-and-loop lanes. “Triple Loop” names that complete existing arena; a timed attempt chooses one lane, clears its jump and physical loop, and reaches the exit. Keep all three lanes, hazards and visuals, rather than rebuilding a simplified substitute.

Track roster
1. Triple Loop — stunt race
Keep the complete original arena and its Ignition, The Gauntlet and Danger Zone lanes. The official objective is the selected lane’s jump, its boost/dragon approach, its real loop traversal and an exit finish after the loop. Passing the old jump-only finish cannot win the official track. Default entry is Ignition; lane buttons restart a chosen lane. Medal records distinguish lane variants so an easier lane cannot overwrite a harder lane’s record.
Initial medal targets: gold 35 seconds, silver 50 seconds, bronze 75 seconds. These are provisional until the normal-physics completion run is measured. Run full spawn-to-exit browser tests, including every lane. Verify apex contact, loop completion and upright exit, not merely reaching an exit coordinate.

2. Harbor Sprint — checkpoint race
A fast, broad route through a dockyard: opening straight, sweeping left/right bends, a cargo-container chicane and a final straight. Painted asphalt, blue harbor boundaries, containers, light poles and clear checkpoint gates make the route readable. Concrete barriers define the driveable challenge without invisible walls.
Require every checkpoint in order before crossing the directional finish. Initial medal targets: 35 / 50 / 75 seconds for gold / silver / bronze. Verify a complete drive from spawn, no checkpoint skipping, and finish rejection from the wrong direction.

3. Foundry Run — obstacle race
A foundry route with a small launch ramp, staggered steel obstacles, rotating hammer machinery beside the driving line and timed flame emitters. Provide a clear, achievable route through each obstacle section. Use physical supports, collidable objects and visible hazard timing; do not rely on hidden scripted damage.
Checkpoint sequence: approach, ramp/landing zone, machinery corridor, flame section, finish. Initial medal targets: 40 / 60 / 90 seconds. Completion test uses ordinary steering, throttle and braking, retains positive integrity, and confirms the required sections were traversed.

4. Skyline Circuit — circuit race
A closed, wide circuit with sweeping corners, a technical chicane and a start/finish gantry. Complete one full lap, visiting ordered sector checkpoints before returning through the start/finish line. The road is visibly distinct from the surrounding terrain; barriers and trackside structures support the racing theme.
Initial medal targets: 45 / 65 / 95 seconds. Verify one complete physical lap, reject an immediate start-line recrossing and reject missing sectors. The same vehicle physics and steering tuning apply.

5. Scrapyard Sweep — timed collection arena
Collect twelve visible salvage tokens spread around a scrapyard, with containers, scrap piles, breakable props and slalom lanes. The collection route should include turns and obstacles, not simply a straight line of tokens. Tokens are unique, clearly numbered or otherwise visible, and collected by truck proximity during actual play.
Time limit: 120 seconds. Gold at 60 seconds, silver at 90, bronze at 120. A full browser driving test must collect everything in no more than 90 seconds, demonstrating at least 25% spare time. An incomplete collection at the deadline loses; there is no duplicate pickup farming.

6. Inferno Vault — timed hazard arena
Collect ten energy cores in a larger industrial arena divided into readable obstacle zones: flame gantries, machinery, protected lava basins and safe connecting lanes. Cores sit on physically reachable ground, outside lava and solid obstacles. Multiple traversal choices are possible; a sensible route avoids unavoidable damage or waiting for an entire timer cycle.
Time limit: 150 seconds. Gold at 75 seconds, silver at 110, bronze at 150. Full browser completion must finish in no more than 112.5 seconds, again retaining at least 25% spare time and positive integrity.

Shared player experience
Start with a level select screen rather than an already-running truck. Each card has its track name, an accurate locally shipped thumbnail, objective summary, medal targets and the player’s best result. Use recognizable track-specific thumbnails rendered from the actual scene or faithful route diagrams; do not reuse the same generic image for every track.
Starting a track begins a fresh attempt from its spawn, with ordered checkpoint or collectible progress, elapsed time and arena time remaining. Pause time must not count. Restart resets objectives and the timer but preserves user tuning and colors. A visible Level Select action returns to the menu; no run should keep driving behind it.
Show a result panel on success, timeout or wreck. Success shows time, medal, personal-best status, Retry and Level Select. Failure cannot earn a medal. Keep the best valid time in browser storage per track and applicable lane variant. A slower attempt cannot replace a faster one. Handle missing, malformed or unavailable storage without preventing play.
Medals are based on completed time: gold at or below its threshold, otherwise silver, otherwise bronze. A race completed beyond bronze is still a completion with no medal; an arena must beat its deadline. Use simulation time, freeze the recorded finish time on the first valid success and award only once.
Existing debug tuning, color wheels, source defaults, playback controls and the destruction lab remain accessible. Legacy test entry points may explicitly select the old stages, but normal startup always shows level select.

Architecture
Create a typed track catalog containing stable IDs, names, descriptions, objectives, medal thresholds, time limits where applicable, spawn poses, routes/waypoints, checkpoints or collectibles, physical scenery and thumbnail references. Validate catalog geometry and thresholds in tests.
Separate pure objective/timer/medal logic from physics and rendering. A run state machine should represent ready/running/completed/failed, ordered checkpoint progress, collected IDs, elapsed simulation time and the frozen final result. Detect traversed checkpoint segments so a fast truck cannot skip a thin gate between physics ticks. Finish gates require the proper approach direction.
Preserve legacy route construction for Triple Loop and lab compatibility. Add data-driven course construction for the five new tracks; physics and rendering consume the same scenery definitions. Do not create hidden test-only roads, altered gravity or test-only objective radii.
Render visible checkpoint gates, the next target and distinct collectibles. Collected tokens disappear once, and the current target is distinguishable without depending solely on color.
Persist personal bests through a small versioned storage adapter. Keep medal calculations pure and storage failures nonfatal. Preserve user-saved tuning defaults throughout testing.

Small, independently testable commit chunks
Chunk 0 — Preserve the current game.
Run baseline checks, document any existing fixture assumptions against the user’s recently tuned defaults, and commit the complete current playtest implementation as the Triple Loop foundation. No new track behavior belongs in this snapshot.

Chunk 1 — Track catalog and validation.
RED: tests fail because the six official IDs/names, objective types, target times and unique thumbnails do not exist.
GREEN: add the typed catalog and validation. Verify exactly one preserved legacy track, five new tracks, ascending medal thresholds, arena deadlines and safe spawn/objective positions.
REFACTOR: remove duplicate metadata. Commit catalog, tests and a short TDD log entry.

Chunk 2 — Run objectives and timers.
RED: tests for ordered swept checkpoints, directional finish, unique pickups, deadline boundaries, failure, restart and frozen completion time fail.
GREEN: implement the pure state machine and medal calculation.
REFACTOR: share geometry helpers. Commit only this independently testable behavior and tests.

Chunk 3 — Best times and medal persistence.
RED: tests for best-time replacement, medal boundaries, lane isolation, reload, bad data and storage failure fail.
GREEN: add the versioned personal-best adapter.
REFACTOR: keep storage separate from run logic. Commit adapter and tests.

Chunk 4 — Triple Loop official attempt integration.
RED: a browser/physics test shows the jump-only finish cannot complete the official track and the spawn-to-loop-to-exit attempt is not tracked.
GREEN: integrate run state with simulation and retain all original lanes and lab behavior. Expose read-only run telemetry in the existing development harness.
REFACTOR: isolate legacy stage compatibility. Verify the full loop and official finish for all three lanes, then commit.

Chunk 5 — New race geometry and objective rendering.
RED: tests require shared physical/render course geometry, visible next gates and real checkpoint progression.
GREEN: build Harbor Sprint first using data-driven road/scenery, then render progress. Verify a complete physical browser drive and negative finish cases.
REFACTOR: extract course builders used by the remaining tracks. Commit Harbor Sprint and the shared builders.

Chunk 6 — Foundry Run.
RED: full-track completion and required obstacle-section tests fail.
GREEN: add its route, launch ramp, supported machinery, flame sections and checkpoint gates.
REFACTOR: reuse hazard and scenery components. Commit only the foundry course and tests.

Chunk 7 — Skyline Circuit.
RED: full-lap completion, missing-sector and premature finish tests fail.
GREEN: build the circuit and lap validation with ordinary truck physics.
REFACTOR: share gate logic. Commit this track and tests.

Chunk 8 — Scrapyard Sweep.
RED: full pickup completion and the 90-second feasibility bound fail.
GREEN: implement the arena geometry and visible salvage pickup loop using the shared run state.
REFACTOR: share pickup rendering. Commit arena and tests.

Chunk 9 — Inferno Vault.
RED: all-core completion, 112.5-second feasibility and hazard reachability tests fail.
GREEN: add its industrial hazard arena and safe traversal options.
REFACTOR: reuse existing supported hazards. Commit arena and tests.

Chunk 10 — Level select, results and thumbnails.
RED: browser tests fail for default six-card startup, track selection, paused menu state, accurate thumbnails, results, retry, returning to selection and medal reload.
GREEN: add the menu, per-track thumbnails, HUD and result controls; connect the persistence adapter and expose the lab/tuning without replacing the track menu.
REFACTOR: isolate UI state from simulation. Verify keyboard interaction and narrow layouts. Commit UI and browser tests.

Chunk 11 — Whole-release verification and evidence.
RED: add any missing cross-track regressions before fixing them; do not manufacture a failing test for already-correct behavior.
GREEN: run every official track from its real spawn to its real finish/all pickups with the shipped physics. Assert all checkpoints, positive integrity, completion and the required arena headroom. Run existing physics/damage/camera/tuning regressions and the production build.
Record completion times, timer headroom, screenshots and the final threshold calibration in a checked-in verification report. Update this document with measured values and link the evidence. Commit verification/report changes separately only if there are actual changes.

TDD and acceptance rules
For each functional chunk, first run the new focused test against the previous implementation and record the actual failing assertion or missing capability. Implement the minimum behavior, rerun to green, refactor, and rerun impacted tests. Keep a checked-in TDD log of RED/GREEN commands and outcomes; tests and implementation are committed together for that chunk. Do not claim strict TDD for the historical baseline.
Per-track completion tests must use real simulation driving. Faster deterministic playback may shorten wall-clock test time, but all physics steps, damage and objective triggers still execute. Include real browser keyboard coverage for starting, steering, braking, restart and level select.
Arena headroom is a hard assertion: completion <= 75% of its published deadline. Measure in simulation seconds, not browser execution time. Set medal targets from honest completion measurements rather than weakening the completion rules or timers to make tests pass.
A ready release has six playable cards, six unique thumbnails, successful full-route tests for every track, per-lane Triple Loop coverage, persistent bronze/silver/gold progression, and no completion shortcut through invalid checkpoints, duplicate pickups or failure states.

