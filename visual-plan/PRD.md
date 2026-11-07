# DemolitionDerby2 new cars: visual PRD

## 1. Goal and visual pillars

Build 4 new high-poly playable car models for DemolitionDerby2 — military hovercraft, lime snow groomer (tracked plow), black hot rod coupe, yellow crane/tow truck — matching the 9 voxel-brick reference renders in quality, density, and staging, each verified by a screenshot at >= 8/10 visual match to its references and by E2E cases proving each car finishes every course stage.
Pillars:
- Voxel-brick high-poly density: chunky beveled bricks, visible studs/treads/panel steps, no smooth low-poly shells, no thin spindly pieces
- Saturated working-vehicle palette on photo-staged concrete pad in sand with pale sky: tan military, lime groomer, gloss black rod, taxi-yellow wrecker
- Crisp daylight readability: hard sun key with soft contact shadow, legible glass/tires/chrome, silhouette readable at thumbnail size

## 2. Reference index

| File | Shows | Authoritative for | Source |
|---|---|---|---|
| refs/hero.png | 4-up contact sheet, front-right 3/4 on pad in sand | lineup scale, staging, camera; wins all conflicts | user |
| refs/hero-hovercraft.png | tan military hovercraft front-right 3/4 | hovercraft silhouette, colors, fan ring, gun | user |
| refs/hero-snow-groomer.png | lime groomer front-right 3/4 with plow | groomer cab, blade, track proportions | user |
| refs/hero-hot-rod.png | black rod front-right 3/4, exposed engine | rod body, engine, pipes, wheels | user |
| refs/hero-tow-truck.png | yellow crane truck front-right 3/4 | wrecker cab, boom, bed load | user |
| refs/side-hovercraft.jpg | hovercraft left/right side profile | hull depth, skirt, cabin ports, fan-ring position | user |
| refs/side-snow-groomer.jpg | groomer side profile | track length, cab glass, blade linkage, bed rails | user |
| refs/side-hot-rod.jpg | rod side profile | door/cabin length, engine stack, pipe routing, wheel sizes | user |
| refs/side-tow-truck.jpg | wrecker side profile | wheelbase, boom span, bed clutter, beacon placement | user |

Assumptions for parts no reference shows:
- Rear faces mirror front panel language (vents/trim centered, lights paired); underbody is dark flat pan with no detail beyond shadow line.
- Interiors are simple dark tubs with 1 bench/seat + wheel where glass reveals them; no full dashboard modeling.
- Tire backs mirror fronts; track inner runs are plain dark belts.

## 3. Global look

- Style: clean voxel-brick PBR, high-poly (beveled bricks/studs, grooved tires, slatted tracks, mesh grilles), sharp edges with 0.005–0.015 L micro-bevels, no texture noise, no weathering beyond panel-step AO
- Palette: hovercraft tan #D8BC86 lit / #B99F6E shadow, skirt #191A1E (roughness 0.85); groomer lime #B5D900 (roughness 0.45), dark glass #232A30 (roughness 0.1, metallic 0.2), blade/track gray #6E747B / belt #1D1F24; rod black #17171A (roughness 0.35, clearcoat 0.6), engine aluminum #C9CDD2 (metallic 0.9, roughness 0.3), pipes white #F2F3F4 (roughness 0.4), block red #BE222A; wrecker yellow #F6B900 (roughness 0.5), chassis gray #6B7076 / dark #33363B, tires #1B1C1F (roughness 0.9), beacons amber #FF9E1B (emissive 2.0), hook red #C01E26
- Lighting: single hard sun key from front-left-above (~35° azimuth left, ~50° elevation, ~6500 K white, strength ~3.0) + sky fill (hemisphere pale blue #CFD8DE / sand #D8CDB4, ~0.5); soft contact shadow directly under hull/tracks/wheels, darkest at skirt/track contact; no colored rim
- Camera: three-quarter front-right, ~20–25° above subject center, ~35–40° azimuth off nose, normal lens (~45–50 mm feel); subject fills ~65–75% frame width, centered, fully in frame with pad margin; side acceptance shots are pure 90° profile at axle height
- Background / ground: square concrete pad light warm gray #B9B4A9 with 2×2 saw-cut seams, pad ~2.2× vehicle length; infinite flat sand #D9CFB6 to horizon; pale blue-gray sky #CBD3D6 gradient to white at horizon
- Render: Blender 4.x bpy, Cycles CPU, 128 samples, 1200×800 PNG, AgX/ACES-sRGB, denoised; matching three.js preview tone is informational only

## 4. Objects

### 4.1 Military hovercraft (refs: hero-hovercraft.png, side-hovercraft.jpg, hero.png)

Base unit: overall hull length L = 1.0 (skirt included); width 0.52 L; hull deck height 0.16 L above ground; skirt band 0.09 L tall.
Shape: low flat barge with rounded/stepped nose taper over front 0.25 L; deck crown rises from nose (0.14 L) to cabin block (0.30 L) at 45–60% of length, then steps down to fan-ring plinth (0.28 L) at 78–100%; vertical lift-fan ring dominates rear silhouette.
Parts:
| Part | Count | Size (in L) | Position | Material | Notes |
|---|---|---|---|---|---|
| skirt | 1 | 1.0 × 0.52 × 0.09 | base, bottom at 0 | near-black rubber #191A1E | stepped voxel rim, nose radius ~0.10 L |
| hull deck | 1 | 0.96 × 0.46 × 0.10 | on skirt, nose at 0.02 L | tan #D8BC86 | 3 stepped side strakes each flank |
| cabin block | 1 | 0.42 × 0.34 × 0.16 | center 0.52 L from nose, on deck | tan | sloped nose plate ~30°, flat roof |
| side windows | 4 | 0.07 × 0.005 × 0.05 | cabin flanks, 2 per side at deck+0.10 L | dark #2A2E33, rough 0.25 | inset 0.005 L, thin tan frames |
| front grille | 1 | 0.20 × 0.02 × 0.05 | nose face, deck+0.03 L | black #141518 | horizontal slats, 5 bars |
| machine gun | 1 | barrel 0.22 long, Ø0.02 | roof pintle at 0.55 L, aimed forward-left | gunmetal #232528 | drum + spade grips, 6 studs on mount |
| fan ring | 1 | Ø0.34, width 0.12 | vertical at 0.88 L, axis along L | tan outside | stepped arch of 10 voussoir bricks, open center |
| fan blades | 6 | 0.13 long × 0.05 chord | inside ring, hub at ring center | dark gray #3A3F45 | 6-blade pusher, 60° pitch look |
| side intake trunk | 2 | 0.30 × 0.06 × 0.08 | deck flanks at 0.62–0.92 L | tan with 4 dark bands | 4 gray straps #6E747B across each |
| stern deck | 1 | 0.12 × 0.40 × 0.06 | behind ring base | tan | non-slip stud rows 4×8 |

Details: black anti-slip nose strip 0.10 wide with stud dots; 6 roof studs; side rub strake of 3 tan steps; rearIranian-style ring plinth cheeks 0.05 thick each side; no wheels, no lights beyond 2 tiny nose lamps Ø0.015.

### 4.2 Snow groomer / tracked plow (refs: hero-snow-groomer.png, side-snow-groomer.jpg, hero.png)

Base unit: track outer length L = 1.0 (blade extra, +0.28 L ahead); width over tracks 0.52 L; cab roof 0.52 L above ground (0.52 track-L).
Shape: tall short-nose cab over full-length twin tracks; nose bluff and near-vertical; roofline flat at 0.52 L from 0.30–0.62 L of track length; rear cargo bed flat at 0.34 L extending to 1.0 L; blade wide and low ahead of nose.
Parts:
| Part | Count | Size (in L) | Position | Material | Notes |
|---|---|---|---|---|---|
| track pair | 2 | 1.0 × 0.14 × 0.20 | flanks, centers ±0.19 L lateral | belt #1D1F24 + grousers #2C2F34 | 22 grousers per track, 0.045 pitch; 4 road wheels Ø0.11 gray #7A7F86 per side |
| chassis tub | 1 | 0.85 × 0.40 × 0.08 | on tracks, center 0.52 L | dark #26282C | |
| cab | 1 | 0.34 × 0.38 × 0.30 | nose 0.18–0.52 L, floor at 0.26 L | lime #B5D900 | bluff nose, 0.03 corner bevels |
| windshield + side glass | 1+2 | wind 0.30 × 0.20; sides 0.20 × 0.16 | cab front + flanks at 0.36–0.52 L height | glass #232A30 + black seals | single wraparound-look band, center divider stud |
| roof beacons | 3 | Ø0.025 | roof front edge | amber emissive #FF7A00 | 2 lime plinths + 1 center |
| exhaust stack | 1 | Ø0.035, 0.22 tall | right of cab at 0.55 L | dark #33373C | L-bend tip facing rear |
| side vents | 6 | 0.12 × 0.012 bars | engine flank at 0.55–0.68 L | black inset | 3 bars per side |
| plow blade | 1 | 0.62 wide × 0.22 tall × 0.04 | 0.28 L ahead of nose, bottom at 0 | steel gray #7B8188 | 4-perforated mesh panels, side wings angled 20° |
| push arms | 2 | 0.30 long, 0.04 section | nose low to blade back | dark #2A2D31 | A-frame pair + center ram |
| rear bed | 1 | 0.42 × 0.48 × 0.10 | 0.58–1.0 L at 0.30 L height | aluminum #A8ADB3 | open tub, rail walls 0.08 tall with 3 posts per side |

Details: lime mirror blocks on cab front corners; door seam + white latch stud each flank; small black logo decal 0.08 wide on door; wiper stud on windshield; rear work lamp bar 2 white studs.

### 4.3 Black hot rod coupe (refs: hero-hot-rod.png, side-hot-rod.jpg, hero.png)

Base unit: overall length L = 1.0 (nose to tail); width 0.40 L; roof 0.42 L above ground.
Shape: highboy Model-A-like coupe: long exposed engine bay (30% L), tall square cabin (30% L, peak 0.42 L at 62% L), short tapered tail (20% L dropping to 0.30 L); big rear tires, small fronts, visible chrome-less stance.
Parts:
| Part | Count | Size (in L) | Position | Material | Notes |
|---|---|---|---|---|---|
| frame + floor | 1 | 0.90 × 0.22 × 0.05 | belly at 0.12 L height | black #101114 | side rails + silver belly strip 0.04 wide |
| cabin | 1 | 0.34 × 0.36 × 0.30 | 0.48–0.82 L, floor 0.14 L | gloss black #17171A | flat roof, vertical back, 0.02 drip bevel |
| side windows | 2 | 0.13 × 0.005 × 0.10 | cabin flanks at 0.30 L height | dark glass + red seat glimpse | white door-handle stud 0.03 |
| trunk/tail | 1 | 0.18 × 0.36 × 0.16 | 0.82–1.0 L | gloss black | tapered top, 2 red tail studs Ø0.02 |
| engine block | 1 | 0.22 × 0.22 × 0.14 | bay 0.26–0.48 L at 0.22 L height | aluminum #C9CDD2 + red sump band 0.03 | 8 intake studs 2×4 on top |
| blower scoop | 1 | 0.12 × 0.12 × 0.07 | atop block at 0.32 L height | light gray #D5D8DC | 3 stacked steps |
| exhaust headers | 6 | Ø0.025, ~0.22 developed | 3 per flank dropping to 0.10 L then rearward | white #F2F3F4 |ลง collector pipe Ø0.035 running 0.30 L rearward each side |
| front axle + grille | 1 | axle 0.34 wide; shell 0.06 × 0.16 × 0.14 | nose at 0.06–0.14 L | white shell + dark core | 2 round headlamps Ø0.035 white emissive 1.5 |
| front wheels | 2 | Ø0.22, width 0.09 | axle at 0.12 L, track 0.36 L | tire #1B1C1F + gray hub Ø0.11 | 8-spoke hubs, red center dot Ø0.025 |
| rear wheels | 2 | Ø0.30, width 0.12 | axle at 0.80 L, track 0.38 L | tire + gray hub Ø0.15 | deep tread blocks 16 around |

Details: white steering yoke visible through window; red seatback 0.10 wide; black firewall with 6 studs; fuel cap stud on tail; no fenders, no bumpers beyond white rear bar 0.30 wide.

### 4.4 Crane / tow truck (refs: hero-tow-truck.png, side-tow-truck.jpg, hero.png)

Base unit: chassis length L = 1.0 (cab nose to tail bar); cab + bed + boom all inside L; width 0.36 L; cab roof 0.42 L.
Shape: cab-over 6-wheeler: bluff cab (22% L, full height 0.42 L), crane pedestal (14% L) + flatbed tub (52% L), knuckle boom spanning 0.30–0.95 L at 0.55 L height with hook hanging over bed rear third.
Parts:
| Part | Count | Size (in L) | Position | Material | Notes |
|---|---|---|---|---|---|
| chassis | 1 | 1.0 × 0.24 × 0.10 | belly 0.14–0.24 L height | dark #33363B + gray tanks | 2 side tanks 0.16 × 0.08 |
| cab | 1 | 0.24 × 0.36 × 0.30 | nose 0–0.24 L, floor 0.16 L | yellow #F6B900 | bluff face, black corner posts, split windshield |
| windshield + side glass | 1+2 | wind 0.28 × 0.14; sides 0.12 × 0.12 | cab upper at 0.30 L height | glass #2B343B | wiper + wheel + seat visible |
| beacons | 2 | Ø0.03 | cab roof front corners | amber emissive | black bases |
| wheels | 6 | Ø0.17, width 0.10 | axles at 0.14 / 0.66 / 0.84 L | tire + gray front hubs / yellow rear hubs | front hubs silver #9AA0A6, rears yellow #F6B900 |
| outriggers | 2 | 0.05 × 0.30 × 0.16 | behind cab at 0.30 L | red/white striped #C01E26 | deployed look, pads at 0.02 L |
| crane pedestal | 1 | 0.14 × 0.24 × 0.30 | 0.28–0.42 L up to 0.52 L | yellow | side control box gray + white stripe |
| boom | 1 | 0.62 long, 0.09 × 0.10 section | pivot 0.36 L/0.55 L height, level to 0.95 L | yellow | 2-stage telescopic steps + red/white warning decals 0.08 |
| ram | 1 | Ø0.045, 0.25 long | pedestal to boom underside ~25° | steel #565B61 | chrome rod half |
| hook block + hook | 1+1 | block 0.05 cube; hook 0.08 tall | cable from boom tip at 0.93 L down to 0.42 L | red block, black hook | cable Ø0.012 dark, 0.15 drop |
| flatbed tub | 1 | 0.52 × 0.36 × 0.14 | 0.44–0.96 L, floor 0.28 L | yellow inside/out | paneled walls, 3 recesses per flank, gray rub rail |
| bed load | 5 | toolbox 0.14 + crates + red chest 0.16 | bed floor, spread 0.50–0.90 L | mixed gray/red/brown | red chest + gray crates + coiled black cable + striped bar |

Details: cab steps 2 per side, black mirrors on arms, front bumper gray with 2 white lamps, rear light bar with 4 red/amber studs, mudflaps, 6 bed tie studs.

## 5. Games only

- Core loop: arcade demolition-derby courses; new cars are cosmetic + tuning variants of the existing vehicle rig (same spawn, checkpoints, damage, timer). No new mechanics.
- Controls: unchanged (WASD/arrows drive, Space brake, R reset, C camera). Each new car uses the standard car collider (single box ~ length × width, center at 0.45 L) regardless of visual extras (boom, blade, fan ring are visual-only, non-colliding).
- Camera: unchanged chase cam; per-car only a scale term so the longest car (wrecker, L=1.0) still fills frame like existing trucks.
- States: vehicle-select -> spawn -> run (completed/wrecked/timeout) -> results; new cars appear as 4 select entries with hero thumbnails.
- HUD: unchanged; new cars show name + spec tag (e.g. "HOVERCRAFT — heavy", "GROOMER — tracked", "HOT ROD — fast", "WRECKER — heavy").
- Feedback and juice: unchanged; groomer blade and wrecker hook get no gameplay collision or particle beyond standard bumper hits.
- Animation: wheels spin / tracks scroll with speed; fan blades rotate at 6 rev/s when throttle on; beacons flash 1.5 Hz amber; blade/boom/hook are rigid (no flex); suspension bob matches existing cars ±0.02 L.
- Audio: reuse existing engine/skid/hit banks with per-car pitch (rod +15%, wrecker −15%, hovercraft fan layer, groomer track rattle).
- E2E coverage: extend every existing course driver spec to run each of the 4 new cars through all 5 stages — harbor-sprint (6 gates), foundry-run (7 checkpoints + ramp peakY > 3.1), skyline-circuit (16 checkpoints), scrapyard-sweep (12 tokens, ≤ 90 s), inferno-vault (10 cores, ≤ 112.5 s) — asserting status completed and the same integrity floors as the base car (0.8 / 0.4 / 0.8 / 0.5 / 0.4). Parametrize `driveTrack(page, track, vehicle)` by vehicle id; one case per (vehicle × track) = 20 new cases.

## 6. Technical constraints

- Tool/engine: Blender 4.x bpy scripts only, Cycles CPU; complementary three.js preview uses the same hex base colors and sun direction
- Required outputs: `art/hovercraft.blend`, `art/snow-groomer.blend`, `art/hot-rod.blend`, `art/tow-truck.blend` + exported `public/vehicles/*.glb`; `visual-plan/shots/hovercraft-hero.png`, `snow-groomer-hero.png`, `hot-rod-hero.png`, `tow-truck-hero.png` (1200×800) and matching `-side` shots; E2E additions in `e2e/courses.spec.ts` (or per-car spec importing `course-driver`)
- Resolution: 1200×800 hero + side per car, same framing as references
- Performance: each GLB ≤ 8 MB, ≤ 120k tris; Cycles hero render < 5 min on laptop CPU; game holds 60 fps on laptop with any new car; physics uses existing box collider only (visual poly does not enter solver)

## 7. Work breakdown

1. Staging rig once: concrete pad 2.2× car length with seams, sand plane to horizon, sky gradient, sun + fill, front-right 3/4 camera and 90° side camera presets
2. Primary forms: hovercraft hull+skirt+ring; groomer tub+tracks+cab mass; rod frame+cabin+tail; wrecker chassis+cab+bed (all to stated L ratios)
3. Secondary parts: guns/blades/engines/booms/wheels per parts tables with correct counts and positions
4. Materials and colors: all hex base colors above with stated metallic/roughness/emissive; glass, rubber, steel variants
5. Small details: studs, vents, decals, beacons, bed load, mirrors, lamps, tread/grouser repetition
6. Render + export + tests: hero/side screenshots per car, GLB export + vehicle registry entries, 20 E2E (vehicle × track) cases, integrity/timing thresholds per stage

## 8. Acceptance criteria

- AC-01 (hero-hovercraft.png): tan barge hull with full black skirt band and rear vertical fan ring with 6 dark blades reads at thumbnail; ring center is open daylight
- AC-02 (side-hovercraft.jpg): 2 side windows per flank + front grille slats + 4-band intake trunks on both flanks; gun barrel points forward from roof
- AC-03 (hero-hovercraft.png): hull color reads tan #D8BC86 under sun (not gray or orange); skirt reads near-black, not lifted (no daylight gap under skirt)
- AC-04 (hero-snow-groomer.png): lime bluff cab with wraparound dark glass + gray mesh plow 0.62 track-L wide ahead of nose; blade wider than cab
- AC-05 (side-snow-groomer.jpg): twin tracks span full side with 4 visible road wheels per flank and 22 grousers each; exhaust stack stands right of cab; bed rails have 3 posts per side
- AC-06 (hero-snow-groomer.png): cab color reads lime #B5D900 (not olive or neon); glass reads near-black with seat hint
- AC-07 (hero-hot-rod.png): gloss black coupe with exposed aluminum block + red sump + 3 white headers per flank joining a side collector; blower scoop stacked 3 high
- AC-08 (side-hot-rod.jpg): roof peak at 62% L; small fronts Ø0.22 vs rears Ø0.30 (ratio 0.73); white door-handle stud + red seat visible in side glass
- AC-09 (hero-hot-rod.png): body reads neutral black #17171A with white-pipe contrast; no fenders; tail shows 2 red studs
- AC-10 (hero-tow-truck.png): taxi-yellow cab-over with pedestal crane + level 2-stage boom spanning cab to bed rear + red hook block hanging over bed
- AC-11 (side-tow-truck.jpg): 6 wheels on 3 axles (1 front + 2 rear) with silver front / yellow rear hubs; 2 roof beacons; striped outriggers behind cab; bed carries red chest + crates
- AC-12 (side-tow-truck.jpg): boom decals red/white; cab glass shows wheel + seat; rear lamp studs red/amber
- AC-13 (all hero refs): each hero screenshot matches its reference camera (front-right 3/4, 20–25° above, car fills 65–75% width) on concrete pad in sand under hard-sun shadow
- AC-14 (all side refs): each side screenshot is a 90° profile at axle height, fully in frame, verifying stated L ratios within ±5%
- AC-15 (all cars): high-poly read — beveled bricks/studs/treads/grilles visible at 100%; no smooth unbroken slabs larger than 0.15 L, no floating parts, no z-fighting
- AC-16 (all cars): side-by-side with its hero + side references a fresh viewer scores each pair >= 8/10 same-vehicle match with no major shape or color difference
- AC-17 (E2E harbor-sprint × 4 cars): each new car completes 6/6 gates, status completed, integrity > 0.8
- AC-18 (E2E foundry-run × 4 cars): each completes 7/7 checkpoints, integrity > 0.4, ramp peakY > 3.1
- AC-19 (E2E skyline-circuit × 4 cars): each completes a full 16/16 lap, integrity > 0.8
- AC-20 (E2E scrapyard-sweep × 4 cars): each collects 12/12 tokens within 90 s, integrity > 0.5
- AC-21 (E2E inferno-vault × 4 cars): each recovers 10/10 cores within 112.5 s, integrity > 0.4

## Polish round 1

Source: `visual-plan/reviews/accept-r1-shape.md` + `accept-r1-look.md` vs
`visual-plan/new-cars-4up.png` (r0) and `visual-plan/refs/`. Major and moderate
items only, highest impact first. Minors (MG scale-up, nose strips, groomer nose
length, tow outrigger leg, hot-rod rear bar, shadow softness, per-car hero
angle) stay queued for round 2. Two review claims were rejected after inspecting
the refs (noted below); everything else is fixed in this round.

### Framing / silhouette / missing parts

1. Spurious orange IRON FLIGHT door decal on all 4 cars (major-look, global).
   Owner: `src/view.ts` door-decal block. Fix: skip the series livery for the
   4 new vehicle ids (refs show clean flanks); legacy vehicles keep it.
2. Hovercraft shows 2 black side road wheels, ref has 0 (major shape+look).
   Owner: `src/hovercraft.ts` wheel-group branch. Fix: wheel groups now hold a
   small dark filler tucked inside the skirt band (x-inboard offset, which is
   spin-safe on the wheel rotation axis) so no wheel reads.
3. Hovercraft fan ring tiny/unreadable (major). Owner: `src/hovercraft.ts`
   fan-ring block. Fix: ring radius 0.85 -> 1.0 on a raised center, larger
   voussoir bricks + longer 6-blade fan + hub, taller plinth cheeks; ring crown
   now clears the cabin roofline as in `side-hovercraft.jpg`.
4. Tow-truck wheels 4x oversize knobby, ref wants 6x road wheels (major).
   Owner: `src/tow-truck.ts` wheel() + WRECKER physics. Fix: cop-scale running
   gear (radius 0.6, rest 0.55, track +-1.15), torus outer 1.05 -> 0.6 with road
   tread blocks; static tag axle moved to the new track/height/spacing so all 6
   read. Visual tire outer radius always equals physics wheel radius (cop-car
   pattern); the body drops with the smaller gear, no float.
5. Hot-rod tires equal monster size, ref wants staggered runners (major).
   Owner: `src/hot-rod.ts` wheel loop + HOTROD physics. Fix: cop-scale gear
   (radius 0.58), front outer 0.55 x narrow / rear outer 0.66 x wide with
   matching drums, lips, spokes, tread radii.
6. Hot-rod side headers missing/tucked (major). Owner: `src/hot-rod.ts` header
   block. Fix: 3 pipes per flank in larger bore routed outboard of the small
   tires, collector extended to full sill length into the rear group.
7. Snow-groomer plow perforated screen face (major-look). Owner:
   `src/snow-groomer.ts` plow block. Fix: solid moldboard (4 steel panels +
   cutting edge), mesh kept only as a band on the top lip; blade widened with
   wings to match.
8. Groomer road wheels 2 vs 4 per side (major). Owner: `src/snow-groomer.ts`
   track block. Fix: static discs were buried inside the belt (x +-1.1) and
   wheel-group discs floated outboard (+-1.65); all 4 per side now sit flush on
   the belt outer face (x +-1.42, spin-safe x-offsets) with larger gray discs.
9. Groomer bed solid low walls vs tall open railed bed (major-shape).
   Owner: `src/snow-groomer.ts` bed block. Fix: low tub lip + 4 thin posts per
   side + tubular top rails (side + rear). Note: this supersedes PRD/AC-05's
   "3 posts" with the side ref's 4-post open rack.
10. Groomer windshield + side glass opaque black (major-look). Owner:
    `src/snow-groomer.ts` glass + cab. Fix: transparent gray glass plus a new
    gray seat + steering column interior so the cab reads through the glass.
11. Hot-rod cabin glass opaque (moderate). Owner: `src/hot-rod.ts` glass +
    doors. Fix: transparent glass, side windows enlarged to near ref size; red
    seat + white yoke already exist behind it.
12. Hot-rod engine all-white, red band missing (major-look). Owner:
    `src/hot-rod.ts` engine block. Fix: mid-gray block + taller red sump band;
    light scoop stack kept.
13. Hovercraft hull 2.0:1 long-narrow vs ref ~1.4:1 (major-shape). Owner:
    `src/hovercraft.ts` skirt/deck/cabin widths. Fix (partial): skirt 3.0 ->
    3.5, deck 2.6 -> 3.05, cabin/nose/stern widened to match, doors moved out
    to +-1.5. Full 1.4:1 would bury the cabin/door gear; re-check in round 2.
14. Tow boom reads short vs full-bed-length + hook (major). Owner:
    `src/tow-truck.ts` boom block. Fix: boom + telescopic stage lengthened,
    black tip cap added, cable + red block + hook re-hung under the tip over
    the bed rear third. (The r0 "roll bar" read was mostly end-on perspective;
    geometry already spanned the bed.)
15. Groomer exhaust stack unreadable (moderate). Owner: `src/snow-groomer.ts`
    stack. Fix: stack raised to just above the cab roofline with rear-facing
    tip. Tow beacons + mirrors and tow bed cargo were flagged missing but
    already exist in `src/tow-truck.ts`; kept, re-verified in the new capture.
16. Camera high-down + loose fill, refs are low front 3/4 with ~65% fill
    (moderate, global). Owner: `src/view.ts` vehiclePreview(). Fix: elevation
    lowered (1,0.65,1) -> (1,0.5,1), margin 1.15 -> 1.03. Same corner for all
    cars (the per-car "rear view" claims were perspective misreads).
17. REJECTED: "tow cab should be conventional long-nose" (major-look).
    `side-tow-truck.jpg` and PRD 4.4 are cab-over; keeping the cab-over cab.

### Color / material

18. Hovercraft cream -> matte voxel tan (major-look). Owner: `src/hovercraft.ts`
    tan material. Fix: #D8BC86 -> #D2AC6E, roughness 0.6 -> 0.75.
19. Hovercraft smooth slabs vs stepped voxel hull (major-look). Owner:
    `src/hovercraft.ts` deck. Fix (partial): raised inset deck plates add a
    second layer edge over the full deck; strakes/seams/studs kept. True
    mini-voxel density is out of scope for the tri budget.
20. Hot-rod gloss -> matte black (moderate). Owner: `src/hot-rod.ts` black
    material. Fix: roughness 0.35 -> 0.6 (compromise between PRD gloss and the
    satin ref read).
21. Groomer lime #D4F542 render vs #A8D800 (moderate): no change, base color is
    already PRD #B5D900 (render delta is sun exposure, within tolerance).
22. Groomer cab tall/narrow + sloped hood (moderate): deferred to round 2 (cab
    shell rework risk; cab already reads bluff-lime in r0).

### Lighting / shadow / background

No major/moderate items. Shadow softness (minor) is shared staging, untouched.

### Detail (moderate)

23. Tow bed cargo generic vs detailed tools (moderate). Owner: `src/tow-truck.ts`
    bed load. No change: red chest + gray crates + brown crate + cable coil +
    striped bar already match the side ref's loadout; re-verified in capture.

### Verification

- `npx tsc --noEmit` + affected `vitest` suites pass.
- `node scripts/capture-new-vehicles.mjs` regenerates `visual-plan/new-cars-4up.png`
  + `public/vehicles/{hovercraft,snow-groomer,hot-rod,tow-truck}.png`.
- r1 4-up viewed against `visual-plan/refs/hero.png` and `visual-plan/best/`;
  `visual-plan/best/` keeps the best complete version of all 12 deliverables
  plus `src/view.ts` (owns the shared decal gate + preview camera).

## User decisions

- Tow truck runs 4 wheels (2 axles): the static tag axle is removed, since
  its monster-scale tires interpenetrated the drive wheels. Supersedes AC-11
  and Polish round 1 item 4. Physics unchanged (4 hardpoints).
- Groomer door glass/seal/trim sit proud of the door face (0.01-0.02) so no
  two faces are coplanar. Regression tests in tests/new-vehicles.test.ts.
- Hovercraft shows zero wheels: the wheel groups hold only a 0.12 buried nub
  (the 0.4x0.6x1.2 filler swept out of the deck while spinning). Supersedes
  Polish round 1 item 2. Groups stay non-empty for damage bounds.
