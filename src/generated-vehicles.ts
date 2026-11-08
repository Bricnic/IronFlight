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
  vehicle(
    "garbage-truck",
    "Garbage Truck",
    "Green sanitation hauler with a ribbed compactor body and rear loader.",
    [4160061, 14211282, 4869450, 0.88, 6],
    (k) => {
      // ---- Nose (hood): cab-over flat face, grille, headlights ----
      k.hull("hood", [
        [0.42, -0.15, 0.62, 1.12, 1.1],
        [2.44, -0.15, 0.62, 1.1, 1.06],
      ]);
      k.panel("hood", [1.3, 0.55, 0.1], [0, 0.28, 2.47], k.dark, 0.05);
      for (let i = 0; i < 4; i++)
        k.panel(
          "hood",
          [1.14, 0.035, 0.05],
          [0, 0.12 + i * 0.09, 2.53],
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
        k.lamp("hood", [side * 0.82, 0.02, 2.48], 0.06, k.amber);
      }

      // ---- Cab upper (roof): split windshield, markers, wipers ----
      cabin(
        k,
        { front: 2.42, back: 0.5, height: 2.02, width: 1.1, slant: 0.14 },
      );
      k.bar("roof", [0, 0.6, 2.45], [0, 1.9, 2.32], 0.055, k.dark);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.45, 0.78, 2.47],
          [side * 0.2, 1.28, 2.41],
          0.022,
          k.dark,
        );
      for (const x of [-0.78, -0.26, 0.26, 0.78])
        k.panel("roof", [0.15, 0.08, 0.09], [x, 2.13, 2.26], k.amber, 0.02);
      k.panel("roof", [2.0, 0.07, 0.12], [0, 2.06, 2.3], k.dark, 0.02);
      for (const side of sides)
        k.panel(
          "roof",
          [0.2, 0.09, 0.07],
          [side * 0.95, 2.0, 2.28],
          k.amber,
          0.018,
        );

      // ---- Cab doors: glass, stripe, mirrors, ladder, steps ----
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
        k.panel(d, [0.06, 0.14, 1.86], [side * 1.19, 0.3, 1.42], k.accent, 0.02);
        k.panel(d, [0.05, 0.03, 1.86], [side * 1.185, 0.4, 1.42], k.dark, 0.008);
        k.panel(d, [0.07, 0.06, 0.3], [side * 1.22, 0.55, 1.95], k.steel, 0.02);
        k.bar(d, [side * 1.15, 1.35, 2.25], [side * 1.42, 1.42, 2.3], 0.03, k.dark);
        k.panel(d, [0.1, 0.28, 0.18], [side * 1.45, 1.42, 2.3], k.dark, 0.03);
        k.panel(d, [0.07, 0.22, 0.03], [side * 1.45, 1.42, 2.195], k.steel, 0.012);
        // Side access ladder on the cab rear pillar.
        for (const z of [0.32, 0.58])
          k.bar(
            d,
            [side * 1.27, 0.02, z],
            [side * 1.27, 1.58, z],
            0.03,
            k.steel,
          );
        for (let i = 0; i < 5; i++) {
          const y = 0.22 + i * 0.3;
          k.bar(
            d,
            [side * 1.27, y, 0.32],
            [side * 1.27, y, 0.58],
            0.022,
            k.steel,
          );
        }
        k.panel(d, [0.34, 0.07, 0.3], [side * 1.12, -0.14, 1.0], k.steel, 0.02);
        k.bar(d, [side * 1.24, 0.1, 2.3], [side * 1.24, 0.7, 2.3], 0.028, k.steel);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 0.6], k.amber, 0.012);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 2.28], k.amber, 0.012);
      }

      // ---- Compactor body (bed): gray box, green ribs, loader ----
      k.hull(
        "bed",
        [
          [-2.35, -0.1, 2.15, 1.1, 1.02],
          [0.35, -0.1, 2.15, 1.1, 1.02],
        ],
        k.accent,
      );
      k.panel("bed", [2.24, 2.1, 0.14], [0, 1.02, 0.3], k.paint, 0.04);
      k.panel("bed", [2.2, 0.32, 2.7], [0, -0.14, -1.0], k.dark, 0.05);
      for (const z of [0.15, -0.3, -0.75, -1.2, -1.65, -2.1]) {
        for (const side of sides)
          k.panel("bed", [0.08, 2.1, 0.2], [side * 1.13, 1.0, z], k.paint, 0.03);
        k.panel("bed", [2.24, 0.15, 0.2], [0, 2.19, z], k.paint, 0.03);
        k.bar("bed", [-1.13, 2.1, z], [1.13, 2.1, z], 0.04, k.paint);
      }
      for (const side of sides) {
        k.bar("bed", [side * 1.02, 2.3, 0.2], [side * 1.02, 2.3, -2.3], 0.06, k.paint);
        k.panel("bed", [0.06, 0.1, 2.4], [side * 1.17, 0.12, -1.0], k.dark, 0.02);
        k.panel("bed", [0.05, 0.07, 0.14], [side * 1.185, 0.35, 0.1], k.amber, 0.012);
        k.panel("bed", [0.05, 0.07, 0.14], [side * 1.185, 0.35, -2.2], k.red, 0.012);
      }
      // Rear loader hopper: sloped tailgate with hydraulics.
      k.hull("bed", [
        [-2.92, 0.3, 1.95, 1.04, 0.96],
        [-2.35, -0.05, 2.15, 1.08, 1.02],
      ]);
      k.panel("bed", [1.7, 1.15, 0.1], [0, 1.05, -2.93], k.paint, 0.03);
      k.panel("bed", [1.5, 0.5, 0.08], [0, 0.55, -2.9], k.dark, 0.03);
      k.bar("bed", [-1.0, 2.02, -2.72], [1.0, 2.02, -2.72], 0.05, k.steel);
      for (const side of sides) {
        k.bar(
          "bed",
          [side * 1.12, 1.78, -1.95],
          [side * 1.08, 0.72, -2.8],
          0.07,
          k.steel,
        );
        k.bar(
          "bed",
          [side * 1.12, 1.78, -1.95],
          [side * 1.1, 1.28, -2.35],
          0.105,
          k.dark,
        );
        k.bar(
          "bed",
          [side * 1.04, 1.78, -1.95],
          [side * 1.2, 1.78, -1.95],
          0.09,
          k.dark,
        );
        k.bar(
          "bed",
          [side * 1.0, 0.72, -2.8],
          [side * 1.16, 0.72, -2.8],
          0.075,
          k.dark,
        );
        k.tube(
          "bed",
          [
            [side * 1.05, 1.5, -1.9],
            [side * 1.02, 1.0, -2.3],
            [side * 1.0, 0.7, -2.7],
          ],
          0.028,
          k.dark,
          24,
        );
        k.lamp("bed", [side * 0.85, 0.5, -2.96], 0.09, k.red, -1);
        k.panel("bed", [0.34, 0.12, 0.05], [side * 0.55, 0.18, -2.94], k.red, 0.015)
          .rotation.z = side * 0.5;
        k.panel("bed", [0.34, 0.12, 0.05], [side * 0.55, 0.18, -2.9], k.accent, 0.015)
          .rotation.z = -side * 0.5;
        k.panel("bed", [0.3, 0.07, 0.24], [side * 0.9, -0.02, -2.9], k.steel, 0.02);
      }
      k.lamp("bed", [0.5, 2.0, -2.62], 0.08, k.white, -1);
      k.panel("bed", [1.9, 0.1, 0.3], [0, 2.32, -1.05], k.paint, 0.03);

      // ---- Front bumper: green bar, tow eyes, plate ----
      k.panel("bumper-front", [2.5, 0.26, 0.34], [0, -0.11, 2.66], k.paint, 0.085);
      k.panel("bumper-front", [2.3, 0.05, 0.28], [0, 0.03, 2.66], k.dark, 0.015);
      for (const side of sides) {
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.032, 12, 32),
          [side * 0.75, -0.12, 2.845],
          k.accent,
        );
        k.lamp("bumper-front", [side * 0.4, -0.11, 2.84], 0.07);
      }
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.11, 2.845], k.accent, 0.01);

      // ---- Rear bumper: step, lights, flaps, hitch ----
      k.panel("bumper-rear", [2.3, 0.18, 0.36], [0, -0.12, -3.02], k.steel, 0.06);
      k.panel("bumper-rear", [2.1, 0.05, 0.3], [0, -0.02, -3.02], k.dark, 0.015);
      k.tailLights(-3.18, 0.02);
      for (const side of sides) {
        k.bar(
          "bumper-rear",
          [side * 1.2, -0.2, -2.7],
          [side * 1.65, -0.25, -2.76],
          0.04,
          k.dark,
        );
        k.panel("bumper-rear", [0.55, 0.45, 0.06], [side * 1.65, -0.5, -2.78], k.dark, 0.03);
        k.panel("bumper-rear", [0.4, 0.1, 0.05], [side * 1.65, -0.35, -2.82], k.red, 0.015);
      }
      k.bar("bumper-rear", [0, -0.3, -3.05], [0, -0.3, -3.28], 0.06, k.dark);

      // ---- Chassis dressing: fenders, tank, shocks, pipes ----
      fenders(k, k.paint);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.24, 0.24, 1.1, 32).rotateX(Math.PI / 2),
        [0.95, -0.55, 0.1],
        k.steel,
      );
      for (const z of [0.4, -0.2])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.25, 0.03, 10, 40),
          [0.95, -0.55, z],
          k.dark,
        );
      k.panel("chassis-front", [0.5, 0.4, 0.7], [-0.85, -0.5, 0.1], k.dark, 0.06);
      k.bar("chassis-front", [0.95, -0.55, -0.45], [0.95, -0.55, -1.5], 0.08, k.steel);
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
      k.panel("chassis-rear", [1.7, 0.5, 1.4], [0, -0.42, -1.4], k.paint, 0.06);
      k.bar("chassis-rear", [-1.1, -0.5, -2.85], [1.1, -0.5, -2.85], 0.06, k.dark);

      // Dark hub caps over the kit hubs.
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
  vehicle(
    "cement-mixer",
    "Cement Mixer",
    "White cab-over mixer with a striped drum and rear chute.",
    [15262938, 14180906, 5922396, 0.9, 6],
    (k) => {
      const drumSteel = finish(0xd9d5cb, 0.34, 0.55);
      const stripe = k.accent;

      // ---- Nose (hood): cab-over flat face, grille, headlights ----
      k.hull("hood", [
        [0.42, -0.15, 0.62, 1.12, 1.1],
        [2.44, -0.15, 0.62, 1.1, 1.06],
      ]);
      k.panel("hood", [1.3, 0.55, 0.1], [0, 0.28, 2.47], k.dark, 0.05);
      for (let i = 0; i < 5; i++)
        k.panel(
          "hood",
          [1.14, 0.035, 0.05],
          [0, 0.1 + i * 0.09, 2.53],
          k.steel,
          0.008,
        );
      k.bar("hood", [-0.65, 0.56, 2.5], [0.65, 0.56, 2.5], 0.03, k.steel);
      k.bar("hood", [-0.65, 0.0, 2.5], [0.65, 0.0, 2.5], 0.03, k.steel);
      k.panel("hood", [1.5, 0.1, 0.06], [0, -0.08, 2.5], stripe, 0.02);
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.65, 0.0, 2.5],
          [side * 0.65, 0.56, 2.5],
          0.03,
          k.steel,
        );
        k.lamp("hood", [side * 0.82, 0.32, 2.5], 0.14);
        k.lamp("hood", [side * 0.82, 0.02, 2.48], 0.06, k.amber);
      }

      // ---- Cab upper (roof): big windshield, visor, beacon, horns ----
      cabin(
        k,
        { front: 2.42, back: 0.5, height: 2.02, width: 1.1, slant: 0.14 },
      );
      k.bar("roof", [0, 0.6, 2.45], [0, 1.9, 2.32], 0.055, k.dark);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.45, 0.78, 2.47],
          [side * 0.2, 1.28, 2.41],
          0.022,
          k.dark,
        );
      k.panel("roof", [2.1, 0.06, 0.34], [0, 2.0, 2.52], k.paint, 0.02);
      for (const x of [-0.78, -0.26, 0.26, 0.78])
        k.panel("roof", [0.14, 0.07, 0.08], [x, 1.95, 2.66], k.amber, 0.018);
      k.bar("roof", [0, 2.06, 1.95], [0, 2.22, 1.95], 0.1, k.steel);
      k.oval("roof", [0.13, 0.16, 0.13], [0, 2.34, 1.95], k.amber);
      k.oval("roof", [0.06, 0.05, 0.06], [0, 2.46, 1.95], k.amber);
      for (const side of sides) {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.07, 0.04, 0.42, 24).rotateX(Math.PI / 2),
          [side * 0.42, 2.16, 1.7],
          k.steel,
        );
        k.bar(
          "roof",
          [side * 0.42, 2.08, 1.6],
          [side * 0.42, 2.14, 1.6],
          0.028,
          k.dark,
        );
      }

      // ---- Cab doors: glass, stripe, mirrors, steps ----
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
        k.panel(d, [0.06, 0.13, 1.86], [side * 1.19, 0.28, 1.42], stripe, 0.02);
        k.panel(d, [0.05, 0.03, 1.86], [side * 1.185, 0.38, 1.42], k.dark, 0.008);
        k.panel(d, [0.07, 0.06, 0.3], [side * 1.22, 0.55, 1.95], k.steel, 0.02);
        k.bar(d, [side * 1.15, 1.35, 2.25], [side * 1.42, 1.42, 2.3], 0.03, k.dark);
        k.panel(d, [0.1, 0.28, 0.18], [side * 1.45, 1.42, 2.3], k.dark, 0.03);
        k.panel(d, [0.07, 0.22, 0.03], [side * 1.45, 1.42, 2.195], k.steel, 0.012);
        k.panel(d, [0.34, 0.07, 0.3], [side * 1.12, -0.14, 1.0], k.steel, 0.02);
        k.panel(d, [0.3, 0.07, 0.26], [side * 1.1, -0.3, 1.0], k.dark, 0.02);
        k.bar(d, [side * 1.24, 0.1, 2.3], [side * 1.24, 0.7, 2.3], 0.028, k.steel);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 0.6], k.amber, 0.012);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 2.28], k.amber, 0.012);
      }

      // ---- Mixer subframe (bed): rails the drum cradle sits on ----
      k.hull("bed", [
        [-2.55, -0.2, 0.12, 0.85, 0.85],
        [0.45, -0.2, 0.12, 0.85, 0.85],
      ]);
      for (const side of sides) {
        k.panel(
          "bed",
          [0.14, 0.24, 3.0],
          [side * 0.78, -0.08, -1.05],
          k.dark,
          0.03,
        );
        k.panel(
          "bed",
          [0.05, 0.07, 0.14],
          [side * 0.87, 0.05, 0.3],
          k.amber,
          0.012,
        );
        k.panel(
          "bed",
          [0.05, 0.07, 0.14],
          [side * 0.87, 0.05, -2.4],
          k.red,
          0.012,
        );
      }

      // ---- Drum: front cone, barrel, rear cone, collar, neck ----
      const drumY = 1.3;
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.42, 1.1, 0.7, 72, 1).rotateX(Math.PI / 2),
        [0, drumY, -0.15],
        drumSteel,
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(1.1, 1.1, 1.4, 96, 1).rotateX(Math.PI / 2),
        [0, drumY, -1.2],
        drumSteel,
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(1.1, 0.5, 0.65, 72, 1).rotateX(Math.PI / 2),
        [0, drumY, -2.225],
        drumSteel,
      );
      k.mesh(
        "bed",
        new T.TorusGeometry(0.5, 0.07, 20, 72),
        [0, drumY, -2.55],
        k.steel,
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.4, 0.34, 0.2, 48, 1).rotateX(Math.PI / 2),
        [0, drumY, -2.65],
        k.dark,
      );
      k.mesh(
        "bed",
        new T.TorusGeometry(0.34, 0.05, 16, 48),
        [0, drumY, -2.75],
        k.steel,
      );

      // Front drive gear with teeth, gearbox, and pedestal.
      k.mesh(
        "bed",
        new T.TorusGeometry(0.52, 0.06, 16, 64),
        [0, drumY, 0.1],
        k.dark,
      );
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        k.mesh(
          "bed",
          new T.BoxGeometry(0.09, 0.09, 0.12),
          [Math.cos(a) * 0.58, drumY + Math.sin(a) * 0.58, 0.1],
          k.steel,
        ).rotation.z = a;
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        k.mesh(
          "bed",
          new T.BoxGeometry(0.06, 0.06, 0.04),
          [Math.cos(a) * 0.32, drumY + Math.sin(a) * 0.32, 0.2],
          k.dark,
        );
      }
      k.panel("bed", [0.5, 0.5, 0.3], [0, drumY, 0.3], k.paint, 0.06);
      k.bar("bed", [0, drumY, 0.2], [0, drumY, 0.5], 0.14, k.dark);
      k.panel("bed", [0.4, 1.0, 0.24], [0, 0.55, 0.3], k.dark, 0.05);

      // Orange spiral stripe wrapped around the barrel.
      const helix: [number, number, number][] = [];
      for (let i = 0; i <= 140; i++) {
        const t = i / 140;
        const a = t * 1.5 * Math.PI * 2;
        helix.push([
          Math.cos(a) * 1.1,
          drumY + Math.sin(a) * 1.1,
          -0.6 - t * 1.2,
        ]);
      }
      k.tube("bed", helix, 0.1, stripe, 220);
      k.oval("bed", [0.1, 0.1, 0.1], [1.1, drumY, -0.6], stripe);
      k.oval("bed", [0.1, 0.1, 0.1], [-1.1, drumY, -1.8], stripe);
      for (const z of [-0.5, -1.9])
        k.mesh(
          "bed",
          new T.TorusGeometry(1.09, 0.055, 16, 96),
          [0, drumY, z],
          stripe,
        );

      // Cradle trestles with rollers under the steel raceways.
      for (const z of [-0.7, -1.7]) {
        k.mesh(
          "bed",
          new T.TorusGeometry(1.09, 0.05, 14, 96),
          [0, drumY, z],
          k.steel,
        );
        for (const side of sides) {
          k.bar(
            "bed",
            [side * 0.82, -0.15, z],
            [side * 0.62, 0.32, z],
            0.09,
            k.steel,
          );
          k.mesh(
            "bed",
            new T.CylinderGeometry(0.11, 0.11, 0.3, 24).rotateX(Math.PI / 2),
            [side * 0.62, 0.32, z],
            k.dark,
          );
        }
        k.bar("bed", [-0.62, 0.32, z], [0.62, 0.32, z], 0.07, k.dark);
      }
      for (const side of sides) {
        k.bar(
          "bed",
          [side * 0.62, 0.32, -0.7],
          [side * 0.62, 0.32, -1.7],
          0.06,
          k.steel,
        );
        k.bar(
          "bed",
          [side * 0.74, 0.04, -0.7],
          [side * 0.66, 0.23, -1.7],
          0.045,
          k.steel,
        );
        k.bar(
          "bed",
          [side * 0.66, 0.23, -0.7],
          [side * 0.74, 0.04, -1.7],
          0.045,
          k.steel,
        );
      }

      // Collector hopper on a support frame under the neck.
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.42, 0.15, 0.36, 32, 1),
        [0, 0.93, -2.75],
        k.steel,
      );
      for (const side of sides)
        k.bar(
          "bed",
          [side * 0.6, 0.05, -2.5],
          [side * 0.28, 0.85, -2.75],
          0.045,
          k.dark,
        );
      k.bar("bed", [-0.28, 0.85, -2.75], [0.28, 0.85, -2.75], 0.04, k.dark);

      // Discharge chute: angled trough past the tail.
      const chutePitch = -0.611;
      k.panel(
        "bed",
        [0.34, 0.05, 0.85],
        [0, 0.57, -3.1],
        k.steel,
        0.015,
      ).rotation.x = chutePitch;
      for (const side of sides)
        k.panel(
          "bed",
          [0.05, 0.15, 0.85],
          [side * 0.185, 0.64, -3.1],
          k.steel,
          0.015,
        ).rotation.x = chutePitch;
      k.panel(
        "bed",
        [0.36, 0.1, 0.04],
        [0, 0.36, -3.44],
        k.steel,
        0.015,
      ).rotation.x = chutePitch;
      k.bar("bed", [0, -0.03, -2.75], [0, 0.62, -3.0], 0.035, k.dark);

      // Rear access ladder + work light.
      for (const x of [-0.95, -0.7])
        k.bar("bed", [x, -0.02, -2.7], [x, 1.68, -2.7], 0.028, k.steel);
      for (let i = 0; i < 6; i++) {
        const y = 0.2 + i * 0.28;
        k.bar("bed", [-0.95, y, -2.7], [-0.7, y, -2.7], 0.02, k.steel);
      }
      k.bar("bed", [-0.7, 1.55, -2.7], [-0.52, 1.35, -2.58], 0.03, k.dark);
      k.bar("bed", [-0.7, 0.5, -2.7], [-0.5, 0.3, -2.58], 0.03, k.dark);
      k.bar("bed", [0.28, 0.85, -2.75], [0.55, 1.7, -2.7], 0.035, k.dark);
      k.lamp("bed", [0.55, 1.76, -2.7], 0.08, k.white, -1);

      // Exhaust stack behind the cab.
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.13, 0.13, 0.7, 24),
        [0.95, 0.35, 0.3],
        k.steel,
      );
      k.bar("bed", [0.95, 0.6, 0.3], [0.95, 2.25, 0.3], 0.085, k.steel);
      k.tube(
        "bed",
        [
          [0.95, 1.9, 0.3],
          [0.95, 2.25, 0.3],
          [0.95, 2.38, 0.12],
        ],
        0.085,
        k.steel,
        24,
      );
      for (const y of [0.9, 1.5])
        k.mesh(
          "bed",
          new T.TorusGeometry(0.095, 0.02, 8, 24).rotateX(Math.PI / 2),
          [0.95, y, 0.3],
          k.dark,
        );

      // ---- Front bumper: white bar, tow eyes, plate ----
      k.panel("bumper-front", [2.5, 0.26, 0.34], [0, -0.11, 2.66], k.paint, 0.085);
      k.panel("bumper-front", [2.3, 0.05, 0.28], [0, 0.03, 2.66], k.dark, 0.015);
      for (const side of sides) {
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.032, 12, 32),
          [side * 0.75, -0.12, 2.845],
          stripe,
        );
        k.lamp("bumper-front", [side * 0.4, -0.11, 2.84], 0.07);
      }
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.11, 2.845], stripe, 0.01);

      // ---- Rear bumper: step, lights, underrun ----
      k.panel("bumper-rear", [2.3, 0.18, 0.36], [0, -0.12, -2.7], k.steel, 0.06);
      k.panel("bumper-rear", [2.1, 0.05, 0.3], [0, -0.02, -2.7], k.dark, 0.015);
      k.tailLights(-2.86, 0.0);
      k.bar("bumper-rear", [-1.1, -0.45, -2.85], [1.1, -0.45, -2.85], 0.06, k.dark);
      for (const side of sides)
        k.bar(
          "bumper-rear",
          [side * 1.0, -0.4, -2.7],
          [side * 1.0, -0.45, -2.85],
          0.045,
          k.dark,
        );

      // ---- Chassis dressing: fenders, tanks, shocks, pipes ----
      fenders(k, k.paint);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.24, 0.24, 1.3, 40).rotateX(Math.PI / 2),
        [0.95, -0.45, -0.35],
        k.steel,
      );
      for (const z of [0.05, -0.75])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.25, 0.03, 10, 48),
          [0.95, -0.45, z],
          k.dark,
        );
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.22, 0.22, 1.1, 40).rotateX(Math.PI / 2),
        [-0.95, -0.47, -0.35],
        drumSteel,
      );
      k.panel("chassis-front", [0.4, 0.34, 0.5], [-0.95, -0.45, 0.75], k.dark, 0.05);
      k.bar("chassis-front", [0, -0.55, 1.5], [0, -0.55, -1.5], 0.07, k.steel);
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          stripe,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          stripe,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.28, -2.4],
          [side * 0.55, -0.28, -2.95],
          0.07,
          k.steel,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.28, -2.85],
          [side * 0.55, -0.28, -2.96],
          0.078,
          k.dark,
        );
        k.panel(
          "chassis-rear",
          [0.6, 0.5, 0.06],
          [side * 1.6, -0.55, -2.85],
          k.dark,
          0.03,
        );
      }
      k.panel("chassis-rear", [1.7, 0.5, 1.2], [0, -0.42, -1.4], k.paint, 0.06);

      // Dark hub caps over the kit hubs.
      const caps = [
        ["wheel-fl", 2.12, 1.65],
        ["wheel-fr", -2.12, 1.65],
        ["wheel-rl", 2.12, -1.65],
        ["wheel-rr", -2.12, -1.65],
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
  vehicle(
    "stretch-limo",
    "Stretch Limo",
    "Black stretch limousine with tinted glass and long chrome trim.",
    [1842724, 12633292, 9080726, 0.72, 10],
    (k) => {
      const chrome = finish(0xe9edf1, 0.14, 0.95);
      const tint = finish(0x11161c, 0.1, 0.55);

      // ---- Long hood: formal nose, upright chrome grille, round lamps ----
      k.hull("hood", [
        [0.4, -0.15, 0.62, 1.12, 1.05],
        [1.5, -0.18, 0.56, 1.1, 1.02],
        [2.42, -0.2, 0.44, 1.0, 0.94],
      ]);
      k.oval("hood", [0.75, 0.1, 1.0], [0, 0.62, 1.45]);
      k.bar("hood", [0, 0.62, 2.32], [0, 0.78, 2.32], 0.025, chrome);
      k.oval("hood", [0.05, 0.09, 0.05], [0, 0.84, 2.32], chrome);
      k.panel("hood", [1.24, 0.6, 0.1], [0, 0.14, 2.47], chrome, 0.04);
      k.panel("hood", [1.06, 0.46, 0.08], [0, 0.14, 2.5], k.dark, 0.02);
      for (let i = 0; i < 9; i++)
        k.bar(
          "hood",
          [-0.44 + i * 0.11, -0.06, 2.55],
          [-0.44 + i * 0.11, 0.34, 2.55],
          0.02,
          chrome,
        );
      k.bar("hood", [-0.55, 0.36, 2.54], [0.55, 0.36, 2.54], 0.025, chrome);
      k.bar("hood", [-0.55, -0.08, 2.54], [0.55, -0.08, 2.54], 0.025, chrome);
      for (const side of sides) {
        k.lamp("hood", [side * 0.78, 0.26, 2.5], 0.15);
        k.lamp("hood", [side * 0.78, -0.02, 2.5], 0.07, k.amber);
        k.oval("hood", [0.34, 0.28, 0.85], [side * 1.0, 0.32, 1.62]);
        k.panel(
          "hood",
          [0.06, 0.05, 0.5],
          [side * 1.13, 0.5, 1.4],
          chrome,
          0.012,
        );
      }

      // ---- Stretch cabin: six tinted side windows, chrome pillars ----
      cabin(k, { front: 2.3, back: -2.25, height: 1.98, width: 1.02, slant: 0.3 });
      for (const side of sides) {
        // Chrome window surround: full-length top and belt rails.
        k.bar(
          "roof",
          [side * 1.12, 1.82, 1.98],
          [side * 1.12, 1.82, -2.02],
          0.032,
          chrome,
        );
        k.bar(
          "roof",
          [side * 1.12, 0.68, 2.05],
          [side * 1.12, 0.68, -2.08],
          0.032,
          chrome,
        );
        // Division pillars -> three windows per side.
        for (const z of [0.9, -0.5]) {
          k.bar(
            "roof",
            [side * 1.06, 0.68, z],
            [side * 1.06, 1.82, z],
            0.065,
            k.paint,
          );
          k.bar(
            "roof",
            [side * 1.13, 0.68, z],
            [side * 1.13, 1.82, z],
            0.03,
            chrome,
          );
        }
        // A- and C-pillars framing windshield and rear glass.
        k.bar(
          "roof",
          [side * 1.0, 0.6, 2.28],
          [side * 1.0, 1.9, 2.02],
          0.05,
          k.paint,
        );
        k.bar(
          "roof",
          [side * 1.0, 0.6, -2.23],
          [side * 1.0, 1.9, -2.05],
          0.05,
          k.paint,
        );
        // Smoked tint overlays: three panes per side between the pillars.
        for (const [z0, z1] of [
          [2.05, 0.97],
          [0.83, -0.43],
          [-0.57, -2.05],
        ] as const)
          k.panel(
            "roof",
            [0.02, 1.06, z0 - z1 - 0.06],
            [side * 1.1, 1.25, (z0 + z1) / 2],
            tint,
            0.008,
          );
        // Tinted windshield panes matching the cabin slant.
        k.panel(
          "roof",
          [0.75, 1.08, 0.02],
          [side * 0.5, 1.24, 2.29],
          tint,
          0.008,
        ).rotation.x = Math.atan2(-0.3, 1.45);
      }
      // Sunroof outline, roof rails, rear antenna.
      k.panel("roof", [0.9, 0.03, 1.2], [0, 2.06, -0.3], k.dark, 0.012);
      k.bar("roof", [-0.45, 2.06, 0.3], [-0.45, 2.06, -0.9], 0.018, chrome);
      k.bar("roof", [0.45, 2.06, 0.3], [0.45, 2.06, -0.9], 0.018, chrome);
      k.bar("roof", [0.8, 1.98, -1.85], [0.8, 2.7, -1.95], 0.014, k.dark);
      k.oval("roof", [0.03, 0.05, 0.03], [0.8, 2.72, -1.95], chrome);
      // Dark cabin interior seen through the glass.
      k.panel("roof", [1.6, 0.4, 0.4], [0, 0.9, 1.7], k.dark, 0.06);
      k.panel("roof", [1.6, 0.45, 0.45], [0, 0.85, 0.4], k.dark, 0.08);
      k.panel("roof", [1.6, 0.5, 0.5], [0, 0.85, -1.2], k.dark, 0.08);
      k.mesh(
        "roof",
        new T.TorusGeometry(0.17, 0.028, 12, 48),
        [-0.45, 1.05, 1.35],
        k.dark,
      ).rotation.x = -0.5;
      k.oval("roof", [0.5, 0.12, 0.3], [0, 1.15, -0.4], k.dark);

      // ---- Stretched flanks: chrome spears, handles, mirrors ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [-2.3, -0.15],
            [2.0, -0.15],
            [1.9, 0.55],
            [-2.2, 0.6],
          ],
          0.12,
          side * 1.12,
          k.paint,
          0.03,
        );
        k.bar(
          d,
          [side * 1.2, 0.58, 1.9],
          [side * 1.2, 0.58, -2.2],
          0.028,
          chrome,
        );
        k.panel(d, [0.05, 0.07, 3.6], [side * 1.2, 0.05, -0.15], chrome, 0.015);
        k.panel(d, [0.06, 0.05, 4.0], [side * 1.19, -0.12, -0.15], k.dark, 0.012);
        for (const z of [1.2, 0.0, -1.2]) {
          k.panel(d, [0.07, 0.05, 0.28], [side * 1.22, 0.42, z], chrome, 0.018);
          k.bar(
            d,
            [side * 1.19, -0.1, z + 0.35],
            [side * 1.19, 0.55, z + 0.35],
            0.012,
            k.dark,
          );
        }
        k.bar(
          d,
          [side * 1.15, 1.05, 1.95],
          [side * 1.38, 1.12, 2.0],
          0.028,
          k.dark,
        );
        k.panel(d, [0.09, 0.24, 0.16], [side * 1.41, 1.12, 2.0], chrome, 0.03);
        k.panel(d, [0.06, 0.18, 0.03], [side * 1.41, 1.12, 1.9], k.glass, 0.01);
        k.oval(d, [0.06, 0.1, 0.35], [side * 1.2, 0.55, 1.85], chrome);
        k.oval(d, [0.06, 0.1, 0.35], [side * 1.2, 0.55, -2.1], chrome);
      }

      // ---- Trunk deck: tapered tail, chrome strip, plate ----
      k.hull("bed", [
        [-2.55, -0.18, 0.5, 1.0, 0.95],
        [-0.85, -0.15, 0.6, 1.1, 1.03],
      ]);
      k.panel("bed", [1.7, 0.06, 1.2], [0, 0.56, -1.7], k.paint, 0.025);
      k.bar("bed", [-0.8, 0.5, -2.5], [0.8, 0.5, -2.5], 0.028, chrome);
      k.oval("bed", [0.12, 0.07, 0.04], [0, 0.38, -2.56], chrome);
      k.panel("bed", [0.44, 0.14, 0.05], [0, 0.12, -2.58], k.accent, 0.015);
      for (const side of sides) {
        k.oval("bed", [0.34, 0.28, 0.85], [side * 1.0, 0.32, -1.62]);
        k.lamp("bed", [side * 0.72, 0.3, -2.52], 0.09, k.red, -1);
      }

      // ---- Chrome bumpers with overriders ----
      k.panel("bumper-front", [2.4, 0.22, 0.3], [0, -0.12, 2.62], chrome, 0.08);
      k.panel(
        "bumper-front",
        [2.42, 0.07, 0.31],
        [0, -0.12, 2.62],
        k.dark,
        0.03,
      );
      for (const side of sides) {
        k.panel(
          "bumper-front",
          [0.24, 0.34, 0.36],
          [side * 0.7, -0.08, 2.62],
          chrome,
          0.06,
        );
        k.lamp("bumper-front", [side * 1.02, -0.1, 2.72], 0.06, k.amber);
      }
      k.panel("bumper-rear", [2.4, 0.22, 0.3], [0, -0.1, -2.62], chrome, 0.08);
      for (const side of sides)
        k.panel(
          "bumper-rear",
          [0.24, 0.34, 0.36],
          [side * 0.7, -0.06, -2.62],
          chrome,
          0.06,
        );
      k.tailLights(-2.78, 0.18);

      // ---- Chassis dress: arches, boards, shocks, exhaust ----
      fenders(k, k.paint);
      for (const side of sides) {
        k.panel(
          "chassis-front",
          [0.4, 0.09, 1.35],
          [side * 1.35, -0.32, 0.1],
          chrome,
          0.03,
        );
        k.panel(
          "chassis-front",
          [0.34, 0.04, 1.25],
          [side * 1.35, -0.26, 0.1],
          k.dark,
          0.015,
        );
        k.shock(
          "chassis-front",
          [side * 1.2, -0.8, 1.65],
          [side * 0.8, -0.2, 1.65],
          k.steel,
        );
        k.shock(
          "chassis-rear",
          [side * 1.2, -0.8, -1.65],
          [side * 0.8, -0.2, -1.65],
          k.steel,
        );
        k.tube(
          "chassis-rear",
          [
            [side * 0.5, -0.45, -1.9],
            [side * 0.5, -0.45, -2.5],
            [side * 0.55, -0.42, -2.78],
          ],
          0.07,
          chrome,
          24,
        );
        k.oval("chassis-rear", [0.09, 0.09, 0.05], [side * 0.55, -0.42, -2.79], k.dark);
      }
      k.bar("chassis-front", [0, -0.55, 0.2], [0, -0.55, 1.6], 0.07, k.steel);
      k.bar("chassis-rear", [0, -0.55, -0.6], [0, -0.55, -1.6], 0.07, k.steel);
      k.oval("chassis-front", [0.5, 0.3, 0.4], [0, -0.5, 0.6], k.dark);
      k.panel("chassis-front", [1.4, 0.08, 0.5], [0, -0.5, 2.3], k.dark, 0.02);
    },
  ),
  vehicle(
    "rubber-ducky",
    "Rubber Ducky",
    "Giant yellow bath-duck derby car with a beak nose and wing doors.",
    [15909137, 16347926, 8028808, 0.8, 8],
    (k) => {
      const feather = finish(0xbd8f0a, 0.42, 0.08);
      const eyeWhite = finish(0xffffff, 0.22, 0);
      const pupil = finish(0x4a2a10, 0.32, 0.05);
      const bubble = finish(0xf2faff, 0.12, 0.15);

      // ---- Face (hood): rounded duck head, orange beak, smile seam ----
      k.hull("hood", [
        [0.42, -0.15, 0.55, 1.12, 1.06],
        [1.55, -0.18, 0.52, 1.1, 1.03],
        [2.42, -0.2, 0.32, 0.92, 0.88],
      ]);
      k.oval("hood", [1.02, 0.42, 1.0], [0, 0.5, 1.55]);
      // Upper + lower beak with a dark smile seam and nostrils.
      k.oval("hood", [0.72, 0.2, 0.4], [0, 0.24, 2.45], k.accent);
      k.oval("hood", [0.5, 0.14, 0.25], [0, 0.18, 2.7], k.accent);
      k.oval("hood", [0.55, 0.13, 0.3], [0, 0.0, 2.5], k.accent);
      k.tube(
        "hood",
        [
          [-0.62, 0.12, 2.5],
          [-0.3, 0.06, 2.68],
          [0, 0.05, 2.72],
          [0.3, 0.06, 2.68],
          [0.62, 0.12, 2.5],
        ],
        0.028,
        k.dark,
        48,
      );
      for (const side of sides) {
        k.oval("hood", [0.05, 0.03, 0.07], [side * 0.18, 0.4, 2.5], k.dark);
        k.lamp("hood", [side * 0.98, 0.02, 2.25], 0.07, k.amber);
      }
      // Bath bubbles clinging to the nose.
      k.oval("hood", [0.09, 0.09, 0.09], [0.55, 0.82, 1.2], bubble);
      k.oval("hood", [0.07, 0.07, 0.07], [-0.4, 0.86, 1.7], bubble);
      k.oval("hood", [0.06, 0.06, 0.06], [0.1, 0.9, 1.05], bubble);

      // ---- Head (roof): windshield cartoon eyes, tuft, dome ----
      cabin(
        k,
        { front: 2.0, back: -1.0, height: 1.95, width: 1.02, slant: 0.4 },
      );
      k.oval("roof", [1.04, 0.62, 1.35], [0, 1.75, 0.35]);
      const tilt = Math.atan2(-0.4, 1.95 - 0.53);
      for (const side of sides) {
        k.oval(
          "roof",
          [0.3, 0.4, 0.14],
          [side * 0.44, 1.32, 1.95],
          eyeWhite,
        ).rotation.x = tilt;
        k.oval(
          "roof",
          [0.16, 0.24, 0.09],
          [side * 0.44, 1.3, 2.09],
          pupil,
        ).rotation.x = tilt;
        k.oval("roof", [0.05, 0.07, 0.04], [side * 0.38, 1.42, 2.16], eyeWhite);
        k.bar(
          "roof",
          [side * 0.18, 1.8, 1.82],
          [side * 0.7, 1.76, 1.86],
          0.035,
          k.dark,
        );
      }
      for (const x of [-0.18, 0, 0.18])
        k.oval("roof", [0.11, 0.28, 0.11], [x, 2.42, 0.1]);
      k.oval("roof", [0.08, 0.08, 0.08], [0.9, 1.2, 0.9], bubble);
      k.oval("roof", [0.06, 0.06, 0.06], [-0.85, 1.5, -0.4], bubble);

      // ---- Wings (doors): layered feathers fanning to the tail ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [0.95, -0.1],
            [0.95, 0.5],
            [-0.6, 0.62],
            [-1.15, 0.1],
          ],
          0.12,
          side * 1.13,
          feather,
          0.04,
        );
        for (let i = 0; i < 3; i++) {
          k.panel(
            d,
            [0.1, 0.26, 0.72],
            [side * 1.25, 0.34 - i * 0.15, -0.3 - i * 0.14],
            i === 1 ? k.paint : feather,
            0.06,
          ).rotation.x = -0.12 - i * 0.1;
          k.bar(
            d,
            [side * 1.31, 0.34 - i * 0.15, 0.02 - i * 0.14],
            [side * 1.31, 0.34 - i * 0.15, -0.62 - i * 0.14],
            0.02,
            k.dark,
          );
        }
        k.oval(d, [0.1, 0.2, 0.36], [side * 1.22, 0.1, -1.05], k.paint);
        // Wing mirror on a stalk.
        k.bar(d, [side * 1.15, 0.9, 0.85], [side * 1.4, 1.0, 0.9], 0.028, k.dark);
        k.panel(d, [0.09, 0.22, 0.16], [side * 1.43, 1.0, 0.9], k.dark, 0.03);
        k.panel(d, [0.06, 0.16, 0.03], [side * 1.43, 1.0, 0.81], k.glass, 0.01);
      }

      // ---- Tail (bed): rump, feather tuft, spoiler wing ----
      k.hull("bed", [
        [-2.55, -0.15, 0.5, 1.02, 0.95],
        [-0.85, -0.15, 0.6, 1.1, 1.03],
      ]);
      k.oval("bed", [1.0, 0.66, 0.85], [0, 0.62, -1.95]);
      [-0.28, 0, 0.28].forEach((x, i) => {
        const f = k.oval("bed", [0.16, 0.45, 0.28], [x, 1.3, -2.05], feather);
        f.rotation.x = -0.35;
        f.rotation.z = (i - 1) * 0.3;
      });
      for (const side of sides)
        k.bar(
          "bed",
          [side * 0.7, 0.75, -2.3],
          [side * 0.7, 1.5, -2.48],
          0.06,
          k.paint,
        );
      k.panel("bed", [2.0, 0.12, 0.55], [0, 1.58, -2.5], k.paint, 0.05);
      for (const side of sides)
        k.panel(
          "bed",
          [0.08, 0.34, 0.6],
          [side * 1.0, 1.72, -2.5],
          k.accent,
          0.03,
        );
      k.oval("bed", [0.22, 0.16, 0.06], [0, 0.5, -2.52], k.accent);
      for (const side of sides)
        k.lamp("bed", [side * 0.85, 0.3, -2.56], 0.09, k.red, -1);
      k.oval("bed", [0.09, 0.09, 0.09], [-0.6, 1.15, -1.5], bubble);
      k.oval("bed", [0.07, 0.07, 0.07], [0.7, 1.05, -1.2], bubble);

      // ---- Bumpers: orange bullbar, tail lights, duck feet ----
      k.panel("bumper-front", [2.2, 0.2, 0.28], [0, -0.12, 2.62], k.accent, 0.07);
      for (const y of [-0.05, 0.12])
        k.bar("bumper-front", [-0.8, y, 2.95], [0.8, y, 2.95], 0.06, k.accent);
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.8, -0.2, 2.95],
          [side * 0.8, 0.12, 2.95],
          0.055,
          k.accent,
        );
        k.bar(
          "bumper-front",
          [side * 0.8, -0.12, 2.7],
          [side * 0.8, -0.12, 2.95],
          0.05,
          k.accent,
        );
        k.lamp("bumper-front", [side * 0.5, -0.12, 2.77], 0.08);
      }
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.12, 2.77], k.white, 0.01);
      k.panel("bumper-rear", [2.3, 0.22, 0.3], [0, -0.1, -2.62], k.paint, 0.07);
      k.tailLights(-2.78, 0.16);
      for (const side of sides) {
        k.bar(
          "bumper-rear",
          [side * 1.15, -0.2, -2.65],
          [side * 1.5, -0.3, -2.7],
          0.04,
          k.dark,
        );
        k.panel(
          "bumper-rear",
          [0.5, 0.4, 0.06],
          [side * 1.5, -0.45, -2.7],
          k.dark,
          0.03,
        );
        k.oval(
          "bumper-rear",
          [0.16, 0.1, 0.04],
          [side * 1.5, -0.42, -2.74],
          k.accent,
        );
      }
      k.mesh(
        "bumper-rear",
        new T.TorusGeometry(0.09, 0.03, 12, 32),
        [0, -0.28, -2.72],
        k.dark,
      );

      // ---- Chassis dress: fenders, shocks, steps, pipes ----
      fenders(k, k.paint);
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
        k.panel(
          "chassis-front",
          [0.4, 0.08, 0.5],
          [side * 1.15, -0.3, 0.15],
          k.steel,
          0.02,
        );
        k.tube(
          "chassis-rear",
          [
            [side * 0.5, -0.45, -1.9],
            [side * 0.5, -0.45, -2.5],
            [side * 0.55, -0.42, -2.78],
          ],
          0.07,
          k.steel,
          24,
        );
        k.oval(
          "chassis-rear",
          [0.09, 0.09, 0.05],
          [side * 0.55, -0.42, -2.79],
          k.dark,
        );
      }
      k.panel("chassis-front", [1.6, 0.1, 0.6], [0, -0.48, 2.25], k.accent, 0.03);

      // Yellow hub caps over the kit hubs.
      const caps = [
        ["wheel-fl", 2.08, 1.65],
        ["wheel-fr", -2.08, 1.65],
        ["wheel-rl", 2.08, -1.65],
        ["wheel-rr", -2.08, -1.65],
      ] as const;
      for (const [part, x, z] of caps)
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.paint,
        );
    },
  ),
  vehicle(
    "couch-cruiser",
    "Couch Cruiser",
    "Living-room sofa on wheels with cushions, a floor lamp, and a rug skirt.",
    [8014382, 4885652, 6050120, 0.82, 6],
    (k) => {
      const leatherDark = finish(0x5e3722, 0.62, 0.05);
      const cushionTan = finish(0x9a7f5e, 0.92, 0);
      const pillowDark = finish(0x35656b, 0.9, 0);
      const brass = gold();
      const shadeMat = finish(0xf3e3c2, 0.7, 0);
      const rugRed = finish(0x7a2430, 0.95, 0);
      const rugBlue = finish(0x2e4a7c, 0.95, 0);
      const rugGold = finish(0xc9a24e, 0.9, 0);
      const fringeMat = finish(0xe8d9b8, 0.95, 0);

      // ---- Front face (hood): leather base front, headlights, buttons ----
      k.panel("hood", [2.3, 0.72, 0.3], [0, 0.5, 1.32], k.paint, 0.08);
      k.panel("hood", [2.3, 0.18, 0.24], [0, 0.84, 1.34], leatherDark, 0.06);
      k.bar("hood", [-1.05, 0.72, 1.47], [1.05, 0.72, 1.47], 0.025, leatherDark);
      for (const side of sides) {
        k.lamp("hood", [side * 0.82, 0.52, 1.48], 0.13);
        k.lamp("hood", [side * 0.82, 0.18, 1.46], 0.07, k.amber);
      }
      for (const x of [-0.55, 0, 0.55])
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.04, 0.04, 0.04, 16).rotateX(Math.PI / 2),
          [x, 0.42, 1.47],
          leatherDark,
        );

      // ---- Seat base + cushions (chassis-front): three tan fabric seats ----
      k.panel("chassis-front", [2.2, 0.3, 2.7], [0, 0.32, 0.05], leatherDark, 0.06);
      for (const x of [-0.75, 0, 0.75]) {
        k.panel("chassis-front", [0.7, 0.22, 1.3], [x, 0.95, 0.45], cushionTan, 0.09);
        for (const z of [0.15, 0.75])
          k.mesh(
            "chassis-front",
            new T.CylinderGeometry(0.035, 0.035, 0.03, 12),
            [x, 1.06, z],
            leatherDark,
          );
      }

      // ---- Backrest (roof): leather back, cushions, pillows, grab frame ----
      k.panel("roof", [2.3, 1.15, 0.42], [0, 1.4, -1.15], k.paint, 0.1);
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.13, 0.13, 2.3, 24).rotateZ(Math.PI / 2),
        [0, 2.0, -1.15],
        leatherDark,
      );
      for (const x of [-0.75, 0, 0.75]) {
        k.panel("roof", [0.68, 0.78, 0.24], [x, 1.38, -0.86], k.paint, 0.09).rotation.x =
          -0.1;
        for (const y of [1.22, 1.52])
          k.mesh(
            "roof",
            new T.CylinderGeometry(0.032, 0.032, 0.04, 12).rotateX(Math.PI / 2),
            [x, y, -0.72],
            leatherDark,
          );
      }
      // Four teal throw pillows leaning on the back cushions.
      for (const [x, tilt] of [
        [-0.88, 0.15],
        [-0.58, -0.1],
        [0.58, 0.1],
        [0.88, -0.15],
      ] as const) {
        const pillow = k.oval("roof", [0.3, 0.32, 0.13], [x, 1.32, -0.62], k.accent);
        pillow.rotation.x = -0.32;
        pillow.rotation.y = tilt;
        const button = k.mesh(
          "roof",
          new T.CylinderGeometry(0.032, 0.032, 0.05, 12).rotateX(Math.PI / 2),
          [x, 1.3, -0.48],
          pillowDark,
        );
        button.rotation.x = -0.32;
      }
      // Dark grab frame over the middle seat, per the concept.
      for (const side of sides) {
        k.bar("roof", [side * 0.55, 1.0, -0.3], [side * 0.55, 1.85, -0.35], 0.05, k.dark);
        k.bar("roof", [side * 0.55, 1.0, -0.7], [side * 0.55, 1.85, -0.75], 0.05, k.dark);
        k.bar("roof", [side * 0.55, 1.85, -0.75], [side * 0.55, 1.85, -0.35], 0.05, k.dark);
      }
      k.bar("roof", [-0.55, 1.85, -0.35], [0.55, 1.85, -0.35], 0.05, k.dark);
      k.bar("roof", [-0.55, 1.85, -0.75], [0.55, 1.85, -0.75], 0.05, k.dark);
      // Throw blanket draped over the backrest's left top.
      k.panel("roof", [0.7, 0.08, 0.5], [-0.7, 2.04, -1.15], rugBlue, 0.03);
      k.panel("roof", [0.7, 0.5, 0.08], [-0.7, 1.76, -0.92], rugBlue, 0.03);
      for (let i = 0; i < 4; i++)
        k.bar(
          "roof",
          [-0.97 + i * 0.18, 1.52, -0.9],
          [-0.97 + i * 0.18, 1.4, -0.9],
          0.014,
          fringeMat,
        );

      // ---- Armrests + rug skirts (doors): rolled arms, scrolls, fringe ----
      for (const side of sides) {
        const d = door(side);
        k.panel(d, [0.24, 0.7, 2.6], [side * 1.05, 0.5, 0.05], k.paint, 0.07);
        k.mesh(
          d,
          new T.CylinderGeometry(0.21, 0.21, 2.5, 28).rotateX(Math.PI / 2),
          [side * 1.05, 1.0, 0.05],
          k.paint,
        );
        k.mesh(
          d,
          new T.CylinderGeometry(0.28, 0.28, 0.22, 32).rotateX(Math.PI / 2),
          [side * 1.05, 0.95, 1.32],
          k.paint,
        );
        k.mesh(
          d,
          new T.TorusGeometry(0.16, 0.035, 12, 40),
          [side * 1.05, 0.95, 1.44],
          leatherDark,
        );
        k.oval(d, [0.09, 0.09, 0.07], [side * 1.05, 0.95, 1.43], leatherDark);
        k.oval(d, [0.2, 0.2, 0.16], [side * 1.05, 0.98, -1.22], k.paint);
        k.bar(d, [side * 1.05, 1.2, -1.1], [side * 1.05, 1.2, 1.2], 0.022, leatherDark);
        // Rug skirt with stripes and fringe between the wheels.
        k.panel(d, [0.06, 0.52, 1.7], [side * 1.19, -0.02, 0], rugRed, 0.02);
        k.panel(d, [0.02, 0.08, 1.6], [side * 1.225, 0.1, 0], rugGold, 0.008);
        k.panel(d, [0.02, 0.1, 1.6], [side * 1.225, -0.02, 0], rugBlue, 0.008);
        k.panel(d, [0.02, 0.08, 1.6], [side * 1.225, -0.14, 0], rugGold, 0.008);
        k.bar(d, [side * 1.2, 0.25, -0.85], [side * 1.2, 0.25, 0.85], 0.03, brass);
        for (let i = 0; i < 8; i++) {
          const z = -0.75 + i * 0.214;
          k.bar(d, [side * 1.19, -0.26, z], [side * 1.19, -0.38, z], 0.016, fringeMat);
        }
      }

      // ---- Rear deck (bed): rear face, floor lamp, rug, tail lights ----
      k.panel("bed", [2.3, 0.7, 0.3], [0, 0.5, -1.32], k.paint, 0.08);
      k.panel("bed", [2.3, 0.1, 0.4], [0, 0.9, -1.5], leatherDark, 0.03);
      k.panel("bed", [1.6, 0.45, 0.06], [0, 0.0, -1.5], rugRed, 0.02);
      k.panel("bed", [1.5, 0.07, 0.02], [0, 0.1, -1.535], rugGold, 0.008);
      k.panel("bed", [1.5, 0.09, 0.02], [0, -0.02, -1.535], rugBlue, 0.008);
      for (let i = 0; i < 6; i++) {
        const x = -0.65 + i * 0.26;
        k.bar("bed", [x, -0.2, -1.5], [x, -0.32, -1.5], 0.016, fringeMat);
      }
      // Brass floor lamp on the rear deck, right side.
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.16, 0.2, 0.08, 24),
        [0.85, 0.99, -1.5],
        brass,
      );
      k.bar("bed", [0.85, 1.0, -1.5], [0.85, 2.25, -1.5], 0.045, brass);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.24, 0.36, 0.52, 32, 1, true),
        [0.85, 2.4, -1.5],
        shadeMat,
      );
      const shadeTop = k.mesh(
        "bed",
        new T.TorusGeometry(0.24, 0.02, 10, 40),
        [0.85, 2.66, -1.5],
        brass,
      );
      shadeTop.rotation.x = Math.PI / 2;
      const shadeBottom = k.mesh(
        "bed",
        new T.TorusGeometry(0.36, 0.022, 10, 48),
        [0.85, 2.14, -1.5],
        brass,
      );
      shadeBottom.rotation.x = Math.PI / 2;
      k.oval("bed", [0.09, 0.11, 0.09], [0.85, 2.3, -1.5], k.white);
      k.bar("bed", [0.85, 2.66, -1.5], [0.85, 2.76, -1.5], 0.02, brass);
      k.mesh(
        "bed",
        new T.SphereGeometry(0.045, 16, 12),
        [0.85, 2.79, -1.5],
        brass,
      );
      k.bar("bed", [1.08, 2.12, -1.5], [1.08, 1.82, -1.5], 0.012, k.dark);
      k.mesh(
        "bed",
        new T.SphereGeometry(0.03, 12, 10),
        [1.08, 1.79, -1.5],
        brass,
      );
      for (const side of sides)
        k.lamp("bed", [side * 0.85, 0.55, -1.48], 0.1, k.red, -1);

      // ---- Bumpers: tubular bars with white tow loops ----
      k.bar("bumper-front", [-1.15, -0.1, 2.55], [1.15, -0.1, 2.55], 0.11, k.dark);
      for (const side of sides) {
        k.bar("bumper-front", [side * 0.7, -0.1, 2.3], [side * 0.7, -0.1, 2.55], 0.06, k.dark);
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.85, -0.28, 2.55],
          k.white,
        );
        k.lamp("bumper-front", [side * 0.45, -0.1, 2.62], 0.08);
      }
      k.bar("bumper-rear", [-1.15, -0.1, -2.6], [1.15, -0.1, -2.6], 0.11, k.dark);
      for (const side of sides) {
        k.bar("bumper-rear", [side * 0.7, -0.1, -2.35], [side * 0.7, -0.1, -2.6], 0.06, k.dark);
        k.mesh(
          "bumper-rear",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.85, -0.28, -2.6],
          k.white,
        );
      }
      k.tailLights(-2.72, 0.12);

      // ---- Chassis dress: shocks, tank, pipes, rolled rug ----
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
          [side * 0.55, -0.45, -2.3],
          [side * 0.55, -0.45, -2.8],
          0.07,
          k.steel,
        );
      }
      k.bar("chassis-front", [0.75, -0.55, 0.5], [0.75, -0.55, -0.3], 0.26, k.steel);
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.16, 0.16, 1.6, 24).rotateZ(Math.PI / 2),
        [0, -0.5, -2.2],
        rugRed,
      );
      for (const x of [-0.5, 0.5]) {
        const strap = k.mesh(
          "chassis-rear",
          new T.TorusGeometry(0.16, 0.025, 10, 32),
          [x, -0.5, -2.2],
          k.dark,
        );
        strap.rotation.y = Math.PI / 2;
      }

      // Brass hub caps over the kit hubs.
      const caps = [
        ["wheel-fl", 2.08, 1.65],
        ["wheel-fr", -2.08, 1.65],
        ["wheel-rl", 2.08, -1.65],
        ["wheel-rr", -2.08, -1.65],
      ] as const;
      for (const [part, x, z] of caps)
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          brass,
        );
    },
  ),
  vehicle(
    "shopping-cart",
    "Shopping Cart",
    "Oversized chrome grocery cart with a child seat and a stocked basket.",
    [12174025, 14039855, 7041400, 0.78, 8],
    (k) => {
      const chrome = k.steel;
      const trim = k.accent;
      const cardboard = finish(0xc9a06a, 0.85, 0);
      const cardboardDark = finish(0x9c7748, 0.85, 0);
      const boxGreen = finish(0x6aa84f, 0.65, 0.05);
      const boxRed = finish(0xb83a2a, 0.65, 0.05);
      const boxYellow = finish(0xe8b93a, 0.65, 0.05);
      const boxBlue = finish(0x4a7fb5, 0.65, 0.05);
      const appleRed = finish(0xc22a20, 0.45, 0.05);
      const orange = finish(0xe8862a, 0.6, 0);
      const leafGreen = finish(0x3f9e3f, 0.7, 0);
      const milkWhite = finish(0xf2f0e8, 0.5, 0);
      const baguette = finish(0xd9a85f, 0.8, 0);

      // Basket frame: floor half-width 0.88 at y=0.55 flaring to 1.12 at
      // the top rim; front wall leans out to z=2.3, rear wall to z=-2.2.
      const sideX = (y: number) => 0.88 + ((y - 0.55) / 1.45) * 0.24;
      const frontZ = (y: number) => 1.9 + Math.min((y - 0.55) / 1.2, 1) * 0.4;
      const rearZ = (y: number) => -1.85 - ((y - 0.55) / 1.45) * 0.35;
      const LEVELS = [0.78, 1.02, 1.26, 1.5, 1.72];

      // ---- Side basket walls (doors): wire grids, rails, corner caps ----
      for (const side of sides) {
        const d = door(side);
        const X = (y: number) => side * sideX(y);
        k.bar(
          d,
          [X(0.55), 0.55, rearZ(0.55)],
          [X(0.55), 0.55, frontZ(0.55)],
          0.05,
          chrome,
        );
        for (let i = 0; i <= 17; i++) {
          const t = i / 17;
          k.bar(
            d,
            [side * 0.88, 0.55, -1.85 + t * 3.75],
            [side * 1.12, 2.0 - t * 0.25, -2.2 + t * 4.5],
            0.024,
            chrome,
          );
        }
        for (const y of LEVELS)
          k.bar(d, [X(y), y, rearZ(y)], [X(y), y, frontZ(y)], 0.024, chrome);
        k.tube(
          d,
          [
            [side * 1.12, 2.0, -2.2],
            [side * 1.12, 1.9, 0.0],
            [side * 1.12, 1.75, 2.3],
          ],
          0.05,
          chrome,
        );
        k.bar(d, [side * 0.88, 0.55, 1.9], [side * 1.12, 1.75, 2.3], 0.05, chrome);
        k.bar(d, [side * 0.88, 0.55, -1.85], [side * 1.12, 2.0, -2.2], 0.05, chrome);
        k.panel(d, [0.16, 0.16, 0.18], [side * 1.12, 1.75, 2.3], trim, 0.06);
        k.panel(d, [0.16, 0.16, 0.18], [side * 1.12, 2.0, -2.2], trim, 0.06);
      }

      // ---- Front basket wall (hood): wire grid, rim, kick plate, lamps ----
      k.bar("hood", [-0.88, 0.55, 1.9], [0.88, 0.55, 1.9], 0.05, chrome);
      for (let i = 0; i <= 12; i++) {
        const x = -1 + (i / 12) * 2;
        k.bar(
          "hood",
          [x * 0.88, 0.55, 1.9],
          [x * 1.12, 1.75, 2.3],
          0.024,
          chrome,
        );
      }
      for (const y of [0.78, 1.02, 1.26, 1.5]) {
        const t = (y - 0.55) / 1.2;
        const hw = 0.88 + t * 0.24;
        k.bar(
          "hood",
          [-hw, y, 1.9 + t * 0.4],
          [hw, y, 1.9 + t * 0.4],
          0.024,
          chrome,
        );
      }
      k.bar("hood", [-1.12, 1.75, 2.3], [1.12, 1.75, 2.3], 0.05, chrome);
      k.panel("hood", [1.7, 0.3, 0.12], [0, 0.3, 2.0], chrome, 0.05);
      for (const side of sides)
        k.lamp("hood", [side * 0.6, 0.32, 2.07], 0.1);

      // ---- Rear basket wall (bed): grid, red handle, child seat ----
      k.bar("bed", [-0.88, 0.55, -1.85], [0.88, 0.55, -1.85], 0.05, chrome);
      for (let i = 0; i <= 12; i++) {
        const x = -1 + (i / 12) * 2;
        k.bar(
          "bed",
          [x * 0.88, 0.55, -1.85],
          [x * 1.12, 2.0, -2.2],
          0.024,
          chrome,
        );
      }
      for (const y of [0.78, 1.02, 1.26, 1.5, 1.74]) {
        const t = (y - 0.55) / 1.45;
        const hw = 0.88 + t * 0.24;
        k.bar(
          "bed",
          [-hw, y, -1.85 - t * 0.35],
          [hw, y, -1.85 - t * 0.35],
          0.024,
          chrome,
        );
      }
      k.bar("bed", [-1.12, 2.0, -2.2], [1.12, 2.0, -2.2], 0.05, chrome);
      k.bar("bed", [-1.12, 2.34, -2.42], [1.12, 2.34, -2.42], 0.078, trim);
      for (const side of sides) {
        k.bar(
          "bed",
          [side * 1.12, 2.0, -2.2],
          [side * 1.12, 2.34, -2.42],
          0.045,
          chrome,
        );
        k.panel("bed", [0.2, 0.14, 0.2], [side * 1.12, 2.34, -2.42], trim, 0.06);
      }
      // Child seat hanging on the rear wall: base + slatted back.
      k.panel("bed", [0.92, 0.12, 0.52], [0, 1.44, -1.85], trim, 0.05);
      k.panel("bed", [0.92, 0.16, 0.14], [0, 1.98, -2.1], trim, 0.06);
      for (const sx of [-0.31, 0, 0.31])
        k.panel("bed", [0.15, 0.46, 0.1], [sx, 1.72, -2.08], trim, 0.045);
      for (const side of sides)
        k.bar(
          "bed",
          [side * 0.46, 1.5, -1.59],
          [side * 0.46, 1.5, -2.08],
          0.028,
          chrome,
        );

      // ---- Basket floor grid (chassis-front) ----
      for (let i = 0; i <= 10; i++) {
        const x = -0.8 + (i / 10) * 1.6;
        k.bar("chassis-front", [x, 0.55, -1.8], [x, 0.55, 1.85], 0.022, chrome);
      }
      for (const z of [-1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5])
        k.bar("chassis-front", [-0.85, 0.55, z], [0.85, 0.55, z], 0.022, chrome);

      // ---- Undercarriage: lower rack, posts, shocks, exhaust ----
      for (const side of sides) {
        k.bar(
          "chassis-front",
          [side * 1.0, -0.15, 2.0],
          [side * 1.0, -0.15, -0.3],
          0.07,
          chrome,
        );
        k.bar(
          "chassis-front",
          [side * 0.9, -0.15, 1.7],
          [side * 0.9, 0.55, 1.7],
          0.055,
          chrome,
        );
        k.bar(
          "chassis-rear",
          [side * 1.0, -0.15, -0.3],
          [side * 1.0, -0.15, -2.0],
          0.07,
          chrome,
        );
        k.bar(
          "chassis-rear",
          [side * 0.9, -0.15, -1.6],
          [side * 0.9, 0.55, -1.6],
          0.055,
          chrome,
        );
        k.shock(
          "chassis-front",
          [side * 1.18, 0.5, 1.65],
          [side * 1.45, -0.67, 1.65],
          trim,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.5, -1.65],
          [side * 1.45, -0.67, -1.65],
          trim,
        );
      }
      for (const z of [1.6, 0.8, 0.0, -0.8, -1.6]) {
        const part = z >= -0.3 ? "chassis-front" : "chassis-rear";
        k.bar(part, [-1.0, -0.15, z], [1.0, -0.15, z], 0.035, chrome);
      }
      k.panel("chassis-rear", [0.9, 0.35, 0.6], [0, 0.08, -1.2], cardboardDark, 0.04);
      k.bar("chassis-rear", [0.55, -0.45, -2.3], [0.55, -0.45, -2.85], 0.07, chrome);
      k.bar("chassis-rear", [0.55, -0.45, -2.75], [0.55, -0.45, -2.88], 0.078, k.dark);

      // ---- Groceries (roof): stocked boxes, cans, produce ----
      k.panel("roof", [0.55, 0.75, 0.4], [0.32, 1.0, -0.85], cardboard, 0.03);
      k.panel("roof", [0.57, 0.2, 0.42], [0.32, 1.14, -0.85], boxRed, 0.02);
      k.panel("roof", [0.45, 0.6, 0.35], [-0.42, 0.92, -0.55], boxRed, 0.03);
      k.panel("roof", [0.47, 0.18, 0.37], [-0.42, 0.8, -0.55], boxYellow, 0.02);
      k.panel("roof", [0.5, 0.55, 0.4], [0.3, 0.9, 0.35], boxGreen, 0.03);
      k.panel("roof", [0.52, 0.16, 0.42], [0.3, 1.0, 0.35], milkWhite, 0.015);
      k.panel("roof", [0.4, 0.42, 0.4], [-0.38, 0.82, 0.4], cardboardDark, 0.03);
      k.panel("roof", [0.38, 0.32, 0.5], [-0.05, 0.76, 1.15], cardboard, 0.03);
      k.panel("roof", [0.7, 0.4, 0.6], [0, 0.75, -0.1], cardboardDark, 0.03);
      k.panel("roof", [0.72, 0.12, 0.62], [0, 0.85, -0.1], milkWhite, 0.015);
      k.panel("roof", [0.6, 0.35, 0.45], [0.15, 1.5, -1.0], boxBlue, 0.03);
      k.panel("roof", [0.42, 0.3, 0.42], [0.3, 1.32, 0.3], boxYellow, 0.03);
      k.panel("roof", [0.35, 0.7, 0.3], [-0.5, 1.55, -0.55], cardboard, 0.03);
      k.panel("roof", [0.37, 0.18, 0.32], [-0.5, 1.68, -0.55], boxRed, 0.02);
      const cans = [
        [0.55, 1.25, boxRed],
        [-0.55, 0.95, boxGreen],
        [0.6, -0.15, chrome],
        [-0.6, -1.2, boxBlue],
        [0.1, -1.35, boxRed],
        [-0.15, 0.75, boxGreen],
      ] as const;
      for (const [x, z, mat] of cans) {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.11, 0.11, 0.3, 32),
          [x, 0.72, z],
          mat,
        );
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.1, 0.1, 0.02, 32),
          [x, 0.88, z],
          chrome,
        );
      }
      k.oval("roof", [0.13, 0.12, 0.13], [-0.5, 2.02, -0.55], appleRed);
      k.oval("roof", [0.12, 0.11, 0.12], [-0.38, 1.14, 0.4], appleRed);
      k.oval("roof", [0.12, 0.11, 0.12], [0.15, 1.79, -1.0], orange);
      k.oval("roof", [0.11, 0.1, 0.11], [-0.05, 1.03, 1.15], orange);
      k.oval("roof", [0.17, 0.13, 0.17], [0, 1.07, -0.1], leafGreen);
      k.oval("roof", [0.15, 0.12, 0.15], [-0.1, 1.29, 0.0], leafGreen);
      k.oval("roof", [0.2, 0.16, 0.2], [0.3, 0.75, 1.3], leafGreen);
      k.panel("roof", [0.28, 0.42, 0.28], [-0.55, 0.85, 1.35], milkWhite, 0.05);
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.07, 0.07, 0.12, 24),
        [-0.55, 1.1, 1.35],
        boxBlue,
      );
      k.tube(
        "roof",
        [
          [0.25, 0.95, 0.1],
          [0.3, 1.3, -0.3],
          [0.25, 1.5, -0.6],
        ],
        0.07,
        baguette,
      );
      k.tube(
        "roof",
        [
          [-0.3, 0.95, 0.0],
          [-0.35, 1.25, -0.4],
          [-0.3, 1.4, -0.7],
        ],
        0.07,
        baguette,
      );

      // ---- Front bumper: caster-style chrome bar + rolling casters ----
      k.panel("bumper-front", [2.0, 0.18, 0.3], [0, -0.02, 2.52], chrome, 0.07);
      for (const side of sides) {
        k.panel(
          "bumper-front",
          [0.32, 0.24, 0.36],
          [side * 0.92, -0.02, 2.52],
          trim,
          0.09,
        );
        for (const dx of [-0.09, 0.09])
          k.bar(
            "bumper-front",
            [side * 0.7 + dx, -0.1, 2.5],
            [side * 0.7 + dx, -1.5, 2.68],
            0.07,
            chrome,
          );
        k.bar(
          "bumper-front",
          [side * 0.61, -1.5, 2.68],
          [side * 0.79, -1.5, 2.68],
          0.055,
          chrome,
        );
        k.mesh(
          "bumper-front",
          new T.CylinderGeometry(0.2, 0.2, 0.12, 32).rotateZ(Math.PI / 2),
          [side * 0.7, -1.68, 2.68],
          k.rubber,
        );
        k.mesh(
          "bumper-front",
          new T.CylinderGeometry(0.08, 0.08, 0.14, 24).rotateZ(Math.PI / 2),
          [side * 0.7, -1.68, 2.68],
          chrome,
        );
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.028, 12, 32),
          [side * 0.35, -0.16, 2.6],
          k.dark,
        );
      }

      // ---- Rear bumper: chrome step, reflectors, mudflaps, hitch ----
      k.panel("bumper-rear", [2.2, 0.2, 0.32], [0, -0.05, -2.58], chrome, 0.07);
      k.tailLights(-2.76, 0.08);
      for (const side of sides) {
        k.panel(
          "bumper-rear",
          [0.55, 0.45, 0.06],
          [side * 1.65, -0.45, -2.72],
          k.dark,
          0.03,
        );
        k.panel("bumper-rear", [0.34, 0.12, 0.05], [side * 0.5, 0.06, -2.75], trim, 0.02);
      }
      k.bar("bumper-rear", [0, -0.2, -2.6], [0, -0.2, -2.95], 0.06, k.dark);

      // Dark hub caps over the kit hubs.
      const cartCaps = [
        ["wheel-fl", 2.07, 1.65],
        ["wheel-fr", -2.07, 1.65],
        ["wheel-rl", 2.07, -1.65],
        ["wheel-rr", -2.07, -1.65],
      ] as const;
      for (const [part, x, z] of cartCaps)
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
    },
  ),
  vehicle(
    "apex-wheeler",
    "Apex Open-Wheeler",
    "F1-style open-wheeler with wings and sidepods over four derby wheels.",
    [13770534, 1711136, 2236962, 0.95, 5],
    (k) => {
      const carbon = finish(0x17181c, 0.42, 0.55);

      // ---- Nose (hood): low pointed cone rising to the dash bulkhead ----
      k.hull("hood", [
        [0.85, -0.42, 0.52, 0.64, 0.6],
        [1.6, -0.46, 0.28, 0.42, 0.4],
        [2.2, -0.5, 0.02, 0.24, 0.22],
        [2.72, -0.5, -0.18, 0.15, 0.13],
      ]);
      k.oval("hood", [0.15, 0.16, 0.22], [0, -0.34, 2.72]);
      k.oval("hood", [0.62, 0.34, 0.5], [0, 0.42, 1.0]);
      k.oval("hood", [0.34, 0.1, 0.3], [0, 0.6, 0.72], carbon);
      // Carbon spine stripe and S-duct vent on the nose top.
      k.panel("hood", [0.12, 0.03, 1.5], [0, 0.28, 1.85], carbon, 0.012);
      k.panel("hood", [0.2, 0.05, 0.3], [0, 0.16, 2.05], k.dark, 0.015);
      for (const side of sides) {
        k.panel(
          "hood",
          [0.06, 0.1, 0.7],
          [side * 0.42, 0.1, 1.7],
          carbon,
          0.02,
        );
        // Front wing pylons under the nose tip.
        k.panel(
          "hood",
          [0.08, 0.34, 0.4],
          [side * 0.14, -0.5, 2.62],
          carbon,
          0.02,
        );
      }

      // ---- Front wing (bumper-front): wide main plane, flaps, endplates ----
      k.panel("bumper-front", [2.7, 0.09, 0.72], [0, -0.72, 2.82], k.paint, 0.03);
      k.panel("bumper-front", [2.5, 0.07, 0.4], [0, -0.6, 2.62], k.paint, 0.025);
      k.panel("bumper-front", [2.3, 0.06, 0.3], [0, -0.48, 2.45], carbon, 0.02);
      k.panel("bumper-front", [2.72, 0.04, 0.2], [0, -0.68, 3.1], carbon, 0.015);
      for (const side of sides) {
        k.panel(
          "bumper-front",
          [0.09, 0.62, 1.0],
          [side * 1.36, -0.44, 2.8],
          k.paint,
          0.03,
        );
        k.panel(
          "bumper-front",
          [0.05, 0.1, 0.95],
          [side * 1.36, -0.14, 2.8],
          carbon,
          0.015,
        );
        // Dive plane canard stacked on the endplate.
        k.panel(
          "bumper-front",
          [0.3, 0.05, 0.4],
          [side * 1.2, -0.35, 2.95],
          carbon,
          0.015,
        ).rotation.z = side * -0.18;
        k.bar(
          "bumper-front",
          [side * 0.14, -0.62, 2.62],
          [side * 0.14, -0.72, 2.82],
          0.05,
          carbon,
        );
      }

      // ---- Cockpit (roof): tub, halo, helmet, airbox, engine fin ----
      k.hull("roof", [
        [-1.0, 0.1, 0.72, 0.62, 0.5],
        [-0.2, 0.0, 0.78, 0.72, 0.62],
        [0.6, -0.1, 0.62, 0.68, 0.6],
        [0.95, -0.2, 0.5, 0.62, 0.56],
      ]);
      // Open cockpit: dark opening, seat back, headrest, driver helmet.
      k.oval("roof", [0.44, 0.18, 0.62], [0, 0.62, -0.1], k.dark);
      k.panel("roof", [0.5, 0.42, 0.16], [0, 0.72, -0.62], carbon, 0.06);
      k.oval("roof", [0.56, 0.2, 0.3], [0, 0.68, -0.55], k.paint);
      k.oval("roof", [0.17, 0.19, 0.19], [0, 0.82, -0.28], k.accent);
      k.panel("roof", [0.2, 0.08, 0.05], [0, 0.84, -0.1], k.glass, 0.015);
      // Halo: loop tube over the cockpit plus front pylon.
      k.tube(
        "roof",
        [
          [-0.52, 0.7, 0.28],
          [-0.56, 0.96, -0.05],
          [-0.4, 1.06, -0.5],
          [0, 1.08, -0.62],
          [0.4, 1.06, -0.5],
          [0.56, 0.96, -0.05],
          [0.52, 0.7, 0.28],
        ],
        0.072,
        carbon,
        64,
      );
      k.bar("roof", [0, 0.6, 0.3], [0, 0.94, 0.28], 0.062, carbon);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.52, 0.72, 0.28],
          [side * 0.62, 0.55, 0.35],
          0.05,
          carbon,
        );
      // Airbox with intake trumpet above the driver.
      k.oval("roof", [0.3, 0.3, 0.52], [0, 1.28, -0.72], k.paint);
      k.oval("roof", [0.2, 0.16, 0.12], [0, 1.3, -0.24], k.dark);
      k.bar("roof", [0, 1.52, -0.85], [0, 1.66, -0.85], 0.05, carbon);
      k.panel("roof", [0.22, 0.05, 0.12], [0, 1.68, -0.85], carbon, 0.015);
      // Shark-fin engine cover running back over the deck.
      k.profile(
        "roof",
        [
          [-2.1, 0.55],
          [-2.1, 0.75],
          [-0.7, 1.35],
          [-0.5, 1.05],
        ],
        0.1,
        0,
        k.paint,
        0.03,
      );

      // ---- Sidepods (doors): sculpted pods, intakes, mirrors, skirts ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [1.05, -0.4],
            [1.05, 0.05],
            [0.5, 0.32],
            [-0.7, 0.3],
            [-1.35, -0.05],
            [-1.35, -0.4],
          ],
          0.42,
          side * 1.02,
          k.paint,
          0.05,
        );
        k.oval(d, [0.3, 0.28, 0.5], [side * 1.02, 0.05, 0.55], k.paint);
        // Radiator intake: dark mouth with a carbon rim and splitter.
        k.panel(d, [0.34, 0.3, 0.1], [side * 1.02, 0.02, 1.06], k.dark, 0.03);
        k.panel(d, [0.4, 0.06, 0.08], [side * 1.02, 0.2, 1.08], carbon, 0.02);
        k.panel(d, [0.4, 0.06, 0.08], [side * 1.02, -0.16, 1.08], carbon, 0.02);
        k.bar(
          d,
          [side * 0.85, 0.02, 1.08],
          [side * 1.19, 0.02, 1.08],
          0.025,
          carbon,
        );
        // Pod-top cooling louvers.
        for (let i = 0; i < 4; i++)
          k.bar(
            d,
            [side * 0.9, 0.32, -0.5 - i * 0.16],
            [side * 1.14, 0.32, -0.5 - i * 0.16],
            0.02,
            carbon,
          );
        // Carbon side skirt and floor edge.
        k.panel(d, [0.46, 0.1, 2.1], [side * 1.02, -0.4, -0.15], carbon, 0.03);
        k.panel(d, [0.1, 0.06, 1.6], [side * 1.28, -0.36, -0.2], carbon, 0.015);
        // Mirror on a stalk.
        k.bar(d, [side * 0.72, 0.6, 0.55], [side * 0.98, 0.72, 0.6], 0.028, carbon);
        k.panel(d, [0.1, 0.14, 0.2], [side * 1.02, 0.74, 0.6], carbon, 0.03);
        k.panel(d, [0.06, 0.1, 0.14], [side * 1.02, 0.74, 0.5], k.glass, 0.012);
        // Turning vane ahead of the pod.
        k.panel(d, [0.05, 0.28, 0.5], [side * 0.78, -0.05, 1.15], carbon, 0.015);
      }

      // ---- Rear deck + wing (bed): cover, exhausts, wing, rain light ----
      k.hull("bed", [
        [-2.45, -0.3, 0.5, 0.55, 0.45],
        [-1.6, -0.35, 0.62, 0.72, 0.6],
        [-0.8, -0.35, 0.66, 0.75, 0.62],
      ]);
      k.oval("bed", [0.62, 0.3, 0.7], [0, 0.5, -1.2], k.paint);
      for (const side of sides)
        k.oval("bed", [0.18, 0.12, 0.3], [side * 0.55, 0.52, -1.3], k.dark);
      // Twin exhaust trumpets.
      for (const side of sides) {
        k.bar(
          "bed",
          [side * 0.26, 0.3, -2.1],
          [side * 0.26, 0.3, -2.5],
          0.11,
          k.steel,
        );
        k.bar("bed", [side * 0.26, 0.3, -2.5], [side * 0.26, 0.3, -2.56], 0.12, carbon);
      }
      // Rear wing pylons, main plane, DRS flap, endplates.
      for (const side of sides)
        k.panel("bed", [0.09, 0.65, 0.5], [side * 0.22, 0.95, -2.5], carbon, 0.03);
      k.panel("bed", [2.2, 0.09, 0.62], [0, 1.3, -2.55], k.paint, 0.03);
      k.panel("bed", [2.0, 0.07, 0.4], [0, 1.52, -2.62], k.paint, 0.025);
      k.panel("bed", [2.02, 0.05, 0.12], [0, 1.62, -2.78], carbon, 0.015);
      for (const side of sides) {
        k.panel(
          "bed",
          [0.09, 0.8, 1.0],
          [side * 1.1, 1.25, -2.58],
          k.paint,
          0.03,
        );
        for (let i = 0; i < 3; i++)
          k.bar(
            "bed",
            [side * 1.15, 1.0 + i * 0.14, -2.85],
            [side * 1.15, 1.0 + i * 0.14, -2.35],
            0.018,
            carbon,
          );
      }
      k.lamp("bed", [0, 0.85, -2.62], 0.07, k.red, -1);

      // ---- Diffuser + beam wing (bumper-rear) ----
      k.panel("bumper-rear", [1.9, 0.09, 0.62], [0, -0.5, -2.62], carbon, 0.025);
      for (let i = -2; i <= 2; i++)
        k.panel(
          "bumper-rear",
          [0.05, 0.34, 0.55],
          [i * 0.36, -0.32, -2.62],
          carbon,
          0.015,
        );
      k.panel("bumper-rear", [1.8, 0.07, 0.32], [0, 0.42, -2.68], carbon, 0.02);
      k.bar("bumper-rear", [0, 0.1, -2.45], [0, 0.42, -2.68], 0.07, carbon);
      k.tailLights(-2.75, 0.05);

      // ---- Chassis: carbon floor, wishbones, pushrods, gearbox ----
      k.panel("chassis-front", [1.7, 0.08, 2.4], [0, -0.52, 0.9], carbon, 0.02);
      k.panel("chassis-front", [0.5, 0.06, 2.2], [0, -0.56, 1.0], k.dark, 0.015);
      for (const side of sides) {
        for (const z of [1.28, 2.02]) {
          k.bar(
            "chassis-front",
            [side * 0.4, -0.35, z],
            [side * 1.5, -0.55, 1.65],
            0.045,
            carbon,
          );
          k.bar(
            "chassis-front",
            [side * 0.4, -0.55, z],
            [side * 1.5, -0.95, 1.65],
            0.045,
            carbon,
          );
        }
        k.bar(
          "chassis-front",
          [side * 0.55, -0.1, 1.35],
          [side * 1.5, -0.75, 1.65],
          0.032,
          k.steel,
        );
        k.bar(
          "chassis-front",
          [side * 0.5, -0.5, 1.1],
          [side * 1.5, -0.75, 1.5],
          0.028,
          k.steel,
        );
        k.panel(
          "chassis-front",
          [0.05, 0.4, 0.6],
          [side * 0.82, -0.28, 0.85],
          carbon,
          0.015,
        );
        // Rear wishbones and pushrod.
        for (const z of [-1.28, -2.02]) {
          k.bar(
            "chassis-rear",
            [side * 0.4, -0.35, z],
            [side * 1.5, -0.55, -1.65],
            0.045,
            carbon,
          );
          k.bar(
            "chassis-rear",
            [side * 0.4, -0.55, z],
            [side * 1.5, -0.95, -1.65],
            0.045,
            carbon,
          );
        }
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.1, -1.35],
          [side * 1.5, -0.75, -1.65],
          0.032,
          k.steel,
        );
      }
      k.panel("chassis-rear", [1.7, 0.08, 1.9], [0, -0.52, -1.35], carbon, 0.02);
      k.oval("chassis-rear", [0.34, 0.3, 0.5], [0, -0.5, -1.7], carbon);

      // Orange center caps over the dark kit hubs.
      const apexCaps = [
        ["wheel-fl", 2.09, 1.65],
        ["wheel-fr", -2.09, 1.65],
        ["wheel-rl", 2.09, -1.65],
        ["wheel-rr", -2.09, -1.65],
      ] as const;
      for (const [part, x, z] of apexCaps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.16, 0.16, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.paint,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.07, 0.07, 0.09, 24).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          carbon,
        );
      }
    },
  ),
  vehicle(
    "sidecar-sprint",
    "Sidecar Sprint",
    "Vintage motorcycle-with-sidecar look stretched over four derby wheels.",
    [3033704, 13214247, 3948355, 0.8, 10],
    (k) => {
      const brass = gold();
      const leather = finish(0x7a4526, 0.68, 0.08);

      // ---- Nose (hood): teardrop tank, headlamp, grille, forks, bars ----
      k.hull("hood", [
        [0.5, -0.35, 0.45, 0.78, 0.72],
        [2.55, -0.35, 0.32, 0.68, 0.6],
      ]);
      // Teardrop fuel tank: wide nose tapering back to the saddle.
      k.oval("hood", [0.72, 0.58, 0.95], [0, 0.62, 1.8], k.paint);
      k.oval("hood", [0.58, 0.48, 0.42], [0, 0.55, 2.3], k.paint);
      k.oval("hood", [0.48, 0.4, 0.55], [0, 0.66, 1.05], k.paint);
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.09, 0.11, 0.07, 32),
        [0, 1.22, 1.7],
        brass,
      );
      k.panel("hood", [0.5, 0.06, 0.9], [0, 0.42, 1.8], k.dark, 0.02);
      for (const side of sides) {
        k.oval("hood", [0.1, 0.22, 0.42], [side * 0.68, 0.52, 1.55], k.rubber);
        k.panel(
          "hood",
          [0.03, 0.12, 0.4],
          [side * 0.74, 0.72, 1.85],
          brass,
          0.012,
        );
      }
      // Big round headlamp with bucket, bracket, and rim.
      k.bar("hood", [0, 0.6, 2.55], [0, 0.6, 2.75], 0.23, k.dark);
      k.lamp("hood", [0, 0.6, 2.79], 0.19);
      k.bar("hood", [-0.2, 0.38, 2.72], [0.2, 0.38, 2.72], 0.035, k.steel);
      // Slatted cowl grille below the lamp.
      k.panel("hood", [1.0, 0.5, 0.1], [0, 0.02, 2.52], k.dark, 0.04);
      for (let i = 0; i < 5; i++)
        k.panel(
          "hood",
          [0.88, 0.04, 0.05],
          [0, -0.16 + i * 0.1, 2.58],
          k.steel,
          0.01,
        );
      for (const side of sides) {
        // Fork legs with brass lower shrouds down to the front axle.
        k.bar(
          "hood",
          [side * 0.4, 0.55, 2.0],
          [side * 0.5, -0.7, 1.65],
          0.06,
          k.steel,
        );
        k.bar(
          "hood",
          [side * 0.46, -0.05, 1.8],
          [side * 0.5, -0.7, 1.65],
          0.085,
          brass,
        );
        k.bar(
          "hood",
          [side * 0.4, 0.55, 2.0],
          [side * 0.22, 1.0, 1.35],
          0.045,
          k.steel,
        );
      }
      // Handlebars: risers, brass crossbar, rubber grips, levers.
      for (const side of sides)
        k.bar(
          "hood",
          [side * 0.18, 0.95, 1.35],
          [side * 0.22, 1.26, 1.22],
          0.05,
          k.steel,
        );
      k.bar("hood", [-0.55, 1.28, 1.2], [0.55, 1.28, 1.2], 0.045, brass);
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.55, 1.28, 1.2],
          [side * 0.78, 1.28, 1.14],
          0.062,
          k.rubber,
        );
        k.bar(
          "hood",
          [side * 0.5, 1.26, 1.2],
          [side * 0.68, 1.18, 1.3],
          0.018,
          k.steel,
        );
        k.tube(
          "hood",
          [
            [side * 0.6, 1.26, 1.2],
            [side * 0.55, 0.9, 1.0],
            [side * 0.5, 0.5, 0.75],
          ],
          0.016,
          k.dark,
        );
      }
      // Speedo pod and a single stalk mirror on the visible flank.
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.08, 0.08, 0.07, 32),
        [0, 1.36, 1.28],
        k.dark,
      );
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.065, 0.065, 0.075, 32),
        [0, 1.36, 1.28],
        k.glass,
      );
      k.bar("hood", [0.3, 1.28, 1.2], [0.52, 1.52, 1.12], 0.022, k.steel);
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.1, 0.1, 0.04, 32).rotateX(Math.PI / 2),
        [0.52, 1.56, 1.12],
        k.dark,
      );
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.085, 0.085, 0.045, 32).rotateX(Math.PI / 2),
        [0.52, 1.56, 1.12],
        k.glass,
      );

      // ---- Saddle + tail (roof): leather seat, cowl hump, shark fin ----
      k.panel("roof", [0.52, 0.12, 0.66], [0, 0.76, 0.1], k.dark, 0.04);
      k.oval("roof", [0.4, 0.17, 0.48], [0, 0.9, 0.08], leather);
      k.oval("roof", [0.28, 0.12, 0.3], [0, 0.88, 0.55], leather);
      for (const side of sides) {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.05, 0.05, 0.12, 20),
          [side * 0.16, 0.68, -0.12],
          k.steel,
        );
        for (const z of [-0.1, 0.26])
          k.mesh(
            "roof",
            new T.SphereGeometry(0.028, 12, 8),
            [side * 0.36, 0.94, z],
            brass,
          );
      }
      k.tube(
        "roof",
        [
          [0, 0.8, 1.2],
          [0, 0.82, 0.5],
          [0, 0.8, -0.2],
        ],
        0.07,
        k.steel,
      );
      // Rear cowl hump with a brass spine stripe.
      k.oval("roof", [0.48, 0.32, 0.62], [0, 0.72, -0.72], k.paint);
      k.panel("roof", [0.1, 0.05, 1.0], [0, 1.02, -0.7], brass, 0.015);
      // Tail fin rising behind the cowl.
      k.profile(
        "roof",
        [
          [-1.75, 0.55],
          [-0.75, 0.55],
          [-0.85, 1.45],
          [-1.35, 1.45],
        ],
        0.12,
        0,
        k.paint,
        0.035,
      );
      k.bar("roof", [0, 0.6, -0.78], [0, 1.42, -0.88], 0.03, brass);
      k.lamp("roof", [0, 1.32, -1.48], 0.05, k.red, -1);

      // ---- Sidecar pod (door-left, camera flank): boat hull + screen ----
      k.profile(
        "door-left",
        [
          [-0.62, -0.05],
          [0.72, -0.05],
          [0.78, 0.3],
          [0.55, 0.52],
          [-0.35, 0.52],
          [-0.62, 0.3],
        ],
        0.8,
        1.02,
        k.paint,
        0.05,
      );
      k.oval("door-left", [0.38, 0.28, 0.3], [1.02, 0.2, 0.72], k.paint);
      k.panel("door-left", [0.66, 0.1, 0.8], [1.02, 0.5, -0.05], k.dark, 0.03);
      k.panel("door-left", [0.55, 0.12, 0.4], [1.02, 0.55, -0.25], leather, 0.05);
      k.panel("door-left", [0.55, 0.3, 0.12], [1.02, 0.62, -0.48], leather, 0.05);
      // Rub rail and brass side stripe with rivets.
      for (const z of [0.5, 0.1, -0.3])
        k.bar(
          "door-left",
          [1.5, 0.42, z + 0.2],
          [1.5, 0.42, z - 0.2],
          0.035,
          k.dark,
        );
      k.bar("door-left", [1.5, 0.18, 0.55], [1.5, 0.18, -0.5], 0.025, brass);
      for (let i = 0; i < 5; i++)
        k.mesh(
          "door-left",
          new T.SphereGeometry(0.025, 10, 8),
          [1.485, 0.3, 0.45 - i * 0.22],
          k.steel,
        );
      k.panel("door-left", [0.3, 0.07, 0.5], [1.02, -0.12, 0.1], k.steel, 0.02);
      // Bolted pod mounts to the bike frame.
      for (const z of [0.35, -0.4]) {
        k.bar("door-left", [0.62, 0.1, z], [0.2, 0.0, z], 0.06, k.dark);
        k.mesh(
          "door-left",
          new T.CylinderGeometry(0.045, 0.045, 0.1, 16).rotateZ(Math.PI / 2),
          [0.24, 0.0, z],
          k.steel,
        );
      }
      // Tiny three-pane windshield with frame and bolts.
      k.panel(
        "door-left",
        [0.42, 0.34, 0.03],
        [1.02, 0.8, 0.44],
        k.glass,
        0.012,
      ).rotation.x = -0.28;
      for (const side of sides) {
        k.panel(
          "door-left",
          [0.2, 0.3, 0.03],
          [1.02 + side * 0.28, 0.78, 0.38],
          k.glass,
          0.012,
        ).rotation.y = side * 0.5;
        k.bar(
          "door-left",
          [1.02 + side * 0.2, 0.6, 0.47],
          [1.02 + side * 0.2, 0.95, 0.37],
          0.022,
          k.steel,
        );
      }
      k.bar("door-left", [0.78, 0.62, 0.47], [1.26, 0.62, 0.47], 0.025, k.steel);
      k.bar("door-left", [0.8, 0.95, 0.37], [1.24, 0.95, 0.37], 0.025, k.steel);
      k.bar("door-left", [1.02, 0.62, 0.47], [1.02, 0.95, 0.37], 0.02, k.steel);
      for (const x of [0.84, 1.02, 1.2])
        for (const y of [0.66, 0.91]) {
          const z = y > 0.8 ? 0.4 : 0.46;
          k.mesh(
            "door-left",
            new T.CylinderGeometry(0.02, 0.02, 0.05, 10).rotateX(Math.PI / 2),
            [x, y, z],
            k.dark,
          );
        }
      k.lamp("door-left", [1.02, 0.32, 0.98], 0.06, k.amber);

      // ---- Engine + exhausts (door-right): finned block, brass pipes ----
      k.panel("door-right", [0.5, 0.5, 0.7], [-0.55, 0.05, 0.55], k.dark, 0.06);
      for (let i = 0; i < 7; i++)
        k.panel(
          "door-right",
          [0.58, 0.035, 0.62],
          [-0.55, -0.12 + i * 0.06, 0.55],
          k.steel,
          0.008,
        );
      k.oval("door-right", [0.28, 0.24, 0.3], [-0.55, -0.05, 0.55], k.steel);
      k.mesh(
        "door-right",
        new T.CylinderGeometry(0.16, 0.16, 0.1, 40).rotateZ(Math.PI / 2),
        [-0.84, 0.18, 0.78],
        k.steel,
      );
      k.mesh(
        "door-right",
        new T.CylinderGeometry(0.13, 0.13, 0.11, 40).rotateZ(Math.PI / 2),
        [-0.84, 0.18, 0.78],
        k.dark,
      );
      // Three brass pipes sweeping down and back along the flank.
      for (let i = 0; i < 3; i++) {
        const zs = 0.85 - i * 0.12;
        k.tube(
          "door-right",
          [
            [-0.5, 0.28, zs],
            [-0.72, 0.05, zs - 0.15],
            [-0.92, -0.08, 0.2],
            [-0.95, -0.08, -0.5],
            [-0.95, -0.02, -0.9],
          ],
          0.07,
          brass,
          48,
        );
        k.bar(
          "door-right",
          [-0.95, -0.02, -0.9],
          [-0.95, 0.02, -1.15],
          0.095,
          k.steel,
        );
        k.mesh(
          "door-right",
          new T.CylinderGeometry(0.07, 0.07, 0.03, 24).rotateX(Math.PI / 2),
          [-0.95, 0.02, -1.16],
          k.dark,
        );
      }
      k.panel("door-right", [0.06, 0.2, 1.1], [-1.03, 0.02, -0.35], k.steel, 0.02);
      for (const z of [-0.1, -0.6])
        k.mesh(
          "door-right",
          new T.TorusGeometry(0.12, 0.025, 10, 32),
          [-0.95, -0.05, z],
          k.dark,
        );
      // Footboard, kicker, sprocket, and frame rail.
      k.panel("door-right", [0.32, 0.07, 0.52], [-0.88, -0.22, 0.5], k.steel, 0.02);
      k.panel("door-right", [0.28, 0.03, 0.46], [-0.88, -0.18, 0.5], k.rubber, 0.01);
      k.bar("door-right", [-0.7, -0.1, 0.3], [-0.95, -0.32, 0.15], 0.028, k.steel);
      k.mesh(
        "door-right",
        new T.CylinderGeometry(0.22, 0.22, 0.06, 36).rotateZ(Math.PI / 2),
        [-0.68, -0.2, -0.95],
        k.dark,
      );
      k.mesh(
        "door-right",
        new T.CylinderGeometry(0.07, 0.07, 0.09, 20).rotateZ(Math.PI / 2),
        [-0.68, -0.2, -0.95],
        k.steel,
      );
      k.panel("door-right", [0.1, 0.18, 1.2], [-0.68, -0.2, -0.35], k.dark, 0.03);
      for (const z of [0.8, 0.2])
        k.bar("door-right", [-0.55, -0.2, z], [-0.55, -0.45, z], 0.05, k.dark);
      k.bar("door-right", [-0.55, -0.45, 1.3], [-0.55, -0.45, -1.3], 0.07, k.dark);

      // ---- Tail deck (bed): taper cowl, rack, tool roll, tail lamp ----
      k.hull("bed", [
        [-2.5, -0.3, 0.45, 0.7, 0.6],
        [-0.7, -0.3, 0.55, 0.72, 0.62],
      ]);
      k.oval("bed", [0.55, 0.28, 0.6], [0, 0.55, -1.1], k.paint);
      for (const side of sides) {
        k.bar("bed", [side * 0.55, 0.95, -2.3], [side * 0.55, 0.95, -1.2], 0.035, k.steel);
        k.bar("bed", [side * 0.55, 0.45, -2.25], [side * 0.55, 0.95, -2.25], 0.03, k.steel);
        k.bar("bed", [side * 0.55, 0.45, -1.25], [side * 0.55, 0.95, -1.25], 0.03, k.steel);
        k.panel(
          "bed",
          [0.05, 0.08, 0.14],
          [side * 0.55, 0.9, -2.32],
          k.amber,
          0.012,
        );
      }
      for (const z of [-2.28, -1.92, -1.56, -1.22])
        k.bar("bed", [-0.55, 0.95, z], [0.55, 0.95, z], 0.03, k.steel);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.11, 0.11, 0.7, 28).rotateZ(Math.PI / 2),
        [0, 1.05, -1.75],
        leather,
      );
      for (const x of [-0.2, 0.2])
        k.panel("bed", [0.06, 0.24, 0.24], [x, 1.05, -1.75], k.dark, 0.02);
      k.lamp("bed", [0, 0.55, -2.52], 0.09, k.red, -1);
      k.panel("bed", [0.42, 0.16, 0.04], [0, 0.28, -2.53], k.white, 0.012);
      k.panel("bed", [0.5, 0.07, 1.0], [0, -0.12, -1.65], k.dark, 0.02);

      // ---- Front bumper: derby bar, bullbar, fogs, hooks ----
      k.panel("bumper-front", [2.5, 0.26, 0.34], [0, -0.18, 2.62], k.dark, 0.085);
      k.panel("bumper-front", [2.3, 0.05, 0.28], [0, -0.04, 2.62], k.steel, 0.015);
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.6, -0.25, 2.92],
          [side * 0.6, 0.55, 2.92],
          0.06,
          k.steel,
        );
        k.bar(
          "bumper-front",
          [side * 0.6, -0.05, 2.72],
          [side * 0.6, -0.25, 2.92],
          0.05,
          k.dark,
        );
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.85, -0.3, 2.8],
          k.dark,
        );
        k.lamp("bumper-front", [side * 0.45, -0.18, 2.8], 0.09);
      }
      for (const y of [0.45, -0.05])
        k.bar("bumper-front", [-0.6, y, 2.92], [0.6, y, 2.92], 0.055, k.steel);
      k.panel("bumper-front", [0.42, 0.13, 0.03], [0, -0.18, 2.8], k.white, 0.01);

      // ---- Rear bumper: nerf bar, lights, flaps, hitch ----
      k.panel("bumper-rear", [2.4, 0.22, 0.3], [0, -0.15, -2.68], k.dark, 0.07);
      k.tailLights(-2.85, 0.08);
      for (const side of sides) {
        k.panel(
          "bumper-rear",
          [0.55, 0.5, 0.06],
          [side * 1.6, -0.55, -2.78],
          k.rubber,
          0.03,
        );
        k.bar(
          "bumper-rear",
          [side * 1.2, -0.15, -2.68],
          [side * 1.6, -0.35, -2.78],
          0.04,
          k.dark,
        );
      }
      k.bar("bumper-rear", [0, -0.32, -2.7], [0, -0.32, -2.95], 0.06, k.dark);
      k.mesh(
        "bumper-rear",
        new T.TorusGeometry(0.09, 0.028, 12, 32),
        [0, -0.32, -2.97],
        k.steel,
      );

      // ---- Chassis: navy arches, shocks, frame, skid plate ----
      fenders(k, k.paint);
      for (const side of sides)
        k.bar(
          "chassis-front",
          [side * 0.35, 0.5, 1.4],
          [side * 0.5, -0.4, 0.6],
          0.06,
          k.steel,
        );
      k.panel("chassis-front", [1.2, 0.08, 1.0], [0, -0.55, 1.5], k.steel, 0.02);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.09, 0.11, 0.06, 24).rotateX(Math.PI / 2),
        [0.3, -0.35, 2.2],
        brass,
      );
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
          [side * 0.55, -0.45, -0.4],
          [side * 0.55, -0.45, -2.4],
          0.07,
          k.dark,
        );
      }
      k.bar("chassis-front", [-0.5, -0.3, 1.9], [0.5, -0.3, 1.9], 0.05, k.dark);
      k.panel("chassis-rear", [0.6, 0.4, 0.5], [0.55, -0.3, -0.9], k.dark, 0.06);
      for (const x of [0.45, 0.65])
        k.mesh(
          "chassis-rear",
          new T.CylinderGeometry(0.035, 0.035, 0.08, 12),
          [x, -0.06, -0.9],
          brass,
        );

      // Brass hub caps over the dark kit hubs.
      const sprintCaps = [
        ["wheel-fl", 2.07, 1.65],
        ["wheel-fr", -2.07, 1.65],
        ["wheel-rl", 2.07, -1.65],
        ["wheel-rr", -2.07, -1.65],
      ] as const;
      for (const [part, x, z] of sprintCaps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.16, 0.16, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          brass,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.06, 0.06, 0.09, 20).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
      }
    },
  ),
  vehicle(
    "turbo-trike",
    "Turbo Trike",
    "Three-wheeler trike silhouette with a fat rear and four derby wheels.",
    [6959026, 2282478, 3093302, 0.86, 8],
    (k) => {
      const leather = finish(0x8a5a2e, 0.68, 0.08);
      const chrome = finish(0xd2d9de, 0.2, 0.88);
      const flame = k.accent;

      // ---- Nose (hood): raked chrome fork, twin lamps, bars, flame tank ----
      k.hull("hood", [
        [0.3, -0.35, 0.42, 0.72, 0.66],
        [2.62, -0.35, 0.3, 0.6, 0.54],
      ]);
      // Low chopper tank: three stacked purple shells.
      k.oval("hood", [0.66, 0.52, 0.92], [0, 0.6, 1.55], k.paint);
      k.oval("hood", [0.52, 0.44, 0.5], [0, 0.56, 2.15], k.paint);
      k.oval("hood", [0.5, 0.4, 0.55], [0, 0.62, 0.95], k.paint);
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.09, 0.11, 0.08, 32),
        [0, 1.14, 1.5],
        chrome,
      );
      k.panel("hood", [0.46, 0.06, 0.85], [0, 0.4, 1.55], k.dark, 0.02);
      // Cyan flame tongues licking back along both tank flanks.
      for (const side of sides) {
        k.oval(
          "hood",
          [0.06, 0.16, 0.42],
          [side * 0.62, 0.62, 1.7],
          flame,
        );
        k.oval(
          "hood",
          [0.05, 0.11, 0.3],
          [side * 0.6, 0.5, 1.35],
          flame,
        );
        k.oval(
          "hood",
          [0.05, 0.08, 0.2],
          [side * 0.55, 0.72, 1.2],
          flame,
        );
        k.tube(
          "hood",
          [
            [side * 0.62, 0.68, 2.0],
            [side * 0.64, 0.62, 1.6],
            [side * 0.6, 0.54, 1.2],
          ],
          0.035,
          flame,
          24,
        );
      }
      // Twin headlamps on a chrome face plate with buckets and brackets.
      k.panel("hood", [0.86, 0.5, 0.14], [0, 0.52, 2.52], chrome, 0.05);
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.24, 0.52, 2.45],
          [side * 0.24, 0.52, 2.62],
          0.2,
          k.dark,
        );
        k.lamp("hood", [side * 0.24, 0.52, 2.66], 0.16);
        k.bar(
          "hood",
          [side * 0.24, 0.3, 2.55],
          [side * 0.24, 0.44, 2.55],
          0.03,
          k.dark,
        );
      }
      k.bar("hood", [-0.45, 0.28, 2.55], [0.45, 0.28, 2.55], 0.03, k.dark);
      // Long raked fork: paired chrome legs per side down toward the axle.
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.28, 1.05, 1.15],
          [side * 0.42, -0.62, 1.98],
          0.065,
          chrome,
        );
        k.bar(
          "hood",
          [side * 0.44, 1.05, 1.15],
          [side * 0.58, -0.62, 1.98],
          0.065,
          chrome,
        );
        k.bar(
          "hood",
          [side * 0.36, 0.1, 1.62],
          [side * 0.5, -0.62, 1.98],
          0.09,
          k.steel,
        );
        k.bar(
          "hood",
          [side * 0.28, 1.05, 1.15],
          [side * 0.2, 1.3, 0.95],
          0.05,
          chrome,
        );
      }
      k.panel("hood", [0.95, 0.1, 0.3], [0, 1.02, 1.18], k.dark, 0.03);
      k.panel("hood", [0.8, 0.08, 0.24], [0, 0.82, 1.3], chrome, 0.025);
      // Ape-hanger bars: risers, crossbar, grips, levers, cables.
      for (const side of sides)
        k.bar(
          "hood",
          [side * 0.18, 1.05, 1.0],
          [side * 0.24, 1.42, 0.88],
          0.05,
          chrome,
        );
      k.bar("hood", [-0.6, 1.44, 0.86], [0.6, 1.44, 0.86], 0.045, chrome);
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.6, 1.44, 0.86],
          [side * 0.85, 1.44, 0.8],
          0.062,
          k.rubber,
        );
        k.bar(
          "hood",
          [side * 0.55, 1.42, 0.86],
          [side * 0.72, 1.34, 0.96],
          0.018,
          chrome,
        );
        k.tube(
          "hood",
          [
            [side * 0.65, 1.42, 0.86],
            [side * 0.55, 1.0, 0.7],
            [side * 0.5, 0.5, 0.5],
          ],
          0.016,
          k.dark,
        );
      }
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.085, 0.085, 0.07, 32),
        [0, 1.52, 0.94],
        k.dark,
      );
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.068, 0.068, 0.075, 32),
        [0, 1.52, 0.94],
        k.glass,
      );
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.35, 1.44, 0.86],
          [side * 0.58, 1.68, 0.78],
          0.022,
          chrome,
        );
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.1, 0.1, 0.04, 32).rotateX(Math.PI / 2),
          [side * 0.58, 1.72, 0.78],
          k.dark,
        );
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.085, 0.085, 0.045, 32).rotateX(Math.PI / 2),
          [side * 0.58, 1.72, 0.78],
          k.glass,
        );
      }
      // Chrome nose housing slung low between the front wheels.
      k.panel("hood", [0.9, 0.5, 0.6], [0, -0.2, 2.2], chrome, 0.12);
      k.oval("hood", [0.46, 0.26, 0.3], [0, -0.2, 2.5], chrome);
      k.panel("hood", [0.5, 0.1, 0.3], [0, -0.2, 2.52], flame, 0.03);

      // ---- Saddle + sissy bar (roof): quilted seat, tall chrome back ----
      k.panel("roof", [0.6, 0.14, 0.8], [0, 0.68, -0.15], k.dark, 0.05);
      k.oval("roof", [0.44, 0.18, 0.52], [0, 0.84, -0.15], leather);
      k.oval("roof", [0.3, 0.13, 0.32], [0, 0.82, 0.32], leather);
      // Quilted diamond buttons and seam ridges.
      for (let ix = -1; ix <= 1; ix++)
        for (let iz = 0; iz < 3; iz++)
          k.mesh(
            "roof",
            new T.SphereGeometry(0.032, 12, 8),
            [ix * 0.2, 0.95, -0.32 + iz * 0.2],
            k.dark,
          );
      for (let i = -2; i <= 2; i++) {
        k.bar(
          "roof",
          [i * 0.18 - 0.2, 0.96, -0.4],
          [i * 0.18 + 0.2, 0.96, 0.1],
          0.012,
          k.dark,
        );
        k.bar(
          "roof",
          [i * 0.18 - 0.2, 0.96, 0.1],
          [i * 0.18 + 0.2, 0.96, -0.4],
          0.012,
          k.dark,
        );
      }
      for (const side of sides) {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.06, 0.06, 0.14, 20),
          [side * 0.18, 0.58, -0.35],
          chrome,
        );
        k.bar(
          "roof",
          [side * 0.18, 0.5, -0.35],
          [side * 0.18, 0.62, -0.35],
          0.085,
          k.dark,
        );
      }
      k.tube(
        "roof",
        [
          [0, 0.72, 0.9],
          [0, 0.74, 0.3],
          [0, 0.72, -0.4],
        ],
        0.07,
        chrome,
      );
      // Tall sissy bar: paired uprights, top hoop, slats, backrest pad.
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.32, 0.6, -0.85],
          [side * 0.4, 2.2, -1.2],
          0.055,
          chrome,
        );
      k.tube(
        "roof",
        [
          [-0.4, 2.2, -1.2],
          [0, 2.35, -1.23],
          [0.4, 2.2, -1.2],
        ],
        0.05,
        chrome,
        24,
      );
      for (const y of [1.15, 1.55, 1.9]) {
        const t = (y - 0.6) / 1.6;
        const z = -0.85 + t * -0.35;
        const x = 0.32 + t * 0.08;
        k.bar("roof", [-x, y, z], [x, y, z], 0.032, chrome);
      }
      k.panel("roof", [0.62, 0.5, 0.14], [0, 1.35, -1.01], leather, 0.06);
      k.oval("roof", [0.2, 0.14, 0.06], [0, 1.35, -0.92], flame);
      k.oval("roof", [0.4, 0.26, 0.4], [0, 0.62, -0.8], k.paint);

      // ---- Engine + exhausts (doors): V-twin, chrome pipes, boards ----
      for (const side of sides) {
        const d = door(side);
        k.panel(d, [0.55, 0.55, 0.8], [side * 0.5, 0.0, 0.35], k.dark, 0.07);
        // V-twin finned jugs leaning fore and aft.
        for (const lean of [-0.35, 0.35]) {
          const jug = k.mesh(
            d,
            new T.CylinderGeometry(0.19, 0.19, 0.55, 32),
            [side * 0.52, 0.18, 0.35 + lean * 0.5],
            k.steel,
          );
          jug.rotation.x = lean;
          for (let i = 0; i < 6; i++)
            k.panel(
              d,
              [0.46, 0.035, 0.46],
              [side * 0.52, -0.02 + i * 0.08, 0.35 + lean * (0.5 - i * 0.06)],
              k.steel,
              0.01,
            ).rotation.x = lean;
          k.oval(
            d,
            [0.2, 0.1, 0.2],
            [side * 0.52, 0.48, 0.35 + lean * 0.3],
            chrome,
          );
        }
        k.mesh(
          d,
          new T.CylinderGeometry(0.17, 0.17, 0.12, 40).rotateZ(Math.PI / 2),
          [side * 0.82, 0.12, 0.55],
          chrome,
        );
        k.mesh(
          d,
          new T.CylinderGeometry(0.14, 0.14, 0.13, 40).rotateZ(Math.PI / 2),
          [side * 0.82, 0.12, 0.55],
          k.dark,
        );
        // Flame licks on the crankcase covers.
        k.oval(d, [0.05, 0.12, 0.3], [side * 0.79, -0.05, 0.1], flame);
        k.oval(d, [0.04, 0.08, 0.2], [side * 0.78, 0.12, -0.05], flame);
        // Twin chrome pipes sweeping low and back to slash-cut mufflers.
        for (const lift of [0, 0.16]) {
          k.tube(
            d,
            [
              [side * 0.55, 0.15, 0.7],
              [side * 0.8, -0.05 + lift, 0.2],
              [side * 0.9, -0.1 + lift, -0.6],
              [side * 0.9, -0.02 + lift, -1.4],
            ],
            0.07,
            chrome,
            48,
          );
          k.bar(
            d,
            [side * 0.9, -0.02 + lift, -1.4],
            [side * 0.9, 0.02 + lift, -1.75],
            0.1,
            chrome,
          );
          k.mesh(
            d,
            new T.CylinderGeometry(0.075, 0.075, 0.04, 24).rotateX(
              Math.PI / 2,
            ),
            [side * 0.9, 0.02 + lift, -1.76],
            k.dark,
          );
        }
        for (const z of [-0.5, -1.1])
          k.mesh(
            d,
            new T.TorusGeometry(0.13, 0.026, 10, 32),
            [side * 0.9, -0.05, z],
            k.dark,
          );
        k.panel(d, [0.36, 0.07, 0.55], [side * 0.85, -0.28, 0.4], chrome, 0.02);
        k.panel(d, [0.3, 0.035, 0.48], [side * 0.85, -0.24, 0.4], k.rubber, 0.01);
        k.bar(d, [side * 0.65, -0.15, 0.2], [side * 0.9, -0.34, 0.05], 0.028, chrome);
        k.panel(d, [0.1, 0.16, 1.4], [side * 0.6, -0.3, -0.4], k.dark, 0.03);
      }

      // ---- Fat rear (bed): wide purple fenders with flames, tail ----
      k.hull("bed", [
        [-2.55, -0.3, 0.4, 1.0, 0.9],
        [-0.5, -0.3, 0.5, 1.0, 0.9],
      ]);
      k.panel("bed", [1.9, 0.14, 1.6], [0, 0.42, -1.2], k.dark, 0.04);
      for (const side of sides) {
        // Wide fender crown over each rear tire + flared skirt.
        k.oval("bed", [0.55, 0.42, 0.95], [side * 1.45, 0.55, -1.65], k.paint);
        k.panel(
          "bed",
          [0.75, 0.5, 1.7],
          [side * 1.5, 0.15, -1.65],
          k.paint,
          0.14,
        );
        k.panel(
          "bed",
          [0.8, 0.08, 1.8],
          [side * 1.5, -0.1, -1.65],
          k.dark,
          0.025,
        );
        // Cyan flames streaming across each rear fender.
        k.oval("bed", [0.3, 0.08, 0.55], [side * 1.45, 0.92, -1.5], flame);
        k.oval("bed", [0.2, 0.07, 0.35], [side * 1.45, 0.9, -2.0], flame);
        k.tube(
          "bed",
          [
            [side * 1.45, 0.93, -1.0],
            [side * 1.45, 0.94, -1.5],
            [side * 1.45, 0.92, -2.1],
          ],
          0.045,
          flame,
          24,
        );
        k.panel("bed", [0.06, 0.1, 0.2], [side * 1.5, 0.3, -2.5], k.amber, 0.02);
        k.bar(
          "bed",
          [side * 1.1, 0.1, -2.4],
          [side * 1.5, 0.1, -2.4],
          0.05,
          k.dark,
        );
      }
      k.panel("bed", [1.4, 0.6, 0.12], [0, 0.35, -2.56], k.paint, 0.05);
      k.panel("bed", [1.2, 0.14, 0.08], [0, 0.62, -2.6], chrome, 0.03);
      k.lamp("bed", [0, 0.3, -2.63], 0.1, k.red, -1);
      k.panel("bed", [0.44, 0.16, 0.04], [0, 0.05, -2.63], k.white, 0.012);
      k.panel("bed", [0.6, 0.3, 0.5], [0, 0.6, -1.1], leather, 0.08);

      // ---- Front bumper: chrome derby bar, bullbar, fogs ----
      k.panel("bumper-front", [2.4, 0.26, 0.32], [0, -0.2, 2.62], chrome, 0.085);
      k.panel("bumper-front", [2.2, 0.05, 0.26], [0, -0.06, 2.62], k.dark, 0.015);
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.55, -0.28, 2.9],
          [side * 0.55, 0.5, 2.9],
          0.06,
          chrome,
        );
        k.bar(
          "bumper-front",
          [side * 0.55, -0.1, 2.7],
          [side * 0.55, -0.28, 2.9],
          0.05,
          k.dark,
        );
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.82, -0.32, 2.78],
          k.dark,
        );
        k.lamp("bumper-front", [side * 0.4, -0.2, 2.79], 0.085);
      }
      for (const y of [0.4, -0.08])
        k.bar("bumper-front", [-0.55, y, 2.9], [0.55, y, 2.9], 0.055, chrome);
      k.panel("bumper-front", [0.42, 0.13, 0.03], [0, -0.2, 2.79], k.white, 0.01);

      // ---- Rear bumper: nerf bar, lights, flaps, hitch ----
      k.panel("bumper-rear", [2.4, 0.22, 0.3], [0, -0.16, -2.68], k.dark, 0.07);
      k.tailLights(-2.85, 0.06);
      for (const side of sides) {
        k.panel(
          "bumper-rear",
          [0.55, 0.5, 0.06],
          [side * 1.6, -0.56, -2.78],
          k.rubber,
          0.03,
        );
        k.bar(
          "bumper-rear",
          [side * 1.2, -0.16, -2.68],
          [side * 1.6, -0.36, -2.78],
          0.04,
          k.dark,
        );
      }
      k.bar("bumper-rear", [0, -0.33, -2.7], [0, -0.33, -2.95], 0.06, k.dark);
      k.mesh(
        "bumper-rear",
        new T.TorusGeometry(0.09, 0.028, 12, 32),
        [0, -0.33, -2.97],
        chrome,
      );

      // ---- Chassis: purple arches, shocks, frame rails, skid ----
      fenders(k, k.paint);
      for (const side of sides) {
        k.bar(
          "chassis-front",
          [side * 0.3, 0.4, 1.2],
          [side * 0.5, -0.4, 0.4],
          0.06,
          chrome,
        );
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          flame,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          flame,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.45, -0.4],
          [side * 0.55, -0.45, -2.4],
          0.07,
          k.dark,
        );
      }
      k.panel("chassis-front", [1.1, 0.08, 0.9], [0, -0.56, 1.5], chrome, 0.02);
      k.panel("chassis-rear", [0.6, 0.4, 0.5], [0.55, -0.3, -0.9], k.dark, 0.06);
      k.bar("chassis-front", [-0.5, -0.3, 1.9], [0.5, -0.3, 1.9], 0.05, k.dark);

      // Dark hub caps over the kit hubs with chrome centers.
      const trikeCaps = [
        ["wheel-fl", 2.07, 1.65],
        ["wheel-fr", -2.07, 1.65],
        ["wheel-rl", 2.07, -1.65],
        ["wheel-rr", -2.07, -1.65],
      ] as const;
      for (const [part, x, z] of trikeCaps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.16, 0.16, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.06, 0.06, 0.09, 20).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          chrome,
        );
      }
    },
  ),
];
