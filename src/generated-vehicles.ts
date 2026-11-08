import * as T from "three";
import { vehicle } from "./themed-vehicles";
import { finish } from "./concept-vehicle-kit";
import { cabin, door, fenders, gold, sides } from "./themed-vehicle-body";

/**
 * Pipeline-generated vehicles (scripts/generate-vehicles.mjs).
 *
 * Each build run appends ONE entry with the shared `vehicle()` helper, e.g.
 *   vehicle("jet-sled", "Jet Sled", "Blurb.", [0x8a93a6, 0xd8402a, 0x222222, 1.1, 5], (k) => {
 *     ... // ConceptVehicleKit modeling — see src/themed-vehicles.ts for examples
 *   }),
 * plus whatever kit/body imports that entry needs. Keep every entry
 * kit-built on the standard 4-wheel chassis: vehicles.ts spreads
 * standardChassis over this array, so physics match the Monster Truck and the
 * drive-proof routes pass unchanged. Visuals are free (F1, trike, sled, ...)
 * but the wheels must stay four treaded assemblies at the kit hardpoints.
 *
 * Ledger rule (enforced by tests/new-vehicles.test.ts): every id here must
 * appear in visual-plan/refs/gemini/generated/briefs.json, with concept art
 * at visual-plan/refs/gemini/generated/<id>.jpg and a showroom preview at
 * public/vehicles/<id>.png (800x450).
 */
export const GENERATED_VEHICLES = [
  // Build runs append vehicle(...) entries here, one per run.
  vehicle(
    "fire-engine",
    "Fire Engine",
    "Red ladder truck with chrome rails, hose reels, and a roof beacon.",
    [12658477, 15920608, 10133670, 0.86, 8],
    (k) => {
      const hose = finish(0x7e1b10, 0.85, 0);
      const brass = gold();

      // ---- Nose (hood): flat cab-over face, grille, headlights ----
      k.hull("hood", [
        [0.42, -0.14, 0.72, 1.14, 1.12],
        [2.44, -0.14, 0.72, 1.1, 1.06],
      ]);
      k.panel("hood", [1.3, 0.55, 0.1], [0, 0.28, 2.47], k.dark, 0.05);
      for (let i = 0; i < 6; i++)
        k.panel(
          "hood",
          [1.14, 0.035, 0.05],
          [0, 0.08 + i * 0.08, 2.53],
          k.steel,
          0.008,
        );
      k.bar("hood", [-0.65, 0.56, 2.5], [0.65, 0.56, 2.5], 0.03, k.steel);
      k.bar("hood", [-0.65, 0.0, 2.5], [0.65, 0.0, 2.5], 0.03, k.steel);
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.65, 0.0, 2.5],
          [side * 0.65, 0.56, 2.5],
          0.03,
          k.steel,
        );
        k.lamp("hood", [side * 0.82, 0.32, 2.5], 0.14);
        k.lamp("hood", [side * 0.82, 0.02, 2.48], 0.07, k.amber);
      }

      // ---- Cab upper (roof): split windshield, beacon, horns, ladder ----
      cabin(
        k,
        { front: 2.42, back: 0.5, height: 2.02, width: 1.1, slant: 0.16 },
      );
      k.bar("roof", [0, 0.62, 2.48], [0, 1.92, 2.33], 0.06, k.steel);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.45, 0.8, 2.5],
          [side * 0.2, 1.3, 2.445],
          0.022,
          k.dark,
        );
      // Roof beacon (red dome on a chrome base) and twin air horns.
      k.bar(
        "roof",
        [-0.68, 2.09, 1.95],
        [-0.68, 2.24, 1.95],
        0.1,
        k.steel,
      );
      k.oval("roof", [0.13, 0.12, 0.13], [-0.68, 2.3, 1.95], k.red);
      for (const side of sides) {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.085, 0.045, 0.5, 24).rotateX(Math.PI / 2),
          [side * 0.14, 2.2, 2.0],
          k.steel,
        );
        k.bar(
          "roof",
          [side * 0.14, 2.09, 1.9],
          [side * 0.14, 2.18, 1.9],
          0.03,
          k.dark,
        );
        k.panel(
          "roof",
          [0.22, 0.1, 0.08],
          [side * 0.85, 1.98, 2.3],
          k.red,
          0.02,
        );
      }
      // Extension ladder racked on top: twin sections, rungs, rack cradles.
      for (const side of sides) {
        k.bar(
          "roof",
          [side * 0.38, 2.4, 2.0],
          [side * 0.38, 2.4, -2.35],
          0.06,
          k.steel,
        );
        k.bar(
          "roof",
          [side * 0.38, 2.56, 2.0],
          [side * 0.38, 2.56, -2.35],
          0.05,
          k.steel,
        );
      }
      for (let i = 0; i < 12; i++) {
        const z = 1.85 - i * 0.36;
        k.bar("roof", [-0.38, 2.4, z], [0.38, 2.4, z], 0.03, k.steel);
        k.bar(
          "roof",
          [-0.38, 2.56, z - 0.18],
          [0.38, 2.56, z - 0.18],
          0.028,
          k.steel,
        );
      }
      k.panel("roof", [0.95, 0.3, 0.16], [0, 2.245, 1.55], k.dark, 0.04);
      for (const z of [-0.2, -1.85]) {
        for (const side of sides)
          k.panel("roof", [0.09, 0.85, 0.15], [side * 0.38, 1.98, z], k.dark, 0.03);
        k.panel("roof", [0.9, 0.09, 0.15], [0, 2.36, z], k.dark, 0.03);
      }
      for (const z of [1.2, -1.8])
        for (const side of sides)
          k.panel("roof", [0.08, 0.16, 0.08], [side * 0.38, 2.48, z], k.dark, 0.02);

      // ---- Cab doors: glass, cream stripe, mirrors, steps ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [0.5, -0.08],
            [2.36, -0.08],
            [2.3, 0.62],
            [0.56, 0.62],
          ],
          0.1,
          side * 1.12,
          k.paint,
          0.03,
        );
        k.panel(d, [0.06, 0.62, 1.35], [side * 1.19, 1.06, 1.43], k.glass, 0.02);
        k.bar(d, [side * 1.2, 1.39, 0.72], [side * 1.2, 1.39, 2.14], 0.03, k.dark);
        k.bar(d, [side * 1.2, 0.73, 0.72], [side * 1.2, 0.73, 2.14], 0.03, k.dark);
        k.bar(d, [side * 1.2, 0.73, 0.72], [side * 1.2, 1.39, 0.72], 0.03, k.dark);
        k.bar(d, [side * 1.2, 0.73, 2.14], [side * 1.2, 1.39, 2.14], 0.03, k.dark);
        k.panel(d, [0.06, 0.13, 1.86], [side * 1.19, 0.3, 1.42], k.accent, 0.02);
        k.panel(d, [0.05, 0.03, 1.86], [side * 1.185, 0.4, 1.42], brass, 0.008);
        k.panel(d, [0.07, 0.06, 0.3], [side * 1.22, 0.55, 1.95], k.steel, 0.02);
        k.bar(d, [side * 1.1, 0.06, 0.78], [side * 1.24, 0.06, 0.78], 0.13, k.accent);
        k.bar(d, [side * 1.16, 0.06, 0.78], [side * 1.25, 0.06, 0.78], 0.07, k.red);
        k.bar(d, [side * 1.15, 1.35, 2.25], [side * 1.42, 1.42, 2.3], 0.03, k.dark);
        k.panel(d, [0.1, 0.28, 0.18], [side * 1.45, 1.42, 2.3], k.dark, 0.03);
        k.panel(d, [0.07, 0.22, 0.03], [side * 1.45, 1.42, 2.195], k.steel, 0.012);
        k.bar(d, [side * 1.24, 0.65, 0.62], [side * 1.24, 1.35, 0.62], 0.03, k.steel);
        k.bar(d, [side * 1.18, 0.75, 0.62], [side * 1.24, 0.75, 0.62], 0.022, k.steel);
        k.bar(d, [side * 1.18, 1.25, 0.62], [side * 1.24, 1.25, 0.62], 0.022, k.steel);
        k.panel(d, [0.34, 0.07, 0.3], [side * 1.12, -0.14, 0.68], k.steel, 0.02);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 0.6], k.amber, 0.012);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 2.28], k.amber, 0.012);
      }

      // ---- Equipment body (bed): compartments, reels, deck, rails ----
      k.hull("bed", [
        [-2.58, -0.1, 1.5, 1.16, 1.14],
        [0.32, -0.1, 1.5, 1.16, 1.14],
      ]);
      k.panel("bed", [2.2, 1.4, 0.18], [0, 0.6, 0.41], k.dark, 0.04);
      k.panel("bed", [2.2, 0.18, 2.7], [0, -0.12, -1.1], k.dark, 0.05);
      k.panel("bed", [2.24, 0.09, 2.86], [0, 1.55, -1.11], k.steel, 0.03);
      for (const side of sides) {
        k.bar("bed", [side * 1.08, 1.95, 0.2], [side * 1.08, 1.95, -2.5], 0.045, k.steel);
        for (const z of [0.15, -0.7, -1.55, -2.4])
          k.bar("bed", [side * 1.08, 1.58, z], [side * 1.08, 1.95, z], 0.035, k.steel);
        for (const z of [-1.35, -2.1]) {
          k.panel("bed", [0.04, 0.86, 0.76], [side * 1.165, 0.62, z], k.dark, 0.012);
          k.panel("bed", [0.05, 0.78, 0.68], [side * 1.175, 0.62, z], k.paint, 0.015);
          k.bar("bed", [side * 1.21, 0.62, z - 0.1], [side * 1.21, 0.62, z + 0.1], 0.025, k.steel);
        }
        k.panel("bed", [0.06, 0.13, 2.7], [side * 1.19, 0.3, -1.1], k.accent, 0.02);
        k.panel("bed", [0.05, 0.03, 2.7], [side * 1.185, 0.4, -1.1], brass, 0.008);
        k.panel("bed", [0.06, 0.13, 0.24], [side * 1.13, 0.3, 0.37], k.accent, 0.02);
        // Hose reel: bracket, axle, flanges, wound hose coils.
        k.panel("bed", [0.3, 0.5, 0.5], [side * 1.2, 0.95, -0.45], k.dark, 0.04);
        k.bar("bed", [side * 1.1, 1.0, -0.45], [side * 1.52, 1.0, -0.45], 0.06, k.steel);
        for (const fx of [1.27, 1.49])
          k.mesh(
            "bed",
            new T.CylinderGeometry(0.36, 0.36, 0.06, 48).rotateZ(Math.PI / 2),
            [side * fx, 1.0, -0.45],
            k.steel,
          );
        for (const cx of [1.335, 1.39, 1.445])
          k.mesh(
            "bed",
            new T.TorusGeometry(0.27, 0.055, 12, 48).rotateY(Math.PI / 2),
            [side * cx, 1.0, -0.45],
            hose,
          );
        // Pump outlets: stacked pair with caps and T-handles.
        for (const y of [0.5, 0.78]) {
          k.bar("bed", [side * 1.14, y, -0.835], [side * 1.3, y, -0.835], 0.07, k.steel);
          k.bar("bed", [side * 1.3, y, -0.835], [side * 1.36, y, -0.835], 0.095, k.steel);
          k.bar(
            "bed",
            [side * 1.36, y - 0.06, -0.835],
            [side * 1.36, y + 0.06, -0.835],
            0.02,
            k.dark,
          );
        }
        k.panel("bed", [0.34, 0.07, 0.4], [side * 1.12, -0.14, -0.42], k.steel, 0.02);
        k.panel("bed", [0.05, 0.07, 0.14], [side * 1.185, 0.12, 0.2], k.amber, 0.012);
        k.panel("bed", [0.05, 0.07, 0.14], [side * 1.185, 0.12, -2.5], k.red, 0.012);
        // Equipment boxes on the front deck.
        k.panel("bed", [0.8, 0.35, 0.9], [side * 0.55, 1.77, -0.9], k.paint, 0.04);
        k.panel("bed", [0.84, 0.06, 0.94], [side * 0.55, 1.96, -0.9], k.dark, 0.02);
        k.panel("bed", [0.1, 0.12, 0.05], [side * 0.55, 1.82, -0.44], k.steel, 0.015);
      }
      k.bar("bed", [-1.08, 1.95, -2.5], [1.08, 1.95, -2.5], 0.045, k.steel);
      // Hose bed: canvas rolls and side walls at the rear deck.
      for (const z of [-2.15, -2.4])
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.14, 0.14, 1.7, 32).rotateZ(Math.PI / 2),
          [0, 1.72, z],
          k.accent,
        );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.14, 0.14, 1.7, 32).rotateZ(Math.PI / 2),
        [0, 1.96, -2.275],
        k.accent,
      );
      for (const side of sides)
        k.panel("bed", [0.08, 0.34, 0.9], [side * 0.95, 1.72, -2.28], k.paint, 0.03);
      // Rear face: compartment door, chevrons, work light.
      k.panel("bed", [1.6, 0.9, 0.06], [0, 0.7, -2.59], k.dark, 0.03);
      k.bar("bed", [0.6, 0.5, -2.63], [0.6, 0.9, -2.63], 0.03, k.steel);
      for (const side of sides)
        k.panel(
          "bed",
          [0.5, 0.14, 0.05],
          [side * 0.45, 0.3, -2.59],
          k.accent,
          0.015,
        ).rotation.z = side * 0.6;
      k.lamp("bed", [0.5, 1.95, -2.56], 0.08, k.white, -1);
      // Dual exhaust stacks in the cab/body gap.
      for (const side of sides) {
        k.tube(
          "bed",
          [
            [side * 0.95, 0.04, 0.385],
            [side * 0.95, 1.57, 0.385],
            [side * 0.95, 1.82, 0.385],
            [side * 0.95, 1.95, 0.215],
          ],
          0.095,
          k.steel,
        );
        k.bar("bed", [side * 0.95, 0.32, 0.385], [side * 0.95, 1.49, 0.385], 0.12, k.dark);
      }

      // ---- Front bumper: chrome bar, bullbar, hooks, fogs ----
      k.panel("bumper-front", [2.5, 0.26, 0.34], [0, -0.11, 2.66], k.steel, 0.085);
      k.panel("bumper-front", [2.3, 0.05, 0.28], [0, 0.03, 2.66], k.dark, 0.015);
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.72, -0.2, 2.86],
          [side * 0.72, 0.72, 2.86],
          0.07,
          k.steel,
        );
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.95, -0.26, 2.7],
          k.dark,
        );
        k.lamp("bumper-front", [side * 0.45, -0.11, 2.84], 0.09);
      }
      for (const y of [0.62, 0.05])
        k.bar("bumper-front", [-0.72, y, 2.86], [0.72, y, 2.86], 0.06, k.steel);
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.11, 2.845], k.white, 0.01);

      // ---- Rear bumper: step, lights, flaps, hitch ----
      k.panel("bumper-rear", [2.4, 0.2, 0.42], [0, -0.12, -2.7], k.steel, 0.07);
      k.panel("bumper-rear", [2.2, 0.05, 0.36], [0, 0.0, -2.7], k.dark, 0.015);
      k.tailLights(-2.92, 0.1);
      for (const side of sides) {
        k.bar(
          "bumper-rear",
          [side * 1.2, -0.2, -2.7],
          [side * 1.65, -0.25, -2.76],
          0.04,
          k.dark,
        );
        k.panel("bumper-rear", [0.55, 0.45, 0.06], [side * 1.65, -0.5, -2.78], k.dark, 0.03);
        k.panel("bumper-rear", [0.4, 0.07, 0.3], [side * 1.1, -0.28, -2.8], k.steel, 0.02);
      }
      k.bar("bumper-rear", [0, -0.3, -2.75], [0, -0.3, -3.0], 0.06, k.dark);

      // ---- Chassis dressing: fenders, tanks, shocks, pipes ----
      fenders(k, k.paint);
      k.bar("chassis-front", [0.75, -0.55, 0.5], [0.75, -0.55, -0.3], 0.26, k.steel);
      for (const z of [0.3, -0.1])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.27, 0.03, 10, 40),
          [0.75, -0.55, z],
          k.dark,
        );
      k.panel("chassis-front", [0.5, 0.4, 0.7], [-0.75, -0.5, 0.1], k.dark, 0.06);
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          k.accent,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          k.accent,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.45, -2.5],
          [side * 0.55, -0.45, -2.95],
          0.07,
          k.steel,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.45, -2.85],
          [side * 0.55, -0.45, -2.96],
          0.078,
          k.dark,
        );
      }
      k.panel("chassis-rear", [1.7, 0.55, 1.5], [0, -0.4, -1.5], k.paint, 0.06);
      for (const z of [-1.1, -1.9])
        k.panel("chassis-rear", [1.74, 0.59, 0.08], [0, -0.4, z], k.steel, 0.02);
      k.bar("chassis-rear", [-1.1, -0.5, -2.85], [1.1, -0.5, -2.85], 0.06, k.dark);

      // Dark hub caps over the gray kit hubs, per the concept's black centers.
      const caps = [
        ["wheel-fl", 2.11, 1.65],
        ["wheel-fr", -2.11, 1.65],
        ["wheel-rl", 2.11, -1.65],
        ["wheel-rr", -2.11, -1.65],
      ] as const;
      for (const [part, x, z] of caps)
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
    },
  ),
];
