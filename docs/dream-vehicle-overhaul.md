# Dream vehicle overhaul

Saturn Saucer is replaced by **Meteor Prospector**, a lunar mining rover with
an enclosed pressure cabin, an articulated forward sample drill, gold-foil
cargo, a solar table on four mounting feet, and a roof antenna. Existing
`saturn-saucer` selections resolve to the rover; the space collection's earned
gold and star still determine its unlock. Cake Cruiser retains its model.

The other six dream cars now have continuous lower bodywork, enclosed cabins,
mounted wheel arches, suspension links, and chassis-mounted bumpers. Their
accessories have visible mounting surfaces and supports:

| Vehicle | Structural and visual corrections |
| --- | --- |
| Gingerbread Glider | Solid iced cabin beneath the snow, chimney and tree; seated cookie tray and taut cargo straps. |
| Haunted Hearse | Full-length enclosed coach; roof-mounted ghost lantern, skull plinth and attached side trim. |
| Windup Wonder | Bearing and continuous spindle through the animated winding key; seated toy cargo and connected mirror arms. |
| Loop Launcher | Triangulated spoiler braces meet the loop ring; aligned rocket bodies, mounting blocks and flames anchored inside the nozzles. |
| Slag Hauler | Open-walled crucible avoids overlapping molten surfaces; supported exhausts, bolted crane, elbow brace and continuous chain hoist. |
| Canyon Camper | Closed wedge pop-top, roof rack feet, taut straps over the inverted canoe, rear spare carrier and mounted work lamp. |
| Meteor Prospector | Distinct rover silhouette and supported space equipment; forward drill clears its own hood and bumper. |

## Screenshot verification

`artifacts/dream-vehicle-review/` contains 35 model screenshots and seven
in-game captures. Every rebuilt model was inspected in front-right,
rear-left, left-side, low rear and elevated views. The five model views use
animation times 0, 0.73, 1.46, 2.19 and 2.92 seconds. These are rendered from
the same Three.js builders used by the game, with neutral studio lighting
to expose gaps; the additional in-game images use the actual game renderer,
physics placement and Foundry Run environment.

The review found and corrected coplanar surfaces in Slag Hauler's original
crucible revision and raised cargo straps in the camper and gingerbread
revisions. Final screenshots show attached bodywork and supported accessories,
without the former floating roofs, decorations and cargo. Each model has a
five-view `*-review-sheet.png`; `index.html` links the individual captures.
The seven garage PNGs are refreshed from the in-game captures.

Reproduce the images with an installed Playwright Chromium browser:

```powershell
node scripts/capture-dream-vehicle-review.mjs
node scripts/capture-dream-game-previews.mjs
```

The first command bundles an offline studio page. The second creates a
separate QA build with the existing game harness enabled and serves files
through browser interception, so neither command requires a running server.
The normal production build retains its disabled harness.

## Automated checks

- Attachment audit at seven animation times for each rebuilt model, plus a
  negative control proving that an artificially detached roof is detected.
  This uses expanded mesh bounds as a broad-phase test; it complements the
  screenshot review rather than proving curved surfaces touch.
- Dream-car unlock rules and legacy selection compatibility.
- Dream-car damage slots, deformable geometry, mesh density and showroom zoom.
- Meteor Prospector completes the existing Triple Loop driving test.
- Production Vite bundle succeeds. The full TypeScript build is blocked by
  the missing local `@vitejs/plugin-basic-ssl` dependency in `vite.config.ts`.
