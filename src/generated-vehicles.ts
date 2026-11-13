import * as T from "three";
import { vehicle } from "./themed-vehicles";
import { finish, type XYZ } from "./concept-vehicle-kit";
import type { PartId } from "./damage";
import {
  cabin,
  door,
  fenders,
  glow,
  gold,
  openSeat,
  sides,
  stack,
} from "./themed-vehicle-body";

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
        [2.0, -0.18, 0.56, 1.1, 1.02],
        [3.52, -0.2, 0.44, 1.0, 0.94],
      ]);
      k.oval("hood", [0.75, 0.1, 1.45], [0, 0.62, 2.1]);
      k.bar("hood", [0, 0.62, 3.42], [0, 0.78, 3.42], 0.025, chrome);
      k.oval("hood", [0.05, 0.09, 0.05], [0, 0.84, 3.42], chrome);
      k.panel("hood", [1.24, 0.6, 0.1], [0, 0.14, 3.57], chrome, 0.04);
      k.panel("hood", [1.06, 0.46, 0.08], [0, 0.14, 3.6], k.dark, 0.02);
      for (let i = 0; i < 9; i++)
        k.bar(
          "hood",
          [-0.44 + i * 0.11, -0.06, 3.65],
          [-0.44 + i * 0.11, 0.34, 3.65],
          0.02,
          chrome,
        );
      k.bar("hood", [-0.55, 0.36, 3.64], [0.55, 0.36, 3.64], 0.025, chrome);
      k.bar("hood", [-0.55, -0.08, 3.64], [0.55, -0.08, 3.64], 0.025, chrome);
      for (const side of sides) {
        k.lamp("hood", [side * 0.78, 0.26, 3.6], 0.15);
        k.lamp("hood", [side * 0.78, -0.02, 3.6], 0.07, k.amber);
        k.oval("hood", [0.34, 0.28, 0.85], [side * 1.0, 0.32, 1.62]);
        k.panel(
          "hood",
          [0.06, 0.05, 1.8],
          [side * 1.13, 0.5, 2.6],
          chrome,
          0.012,
        );
      }

      // ---- Stretch cabin: six tinted side windows, chrome pillars ----
      cabin(k, { front: 2.4, back: -5.5, height: 1.55, width: 1.02, slant: 0.3 });
      for (const side of sides) {
        // Chrome window surround: full-length top and belt rails.
        k.bar(
          "roof",
          [side * 1.12, 1.45, 2.08],
          [side * 1.12, 1.45, -5.27],
          0.032,
          chrome,
        );
        k.bar(
          "roof",
          [side * 1.12, 0.5, 2.15],
          [side * 1.12, 0.5, -5.33],
          0.032,
          chrome,
        );
        // Division pillars -> three windows per side.
        for (const z of [-0.35, -2.95]) {
          k.bar(
            "roof",
            [side * 1.06, 0.5, z],
            [side * 1.06, 1.45, z],
            0.065,
            k.paint,
          );
          k.bar(
            "roof",
            [side * 1.13, 0.5, z],
            [side * 1.13, 1.45, z],
            0.03,
            chrome,
          );
        }
        // A- and C-pillars framing windshield and rear glass.
        k.bar(
          "roof",
          [side * 1.0, 0.42, 2.38],
          [side * 1.0, 1.53, 2.12],
          0.05,
          k.paint,
        );
        k.bar(
          "roof",
          [side * 1.0, 0.42, -5.48],
          [side * 1.0, 1.53, -5.3],
          0.05,
          k.paint,
        );
        // Smoked tint overlays: three panes per side between the pillars.
        for (const [z0, z1] of [
          [2.16, -0.28],
          [-0.42, -2.88],
          [-3.02, -5.26],
        ] as const)
          k.panel(
            "roof",
            [0.02, 0.87, z0 - z1 - 0.06],
            [side * 1.1, 0.975, (z0 + z1) / 2],
            tint,
            0.008,
          );
        // Tinted windshield panes matching the cabin slant.
        k.panel(
          "roof",
          [0.78, 0.92, 0.02],
          [side * 0.5, 1.0, 2.38],
          tint,
          0.008,
        ).rotation.x = Math.atan2(-0.3, 1.02);
      }
      // Sunroof outline, roof rails, rear antenna.
      k.panel("roof", [0.9, 0.03, 4.6], [0, 1.63, -1.6], k.dark, 0.012);
      k.bar("roof", [-0.45, 1.63, 0.6], [-0.45, 1.63, -3.8], 0.018, chrome);
      k.bar("roof", [0.45, 1.63, 0.6], [0.45, 1.63, -3.8], 0.018, chrome);
      k.bar("roof", [0.8, 1.55, -5.1], [0.8, 2.27, -5.2], 0.014, k.dark);
      k.oval("roof", [0.03, 0.05, 0.03], [0.8, 2.29, -5.2], chrome);
      // Dark cabin interior seen through the glass.
      k.panel("roof", [1.6, 0.4, 0.4], [0, 0.7, 1.7], k.dark, 0.06);
      k.panel("roof", [1.6, 0.45, 0.45], [0, 0.7, 0.2], k.dark, 0.08);
      k.panel("roof", [1.6, 0.5, 0.5], [0, 0.7, -1.4], k.dark, 0.08);
      k.panel("roof", [1.6, 0.5, 0.5], [0, 0.7, -3.0], k.dark, 0.08);
      k.panel("roof", [1.6, 0.5, 0.5], [0, 0.7, -4.4], k.dark, 0.08);
      k.mesh(
        "roof",
        new T.TorusGeometry(0.17, 0.028, 12, 48),
        [-0.45, 0.85, 1.55],
        k.dark,
      ).rotation.x = -0.5;
      k.oval("roof", [0.5, 0.12, 0.3], [0, 0.9, -1.9], k.dark);

      // ---- Stretched flanks: chrome spears, handles, mirrors ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [-5.55, -0.15],
            [2.5, -0.15],
            [2.4, 0.42],
            [-5.45, 0.47],
          ],
          0.12,
          side * 1.12,
          k.paint,
          0.03,
        );
        k.bar(
          d,
          [side * 1.2, 0.44, 2.4],
          [side * 1.2, 0.44, -5.45],
          0.028,
          chrome,
        );
        k.panel(d, [0.05, 0.07, 7.7], [side * 1.2, 0.05, -1.525], chrome, 0.015);
        k.panel(d, [0.06, 0.05, 7.9], [side * 1.19, -0.12, -1.525], k.dark, 0.012);
        for (const z of [1.3, -0.7, -2.7, -4.4]) {
          k.panel(d, [0.07, 0.05, 0.28], [side * 1.22, 0.3, z], chrome, 0.018);
          k.bar(
            d,
            [side * 1.19, -0.1, z + 0.35],
            [side * 1.19, 0.4, z + 0.35],
            0.012,
            k.dark,
          );
        }
        k.bar(
          d,
          [side * 1.15, 0.85, 2.05],
          [side * 1.38, 0.92, 2.1],
          0.028,
          k.dark,
        );
        k.panel(d, [0.09, 0.24, 0.16], [side * 1.41, 0.92, 2.1], chrome, 0.03);
        k.panel(d, [0.06, 0.18, 0.03], [side * 1.41, 0.92, 2.0], k.glass, 0.01);
        k.oval(d, [0.06, 0.1, 0.35], [side * 1.2, 0.42, 1.95], chrome);
        k.oval(d, [0.06, 0.1, 0.35], [side * 1.2, 0.42, -5.35], chrome);
      }

      // ---- Trunk deck: tapered tail, chrome strip, plate ----
      k.hull("bed", [
        [-5.8, -0.18, 0.5, 1.0, 0.95],
        [-0.85, -0.15, 0.6, 1.1, 1.03],
      ]);
      k.panel("bed", [1.7, 0.06, 3.4], [0, 0.56, -4.1], k.paint, 0.025);
      k.bar("bed", [-0.8, 0.5, -5.75], [0.8, 0.5, -5.75], 0.028, chrome);
      k.oval("bed", [0.12, 0.07, 0.04], [0, 0.38, -5.81], chrome);
      k.panel("bed", [0.44, 0.14, 0.05], [0, 0.12, -5.83], k.accent, 0.015);
      for (const side of sides) {
        k.oval("bed", [0.34, 0.28, 0.85], [side * 1.0, 0.32, -1.62]);
        k.lamp("bed", [side * 0.72, 0.3, -5.77], 0.09, k.red, -1);
      }

      // ---- Chrome bumpers with overriders ----
      k.panel("bumper-front", [2.4, 0.22, 0.3], [0, -0.12, 3.72], chrome, 0.08);
      k.panel(
        "bumper-front",
        [2.42, 0.07, 0.31],
        [0, -0.12, 3.72],
        k.dark,
        0.03,
      );
      for (const side of sides) {
        k.panel(
          "bumper-front",
          [0.24, 0.34, 0.36],
          [side * 0.7, -0.08, 3.72],
          chrome,
          0.06,
        );
        k.lamp("bumper-front", [side * 1.02, -0.1, 3.82], 0.06, k.amber);
      }
      k.panel("bumper-rear", [2.4, 0.22, 0.3], [0, -0.1, -5.87], chrome, 0.08);
      for (const side of sides)
        k.panel(
          "bumper-rear",
          [0.24, 0.34, 0.36],
          [side * 0.7, -0.06, -5.87],
          chrome,
          0.06,
        );
      k.tailLights(-6.03, 0.18);

      // ---- Chassis dress: arches, boards, shocks, exhaust ----
      fenders(k, k.paint);
      for (const side of sides) {
        k.panel(
          "chassis-front",
          [0.4, 0.09, 3.8],
          [side * 1.35, -0.32, -1.0],
          chrome,
          0.03,
        );
        k.panel(
          "chassis-front",
          [0.34, 0.04, 3.7],
          [side * 1.35, -0.26, -1.0],
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
            [side * 0.5, -0.45, -5.4],
            [side * 0.55, -0.42, -6.03],
          ],
          0.07,
          chrome,
          24,
        );
        k.oval("chassis-rear", [0.09, 0.09, 0.05], [side * 0.55, -0.42, -6.04], k.dark);
      }
      k.bar("chassis-front", [0, -0.55, 0.2], [0, -0.55, 2.3], 0.07, k.steel);
      k.bar("chassis-rear", [0, -0.55, -0.6], [0, -0.55, -4.7], 0.07, k.steel);
      k.oval("chassis-front", [0.5, 0.3, 0.4], [0, -0.5, 0.6], k.dark);
      k.panel("chassis-front", [1.4, 0.08, 0.5], [0, -0.5, 3.4], k.dark, 0.02);
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
      // Pushed outboard (outer wall x ~2.6) so the pod reads proud of the
      // fender arch from the showroom angle, with a shadow gap to the frame.
      k.profile(
        "door-left",
        [
          [-1.0, 0.0],
          [0.95, 0.0],
          [1.03, 0.35],
          [0.8, 0.78],
          [-0.75, 0.78],
          [-1.0, 0.4],
        ],
        1.0,
        2.1,
        k.paint,
        0.05,
      );
      k.oval("door-left", [0.5, 0.36, 0.4], [2.1, 0.3, 0.95], k.paint);
      k.panel("door-left", [0.86, 0.1, 1.3], [2.1, 0.76, -0.05], k.dark, 0.03);
      k.panel("door-left", [0.75, 0.12, 0.6], [2.1, 0.78, -0.35], leather, 0.05);
      k.panel("door-left", [0.75, 0.4, 0.14], [2.1, 0.9, -0.7], leather, 0.05);
      // Rub rail and brass side stripe with rivets, proud of the pod wall.
      for (const z of [0.55, -0.05, -0.65])
        k.bar(
          "door-left",
          [2.65, 0.55, z + 0.3],
          [2.65, 0.55, z - 0.3],
          0.05,
          k.steel,
        );
      k.bar("door-left", [2.61, 0.25, 0.85], [2.61, 0.25, -0.9], 0.055, brass);
      for (let i = 0; i < 7; i++)
        k.mesh(
          "door-left",
          new T.SphereGeometry(0.04, 10, 8),
          [2.63, 0.42, 0.75 - i * 0.25],
          brass,
        );
      k.panel("door-left", [0.34, 0.07, 0.8], [2.1, -0.07, -0.02], k.steel, 0.02);
      // Bolted pod mounts to the bike frame.
      for (const z of [0.4, -0.5]) {
        k.bar("door-left", [1.6, 0.05, z], [0.2, -0.02, z], 0.06, k.dark);
        k.mesh(
          "door-left",
          new T.CylinderGeometry(0.045, 0.045, 0.1, 16).rotateZ(Math.PI / 2),
          [0.24, -0.02, z],
          k.steel,
        );
      }
      // Tiny three-pane windshield with frame and bolts.
      k.panel(
        "door-left",
        [0.62, 0.8, 0.03],
        [2.1, 1.18, 0.65],
        k.glass,
        0.012,
      ).rotation.x = -0.28;
      for (const side of sides) {
        k.panel(
          "door-left",
          [0.26, 0.68, 0.03],
          [2.1 + side * 0.37, 1.16, 0.59],
          k.glass,
          0.012,
        ).rotation.y = side * 0.5;
        k.bar(
          "door-left",
          [2.1 + side * 0.29, 0.78, 0.68],
          [2.1 + side * 0.29, 1.56, 0.51],
          0.032,
          brass,
        );
      }
      k.bar("door-left", [1.76, 0.8, 0.68], [2.44, 0.8, 0.68], 0.032, brass);
      k.bar("door-left", [1.78, 1.56, 0.51], [2.42, 1.56, 0.51], 0.032, brass);
      k.bar("door-left", [2.1, 0.8, 0.68], [2.1, 1.56, 0.51], 0.028, brass);
      for (const x of [1.88, 2.1, 2.32])
        for (const y of [0.88, 1.46]) {
          const z = y > 1.1 ? 0.54 : 0.67;
          k.mesh(
            "door-left",
            new T.CylinderGeometry(0.024, 0.024, 0.05, 10).rotateX(Math.PI / 2),
            [x, y, z],
            k.steel,
          );
        }
      k.lamp("door-left", [2.1, 0.35, 1.25], 0.06, k.amber);

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
      // Twin headlamps on a chrome face plate at the fork crown, just
      // below the bars and clear of the tank nose.
      k.panel("hood", [0.8, 0.42, 0.12], [0, 1.22, 1.5], chrome, 0.05);
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.22, 1.22, 1.44],
          [side * 0.22, 1.22, 1.6],
          0.18,
          k.dark,
        );
        k.lamp("hood", [side * 0.22, 1.22, 1.64], 0.15);
        k.bar(
          "hood",
          [side * 0.22, 1.04, 1.48],
          [side * 0.22, 1.16, 1.48],
          0.03,
          k.dark,
        );
      }
      k.bar("hood", [-0.4, 1.02, 1.45], [0.4, 1.02, 1.45], 0.03, k.dark);
      // Long raked fork: paired chrome legs per side reaching down-forward
      // past the front wheels to the nose axle.
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.28, 1.02, 1.2],
          [side * 0.44, -0.38, 3.0],
          0.065,
          chrome,
        );
        k.bar(
          "hood",
          [side * 0.44, 1.02, 1.2],
          [side * 0.58, -0.38, 3.0],
          0.065,
          chrome,
        );
        k.bar(
          "hood",
          [side * 0.352, 0.39, 2.01],
          [side * 0.44, -0.38, 3.0],
          0.09,
          k.steel,
        );
        k.bar(
          "hood",
          [side * 0.512, 0.39, 2.01],
          [side * 0.58, -0.38, 3.0],
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
      k.bar("hood", [-0.58, -0.38, 3.0], [0.58, -0.38, 3.0], 0.06, k.steel);
      for (const side of sides)
        k.panel(
          "hood",
          [0.2, 0.16, 0.24],
          [side * 0.51, -0.38, 3.0],
          k.dark,
          0.04,
        );
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
      // Chrome nose housing slung low ahead of the front wheels, tying the
      // fork bottoms together.
      k.panel("hood", [0.9, 0.5, 0.6], [0, -0.3, 2.95], chrome, 0.12);
      k.oval("hood", [0.46, 0.26, 0.3], [0, -0.3, 3.2], chrome);
      k.panel("hood", [0.4, 0.08, 0.5], [0, -0.02, 2.95], flame, 0.03);

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

      // ---- Front bumper: low chrome valance tucked under the fork ----
      k.panel("bumper-front", [2.4, 0.26, 0.32], [0, -0.52, 2.35], chrome, 0.085);
      k.panel("bumper-front", [2.2, 0.05, 0.26], [0, -0.38, 2.35], k.dark, 0.015);
      for (const side of sides)
        k.lamp("bumper-front", [side * 0.85, -0.52, 2.52], 0.085);
      k.panel("bumper-front", [0.42, 0.13, 0.03], [0, -0.52, 2.52], k.white, 0.01);

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
  vehicle(
    "dump-truck",
    "Dump Truck",
    "Ochre construction tipper with a ribbed dump bed and a steel cab shield.",
    [13666862, 3817284, 9080724, 0.9, 6],
    (k) => {
      // ---- Nose (hood): cab-over flat face, slatted grille, headlights ----
      k.hull("hood", [
        [0.42, -0.15, 0.62, 1.12, 1.1],
        [2.44, -0.15, 0.62, 1.1, 1.06],
      ]);
      k.panel("hood", [1.3, 0.55, 0.1], [0, 0.28, 2.47], k.dark, 0.05);
      for (let i = 0; i < 7; i++)
        k.panel(
          "hood",
          [1.14, 0.028, 0.05],
          [0, 0.075 + i * 0.068, 2.53],
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
      // Non-slip step pads on the nose top.
      for (const side of sides)
        k.panel("hood", [0.5, 0.04, 0.4], [side * 0.6, 0.63, 2.0], k.dark, 0.012);

      // ---- Cab upper (roof): big windshield, markers, beacon domes ----
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
      k.panel("roof", [2.0, 0.07, 0.12], [0, 2.06, 2.28], k.dark, 0.02);
      for (const x of [-0.78, -0.26, 0.26, 0.78])
        k.panel("roof", [0.15, 0.08, 0.09], [x, 2.13, 2.24], k.amber, 0.02);
      // Twin amber beacon domes on steel plinths, clear of the shield.
      for (const side of sides) {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.1, 0.12, 0.09, 32),
          [side * 0.55, 2.13, 1.85],
          k.dark,
        );
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.1, 0.1, 0.03, 32),
          [side * 0.55, 2.19, 1.85],
          k.steel,
        );
        k.oval("roof", [0.085, 0.13, 0.085], [side * 0.55, 2.28, 1.85], k.amber);
        k.bar(
          "roof",
          [side * 0.55, 2.1, 1.7],
          [side * 0.55, 2.1, 2.0],
          0.025,
          k.steel,
        );
      }

      // ---- Cab doors: glass, stripes, mirrors, grab rails, ladder ----
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
        k.panel(d, [0.05, 0.03, 1.86], [side * 1.185, 0.4, 1.42], k.steel, 0.008);
        k.panel(d, [0.07, 0.06, 0.3], [side * 1.22, 0.55, 1.95], k.steel, 0.02);
        k.bar(d, [side * 1.15, 1.35, 2.25], [side * 1.42, 1.42, 2.3], 0.03, k.dark);
        k.panel(d, [0.1, 0.28, 0.18], [side * 1.45, 1.42, 2.3], k.dark, 0.03);
        k.panel(d, [0.07, 0.22, 0.03], [side * 1.45, 1.42, 2.195], k.steel, 0.012);
        // Ochre grab rails + access ladder on the cab rear pillar.
        for (const z of [0.5, 0.78])
          k.bar(
            d,
            [side * 1.28, 0.02, z],
            [side * 1.28, 1.5, z],
            0.03,
            k.paint,
          );
        for (let i = 0; i < 5; i++) {
          const y = 0.18 + i * 0.3;
          k.bar(
            d,
            [side * 1.28, y, 0.5],
            [side * 1.28, y, 0.78],
            0.022,
            k.paint,
          );
        }
        k.bar(d, [side * 1.28, 1.5, 0.5], [side * 1.28, 1.5, 1.1], 0.028, k.paint);
        k.bar(d, [side * 1.24, 0.1, 2.3], [side * 1.24, 0.7, 2.3], 0.028, k.steel);
        k.panel(d, [0.34, 0.07, 0.3], [side * 1.12, -0.14, 0.72], k.steel, 0.02);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 0.6], k.amber, 0.012);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 2.28], k.amber, 0.012);
      }

      // ---- Dump bed: open ribbed tub, cab shield, hoist ram, tailgate ----
      k.panel("bed", [2.2, 0.14, 2.95], [0, 0.4, -1.12], k.paint, 0.04);
      k.panel("bed", [2.0, 0.06, 2.75], [0, 0.49, -1.12], k.dark, 0.015);
      for (const side of sides) {
        k.panel("bed", [0.09, 1.5, 2.95], [side * 1.12, 1.2, -1.12], k.paint, 0.03);
        k.panel("bed", [0.045, 1.34, 2.78], [side * 1.06, 1.14, -1.12], k.dark, 0.012);
        // Vertical ribs down the outer wall.
        for (let i = 0; i < 7; i++)
          k.panel(
            "bed",
            [0.12, 1.46, 0.26],
            [side * 1.19, 1.18, -0.05 - i * 0.4],
            k.paint,
            0.03,
          );
        // Top rail + rub rail.
        k.bar("bed", [side * 1.12, 1.99, 0.32], [side * 1.12, 1.99, -2.56], 0.05, k.steel);
        k.bar("bed", [side * 1.14, 0.42, 0.32], [side * 1.14, 0.42, -2.56], 0.045, k.dark);
        // Bed-side access ladder + grab handle at the front.
        for (const z of [0.02, 0.3])
          k.bar("bed", [side * 1.26, 0.05, z], [side * 1.26, 1.5, z], 0.028, k.paint);
        for (let i = 0; i < 5; i++) {
          const y = 0.22 + i * 0.3;
          k.bar("bed", [side * 1.26, y, 0.02], [side * 1.26, y, 0.3], 0.02, k.paint);
        }
        k.bar("bed", [side * 1.26, 1.5, 0.3], [side * 1.12, 1.99, 0.3], 0.028, k.paint);
        k.panel("bed", [0.05, 0.07, 0.14], [side * 1.2, 0.62, 0.1], k.amber, 0.012);
        k.panel("bed", [0.05, 0.07, 0.14], [side * 1.2, 0.62, -2.25], k.red, 0.012);
      }
      k.bar("bed", [-1.12, 1.99, -2.56], [1.12, 1.99, -2.56], 0.05, k.steel);
      // Tall front wall with stiffeners rising to the shield.
      k.panel("bed", [2.3, 2.2, 0.12], [0, 1.45, 0.3], k.paint, 0.04);
      k.panel("bed", [2.05, 1.4, 0.05], [0, 1.12, 0.22], k.dark, 0.015);
      for (const x of [-0.75, 0, 0.75])
        k.panel("bed", [0.16, 2.1, 0.1], [x, 1.45, 0.38], k.paint, 0.03);
      k.bar("bed", [-1.1, 2.56, 0.3], [1.1, 2.56, 0.3], 0.05, k.steel);
      // Cab shield canopy over the cab + sloped side cheeks.
      k.panel("bed", [2.5, 0.12, 2.0], [0, 2.6, 1.3], k.paint, 0.04);
      k.panel("bed", [2.1, 0.04, 1.9], [0, 2.53, 1.3], k.dark, 0.012);
      k.bar("bed", [-1.22, 2.6, 2.28], [1.22, 2.6, 2.28], 0.045, k.steel);
      for (const side of sides) {
        k.profile(
          "bed",
          [
            [0.32, 2.54],
            [2.28, 2.54],
            [2.28, 2.0],
            [1.5, 2.0],
          ],
          0.07,
          side * 1.22,
          k.paint,
          0.015,
        );
        k.bar("bed", [side * 0.9, 2.5, 0.32], [side * 0.9, 2.54, 1.2], 0.04, k.steel);
      }
      // Hoist ram + subframe between cab and bed.
      k.bar("bed", [0, 0.15, 0.44], [0, 1.3, 0.4], 0.13, k.dark);
      k.bar("bed", [0, 1.3, 0.4], [0, 2.0, 0.36], 0.085, k.steel);
      k.panel("bed", [0.34, 0.3, 0.2], [0, 0.12, 0.44], k.dark, 0.05);
      k.bar("bed", [-0.2, 0.12, 0.44], [0.2, 0.12, 0.44], 0.05, k.steel);
      k.panel("bed", [0.3, 0.18, 0.24], [0, 2.02, 0.35], k.dark, 0.04);
      k.tube(
        "bed",
        [
          [0.14, 0.2, 0.44],
          [0.2, -0.1, 0.2],
          [0.2, -0.3, -0.5],
        ],
        0.028,
        k.dark,
        24,
      );
      for (const side of sides) {
        k.panel("bed", [0.16, 0.4, 2.9], [side * 0.55, 0.13, -1.1], k.dark, 0.04);
        k.panel("bed", [0.2, 0.4, 0.18], [side * 0.55, 0.1, -2.45], k.steel, 0.04);
      }
      k.bar("bed", [-0.55, 0.1, -2.45], [0.55, 0.1, -2.45], 0.06, k.steel);
      for (const z of [-0.6, -1.4])
        k.bar("bed", [-0.55, 0.13, z], [0.55, 0.13, z], 0.05, k.dark);
      // Side hoist cylinders + pivot bosses, visible in the cab/bed gap.
      for (const side of sides) {
        k.panel("bed", [0.5, 0.15, 0.3], [side * 0.8, 0.05, -0.5], k.dark, 0.04);
        k.bar("bed", [side * 0.95, 0.1, -0.5], [side * 1.0, 0.9, 0.1], 0.09, k.dark);
        k.bar("bed", [side * 1.0, 0.9, 0.1], [side * 1.0, 1.3, 0.32], 0.06, k.steel);
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.12, 0.12, 0.1, 24).rotateZ(Math.PI / 2),
          [side * 1.16, 0.55, 0.28],
          k.dark,
        );
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.05, 0.05, 0.14, 16).rotateZ(Math.PI / 2),
          [side * 1.16, 0.55, 0.28],
          k.steel,
        );
      }
      // Tailgate: ribbed gate, hinges, chains, conspicuity strips.
      k.panel("bed", [2.0, 1.4, 0.1], [0, 1.2, -2.62], k.paint, 0.04);
      for (const x of [-0.75, -0.25, 0.25, 0.75])
        k.panel("bed", [0.14, 1.34, 0.08], [x, 1.18, -2.69], k.paint, 0.025);
      k.bar("bed", [-1.0, 1.94, -2.62], [1.0, 1.94, -2.62], 0.05, k.steel);
      for (const side of sides) {
        k.panel("bed", [0.14, 0.2, 0.14], [side * 0.8, 1.94, -2.62], k.dark, 0.04);
        k.bar("bed", [side * 1.0, 1.85, -2.6], [side * 1.14, 1.5, -2.2], 0.022, k.steel);
        k.panel("bed", [0.32, 0.1, 0.04], [side * 0.72, 0.56, -2.68], k.red, 0.012);
        k.panel("bed", [0.32, 0.1, 0.04], [side * 0.24, 0.56, -2.68], k.white, 0.012);
      }
      k.panel("bed", [1.8, 0.34, 0.08], [0, 0.32, -2.6], k.dark, 0.03);
      k.lamp("bed", [0.6, 1.99, -2.62], 0.07, k.white, -1);

      // ---- Front bumper: ochre bar, tow eyes, fogs, plate ----
      k.panel("bumper-front", [2.5, 0.26, 0.34], [0, -0.11, 2.66], k.paint, 0.085);
      k.panel("bumper-front", [2.3, 0.05, 0.28], [0, 0.03, 2.66], k.dark, 0.015);
      for (const side of sides) {
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.032, 12, 32),
          [side * 0.75, -0.12, 2.84],
          k.steel,
        );
        k.lamp("bumper-front", [side * 0.4, -0.11, 2.84], 0.07);
      }
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.11, 2.845], k.white, 0.01);

      // ---- Rear bumper: step, lights, mud flaps, hitch ----
      k.panel("bumper-rear", [2.3, 0.18, 0.36], [0, -0.12, -2.8], k.steel, 0.06);
      k.panel("bumper-rear", [2.1, 0.05, 0.3], [0, -0.02, -2.8], k.dark, 0.015);
      k.tailLights(-2.96, 0.0);
      for (const side of sides) {
        k.bar(
          "bumper-rear",
          [side * 1.15, -0.16, -2.8],
          [side * 1.65, -0.3, -2.74],
          0.04,
          k.dark,
        );
        k.panel("bumper-rear", [0.55, 0.5, 0.06], [side * 1.65, -0.5, -2.74], k.dark, 0.03);
        k.panel("bumper-rear", [0.4, 0.08, 0.03], [side * 1.65, -0.32, -2.78], k.red, 0.012);
        k.panel("bumper-rear", [0.4, 0.07, 0.3], [side * 1.0, -0.28, -2.82], k.steel, 0.02);
      }
      k.bar("bumper-rear", [0, -0.3, -2.85], [0, -0.3, -3.08], 0.06, k.dark);

      // ---- Chassis: ochre front + black rear arches, tanks, shocks ----
      for (const side of sides) {
        k.arch("chassis-front", side, 1.65, k.paint);
        k.arch("chassis-rear", side, -1.65, k.dark);
      }
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.26, 0.26, 1.0, 48).rotateX(Math.PI / 2),
        [0.95, -0.55, 0.1],
        k.steel,
      );
      for (const z of [0.4, -0.2])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.27, 0.03, 10, 48),
          [0.95, -0.55, z],
          k.dark,
        );
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.05, 0.05, 0.08, 20),
        [0.95, -0.26, 0.1],
        k.dark,
      );
      k.panel("chassis-front", [0.5, 0.4, 0.7], [-0.85, -0.5, 0.1], k.dark, 0.06);
      k.bar("chassis-front", [0.95, -0.55, -0.4], [0.95, -0.55, -1.4], 0.08, k.steel);
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
      k.panel("chassis-rear", [1.7, 0.55, 1.4], [0, -0.35, -1.4], k.paint, 0.06);
      k.bar("chassis-rear", [-1.1, -0.5, -2.85], [1.1, -0.5, -2.85], 0.06, k.dark);
      // Air reservoir + driveline.
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.16, 0.16, 0.9, 32).rotateX(Math.PI / 2),
        [-0.7, -0.5, -1.2],
        k.dark,
      );
      k.bar("chassis-rear", [0, -0.62, -0.6], [0, -0.62, -1.6], 0.06, k.steel);

      // Dark hub caps over the kit hubs.
      const dumpCaps = [
        ["wheel-fl", 2.11, 1.65],
        ["wheel-fr", -2.11, 1.65],
        ["wheel-rl", 2.11, -1.65],
        ["wheel-rr", -2.11, -1.65],
      ] as const;
      for (const [part, x, z] of dumpCaps)
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
    },
  ),
  vehicle(
    "mobile-crane",
    "Mobile Crane",
    "Yellow truck crane with a telescoping boom and stabilizing outriggers.",
    [14726444, 2830131, 10133670, 0.88, 8],
    (k) => {
      const hazard = finish(0x151517, 0.6, 0.1);
      const boomAngle = Math.atan2(1.5, 3.25);
      const boomP = (t: number): [number, number, number] => [
        0,
        1.55 + 1.5 * t,
        -0.55 + 3.25 * t,
      ];
      const off = (
        p: [number, number, number],
        x: number,
        y: number,
      ): [number, number, number] => [p[0] + x, p[1] + y, p[2]];

      // ---- Nose (hood): cab-over flat face, grille, headlights ----
      k.hull("hood", [
        [0.42, -0.14, 0.72, 1.14, 1.12],
        [2.44, -0.14, 0.72, 1.1, 1.06],
      ]);
      k.panel("hood", [1.34, 0.56, 0.1], [0, 0.28, 2.47], k.dark, 0.05);
      for (let i = 0; i < 5; i++)
        k.panel(
          "hood",
          [1.16, 0.035, 0.05],
          [0, 0.1 + i * 0.09, 2.53],
          k.steel,
          0.008,
        );
      k.bar("hood", [-0.67, 0.56, 2.5], [0.67, 0.56, 2.5], 0.03, k.steel);
      k.bar("hood", [-0.67, 0.0, 2.5], [0.67, 0.0, 2.5], 0.03, k.steel);
      k.panel("hood", [2.0, 0.14, 0.1], [0, 0.67, 2.44], k.paint, 0.04);
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.67, 0.0, 2.5],
          [side * 0.67, 0.56, 2.5],
          0.03,
          k.steel,
        );
        k.lamp("hood", [side * 0.84, 0.32, 2.5], 0.14);
        k.lamp("hood", [side * 0.84, 0.02, 2.48], 0.06, k.amber);
        k.panel(
          "hood",
          [0.06, 0.1, 0.16],
          [side * 1.13, 0.35, 2.1],
          k.amber,
          0.015,
        );
      }

      // ---- Cab upper (roof): windshield, visor, markers, horns ----
      cabin(
        k,
        { front: 2.42, back: 0.9, height: 2.02, width: 1.1, slant: 0.16 },
      );
      k.bar("roof", [0, 0.6, 2.45], [0, 1.9, 2.32], 0.055, k.paint);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.45, 0.78, 2.47],
          [side * 0.2, 1.28, 2.41],
          0.022,
          k.dark,
        );
      k.panel("roof", [2.1, 0.08, 0.5], [0, 1.99, 2.52], k.paint, 0.03);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.95, 1.95, 2.4],
          [side * 0.95, 1.95, 2.74],
          0.025,
          k.dark,
        );
      for (const x of [-0.7, 0, 0.7])
        k.panel("roof", [0.14, 0.08, 0.08], [x, 2.12, 2.3], k.amber, 0.018);
      for (const side of sides) {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.06, 0.035, 0.42, 20).rotateX(Math.PI / 2),
          [side * 0.3, 2.17, 1.6],
          k.steel,
        );
        k.bar(
          "roof",
          [side * 0.3, 2.08, 1.48],
          [side * 0.3, 2.15, 1.48],
          0.025,
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
        k.panel(d, [0.06, 0.14, 1.86], [side * 1.19, 0.3, 1.42], hazard, 0.02);
        k.panel(d, [0.05, 0.03, 1.86], [side * 1.185, 0.4, 1.42], k.steel, 0.008);
        k.panel(d, [0.07, 0.06, 0.3], [side * 1.22, 0.55, 1.95], k.steel, 0.02);
        k.bar(d, [side * 1.15, 1.35, 2.25], [side * 1.42, 1.42, 2.3], 0.03, k.dark);
        k.panel(d, [0.1, 0.28, 0.18], [side * 1.45, 1.42, 2.3], k.dark, 0.03);
        k.panel(d, [0.07, 0.22, 0.03], [side * 1.45, 1.42, 2.195], k.steel, 0.012);
        k.bar(d, [side * 1.24, 0.65, 0.62], [side * 1.24, 1.35, 0.62], 0.03, k.steel);
        k.panel(d, [0.34, 0.07, 0.3], [side * 1.12, -0.14, 1.0], k.steel, 0.02);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 0.6], k.amber, 0.012);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 2.28], k.amber, 0.012);
      }

      // ---- Crane carrier deck (bed): deck, boxes, handrails ----
      k.hull("bed", [
        [-2.58, -0.1, 0.72, 1.14, 1.12],
        [0.34, -0.1, 0.72, 1.14, 1.12],
      ]);
      k.panel("bed", [2.2, 0.1, 2.9], [0, 0.76, -1.12], k.paint, 0.03);
      k.panel("bed", [2.24, 0.08, 0.12], [0, 0.6, 0.3], hazard, 0.03);
      for (const side of sides) {
        k.panel("bed", [0.34, 0.5, 1.3], [side * 1.0, 0.5, -1.95], k.paint, 0.04);
        k.panel("bed", [0.36, 0.08, 1.1], [side * 1.0, 0.76, -1.95], hazard, 0.015);
        k.bar(
          "bed",
          [side * 1.18, 0.5, -2.15],
          [side * 1.18, 0.5, -1.75],
          0.025,
          k.steel,
        );
        for (const z of [-1.55, -1.95, -2.35])
          k.bar("bed", [side * 1.12, 0.81, z], [side * 1.12, 1.25, z], 0.028, k.steel);
        k.bar(
          "bed",
          [side * 1.12, 1.25, -1.55],
          [side * 1.12, 1.25, -2.35],
          0.028,
          k.steel,
        );
      }

      // ---- Turntable, turret tub, operator cab, counterweight ----
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.92, 0.98, 0.22, 48),
        [0, 0.9, -1.0],
        hazard,
      );
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * 2 * Math.PI;
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.035, 0.035, 0.07, 12),
          [Math.cos(a) * 0.85, 1.0, -1.0 + Math.sin(a) * 0.85],
          k.steel,
        );
      }
      k.panel("bed", [1.9, 0.3, 1.8], [0, 1.12, -1.0], k.paint, 0.06);
      for (const side of sides)
        k.panel("bed", [0.16, 0.75, 0.9], [side * 0.33, 1.5, -0.55], k.paint, 0.05);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.11, 0.11, 0.9, 24).rotateZ(Math.PI / 2),
        [0, 1.55, -0.55],
        k.dark,
      );
      for (const side of sides)
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.05, 0.05, 0.06, 16).rotateZ(Math.PI / 2),
          [side * 0.46, 1.55, -0.55],
          k.steel,
        );
      // Operator cab on the left flank with glasshouse and beacon.
      k.panel("bed", [0.72, 0.95, 1.15], [0.78, 1.7, -0.8], k.paint, 0.06);
      k.panel("bed", [0.62, 0.62, 0.05], [0.78, 1.86, -0.21], hazard, 0.02);
      k.panel("bed", [0.56, 0.56, 0.05], [0.78, 1.86, -0.185], k.glass, 0.02);
      k.panel("bed", [0.05, 0.62, 0.95], [1.15, 1.86, -0.8], hazard, 0.02);
      k.panel("bed", [0.05, 0.56, 0.89], [1.185, 1.86, -0.8], k.glass, 0.02);
      k.bar("bed", [1.2, 1.55, -0.32], [1.2, 2.17, -0.32], 0.025, k.dark);
      k.bar("bed", [0.5, 2.14, -0.2], [1.06, 2.14, -0.2], 0.025, k.dark);
      k.panel("bed", [0.8, 0.1, 1.25], [0.78, 2.22, -0.8], k.paint, 0.04);
      k.bar("bed", [0.78, 2.27, -1.1], [0.78, 2.38, -1.1], 0.045, k.dark);
      k.oval("bed", [0.07, 0.07, 0.07], [0.78, 2.44, -1.1], k.amber);
      k.bar("bed", [0.95, 1.62, -0.17], [0.7, 2.05, -0.17], 0.018, k.dark);
      k.lamp("bed", [0.78, 2.1, -0.16], 0.06);
      k.panel("bed", [0.3, 0.06, 0.24], [0.78, 1.24, -0.5], k.steel, 0.02);
      // Counterweight with hazard chevrons on the rear face.
      k.panel("bed", [1.7, 0.72, 0.5], [0, 1.35, -2.0], hazard, 0.08);
      for (let i = 0; i < 5; i++) {
        const x = -0.64 + i * 0.32;
        k.panel(
          "bed",
          [0.13, 0.6, 0.04],
          [x, 1.35, -2.26],
          i % 2 ? k.paint : k.steel,
          0.01,
        ).rotation.z = (i % 2 ? -1 : 1) * 0.5;
      }
      // Winch drum with flanges and wound cable behind the pivot.
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.16, 0.16, 0.5, 32).rotateZ(Math.PI / 2),
        [0, 1.32, -1.25],
        hazard,
      );
      for (const side of sides)
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.24, 0.24, 0.05, 32).rotateZ(Math.PI / 2),
          [side * 0.28, 1.32, -1.25],
          k.paint,
        );
      for (const dx of [-0.12, 0, 0.12])
        k.mesh(
          "bed",
          new T.TorusGeometry(0.155, 0.022, 10, 40).rotateY(Math.PI / 2),
          [dx, 1.32, -1.25],
          k.dark,
        );
      // Hydraulic tank, air cleaner, exhaust stack on the tub.
      k.panel("bed", [0.5, 0.4, 0.6], [-0.65, 1.45, -1.5], k.paint, 0.05);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.06, 0.06, 0.1, 16),
        [-0.65, 1.7, -1.5],
        hazard,
      );
      k.panel("bed", [0.06, 0.2, 0.08], [-0.38, 1.45, -1.5], k.amber, 0.015);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.09, 0.09, 0.3, 20),
        [-0.72, 1.4, -1.05],
        hazard,
      );
      stack(k, "bed", -0.72, -1.62, 2.1);
      // Turret access ladder on the right flank.
      for (const z of [-1.7, -1.96])
        k.bar("bed", [-1.2, 0.1, z], [-1.2, 1.3, z], 0.028, k.steel);
      for (let i = 0; i < 5; i++) {
        const y = 0.3 + i * 0.25;
        k.bar("bed", [-1.2, y, -1.7], [-1.2, y, -1.96], 0.02, k.steel);
      }

      // ---- Hoist cylinder from tub to boom belly ----
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.15, 0.15, 0.5, 24).rotateZ(Math.PI / 2),
        [0, 1.02, -1.45],
        hazard,
      );
      k.bar("bed", [0, 1.02, -1.45], [0, 1.5, -0.3], 0.13, hazard);
      k.bar("bed", [0, 1.5, -0.3], [0, 1.75, 0.55], 0.075, k.steel);
      k.panel("bed", [0.2, 0.2, 0.3], [0, 1.7, 0.5], hazard, 0.04);

      // ---- Telescoping boom over the cab with lattice bracing ----
      const baseC = boomP(0.29);
      k.panel(
        "bed",
        [0.6, 0.72, 2.0],
        [baseC[0], baseC[1], baseC[2]],
        k.paint,
        0.05,
      ).rotation.x = -boomAngle;
      const midC = boomP(0.68);
      k.panel(
        "bed",
        [0.48, 0.58, 1.15],
        [midC[0], midC[1], midC[2]],
        k.steel,
        0.04,
      ).rotation.x = -boomAngle;
      const flyC = boomP(0.9);
      k.panel(
        "bed",
        [0.38, 0.46, 0.75],
        [flyC[0], flyC[1], flyC[2]],
        k.paint,
        0.035,
      ).rotation.x = -boomAngle;
      for (const [t, w, h] of [
        [0.56, 0.64, 0.76],
        [0.82, 0.52, 0.62],
      ] as const) {
        const c = boomP(t);
        k.panel("bed", [w, h, 0.12], [c[0], c[1], c[2]], hazard, 0.03).rotation.x =
          -boomAngle;
      }
      for (const side of sides) {
        k.bar(
          "bed",
          off(boomP(0.04), side * 0.32, 0.37),
          off(boomP(0.54), side * 0.32, 0.37),
          0.045,
          k.paint,
        );
        k.bar(
          "bed",
          off(boomP(0.04), side * 0.32, -0.37),
          off(boomP(0.54), side * 0.32, -0.37),
          0.045,
          k.paint,
        );
        const bays = 5;
        for (let i = 0; i < bays; i++) {
          const t0 = 0.04 + (i / bays) * 0.5;
          const t1 = 0.04 + ((i + 1) / bays) * 0.5;
          k.bar(
            "bed",
            off(boomP(t0), side * 0.32, 0.37),
            off(boomP(t1), side * 0.32, -0.37),
            0.026,
            k.paint,
          );
          k.bar(
            "bed",
            off(boomP(t0), side * 0.32, -0.37),
            off(boomP(t1), side * 0.32, 0.37),
            0.026,
            k.paint,
          );
        }
      }
      // Sheave head, cable, hook block over the front bumper.
      const tip = boomP(1.0);
      for (const side of sides)
        k.panel(
          "bed",
          [0.09, 0.52, 0.7],
          [side * 0.21, tip[1] - 0.1, tip[2] - 0.15],
          k.paint,
          0.03,
        ).rotation.x = -boomAngle;
      for (const side of sides)
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.16, 0.16, 0.1, 32).rotateZ(Math.PI / 2),
          [side * 0.1, tip[1] - 0.12, tip[2] - 0.1],
          hazard,
        );
      k.bar(
        "bed",
        [-0.26, tip[1] - 0.12, tip[2] - 0.1],
        [0.26, tip[1] - 0.12, tip[2] - 0.1],
        0.045,
        k.steel,
      );
      for (const side of sides)
        k.bar(
          "bed",
          [side * 0.07, tip[1] - 0.2, tip[2] - 0.08],
          [side * 0.07, 0.85, 2.72],
          0.02,
          hazard,
        );
      for (const side of sides)
        k.panel("bed", [0.07, 0.36, 0.28], [side * 0.1, 0.62, 2.72], k.paint, 0.02);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.1, 0.1, 0.26, 24).rotateZ(Math.PI / 2),
        [0, 0.66, 2.72],
        hazard,
      );
      k.bar("bed", [-0.14, 0.66, 2.72], [0.14, 0.66, 2.72], 0.03, k.steel);
      k.bar("bed", [0, 0.44, 2.72], [0, 0.34, 2.72], 0.045, k.steel);
      k.mesh(
        "bed",
        new T.TorusGeometry(0.11, 0.035, 12, 32, Math.PI * 1.5),
        [0, 0.2, 2.72],
        hazard,
      ).rotation.z = Math.PI * 0.75;
      k.bar("bed", [0, 0.14, 2.66], [0, 0.26, 2.78], 0.015, k.steel);

      // ---- Bed rear face: chevrons, work light ----
      k.panel("bed", [2.0, 0.5, 0.1], [0, 0.35, -2.6], k.paint, 0.04);
      for (const side of sides) {
        k.panel(
          "bed",
          [0.4, 0.12, 0.05],
          [side * 0.7, 0.35, -2.66],
          hazard,
          0.01,
        ).rotation.z = side * 0.5;
        k.panel(
          "bed",
          [0.4, 0.12, 0.05],
          [side * 0.25, 0.35, -2.66],
          hazard,
          0.01,
        ).rotation.z = -side * 0.5;
      }
      k.lamp("bed", [0.6, 1.0, -2.62], 0.07, k.white, -1);

      // ---- Front bumper: yellow bar with hazard chevrons ----
      k.panel("bumper-front", [2.5, 0.3, 0.34], [0, -0.11, 2.66], k.paint, 0.085);
      for (const sx of [-1.08, -0.76, -0.44, 0.44, 0.76, 1.08])
        k.panel(
          "bumper-front",
          [0.15, 0.26, 0.04],
          [sx, -0.11, 2.84],
          hazard,
          0.01,
        ).rotation.z = Math.sign(sx) * 0.55;
      for (const side of sides) {
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.032, 12, 32),
          [side * 0.78, -0.14, 2.8],
          k.steel,
        );
        k.lamp("bumper-front", [side * 0.42, -0.11, 2.84], 0.07);
      }
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.11, 2.845], k.white, 0.01);

      // ---- Rear bumper: step, lights, flaps, hitch ----
      k.panel("bumper-rear", [2.0, 0.2, 0.36], [0, -0.12, -2.8], k.steel, 0.06);
      k.panel("bumper-rear", [1.8, 0.05, 0.3], [0, -0.02, -2.8], hazard, 0.015);
      k.tailLights(-2.96, 0.0);
      for (const side of sides) {
        k.bar(
          "bumper-rear",
          [side * 1.0, -0.16, -2.8],
          [side * 1.65, -0.3, -2.74],
          0.04,
          k.dark,
        );
        k.panel(
          "bumper-rear",
          [0.55, 0.5, 0.06],
          [side * 1.65, -0.5, -2.74],
          k.dark,
          0.03,
        );
        k.panel(
          "bumper-rear",
          [0.4, 0.08, 0.03],
          [side * 1.65, -0.32, -2.78],
          k.red,
          0.012,
        );
      }
      k.bar("bumper-rear", [0, -0.3, -2.85], [0, -0.3, -3.08], 0.06, k.dark);

      // ---- Chassis: fenders, tanks, shocks, outriggers ----
      fenders(k, k.paint);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.26, 0.26, 1.0, 48).rotateX(Math.PI / 2),
        [0.55, -0.55, 0.1],
        k.steel,
      );
      for (const z of [0.4, -0.2])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.27, 0.03, 10, 48),
          [0.55, -0.55, z],
          k.dark,
        );
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.05, 0.05, 0.08, 20),
        [0.55, -0.26, 0.1],
        k.dark,
      );
      k.panel("chassis-front", [0.5, 0.4, 0.6], [-0.6, -0.5, 0.1], k.dark, 0.06);
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          k.steel,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          k.steel,
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
      k.panel("chassis-rear", [1.7, 0.55, 1.4], [0, -0.35, -1.4], k.paint, 0.06);
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.16, 0.16, 0.9, 32).rotateX(Math.PI / 2),
        [-0.7, -0.5, -1.2],
        k.dark,
      );
      k.bar("chassis-rear", [0, -0.62, -0.6], [0, -0.62, -1.6], 0.06, k.steel);
      const rigs = [
        ["chassis-front", 0.15],
        ["chassis-rear", -2.95],
      ] as const;
      for (const [part, z] of rigs)
        for (const side of sides) {
          k.panel(part, [1.35, 0.22, 0.36], [side * 1.72, -0.28, z], k.paint, 0.05);
          k.panel(part, [0.1, 0.26, 0.4], [side * 2.36, -0.28, z], hazard, 0.03);
          for (let i = 0; i < 3; i++)
            k.panel(
              part,
              [0.09, 0.24, 0.38],
              [side * (1.45 + i * 0.3), -0.28, z],
              hazard,
              0.01,
            );
          k.bar(part, [side * 2.3, -0.36, z], [side * 2.3, -0.85, z], 0.095, hazard);
          k.bar(part, [side * 2.3, -0.85, z], [side * 2.3, -1.3, z], 0.06, k.steel);
          k.panel(part, [0.4, 0.09, 0.4], [side * 2.3, -1.35, z], k.paint, 0.02);
          k.panel(part, [0.3, 0.05, 0.3], [side * 2.3, -1.41, z], hazard, 0.015);
        }

      // Dark hub caps over the kit hubs.
      const craneCaps = [
        ["wheel-fl", 2.11, 1.65],
        ["wheel-fr", -2.11, 1.65],
        ["wheel-rl", 2.11, -1.65],
        ["wheel-rr", -2.11, -1.65],
      ] as const;
      for (const [part, x, z] of craneCaps)
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
    },
  ),
  vehicle(
    "forklift",
    "Forklift",
    "Compact orange yard forklift with a tall mast and twin pallet forks.",
    [14707230, 3027768, 7041400, 0.8, 6],
    (k) => {
      // ---- Mast (hood): black twin-rail lift mast, chains, carriage ----
      for (const side of sides) {
        k.panel("hood", [0.22, 3.5, 0.28], [side * 0.62, 1.45, 2.2], k.dark, 0.04);
        k.panel(
          "hood",
          [0.1, 3.3, 0.05],
          [side * 0.62, 1.4, 2.36],
          k.steel,
          0.012,
        );
        k.panel(
          "hood",
          [0.15, 3.1, 0.18],
          [side * 0.38, 1.55, 2.42],
          k.steel,
          0.03,
        );
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.17, 0.17, 0.12, 32).rotateZ(Math.PI / 2),
          [side * 0.38, 2.95, 2.42],
          k.dark,
        );
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.06, 0.06, 0.16, 20).rotateZ(Math.PI / 2),
          [side * 0.38, 2.95, 2.42],
          k.steel,
        );
        k.bar(
          "hood",
          [side * 0.38, 0.1, 2.52],
          [side * 0.38, 2.95, 2.52],
          0.028,
          k.dark,
        );
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.13, 0.13, 0.14, 24).rotateZ(Math.PI / 2),
          [side * 0.78, -0.12, 2.2],
          k.steel,
        );
        // Tilt ram: dark housing + chrome rod from chassis to mast lug.
        k.bar(
          "hood",
          [side * 0.8, 0.0, 1.25],
          [side * 0.72, 0.55, 1.95],
          0.095,
          k.dark,
        );
        k.bar(
          "hood",
          [side * 0.72, 0.55, 1.95],
          [side * 0.68, 0.95, 2.18],
          0.055,
          k.steel,
        );
        k.panel("hood", [0.16, 0.3, 0.2], [side * 0.68, 0.95, 2.14], k.dark, 0.04);
        // Hydraulic hose snaking up the outer rail.
        k.tube(
          "hood",
          [
            [side * 0.78, -0.2, 1.1],
            [side * 0.85, 1.2, 1.95],
            [side * 0.8, 2.6, 2.1],
            [side * 0.7, 3.0, 2.2],
          ],
          0.032,
          k.dark,
          48,
        );
        k.panel(
          "hood",
          [0.08, 0.12, 0.03],
          [side * 0.62, 2.6, 2.37],
          k.amber,
          0.01,
        );
      }
      k.panel("hood", [1.46, 0.24, 0.26], [0, 3.12, 2.2], k.dark, 0.05);
      k.panel("hood", [1.5, 0.34, 0.34], [0, -0.12, 2.2], k.dark, 0.06);
      // Lift chains: a column of alternating steel links per side.
      const link = new T.TorusGeometry(0.05, 0.016, 8, 14);
      for (const side of sides)
        for (let i = 0; i < 16; i++)
          k.mesh(
            "hood",
            link,
            [side * 0.38, 0.3 + i * 0.17, 2.52],
            k.steel,
          ).rotation.y = (i % 2) * (Math.PI / 2);
      // Carriage backrest: top bar + five vertical slats behind the shanks.
      k.bar("hood", [-0.65, 0.5, 2.5], [0.65, 0.5, 2.5], 0.05, k.dark);
      k.bar("hood", [-0.65, -0.7, 2.5], [0.65, -0.7, 2.5], 0.05, k.dark);
      for (const x of [-0.52, -0.26, 0, 0.26, 0.52])
        k.bar("hood", [x, -0.7, 2.5], [x, 0.5, 2.5], 0.04, k.dark);
      for (const side of sides)
        k.panel("hood", [0.14, 1.1, 0.2], [side * 0.6, -0.3, 2.38], k.dark, 0.03);

      // ---- Forks (bumper-front): L-profile twin tines with tapered tips ----
      k.panel("bumper-front", [1.5, 0.2, 0.18], [0, -0.62, 2.56], k.dark, 0.04);
      for (const side of sides) {
        k.profile(
          "bumper-front",
          [
            [2.42, -0.3],
            [2.6, -0.3],
            [2.6, -1.56],
            [3.85, -1.56],
            [3.85, -1.7],
            [2.42, -1.7],
          ],
          0.16,
          side * 0.45,
          k.steel,
          0.015,
        );
        k.profile(
          "bumper-front",
          [
            [3.85, -1.56],
            [4.05, -1.63],
            [3.85, -1.7],
          ],
          0.16,
          side * 0.45,
          k.steel,
          0.01,
        );
        k.panel(
          "bumper-front",
          [0.18, 0.14, 0.2],
          [side * 0.45, -0.28, 2.55],
          k.dark,
          0.03,
        );
        k.mesh(
          "bumper-front",
          new T.CylinderGeometry(0.035, 0.035, 0.2, 12).rotateZ(Math.PI / 2),
          [side * 0.45, -0.45, 2.55],
          k.steel,
        );
        k.panel(
          "bumper-front",
          [0.2, 0.35, 0.25],
          [side * 0.45, -1.45, 2.55],
          k.dark,
          0.04,
        );
      }

      // ---- Overhead guard (roof): open orange cage, beacon, work lights ----
      for (const side of sides) {
        k.bar("roof", [side * 0.95, 0.4, 1.0], [side * 0.95, 2.3, 0.78], 0.075, k.paint);
        k.bar("roof", [side * 0.95, 0.4, -1.05], [side * 0.95, 2.3, -1.05], 0.075, k.paint);
        k.panel("roof", [0.2, 0.25, 0.25], [side * 0.95, 0.4, 1.0], k.paint, 0.05);
        k.panel("roof", [0.2, 0.25, 0.25], [side * 0.95, 0.4, -1.05], k.paint, 0.05);
        k.bar("roof", [side * 0.95, 2.3, 0.78], [side * 0.95, 2.3, -1.05], 0.07, k.paint);
        k.lamp("roof", [side * 0.55, 2.22, 0.85], 0.09);
        k.bar("roof", [side * 0.55, 2.3, 0.78], [side * 0.55, 2.22, 0.85], 0.03, k.dark);
        // Side mirror on a stalk off the front post.
        k.bar("roof", [side * 0.95, 1.9, 0.9], [side * 1.15, 1.95, 0.95], 0.025, k.dark);
        k.panel("roof", [0.06, 0.22, 0.14], [side * 1.17, 1.95, 0.95], k.dark, 0.02);
        k.panel("roof", [0.05, 0.18, 0.1], [side * 1.17, 1.95, 0.87], k.glass, 0.01);
        k.bar("roof", [side * 0.95, 1.2, 0.93], [side * 0.95, 1.6, 0.89], 0.028, k.dark);
      }
      k.bar("roof", [-0.95, 2.3, 0.78], [0.95, 2.3, 0.78], 0.07, k.paint);
      k.bar("roof", [-0.95, 2.3, -1.05], [0.95, 2.3, -1.05], 0.07, k.paint);
      for (const z of [0.45, 0.08, -0.29, -0.66, -0.95])
        k.bar("roof", [-0.95, 2.33, z], [0.95, 2.33, z], 0.04, k.paint);
      k.bar("roof", [0, 2.33, 0.78], [0, 2.33, -1.05], 0.04, k.paint);
      for (const [x, z] of [[-0.95, 0.78], [0.95, 0.78], [-0.95, -1.05], [0.95, -1.05]] as const)
        k.panel("roof", [0.16, 0.1, 0.16], [x, 2.3, z], k.paint, 0.03);
      // Amber beacon on a guarded plinth + rear work light.
      k.mesh("roof", new T.CylinderGeometry(0.09, 0.11, 0.07, 24), [0.68, 2.4, 0.55], k.dark);
      k.mesh("roof", new T.CylinderGeometry(0.075, 0.075, 0.04, 24), [0.68, 2.46, 0.55], k.steel);
      k.oval("roof", [0.085, 0.13, 0.085], [0.68, 2.56, 0.55], k.amber);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        k.bar(
          "roof",
          [0.68 + Math.cos(a) * 0.13, 2.42, 0.55 + Math.sin(a) * 0.13],
          [0.68 + Math.cos(a) * 0.13, 2.62, 0.55 + Math.sin(a) * 0.13],
          0.015,
          k.dark,
        );
      }
      k.lamp("roof", [-0.55, 2.22, -1.12], 0.08, k.white, -1);

      // ---- Side body (doors): battery box, steps, vents, grab rails ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [-1.45, -0.25],
            [1.0, -0.25],
            [1.0, 0.42],
            [-1.45, 0.42],
          ],
          0.12,
          side * 1.08,
          k.paint,
          0.03,
        );
        k.bar(d, [side * 1.08, -0.1, -1.45], [side * 1.08, -0.1, 1.0], 0.045, k.dark);
        k.panel(d, [0.05, 0.5, 0.6], [side * 1.16, 0.05, -0.1], k.accent, 0.015);
        k.panel(d, [0.06, 0.05, 0.2], [side * 1.17, 0.12, -0.1], k.steel, 0.015);
        for (let i = 0; i < 5; i++)
          k.panel(
            d,
            [0.05, 0.035, 0.5],
            [side * 1.16, 0.05 + i * 0.075, -0.95],
            k.dark,
            0.01,
          );
        k.panel(d, [0.4, 0.06, 0.32], [side * 1.15, -0.5, 0.6], k.steel, 0.015);
        k.panel(d, [0.4, 0.06, 0.32], [side * 1.15, -0.18, 0.6], k.steel, 0.015);
        k.panel(d, [0.3, 0.02, 0.2], [side * 1.15, -0.46, 0.6], k.dark, 0.008);
        k.panel(d, [0.3, 0.02, 0.2], [side * 1.15, -0.14, 0.6], k.dark, 0.008);
        k.bar(d, [side * 1.1, 0.42, 0.8], [side * 0.97, 1.5, 0.85], 0.03, k.paint);
        k.panel(d, [0.05, 0.07, 0.14], [side * 1.16, 0.1, 0.95], k.amber, 0.012);
        k.panel(d, [0.05, 0.07, 0.14], [side * 1.16, 0.1, -1.4], k.red, 0.012);
      }

      // ---- Counterweight + engine (bed): rounded block, vents, tow pin ----
      k.panel("bed", [2.0, 1.05, 1.35], [0, 0.28, -1.92], k.paint, 0.1);
      k.oval("bed", [0.98, 0.5, 0.3], [0, 0.28, -2.5], k.paint);
      k.panel("bed", [1.75, 0.14, 1.15], [0, 0.86, -1.85], k.paint, 0.04);
      for (let i = 0; i < 6; i++)
        k.panel("bed", [1.3, 0.03, 0.09], [0, 0.94, -1.4 - i * 0.18], k.dark, 0.01);
      k.bar("bed", [-0.85, 0.86, -1.28], [0.85, 0.86, -1.28], 0.035, k.steel);
      for (const side of sides)
        for (let i = 0; i < 4; i++)
          k.panel(
            "bed",
            [0.06, 0.05, 0.6],
            [side * 1.02, 0.45 - i * 0.11, -1.9],
            k.dark,
            0.012,
          );
      k.panel("bed", [1.0, 0.55, 0.1], [0, 0.3, -2.75], k.dark, 0.03);
      for (let i = 0; i < 3; i++)
        k.bar("bed", [-0.45, 0.12 + i * 0.18, -2.81], [0.45, 0.12 + i * 0.18, -2.81], 0.022, k.steel);
      for (const side of sides)
        k.panel("bed", [0.12, 0.1, 0.05], [side * 0.85, 0.3, -2.76], k.red, 0.012);
      // Tow hitch: cheek plates, vertical pin, tow ring.
      for (const side of sides)
        k.panel("bed", [0.12, 0.3, 0.35], [side * 0.15, -0.35, -2.7], k.dark, 0.03);
      k.mesh("bed", new T.CylinderGeometry(0.05, 0.05, 0.34, 16), [0, -0.32, -2.7], k.steel);
      k.mesh("bed", new T.TorusGeometry(0.09, 0.028, 12, 32), [0, -0.52, -2.7], k.dark);
      // Exhaust stack with rain cap + rear work light on a bracket.
      stack(k, "bed", -0.68, -1.35, 2.25, k.dark);
      k.panel("bed", [0.2, 0.03, 0.2], [-0.68, 2.3, -1.52], k.dark, 0.01);
      k.bar("bed", [0.55, 0.93, -2.4], [0.55, 1.05, -2.5], 0.03, k.dark);
      k.lamp("bed", [0.55, 1.05, -2.55], 0.07, k.white, -1);

      // ---- Rear bumper: step bar, lights, mud flaps, hitch ----
      k.panel("bumper-rear", [2.2, 0.24, 0.32], [0, -0.42, -2.86], k.dark, 0.07);
      k.panel("bumper-rear", [2.0, 0.05, 0.28], [0, -0.29, -2.86], k.steel, 0.015);
      k.tailLights(-3.03, -0.35);
      for (const side of sides) {
        k.panel("bumper-rear", [0.55, 0.5, 0.06], [side * 1.65, -0.55, -2.78], k.dark, 0.03);
        k.panel("bumper-rear", [0.4, 0.08, 0.03], [side * 1.65, -0.38, -2.82], k.red, 0.012);
      }
      k.bar("bumper-rear", [0, -0.55, -2.9], [0, -0.55, -3.15], 0.055, k.dark);

      // ---- Operator cell (chassis-front): floor, seat, wheel, levers ----
      k.panel("chassis-front", [1.7, 0.12, 1.7], [0, -0.12, 0.1], k.dark, 0.03);
      k.panel("chassis-front", [0.5, 0.25, 0.45], [0, 0.1, -0.4], k.accent, 0.05);
      k.panel("chassis-front", [0.62, 0.18, 0.55], [0, 0.3, -0.4], k.dark, 0.07);
      k.panel("chassis-front", [0.6, 0.62, 0.16], [0, 0.62, -0.68], k.dark, 0.07).rotation.x = -0.15;
      k.bar("chassis-front", [0, 0.25, 0.5], [0, 0.72, 0.28], 0.05, k.dark);
      k.mesh(
        "chassis-front",
        new T.TorusGeometry(0.17, 0.028, 12, 36),
        [0, 0.76, 0.25],
        k.dark,
      ).rotation.x = -0.5;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        k.bar(
          "chassis-front",
          [0, 0.76, 0.25],
          [Math.cos(a) * 0.15, 0.76 + Math.sin(a) * 0.13, 0.25 + Math.sin(a) * 0.07],
          0.018,
          k.steel,
        );
      }
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.05, 0.05, 0.08, 16).rotateX(Math.PI / 2 - 0.5),
        [0, 0.76, 0.25],
        k.steel,
      );
      k.panel("chassis-front", [0.3, 0.2, 0.4], [0.42, 0.35, 0.35], k.dark, 0.05);
      const leverKnobs = [k.amber, k.dark, k.red] as const;
      for (let i = 0; i < 3; i++) {
        const x = 0.34 + i * 0.08;
        k.bar("chassis-front", [x, 0.45, 0.35], [x - 0.04, 0.78, 0.22], 0.02, k.steel);
        k.oval("chassis-front", [0.045, 0.045, 0.045], [x - 0.04, 0.8, 0.22], leverKnobs[i]);
      }
      k.bar("chassis-front", [-0.42, 0.3, 0.35], [-0.46, 0.7, 0.22], 0.02, k.steel);
      k.oval("chassis-front", [0.045, 0.045, 0.045], [-0.46, 0.72, 0.22], k.dark);
      k.panel("chassis-front", [0.75, 0.28, 0.25], [0, 0.42, 0.62], k.dark, 0.06);
      k.panel("chassis-front", [0.5, 0.12, 0.03], [0, 0.5, 0.5], k.glass, 0.01);
      k.panel("chassis-front", [0.06, 0.06, 0.02], [-0.12, 0.5, 0.48], k.white, 0.008);
      k.panel("chassis-front", [0.06, 0.06, 0.02], [0.0, 0.5, 0.48], k.amber, 0.008);
      k.panel("chassis-front", [0.06, 0.06, 0.02], [0.12, 0.5, 0.48], k.red, 0.008);
      for (const side of sides)
        k.panel("chassis-front", [0.12, 0.04, 0.18], [side * 0.15, -0.03, 0.75], k.steel, 0.01);
      // Tanks, valve block, mast mounts, front shocks.
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.24, 0.24, 0.9, 32).rotateX(Math.PI / 2),
        [0.7, -0.5, 0.1],
        k.steel,
      );
      for (const z of [0.35, -0.15])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.25, 0.03, 10, 40),
          [0.7, -0.5, z],
          k.dark,
        );
      k.panel("chassis-front", [0.4, 0.3, 0.3], [-0.7, -0.4, 0.5], k.steel, 0.05);
      for (const side of sides) {
        k.panel("chassis-front", [0.2, 0.4, 0.5], [side * 0.78, -0.2, 1.9], k.dark, 0.05);
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          k.accent,
        );
      }

      // ---- Rear chassis: battery box, steering gear, rear shocks ----
      k.panel("chassis-rear", [1.2, 0.5, 0.8], [0, -0.3, -1.4], k.dark, 0.06);
      k.panel("chassis-rear", [1.1, 0.06, 0.7], [0, -0.02, -1.4], k.steel, 0.02);
      k.panel("chassis-rear", [1.7, 0.4, 0.6], [0, -0.35, -2.2], k.paint, 0.06);
      k.bar("chassis-rear", [-1.2, -0.7, -1.9], [1.2, -0.7, -1.9], 0.06, k.steel);
      for (const side of sides) {
        k.bar(
          "chassis-rear",
          [side * 1.2, -0.7, -1.9],
          [side * 1.55, -0.8, -1.65],
          0.04,
          k.dark,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          k.accent,
        );
      }
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.12, 0.12, 0.35, 24),
        [0.8, -0.2, -1.2],
        k.dark,
      );
      fenders(k, k.paint);

      // Dark hub caps over the kit hubs.
      const forkCaps = [
        ["wheel-fl", 2.11, 1.65],
        ["wheel-fr", -2.11, 1.65],
        ["wheel-rl", 2.11, -1.65],
        ["wheel-rr", -2.11, -1.65],
      ] as const;
      for (const [part, x, z] of forkCaps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.05, 0.05, 0.08, 20).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "street-sweeper",
    "Street Sweeper",
    "White municipal sweeper with spinning gutter brushes and a water tank.",
    [15265007, 3112898, 6253427, 0.78, 8],
    (k) => {
      const brush = finish(0xd7a416, 0.72, 0.08);
      const brushDark = finish(0x8a6a10, 0.8, 0.05);
      const tankSteel = finish(0xb9c0c4, 0.3, 0.72);

      // ---- Nose (hood): cab-over face, blue livery band, grille, headlights ----
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
      k.panel("hood", [2.0, 0.12, 0.06], [0, -0.06, 2.5], k.accent, 0.02);
      k.panel("hood", [0.44, 0.05, 1.9], [0, 0.64, 1.45], k.accent, 0.015);
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

      // ---- Cab upper (roof): windshield, amber light bar, wipers ----
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
      k.panel("roof", [1.5, 0.09, 0.3], [0, 2.12, 1.9], k.dark, 0.03);
      for (const side of sides) {
        k.bar(
          "roof",
          [side * 0.52, 2.14, 1.9],
          [side * 0.52, 2.18, 1.9],
          0.1,
          k.dark,
        );
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.11, 0.13, 0.16, 24),
          [side * 0.52, 2.24, 1.9],
          k.amber,
        );
      }
      k.panel("roof", [0.3, 0.12, 0.24], [0, 2.22, 1.9], k.white, 0.03);
      for (const side of sides)
        k.panel(
          "roof",
          [0.08, 0.06, 0.12],
          [side * 0.95, 1.95, 2.32],
          k.amber,
          0.015,
        );

      // ---- Cab doors: glass, blue stripe, mirrors, steps ----
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
        k.panel(d, [0.06, 0.13, 1.86], [side * 1.19, 0.28, 1.42], k.accent, 0.02);
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

      // ---- Water tank (bed): cradle, steel cylinder, rivet rings, hatch ----
      k.hull("bed", [
        [-2.5, -0.25, 0.15, 0.8, 0.8],
        [0.4, -0.25, 0.15, 0.8, 0.8],
      ]);
      for (const z of [-0.3, -1.85]) {
        k.panel("bed", [1.7, 0.5, 0.24], [0, -0.05, z], k.dark, 0.05);
        k.panel("bed", [1.74, 0.1, 0.28], [0, 0.22, z], k.steel, 0.03);
      }
      k.mesh(
        "bed",
        new T.CylinderGeometry(1.02, 1.02, 2.9, 72).rotateX(Math.PI / 2),
        [0, 1.05, -1.0],
        tankSteel,
      );
      for (const z of [0.32, -0.48, -1.28, -2.08])
        k.mesh(
          "bed",
          new T.TorusGeometry(1.03, 0.035, 12, 72),
          [0, 1.05, z],
          tankSteel,
        );
      const rivet = new T.SphereGeometry(0.03, 8, 6);
      for (const z of [0.32, -0.48, -1.28, -2.08])
        for (let i = 0; i < 28; i++) {
          const a = (i / 28) * Math.PI * 2;
          k.mesh(
            "bed",
            rivet,
            [Math.cos(a) * 1.03, 1.05 + Math.sin(a) * 1.03, z + 0.055],
            k.steel,
          );
        }
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.24, 0.24, 0.22, 32),
        [0, 2.12, -0.7],
        tankSteel,
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.28, 0.28, 0.08, 32),
        [0, 2.26, -0.7],
        k.dark,
      );
      k.bar("bed", [-0.2, 2.32, -0.7], [0.2, 2.32, -0.7], 0.03, k.steel);

      // ---- Rear equipment compartment: frame, double doors, hardware ----
      k.panel("bed", [2.0, 1.8, 0.14], [0, 1.0, -2.5], k.dark, 0.04);
      k.panel("bed", [1.8, 0.3, 0.1], [0, -0.05, -2.52], k.dark, 0.03);
      for (const side of sides) {
        k.panel("bed", [0.9, 1.6, 0.08], [side * 0.48, 1.0, -2.6], tankSteel, 0.02);
        k.panel("bed", [0.7, 0.6, 0.05], [side * 0.48, 1.35, -2.65], k.dark, 0.015);
        k.panel("bed", [0.7, 0.6, 0.05], [side * 0.48, 0.62, -2.65], k.dark, 0.015);
        for (const y of [0.5, 1.5])
          k.mesh(
            "bed",
            new T.CylinderGeometry(0.04, 0.04, 0.18, 12),
            [side * 0.95, y, -2.6],
            k.dark,
          );
        k.bar(
          "bed",
          [side * 0.12, 1.0, -2.68],
          [side * 0.12, 1.0, -2.56],
          0.03,
          k.dark,
        );
        k.bar(
          "bed",
          [side * 0.12, 0.9, -2.66],
          [side * 0.12, 1.1, -2.66],
          0.025,
          k.steel,
        );
        k.panel("bed", [0.4, 0.08, 0.05], [side * 0.55, 0.22, -2.59], k.red, 0.012);
      }
      k.bar("bed", [-0.9, 1.9, -2.58], [0.9, 1.9, -2.58], 0.04, k.steel);
      k.lamp("bed", [0.5, 1.95, -2.6], 0.08, k.white, -1);
      for (const x of [0.68, 0.94])
        k.bar("bed", [x, -0.2, -2.68], [x, 1.9, -2.68], 0.028, k.steel);
      for (let i = 0; i < 7; i++) {
        const y = 0.0 + i * 0.3;
        k.bar("bed", [0.68, y, -2.68], [0.94, y, -2.68], 0.02, k.steel);
      }

      // ---- Tank flanks: skirts, compartments, rails, fill ports ----
      for (const side of sides) {
        k.panel("bed", [0.28, 0.55, 2.5], [side * 0.98, -0.25, -1.0], k.paint, 0.05);
        for (const z of [-0.5, -1.5]) {
          k.panel("bed", [0.05, 0.4, 0.7], [side * 1.14, -0.25, z], k.dark, 0.015);
          k.panel("bed", [0.06, 0.34, 0.64], [side * 1.15, -0.25, z], tankSteel, 0.015);
          k.bar(
            "bed",
            [side * 1.19, -0.25, z - 0.12],
            [side * 1.19, -0.25, z + 0.12],
            0.02,
            k.dark,
          );
        }
        k.bar("bed", [side * 1.06, 1.7, 0.3], [side * 1.06, 1.7, -2.3], 0.03, k.steel);
        for (const z of [0.25, -1.0, -2.25])
          k.bar("bed", [side * 0.9, 1.45, z], [side * 1.06, 1.7, z], 0.022, k.steel);
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.12, 0.12, 0.14, 20).rotateZ(Math.PI / 2),
          [side * 1.08, 0.9, -0.1],
          k.dark,
        );
        k.panel("bed", [0.05, 0.07, 0.14], [side * 1.13, 0.35, 0.3], k.amber, 0.012);
        k.panel("bed", [0.05, 0.07, 0.14], [side * 1.13, 0.35, -2.3], k.red, 0.012);
      }

      // ---- Front bumper: bar, plate, fogs ----
      k.panel("bumper-front", [2.4, 0.26, 0.34], [0, -0.11, 2.66], k.paint, 0.085);
      k.panel("bumper-front", [2.2, 0.05, 0.28], [0, 0.03, 2.66], k.dark, 0.015);
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.11, 2.845], k.white, 0.01);
      for (const side of sides)
        k.lamp("bumper-front", [side * 0.9, -0.11, 2.84], 0.07);

      // ---- Spray bar with fan nozzles ahead of the nose ----
      k.bar("bumper-front", [-1.0, -0.55, 2.85], [1.0, -0.55, 2.85], 0.045, k.steel);
      for (let i = 0; i < 7; i++) {
        const x = -0.9 + i * 0.3;
        k.mesh(
          "bumper-front",
          new T.CylinderGeometry(0.03, 0.03, 0.14, 10),
          [x, -0.62, 2.85],
          k.dark,
        );
        k.mesh(
          "bumper-front",
          new T.CylinderGeometry(0.012, 0.055, 0.12, 10),
          [x, -0.74, 2.88],
          brushDark,
        );
      }
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 1.0, -0.55, 2.85],
          [side * 1.05, -0.2, 2.6],
          0.035,
          k.steel,
        );
        k.tube(
          "bumper-front",
          [
            [side * 1.0, -0.5, 2.8],
            [side * 1.02, -0.25, 2.62],
            [side * 0.9, -0.1, 2.55],
          ],
          0.028,
          k.dark,
          16,
        );
      }

      // ---- Twin gutter brushes on swing arms under the nose ----
      const bristle = new T.CylinderGeometry(0.028, 0.05, 0.6, 6);
      const bristleInner = new T.CylinderGeometry(0.028, 0.045, 0.48, 6);
      for (const side of sides) {
        const cx = side * 0.8;
        const cz = 3.2;
        k.bar("bumper-front", [side * 0.55, -0.15, 2.62], [cx, -1.0, cz], 0.06, k.dark);
        k.bar("bumper-front", [side * 0.75, -0.15, 2.62], [cx, -1.0, cz], 0.04, k.steel);
        k.bar(
          "bumper-front",
          [side * 0.65, -0.32, 2.75],
          [cx, -0.92, cz - 0.1],
          0.035,
          k.dark,
        );
        k.panel("bumper-front", [0.34, 0.26, 0.34], [cx, -0.88, cz], k.dark, 0.06);
        k.mesh(
          "bumper-front",
          new T.CylinderGeometry(0.13, 0.13, 0.24, 20),
          [cx, -1.08, cz],
          k.steel,
        );
        k.mesh(
          "bumper-front",
          new T.CylinderGeometry(0.52, 0.58, 0.14, 40),
          [cx, -1.26, cz],
          brush,
        );
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.55, 0.03, 10, 40).rotateX(Math.PI / 2),
          [cx, -1.32, cz],
          brushDark,
        );
        for (let i = 0; i < 40; i++) {
          const a = (i / 40) * Math.PI * 2;
          const m = k.mesh(
            "bumper-front",
            bristle,
            [cx + Math.cos(a) * 0.42, -1.58, cz + Math.sin(a) * 0.42],
            brush,
          );
          m.rotation.set(Math.sin(a) * 0.38, 0, -Math.cos(a) * 0.38);
        }
        for (let i = 0; i < 24; i++) {
          const a = ((i + 0.5) / 24) * Math.PI * 2;
          const m = k.mesh(
            "bumper-front",
            bristleInner,
            [cx + Math.cos(a) * 0.22, -1.52, cz + Math.sin(a) * 0.22],
            brush,
          );
          m.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
        }
      }

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

      // ---- Chassis dressing: fenders, suction nozzle, exhaust, shocks ----
      fenders(k, k.paint);
      k.panel("chassis-front", [1.7, 0.22, 0.62], [0, -1.42, 0.9], k.dark, 0.06);
      k.panel("chassis-front", [1.74, 0.1, 0.66], [0, -1.56, 0.9], brushDark, 0.03);
      k.tube(
        "chassis-front",
        [
          [0.5, -1.3, 0.9],
          [0.7, -0.6, 0.5],
          [0.6, 0.1, 0.1],
        ],
        0.11,
        k.dark,
        24,
      );
      k.tube(
        "chassis-front",
        [
          [-0.5, -1.3, 0.9],
          [-0.7, -0.6, 0.5],
          [-0.6, 0.1, 0.1],
        ],
        0.11,
        k.dark,
        24,
      );
      k.panel("chassis-front", [0.5, 0.4, 0.7], [-0.75, -0.5, 0.1], k.dark, 0.06);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.24, 0.24, 1.0, 32).rotateX(Math.PI / 2),
        [0.85, -0.55, 0.1],
        tankSteel,
      );
      for (const z of [0.35, -0.15])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.25, 0.03, 10, 40),
          [0.85, -0.55, z],
          k.dark,
        );
      for (const side of sides) {
        k.mesh(
          "chassis-rear",
          new T.CylinderGeometry(0.15, 0.15, 1.3, 24).rotateX(Math.PI / 2),
          [side * 1.0, -0.55, -0.1],
          k.steel,
        );
        k.mesh(
          "chassis-rear",
          new T.CylinderGeometry(0.17, 0.17, 0.2, 24).rotateX(Math.PI / 2),
          [side * 1.0, -0.55, 0.5],
          k.dark,
        );
        k.bar(
          "chassis-rear",
          [side * 1.0, -0.55, -0.75],
          [side * 1.15, -0.55, -1.1],
          0.07,
          k.steel,
        );
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
      }
      k.panel("chassis-rear", [1.7, 0.5, 1.4], [0, -0.42, -1.4], k.paint, 0.06);
      k.bar("chassis-rear", [-1.1, -0.5, -2.85], [1.1, -0.5, -2.85], 0.06, k.dark);

      // Dark hub caps over the kit hubs.
      const sweepCaps = [
        ["wheel-fl", 2.06, 1.65],
        ["wheel-fr", -2.06, 1.65],
        ["wheel-rl", 2.06, -1.65],
        ["wheel-rr", -2.06, -1.65],
      ] as const;
      for (const [part, x, z] of sweepCaps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.05, 0.05, 0.08, 20).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "hearse",
    "Hearse",
    "Midnight coach-built hearse with curtained glass and silver landau trim.",
    [1842724, 12172999, 3948872, 0.76, 10],
    (k) => {
      const chrome = finish(0xe9edf1, 0.14, 0.95);
      const tint = finish(0x11161c, 0.1, 0.55);
      const curtain = finish(0x6e1423, 0.82, 0.05);
      const curtainDark = finish(0x460c17, 0.86, 0.04);
      const trim = gold();

      // ---- Nose (hood): long formal hood, upright chrome grille, round lamps ----
      k.hull("hood", [
        [0.45, -0.15, 0.62, 1.1, 1.03],
        [1.6, -0.17, 0.58, 1.08, 1.0],
        [2.55, -0.2, 0.5, 1.0, 0.94],
      ]);
      k.oval("hood", [0.7, 0.1, 1.0], [0, 0.6, 1.55]);
      k.bar("hood", [0, 0.66, 0.7], [0, 0.62, 2.45], 0.025, chrome);
      k.oval("hood", [0.05, 0.07, 0.05], [0, 0.68, 2.42], chrome);
      k.panel("hood", [1.12, 0.58, 0.1], [0, 0.14, 2.58], chrome, 0.04);
      k.panel("hood", [0.96, 0.44, 0.08], [0, 0.14, 2.6], k.dark, 0.02);
      for (let i = 0; i < 7; i++)
        k.bar(
          "hood",
          [-0.36 + i * 0.12, -0.05, 2.65],
          [-0.36 + i * 0.12, 0.33, 2.65],
          0.02,
          chrome,
        );
      k.bar("hood", [-0.48, 0.35, 2.64], [0.48, 0.35, 2.64], 0.025, chrome);
      k.bar("hood", [-0.48, -0.07, 2.64], [0.48, -0.07, 2.64], 0.025, chrome);
      for (const side of sides) {
        k.lamp("hood", [side * 0.76, 0.28, 2.58], 0.15);
        k.lamp("hood", [side * 0.76, -0.02, 2.58], 0.07, k.amber);
        k.oval("hood", [0.3, 0.26, 0.75], [side * 1.0, 0.35, 1.6]);
        k.panel("hood", [0.06, 0.05, 1.6], [side * 1.1, 0.5, 1.7], chrome, 0.012);
      }

      // ---- Coach cabin: tall glasshouse, chrome windshield surround, wipers ----
      cabin(
        k,
        { front: 2.45, back: -2.55, height: 2.02, width: 1.05, slant: 0.28 },
      );
      for (const side of sides)
        k.bar(
          "roof",
          [side * 1.0, 0.5, 2.43],
          [side * 1.0, 1.98, 2.15],
          0.045,
          chrome,
        );
      k.bar("roof", [-1.0, 1.98, 2.15], [1.0, 1.98, 2.15], 0.04, chrome);
      k.bar("roof", [-1.0, 0.52, 2.44], [1.0, 0.52, 2.44], 0.035, chrome);
      for (const side of sides) {
        k.bar(
          "roof",
          [side * 0.55, 0.62, 2.42],
          [side * 0.2, 1.12, 2.33],
          0.016,
          k.dark,
        );
        k.bar(
          "roof",
          [side * 0.2, 1.12, 2.33],
          [side * 0.2, 1.28, 2.31],
          0.012,
          k.dark,
        );
      }
      for (const side of sides) {
        const x = side * 1.16;
        // Chrome window rails along the top and belt.
        k.bar("roof", [side * 1.1, 1.94, 2.08], [side * 1.1, 1.94, -2.28], 0.032, chrome);
        k.bar("roof", [side * 1.08, 0.55, 2.1], [side * 1.08, 0.55, -2.3], 0.032, chrome);
        // B-pillar and A-pillar framing the door glass.
        k.bar("roof", [side * 1.1, 0.55, 0.55], [side * 1.1, 1.94, 0.55], 0.06, k.paint);
        k.bar("roof", [side * 1.15, 0.55, 0.55], [side * 1.15, 1.94, 0.55], 0.028, chrome);
        k.bar("roof", [side * 1.1, 0.55, 2.08], [side * 1.1, 1.94, 2.08], 0.05, k.paint);
        // Curtained windows: front door glass plus the long coach glass.
        for (const [z0, z1] of [
          [2.0, 0.65],
          [0.45, -2.0],
        ] as const) {
          const mid = (z0 + z1) / 2;
          const len = z0 - z1;
          k.panel("roof", [0.09, 0.18, len], [x, 1.78, mid], curtain, 0.03);
          const pleats = Math.max(6, Math.round(len / 0.17));
          for (let i = 0; i < pleats; i++) {
            const z = z0 - 0.09 - (i * (len - 0.18)) / (pleats - 1);
            const pleat = k.mesh(
              "roof",
              new T.SphereGeometry(1, 18, 12),
              [x, 1.62, z],
              i % 2 ? curtainDark : curtain,
            );
            pleat.scale.set(0.06, 0.12, 0.075);
          }
          for (const edge of [z0 - 0.12, z1 + 0.12]) {
            const inward = edge > mid ? -1 : 1;
            k.tube(
              "roof",
              [
                [x, 1.7, edge],
                [x, 1.35, edge + inward * 0.12],
                [x, 0.95, edge + inward * 0.3],
              ],
              0.055,
              curtain,
              24,
            );
            const tie = k.mesh(
              "roof",
              new T.SphereGeometry(1, 18, 12),
              [x, 0.92, edge + inward * 0.3],
              trim,
            );
            tie.scale.set(0.045, 0.06, 0.06);
          }
          k.panel("roof", [0.03, 0.75, len - 0.7], [side * 1.14, 1.28, mid], tint, 0.01);
        }
        // Solid C-pillar with a silver landau S-scroll.
        k.panel("roof", [0.14, 1.2, 0.55], [side * 1.1, 1.25, -2.2], k.paint, 0.04);
        k.bar("roof", [side * 1.18, 0.68, -2.42], [side * 1.18, 1.82, -2.42], 0.025, chrome);
        k.bar("roof", [side * 1.18, 0.68, -1.98], [side * 1.18, 1.82, -1.98], 0.025, chrome);
        k.tube(
          "roof",
          [
            [side * 1.19, 0.95, -2.1],
            [side * 1.2, 1.12, -2.32],
            [side * 1.2, 1.32, -2.1],
            [side * 1.19, 1.55, -2.3],
          ],
          0.032,
          chrome,
          40,
        );
        for (const [y, z] of [
          [0.92, -2.08],
          [1.58, -2.32],
        ] as const)
          k.mesh(
            "roof",
            new T.CylinderGeometry(0.06, 0.06, 0.05, 24).rotateZ(Math.PI / 2),
            [side * 1.2, y, z],
            chrome,
          );
      }
      // Roof drip rails and the tall whip antenna over the coach.
      for (const side of sides)
        k.bar("roof", [side * 1.1, 2.03, 2.1], [side * 1.1, 2.03, -2.32], 0.028, chrome);
      k.bar("roof", [0.72, 2.06, -2.15], [0.72, 2.72, -2.26], 0.012, k.dark);
      k.oval("roof", [0.025, 0.045, 0.025], [0.72, 2.74, -2.26], chrome);
      // Cabin interior: dash, bench, wheel, and a coffin on rollers.
      k.panel("roof", [1.7, 0.22, 0.4], [0, 0.78, 1.9], k.dark, 0.06);
      k.panel("roof", [1.7, 0.32, 0.5], [0, 0.68, 1.0], k.dark, 0.08);
      k.mesh(
        "roof",
        new T.TorusGeometry(0.17, 0.028, 12, 48),
        [0.45, 0.92, 1.62],
        k.dark,
      ).rotation.x = -0.5;
      const coffinWood = finish(0x3a2418, 0.6, 0.1);
      k.panel("roof", [0.72, 0.3, 1.8], [0, 0.75, -1.1], coffinWood, 0.05);
      k.panel("roof", [0.6, 0.1, 1.6], [0, 0.93, -1.1], coffinWood, 0.04);
      for (const side of sides)
        for (const z of [-1.6, -1.1, -0.6])
          k.bar(
            "roof",
            [side * 0.38, 0.78, z - 0.12],
            [side * 0.38, 0.78, z + 0.12],
            0.02,
            chrome,
          );

      // ---- Flanks: long body sides, chrome spears, handles, mirrors ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [-2.5, -0.15],
            [2.4, -0.15],
            [2.3, 0.45],
            [-2.4, 0.47],
          ],
          0.12,
          side * 1.12,
          k.paint,
          0.03,
        );
        k.bar(d, [side * 1.2, 0.44, 2.3], [side * 1.2, 0.44, -2.4], 0.028, chrome);
        k.panel(d, [0.05, 0.07, 4.6], [side * 1.19, 0.02, -0.05], chrome, 0.015);
        k.panel(d, [0.06, 0.05, 4.7], [side * 1.18, -0.12, -0.05], k.dark, 0.012);
        for (const z of [1.35, -0.85]) {
          k.panel(d, [0.07, 0.05, 0.28], [side * 1.22, 0.3, z], chrome, 0.018);
          k.bar(d, [side * 1.19, -0.1, z + 0.4], [side * 1.19, 0.42, z + 0.4], 0.012, k.dark);
        }
        k.bar(d, [side * 1.15, 0.9, 1.95], [side * 1.4, 0.98, 2.0], 0.028, k.dark);
        k.panel(d, [0.1, 0.26, 0.18], [side * 1.43, 0.98, 2.0], chrome, 0.03);
        k.panel(d, [0.07, 0.2, 0.02], [side * 1.43, 0.98, 1.9], k.steel, 0.008);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, 0.15, 2.3], k.amber, 0.012);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, 0.15, -2.42], k.red, 0.012);
      }

      // ---- Tail: coach rear door with glass, wiper, vertical lamps ----
      k.hull("bed", [
        [-2.78, -0.18, 0.55, 1.0, 0.94],
        [-0.85, -0.15, 0.62, 1.08, 1.02],
      ]);
      k.panel("bed", [1.5, 1.0, 0.06], [0, 1.25, -2.48], k.dark, 0.03).rotation.x = 0.13;
      k.panel("bed", [1.32, 0.84, 0.05], [0, 1.26, -2.5], tint, 0.02).rotation.x = 0.13;
      k.bar("bed", [-0.72, 1.7, -2.4], [0.72, 1.7, -2.4], 0.03, chrome);
      k.bar("bed", [-0.72, 0.82, -2.56], [0.72, 0.82, -2.56], 0.03, chrome);
      for (const side of sides)
        k.bar(
          "bed",
          [side * 0.72, 0.82, -2.56],
          [side * 0.72, 1.7, -2.4],
          0.03,
          chrome,
        );
      k.bar("bed", [0.3, 0.95, -2.57], [-0.2, 1.25, -2.53], 0.014, k.dark);
      k.panel("bed", [1.7, 0.35, 0.25], [0, 1.82, -2.42], k.paint, 0.06);
      k.panel("bed", [1.8, 0.35, 0.15], [0, 0.65, -2.62], k.paint, 0.05);
      k.panel("bed", [1.7, 0.5, 0.08], [0, 0.25, -2.8], k.paint, 0.03);
      k.bar("bed", [-0.3, 0.55, -2.83], [0.3, 0.55, -2.83], 0.03, chrome);
      k.panel("bed", [0.44, 0.14, 0.05], [0, 0.05, -2.83], k.accent, 0.015);
      for (const side of sides) {
        k.panel("bed", [0.2, 0.5, 0.05], [side * 0.82, 0.3, -2.79], chrome, 0.02);
        k.panel("bed", [0.14, 0.42, 0.07], [side * 0.82, 0.3, -2.8], k.red, 0.02);
        k.lamp("bed", [side * 0.82, 0.0, -2.8], 0.05, k.white, -1);
      }

      // ---- Chrome bumpers with overriders ----
      k.panel("bumper-front", [2.4, 0.22, 0.3], [0, -0.12, 2.78], chrome, 0.08);
      k.panel("bumper-front", [2.42, 0.07, 0.31], [0, -0.12, 2.78], k.dark, 0.03);
      for (const side of sides) {
        k.panel(
          "bumper-front",
          [0.24, 0.34, 0.36],
          [side * 0.7, -0.08, 2.78],
          chrome,
          0.06,
        );
        k.lamp("bumper-front", [side * 1.02, -0.1, 2.9], 0.06, k.amber);
      }
      k.panel("bumper-front", [0.44, 0.13, 0.04], [0, -0.12, 2.94], k.accent, 0.012);
      k.panel("bumper-rear", [2.4, 0.22, 0.3], [0, -0.1, -2.9], chrome, 0.08);
      for (const side of sides)
        k.panel(
          "bumper-rear",
          [0.24, 0.34, 0.36],
          [side * 0.7, -0.06, -2.9],
          chrome,
          0.06,
        );
      k.tailLights(-3.02, 0.12);

      // ---- Chassis dress: arches, boards, shocks, tank, exhaust ----
      fenders(k, k.paint);
      for (const side of sides) {
        k.panel("chassis-front", [0.42, 0.09, 1.1], [side * 1.35, -0.32, 0], chrome, 0.03);
        k.panel("chassis-front", [0.36, 0.04, 1.0], [side * 1.35, -0.26, 0], k.dark, 0.015);
        k.shock(
          "chassis-front",
          [side * 1.2, -0.8, 1.65],
          [side * 0.8, -0.2, 1.65],
          k.accent,
        );
        k.shock(
          "chassis-rear",
          [side * 1.2, -0.8, -1.65],
          [side * 0.8, -0.2, -1.65],
          k.accent,
        );
        k.tube(
          "chassis-rear",
          [
            [side * 0.5, -0.45, -1.9],
            [side * 0.5, -0.45, -2.7],
            [side * 0.55, -0.42, -3.0],
          ],
          0.07,
          chrome,
          24,
        );
        k.oval("chassis-rear", [0.09, 0.09, 0.05], [side * 0.55, -0.42, -3.01], k.dark);
      }
      k.bar("chassis-front", [0.75, -0.55, 0.5], [0.75, -0.55, -0.3], 0.26, k.steel);
      for (const z of [0.3, -0.1])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.27, 0.03, 10, 40),
          [0.75, -0.55, z],
          k.dark,
        );
      k.panel("chassis-front", [0.5, 0.4, 0.7], [-0.75, -0.5, 0.1], k.dark, 0.06);
      k.bar("chassis-front", [0, -0.55, 0.2], [0, -0.55, 2.3], 0.07, k.steel);
      k.bar("chassis-rear", [0, -0.55, -0.6], [0, -0.55, -2.6], 0.07, k.steel);
      k.oval("chassis-front", [0.5, 0.3, 0.4], [0, -0.5, 0.6], k.dark);

      // Dark wheel centers with chrome medallions.
      const caps = [
        ["wheel-fl", 2.06, 1.65],
        ["wheel-fr", -2.06, 1.65],
        ["wheel-rl", 2.06, -1.65],
        ["wheel-rr", -2.06, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.14, 0.14, 0.05, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.055, 0.055, 0.07, 20).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          chrome,
        );
      }
    },
  ),
  vehicle(
    "fuel-tanker",
    "Fuel Tanker",
    "Silver fuel tanker with a cylindrical tank, hose reels, and hazard diamonds.",
    [13225684, 12725806, 4869973, 0.88, 6],
    (k) => {
      const tankSteel = finish(0xdde2e6, 0.3, 0.6);
      const hose = finish(0x571d18, 0.82, 0.05);
      const cream = finish(0xf2ede2, 0.5, 0.1);

      // ---- Nose (hood): cab-over face, grille, stacked round headlamps ----
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
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.65, 0.0, 2.5],
          [side * 0.65, 0.56, 2.5],
          0.03,
          k.steel,
        );
        k.lamp("hood", [side * 0.82, 0.36, 2.5], 0.13);
        k.lamp("hood", [side * 0.82, 0.04, 2.48], 0.11);
        k.panel(
          "hood",
          [0.16, 0.06, 0.06],
          [side * 0.82, -0.12, 2.5],
          k.amber,
          0.015,
        );
      }

      // ---- Cab upper (roof): windshield, sun visor, markers, interior ----
      cabin(
        k,
        { front: 2.42, back: 0.5, height: 2.02, width: 1.1, slant: 0.16 },
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
      // Sun visor over the windshield with a dark underside and arms.
      k.panel("roof", [2.05, 0.06, 0.5], [0, 1.94, 2.58], k.paint, 0.025).rotation.x =
        -0.15;
      k.panel("roof", [1.99, 0.03, 0.44], [0, 1.905, 2.58], k.dark, 0.012).rotation.x =
        -0.15;
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.95, 1.9, 2.32],
          [side * 0.95, 1.93, 2.78],
          0.022,
          k.dark,
        );
      // Five amber clearance markers across the cab roof brow.
      k.panel("roof", [1.95, 0.06, 0.1], [0, 2.06, 2.28], k.dark, 0.02);
      for (const x of [-0.8, -0.4, 0, 0.4, 0.8])
        k.panel("roof", [0.16, 0.08, 0.09], [x, 2.12, 2.26], k.amber, 0.02);
      // Cab interior seen through the glass: dash, seats, wheel.
      k.panel("roof", [1.8, 0.2, 0.4], [0, 0.75, 2.0], k.dark, 0.06);
      for (const side of sides) {
        k.panel("roof", [0.55, 0.5, 0.55], [side * 0.5, 0.75, 1.2], k.dark, 0.08);
        k.panel("roof", [0.55, 0.6, 0.18], [side * 0.5, 1.05, 0.9], k.dark, 0.07);
      }
      k.mesh(
        "roof",
        new T.TorusGeometry(0.16, 0.026, 12, 48),
        [0.5, 0.9, 1.75],
        k.dark,
      ).rotation.x = -0.5;

      // ---- Cab doors: glass, mirrors, grab rails, steps ----
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
        k.panel(d, [0.06, 0.1, 1.86], [side * 1.19, 0.28, 1.42], k.dark, 0.02);
        k.panel(d, [0.07, 0.06, 0.3], [side * 1.22, 0.55, 1.95], k.steel, 0.02);
        k.bar(d, [side * 1.15, 1.35, 2.25], [side * 1.42, 1.42, 2.3], 0.03, k.dark);
        k.panel(d, [0.1, 0.28, 0.18], [side * 1.45, 1.42, 2.3], k.dark, 0.03);
        k.panel(d, [0.07, 0.22, 0.03], [side * 1.45, 1.42, 2.195], k.steel, 0.012);
        k.bar(d, [side * 1.24, 0.1, 2.3], [side * 1.24, 0.7, 2.3], 0.028, k.steel);
        k.panel(d, [0.34, 0.07, 0.3], [side * 1.12, -0.14, 1.0], k.steel, 0.02);
        k.panel(d, [0.3, 0.07, 0.26], [side * 1.1, -0.3, 1.0], k.dark, 0.02);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 0.6], k.amber, 0.012);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 2.28], k.amber, 0.012);
      }

      // ---- Tank cradle: spine, saddles, skirts with compartments ----
      k.hull("bed", [
        [-2.55, -0.25, 0.2, 0.85, 0.85],
        [0.35, -0.25, 0.2, 0.85, 0.85],
      ]);
      for (const z of [-0.75, -1.45]) {
        k.panel("bed", [1.7, 0.45, 0.26], [0, 0.05, z], k.dark, 0.05);
        k.panel("bed", [1.74, 0.1, 0.3], [0, 0.3, z], k.steel, 0.03);
      }
      for (const side of sides) {
        k.panel("bed", [0.3, 0.5, 2.3], [side * 0.95, -0.1, -1.05], k.paint, 0.05);
        for (const z of [-0.6, -1.5]) {
          k.panel("bed", [0.05, 0.36, 0.66], [side * 1.12, -0.1, z], k.dark, 0.015);
          k.panel(
            "bed",
            [0.06, 0.3, 0.6],
            [side * 1.13, -0.1, z],
            tankSteel,
            0.015,
          );
          k.bar(
            "bed",
            [side * 1.17, -0.1, z - 0.12],
            [side * 1.17, -0.1, z + 0.12],
            0.02,
            k.dark,
          );
        }
        k.panel("bed", [0.05, 0.07, 0.14], [side * 1.11, 0.18, 0.05], k.amber, 0.012);
        k.panel("bed", [0.05, 0.07, 0.14], [side * 1.11, 0.18, -2.15], k.red, 0.012);
      }

      // ---- Tank shell: brushed cylinder, end rings, red bands ----
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.98, 0.98, 2.9, 72).rotateX(Math.PI / 2),
        [0, 1.06, -1.1],
        tankSteel,
      );
      for (const z of [0.35, -2.55])
        k.mesh(
          "bed",
          new T.TorusGeometry(0.97, 0.035, 12, 72),
          [0, 1.06, z],
          tankSteel,
        );
      k.oval("bed", [0.3, 0.3, 0.1], [0, 1.06, 0.35], tankSteel);
      k.oval("bed", [0.3, 0.3, 0.08], [0, 1.06, -2.55], tankSteel);
      for (const z of [-0.4, -1.1, -1.8])
        k.mesh(
          "bed",
          new T.CylinderGeometry(1.0, 1.0, 0.2, 72).rotateX(Math.PI / 2),
          [0, 1.06, z],
          k.accent,
        );
      for (const z of [-0.53, -0.27, -1.23, -0.97, -1.93, -1.67])
        k.mesh(
          "bed",
          new T.TorusGeometry(0.995, 0.016, 8, 72),
          [0, 1.06, z],
          k.steel,
        );
      const rivet = new T.SphereGeometry(0.028, 8, 6);
      for (const z of [-0.4, -1.1, -1.8])
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2;
          k.mesh(
            "bed",
            rivet,
            [Math.cos(a) * 1.0, 1.06 + Math.sin(a) * 1.0, z + 0.13],
            k.steel,
          );
        }

      // ---- Tank crown: manway hatch, dome vents, walkway ----
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.2, 0.22, 0.18, 32),
        [0, 2.08, -0.75],
        tankSteel,
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.24, 0.24, 0.07, 32),
        [0, 2.2, -0.75],
        k.dark,
      );
      k.bar("bed", [-0.18, 2.26, -0.75], [0.18, 2.26, -0.75], 0.028, k.steel);
      for (const z of [-1.35, -1.55]) {
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.12, 0.13, 0.08, 24),
          [0, 2.0, z],
          k.dark,
        );
        k.oval("bed", [0.12, 0.1, 0.12], [0, 2.06, z], tankSteel);
      }
      k.oval("bed", [0.1, 0.08, 0.1], [0, 2.06, -2.3], tankSteel);
      k.panel("bed", [0.5, 0.05, 1.5], [0, 2.09, -1.5], k.dark, 0.015);
      for (const z of [-0.85, -1.45, -2.1])
        k.panel("bed", [0.4, 0.06, 0.08], [0, 2.05, z], k.steel, 0.015);

      // ---- Access ladder up the left tank flank with crown grab rails ----
      for (const z of [-1.3, -1.6])
        k.bar("bed", [1.19, 0.05, z], [1.19, 2.0, z], 0.028, k.steel);
      for (let i = 0; i < 7; i++) {
        const y = 0.2 + i * 0.27;
        k.bar("bed", [1.19, y, -1.6], [1.19, y, -1.3], 0.02, k.steel);
      }
      for (const y of [0.6, 1.2, 1.8])
        k.bar("bed", [0.6, y, -1.45], [1.19, y, -1.45], 0.02, k.steel);
      k.tube(
        "bed",
        [
          [1.19, 2.0, -1.3],
          [1.05, 2.2, -1.3],
          [0.7, 2.25, -1.3],
        ],
        0.025,
        k.steel,
        20,
      );
      k.tube(
        "bed",
        [
          [1.19, 2.0, -1.6],
          [1.05, 2.2, -1.6],
          [0.7, 2.25, -1.6],
        ],
        0.025,
        k.steel,
        20,
      );

      // ---- Side hose tubes with couplings and rear risers ----
      for (const side of sides) {
        for (const y of [0.52, 0.72]) {
          k.tube(
            "bed",
            [
              [side * 1.08, y, 0.3],
              [side * 1.08, y, -1.2],
              [side * 1.08, y, -2.4],
            ],
            0.065,
            tankSteel,
            24,
          );
          for (const z of [0.1, -1.1, -2.3])
            k.mesh(
              "bed",
              new T.TorusGeometry(0.07, 0.02, 8, 24),
              [side * 1.08, y, z],
              k.dark,
            );
          k.mesh(
            "bed",
            new T.CylinderGeometry(0.065, 0.065, 0.08, 20).rotateX(Math.PI / 2),
            [side * 1.08, y, 0.32],
            k.dark,
          );
        }
        k.tube(
          "bed",
          [
            [side * 1.08, 0.72, -2.4],
            [side * 1.02, 1.1, -2.62],
            [side * 0.7, 1.2, -2.76],
          ],
          0.06,
          tankSteel,
          20,
        );
      }

      // ---- Hazard diamonds: flammable + oxidizer pairs, both flanks ----
      for (const side of sides)
        for (const [zr, zw] of [
          [-0.63, -0.95],
          [-1.95, -2.27],
        ] as const) {
          k.panel("bed", [0.05, 0.3, 0.3], [side * 0.99, 1.15, zr], k.red, 0.012)
            .rotation.x = Math.PI / 4;
          k.panel("bed", [0.05, 0.3, 0.3], [side * 0.99, 1.15, zw], cream, 0.012)
            .rotation.x = Math.PI / 4;
          k.panel(
            "bed",
            [0.055, 0.12, 0.12],
            [side * 0.995, 1.12, zw],
            k.dark,
            0.008,
          ).rotation.x = Math.PI / 4;
        }

      // ---- Rear hose reel, discharge manifold, placards, work lamp ----
      k.panel("bed", [1.9, 1.5, 0.14], [0, 0.95, -2.72], k.dark, 0.04);
      for (const fx of [0.3, 0.9])
        k.panel("bed", [0.06, 0.8, 0.5], [fx, 1.0, -2.82], k.steel, 0.02);
      k.bar("bed", [0.3, 1.0, -2.82], [0.9, 1.0, -2.82], 0.05, k.steel);
      for (const fx of [0.36, 0.84])
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.32, 0.32, 0.05, 48).rotateZ(Math.PI / 2),
          [fx, 1.0, -2.82],
          k.steel,
        );
      for (const cx of [0.48, 0.57, 0.66])
        k.mesh(
          "bed",
          new T.TorusGeometry(0.24, 0.055, 12, 48).rotateY(Math.PI / 2),
          [cx, 1.0, -2.82],
          hose,
        );
      k.bar("bed", [0.93, 1.0, -2.82], [0.93, 1.22, -2.82], 0.025, k.dark);
      k.bar("bed", [0.93, 1.22, -2.82], [1.0, 1.22, -2.82], 0.025, k.dark);
      for (const px of [-0.45, -0.75]) {
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.07, 0.07, 1.1, 20),
          [px, 0.9, -2.82],
          tankSteel,
        );
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.1, 0.1, 0.08, 20),
          [px, 1.48, -2.82],
          k.dark,
        );
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.06, 0.06, 0.14, 16).rotateX(Math.PI / 2),
          [px, 0.5, -2.9],
          k.steel,
        );
      }
      k.bar("bed", [-0.75, 1.3, -2.82], [-0.45, 1.3, -2.82], 0.05, tankSteel);
      k.panel("bed", [0.3, 0.3, 0.05], [0, 1.52, -2.8], k.red, 0.012).rotation.z =
        Math.PI / 4;
      k.panel("bed", [0.3, 0.3, 0.05], [0, 1.1, -2.8], cream, 0.012).rotation.z =
        Math.PI / 4;
      k.lamp("bed", [0, 1.8, -2.78], 0.07, k.white, -1);
      for (const side of sides)
        k.panel(
          "bed",
          [0.12, 0.08, 0.05],
          [side * 0.85, 1.72, -2.78],
          k.red,
          0.015,
        );

      // ---- Front bumper: silver bar, tow eyes, fogs, plate ----
      k.panel("bumper-front", [2.5, 0.26, 0.34], [0, -0.11, 2.66], k.paint, 0.085);
      k.panel("bumper-front", [2.3, 0.05, 0.28], [0, 0.03, 2.66], k.dark, 0.015);
      for (const side of sides) {
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.032, 12, 32),
          [side * 0.75, -0.12, 2.845],
          k.steel,
        );
        k.lamp("bumper-front", [side * 0.4, -0.11, 2.84], 0.07);
      }
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.11, 2.845], k.white, 0.01);

      // ---- Rear bumper: step, lights, underride bar, flaps ----
      k.panel("bumper-rear", [2.3, 0.18, 0.4], [0, -0.14, -2.86], k.steel, 0.06);
      k.tailLights(-3.06, 0.0);
      k.bar("bumper-rear", [-1.0, -0.42, -3.0], [1.0, -0.42, -3.0], 0.05, k.dark);
      for (const side of sides)
        k.bar(
          "bumper-rear",
          [side * 1.0, -0.42, -3.0],
          [side * 1.0, -0.14, -2.86],
          0.04,
          k.dark,
        );
      for (let i = 0; i < 4; i++) {
        const x = -0.75 + i * 0.5;
        k.panel(
          "bumper-rear",
          [0.4, 0.08, 0.04],
          [x, -0.42, -3.03],
          i % 2 ? cream : k.red,
          0.012,
        );
      }
      for (const side of sides) {
        k.panel(
          "bumper-rear",
          [0.55, 0.45, 0.06],
          [side * 1.65, -0.5, -2.82],
          k.dark,
          0.03,
        );
        k.panel(
          "bumper-rear",
          [0.4, 0.07, 0.3],
          [side * 1.1, -0.28, -2.9],
          k.steel,
          0.02,
        );
      }
      k.bar("bumper-rear", [0, -0.3, -2.9], [0, -0.3, -3.12], 0.06, k.dark);

      // ---- Chassis dressing: fenders, boxes, air tank, shocks, pipes ----
      fenders(k, k.paint);
      for (const side of sides) {
        k.panel(
          "chassis-front",
          [0.5, 0.42, 0.9],
          [side * 0.9, -0.5, 0.6],
          tankSteel,
          0.06,
        );
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.06, 0.06, 0.06, 16),
          [side * 0.9, -0.26, 0.6],
          k.dark,
        );
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
          [side * 0.55, -0.5, -2.3],
          [side * 0.55, -0.5, -3.05],
          0.07,
          k.steel,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.5, -2.95],
          [side * 0.55, -0.5, -3.1],
          0.078,
          k.dark,
        );
      }
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.18, 0.18, 0.9, 32).rotateX(Math.PI / 2),
        [0, -0.55, 0.9],
        tankSteel,
      );
      for (const z of [1.15, 0.65])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.19, 0.02, 8, 32),
          [0, -0.55, z],
          k.dark,
        );
      k.bar("chassis-front", [0, -0.68, 0.1], [0, -0.68, 1.6], 0.06, k.steel);
      k.bar("chassis-rear", [0, -0.68, -0.1], [0, -0.68, -1.6], 0.06, k.steel);
      k.bar("chassis-rear", [-1.1, -0.5, -2.9], [1.1, -0.5, -2.9], 0.06, k.dark);

      // Bright hub caps over the kit hubs, per the concept's silver rims.
      const caps = [
        ["wheel-fl", 2.13, 1.65],
        ["wheel-fr", -2.13, 1.65],
        ["wheel-rl", 2.13, -1.65],
        ["wheel-rr", -2.13, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.38, 0.38, 0.05, 48).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.steel,
        );
        const dome = k.mesh(
          part,
          new T.SphereGeometry(0.09, 24, 16),
          [x + Math.sign(x) * 0.03, -0.85, z],
          k.steel,
        );
        dome.scale.x = 0.6;
      }
    },
  ),
  vehicle(
    "golf-cart",
    "Golf Cart",
    "Cream open golf cart with a canopy roof, bench seat, and a bag rack.",
    [15787724, 4095311, 7830914, 0.7, 5],
    (k) => {
      const white = finish(0xf8f5ee, 0.5, 0.05);
      const canvas = finish(0xcfc39f, 0.92, 0);
      const canvasDark = finish(0x8f8668, 0.92, 0);
      const mat = finish(0x2b2e30, 0.95, 0);

      // ---- Nose cowl (hood): rounded cowl, grille, round headlamps ----
      k.hull("hood", [
        [1.05, -0.12, 0.52, 1.02, 0.98],
        [2.15, -0.16, 0.42, 0.98, 0.92],
        [2.52, -0.16, 0.28, 0.8, 0.84],
      ]);
      k.oval("hood", [0.9, 0.2, 0.7], [0, 0.5, 1.58]);
      k.panel("hood", [1.5, 0.1, 0.9], [0, 0.56, 1.35], k.paint, 0.04);
      k.panel("hood", [0.72, 0.2, 0.08], [0, 0.02, 2.53], k.dark, 0.03);
      for (let i = 0; i < 3; i++)
        k.panel(
          "hood",
          [0.62, 0.025, 0.04],
          [0, -0.04 + i * 0.06, 2.58],
          k.steel,
          0.008,
        );
      for (const side of sides) {
        k.lamp("hood", [side * 0.58, 0.14, 2.5], 0.13);
        k.lamp("hood", [side * 0.92, -0.04, 2.42], 0.05, k.amber);
        k.bar(
          "hood",
          [side * 0.99, 0.1, 1.2],
          [side * 0.93, 0.08, 2.3],
          0.025,
          k.steel,
        );
        k.panel("hood", [0.06, 0.1, 0.5], [side * 1.0, 0.32, 1.6], k.accent, 0.02);
      }
      k.oval("hood", [0.12, 0.07, 0.04], [0, 0.32, 2.5], k.accent);

      // ---- Split windshield (hood): twin panes in a black frame ----
      k.bar("hood", [-0.95, 0.62, 1.62], [0.95, 0.62, 1.62], 0.045, k.dark);
      k.bar("hood", [-0.95, 1.52, 1.48], [0.95, 1.52, 1.48], 0.045, k.dark);
      k.bar("hood", [0, 0.62, 1.62], [0, 1.52, 1.48], 0.04, k.dark);
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.95, 0.62, 1.62],
          [side * 0.95, 1.52, 1.48],
          0.045,
          k.dark,
        );
        k.panel(
          "hood",
          [0.86, 0.82, 0.04],
          [side * 0.46, 1.07, 1.55],
          k.glass,
          0.015,
        ).rotation.x = -0.15;
        k.panel("hood", [0.1, 0.06, 0.06], [side * 0.95, 0.58, 1.62], k.dark, 0.02);
      }

      // ---- Floor (chassis-front): pan, rubber mat, grip studs ----
      k.panel("chassis-front", [1.9, 0.1, 2.6], [0, -0.14, 0.55], k.paint, 0.04);
      k.panel("chassis-front", [1.7, 0.05, 2.3], [0, -0.07, 0.5], mat, 0.015);
      k.panel("chassis-front", [1.78, 0.03, 0.08], [0, -0.06, 1.68], k.steel, 0.01);
      k.panel("chassis-front", [1.78, 0.03, 0.08], [0, -0.06, -0.68], k.steel, 0.01);
      const stud = new T.CylinderGeometry(0.022, 0.022, 0.035, 10);
      for (let ix = 0; ix < 7; ix++)
        for (let iz = 0; iz < 6; iz++)
          k.mesh(
            "chassis-front",
            stud,
            [-0.66 + ix * 0.22, -0.04, -0.45 + iz * 0.38],
            k.steel,
          );

      // ---- Bench seat: plinth, cushion and backrest with quilting ----
      k.panel("chassis-front", [1.7, 0.3, 0.82], [0, 0.12, -0.05], k.paint, 0.05);
      k.panel("chassis-front", [0.5, 0.18, 0.04], [0, 0.12, 0.37], mat, 0.015);
      k.panel("chassis-front", [0.12, 0.04, 0.05], [0, 0.14, 0.39], k.steel, 0.01);
      k.panel("chassis-front", [1.74, 0.24, 0.84], [0, 0.4, -0.05], k.accent, 0.09);
      k.bar("chassis-front", [-0.85, 0.5, 0.35], [0.85, 0.5, 0.35], 0.025, mat);
      k.bar("chassis-front", [-0.85, 0.5, -0.45], [0.85, 0.5, -0.45], 0.025, mat);
      for (const side of sides)
        k.bar(
          "chassis-front",
          [side * 0.85, 0.5, -0.45],
          [side * 0.85, 0.5, 0.35],
          0.025,
          mat,
        );
      for (let i = -2; i <= 2; i++) {
        const o = i * 0.22;
        k.bar(
          "chassis-front",
          [o - 0.35, 0.525, -0.4],
          [o + 0.35, 0.525, 0.3],
          0.012,
          mat,
        );
        k.bar(
          "chassis-front",
          [o - 0.35, 0.525, 0.3],
          [o + 0.35, 0.525, -0.4],
          0.012,
          mat,
        );
      }
      const button = new T.SphereGeometry(0.035, 12, 8);
      for (let ix = 0; ix < 5; ix++)
        for (let iz = 0; iz < 3; iz++) {
          const b = k.mesh(
            "chassis-front",
            button,
            [-0.6 + ix * 0.3, 0.53, -0.3 + iz * 0.25],
            mat,
          );
          b.scale.y = 0.55;
        }
      k.panel(
        "chassis-front",
        [1.74, 0.72, 0.24],
        [0, 0.86, -0.52],
        k.accent,
        0.09,
      ).rotation.x = -0.1;
      for (const y of [0.72, 0.98])
        k.bar("chassis-front", [-0.82, y, -0.395], [0.82, y, -0.395], 0.02, mat);
      for (let ix = 0; ix < 5; ix++)
        for (const y of [0.78, 1.0]) {
          const b = k.mesh(
            "chassis-front",
            button,
            [-0.6 + ix * 0.3, y, -0.4],
            mat,
          );
          b.scale.z = 0.55;
        }
      for (const side of sides)
        k.panel(
          "chassis-front",
          [0.18, 0.2, 0.7],
          [side * 0.78, 0.5, -0.05],
          k.accent,
          0.07,
        );

      // ---- Dash, pedals and steering (chassis-front) ----
      k.panel("chassis-front", [1.7, 0.3, 0.32], [0, 0.52, 1.28], k.paint, 0.06);
      k.panel("chassis-front", [1.7, 0.07, 0.36], [0, 0.7, 1.28], mat, 0.025);
      for (const side of sides) {
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.075, 0.075, 0.02, 24),
          [side * 0.32, 0.74, 1.28],
          mat,
        );
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.075, 0.015, 10, 32).rotateX(Math.PI / 2),
          [side * 0.32, 0.745, 1.28],
          k.steel,
        );
      }
      k.panel("chassis-front", [0.3, 0.02, 0.4], [-0.45, 0.75, 1.28], white, 0.005);
      k.panel("chassis-front", [0.1, 0.04, 0.06], [-0.45, 0.77, 1.42], k.steel, 0.01);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.07, 0.07, 0.03, 24).rotateX(Math.PI / 2),
        [0.55, 0.55, 1.11],
        white,
      );
      k.bar("chassis-front", [0.55, 0.55, 1.09], [0.58, 0.59, 1.09], 0.012, k.red);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.025, 0.025, 0.04, 12).rotateX(Math.PI / 2),
        [0.72, 0.5, 1.11],
        k.red,
      );
      for (const x of [0.4, 0.68])
        k.panel("chassis-front", [0.14, 0.04, 0.22], [x, 0.02, 1.32], mat, 0.01).rotation.x =
          0.5;
      k.bar("chassis-front", [0.55, 0.35, 1.2], [0.55, 0.82, 0.9], 0.045, k.steel);
      k.bar("chassis-front", [0.55, 0.3, 1.24], [0.55, 0.5, 1.14], 0.07, k.dark);
      k.mesh(
        "chassis-front",
        new T.TorusGeometry(0.2, 0.032, 12, 48),
        [0.55, 0.85, 0.87],
        k.dark,
      ).rotation.x = -0.55;
      k.bar("chassis-front", [0.37, 0.85, 0.87], [0.73, 0.85, 0.87], 0.018, k.steel);
      k.bar("chassis-front", [0.55, 0.85, 0.87], [0.55, 0.68, 0.97], 0.018, k.steel);
      k.bar(
        "chassis-front",
        [0.55, 0.819, 0.819],
        [0.55, 0.881, 0.921],
        0.05,
        k.dark,
      );

      // ---- Canopy (roof): white top on four cream posts ----
      k.panel("roof", [2.14, 0.13, 3.42], [0, 2.36, -0.15], white, 0.06);
      k.panel("roof", [1.9, 0.04, 3.1], [0, 2.28, -0.15], k.paint, 0.015);
      for (const side of sides) {
        k.bar(
          "roof",
          [side * 0.85, 0.45, 1.62],
          [side * 1.0, 2.32, 1.5],
          0.055,
          k.paint,
        );
        k.bar(
          "roof",
          [side * 0.9, 0.3, -1.9],
          [side * 1.0, 2.32, -1.8],
          0.055,
          k.paint,
        );
        k.bar(
          "roof",
          [side * 1.0, 2.32, 1.5],
          [side * 1.0, 2.32, -1.8],
          0.05,
          k.paint,
        );
        k.panel("roof", [0.14, 0.14, 0.14], [side * 0.85, 0.5, 1.62], k.paint, 0.03);
        k.panel("roof", [0.14, 0.14, 0.14], [side * 0.9, 0.5, -1.9], k.paint, 0.03);
      }
      k.bar("roof", [-1.0, 2.32, 1.5], [1.0, 2.32, 1.5], 0.05, k.paint);
      k.bar("roof", [-1.0, 2.32, -1.8], [1.0, 2.32, -1.8], 0.05, k.paint);
      for (const z of [0.9, -0.15, -1.2])
        k.bar("roof", [-1.0, 2.3, z], [1.0, 2.3, z], 0.03, k.paint);
      k.bar("roof", [-1.07, 2.36, 1.56], [1.07, 2.36, 1.56], 0.03, k.paint);
      k.bar("roof", [-1.07, 2.36, -1.86], [1.07, 2.36, -1.86], 0.03, k.paint);
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.07, 0.09, 0.05, 24),
        [0, 2.25, -0.15],
        k.dark,
      );
      k.oval("roof", [0.055, 0.03, 0.055], [0, 2.23, -0.15], k.white);

      // ---- Side pods (doors): body, rails, steps, reflectors ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [-1.35, -0.15],
            [1.45, -0.15],
            [1.3, 0.32],
            [-1.2, 0.38],
          ],
          0.16,
          side * 1.0,
          k.paint,
          0.04,
        );
        k.panel(d, [0.05, 0.1, 2.3], [side * 1.11, 0.12, 0.0], k.accent, 0.02);
        k.tube(
          d,
          [
            [side * 1.1, 0.4, -1.2],
            [side * 1.1, 0.42, 0],
            [side * 1.1, 0.36, 1.3],
          ],
          0.04,
          k.dark,
          24,
        );
        k.bar(d, [side * 1.08, 0.62, -1.15], [side * 1.08, 0.62, 1.15], 0.035, k.dark);
        for (const z of [-1.1, 0.0, 1.1])
          k.bar(
            d,
            [side * 1.08, 0.38, z],
            [side * 1.08, 0.62, z],
            0.028,
            k.dark,
          );
        for (const z of [-0.55, 0.55])
          k.panel(d, [0.12, 0.07, 0.35], [side * 1.08, 0.67, z], k.accent, 0.03);
        k.bar(d, [side * 1.05, 0.4, 1.05], [side * 1.05, 0.85, 1.05], 0.03, k.dark);
        k.panel(d, [0.42, 0.07, 0.6], [side * 1.18, -0.4, 0.35], mat, 0.02);
        for (let i = 0; i < 4; i++)
          k.bar(
            d,
            [side * 1.0, -0.36, 0.12 + i * 0.15],
            [side * 1.36, -0.36, 0.12 + i * 0.15],
            0.015,
            k.steel,
          );
        for (const z of [0.15, 0.55])
          k.bar(
            d,
            [side * 1.0, -0.42, z],
            [side * 0.95, -0.15, z],
            0.025,
            k.dark,
          );
        k.panel(d, [0.05, 0.08, 0.14], [side * 1.11, 0.05, 1.3], k.amber, 0.012);
        k.panel(d, [0.05, 0.08, 0.14], [side * 1.11, 0.05, -1.25], k.red, 0.012);
      }

      // ---- Rear cowl + bag rack (bed): frame, bags, clubs, bucket ----
      k.hull("bed", [
        [-2.55, -0.15, 0.45, 1.0, 0.95],
        [-0.7, -0.15, 0.55, 1.05, 1.0],
      ]);
      k.panel("bed", [1.85, 0.1, 1.0], [0, 0.52, -1.8], mat, 0.03);
      for (let i = 0; i < 5; i++)
        k.bar("bed", [-0.88, 0.58, -1.4 - i * 0.2], [0.88, 0.58, -1.4 - i * 0.2], 0.02, k.steel);
      for (const side of sides) {
        for (const z of [-1.35, -2.25])
          k.bar(
            "bed",
            [side * 0.88, 0.57, z],
            [side * 0.88, 1.15, z],
            0.045,
            k.paint,
          );
        k.bar("bed", [side * 0.88, 1.15, -1.35], [side * 0.88, 1.15, -2.25], 0.045, k.paint);
        k.bar("bed", [side * 0.88, 0.85, -1.35], [side * 0.88, 0.85, -2.25], 0.03, k.paint);
      }
      k.bar("bed", [-0.88, 1.15, -1.35], [0.88, 1.15, -1.35], 0.045, k.paint);
      k.bar("bed", [-0.88, 1.15, -2.25], [0.88, 1.15, -2.25], 0.045, k.paint);
      k.bar("bed", [-0.88, 0.85, -2.25], [0.88, 0.85, -2.25], 0.03, k.paint);
      k.panel("bed", [0.06, 0.5, 0.7], [0, 0.9, -1.8], mat, 0.02);
      for (const side of sides) {
        const bx = side * 0.46;
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.23, 0.29, 1.0, 36),
          [bx, 1.05, -1.8],
          canvas,
        );
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.25, 0.24, 0.2, 36),
          [bx, 1.52, -1.8],
          canvasDark,
        );
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.19, 0.19, 0.06, 24),
          [bx, 1.6, -1.8],
          mat,
        );
        k.mesh(
          "bed",
          new T.TorusGeometry(0.28, 0.035, 12, 40).rotateX(Math.PI / 2),
          [bx, 0.6, -1.8],
          mat,
        );
        k.panel("bed", [0.34, 0.42, 0.14], [bx, 0.95, -2.1], canvasDark, 0.05);
        k.bar("bed", [bx, 0.8, -2.18], [bx, 1.1, -2.18], 0.015, k.steel);
        k.panel("bed", [0.16, 0.1, 0.03], [bx, 1.18, -2.02], white, 0.01);
        for (const sx of [-1, 1])
          k.bar(
            "bed",
            [bx + sx * 0.27, 0.6, -1.8],
            [bx + sx * 0.24, 1.45, -1.8],
            0.02,
            mat,
          );
        const fans: Array<[number, number, number]> = [
          [-0.1, 0.06, 2.12],
          [-0.05, -0.04, 2.02],
          [0, 0.08, 2.16],
          [0.05, -0.06, 2.0],
          [0.1, 0.02, 2.08],
        ];
        fans.forEach(([dx, dz, h], i) => {
          k.bar(
            "bed",
            [bx + dx * 0.3, 1.4, -1.8 + dz * 0.3],
            [bx + dx, h, -1.8 + dz],
            0.018,
            k.steel,
          );
          if (i < 2)
            k.oval("bed", [0.075, 0.06, 0.1], [bx + dx, h + 0.03, -1.8 + dz], k.dark);
          else
            k.panel(
              "bed",
              [0.05, 0.1, 0.035],
              [bx + dx, h + 0.02, -1.8 + dz],
              k.steel,
              0.012,
            ).rotation.z = 0.3;
        });
      }
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.13, 0.11, 0.22, 24),
        [0, 0.68, -1.35],
        white,
      );
      const ball = new T.SphereGeometry(0.036, 16, 12);
      for (const [x, z] of [[-0.05, -1.35], [0.05, -1.35], [0, -1.28]] as const)
        k.mesh("bed", ball, [x, 0.8, z], white);
      k.panel("bed", [0.3, 0.3, 0.035], [0.3, 0.98, -2.28], white, 0.015);
      k.panel("bed", [0.3, 0.06, 0.04], [0.3, 1.05, -2.28], k.accent, 0.01);
      k.panel("bed", [0.3, 0.04, 0.12], [0.3, 1.16, -2.25], white, 0.015);
      // Rear face: tail panel, plate, reflectors.
      k.panel("bed", [1.6, 0.28, 0.08], [0, 0.05, -2.56], k.dark, 0.03);
      k.panel("bed", [0.34, 0.12, 0.03], [0, 0.05, -2.61], white, 0.01);
      for (const side of sides)
        k.panel("bed", [0.12, 0.08, 0.03], [side * 0.68, 0.05, -2.6], k.red, 0.01);

      // ---- Front bumper: black tube guard, loops, pad ----
      k.tube(
        "bumper-front",
        [
          [-1.0, -0.12, 2.72],
          [0, -0.16, 2.86],
          [1.0, -0.12, 2.72],
        ],
        0.07,
        k.dark,
        24,
      );
      k.bar("bumper-front", [-1.0, -0.32, 2.66], [1.0, -0.32, 2.66], 0.05, k.dark);
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.7, -0.32, 2.66],
          [side * 0.72, -0.13, 2.79],
          0.045,
          k.dark,
        );
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.028, 12, 32),
          [side * 0.45, -0.32, 2.68],
          k.dark,
        );
        k.bar(
          "bumper-front",
          [side * 0.6, -0.2, 2.4],
          [side * 0.6, -0.2, 2.7],
          0.05,
          k.dark,
        );
      }
      k.panel("bumper-front", [1.7, 0.1, 0.1], [0, -0.12, 2.78], mat, 0.03);

      // ---- Rear bumper: step, lights, flaps ----
      k.panel("bumper-rear", [2.0, 0.14, 0.42], [0, -0.18, -2.72], k.steel, 0.05);
      k.tailLights(-2.95, 0.05);
      for (const side of sides) {
        k.panel(
          "bumper-rear",
          [0.55, 0.45, 0.06],
          [side * 1.65, -0.45, -2.72],
          k.dark,
          0.03,
        );
        k.panel(
          "bumper-rear",
          [0.4, 0.06, 0.02],
          [side * 1.65, -0.35, -2.76],
          white,
          0.008,
        );
        k.bar(
          "bumper-rear",
          [side * 0.8, -0.2, -2.5],
          [side * 0.8, -0.2, -2.7],
          0.05,
          k.dark,
        );
      }

      // ---- Chassis dressing: fenders, shocks, battery, motor ----
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
        k.bar(
          "chassis-front",
          [side * 0.95, -0.2, -1.2],
          [side * 0.95, -0.2, 1.4],
          0.05,
          k.steel,
        );
      }
      k.bar("chassis-front", [-0.6, -0.55, 1.65], [0.6, -0.55, 1.65], 0.06, k.steel);
      k.panel("chassis-front", [1.2, 0.08, 0.6], [0, -0.5, 2.0], k.steel, 0.02);
      k.panel("chassis-front", [1.2, 0.35, 0.7], [0, -0.28, -0.1], k.dark, 0.05);
      k.panel("chassis-front", [1.24, 0.06, 0.74], [0, -0.09, -0.1], mat, 0.02);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.035, 0.035, 0.08, 12),
        [0.4, -0.03, -0.2],
        k.red,
      );
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.035, 0.035, 0.08, 12),
        [0.5, -0.03, -0.2],
        k.steel,
      );
      k.tube(
        "chassis-front",
        [
          [0.45, -0.1, -0.4],
          [0.5, -0.4, -0.9],
          [0.3, -0.55, -1.4],
        ],
        0.03,
        k.red,
        24,
      );
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.22, 0.22, 0.7, 32).rotateZ(Math.PI / 2),
        [0, -0.55, -1.65],
        k.dark,
      );
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.12, 0.12, 0.74, 24).rotateZ(Math.PI / 2),
        [0, -0.55, -1.65],
        k.steel,
      );
      for (let i = 0; i < 4; i++)
        k.panel(
          "chassis-rear",
          [0.5, 0.04, 0.08],
          [0, -0.38, -1.85 + i * 0.13],
          k.dark,
          0.01,
        );
      k.panel("chassis-rear", [1.4, 0.08, 0.5], [0, -0.5, -2.2], k.steel, 0.02);
      k.bar("chassis-rear", [-1.1, -0.5, -2.9], [1.1, -0.5, -2.9], 0.06, k.dark);

      // Dark hub caps over the kit hubs.
      const caps = [
        ["wheel-fl", 2.02, 1.65],
        ["wheel-fr", -2.02, 1.65],
        ["wheel-rl", 2.02, -1.65],
        ["wheel-rr", -2.02, -1.65],
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
    "bubble-tub",
    "Bubble Tub",
    "Clawfoot bathtub racer full of foam, with a showerhead spoiler and brass feet.",
    [15922679, 4175574, 11570495, 0.8, 6],
    (k) => {
      const brass = gold();
      const foam = finish(0xf6fbff, 0.28, 0.05);
      const foamBlue = finish(0xd9ecff, 0.3, 0.05);
      const matRed = finish(0xc22430, 0.8, 0);
      const stripeWhite = finish(0xf4f1e6, 0.7, 0);
      const nozzleDark = finish(0x3a4148, 0.5, 0.4);

      // ---- Nose (hood): front half of the porcelain tub, rolled rim, faucets ----
      k.hull("hood", [
        [0.3, -0.02, 0.85, 1.0, 0.98],
        [1.45, 0.0, 0.92, 1.05, 1.0],
        [2.25, 0.12, 0.92, 0.82, 0.78],
      ]);
      k.oval("hood", [0.88, 0.56, 0.58], [0, 0.5, 2.0]);
      k.tube(
        "hood",
        [
          [-1.0, 1.0, 0.6],
          [-1.02, 1.02, 1.5],
          [-0.7, 1.04, 2.15],
          [0, 1.05, 2.32],
          [0.7, 1.04, 2.15],
          [1.02, 1.02, 1.5],
          [1.0, 1.0, 0.6],
        ],
        0.095,
        k.paint,
      );
      k.panel("hood", [1.7, 0.12, 1.5], [0, 0.62, 1.35], foamBlue, 0.05);
      // Brass faucet set on the front rim: center spout + cross-handle taps.
      k.bar("hood", [0, 1.0, 2.05], [0, 1.3, 2.05], 0.06, brass);
      k.tube(
        "hood",
        [
          [0, 1.3, 2.05],
          [0, 1.38, 1.85],
          [0, 1.28, 1.7],
        ],
        0.05,
        brass,
      );
      k.oval("hood", [0.06, 0.08, 0.06], [0, 1.24, 1.7], brass);
      k.oval("hood", [0.1, 0.06, 0.1], [0, 1.03, 2.05], brass);
      for (const x of [-0.35, 0.35]) {
        k.bar("hood", [x, 1.0, 2.1], [x, 1.15, 2.1], 0.04, brass);
        k.bar("hood", [x - 0.09, 1.17, 2.1], [x + 0.09, 1.17, 2.1], 0.025, brass);
        k.bar("hood", [x, 1.17, 2.01], [x, 1.17, 2.19], 0.025, brass);
      }
      // Foam spilling over the nose.
      k.oval("hood", [0.2, 0.18, 0.2], [-0.45, 1.05, 1.8], foam);
      k.oval("hood", [0.22, 0.2, 0.22], [0.4, 1.06, 1.9], foamBlue);
      k.oval("hood", [0.14, 0.13, 0.14], [0.0, 1.12, 2.15], foam);
      k.oval("hood", [0.11, 0.11, 0.11], [-0.75, 0.9, 1.5], foamBlue);

      // ---- Foam pile (roof): tub overflowing with bath bubbles ----
      const foamPile: Array<[number, number, number, number]> = [
        [-0.55, 1.02, 1.55, 0.22],
        [0.0, 1.0, 1.7, 0.24],
        [0.55, 1.02, 1.5, 0.22],
        [-0.7, 1.0, 0.9, 0.23],
        [-0.2, 1.05, 1.05, 0.25],
        [0.35, 1.02, 0.95, 0.23],
        [0.72, 1.0, 0.75, 0.2],
        [-0.45, 1.0, 0.35, 0.24],
        [0.1, 1.06, 0.35, 0.26],
        [0.62, 1.0, 0.1, 0.22],
        [-0.68, 1.0, -0.3, 0.22],
        [-0.15, 1.02, -0.3, 0.24],
        [0.4, 1.0, -0.35, 0.23],
        [-0.5, 1.0, -0.95, 0.23],
        [0.05, 1.04, -0.95, 0.25],
        [0.58, 1.0, -0.9, 0.22],
        [-0.3, 1.0, -1.55, 0.23],
        [0.3, 1.02, -1.6, 0.24],
        [-0.3, 1.3, 1.25, 0.2],
        [0.25, 1.32, 1.1, 0.21],
        [-0.1, 1.32, 0.5, 0.22],
        [0.3, 1.3, -0.05, 0.2],
        [-0.35, 1.3, -0.6, 0.2],
        [0.15, 1.32, -1.2, 0.21],
        [0.0, 1.55, 0.9, 0.17],
        [-0.15, 1.56, -0.2, 0.18],
        [0.1, 1.54, -0.85, 0.16],
      ];
      foamPile.forEach(([x, y, z, r], i) =>
        k.oval("roof", [r, r, r], [x, y, z], i % 2 ? foamBlue : foam),
      );

      // ---- Flanks (doors): tub side walls, rim, bath-mat skirts ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [1.95, 0.02],
            [1.95, 0.95],
            [-1.95, 0.95],
            [-1.95, 0.02],
          ],
          0.12,
          side * 1.0,
        );
        k.oval(d, [0.13, 0.42, 1.65], [side * 1.02, 0.62, 0]);
        k.tube(
          d,
          [
            [side * 1.0, 1.0, 2.0],
            [side * 1.04, 1.04, 0],
            [side * 1.0, 1.0, -2.0],
          ],
          0.095,
          k.paint,
        );
        // Striped bath-mat side skirt.
        k.panel(d, [0.07, 0.52, 1.7], [side * 1.1, 0.05, 0], matRed, 0.02);
        for (let i = 0; i < 5; i++)
          k.panel(
            d,
            [0.085, 0.07, 1.7],
            [side * 1.1, -0.12 + i * 0.11, 0],
            stripeWhite,
            0.015,
          );
      }
      // Hanging loofah on the left flank.
      k.bar("door-left", [1.0, 1.0, -0.9], [1.12, 0.62, -0.9], 0.015, k.dark);
      for (const [dx, dy, dz, r] of [
        [0, 0, 0, 0.11],
        [0.08, 0.05, 0.04, 0.08],
        [-0.06, 0.06, -0.05, 0.075],
        [0.04, -0.07, -0.06, 0.08],
        [-0.05, -0.05, 0.07, 0.075],
      ] as const)
        k.oval(
          "door-left",
          [r, r, r],
          [1.14 + dx, 0.5 + dy, -0.9 + dz],
          k.accent,
        );
      // Towel ring + towel on the right flank.
      k.mesh(
        "door-right",
        new T.TorusGeometry(0.12, 0.025, 12, 32),
        [-1.16, 0.78, 0.6],
        brass,
      ).rotation.y = Math.PI / 2;
      k.panel("door-right", [0.05, 0.36, 0.3], [-1.16, 0.5, 0.6], stripeWhite, 0.02);
      k.panel("door-right", [0.06, 0.06, 0.3], [-1.16, 0.62, 0.6], matRed, 0.01);

      // ---- Tail (bed): rear tub + chrome showerhead spoiler on a riser ----
      k.hull("bed", [
        [-2.25, 0.12, 0.92, 0.82, 0.78],
        [-1.45, 0.0, 0.92, 1.05, 1.0],
        [-0.3, -0.02, 0.85, 1.0, 0.98],
      ]);
      k.oval("bed", [0.88, 0.56, 0.58], [0, 0.5, -2.0]);
      k.tube(
        "bed",
        [
          [1.0, 1.0, -0.6],
          [1.02, 1.02, -1.5],
          [0.7, 1.04, -2.15],
          [0, 1.05, -2.32],
          [-0.7, 1.04, -2.15],
          [-1.02, 1.02, -1.5],
          [-1.0, 1.0, -0.6],
        ],
        0.095,
        k.paint,
      );
      k.panel("bed", [1.7, 0.12, 1.5], [0, 0.62, -1.35], foamBlue, 0.05);
      // Riser pipe, overhead arm, and rain-shower head.
      k.bar("bed", [0.55, 0.9, -2.15], [0.55, 2.45, -2.15], 0.06, k.steel);
      k.tube(
        "bed",
        [
          [0.55, 2.45, -2.15],
          [0.55, 2.55, -1.9],
          [0.55, 2.5, -1.55],
        ],
        0.055,
        k.steel,
      );
      k.bar("bed", [0.55, 2.5, -1.55], [0.55, 2.3, -1.55], 0.05, k.steel);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.34, 0.38, 0.1, 40),
        [0.55, 2.22, -1.55],
        k.steel,
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.3, 0.3, 0.04, 32),
        [0.55, 2.16, -1.55],
        nozzleDark,
      );
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        k.oval(
          "bed",
          [0.025, 0.02, 0.025],
          [0.55 + Math.cos(a) * 0.19, 2.13, -1.55 + Math.sin(a) * 0.19],
          k.dark,
        );
      }
      // Handheld wand clipped to the right flank + flexible hose.
      k.bar("bed", [1.28, 0.75, -1.6], [1.28, 1.15, -1.6], 0.045, k.steel);
      k.oval("bed", [0.07, 0.14, 0.09], [1.28, 1.24, -1.6], k.steel);
      k.tube(
        "bed",
        [
          [0.55, 0.95, -2.2],
          [1.2, 0.6, -2.0],
          [1.3, 0.5, -1.2],
          [1.28, 0.75, -1.6],
        ],
        0.035,
        k.steel,
      );
      // Brass mixer valves at the riser base.
      for (const x of [0.2, 0.9]) {
        k.bar("bed", [x, 0.9, -2.2], [x, 1.05, -2.2], 0.04, brass);
        k.bar("bed", [x - 0.09, 1.07, -2.2], [x + 0.09, 1.07, -2.2], 0.025, brass);
        k.bar("bed", [x, 1.07, -2.29], [x, 1.07, -2.11], 0.025, brass);
      }
      k.oval("bed", [0.2, 0.18, 0.2], [-0.5, 1.05, -1.85], foam);
      k.oval("bed", [0.15, 0.14, 0.15], [0.45, 1.08, -2.0], foamBlue);
      k.oval("bed", [0.11, 0.11, 0.11], [0.8, 0.9, -1.7], foam);
      for (const side of sides)
        k.lamp("bed", [side * 0.7, 0.35, -2.42], 0.07, k.red, -1);

      // ---- Bumpers: tubular chrome loops with white grips ----
      for (const part of ["bumper-front", "bumper-rear"] as const) {
        const z = part === "bumper-front" ? 2.75 : -2.75;
        const facing = part === "bumper-front" ? 1 : -1;
        for (const y of [-0.05, 0.3]) {
          k.bar(part, [-0.9, y, z], [0.9, y, z], 0.055, k.steel);
          k.bar(part, [-0.35, y, z], [0.35, y, z], 0.068, stripeWhite);
        }
        for (const side of sides) {
          k.bar(
            part,
            [side * 0.9, -0.05, z],
            [side * 0.9, 0.3, z],
            0.055,
            k.steel,
          );
          k.bar(
            part,
            [side * 0.9, 0.1, z],
            [side * 0.9, 0.1, z - facing * 0.3],
            0.05,
            k.steel,
          );
        }
      }
      for (const side of sides)
        k.lamp("bumper-front", [side * 0.55, 0.12, 2.82], 0.07);
      k.tailLights(-2.82, 0.12);

      // ---- Chassis dress: tub supports, brass claw feet, shocks, pipes ----
      k.panel("chassis-front", [1.8, 0.15, 1.6], [0, -0.05, 1.2], k.dark, 0.04);
      k.panel("chassis-rear", [1.8, 0.15, 1.6], [0, -0.05, -1.2], k.dark, 0.04);
      const feet = [
        ["chassis-front", 1.5],
        ["chassis-rear", -1.5],
      ] as const;
      for (const [part, z] of feet)
        for (const side of sides) {
          const x = side * 0.95;
          k.tube(
            part,
            [
              [x, 0.15, z],
              [x * 1.02, -0.15, z],
              [x * 1.05, -0.35, z],
            ],
            0.09,
            brass,
          );
          k.oval(part, [0.09, 0.09, 0.09], [x * 1.05, -0.36, z], brass);
          k.oval(part, [0.13, 0.09, 0.16], [x * 1.05, -0.45, z + 0.03], brass);
          for (const tx of [-0.07, 0, 0.07])
            k.oval(
              part,
              [0.035, 0.035, 0.05],
              [x * 1.05 + tx, -0.47, z + 0.16],
              brass,
            );
        }
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          brass,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          brass,
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
      }
      k.panel("chassis-front", [1.6, 0.1, 0.5], [0, -0.48, 2.3], k.steel, 0.03);

      // Brass hub caps over the kit hubs.
      const caps = [
        ["wheel-fl", 2.08, 1.65],
        ["wheel-fr", -2.08, 1.65],
        ["wheel-rl", 2.08, -1.65],
        ["wheel-rr", -2.08, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          brass,
        );
        k.mesh(
          part,
          new T.TorusGeometry(0.3, 0.03, 12, 48).rotateY(Math.PI / 2),
          [x, -0.85, z],
          brass,
        );
      }
    },
  ),
  vehicle(
    "pillow-fighter",
    "Pillow Fighter",
    "Four-poster bed on wheels with quilts, pillows, and a headboard wing.",
    [9067067, 8369881, 6050120, 0.8, 6],
    (k) => {
      const woodDark = finish(0x5a3a22, 0.58, 0.08);
      const quiltDark = finish(0x3d6ea5, 0.85, 0);
      const sheetMat = finish(0xf5f0e6, 0.85, 0);
      const pillowMat = finish(0xefe3cb, 0.9, 0);
      const skirtMat = finish(0xc9b183, 0.95, 0);
      const fringeMat = finish(0xe8d9b8, 0.95, 0);
      const brass = gold();
      const shadeMat = finish(0xe9d9b0, 0.7, 0);

      // Turned bedpost profile (radius, height), lathed around Y.
      const postPoints = [
        [0.17, 0],
        [0.17, 0.12],
        [0.11, 0.22],
        [0.1, 0.34],
        [0.14, 0.48],
        [0.14, 0.58],
        [0.09, 0.72],
        [0.09, 1.12],
        [0.13, 1.26],
        [0.13, 1.36],
        [0.08, 1.5],
        [0.1, 1.62],
        [0.13, 1.72],
        [0.1, 1.86],
        [0.11, 1.95],
      ].map(([r, y]) => new T.Vector2(r, y));

      // ---- Foot of the bed (hood): footboard, front posts, pillow nose ----
      k.panel("hood", [2.3, 0.5, 0.18], [0, 0.75, 1.82], k.paint, 0.06);
      k.panel("hood", [2.36, 0.12, 0.24], [0, 1.04, 1.82], k.paint, 0.05);
      for (const x of [-0.72, 0, 0.72])
        k.panel("hood", [0.5, 0.28, 0.05], [x, 0.72, 1.92], woodDark, 0.02);
      for (const side of sides) {
        k.mesh(
          "hood",
          new T.LatheGeometry(postPoints, 48),
          [side * 1.05, -0.1, 1.82],
          k.paint,
        );
        const collar = k.mesh(
          "hood",
          new T.TorusGeometry(0.085, 0.028, 10, 32),
          [side * 1.05, 1.4, 1.82],
          brass,
        );
        collar.rotation.x = Math.PI / 2;
        k.oval("hood", [0.13, 0.15, 0.13], [side * 1.05, 1.98, 1.82], k.paint);
        k.mesh(
          "hood",
          new T.SphereGeometry(0.045, 16, 12),
          [side * 1.05, 2.14, 1.82],
          brass,
        );
        k.lamp("hood", [side * 0.8, 0.72, 1.91], 0.12);
        k.oval("hood", [0.3, 0.35, 0.25], [side * 0.75, 1.15, 0.7], pillowMat);
      }
      // Stacked pillows forming the nose.
      k.panel("hood", [1.6, 0.3, 1.0], [0, 1.0, 1.25], pillowMat, 0.12);
      const midPillow = k.oval("hood", [0.6, 0.4, 0.3], [0, 1.3, 1.05], pillowMat);
      midPillow.rotation.x = 0.18;
      const topPillow = k.oval("hood", [0.42, 0.28, 0.24], [0, 1.56, 1.2], sheetMat);
      topPillow.rotation.x = -0.12;
      topPillow.rotation.y = 0.2;
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.04, 0.04, 0.05, 12).rotateX(Math.PI / 2),
        [0, 1.32, 1.34],
        skirtMat,
      );
      // Throw blanket folded over the footboard.
      k.panel("hood", [1.1, 0.07, 0.3], [-0.4, 1.13, 1.82], skirtMat, 0.03);
      k.panel("hood", [1.1, 0.42, 0.07], [-0.4, 0.9, 1.96], skirtMat, 0.03);
      k.panel("hood", [1.1, 0.07, 0.02], [-0.4, 0.82, 2.0], k.accent, 0.008);

      // ---- Quilted comforter (roof): blue quilt, stitching, sheets ----
      k.panel("roof", [2.3, 0.22, 2.7], [0, 0.95, -0.1], k.accent, 0.08);
      for (const c of [-0.85, -0.51, -0.17, 0.17, 0.51, 0.85]) {
        k.bar(
          "roof",
          [c - 0.23, 1.065, -1.35],
          [c + 0.23, 1.065, 1.15],
          0.012,
          quiltDark,
        );
        k.bar(
          "roof",
          [c + 0.23, 1.065, -1.35],
          [c - 0.23, 1.065, 1.15],
          0.012,
          quiltDark,
        );
      }
      for (const x of [-0.9, -0.54, -0.18, 0.18, 0.54, 0.9])
        for (const z of [-1.1, -0.5, 0.1, 0.7])
          k.mesh(
            "roof",
            new T.CylinderGeometry(0.035, 0.035, 0.035, 12),
            [x, 1.06, z],
            quiltDark,
          );
      // White sheet fold at the head end.
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.11, 0.11, 2.1, 24).rotateZ(Math.PI / 2),
        [0, 1.08, -1.2],
        sheetMat,
      );
      k.panel("roof", [2.15, 0.07, 0.55], [0, 1.06, -0.9], sheetMat, 0.03);
      // Throw blanket across the middle with striped bands.
      k.panel("roof", [2.36, 0.07, 0.65], [0, 1.09, 0.35], skirtMat, 0.03);
      k.panel("roof", [2.36, 0.075, 0.1], [0, 1.09, 0.15], k.accent, 0.01);
      k.panel("roof", [2.36, 0.075, 0.1], [0, 1.09, 0.55], quiltDark, 0.01);
      for (const side of sides)
        for (const z of [0.15, 0.35, 0.55])
          k.bar(
            "roof",
            [side * 1.18, 1.09, z],
            [side * 1.18, 0.96, z],
            0.014,
            fringeMat,
          );

      // ---- Bed sides (doors): wood rails, quilt drape, fringed skirts ----
      for (const side of sides) {
        const d = door(side);
        k.panel(d, [0.16, 0.42, 3.7], [side * 1.08, 0.55, -0.05], k.paint, 0.05);
        k.bar(
          d,
          [side * 1.08, 0.78, 1.8],
          [side * 1.08, 0.78, -1.9],
          0.05,
          woodDark,
        );
        for (const z of [-1.2, -0.05, 1.1])
          k.panel(d, [0.2, 0.14, 0.3], [side * 1.08, 0.3, z], woodDark, 0.03);
        k.panel(d, [0.1, 0.4, 2.5], [side * 1.16, 0.65, -0.1], k.accent, 0.04);
        for (let i = 0; i < 6; i++)
          k.mesh(
            d,
            new T.SphereGeometry(0.03, 12, 10),
            [side * 1.17, 0.55, -1.25 + i * 0.5],
            brass,
          );
        // Blanket skirt with stripes and fringe between the wheels.
        k.panel(d, [0.08, 0.5, 3.5], [side * 1.17, 0.05, -0.05], skirtMat, 0.02);
        k.panel(d, [0.02, 0.08, 3.3], [side * 1.215, 0.12, -0.05], k.accent, 0.008);
        k.panel(d, [0.02, 0.08, 3.3], [side * 1.215, -0.05, -0.05], fringeMat, 0.008);
        for (let i = 0; i < 14; i++) {
          const z = -1.65 + i * 0.246;
          k.bar(
            d,
            [side * 1.17, -0.2, z],
            [side * 1.17, -0.34, z],
            0.014,
            fringeMat,
          );
        }
      }

      // ---- Head of the bed (bed): headboard, wing, nightstand, lamp ----
      k.profile(
        "bed",
        [
          [-2.14, 0.4],
          [-2.14, 1.5],
          [-2.06, 1.74],
          [-1.96, 1.84],
          [-1.86, 1.74],
          [-1.78, 1.5],
          [-1.78, 0.4],
        ],
        2.2,
        0,
        k.paint,
        0.03,
      );
      // Carved shell motif on the headboard face.
      k.oval("bed", [0.28, 0.32, 0.1], [0, 1.5, -1.76], woodDark);
      for (let i = -2; i <= 2; i++)
        k.bar(
          "bed",
          [0, 1.32, -1.72],
          [i * 0.14, 1.68, -1.72],
          0.022,
          woodDark,
        );
      k.mesh("bed", new T.SphereGeometry(0.05, 16, 12), [0, 1.32, -1.7], brass);
      for (const side of sides) {
        k.mesh(
          "bed",
          new T.TorusGeometry(0.14, 0.035, 12, 40),
          [side * 0.8, 1.62, -1.76],
          woodDark,
        );
        k.mesh(
          "bed",
          new T.LatheGeometry(postPoints, 48),
          [side * 1.05, -0.1, -1.95],
          k.paint,
        );
        const rearCollar = k.mesh(
          "bed",
          new T.TorusGeometry(0.085, 0.028, 10, 32),
          [side * 1.05, 1.4, -1.95],
          brass,
        );
        rearCollar.rotation.x = Math.PI / 2;
        k.bar(
          "bed",
          [side * 1.05, 1.83, -1.95],
          [side * 1.05, 2.08, -1.95],
          0.055,
          k.paint,
        );
        k.oval("bed", [0.13, 0.15, 0.13], [side * 1.05, 2.16, -1.95], k.paint);
        k.mesh(
          "bed",
          new T.SphereGeometry(0.045, 16, 12),
          [side * 1.05, 2.32, -1.95],
          brass,
        );
        // Wing pylons rising from the headboard.
        k.bar(
          "bed",
          [side * 0.7, 1.84, -2.0],
          [side * 0.7, 2.44, -2.2],
          0.06,
          k.paint,
        );
        k.panel("bed", [0.08, 0.5, 0.85], [side * 1.24, 2.51, -2.2], k.paint, 0.03);
        k.oval("bed", [0.04, 0.14, 0.18], [side * 1.29, 2.51, -2.2], brass);
        k.lamp("bed", [side * 0.85, 0.32, -2.13], 0.1, k.red, -1);
      }
      // Rear wing spoiler over the headboard.
      k.panel("bed", [2.5, 0.09, 0.75], [0, 2.48, -2.2], k.paint, 0.04);
      k.panel("bed", [2.5, 0.04, 0.12], [0, 2.53, -2.0], woodDark, 0.015);
      k.panel("bed", [2.3, 0.07, 0.35], [0, 2.68, -2.35], k.paint, 0.03);
      for (const side of sides)
        k.bar(
          "bed",
          [side * 0.7, 2.5, -2.32],
          [side * 0.7, 2.66, -2.35],
          0.035,
          woodDark,
        );
      // Lower rear rail.
      k.panel("bed", [2.3, 0.3, 0.15], [0, 0.3, -2.05], k.paint, 0.05);
      // Nightstand with a brass bedside lamp on the rear deck.
      for (const dx of [-0.18, 0.18])
        for (const dz of [-0.18, 0.18])
          k.bar(
            "bed",
            [0.72 + dx, 1.06, -1.3 + dz],
            [0.72 + dx, 1.28, -1.3 + dz],
            0.03,
            k.paint,
          );
      k.panel("bed", [0.4, 0.2, 0.4], [0.72, 1.17, -1.3], k.paint, 0.03);
      k.panel("bed", [0.34, 0.12, 0.02], [0.72, 1.17, -1.09], woodDark, 0.008);
      k.mesh("bed", new T.SphereGeometry(0.025, 12, 10), [0.72, 1.17, -1.07], brass);
      k.panel("bed", [0.5, 0.07, 0.5], [0.72, 1.31, -1.3], woodDark, 0.03);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.1, 0.13, 0.06, 24),
        [0.72, 1.38, -1.3],
        brass,
      );
      k.bar("bed", [0.72, 1.4, -1.3], [0.72, 1.72, -1.3], 0.035, brass);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.15, 0.23, 0.3, 32, 1, true),
        [0.72, 1.82, -1.3],
        shadeMat,
      );
      const shadeTop = k.mesh(
        "bed",
        new T.TorusGeometry(0.15, 0.018, 10, 40),
        [0.72, 1.97, -1.3],
        brass,
      );
      shadeTop.rotation.x = Math.PI / 2;
      const shadeBottom = k.mesh(
        "bed",
        new T.TorusGeometry(0.23, 0.02, 10, 48),
        [0.72, 1.67, -1.3],
        brass,
      );
      shadeBottom.rotation.x = Math.PI / 2;
      k.oval("bed", [0.07, 0.09, 0.07], [0.72, 1.76, -1.3], k.white);
      k.bar("bed", [0.72, 1.97, -1.3], [0.72, 2.05, -1.3], 0.018, brass);
      k.mesh("bed", new T.SphereGeometry(0.035, 12, 10), [0.72, 2.07, -1.3], brass);
      k.bar("bed", [0.92, 1.68, -1.3], [0.92, 1.45, -1.3], 0.01, k.dark);
      k.mesh("bed", new T.SphereGeometry(0.025, 12, 10), [0.92, 1.43, -1.3], brass);

      // ---- Bumpers: wood beams with a pillow bolster up front ----
      k.panel("bumper-front", [2.4, 0.26, 0.3], [0, -0.05, 2.6], k.paint, 0.08);
      k.mesh(
        "bumper-front",
        new T.CylinderGeometry(0.14, 0.14, 2.2, 28).rotateZ(Math.PI / 2),
        [0, 0.2, 2.55],
        pillowMat,
      );
      for (const side of sides) {
        k.mesh(
          "bumper-front",
          new T.SphereGeometry(0.14, 20, 14),
          [side * 1.1, 0.2, 2.55],
          pillowMat,
        );
        k.bar(
          "bumper-front",
          [side * 0.7, -0.12, 2.0],
          [side * 0.7, -0.12, 2.5],
          0.07,
          k.dark,
        );
        k.oval("bumper-front", [0.1, 0.12, 0.1], [side * 1.2, -0.05, 2.6], brass);
        k.lamp("bumper-front", [side * 0.45, 0.0, 2.76], 0.09);
      }
      k.panel("bumper-rear", [2.4, 0.26, 0.3], [0, -0.05, -2.62], k.paint, 0.08);
      for (const side of sides) {
        k.bar(
          "bumper-rear",
          [side * 0.7, -0.12, -2.0],
          [side * 0.7, -0.12, -2.52],
          0.07,
          k.dark,
        );
        k.oval("bumper-rear", [0.1, 0.12, 0.1], [side * 1.2, -0.05, -2.62], brass);
      }
      k.tailLights(-2.79, -0.02);

      // ---- Chassis dress: mattress, slats, shocks, storage, pipes ----
      k.panel("chassis-front", [2.2, 0.35, 3.6], [0, 0.68, 0], sheetMat, 0.08);
      for (const z of [0.5, 1.0, 1.5, 2.0])
        k.bar("chassis-front", [-1.06, 0.45, z], [1.06, 0.45, z], 0.06, k.paint);
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          brass,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          brass,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.45, -1.9],
          [side * 0.55, -0.45, -2.7],
          0.07,
          k.steel,
        );
        k.panel(
          "chassis-rear",
          [0.34, 0.3, 0.06],
          [side * 0.9, -0.35, -2.55],
          k.dark,
          0.02,
        );
      }
      k.panel("chassis-front", [1.6, 0.08, 0.5], [0, -0.42, 2.3], k.steel, 0.03);
      k.panel("chassis-front", [1.4, 0.35, 1.2], [0, 0.05, 1.0], woodDark, 0.05);
      for (const side of sides)
        k.mesh(
          "chassis-front",
          new T.SphereGeometry(0.04, 12, 10),
          [side * 0.3, 0.05, 1.62],
          brass,
        );
      k.panel("chassis-rear", [1.4, 0.35, 1.2], [0, 0.05, -1.0], woodDark, 0.05);
      for (const side of sides)
        k.mesh(
          "chassis-rear",
          new T.SphereGeometry(0.04, 12, 10),
          [side * 0.3, 0.05, -0.38],
          brass,
        );
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.16, 0.16, 1.6, 24).rotateZ(Math.PI / 2),
        [0, 0.0, -2.2],
        k.accent,
      );
      for (const x of [-0.5, 0.5]) {
        const strap = k.mesh(
          "chassis-rear",
          new T.TorusGeometry(0.16, 0.025, 10, 32),
          [x, 0.0, -2.2],
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
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          brass,
        );
        k.mesh(
          part,
          new T.TorusGeometry(0.3, 0.03, 12, 48).rotateY(Math.PI / 2),
          [x, -0.85, z],
          brass,
        );
      }
    },
  ),
  vehicle(
    "burger-bruiser",
    "Burger Bruiser",
    "Giant sesame-bun cheeseburger with lettuce trim and a fry-box spoiler.",
    [14722136, 8176202, 7227951, 0.84, 5],
    (k) => {
      const cheese = finish(0xffc93c, 0.28, 0.05);
      const tomato = finish(0xd63a2f, 0.35, 0.05);
      const tomatoInner = finish(0xf2685a, 0.4, 0);
      const ketchup = finish(0xc1271b, 0.35, 0);
      const mustard = finish(0xffd21f, 0.35, 0);
      const fryGold = finish(0xf2b73a, 0.5, 0);
      const fryBox = finish(0xd62b20, 0.45, 0.05);
      const sesame = finish(0xfff3d6, 0.4, 0);
      const sausage = finish(0xc97b3d, 0.5, 0.05);

      const drip = (
        part: "hood" | "bed" | "door-left" | "door-right",
        x: number,
        z: number,
        len: number,
        r = 0.085,
      ) => {
        k.bar(part, [x, 0.8, z], [x, 0.8 - len, z], r, cheese);
        k.mesh(
          part,
          new T.SphereGeometry(r * 1.15, 16, 12),
          [x, 0.8 - len, z],
          cheese,
        );
      };

      // ---- Nose (hood): bottom-bun nose, patty, cheese, headlights ----
      k.hull("hood", [
        [-0.2, -0.1, 0.55, 1.12, 1.06],
        [1.3, -0.12, 0.52, 1.12, 1.06],
        [2.45, -0.18, 0.32, 0.95, 0.88],
      ]);
      k.oval("hood", [1.0, 0.32, 0.45], [0, 0.2, 2.15]);
      k.panel("hood", [2.18, 0.18, 1.65], [0, 0.6, 1.425], k.rim, 0.05);
      k.panel("hood", [2.15, 0.12, 1.65], [0, 0.78, 1.425], cheese, 0.04);
      for (const side of sides)
        k.lamp("hood", [side * 0.8, 0.25, 2.5], 0.13);
      const frontDrips: [number, number][] = [
        [-0.8, 0.35],
        [-0.4, 0.5],
        [0, 0.4],
        [0.4, 0.55],
        [0.8, 0.38],
      ];
      for (const [x, len] of frontDrips) drip("hood", x, 2.24, len);
      for (let i = 0; i < 7; i++) {
        const leaf = k.oval(
          "hood",
          [0.17, 0.07, 0.17],
          [-0.9 + i * 0.3, 0.42 + (i % 2) * 0.05, 2.32],
          k.accent,
        );
        leaf.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.35;
      }

      // ---- Crown (roof): sesame bun dome over a patty/cheese middle ----
      k.oval("roof", [1.45, 1.05, 1.9], [0, 1.8, 0.3]);
      k.panel("roof", [2.22, 0.18, 1.3], [0, 0.6, -0.05], k.rim, 0.05);
      k.panel("roof", [2.2, 0.12, 1.3], [0, 0.78, -0.05], cheese, 0.04);
      for (let i = 0; i < 30; i++) {
        const t = (i + 0.5) / 30;
        const phi = Math.acos(1 - t * 0.72);
        const theta = i * 2.39996;
        const px = 1.45 * Math.sin(phi) * Math.cos(theta);
        const py = 1.8 + 1.05 * Math.cos(phi);
        const pz = 0.3 + 1.9 * Math.sin(phi) * Math.sin(theta);
        const seed = k.oval("roof", [0.07, 0.035, 0.11], [px, py, pz], sesame);
        const n = new T.Vector3(
          px / (1.45 * 1.45),
          (py - 1.8) / (1.05 * 1.05),
          (pz - 0.3) / (1.9 * 1.9),
        ).normalize();
        seed.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), n);
      }

      // ---- Sides (doors): tomato slices, cheese drips, lettuce ruffle ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [-1.0, -0.08],
            [0.6, -0.08],
            [0.6, 0.5],
            [-1.0, 0.55],
          ],
          0.12,
          side * 1.13,
          k.paint,
          0.04,
        );
        k.mesh(
          d,
          new T.CylinderGeometry(0.62, 0.62, 0.14, 48).rotateZ(Math.PI / 2),
          [side * 1.2, 0.15, -0.1],
          tomato,
        );
        k.mesh(
          d,
          new T.CylinderGeometry(0.46, 0.46, 0.16, 48).rotateZ(Math.PI / 2),
          [side * 1.2, 0.15, -0.1],
          tomatoInner,
        );
        for (let s = 0; s < 6; s++) {
          const a = (s / 6) * Math.PI * 2 + 0.3;
          k.oval(
            d,
            [0.03, 0.045, 0.07],
            [side * 1.3, 0.15 + Math.sin(a) * 0.28, -0.1 + Math.cos(a) * 0.28],
            sesame,
          );
        }
        const sideDrips: [number, number][] = [
          [-0.55, 0.3],
          [-0.15, 0.42],
          [0.25, 0.24],
          [0.5, 0.36],
        ];
        for (const [z, len] of sideDrips) drip(d, side * 1.09, z, len);
        for (let i = 0; i < 6; i++) {
          const leaf = k.oval(
            d,
            [0.17, 0.07, 0.17],
            [side * 1.24, 0.42 + (i % 2) * 0.05, -0.85 + i * 0.28],
            k.accent,
          );
          leaf.rotation.x = (i % 2 === 0 ? 1 : -1) * 0.35;
        }
        k.panel(d, [0.07, 0.06, 0.3], [side * 1.24, 0.32, 0.45], k.steel, 0.02);
      }

      // ---- Tail (bed): bottom bun, cheese, lettuce, fry-box spoiler ----
      k.hull("bed", [
        [-2.55, -0.12, 0.5, 1.05, 1.0],
        [-1.2, -0.1, 0.55, 1.1, 1.05],
        [0.35, -0.1, 0.55, 1.12, 1.06],
      ]);
      k.oval("bed", [1.0, 0.3, 0.4], [0, 0.2, -2.2]);
      k.panel("bed", [2.18, 0.18, 1.45], [0, 0.6, -1.425], k.rim, 0.05);
      k.panel("bed", [2.15, 0.12, 1.45], [0, 0.78, -1.425], cheese, 0.04);
      const rearDrips: [number, number][] = [
        [-0.7, 0.32],
        [-0.25, 0.44],
        [0.25, 0.28],
        [0.7, 0.38],
      ];
      for (const [x, len] of rearDrips) drip("bed", x, -2.14, len);
      for (let i = 0; i < 5; i++) {
        const leaf = k.oval(
          "bed",
          [0.17, 0.07, 0.17],
          [-0.8 + i * 0.4, 0.42 + (i % 2) * 0.05, -2.42],
          k.accent,
        );
        leaf.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.35;
      }
      for (const side of sides)
        k.lamp("bed", [side * 0.85, 0.25, -2.56], 0.09, k.red, -1);
      // Fry carton on the rear deck with two rows of golden fries.
      k.panel("bed", [2.2, 0.08, 0.7], [0, 1.25, -2.15], fryBox, 0.02);
      k.panel("bed", [2.2, 0.5, 0.08], [0, 1.5, -1.83], fryBox, 0.02);
      k.panel("bed", [1.6, 0.45, 0.6], [0, 1.02, -2.15], fryBox, 0.04);
      k.panel("bed", [2.2, 0.78, 0.08], [0, 1.62, -2.47], fryBox, 0.02);
      for (const side of sides) {
        k.panel("bed", [0.08, 0.72, 0.7], [side * 1.06, 1.6, -2.15], fryBox, 0.02);
        k.bar("bed", [side * 0.6, 0.5, -2.15], [side * 0.6, 1.25, -2.15], 0.07, fryBox);
      }
      const fryHeights = [1.3, 1.45, 1.35, 1.5, 1.35, 1.45, 1.3];
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 7; i++) {
          const h = fryHeights[(i + row * 3) % 7];
          const fry = k.panel(
            "bed",
            [0.15, h, 0.15],
            [-0.9 + i * 0.3, 1.35 + h / 2 - 0.3, -2.02 - row * 0.26],
            fryGold,
            0.02,
          );
          fry.rotation.x = (row === 0 ? 1 : -1) * 0.12;
          fry.rotation.z = (i - 3 + row * 0.5) * 0.09;
        }
      }

      // ---- Bumpers: sausage bars with ketchup/mustard squiggles ----
      const squiggle = (
        part: "bumper-front" | "bumper-rear",
        z: number,
      ) => {
        k.bar(part, [-1.05, -0.05, z], [1.05, -0.05, z], 0.19, sausage);
        for (const side of sides)
          k.oval(part, [0.19, 0.19, 0.19], [side * 1.05, -0.05, z], sausage);
        for (const side of sides)
          k.bar(
            part,
            [side * 0.6, -0.05, z > 0 ? 2.45 : -2.45],
            [side * 0.6, -0.05, z],
            0.05,
            k.dark,
          );
        const zig = (phase: number): [number, number, number][] => {
          const pts: [number, number, number][] = [];
          for (let i = 0; i <= 12; i++) {
            const x = -0.9 + (i / 12) * 1.8;
            pts.push([x, 0.14, z + ((i + phase) % 2 === 0 ? 0.08 : -0.08)]);
          }
          return pts;
        };
        k.tube(part, zig(0), 0.045, ketchup, 64);
        k.tube(part, zig(1), 0.04, mustard, 64);
      };
      squiggle("bumper-front", 2.88);
      squiggle("bumper-rear", -2.88);
      k.mesh(
        "bumper-rear",
        new T.TorusGeometry(0.09, 0.03, 12, 32),
        [0, -0.3, -2.85],
        k.dark,
      );

      // ---- Chassis dress: bun fenders, cheese shocks, steps, pipes ----
      fenders(k, k.paint);
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          cheese,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          cheese,
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
      }
      k.panel("chassis-front", [1.6, 0.1, 0.5], [0, -0.48, 2.25], k.steel, 0.03);

      // Cheese hub caps over the kit hubs.
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
          cheese,
        );
    },
  ),
  vehicle(
    "lawn-mower",
    "Lawn Mower",
    "Ride-on mower with a cutting deck, grass catcher, and a sun canopy.",
    [5086797, 15254842, 4474956, 0.82, 6],
    (k) => {
      const vinyl = finish(0x3a4048, 0.85, 0);
      const vinylDark = finish(0x262b31, 0.9, 0);
      const canvas = finish(0xcfc09a, 0.92, 0);
      const canvasDark = finish(0x9a8f6e, 0.92, 0);
      const mat = finish(0x232629, 0.95, 0);
      const screen = finish(0x2e3336, 0.6, 0.4);

      // ---- Hood: tractor nose, grille, round headlamps, vents ----
      k.hull("hood", [
        [0.95, -0.05, 0.72, 0.78, 0.72],
        [2.05, -0.12, 0.58, 0.74, 0.68],
        [2.5, -0.14, 0.42, 0.62, 0.64],
      ]);
      k.oval("hood", [0.68, 0.22, 0.62], [0, 0.68, 1.55]);
      k.panel("hood", [0.95, 0.38, 0.1], [0, 0.02, 2.5], k.dark, 0.03);
      for (let i = 0; i < 4; i++)
        k.panel(
          "hood",
          [0.82, 0.03, 0.05],
          [0, -0.1 + i * 0.09, 2.56],
          k.steel,
          0.008,
        );
      for (const side of sides) {
        k.lamp("hood", [side * 0.66, 0.26, 2.44], 0.13);
        k.lamp("hood", [side * 0.6, -0.04, 2.55], 0.05, k.amber);
        for (let i = 0; i < 3; i++)
          k.panel(
            "hood",
            [0.04, 0.04, 0.5],
            [side * 0.76, 0.32 - i * 0.11, 1.55],
            k.dark,
            0.012,
          );
        k.panel("hood", [0.05, 0.1, 1.1], [side * 0.75, -0.04, 1.5], k.accent, 0.02);
      }
      for (let i = 0; i < 4; i++)
        k.panel(
          "hood",
          [0.5, 0.03, 0.09],
          [0, 0.86, 1.15 + i * 0.22],
          k.dark,
          0.01,
        );
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.06, 0.06, 0.06, 20),
        [0, 0.84, 1.05],
        k.dark,
      );
      k.panel("hood", [0.5, 0.06, 0.3], [0, 0.62, 0.98], k.dark, 0.02);

      // ---- Floor + tunnel (chassis-front) ----
      k.panel("chassis-front", [1.9, 0.1, 2.4], [0, -0.18, 0.5], k.paint, 0.04);
      k.panel("chassis-front", [0.72, 0.34, 1.7], [0, -0.02, 0.55], k.paint, 0.06);
      k.panel("chassis-front", [0.6, 0.05, 1.5], [0, 0.17, 0.55], mat, 0.015);
      for (let i = 0; i < 6; i++)
        k.bar(
          "chassis-front",
          [-0.28, 0.2, -0.1 + i * 0.25],
          [0.28, 0.2, -0.1 + i * 0.25],
          0.015,
          k.steel,
        );

      // ---- Dash tower + steering ----
      k.panel("chassis-front", [0.86, 0.52, 0.34], [0, 0.55, 1.02], k.paint, 0.07);
      k.panel("chassis-front", [0.7, 0.3, 0.06], [0, 0.62, 0.86], k.dark, 0.02);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.09, 0.09, 0.03, 24).rotateX(Math.PI / 2),
        [-0.18, 0.64, 0.83],
        k.white,
      );
      k.bar("chassis-front", [-0.18, 0.64, 0.81], [-0.14, 0.68, 0.81], 0.012, k.red);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.03, 0.03, 0.05, 12).rotateX(Math.PI / 2),
        [0.15, 0.6, 0.83],
        k.red,
      );
      k.panel("chassis-front", [0.86, 0.06, 0.36], [0, 0.83, 1.02], mat, 0.02);
      for (const x of [-0.32, 0.32])
        k.panel("chassis-front", [0.12, 0.05, 0.24], [x, 0.0, 1.15], mat, 0.01).rotation.x =
          0.5;
      k.bar("chassis-front", [0, 0.42, 1.0], [0, 0.92, 0.66], 0.045, k.steel);
      k.bar("chassis-front", [0, 0.35, 1.04], [0, 0.55, 0.95], 0.07, k.dark);
      k.mesh(
        "chassis-front",
        new T.TorusGeometry(0.21, 0.032, 12, 48),
        [0, 0.95, 0.63],
        k.dark,
      ).rotation.x = -0.55;
      k.bar("chassis-front", [-0.19, 0.95, 0.63], [0.19, 0.95, 0.63], 0.016, k.steel);
      k.bar("chassis-front", [0, 0.95, 0.63], [0, 0.77, 0.73], 0.016, k.steel);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.055, 0.055, 0.08, 20).rotateX(Math.PI / 2),
        [0, 0.95, 0.63],
        k.dark,
      ).rotation.x = -0.55;

      // ---- High-back seat ----
      k.panel("chassis-front", [0.95, 0.3, 0.95], [0, 0.0, -0.4], k.paint, 0.06);
      for (const side of sides)
        k.bar(
          "chassis-front",
          [side * 0.3, -0.12, -0.75],
          [side * 0.3, -0.12, -0.05],
          0.03,
          k.steel,
        );
      k.panel("chassis-front", [0.85, 0.22, 0.85], [0, 0.26, -0.4], vinyl, 0.08);
      for (let i = 0; i < 3; i++)
        k.bar(
          "chassis-front",
          [-0.38, 0.375, -0.68 + i * 0.28],
          [0.38, 0.375, -0.68 + i * 0.28],
          0.012,
          vinylDark,
        );
      k.panel("chassis-front", [0.85, 0.95, 0.22], [0, 0.78, -0.85], vinyl, 0.09).rotation.x =
        -0.12;
      for (const [y, z] of [[0.6, -0.715], [0.85, -0.745], [1.1, -0.78]] as const)
        k.bar("chassis-front", [-0.36, y, z], [0.36, y, z], 0.012, vinylDark);
      for (const side of sides)
        k.panel(
          "chassis-front",
          [0.12, 0.7, 0.2],
          [side * 0.42, 0.7, -0.82],
          vinyl,
          0.05,
        ).rotation.x = -0.12;
      k.panel(
        "chassis-front",
        [0.7, 0.8, 0.08],
        [0, 0.75, -1.0],
        k.paint,
        0.03,
      ).rotation.x = -0.12;
//---- Cutting deck, front half (yellow shell, housings, blades) ----
      k.hull(
        "chassis-front",
        [
          [-0.05, -0.7, -0.32, 1.2, 1.14],
          [0.95, -0.7, -0.32, 1.2, 1.14],
        ],
        k.accent,
      );
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.15, 0.15, 2.34, 24).rotateZ(Math.PI / 2),
        [0, -0.54, 0.95],
        k.accent,
      );
      for (const side of sides) {
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.42, 0.46, 0.3, 36),
          [side * 0.55, -0.24, 0.4],
          k.accent,
        );
        k.oval("chassis-front", [0.4, 0.1, 0.4], [side * 0.55, -0.08, 0.4], k.accent);
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.12, 0.12, 0.1, 20),
          [side * 0.55, -0.02, 0.4],
          k.dark,
        );
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.14, 0.14, 0.06, 24),
          [side * 0.55, 0.05, 0.4],
          k.steel,
        );
        k.tube(
          "chassis-front",
          [
            [side * 0.55, 0.02, 0.4],
            [side * 0.5, -0.12, 0.68],
            [side * 0.4, -0.16, 0.9],
          ],
          0.035,
          mat,
          16,
        );
        k.panel(
          "chassis-front",
          [0.72, 0.035, 0.13],
          [side * 0.55, -0.72, 0.4],
          k.steel,
          0.01,
        ).rotation.y = side * 0.5;
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.13, 0.13, 0.08, 20).rotateZ(Math.PI / 2),
          [side * 1.28, -0.66, 0.45],
          mat,
        );
        k.bar(
          "chassis-front",
          [side * 1.28, -0.6, 0.45],
          [side * 1.05, -0.4, 0.45],
          0.03,
          k.dark,
        );
        k.bar(
          "chassis-front",
          [side * 0.7, -0.3, 0.45],
          [side * 0.95, -0.42, 0.45],
          0.035,
          k.dark,
        );
      }
      k.panel("chassis-front", [0.5, 0.16, 0.6], [0, -0.28, 0.4], k.accent, 0.05);
      for (const side of sides)
        k.panel(
          "chassis-front",
          [0.07, 0.22, 0.92],
          [side * 1.19, -0.52, 0.45],
          k.accent,
          0.03,
        );
      for (const side of sides)
        k.panel(
          "chassis-front",
          [0.24, 0.42, 0.5],
          [side * 1.22, -0.5, 0.28],
          k.accent,
          0.06,
        );
      for (const side of sides)
        k.panel(
          "chassis-front",
          [0.5, 0.3, 0.7],
          [side * 0.57, 0.0, 0.4],
          k.accent,
          0.08,
        );
      for (let i = 0; i < 6; i++)
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.03, 0.03, 0.05, 10),
          [-0.9 + i * 0.36, -0.31, 0.88],
          k.dark,
        );

      // ---- Deck rear half + discharge chute (chassis-rear) ----
      k.hull(
        "chassis-rear",
        [
          [-0.95, -0.7, -0.32, 1.2, 1.14],
          [-0.05, -0.7, -0.32, 1.2, 1.14],
        ],
        k.accent,
      );
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.15, 0.15, 2.34, 24).rotateZ(Math.PI / 2),
        [0, -0.54, -0.95],
        k.accent,
      );
      k.panel("chassis-rear", [1.3, 0.18, 0.5], [0, -0.3, -0.5], k.accent, 0.05);
      for (const side of sides)
        k.panel(
          "chassis-rear",
          [0.07, 0.22, 0.92],
          [side * 1.19, -0.52, -0.45],
          k.accent,
          0.03,
        );
      for (const side of sides)
        k.panel(
          "chassis-rear",
          [0.24, 0.42, 0.5],
          [side * 1.22, -0.5, -0.28],
          k.accent,
          0.06,
        );
      for (const side of sides) {
        k.mesh(
          "chassis-rear",
          new T.CylinderGeometry(0.13, 0.13, 0.08, 20).rotateZ(Math.PI / 2),
          [side * 1.28, -0.66, -0.45],
          mat,
        );
        k.bar(
          "chassis-rear",
          [side * 1.28, -0.6, -0.45],
          [side * 1.05, -0.4, -0.45],
          0.03,
          k.dark,
        );
        k.bar(
          "chassis-rear",
          [side * 0.7, -0.3, -0.5],
          [side * 0.95, -0.42, -0.5],
          0.035,
          k.dark,
        );
      }
      for (let i = 0; i < 6; i++)
        k.mesh(
          "chassis-rear",
          new T.CylinderGeometry(0.03, 0.03, 0.05, 10),
          [-0.9 + i * 0.36, -0.31, -0.88],
          k.dark,
        );
      // Side discharge chute on the right flank.
      k.panel("chassis-rear", [0.55, 0.26, 0.55], [1.32, -0.48, -0.08], k.accent, 0.05);
      k.panel("chassis-rear", [0.4, 0.06, 0.55], [1.55, -0.6, -0.08], mat, 0.02).rotation.z =
        -0.35;
      k.bar("chassis-rear", [1.1, -0.38, -0.08], [1.42, -0.42, -0.08], 0.03, k.dark);

      // ---- Fuel tank + exhaust + gearbox (chassis-rear) ----
      k.oval("chassis-rear", [0.35, 0.16, 0.18], [0, -0.12, -0.95], mat);
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.05, 0.05, 0.06, 16),
        [0.2, 0.03, -0.95],
        k.dark,
      );
      k.tube(
        "chassis-rear",
        [
          [0.2, -0.1, -0.95],
          [0.25, -0.3, -0.7],
          [0.3, -0.4, -0.3],
        ],
        0.022,
        mat,
        16,
      );
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.12, 0.12, 0.5, 24),
        [1.12, 0.55, -1.5],
        k.steel,
      );
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.07, 0.09, 0.18, 20),
        [1.12, 0.88, -1.5],
        k.dark,
      );
      k.bar("chassis-rear", [1.12, -0.1, -1.5], [1.12, 0.32, -1.5], 0.06, k.dark);
      for (const y of [0.42, 0.68])
        k.mesh(
          "chassis-rear",
          new T.TorusGeometry(0.125, 0.018, 10, 28).rotateX(Math.PI / 2),
          [1.12, y, -1.5],
          k.dark,
        );
      k.bar("chassis-rear", [1.0, 0.4, -1.5], [1.12, 0.4, -1.5], 0.025, k.dark);
      k.bar("chassis-rear", [1.0, 0.7, -1.5], [1.12, 0.7, -1.5], 0.025, k.dark);
      k.oval("chassis-rear", [0.28, 0.22, 0.24], [0, -0.55, -1.65], k.dark);
      k.bar("chassis-rear", [0.25, -0.5, -1.4], [0.4, -0.42, -0.8], 0.045, k.steel);
      for (const side of sides) {
        k.mesh(
          "chassis-rear",
          new T.CylinderGeometry(0.18, 0.18, 0.08, 24).rotateZ(Math.PI / 2),
          [side * 1.18, -0.8, -1.65],
          k.steel,
        );
        k.panel(
          "chassis-rear",
          [0.1, 0.12, 0.14],
          [side * 1.18, -0.62, -1.65],
          k.dark,
          0.02,
        );
      }
//---- Sun canopy: black posts + tan canvas top (roof) ----
      for (const side of sides) {
        k.bar("roof", [side * 1.0, 0.2, 0.78], [side * 0.95, 2.2, 0.55], 0.055, k.dark);
        k.bar("roof", [side * 1.0, 0.2, -0.95], [side * 0.9, 2.2, -1.05], 0.055, k.dark);
        k.bar(
          "roof",
          [side * 0.95, 2.2, 0.55],
          [side * 0.9, 2.2, -1.05],
          0.05,
          k.dark,
        );
        k.panel("roof", [0.16, 0.1, 0.16], [side * 1.0, 0.26, 0.78], k.dark, 0.03);
        k.panel("roof", [0.16, 0.1, 0.16], [side * 1.0, 0.3, -0.95], k.dark, 0.03);
      }
      k.bar("roof", [-0.95, 2.2, 0.55], [0.95, 2.2, 0.55], 0.05, k.dark);
      k.bar("roof", [-0.9, 2.2, -1.05], [0.9, 2.2, -1.05], 0.05, k.dark);
      k.panel("roof", [2.2, 0.12, 2.0], [0, 2.3, -0.25], canvas, 0.06);
      k.panel("roof", [1.9, 0.05, 1.7], [0, 2.23, -0.25], canvasDark, 0.02);
      k.oval("roof", [1.0, 0.08, 0.9], [0, 2.38, -0.25], canvas);
      for (const z of [0.2, -0.25, -0.7])
        k.bar("roof", [-0.95, 2.24, z], [0.95, 2.24, z], 0.025, canvasDark);
      k.panel("roof", [2.2, 0.14, 0.06], [0, 2.22, 0.73], canvasDark, 0.02);
      k.panel("roof", [2.15, 0.1, 0.06], [0, 2.24, -1.23], canvasDark, 0.02);

      // ---- Side body + footboards (doors) ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [-1.3, -0.2],
            [1.2, -0.2],
            [1.05, 0.25],
            [-1.2, 0.3],
          ],
          0.16,
          side * 1.0,
          k.paint,
          0.04,
        );
        k.panel(d, [0.5, 0.08, 1.3], [side * 0.95, -0.14, 0.55], k.paint, 0.02);
        k.panel(d, [0.44, 0.04, 1.2], [side * 0.95, -0.09, 0.55], mat, 0.012);
        k.panel(d, [0.52, 0.05, 0.08], [side * 0.95, -0.12, 1.18], k.steel, 0.015);
        const grip = new T.CylinderGeometry(0.02, 0.02, 0.035, 10);
        for (let ix = 0; ix < 3; ix++)
          for (let iz = 0; iz < 4; iz++)
            k.mesh(
              d,
              grip,
              [side * (0.8 + ix * 0.15), -0.06, 0.15 + iz * 0.27],
              k.steel,
            );
        k.panel(d, [0.05, 0.09, 2.1], [side * 1.1, 0.05, -0.05], k.accent, 0.02);
        k.panel(d, [0.05, 0.07, 0.14], [side * 1.1, -0.02, 1.05], k.amber, 0.012);
        k.panel(d, [0.05, 0.07, 0.14], [side * 1.1, -0.02, -1.15], k.red, 0.012);
        k.bar(d, [side * 1.0, -0.2, 1.15], [side * 1.0, 0.1, 1.15], 0.03, k.dark);
      }

      // ---- Grass catcher box + mesh screen (bed) ----
      k.hull("bed", [
        [-2.55, -0.1, 1.15, 1.0, 0.95],
        [-1.05, -0.1, 1.15, 1.05, 1.0],
      ]);
      k.panel("bed", [2.0, 0.1, 1.55], [0, 1.2, -1.8], k.paint, 0.04);
      for (let i = 0; i < 3; i++)
        k.panel("bed", [1.9, 0.05, 0.12], [0, 1.26, -1.35 - i * 0.45], k.paint, 0.015);
      k.bar("bed", [-0.3, 1.32, -1.8], [0.3, 1.32, -1.8], 0.03, k.dark);
      for (const side of sides)
        k.bar("bed", [side * 0.3, 1.26, -1.8], [side * 0.3, 1.32, -1.8], 0.025, k.dark);
      for (const z of [-1.15, -2.45])
        k.panel("bed", [0.3, 0.06, 0.12], [0, 1.24, z], k.dark, 0.02);
      k.panel("bed", [1.7, 0.85, 0.06], [0, 0.5, -2.57], screen, 0.02);
      for (let i = 0; i < 8; i++)
        k.bar(
          "bed",
          [-0.75 + i * 0.214, 0.1, -2.605],
          [-0.75 + i * 0.214, 0.9, -2.605],
          0.014,
          k.steel,
        );
      for (let i = 0; i < 5; i++)
        k.bar(
          "bed",
          [-0.8, 0.14 + i * 0.19, -2.605],
          [0.8, 0.14 + i * 0.19, -2.605],
          0.014,
          k.steel,
        );
      k.bar("bed", [-0.88, 0.06, -2.6], [0.88, 0.06, -2.6], 0.035, k.paint);
      k.bar("bed", [-0.88, 0.94, -2.6], [0.88, 0.94, -2.6], 0.035, k.paint);
      for (const side of sides)
        k.bar(
          "bed",
          [side * 0.88, 0.06, -2.6],
          [side * 0.88, 0.94, -2.6],
          0.035,
          k.paint,
        );
      for (const side of sides) {
        for (let i = 0; i < 3; i++)
          k.panel("bed", [0.04, 0.06, 0.7], [side * 1.03, 0.75 - i * 0.18, -1.8], k.dark, 0.012);
        k.panel("bed", [0.05, 0.09, 1.3], [side * 1.04, -0.02, -1.8], k.accent, 0.02);
      }
      k.bar("bed", [1.06, 0.9, -1.3], [1.06, 0.5, -1.3], 0.03, k.dark);
      k.bar("bed", [1.06, 0.9, -1.3], [1.06, 0.9, -1.1], 0.025, k.dark);
      k.panel("bed", [0.14, 0.1, 0.14], [1.06, 0.9, -1.05], k.dark, 0.03);
      k.panel("bed", [1.6, 0.2, 0.08], [0, -0.02, -2.56], k.dark, 0.03);
      k.panel("bed", [0.34, 0.12, 0.03], [0, -0.02, -2.61], k.white, 0.01);
      for (const side of sides)
        k.panel("bed", [0.12, 0.08, 0.03], [side * 0.68, -0.02, -2.6], k.red, 0.01);

      // ---- Front bumper guard ----
      k.tube(
        "bumper-front",
        [
          [-0.85, -0.1, 2.62],
          [0, -0.14, 2.8],
          [0.85, -0.1, 2.62],
        ],
        0.06,
        k.steel,
        24,
      );
      k.bar("bumper-front", [-0.85, -0.3, 2.56], [0.85, -0.3, 2.56], 0.045, k.dark);
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.62, -0.3, 2.56],
          [side * 0.64, -0.12, 2.73],
          0.04,
          k.dark,
        );
        k.bar(
          "bumper-front",
          [side * 0.55, -0.2, 2.35],
          [side * 0.55, -0.2, 2.6],
          0.045,
          k.dark,
        );
        k.lamp("bumper-front", [side * 0.87, 0.1, 2.6], 0.07, k.amber);
      }
      k.panel("bumper-front", [1.4, 0.09, 0.09], [0, -0.12, 2.72], mat, 0.025);
      k.mesh(
        "bumper-front",
        new T.TorusGeometry(0.08, 0.025, 10, 28),
        [0, -0.3, 2.58],
        k.dark,
      );

      // ---- Rear guard + lights + mud flaps ----
      k.panel("bumper-rear", [2.0, 0.13, 0.3], [0, -0.28, -2.68], k.dark, 0.05);
      for (const side of sides) {
        k.panel(
          "bumper-rear",
          [0.3, 0.12, 0.08],
          [side * 0.7, -0.28, -2.84],
          k.dark,
          0.02,
        );
        k.panel(
          "bumper-rear",
          [0.22, 0.08, 0.05],
          [side * 0.7, -0.28, -2.89],
          k.red,
          0.012,
        );
        k.panel(
          "bumper-rear",
          [0.55, 0.6, 0.06],
          [side * 1.65, -0.7, -2.75],
          k.dark,
          0.03,
        );
        k.panel(
          "bumper-rear",
          [0.4, 0.06, 0.02],
          [side * 1.65, -0.55, -2.79],
          k.white,
          0.008,
        );
        k.bar(
          "bumper-rear",
          [side * 0.8, -0.3, -2.5],
          [side * 0.8, -0.3, -2.68],
          0.045,
          k.dark,
        );
        k.bar(
          "bumper-rear",
          [side * 1.65, -0.42, -2.68],
          [side * 1.65, -0.42, -2.75],
          0.03,
          k.dark,
        );
      }
      k.bar("bumper-rear", [0, -0.28, -2.7], [0, -0.28, -2.9], 0.05, k.steel);
      k.mesh("bumper-rear", new T.SphereGeometry(0.06, 16, 12), [0, -0.28, -2.92], k.steel);

      // ---- Chassis dressing: fenders, shocks, skid plates ----
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
      }
      k.panel("chassis-front", [1.4, 0.08, 0.5], [0, -0.5, 2.1], k.steel, 0.02);
      k.panel("chassis-rear", [1.4, 0.08, 0.5], [0, -0.5, -2.2], k.steel, 0.02);

      // Yellow hub caps over the kit hubs.
      const caps = [
        ["wheel-fl", 2.02, 1.65],
        ["wheel-fr", -2.02, 1.65],
        ["wheel-rl", 2.02, -1.65],
        ["wheel-rr", -2.02, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.accent,
        );
        k.mesh(
          part,
          new T.SphereGeometry(0.05, 16, 12),
          [x + Math.sign(x) * 0.04, -0.85, z],
          k.dark,
        );
      }
    },
  ),
  vehicle(
    "grand-piano",
    "Grand Piano",
    "Gloss grand piano with ivory keys, a propped lid, and a bench seat.",
    [1316120, 16117725, 9405816, 0.76, 8],
    (k) => {
      const brass = gold();
      const ebony = finish(0x0b0b0d, 0.32, 0.15);
      const leather = finish(0x7e1f24, 0.62, 0.02);
      const spruce = finish(0xc99a4e, 0.72, 0.05);
      const copper = finish(0x8a5a2a, 0.45, 0.55);
      const paper = finish(0xf5efdd, 0.9, 0);
      const ink = finish(0x2a2d33, 0.8, 0);

      // ---- Lower case: lacquered belly, wide at the keyboard, tapered tail ----
      k.hull("chassis-front", [
        [0.3, -0.12, 0.5, 1.12, 1.18],
        [1.2, -0.12, 0.5, 1.16, 1.2],
        [2.0, -0.12, 0.5, 1.1, 1.14],
      ]);
      k.panel("chassis-front", [2.1, 0.08, 1.9], [0, -0.14, 1.15], k.dark, 0.03);
      k.hull("chassis-rear", [
        [-2.45, -0.1, 0.5, 0.55, 0.62],
        [-1.6, -0.12, 0.5, 0.95, 1.02],
        [-0.6, -0.12, 0.5, 1.1, 1.17],
        [0.35, -0.12, 0.5, 1.12, 1.18],
      ]);
      k.oval("chassis-rear", [0.6, 0.32, 0.3], [0, 0.18, -2.42]);

      // ---- Case rims: tall lacquered sides, gold pinstripes, bent-side tubes ----
      for (const side of sides) {
        const part = side < 0 ? "door-right" : "door-left";
        k.profile(
          part,
          [
            [-2.42, 0.28],
            [2.02, 0.28],
            [2.02, 0.78],
            [-2.3, 0.78],
            [-2.5, 0.52],
          ],
          0.14,
          side * 1.12,
          k.paint,
          0.04,
        );
        k.bar(part, [side * 1.21, 0.76, 2.0], [side * 1.21, 0.76, -2.28], 0.022, brass);
        k.bar(part, [side * 1.21, 0.34, 2.0], [side * 1.21, 0.34, -2.28], 0.016, brass);
        const out = side > 0 ? 1.52 : 1.3;
        k.tube(
          part,
          [
            [side * 1.2, 0.62, 2.0],
            [side * out, 0.62, 0.3],
            [side * (out - 0.15), 0.62, -1.2],
            [side * 0.72, 0.62, -2.35],
          ],
          0.055,
          k.paint,
          48,
        );
      }

      // ---- Keyboard across the nose: keyframe, 30 ivory keys, ebony sharps ----
      k.panel("hood", [2.34, 0.16, 0.85], [0, 0.42, 2.12], k.paint, 0.04);
      k.panel("hood", [2.34, 0.24, 0.14], [0, 0.32, 2.56], k.paint, 0.04);
      for (const side of sides)
        k.panel("hood", [0.16, 0.3, 0.9], [side * 1.2, 0.5, 2.12], k.paint, 0.05);
      for (let i = 0; i < 30; i++)
        k.panel("hood", [0.064, 0.055, 0.66], [-1.015 + i * 0.07, 0.53, 2.2], k.accent, 0.008);
      for (let o = 0; o < 4; o++)
        for (const s of [0, 1, 3, 4, 5]) {
          const wi = o * 7 + s;
          if (wi > 28) continue;
          k.panel(
            "hood",
            [0.04, 0.1, 0.38],
            [-1.015 + wi * 0.07 + 0.035, 0.575, 2.06],
            ebony,
            0.01,
          );
        }
      k.panel("hood", [2.1, 0.44, 0.09], [0, 0.82, 1.78], k.paint, 0.04).rotation.x =
        -0.42;
      k.oval("hood", [0.2, 0.06, 0.02], [0, 0.32, 2.64], brass);

      // ---- Music desk: brass rack with two staved pages behind the fallboard ----
      for (const px of [-0.25, 0.25]) {
        k.panel("hood", [0.46, 0.6, 0.03], [px, 1.02, 1.52], paper, 0.01).rotation.x =
          -0.3;
        for (const dy of [-0.2, -0.1, 0, 0.1, 0.2]) {
          const y = 1.02 + dy * 0.955 + 0.006;
          const z = 1.52 - dy * 0.296 + 0.019;
          k.bar("hood", [px - 0.19, y, z], [px + 0.19, y, z], 0.008, ink);
        }
      }
      k.bar("hood", [-0.55, 0.74, 1.64], [0.55, 0.74, 1.64], 0.025, brass);
      k.bar("hood", [-0.5, 1.33, 1.42], [0.5, 1.33, 1.42], 0.02, brass);
      for (const side of sides)
        k.bar("hood", [side * 0.5, 0.5, 1.7], [side * 0.5, 0.78, 1.62], 0.02, brass);

      // ---- Cage lamps on the front case corners ----
      for (const side of sides) {
        const x = side * 1.32;
        k.bar("hood", [x, 0.5, 2.3], [x, 0.62, 2.3], 0.05, k.dark);
        k.oval("hood", [0.09, 0.11, 0.09], [x, 0.74, 2.3], k.white);
        k.mesh("hood", new T.TorusGeometry(0.12, 0.014, 10, 32), [x, 0.74, 2.3], k.dark);
        k.mesh(
          "hood",
          new T.TorusGeometry(0.12, 0.014, 10, 32).rotateX(Math.PI / 2),
          [x, 0.74, 2.3],
          k.dark,
        );
        k.mesh("hood", new T.CylinderGeometry(0.1, 0.13, 0.06, 20), [x, 0.88, 2.3], k.dark);
      }

      // ---- Lid propped open on a brass stick, hinged along the left rim ----
      const tilt = 0.45;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const lidX = (u: number) => -1.05 + u * ct;
      const lidY = (u: number) => 0.84 + u * st;
      const lidSeg = (u0: number, u1: number, z0: number, z1: number) => {
        const u = (u0 + u1) / 2;
        k.panel(
          "roof",
          [u1 - u0, 0.08, z1 - z0],
          [lidX(u), lidY(u), (z0 + z1) / 2],
          k.paint,
          0.03,
        ).rotation.z = tilt;
      };
      lidSeg(0, 0.8, -2.2, 1.6);
      lidSeg(0.8, 1.5, -1.9, 1.6);
      lidSeg(1.5, 2.1, -1.4, 1.6);
      k.oval("roof", [0.42, 0.05, 0.5], [lidX(0.4), lidY(0.4), -2.1], k.paint).rotation.z =
        tilt;
      for (const z of [0.6, -0.8])
        k.bar(
          "roof",
          [lidX(0.05) + 0.03, lidY(0.05) - 0.06, z],
          [lidX(2.05) + 0.03, lidY(2.05) - 0.06, z],
          0.03,
          brass,
        );
      k.bar("roof", [lidX(0), lidY(0), 1.62], [lidX(2.1), lidY(2.1), 1.62], 0.028, brass);
      k.bar("roof", [1.0, 0.7, 0.55], [lidX(1.7) + 0.03, lidY(1.7) - 0.05, 0.55], 0.035, brass);
      k.mesh("roof", new T.CylinderGeometry(0.06, 0.07, 0.05, 16), [1.0, 0.68, 0.55], brass);
      for (const z of [0.9, -1.2])
        k.panel("roof", [0.12, 0.06, 0.18], [-1.06, 0.8, z], brass, 0.02);

      // ---- Soundboard, gold plate, strings, pins, dampers ----
      k.panel("chassis-front", [2.0, 0.06, 1.5], [0, 0.5, 0.75], spruce, 0.02);
      k.panel("chassis-front", [1.7, 0.06, 0.75], [0, 0.48, -0.35], spruce, 0.02);
      k.panel("chassis-rear", [1.7, 0.06, 1.6], [0, 0.5, -1.5], spruce, 0.02);
      k.panel("chassis-front", [1.9, 0.1, 0.35], [0, 0.56, 1.32], ebony, 0.02);
      for (const [x0, x1] of [[-0.7, -0.35], [0, 0], [0.7, 0.35]] as const)
        k.bar("chassis-front", [x0, 0.56, 1.1], [x1, 0.56, -0.6], 0.055, brass);
      for (const [x0, x1] of [[-0.35, -0.15], [0, 0], [0.35, 0.15]] as const)
        k.bar("chassis-rear", [x0, 0.56, -0.6], [x1, 0.56, -2.2], 0.05, brass);
      for (let i = 0; i < 18; i++) {
        const t = i / 17;
        const x0 = -0.85 + t * 1.7;
        const x1 = -0.3 + t * 0.6;
        const xm = x0 + (x1 - x0) * 0.55;
        k.bar("chassis-front", [x0, 0.6, 1.15], [xm, 0.6, -0.65], 0.011, k.steel);
        k.bar("chassis-rear", [xm, 0.6, -0.65], [x1, 0.6, -2.25], 0.011, k.steel);
      }
      for (let i = 0; i < 6; i++)
        k.bar(
          "chassis-front",
          [-0.85 + i * 0.09, 0.625, 1.15],
          [-0.5 + i * 0.2, 0.625, -0.65],
          0.014,
          copper,
        );
      for (let i = 0; i < 12; i++) {
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.018, 0.018, 0.1, 10),
          [-0.82 + i * 0.15, 0.64, 1.26],
          k.dark,
        );
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.018, 0.018, 0.1, 10),
          [-0.745 + i * 0.15, 0.64, 1.4],
          k.dark,
        );
      }
      for (let i = 0; i < 10; i++)
        k.panel("chassis-front", [0.09, 0.07, 0.12], [-0.72 + i * 0.16, 0.6, 0.95], ebony, 0.015);

      // ---- Duet bench seat over the middle ----
      k.panel("chassis-front", [1.3, 0.1, 0.6], [0, 0.72, -0.35], k.paint, 0.04);
      for (const side of sides)
        k.panel("chassis-front", [0.58, 0.16, 0.55], [side * 0.32, 0.84, -0.35], leather, 0.07);
      for (const sx of [-0.46, -0.18, 0.18, 0.46])
        for (const dz of [-0.47, -0.23])
          k.mesh("chassis-front", new T.CylinderGeometry(0.025, 0.025, 0.03, 12), [sx, 0.92, dz], ebony);
      for (const sx of [-0.55, 0.55])
        for (const dz of [-0.58, -0.12]) {
          k.mesh("chassis-front", new T.CylinderGeometry(0.05, 0.06, 0.22, 16), [sx, 0.62, dz], k.paint);
          k.mesh("chassis-front", new T.SphereGeometry(0.05, 14, 10), [sx, 0.52, dz], brass);
        }

      // ---- Sheet-music wing on the rear deck ----
      for (const side of sides)
        k.panel("bed", [0.16, 0.45, 0.3], [side * 0.72, 0.95, -2.3], k.paint, 0.04);
      k.panel("bed", [1.7, 0.06, 0.7], [0, 1.2, -2.3], paper, 0.02);
      k.bar("bed", [0, 1.24, -2.62], [0, 1.24, -1.98], 0.015, brass);
      for (const px of [-0.42, 0.42])
        for (let i = 0; i < 5; i++) {
          const z = -2.5 + i * 0.1;
          k.bar("bed", [px - 0.32, 1.235, z], [px + 0.32, 1.235, z], 0.008, ink);
        }
      for (const side of sides) {
        k.panel("bed", [0.05, 0.3, 0.7], [side * 0.88, 1.3, -2.3], k.paint, 0.02);
        k.bar("bed", [side * 0.88, 1.46, -2.62], [side * 0.88, 1.46, -1.98], 0.015, brass);
      }

      // ---- Candelabra lamps flanking the rear deck ----
      for (const side of sides) {
        const x = side * 0.95;
        k.mesh("bed", new T.CylinderGeometry(0.09, 0.12, 0.06, 20), [x, 0.81, -2.0], brass);
        k.bar("bed", [x, 0.84, -2.0], [x, 1.15, -2.0], 0.03, brass);
        for (const dx of [-0.12, 0, 0.12]) {
          k.bar("bed", [x, 1.05, -2.0], [x + dx, 1.15, -2.0], 0.018, brass);
          k.mesh("bed", new T.CylinderGeometry(0.035, 0.035, 0.22, 14), [x + dx, 1.26, -2.0], paper);
          k.mesh("bed", new T.SphereGeometry(0.04, 12, 10), [x + dx, 1.42, -2.0], k.amber);
        }
      }
      for (const side of sides) {
        k.oval("bed", [0.1, 0.07, 0.04], [side * 0.45, 0.3, -2.68], k.red);
        k.mesh(
          "bed",
          new T.TorusGeometry(0.09, 0.015, 10, 28),
          [side * 0.45, 0.3, -2.68],
          brass,
        );
      }

      // ---- Front bumper with the three-brass-pedal lyre ----
      k.panel("bumper-front", [2.5, 0.26, 0.3], [0, -0.08, 2.68], k.paint, 0.08);
      k.panel("bumper-front", [2.5, 0.06, 0.32], [0, 0.07, 2.68], k.steel, 0.02);
      for (const side of sides)
        k.bar("bumper-front", [side * 0.5, -0.2, 2.72], [side * 0.5, -0.5, 2.78], 0.035, brass);
      k.bar("bumper-front", [-0.5, -0.5, 2.78], [0.5, -0.5, 2.78], 0.03, brass);
      for (const px of [-0.2, 0, 0.2]) {
        k.bar("bumper-front", [px, -0.42, 2.72], [px, -0.52, 2.86], 0.028, brass);
        k.panel("bumper-front", [0.09, 0.04, 0.16], [px, -0.53, 2.92], brass, 0.015);
      }

      // ---- Rear bumper with brass trim and tail lamps ----
      k.panel("bumper-rear", [2.4, 0.24, 0.28], [0, -0.1, -2.66], k.paint, 0.08);
      k.bar("bumper-rear", [-1.1, 0.03, -2.66], [1.1, 0.03, -2.66], 0.02, brass);
      k.tailLights(-2.79, 0.1);

      // ---- Arches with gold pinstripes, brass shocks, hub medallions ----
      fenders(k, k.paint);
      for (const side of sides)
        for (const z of [1.65, -1.65]) {
          const pts: Array<readonly [number, number, number]> = [];
          for (let i = 0; i <= 6; i++) {
            const a = 0.3 + (i / 6) * (Math.PI - 0.6);
            pts.push([side * 1.93, -0.59 + Math.sin(a) * 1.22, z + Math.cos(a) * 1.22]);
          }
          k.tube(z > 0 ? "chassis-front" : "chassis-rear", pts, 0.02, brass, 24);
        }
      for (const side of sides) {
        k.shock("chassis-front", [side * 1.18, 0.55, 1.65], [side * 1.45, -0.67, 1.65], brass);
        k.shock("chassis-rear", [side * 1.18, 0.55, -1.65], [side * 1.45, -0.67, -1.65], brass);
      }
      const caps = [
        ["wheel-fl", 2.06, 1.65],
        ["wheel-fr", -2.06, 1.65],
        ["wheel-rl", 2.06, -1.65],
        ["wheel-rr", -2.06, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.14, 0.14, 0.07, 28).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          brass,
        );
        k.mesh(
          part,
          new T.SphereGeometry(0.055, 14, 10),
          [x + Math.sign(x) * 0.04, -0.85, z],
          k.paint,
        );
      }
    },
  ),
  vehicle(
    "phone-booth",
    "Phone Booth",
    "Red British phone box with glazed panels, a rotary phone, and a domed roof.",
    [12724768, 15920608, 3027510, 0.78, 6],
    (k) => {
      const cream = k.accent;
      const F = 1.45;
      const R = -1.45;
      const HX = 1.12;
      const rows = [0.52, 0.84, 1.16, 1.48];

      // ---- Front glazed wall (hood) ----
      k.panel("hood", [2.24, 0.5, 0.12], [0, -0.1, F], k.paint, 0.03);
      for (const side of sides) {
        k.panel(
          "hood",
          [0.2, 2.81, 0.2],
          [side * 1.02, 1.055, F],
          k.paint,
          0.03,
        );
        k.panel(
          "hood",
          [0.26, 0.16, 0.26],
          [side * 1.02, -0.27, F],
          k.paint,
          0.03,
        );
        k.panel(
          "hood",
          [0.24, 0.09, 0.24],
          [side * 1.02, 1.9, F],
          k.paint,
          0.02,
        );
      }
      k.panel("hood", [2.04, 0.1, 0.16], [0, 0.2, F], k.paint, 0.02);
      k.panel("hood", [1.84, 1.6, 0.05], [0, 1.0, F], k.glass, 0.012);
      for (const x of [-0.613, -0.307, 0, 0.307, 0.613])
        k.panel("hood", [0.055, 1.6, 0.09], [x, 1.0, F], cream, 0.012);
      for (const y of rows)
        k.panel("hood", [1.84, 0.055, 0.09], [0, y, F], cream, 0.012);
      k.panel("hood", [2.24, 0.17, 0.14], [0, 1.935, F], k.paint, 0.03);
      k.panel("hood", [1.9, 0.32, 0.06], [0, 2.18, F + 0.02], cream, 0.015);
      for (const y of [2.035, 2.325])
        k.panel("hood", [2.0, 0.05, 0.08], [0, y, F + 0.02], k.paint, 0.012);
      for (const side of sides)
        k.panel(
          "hood",
          [0.05, 0.34, 0.08],
          [side * 0.975, 2.18, F + 0.02],
          k.paint,
          0.012,
        );
      k.panel("hood", [2.26, 0.08, 0.14], [0, -0.28, F], k.dark, 0.02);
      for (const y of [-0.14, -0.04, 0.06])
        k.panel("hood", [0.6, 0.035, 0.03], [0, y, F + 0.055], k.dark, 0.008);

      // ---- Rear glazed wall + interior phone shelf (bed) ----
      k.panel("bed", [2.24, 0.5, 0.12], [0, -0.1, R], k.paint, 0.03);
      for (const side of sides) {
        k.panel(
          "bed",
          [0.2, 2.81, 0.2],
          [side * 1.02, 1.055, R],
          k.paint,
          0.03,
        );
        k.panel(
          "bed",
          [0.26, 0.16, 0.26],
          [side * 1.02, -0.27, R],
          k.paint,
          0.03,
        );
        k.panel(
          "bed",
          [0.24, 0.09, 0.24],
          [side * 1.02, 1.9, R],
          k.paint,
          0.02,
        );
      }
      k.panel("bed", [2.04, 0.1, 0.16], [0, 0.2, R], k.paint, 0.02);
      k.panel("bed", [1.84, 1.6, 0.05], [0, 1.0, R], k.glass, 0.012);
      for (const x of [-0.613, -0.307, 0, 0.307, 0.613])
        k.panel("bed", [0.055, 1.6, 0.09], [x, 1.0, R], cream, 0.012);
      for (const y of rows)
        k.panel("bed", [1.84, 0.055, 0.09], [0, y, R], cream, 0.012);
      k.panel("bed", [2.24, 0.17, 0.14], [0, 1.935, R], k.paint, 0.03);
      k.panel("bed", [1.9, 0.32, 0.06], [0, 2.18, R - 0.02], cream, 0.015);
      for (const y of [2.035, 2.325])
        k.panel("bed", [2.0, 0.05, 0.08], [0, y, R - 0.02], k.paint, 0.012);
      for (const side of sides)
        k.panel(
          "bed",
          [0.05, 0.34, 0.08],
          [side * 0.975, 2.18, R - 0.02],
          k.paint,
          0.012,
        );
      k.panel("bed", [2.26, 0.08, 0.14], [0, -0.28, R], k.dark, 0.02);
      // Interior: backboard, shelf, and black rotary phone.
      k.panel("bed", [1.3, 1.3, 0.07], [-0.4, 1.05, -1.3], k.dark, 0.02);
      k.panel("bed", [1.2, 0.07, 0.5], [-0.35, 0.9, -1.0], k.steel, 0.015);
      for (const bx of [-0.8, 0.1])
        k.panel("bed", [0.07, 0.18, 0.4], [bx, 0.78, -1.05], k.dark, 0.015);
      k.panel("bed", [0.44, 0.17, 0.38], [-0.45, 1.02, -1.0], k.dark, 0.03);
      k.panel(
        "bed",
        [0.4, 0.16, 0.3],
        [-0.45, 1.16, -0.98],
        k.dark,
        0.03,
      ).rotation.x = -0.35;
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.11, 0.11, 0.03, 32).rotateX(Math.PI / 2),
        [-0.45, 1.18, -0.82],
        k.steel,
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.035, 0.035, 0.045, 20).rotateX(Math.PI / 2),
        [-0.45, 1.18, -0.82],
        k.dark,
      );
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.016, 0.016, 0.05, 12).rotateX(Math.PI / 2),
          [-0.45 + Math.cos(a) * 0.075, 1.18 + Math.sin(a) * 0.075, -0.82],
          k.dark,
        );
      }
      k.bar(
        "bed",
        [-0.33, 1.1, -0.8],
        [-0.33, 1.2, -0.8],
        0.018,
        k.steel,
      );
      k.bar("bed", [-0.61, 1.3, -1.0], [-0.29, 1.3, -1.0], 0.03, k.dark);
      for (const cx of [-0.61, -0.29])
        k.oval("bed", [0.07, 0.09, 0.07], [cx, 1.3, -1.0], k.dark);
      for (const cx of [-0.55, -0.35])
        k.bar("bed", [cx, 1.1, -1.0], [cx, 1.26, -1.0], 0.025, k.dark);
      const cord: Array<readonly [number, number, number]> = [];
      for (let i = 0; i <= 44; i++) {
        const t = i / 44;
        const a = t * Math.PI * 10;
        cord.push([
          -0.29 + Math.cos(a) * 0.03,
          1.28 - t * 0.33,
          -0.95 + Math.sin(a) * 0.03,
        ]);
      }
      k.tube("bed", cord, 0.012, k.dark, 88);
      k.panel("bed", [0.2, 0.28, 0.12], [0.05, 1.08, -1.05], cream, 0.02);
      k.panel("bed", [0.16, 0.22, 0.1], [0.05, 1.05, -0.88], k.paint, 0.02);

      // ---- Door wall, +x side (door-left): folding door with handle ----
      k.panel("door-left", [0.12, 0.5, 2.7], [HX, -0.1, 0], k.paint, 0.03);
      k.panel("door-left", [0.14, 0.08, 2.72], [HX, -0.28, 0], k.dark, 0.02);
      k.panel("door-left", [0.16, 0.1, 2.5], [HX, 0.2, 0], k.paint, 0.02);
      for (const side of sides) {
        k.panel(
          "door-left",
          [0.05, 1.6, 0.42],
          [HX, 1.0, side * 1.04],
          k.glass,
          0.012,
        );
        k.panel(
          "door-left",
          [0.09, 1.6, 0.055],
          [HX, 1.0, side * 1.04],
          cream,
          0.012,
        );
        k.panel(
          "door-left",
          [0.14, 1.75, 0.09],
          [HX, 1.1, side * 0.775],
          k.paint,
          0.02,
        );
      }
      for (const y of rows)
        k.panel("door-left", [0.09, 0.055, 2.5], [HX, y, 0], cream, 0.012);
      k.panel("door-left", [0.14, 0.09, 1.64], [HX, 1.975, 0], k.paint, 0.02);
      k.panel("door-left", [0.2, 0.07, 1.6], [HX, 0.235, 0], k.steel, 0.015);
      k.panel("door-left", [0.14, 0.17, 2.7], [HX, 1.935, 0], k.paint, 0.03);
      k.panel("door-left", [0.06, 0.32, 1.9], [HX + 0.02, 2.18, 0], cream, 0.015);
      for (const y of [2.035, 2.325])
        k.panel("door-left", [0.08, 0.05, 2.0], [HX + 0.02, y, 0], k.paint, 0.012);
      for (const side of sides)
        k.panel(
          "door-left",
          [0.08, 0.34, 0.05],
          [HX + 0.02, 2.18, side * 0.975],
          k.paint,
          0.012,
        );
      // Door leaf (closed): red frame, open derby window, handle, hinges.
      for (const side of sides)
        k.panel(
          "door-left",
          [0.07, 1.66, 0.08],
          [1.17, 1.1, side * 0.71],
          k.paint,
          0.015,
        );
      k.panel("door-left", [0.07, 0.09, 1.5], [1.17, 1.885, 0], k.paint, 0.015);
      k.panel("door-left", [0.07, 0.09, 1.5], [1.17, 1.1, 0], k.paint, 0.015);
      k.panel("door-left", [0.07, 0.12, 1.5], [1.17, 0.335, 0], k.paint, 0.015);
      k.panel("door-left", [0.05, 0.62, 1.34], [1.17, 0.72, 0], k.paint, 0.012);
      k.panel("door-left", [0.02, 0.16, 1.3], [1.21, 0.44, 0], k.steel, 0.006);
      for (const z of [-0.223, 0.223])
        k.panel("door-left", [0.06, 0.72, 0.05], [1.17, 1.5, z], cream, 0.012);
      k.panel("door-left", [0.06, 0.05, 1.34], [1.17, 1.5, 0], cream, 0.012);
      k.bar(
        "door-left",
        [1.235, 0.85, 0.55],
        [1.235, 1.25, 0.55],
        0.028,
        k.steel,
      );
      for (const y of [0.9, 1.2])
        k.bar("door-left", [1.17, y, 0.55], [1.235, y, 0.55], 0.02, k.steel);
      k.oval("door-left", [0.035, 0.035, 0.035], [1.235, 1.27, 0.55], k.dark);
      for (const y of [0.6, 1.6])
        k.panel("door-left", [0.06, 0.12, 0.06], [1.17, y, -0.73], k.dark, 0.012);
      k.bar("door-left", [1.2, 0.3, 1.32], [1.2, 1.5, 1.32], 0.025, k.steel);

      // ---- Fixed glazed wall, -x side (door-right) ----
      k.panel("door-right", [0.12, 0.5, 2.7], [-HX, -0.1, 0], k.paint, 0.03);
      k.panel("door-right", [0.14, 0.08, 2.72], [-HX, -0.28, 0], k.dark, 0.02);
      k.panel("door-right", [0.16, 0.1, 2.5], [-HX, 0.2, 0], k.paint, 0.02);
      k.panel("door-right", [0.05, 1.6, 2.5], [-HX, 1.0, 0], k.glass, 0.012);
      for (const z of [-1.0, -0.6, -0.2, 0.2, 0.6, 1.0])
        k.panel("door-right", [0.09, 1.6, 0.055], [-HX, 1.0, z], cream, 0.012);
      for (const y of rows)
        k.panel("door-right", [0.09, 0.055, 2.5], [-HX, y, 0], cream, 0.012);
      k.panel("door-right", [0.14, 0.17, 2.7], [-HX, 1.935, 0], k.paint, 0.03);
      k.panel("door-right", [0.06, 0.32, 1.9], [-HX - 0.02, 2.18, 0], cream, 0.015);
      for (const y of [2.035, 2.325])
        k.panel("door-right", [0.08, 0.05, 2.0], [-HX - 0.02, y, 0], k.paint, 0.012);
      for (const side of sides)
        k.panel(
          "door-right",
          [0.08, 0.34, 0.05],
          [-HX - 0.02, 2.18, side * 0.975],
          k.paint,
          0.012,
        );

      // ---- Domed roof (roof) ----
      k.panel("roof", [2.44, 0.12, 3.1], [0, 2.4, 0], k.paint, 0.03);
      k.panel("roof", [2.56, 0.07, 3.16], [0, 2.49, 0], k.paint, 0.02);
      const dome = k.mesh(
        "roof",
        new T.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, 0.62),
        [0, 0.44, 0],
        k.paint,
      );
      dome.scale.set(2.2, 2.55, 2.72);
      k.panel("roof", [2.0, 0.06, 2.7], [0, 1.99, 0], k.dark, 0.015);
      k.oval("roof", [0.12, 0.08, 0.12], [0, 1.93, 0], k.white);
      k.mesh(
        "roof",
        new T.TorusGeometry(0.13, 0.02, 12, 32),
        [0, 1.94, 0],
        k.dark,
      ).rotation.x = Math.PI / 2;
      k.bar("roof", [0, 2.95, 0], [0, 3.08, 0], 0.1, k.paint);
      k.oval("roof", [0.08, 0.1, 0.08], [0, 3.16, 0], k.paint);
      k.bar("roof", [0, 3.2, 0], [0, 3.32, 0], 0.025, k.steel);
      for (const sx of sides)
        for (const sz of sides)
          k.oval("roof", [0.09, 0.09, 0.09], [sx * 1.22, 2.58, sz * 1.52], k.paint);

      // ---- Bumpers: black bars with lamps tucked under the sills ----
      k.panel("bumper-front", [2.3, 0.3, 0.32], [0, -0.32, 1.95], k.dark, 0.07);
      k.panel("bumper-front", [2.1, 0.08, 0.26], [0, -0.14, 1.95], k.steel, 0.02);
      for (const side of sides) {
        k.lamp("bumper-front", [side * 0.78, -0.3, 2.02], 0.13);
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.5, -0.52, 1.95],
          k.steel,
        );
        k.panel(
          "bumper-front",
          [0.06, 0.08, 0.12],
          [side * 1.16, -0.32, 1.95],
          k.amber,
          0.012,
        );
      }
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.32, 2.115], k.white, 0.01);
      k.panel("bumper-rear", [2.3, 0.3, 0.32], [0, -0.32, -1.95], k.dark, 0.07);
      k.panel("bumper-rear", [2.1, 0.08, 0.26], [0, -0.14, -1.95], k.steel, 0.02);
      k.tailLights(-2.07, -0.25);
      for (const side of sides) {
        k.mesh(
          "bumper-rear",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.5, -0.52, -1.95],
          k.steel,
        );
        k.panel(
          "bumper-rear",
          [0.06, 0.08, 0.12],
          [side * 1.16, -0.32, -1.95],
          k.amber,
          0.012,
        );
      }

      // ---- Chassis dressing: red arches, tank, shocks, steps ----
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
          cream,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          cream,
        );
        k.panel(
          "chassis-front",
          [0.5, 0.07, 0.7],
          [side * 1.3, -0.42, 0],
          k.steel,
          0.02,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.45, -2.0],
          [side * 0.55, -0.45, -2.9],
          0.06,
          k.steel,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.45, -2.8],
          [side * 0.55, -0.45, -2.92],
          0.068,
          k.dark,
        );
      }

      // Dark hub caps over the gray kit hubs, per the concept's black centers.
      const caps = [
        ["wheel-fl", 2.06, 1.65],
        ["wheel-fr", -2.06, 1.65],
        ["wheel-rl", 2.06, -1.65],
        ["wheel-rr", -2.06, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.SphereGeometry(0.05, 16, 12),
          [x + Math.sign(x) * 0.04, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "fish-tank",
    "Fish Tank",
    "Glass aquarium on wheels with coral, treasure, and very confused fish.",
    [3121090, 15900733, 3820114, 0.8, 8],
    (k) => {
      const glass = new T.MeshPhysicalMaterial({
        color: 0xcfeef2,
        transparent: true,
        opacity: 0.16,
        roughness: 0.06,
        metalness: 0,
        depthWrite: false,
      });
      const water = new T.MeshPhysicalMaterial({
        color: 0x2e9fc4,
        transparent: true,
        opacity: 0.3,
        roughness: 0.3,
        metalness: 0,
        depthWrite: false,
      });
      const surface = new T.MeshPhysicalMaterial({
        color: 0x9fe0ee,
        transparent: true,
        opacity: 0.45,
        roughness: 0.15,
        metalness: 0,
        depthWrite: false,
      });
      const bubbleMat = new T.MeshPhysicalMaterial({
        color: 0xe8fbff,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0,
        depthWrite: false,
      });
      const sand = finish(0xe6d29a, 0.9, 0);
      const coralRed = finish(0xe14b3a, 0.6, 0);
      const coralYellow = finish(0xf2c230, 0.6, 0);
      const coralBlue = finish(0x2f7fd0, 0.6, 0);
      const coralPink = finish(0xe57aa0, 0.6, 0);
      const weed = finish(0x2e8b57, 0.7, 0);
      const wood = finish(0x6b4a2a, 0.7, 0);
      const brass = gold();
      const finMat = finish(0xc25e1e, 0.6, 0);
      const lampBar = glow(0xbfefff);

      const bubble = (
        part: PartId,
        x: number,
        y: number,
        z: number,
        r: number,
      ) =>
        k.mesh(part, new T.SphereGeometry(r, 18, 12), [x, y, z], bubbleMat);

      // Branching coral: dark rock foot, stems fanning out, bulb tips.
      const coral = (
        part: PartId,
        x: number,
        z: number,
        mat: T.Material,
        seed: number,
      ) => {
        k.oval(part, [0.17, 0.1, 0.17], [x, 0.38, z], k.dark);
        const tips: Array<readonly [number, number, number]> = [
          [0, 0.78, 0],
          [0.15, 0.62, 0.08],
          [-0.14, 0.64, -0.06],
          [0.09, 0.52, -0.15],
          [-0.1, 0.54, 0.14],
          [0.21, 0.44, -0.02],
          [-0.2, 0.46, 0.04],
        ];
        for (const [tx, ty, tz] of tips) {
          const c = Math.cos(seed);
          const s = Math.sin(seed);
          const px = x + tx * c - tz * s;
          const pz = z + tx * s + tz * c;
          k.bar(part, [x, 0.42, z], [px, 0.35 + ty, pz], 0.035, mat);
          k.oval(part, [0.055, 0.07, 0.055], [px, 0.37 + ty, pz], mat);
        }
      };

      // Goldfish with flattened tail, dorsal fin, and worried eyes.
      const fish = (
        part: PartId,
        x: number,
        y: number,
        z: number,
        yaw: number,
      ) => {
        const fx = Math.sin(yaw);
        const fz = Math.cos(yaw);
        const rx = Math.cos(yaw);
        const rz = -Math.sin(yaw);
        const body = k.oval(part, [0.15, 0.13, 0.23], [x, y, z], k.accent);
        body.rotation.y = yaw;
        const tail = k.mesh(
          part,
          new T.ConeGeometry(0.11, 0.2, 20).rotateX(Math.PI / 2),
          [x - fx * 0.3, y, z - fz * 0.3],
          finMat,
        );
        tail.rotation.y = yaw;
        tail.scale.x = 0.35;
        const dorsal = k.mesh(
          part,
          new T.ConeGeometry(0.05, 0.12, 12),
          [x - fx * 0.02, y + 0.15, z - fz * 0.02],
          finMat,
        );
        dorsal.rotation.y = yaw;
        dorsal.scale.x = 0.45;
        for (const s of [-1, 1]) {
          k.mesh(
            part,
            new T.SphereGeometry(0.035, 12, 10),
            [
              x + fx * 0.15 + rx * s * 0.09,
              y + 0.04,
              z + fz * 0.15 + rz * s * 0.09,
            ],
            k.white,
          );
          k.mesh(
            part,
            new T.SphereGeometry(0.018, 10, 8),
            [
              x + fx * 0.175 + rx * s * 0.105,
              y + 0.04,
              z + fz * 0.175 + rz * s * 0.105,
            ],
            k.dark,
          );
        }
      };

      const porthole = (part: PartId, side: number, z: number) => {
        const x = side * 1.06;
        k.mesh(
          part,
          new T.TorusGeometry(0.28, 0.05, 14, 48).rotateY(Math.PI / 2),
          [x, 1.15, z],
          k.steel,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.26, 0.26, 0.05, 40).rotateZ(Math.PI / 2),
          [x, 1.15, z],
          glass,
        );
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          k.mesh(
            part,
            new T.SphereGeometry(0.028, 10, 8),
            [x + side * 0.05, 1.15 + Math.cos(a) * 0.28, z + Math.sin(a) * 0.28],
            k.dark,
          );
        }
      };

      // ---- Front glass wall (hood): filter box, vent wand, lamps ----
      k.panel("hood", [1.98, 1.66, 0.06], [0, 1.06, 2.3], glass, 0.012);
      for (const side of sides)
        k.panel("hood", [0.14, 1.9, 0.14], [side * 1.02, 1.05, 2.3], k.paint, 0.03);
      k.panel("hood", [2.18, 0.12, 0.12], [0, 1.95, 2.3], k.paint, 0.03);
      k.panel("hood", [2.18, 0.12, 0.12], [0, 0.17, 2.3], k.paint, 0.03);
      // Chrome filter box hanging on the nose with grille and plumbing.
      k.panel("hood", [0.62, 0.5, 0.3], [-0.62, 0.55, 2.48], k.steel, 0.03);
      k.panel("hood", [0.66, 0.08, 0.34], [-0.62, 0.82, 2.48], k.dark, 0.02);
      for (let i = 0; i < 4; i++)
        k.panel(
          "hood",
          [0.5, 0.04, 0.04],
          [-0.62, 0.42 + i * 0.09, 2.64],
          k.dark,
          0.01,
        );
      k.bar("hood", [-0.62, 0.3, 2.48], [-0.62, 0.05, 2.48], 0.06, k.steel);
      k.tube(
        "hood",
        [
          [-0.62, 0.8, 2.48],
          [-0.62, 1.35, 2.42],
          [-0.62, 1.7, 2.3],
          [-0.62, 1.78, 2.1],
        ],
        0.05,
        k.steel,
      );
      k.panel("hood", [0.1, 0.06, 0.04], [-0.42, 0.72, 2.64], lampBar, 0.01);
      for (const side of sides) {
        k.lamp("hood", [side * 0.78, -0.05, 2.49], 0.13);
        k.panel("hood", [0.3, 0.05, 0.04], [side * 0.78, 0.14, 2.5], lampBar, 0.01);
      }
      // Aerator vent wand on the front lid corner with rising bubbles.
      k.bar("hood", [-0.88, 1.9, 2.15], [-0.88, 2.5, 2.15], 0.05, k.steel);
      k.bar("hood", [-0.88, 2.5, 2.15], [-0.88, 2.5, 1.95], 0.05, k.steel);
      k.oval("hood", [0.07, 0.05, 0.07], [-0.88, 2.52, 1.95], k.dark);
      const wandBubbles: Array<[number, number]> = [
        [0.05, 2.62],
        [-0.03, 2.74],
        [0.06, 2.86],
        [-0.02, 2.98],
        [0.04, 3.1],
      ];
      for (const [dx, y] of wandBubbles) bubble("hood", -0.88 + dx, y, 1.95, 0.045);

      // ---- Glass lid (roof): water surface, light bar, handle ----
      k.panel("roof", [2.04, 0.06, 4.54], [0, 2.02, 0], glass, 0.012);
      for (const sz of [-1, 1])
        k.panel("roof", [2.28, 0.1, 0.14], [0, 2.02, sz * 2.3], k.paint, 0.03);
      for (const side of sides)
        k.panel("roof", [0.14, 0.1, 4.6], [side * 1.08, 2.02, 0], k.paint, 0.03);
      k.panel("roof", [1.9, 0.03, 4.38], [0, 1.78, 0], surface, 0.008);
      k.panel("roof", [1.2, 0.1, 0.18], [0, 2.16, 1.6], k.steel, 0.02);
      k.panel("roof", [1.1, 0.05, 0.12], [0, 2.1, 1.6], lampBar, 0.01);
      for (const side of sides)
        k.panel("roof", [0.08, 0.12, 0.16], [side * 0.55, 2.08, 1.6], k.dark, 0.02);
      k.bar("roof", [-0.4, 2.2, -1.7], [0.4, 2.2, -1.7], 0.04, k.steel);
      for (const side of sides)
        k.bar("roof", [side * 0.4, 2.07, -1.7], [side * 0.4, 2.2, -1.7], 0.035, k.steel);
      for (const side of sides)
        k.panel("roof", [0.16, 0.08, 0.12], [side * 0.7, 2.05, -2.3], k.steel, 0.02);

      // ---- Side glass walls (doors): portholes, steps, markers ----
      for (const side of sides) {
        const d = door(side);
        k.panel(d, [0.06, 1.66, 4.42], [side * 1.02, 1.06, 0], glass, 0.012);
        k.panel(d, [0.12, 0.12, 4.6], [side * 1.02, 1.95, 0], k.paint, 0.03);
        k.panel(d, [0.12, 0.12, 4.6], [side * 1.02, 0.17, 0], k.paint, 0.03);
        k.panel(d, [0.1, 1.7, 0.12], [side * 1.02, 1.05, 0], k.paint, 0.02);
        porthole(d, side, 1.15);
        porthole(d, side, -1.15);
        k.bar(d, [side * 1.3, -0.28, -0.7], [side * 1.3, -0.28, 0.7], 0.05, k.steel);
        for (const z of [-0.5, 0, 0.5])
          k.panel(d, [0.3, 0.05, 0.18], [side * 1.3, -0.28, z], k.steel, 0.012);
        for (const z of [-0.6, 0.6])
          k.bar(d, [side * 1.15, -0.2, z], [side * 1.3, -0.28, z], 0.03, k.dark);
        k.panel(d, [0.05, 0.07, 0.14], [side * 1.09, 0.35, 2.1], k.amber, 0.012);
        k.panel(d, [0.05, 0.07, 0.14], [side * 1.09, 0.35, -2.1], k.red, 0.012);
      }

      // ---- Rear glass wall (bed): treasure chest, life ring ----
      k.panel("bed", [1.98, 1.66, 0.06], [0, 1.06, -2.3], glass, 0.012);
      for (const side of sides)
        k.panel("bed", [0.14, 1.9, 0.14], [side * 1.02, 1.05, -2.3], k.paint, 0.03);
      k.panel("bed", [2.18, 0.12, 0.12], [0, 1.95, -2.3], k.paint, 0.03);
      k.panel("bed", [2.18, 0.12, 0.12], [0, 0.17, -2.3], k.paint, 0.03);
      k.panel("bed", [1.6, 0.06, 0.05], [0, 1.83, -2.37], lampBar, 0.012);
      // Treasure chest with gold bands and spilled coins.
      k.panel("bed", [0.7, 0.36, 0.45], [0.35, 0.53, -1.7], wood, 0.03);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.225, 0.225, 0.7, 28).rotateZ(Math.PI / 2),
        [0.35, 0.71, -1.7],
        wood,
      );
      for (const dx of [-0.22, 0.22])
        k.panel("bed", [0.07, 0.4, 0.49], [0.35 + dx, 0.53, -1.7], brass, 0.01);
      k.panel("bed", [0.12, 0.16, 0.04], [0.35, 0.55, -1.46], brass, 0.01);
      const coins: Array<readonly [number, number, number]> = [
        [-0.1, 0.36, -1.45],
        [-0.02, 0.36, -1.55],
        [0.05, 0.36, -1.4],
        [0.75, 0.36, -1.5],
        [0.82, 0.36, -1.62],
        [-0.06, 0.375, -1.5],
        [0.78, 0.375, -1.56],
        [0.0, 0.39, -1.47],
      ];
      for (const [cx, cy, cz] of coins)
        k.mesh("bed", new T.CylinderGeometry(0.05, 0.05, 0.018, 20), [cx, cy, cz], brass);
      // Life ring mounted on the rear face.
      k.mesh(
        "bed",
        new T.TorusGeometry(0.3, 0.09, 14, 48),
        [-0.65, 1.25, -2.42],
        k.red,
      );
      for (let i = 0; i < 4; i++) {
        const arc = k.mesh(
          "bed",
          new T.TorusGeometry(0.3, 0.095, 14, 10, 0.7),
          [-0.65, 1.25, -2.42],
          k.white,
        );
        arc.rotation.z = (i * Math.PI) / 2;
      }
      k.panel("bed", [0.1, 0.3, 0.06], [-0.65, 1.72, -2.38], k.dark, 0.015);

      // ---- Tank base + seabed, front half (chassis-front) ----
      k.panel("chassis-front", [2.3, 0.5, 2.55], [0, -0.08, 1.2], k.paint, 0.06);
      k.panel("chassis-front", [2.36, 0.08, 2.6], [0, 0.13, 1.2], k.steel, 0.02);
      k.panel("chassis-front", [2.0, 0.15, 2.3], [0, -0.38, 1.2], k.dark, 0.03);
      k.panel("chassis-front", [1.9, 0.18, 2.19], [0, 0.26, 1.095], sand, 0.02);
      k.panel("chassis-front", [1.9, 1.45, 2.19], [0, 1.06, 1.095], water, 0.02);
      coral("chassis-front", -0.5, 1.5, coralRed, 0.3);
      coral("chassis-front", 0.45, 1.1, coralYellow, 1.7);
      coral("chassis-front", 0.1, 0.45, coralBlue, 3.1);
      fish("chassis-front", 0.2, 1.1, 0.8, 0.5);
      fish("chassis-front", -0.45, 0.9, 1.6, -2.2);
      k.panel("chassis-front", [0.18, 0.08, 0.18], [-0.7, 0.38, 1.9], k.dark, 0.02);
      const frontRise: Array<[number, number]> = [
        [0.0, 0.55],
        [0.03, 0.75],
        [-0.03, 0.95],
        [0.02, 1.15],
        [-0.02, 1.35],
        [0.0, 1.55],
      ];
      for (const [dx, y] of frontRise) bubble("chassis-front", -0.7 + dx, y, 1.9, 0.04);
      for (const [wx, wz, h] of [
        [0.75, 0.35, 0.55],
        [-0.75, 0.6, 0.7],
        [0.7, 1.85, 0.45],
      ] as const) {
        const blade = k.mesh(
          "chassis-front",
          new T.ConeGeometry(0.06, h, 10),
          [wx, 0.35 + h / 2, wz],
          weed,
        );
        blade.scale.x = 0.4;
      }
      k.bar("chassis-front", [0.75, -0.55, 0.5], [0.75, -0.55, -0.3], 0.26, k.steel);
      for (const z of [0.3, -0.1])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.27, 0.03, 10, 40),
          [0.75, -0.55, z],
          k.dark,
        );
      k.panel("chassis-front", [0.5, 0.4, 0.7], [-0.75, -0.5, 0.1], k.dark, 0.06);

      // ---- Tank base + seabed, rear half (chassis-rear) ----
      k.panel("chassis-rear", [2.3, 0.5, 2.55], [0, -0.08, -1.2], k.paint, 0.06);
      k.panel("chassis-rear", [2.36, 0.08, 2.6], [0, 0.13, -1.2], k.steel, 0.02);
      k.panel("chassis-rear", [2.0, 0.15, 2.3], [0, -0.38, -1.2], k.dark, 0.03);
      k.panel("chassis-rear", [1.9, 0.18, 2.19], [0, 0.26, -1.095], sand, 0.02);
      k.panel("chassis-rear", [1.9, 1.45, 2.19], [0, 1.06, -1.095], water, 0.02);
      coral("chassis-rear", -0.5, -1.3, coralPink, 2.2);
      coral("chassis-rear", -0.05, -0.6, coralYellow, 4.4);
      coral("chassis-rear", 0.62, -0.5, coralBlue, 5.6);
      fish("chassis-rear", 0.3, 1.2, -0.9, 2.6);
      fish("chassis-rear", -0.2, 0.8, -1.95, -0.6);
      k.panel("chassis-rear", [0.18, 0.08, 0.18], [0.65, 0.38, -2.0], k.dark, 0.02);
      const rearRise: Array<[number, number]> = [
        [0.0, 0.55],
        [-0.03, 0.75],
        [0.03, 0.95],
        [-0.02, 1.15],
        [0.02, 1.35],
        [0.0, 1.55],
      ];
      for (const [dx, y] of rearRise) bubble("chassis-rear", 0.65 + dx, y, -2.0, 0.04);
      for (const [wx, wz, h] of [
        [-0.75, -0.5, 0.6],
        [0.2, -2.0, 0.5],
        [-0.7, -2.05, 0.65],
      ] as const) {
        const blade = k.mesh(
          "chassis-rear",
          new T.ConeGeometry(0.06, h, 10),
          [wx, 0.35 + h / 2, wz],
          weed,
        );
        blade.scale.x = 0.4;
      }
      for (const side of sides)
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.45, -2.0],
          [side * 0.55, -0.45, -2.9],
          0.06,
          k.steel,
        );

      // ---- Running gear: painted fenders, shocks ----
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
      }

      // ---- Front bumper: chrome bullbar, hooks, plate ----
      k.panel("bumper-front", [2.3, 0.26, 0.3], [0, -0.15, 2.62], k.steel, 0.07);
      for (const side of sides)
        k.bar(
          "bumper-front",
          [side * 0.72, -0.24, 2.8],
          [side * 0.72, 0.6, 2.8],
          0.06,
          k.steel,
        );
      for (const y of [0.55, 0.05])
        k.bar("bumper-front", [-0.72, y, 2.8], [0.72, y, 2.8], 0.055, k.steel);
      for (const side of sides) {
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.95, -0.32, 2.62],
          k.dark,
        );
        k.lamp("bumper-front", [side * 0.45, -0.15, 2.78], 0.08);
      }
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.15, 2.78], k.white, 0.01);

      // ---- Rear bumper: anchor, lights, flaps ----
      k.panel("bumper-rear", [2.3, 0.24, 0.3], [0, -0.16, -2.62], k.dark, 0.07);
      k.tailLights(-2.79, 0.1);
      k.bar("bumper-rear", [0.7, -0.15, -2.82], [0.7, 0.85, -2.82], 0.055, k.dark);
      k.bar("bumper-rear", [0.35, 0.62, -2.82], [1.05, 0.62, -2.82], 0.045, k.dark);
      for (const sx of [0.35, 1.05])
        k.oval("bumper-rear", [0.06, 0.06, 0.06], [sx, 0.62, -2.82], k.steel);
      k.mesh(
        "bumper-rear",
        new T.TorusGeometry(0.09, 0.028, 10, 28),
        [0.7, 0.98, -2.82],
        k.steel,
      );
      for (const s of [-1, 1]) {
        k.bar(
          "bumper-rear",
          [0.7, -0.15, -2.82],
          [0.7 + s * 0.35, 0.05, -2.82],
          0.045,
          k.dark,
        );
        const fluke = k.mesh(
          "bumper-rear",
          new T.ConeGeometry(0.1, 0.24, 16),
          [0.7 + s * 0.35, 0.2, -2.82],
          k.dark,
        );
        fluke.rotation.z = -s * 0.5;
      }
      for (const side of sides) {
        k.bar(
          "bumper-rear",
          [side * 1.2, -0.2, -2.62],
          [side * 1.65, -0.25, -2.72],
          0.04,
          k.dark,
        );
        k.panel("bumper-rear", [0.55, 0.45, 0.06], [side * 1.65, -0.5, -2.74], k.dark, 0.03);
      }

      // Dark hub caps over the kit hubs.
      const caps = [
        ["wheel-fl", 2.06, 1.65],
        ["wheel-fr", -2.06, 1.65],
        ["wheel-rl", 2.06, -1.65],
        ["wheel-rr", -2.06, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.SphereGeometry(0.05, 16, 12),
          [x + Math.sign(x) * 0.04, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "comet-sled",
    "Comet Sled",
    "Jet-rail sled with a turbine pod, tail fin, and a parachute pack.",
    [8161957, 14698538, 2303788, 1, 5],
    (k) => {
      const canvas = finish(0x9a8f66, 0.9, 0);
      const canvasDark = finish(0x6b6244, 0.92, 0);
      const stripe = finish(0x8f1f14, 0.5, 0.1);
      const exhaustGlow = glow(0xaee2ff);
      const hotGlow = glow(0xff8c2e);

      // ---- Nose spike (bumper-front): spike cone, collar, crossbar ----
      k.mesh(
        "bumper-front",
        new T.ConeGeometry(0.22, 1.0, 40).rotateX(Math.PI / 2),
        [0, -0.05, 2.95],
        k.steel,
      );
      k.mesh(
        "bumper-front",
        new T.CylinderGeometry(0.26, 0.3, 0.3, 40).rotateX(Math.PI / 2),
        [0, -0.05, 2.5],
        k.steel,
      );
      k.mesh(
        "bumper-front",
        new T.TorusGeometry(0.28, 0.045, 12, 48),
        [0, -0.05, 2.42],
        k.dark,
      );
      k.bar("bumper-front", [-0.85, -0.12, 2.5], [0.85, -0.12, 2.5], 0.07, k.steel);
      k.panel("bumper-front", [1.5, 0.1, 0.5], [0, -0.32, 2.45], k.dark, 0.04);
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.3, -0.27, 2.45],
          [side * 0.28, -0.14, 2.45],
          0.04,
          k.steel,
        );
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.032, 10, 32),
          [side * 0.55, -0.3, 2.52],
          k.dark,
        );
        k.lamp("bumper-front", [side * 0.62, -0.12, 2.58], 0.07, k.amber);
      }

      // ---- Nose frame (hood): converging rails, cross braces ----
      k.bar("hood", [-0.8, 0.35, 1.2], [-0.16, -0.02, 2.5], 0.07, k.paint);
      k.bar("hood", [0.8, 0.35, 1.2], [0.16, -0.02, 2.5], 0.07, k.paint);
      k.bar("hood", [-0.8, -0.35, 1.2], [-0.16, -0.12, 2.5], 0.07, k.paint);
      k.bar("hood", [0.8, -0.35, 1.2], [0.16, -0.12, 2.5], 0.07, k.paint);
      for (const t of [0.25, 0.5, 0.75]) {
        const x = 0.8 + (0.16 - 0.8) * t;
        const z = 1.2 + (2.5 - 1.2) * t;
        const top = 0.35 + (-0.02 - 0.35) * t;
        const bot = -0.35 + (-0.12 + 0.35) * t;
        k.bar("hood", [-x, top, z], [x, top, z], 0.05, k.paint);
        k.bar("hood", [-x, bot, z], [x, bot, z], 0.05, k.paint);
        k.bar("hood", [-x, bot, z], [-x, top, z], 0.045, k.paint);
        k.bar("hood", [x, bot, z], [x, top, z], 0.045, k.paint);
        k.bar("hood", [-x, bot, z], [x, top, z], 0.035, k.steel);
      }
      k.bar("hood", [-0.8, -0.35, 1.2], [-0.8, 0.35, 1.2], 0.06, k.paint);
      k.bar("hood", [0.8, -0.35, 1.2], [0.8, 0.35, 1.2], 0.06, k.paint);
      for (const side of sides) {
        k.bar("hood", [side * 0.8, 0.35, 1.2], [side * 0.85, 0.42, 1.2], 0.06, k.paint);
        k.bar("hood", [side * 0.8, -0.35, 1.2], [side * 0.85, -0.38, 1.2], 0.06, k.paint);
      }
      k.panel("hood", [0.5, 0.08, 0.3], [0, 0.32, 2.0], k.dark, 0.03);
      for (const side of sides)
        k.panel("hood", [0.06, 0.2, 0.5], [side * 0.5, 0.1, 2.1], k.steel, 0.02);

      // ---- Front chassis: tank, shocks, plumbing, seat ----
      k.bar("chassis-front", [-0.8, -0.38, 2.3], [-0.8, -0.38, 0.4], 0.07, k.paint);
      k.bar("chassis-front", [0.8, -0.38, 2.3], [0.8, -0.38, 0.4], 0.07, k.paint);
      k.bar("chassis-front", [-0.8, -0.38, 1.4], [0.8, -0.38, 1.4], 0.06, k.paint);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.26, 0.26, 1.3, 40).rotateX(Math.PI / 2),
        [-0.48, -0.28, 0.95],
        k.steel,
      );
      k.oval("chassis-front", [0.26, 0.26, 0.14], [-0.48, -0.28, 1.6], k.steel);
      k.oval("chassis-front", [0.26, 0.26, 0.14], [-0.48, -0.28, 0.3], k.steel);
      for (const z of [0.62, 1.28])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.27, 0.03, 10, 40),
          [-0.48, -0.28, z],
          k.dark,
        );
      k.bar("chassis-front", [-0.48, -0.02, 0.95], [-0.48, 0.18, 0.95], 0.05, k.steel);
      k.tube(
        "chassis-front",
        [
          [-0.48, 0.18, 0.95],
          [-0.3, 0.3, 0.4],
          [-0.2, 0.5, 0.0],
          [-0.15, 0.66, -0.35],
        ],
        0.045,
        k.steel,
      );
      k.tube(
        "chassis-front",
        [
          [0.6, -0.3, 2.0],
          [0.66, -0.1, 1.2],
          [0.66, 0.1, 0.4],
          [0.5, 0.4, -0.2],
        ],
        0.05,
        k.dark,
      );
      k.panel("chassis-front", [1.5, 0.08, 2.0], [0, -0.5, 1.3], k.dark, 0.03);
      for (const side of sides)
        k.shock(
          "chassis-front",
          [side * 1.13, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          k.accent,
        );
      openSeat(k, 0, 1.0);
      k.panel("chassis-front", [0.4, 0.6, 0.5], [0.05, -0.08, 1.0], k.dark, 0.06);
      k.panel("chassis-front", [0.7, 0.22, 0.3], [0, 0.5, 1.62], k.dark, 0.05);
      for (const dx of [-0.18, 0, 0.18])
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.055, 0.055, 0.06, 20).rotateX(Math.PI / 2),
          [dx, 0.56, 1.45],
          k.steel,
        );

      // ---- Side trusses (doors): rails, verticals, diagonals, plumbing ----
      for (const side of sides) {
        const d = door(side);
        const x = side * 0.85;
        k.bar(d, [x, 0.42, 2.5], [x, 0.42, -2.3], 0.075, k.paint);
        k.bar(d, [x, -0.38, 2.5], [x, -0.38, -2.3], 0.075, k.paint);
        const posts = [2.3, 2.0, 1.2, 0.4, -0.4, -1.2, -2.0, -2.3];
        posts.forEach((z, i) => {
          k.bar(d, [x, -0.38, z], [x, 0.42, z], 0.05, k.paint);
          if (i < posts.length - 1)
            k.bar(
              d,
              [x, i % 2 ? 0.42 : -0.38, z],
              [x, i % 2 ? -0.38 : 0.42, posts[i + 1]],
              0.042,
              k.steel,
            );
        });
        k.tube(
          d,
          [
            [side * 1.0, 0.1, 2.2],
            [side * 1.02, 0.12, 1.0],
            [side * 1.02, 0.12, -1.0],
            [side * 1.0, 0.3, -2.2],
          ],
          0.048,
          k.steel,
        );
        k.tube(
          d,
          [
            [side * 1.0, -0.2, 2.2],
            [side * 1.02, -0.22, 0.0],
            [side * 1.0, -0.05, -2.2],
          ],
          0.038,
          k.dark,
        );
        k.panel(d, [0.2, 0.06, 0.5], [side * 0.95, 0.0, 1.0], k.steel, 0.02);
        k.panel(d, [0.05, 0.1, 1.2], [side * 1.06, 0.3, 0.2], k.accent, 0.02);
      }

      // ---- Cockpit (roof): windscreen, coaming, roll hoop ----
      k.panel("roof", [1.5, 0.12, 1.6], [0, 0.48, 1.25], k.paint, 0.05);
      k.panel("roof", [0.86, 0.5, 0.06], [0, 1.02, 1.95], k.glass, 0.025).rotation.x =
        -0.18;
      for (const side of sides) {
        k.bar("roof", [side * 0.45, 0.54, 2.0], [side * 0.45, 1.3, 1.87], 0.045, k.steel);
        k.panel("roof", [0.3, 0.18, 1.1], [side * 0.68, 0.56, 1.05], k.dark, 0.06);
        k.bar("roof", [side * 0.8, 0.42, 0.4], [side * 0.8, 1.3, 0.3], 0.05, k.paint);
        k.bar("roof", [side * 0.8, 1.3, 0.3], [side * 0.8, 0.42, -0.3], 0.05, k.paint);
        k.bar("roof", [side * 0.75, 0.48, 1.95], [side * 0.85, 0.42, 1.95], 0.04, k.paint);
      }
      k.bar("roof", [-0.45, 1.3, 1.87], [0.45, 1.3, 1.87], 0.045, k.steel);
      k.bar("roof", [-0.8, 1.3, 0.3], [0.8, 1.3, 0.3], 0.05, k.paint);
      k.panel("roof", [0.12, 0.2, 0.06], [0.5, 1.22, 1.89], k.dark, 0.02);
      k.panel("roof", [0.08, 0.14, 0.02], [0.5, 1.22, 1.93], k.steel, 0.008);

      // ---- Turbine pod, fin, chute pack (bed) ----
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.42, 0.38, 1.7, 56).rotateX(Math.PI / 2),
        [0, 0.8, -0.35],
        k.steel,
      );
      k.mesh("bed", new T.TorusGeometry(0.42, 0.075, 18, 72), [0, 0.8, 0.5], k.steel);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.37, 0.37, 0.3, 48).rotateX(Math.PI / 2),
        [0, 0.8, 0.38],
        k.dark,
      );
      k.mesh(
        "bed",
        new T.ConeGeometry(0.12, 0.32, 32).rotateX(Math.PI / 2),
        [0, 0.8, 0.5],
        k.steel,
      );
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const blade = k.panel("bed", [0.03, 0.3, 0.1], [0, 0.8, 0.38], k.steel, 0.01);
        blade.position.x = Math.cos(a) * 0.19;
        blade.position.y = 0.8 - 0.65 + Math.sin(a) * 0.19;
        blade.rotation.z = a;
      }
      for (const z of [0.1, -0.35, -0.8])
        k.mesh("bed", new T.TorusGeometry(0.41, 0.035, 12, 64), [0, 0.8, z], k.dark);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.3, 0.36, 0.55, 48).rotateX(-Math.PI / 2),
        [0, 0.8, -1.35],
        k.dark,
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.27, 0.27, 0.08, 40).rotateX(Math.PI / 2),
        [0, 0.8, -1.65],
        exhaustGlow,
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.14, 0.14, 0.1, 32).rotateX(Math.PI / 2),
        [0, 0.8, -1.66],
        hotGlow,
      );
      for (const z of [0.1, -0.8]) {
        k.bar("bed", [-0.85, 0.1, z], [0.85, 0.1, z], 0.05, k.paint);
        for (const side of sides)
          k.bar("bed", [side * 0.8, 0.1, z], [side * 0.3, 0.55, z], 0.07, k.paint);
      }
      k.panel("bed", [0.7, 0.12, 1.3], [0, 0.42, -0.35], k.dark, 0.04);
      // Tail fin with stripes.
      k.profile(
        "bed",
        [
          [-2.62, 0.3],
          [-1.68, 0.3],
          [-1.9, 2.55],
          [-2.5, 2.55],
        ],
        0.12,
        0,
        k.accent,
        0.04,
      );
      for (const side of sides)
        for (const [y, z, len] of [
          [1.85, -2.18, 0.6],
          [2.1, -2.19, 0.56],
        ] as const) {
          const s = k.panel("bed", [0.02, 0.12, len], [side * 0.1, y, z], stripe, 0.008);
          s.rotation.x = 0.06;
        }
      k.bar("bed", [0, 0.3, -1.68], [0, 2.55, -1.9], 0.04, k.dark);
      k.panel("bed", [0.2, 0.08, 0.5], [0, 2.58, -2.2], k.dark, 0.03);
      // Parachute pack on the fin leading edge.
      k.panel("bed", [0.72, 0.55, 0.36], [0, 1.4, -1.75], canvas, 0.09);
      k.panel("bed", [0.76, 0.12, 0.4], [0, 1.4, -1.75], canvasDark, 0.04);
      k.panel("bed", [0.12, 0.59, 0.4], [0, 1.4, -1.75], canvasDark, 0.04);
      for (const dx of [-0.2, 0.2])
        k.panel("bed", [0.1, 0.1, 0.05], [dx, 1.4, -1.55], k.steel, 0.02);
      k.mesh("bed", new T.TorusGeometry(0.07, 0.022, 10, 32), [0.42, 1.5, -1.75], k.red);
      k.tube(
        "bed",
        [
          [0.42, 1.5, -1.75],
          [0.6, 0.8, -0.8],
          [0.5, 0.6, 0.2],
        ],
        0.022,
        k.dark,
      );
      k.panel("bed", [1.5, 0.1, 1.0], [0, 0.32, -1.9], k.paint, 0.04);
      for (const side of sides)
        k.bar("bed", [side * 0.75, 0.32, -1.9], [side * 0.85, 0.42, -1.9], 0.04, k.paint);

      // ---- Rear chassis: rails, shocks, fuel cell, pipes ----
      k.bar("chassis-rear", [-0.8, -0.38, 0.4], [-0.8, -0.38, -2.3], 0.07, k.paint);
      k.bar("chassis-rear", [0.8, -0.38, 0.4], [0.8, -0.38, -2.3], 0.07, k.paint);
      k.bar("chassis-rear", [-0.8, -0.38, -1.4], [0.8, -0.38, -1.4], 0.06, k.paint);
      k.panel("chassis-rear", [1.2, 0.5, 0.9], [0, -0.1, -1.9], k.dark, 0.06);
      k.panel("chassis-rear", [1.24, 0.08, 0.94], [0, -0.1, -1.9], k.steel, 0.02);
      for (const side of sides) {
        k.shock(
          "chassis-rear",
          [side * 1.13, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          k.accent,
        );
        k.tube(
          "chassis-rear",
          [
            [side * 0.3, 0.65, -1.2],
            [side * 0.5, 0.2, -1.6],
            [side * 0.6, -0.2, -2.2],
          ],
          0.055,
          k.steel,
        );
        k.bar(
          "chassis-rear",
          [side * 0.6, -0.2, -2.2],
          [side * 0.6, -0.2, -2.55],
          0.07,
          k.dark,
        );
        k.bar(
          "chassis-rear",
          [side * 0.85, -0.38, -2.3],
          [side * 0.85, -0.38, -2.5],
          0.06,
          k.paint,
        );
      }

      // ---- Rear bumper: bar, lights, flaps, hitch ----
      k.panel("bumper-rear", [1.9, 0.22, 0.3], [0, -0.15, -2.6], k.dark, 0.07);
      k.bar("bumper-rear", [-0.95, -0.15, -2.6], [0.95, -0.15, -2.6], 0.06, k.steel);
      k.tailLights(-2.77, 0.05);
      for (const side of sides)
        k.panel("bumper-rear", [0.5, 0.4, 0.06], [side * 1.55, -0.55, -2.78], k.dark, 0.03);
      k.bar("bumper-rear", [0, -0.3, -2.65], [0, -0.3, -2.95], 0.055, k.steel);

      // Dark hub caps over the kit hubs.
      const caps = [
        ["wheel-fl", 2.14, 1.65],
        ["wheel-fr", -2.14, 1.65],
        ["wheel-rl", 2.14, -1.65],
        ["wheel-rr", -2.14, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.SphereGeometry(0.05, 16, 12),
          [x + Math.sign(x) * 0.04, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "battle-tank",
    "Battle Tank",
    "Army battle tank with a rotating turret, cannon, and reactive armor.",
    [5923126, 3025444, 3882808, 0.95, 6],
    (k) => {
      const era = finish(0x535b33, 0.55, 0.3);
      const eraDark = finish(0x424a28, 0.6, 0.25);
      const deckGreen = finish(0x4a5230, 0.7, 0.2);
      const cable = finish(0x3a3f42, 0.5, 0.7);
      const canvas = finish(0x6b6a4d, 0.9, 0);

      // ---- Front glacis (hood): sloped nose, ERA grid, lights, hatches ----
      k.hull("hood", [
        [0.42, -0.2, 0.72, 1.18, 1.12],
        [1.5, -0.22, 0.5, 1.12, 1.02],
        [2.5, -0.25, 0.12, 1.02, 0.88],
      ]);
      const glacisTilt = 0.28;
      k.panel("hood", [1.95, 0.09, 2.25], [0, 0.46, 1.45], k.paint, 0.04).rotation.x =
        glacisTilt;
      // Reactive-armor block grid laid on the glacis slope.
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 5; col++) {
          const z = 0.85 + row * 0.42;
          const y = 0.555 - (z - 1.45) * 0.288;
          k.panel(
            "hood",
            [0.3, 0.1, 0.34],
            [(col - 2) * 0.35, y, z],
            (row + col) % 2 ? era : eraDark,
            0.02,
          ).rotation.x = glacisTilt;
        }
      // Driver hatch and periscope slits on the glacis crown.
      k.panel("hood", [0.5, 0.07, 0.55], [-0.55, 0.74, 0.6], deckGreen, 0.02).rotation.x =
        glacisTilt;
      for (let i = 0; i < 3; i++)
        k.panel(
          "hood",
          [0.09, 0.06, 0.05],
          [-0.67 + i * 0.12, 0.79, 0.44],
          k.glass,
          0.012,
        );
      // Glacis bolt row along the nose.
      for (let i = 0; i < 9; i++)
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.035, 0.035, 0.05, 12).rotateX(Math.PI / 2),
          [-0.8 + i * 0.2, -0.05, 2.52],
          k.dark,
        );
      // Front fender decks with headlights, brush guards, tow eyes.
      for (const side of sides) {
        k.panel("hood", [1.0, 0.09, 0.95], [side * 1.45, 0.32, 2.07], k.paint, 0.03);
        for (let i = 0; i < 5; i++)
          k.panel(
            "hood",
            [0.6, 0.03, 0.08],
            [side * 1.5, 0.38, 1.7 + i * 0.18],
            k.dark,
            0.01,
          );
        k.lamp("hood", [side * 1.5, 0.44, 2.42], 0.09);
        k.mesh(
          "hood",
          new T.TorusGeometry(0.12, 0.022, 10, 32),
          [side * 1.5, 0.44, 2.5],
          k.dark,
        );
        for (const dz of [-0.05, 0.05])
          k.bar(
            "hood",
            [side * 1.5 - 0.12, 0.32, 2.5 + dz],
            [side * 1.5 + 0.12, 0.56, 2.5 + dz],
            0.018,
            k.dark,
          );
        k.mesh(
          "hood",
          new T.TorusGeometry(0.08, 0.03, 10, 28),
          [side * 0.55, 0.02, 2.53],
          k.dark,
        );
      }

      // ---- Turret (roof): faceted turret, cannon, hatches, sights ----
      k.mesh(
        "roof",
        new T.CylinderGeometry(1.02, 1.1, 0.2, 56),
        [0, 0.6, -0.3],
        k.dark,
      );
      k.hull("roof", [
        [0.78, 0.62, 1.22, 0.6, 0.75],
        [-0.3, 0.62, 1.48, 1.02, 0.86],
        [-1.55, 0.68, 1.32, 0.88, 0.72],
      ]);
      k.panel("roof", [1.62, 0.1, 2.15], [0, 1.5, -0.38], k.paint, 0.04);
      // Turret ERA: angled cheek blocks plus flank rows fitted to the taper.
      for (const side of sides) {
        for (let r = 0; r < 2; r++)
          for (let c = 0; c < 2; c++)
            k.panel(
              "roof",
              [0.24, 0.24, 0.12],
              [side * (0.48 + c * 0.28), 0.92 + r * 0.28, 0.74 - c * 0.16],
              (r + c) % 2 ? era : eraDark,
              0.02,
            );
        for (let r = 0; r < 2; r++)
          for (let c = 0; c < 4; c++) {
            const z = -0.5 - c * 0.27;
            const t = (Math.abs(z) - 0.3) / 1.25;
            const x = 1.02 - t * 0.14 + 0.05;
            k.panel(
              "roof",
              [0.12, 0.24, 0.26],
              [side * x, 0.92 + r * 0.28, z],
              (r + c) % 2 ? era : eraDark,
              0.02,
            );
          }
        // Smoke-grenade launcher cluster on each cheek.
        for (let i = 0; i < 4; i++) {
          const tube = k.mesh(
            "roof",
            new T.CylinderGeometry(0.045, 0.05, 0.3, 16),
            [side * 0.72, 1.32, 0.28 + i * 0.1],
            k.dark,
          );
          tube.rotation.set(0.5, 0, side * -0.35);
        }
      }
      // Mantlet and long cannon with fume extractor and muzzle brake.
      k.panel("roof", [0.72, 0.5, 0.42], [0, 1.04, 0.82], k.accent, 0.06);
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.2, 0.24, 0.35, 32).rotateX(Math.PI / 2),
        [0, 1.06, 0.95],
        k.dark,
      );
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.085, 0.115, 2.5, 40).rotateX(Math.PI / 2),
        [0, 1.06, 2.2],
        k.paint,
      );
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.13, 0.13, 0.4, 32).rotateX(Math.PI / 2),
        [0, 1.06, 1.9],
        k.accent,
      );
      for (const z of [1.55, 2.35, 2.8])
        k.mesh("roof", new T.TorusGeometry(0.105, 0.022, 12, 48), [0, 1.06, z], k.dark);
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.15, 0.15, 0.55, 32).rotateX(Math.PI / 2),
        [0, 1.06, 3.15],
        k.accent,
      );
      for (const side of sides)
        k.panel(
          "roof",
          [0.06, 0.18, 0.3],
          [side * 0.15, 1.06, 3.15],
          k.dark,
          0.015,
        );
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.1, 0.1, 0.06, 24).rotateX(Math.PI / 2),
        [0, 1.06, 3.44],
        k.dark,
      );
      // Commander + loader hatches, periscope ring, boxy sights.
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.3, 0.32, 0.12, 40),
        [0.42, 1.58, -0.85],
        k.accent,
      );
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.26, 0.26, 0.06, 40),
        [0.42, 1.66, -0.85],
        k.paint,
      );
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        k.panel(
          "roof",
          [0.08, 0.08, 0.08],
          [0.42 + Math.cos(a) * 0.36, 1.6, -0.85 + Math.sin(a) * 0.36],
          k.glass,
          0.015,
        );
      }
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.28, 0.3, 0.1, 40),
        [-0.45, 1.57, -0.7],
        k.accent,
      );
      for (const [x, z] of [
        [0.42, -0.15],
        [-0.35, 0.1],
      ] as const) {
        k.panel("roof", [0.2, 0.24, 0.18], [x, 1.66, z], k.accent, 0.02);
        k.panel("roof", [0.14, 0.12, 0.04], [x, 1.66, z + 0.1], k.glass, 0.01);
      }
      // Bustle rack with tarp roll and crates.
      for (const side of sides) {
        k.bar("roof", [side * 0.7, 1.15, -1.55], [side * 0.7, 1.15, -2.0], 0.035, k.dark);
        k.bar("roof", [side * 0.7, 1.15, -2.0], [side * 0.7, 1.45, -2.0], 0.03, k.dark);
      }
      k.bar("roof", [-0.7, 1.15, -2.0], [0.7, 1.15, -2.0], 0.035, k.dark);
      k.bar("roof", [-0.7, 1.45, -2.0], [0.7, 1.45, -2.0], 0.03, k.dark);
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.14, 0.14, 1.3, 24).rotateZ(Math.PI / 2),
        [0, 1.32, -1.85],
        canvas,
      );
      k.panel("roof", [0.5, 0.3, 0.4], [-0.35, 1.3, -1.78], deckGreen, 0.03);
      // Antenna and turret-ring bolts.
      k.bar("roof", [-0.6, 1.55, -1.4], [-0.65, 2.6, -1.5], 0.015, k.dark);
      k.mesh("roof", new T.SphereGeometry(0.03, 12, 8), [-0.65, 2.6, -1.5], k.red);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        k.mesh(
          "roof",
          new T.SphereGeometry(0.04, 12, 8),
          [Math.cos(a) * 1.06, 0.62, -0.3 + Math.sin(a) * 1.06],
          k.dark,
        );
      }

      // ---- Hull flanks (doors): plates, skirts, ERA, cables, cans, tools ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [-1.7, -0.08],
            [1.3, -0.08],
            [1.1, 0.6],
            [-1.55, 0.66],
          ],
          0.12,
          side * 1.14,
          k.paint,
          0.035,
        );
        k.panel(d, [0.8, 0.1, 2.4], [side * 1.55, 0.32, 0.4], k.paint, 0.03);
        for (const z of [1.15, -0.25, -1.6])
          k.panel(d, [0.08, 0.34, 1.0], [side * 1.92, 0.45, z], k.dark, 0.02);
        for (let r = 0; r < 2; r++)
          for (let c = 0; c < 6; c++)
            k.panel(
              d,
              [0.12, 0.22, 0.3],
              [side * 1.24, 0.12 + r * 0.25, 0.95 - c * 0.44],
              (r + c) % 2 ? era : eraDark,
              0.02,
            );
        // Tow cable run with coiled loops on the fender deck.
        k.tube(
          d,
          [
            [side * 1.3, 0.55, 1.0],
            [side * 1.32, 0.5, 0.2],
            [side * 1.3, 0.55, -0.6],
            [side * 1.32, 0.5, -1.3],
          ],
          0.035,
          cable,
          48,
        );
        for (const z of [0.75, 0.35])
          k.mesh(
            d,
            new T.TorusGeometry(0.22, 0.04, 12, 40),
            [side * 1.55, 0.4, z],
            cable,
          ).rotation.x = Math.PI / 2;
        // Jerry cans, pioneer tools, extinguisher, markers.
        for (let i = 0; i < 2; i++) {
          const z = -0.55 + i * 0.42;
          k.panel(d, [0.34, 0.44, 0.2], [side * 1.55, 0.6, z], deckGreen, 0.02);
          k.bar(d, [side * 1.44, 0.83, z], [side * 1.66, 0.83, z], 0.02, k.dark);
          k.mesh(
            d,
            new T.CylinderGeometry(0.04, 0.04, 0.05, 12),
            [side * 1.55, 0.84, z],
            k.dark,
          );
          k.panel(d, [0.36, 0.06, 0.22], [side * 1.55, 0.6, z], k.dark, 0.01);
        }
        k.bar(d, [side * 1.62, 0.4, 1.0], [side * 1.62, 0.4, 1.5], 0.022, k.steel);
        k.bar(d, [side * 1.42, 0.4, 1.0], [side * 1.42, 0.4, 1.45], 0.025, deckGreen);
        k.panel(d, [0.02, 0.06, 0.22], [side * 1.42, 0.42, 1.5], k.steel, 0.008);
        k.mesh(
          d,
          new T.CylinderGeometry(0.06, 0.06, 0.3, 16),
          [side * 1.75, 0.55, -0.5],
          k.red,
        );
        k.bar(d, [side * 1.92, 0.55, -0.5], [side * 1.75, 0.55, -0.5], 0.02, k.dark);
        k.panel(d, [0.05, 0.06, 0.14], [side * 1.97, 0.5, 0.4], k.amber, 0.012);
        k.panel(d, [0.05, 0.06, 0.14], [side * 1.97, 0.5, -1.0], k.red, 0.012);
      }

      // ---- Rear deck (bed): engine grilles, cans, cable coil, stowage ----
      k.hull("bed", [
        [-2.6, -0.2, 0.45, 1.05, 1.1],
        [0.3, -0.2, 0.6, 1.15, 1.1],
      ]);
      k.panel("bed", [2.0, 0.09, 1.7], [0, 0.66, -1.45], deckGreen, 0.03);
      for (const side of sides) {
        k.panel("bed", [0.8, 0.06, 1.2], [side * 0.5, 0.72, -1.45], k.dark, 0.02);
        for (let i = 0; i < 8; i++)
          k.panel(
            "bed",
            [0.7, 0.05, 0.08],
            [side * 0.5, 0.75, -1.9 + i * 0.13],
            k.steel,
            0.012,
          );
        k.panel("bed", [0.8, 0.1, 1.7], [side * 1.55, 0.32, -1.7], k.paint, 0.03);
        for (let i = 0; i < 4; i++)
          k.panel(
            "bed",
            [0.6, 0.03, 0.08],
            [side * 1.55, 0.38, -2.3 + i * 0.3],
            k.dark,
            0.01,
          );
      }
      for (let i = 0; i < 4; i++) {
        const x = -0.6 + i * 0.4;
        k.panel("bed", [0.3, 0.42, 0.18], [x, 0.9, -2.25], deckGreen, 0.02);
        k.bar("bed", [x - 0.1, 1.13, -2.25], [x + 0.1, 1.13, -2.25], 0.018, k.dark);
      }
      k.bar("bed", [-0.85, 0.85, -2.25], [0.85, 0.85, -2.25], 0.025, k.dark);
      k.mesh(
        "bed",
        new T.TorusGeometry(0.28, 0.045, 12, 48),
        [0.6, 0.74, -0.7],
        cable,
      ).rotation.x = Math.PI / 2;
      k.mesh(
        "bed",
        new T.TorusGeometry(0.28, 0.045, 12, 48),
        [0.6, 0.82, -0.7],
        cable,
      ).rotation.x = Math.PI / 2;
      k.tube(
        "bed",
        [
          [0.6, 0.8, -0.7],
          [0.2, 0.78, -0.5],
          [-0.3, 0.76, -0.6],
        ],
        0.04,
        cable,
        32,
      );
      k.panel("bed", [0.7, 0.35, 0.5], [-0.55, 0.88, -0.75], k.accent, 0.03);
      k.panel("bed", [0.74, 0.08, 0.54], [-0.55, 1.07, -0.75], k.dark, 0.02);

      // ---- Front bumper: armored beam, tow eyes, spare track links ----
      k.panel("bumper-front", [2.1, 0.42, 0.3], [0, -0.2, 2.62], k.accent, 0.07);
      k.panel("bumper-front", [1.9, 0.1, 0.32], [0, -0.02, 2.62], k.dark, 0.03);
      for (const side of sides)
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.1, 0.035, 12, 32),
          [side * 0.6, -0.22, 2.78],
          k.dark,
        );
      for (let i = 0; i < 5; i++)
        k.panel(
          "bumper-front",
          [0.24, 0.16, 0.1],
          [-0.5 + i * 0.25, -0.2, 2.79],
          k.dark,
          0.02,
        );
      k.bar("bumper-front", [0, -0.35, 2.6], [0, -0.35, 2.85], 0.05, k.steel);

      // ---- Rear bumper: plate, exhaust louvers, lights, hitch ----
      k.panel("bumper-rear", [2.15, 0.6, 0.24], [0, -0.05, -2.68], k.accent, 0.07);
      for (const side of sides) {
        k.panel("bumper-rear", [0.7, 0.4, 0.08], [side * 0.55, 0.05, -2.8], k.dark, 0.02);
        for (let i = 0; i < 5; i++)
          k.panel(
            "bumper-rear",
            [0.6, 0.045, 0.05],
            [side * 0.55, -0.08 + i * 0.09, -2.85],
            k.steel,
            0.01,
          );
        k.lamp("bumper-rear", [side * 1.0, -0.15, -2.8], 0.07, k.red, -1);
      }
      k.bar("bumper-rear", [0, -0.3, -2.7], [0, -0.3, -3.0], 0.06, k.dark);

      // ---- Chassis dressing: arches, shocks, drives, belly, bolts ----
      fenders(k, k.dark);
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.13, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          k.accent,
        );
        k.shock(
          "chassis-rear",
          [side * 1.13, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          k.accent,
        );
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.3, 0.3, 0.3, 24).rotateZ(Math.PI / 2),
          [side * 1.1, -0.8, 1.65],
          k.accent,
        );
        k.mesh(
          "chassis-rear",
          new T.CylinderGeometry(0.3, 0.3, 0.3, 24).rotateZ(Math.PI / 2),
          [side * 1.1, -0.8, -1.65],
          k.accent,
        );
        k.bar(
          "chassis-front",
          [side * 0.8, -0.4, 1.65],
          [side * 1.4, -0.75, 1.65],
          0.07,
          k.dark,
        );
        k.bar(
          "chassis-rear",
          [side * 0.8, -0.4, -1.65],
          [side * 1.4, -0.75, -1.65],
          0.07,
          k.dark,
        );
      }
      k.panel("chassis-front", [1.6, 0.25, 1.6], [0, -0.5, 0.9], k.dark, 0.05);
      k.panel("chassis-rear", [1.6, 0.25, 1.4], [0, -0.5, -1.5], k.dark, 0.05);
      for (const side of sides)
        for (let i = 0; i < 6; i++) {
          k.mesh(
            "chassis-front",
            new T.SphereGeometry(0.035, 10, 8),
            [side * 0.82, -0.42, 0.3 + i * 0.25],
            k.steel,
          );
          k.mesh(
            "chassis-rear",
            new T.SphereGeometry(0.035, 10, 8),
            [side * 0.82, -0.42, -2.2 + i * 0.25],
            k.steel,
          );
        }

      // Dark hub caps with bolt circles over the kit hubs.
      const caps = [
        ["wheel-fl", 2.14, 1.65],
        ["wheel-fr", -2.14, 1.65],
        ["wheel-rl", 2.14, -1.65],
        ["wheel-rr", -2.14, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.16, 0.16, 0.08, 24).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          k.mesh(
            part,
            new T.SphereGeometry(0.03, 10, 8),
            [
              x + Math.sign(x) * 0.05,
              -0.85 + Math.cos(a) * 0.22,
              z + Math.sin(a) * 0.22,
            ],
            k.steel,
          );
        }
      }
    },
  ),
  vehicle(
    "bullet-train",
    "Bullet Train",
    "Shinkansen-nose speed train with a pantograph and stripe windows.",
    [15265010, 2381506, 5001816, 0.78, 8],
    (k) => {
      const skirt = finish(0x878d93, 0.48, 0.55);
      const skirtDark = finish(0x3a4046, 0.62, 0.4);
      const ceramic = finish(0xe9e4d8, 0.35, 0.05);
      const headGlow = glow(0xfff3da);
      const stripe = k.accent;

      // ---- Nose (hood): long shinkansen duck-bill, cab glass, light band ----
      k.hull("hood", [
        [0.45, -0.05, 1.92, 1.16, 1.06],
        [1.3, -0.12, 1.62, 1.13, 0.98],
        [2.0, -0.18, 1.05, 1.05, 0.82],
        [2.55, -0.28, 0.52, 0.88, 0.6],
        [2.78, -0.3, 0.3, 0.72, 0.5],
      ]);
      k.oval("hood", [0.72, 0.3, 0.3], [0, 0.02, 2.72], k.paint);
      k.oval("hood", [0.6, 0.16, 0.22], [0, -0.2, 2.66], skirt);
      // Wraparound windshield: sloped glass band fitted to the nose crown.
      const shieldTilt = -Math.atan2(0.85, 0.3);
      k.panel("hood", [1.56, 0.8, 0.07], [0, 1.78, 0.88], k.dark, 0.03).rotation.x =
        shieldTilt;
      k.panel("hood", [1.44, 0.7, 0.06], [0, 1.81, 0.89], k.glass, 0.025).rotation.x =
        shieldTilt;
      k.bar("hood", [0, 1.97, 0.57], [0, 1.73, 1.25], 0.035, k.dark);
      // Cab roof brow bridging the windshield top into the coach roof.
      k.panel("hood", [1.9, 0.1, 1.0], [0, 1.83, 0.75], k.paint, 0.04).rotation.x =
        0.27;
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.72, 1.97, 0.57],
          [side * 0.72, 1.73, 1.25],
          0.025,
          k.dark,
        );
        k.bar(
          "hood",
          [side * 0.78, 1.68, 1.28],
          [side * 0.95, 1.95, 0.5],
          0.055,
          k.paint,
        );
        // Wiper blades parked on the glass.
        k.bar(
          "hood",
          [side * 0.3, 1.71, 1.21],
          [side * 0.52, 1.78, 1.0],
          0.014,
          k.dark,
        );
        // Cab side windows with frames, tilted to the nose taper.
        k.panel(
          "hood",
          [0.07, 0.52, 0.72],
          [side * 1.06, 1.45, 0.78],
          k.dark,
          0.02,
        ).rotation.z = side * 0.07;
        const cabGlass = k.panel(
          "hood",
          [0.06, 0.42, 0.6],
          [side * 1.09, 1.45, 0.78],
          k.glass,
          0.02,
        );
        cabGlass.rotation.z = side * 0.07;
        cabGlass.rotation.y = -side * 0.09;
        k.bar(
          "hood",
          [side * 1.12, 1.24, 0.78],
          [side * 1.09, 1.66, 0.78],
          0.02,
          k.steel,
        );
        // Blue cheatline sweeping into the nose.
        k.panel(
          "hood",
          [0.05, 0.2, 1.2],
          [side * 1.025, 0.98, 1.2],
          stripe,
          0.018,
        ).rotation.y = -side * 0.165;
        k.panel(
          "hood",
          [0.05, 0.05, 1.2],
          [side * 1.025, 1.13, 1.2],
          k.steel,
          0.015,
        ).rotation.y = -side * 0.165;
        // Lower nose rub strips following the taper.
        k.bar(
          "hood",
          [side * 0.97, -0.15, 2.2],
          [side * 0.77, -0.22, 2.68],
          0.012,
          skirtDark,
        );
      }
      // Headlight band across the nose + crown lamps + number board.
      k.panel("hood", [1.0, 0.1, 0.1], [0, 0.42, 2.63], headGlow, 0.03);
      for (const side of sides) {
        k.lamp("hood", [side * 0.7, 0.18, 2.62], 0.11);
        k.lamp("hood", [side * 0.5, 0.62, 2.44], 0.06, k.amber);
        k.mesh(
          "hood",
          new T.SphereGeometry(0.045, 16, 12),
          [side * 0.28, 1.06, 2.02],
          k.steel,
        );
      }
      k.panel("hood", [0.5, 0.12, 0.08], [0, 0.82, 2.3], k.dark, 0.025).rotation.x =
        -0.8;
      k.panel("hood", [0.4, 0.07, 0.06], [0, 0.856, 2.335], headGlow, 0.02).rotation.x =
        -0.8;
      k.panel("hood", [0.44, 0.3, 0.1], [0, -0.12, 2.79], skirtDark, 0.03);

      // ---- Carbody + roof gear: long coach, pantograph, insulators, AC ----
      k.hull("roof", [
        [0.5, 0.15, 1.95, 1.16, 1.06],
        [0.0, 0.15, 1.98, 1.16, 1.06],
        [-1.3, 0.15, 1.95, 1.16, 1.06],
      ]);
      k.panel("roof", [2.0, 0.14, 2.7], [0, 2.0, -0.85], k.paint, 0.06);
      for (const x of [-0.7, 0, 0.7])
        k.bar("roof", [x, 2.08, 0.4], [x, 2.08, -2.15], 0.014, skirt);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 1.04, 1.985, 0.45],
          [side * 1.04, 1.985, -2.15],
          0.02,
          skirt,
        );
      // Pantograph: base rails, insulator stacks, diamond arms, contact strip.
      const pantZ = -0.9;
      for (const side of sides)
        k.panel(
          "roof",
          [0.12, 0.07, 1.0],
          [side * 0.55, 2.1, pantZ],
          skirtDark,
          0.02,
        );
      const insulator = (x: number, z: number) => {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.075, 0.09, 0.05, 20),
          [x, 2.15, z],
          skirtDark,
        );
        for (let i = 0; i < 3; i++)
          k.mesh(
            "roof",
            new T.CylinderGeometry(0.052, 0.052, 0.06, 20),
            [x, 2.21 + i * 0.075, z],
            ceramic,
          );
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.06, 0.045, 0.05, 20),
          [x, 2.42, z],
          skirtDark,
        );
      };
      for (const side of sides)
        for (const dz of [-0.38, 0.38]) insulator(side * 0.55, pantZ + dz);
      for (const side of sides) {
        k.bar(
          "roof",
          [side * 0.55, 2.44, pantZ - 0.38],
          [side * 0.16, 2.66, pantZ],
          0.028,
          skirtDark,
        );
        k.bar(
          "roof",
          [side * 0.55, 2.44, pantZ + 0.38],
          [side * 0.16, 2.66, pantZ],
          0.028,
          skirtDark,
        );
        k.bar(
          "roof",
          [side * 0.16, 2.66, pantZ],
          [side * 0.42, 2.78, pantZ],
          0.022,
          skirtDark,
        );
      }
      k.bar("roof", [-0.16, 2.66, pantZ], [0.16, 2.66, pantZ], 0.024, skirtDark);
      k.panel("roof", [1.5, 0.05, 0.16], [0, 2.8, pantZ], skirtDark, 0.018);
      k.panel("roof", [1.56, 0.025, 0.06], [0, 2.83, pantZ], k.steel, 0.01);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.75, 2.8, pantZ],
          [side * 0.9, 2.7, pantZ],
          0.018,
          skirtDark,
        );
      // Extra white insulator stacks aft of the pantograph.
      for (const x of [-0.32, 0, 0.32]) insulator(x, -1.62);
      // Roof AC pods with grille slats.
      for (const z of [0.1, -1.95]) {
        k.panel("roof", [1.1, 0.15, 0.68], [0, 2.12, z], skirt, 0.05);
        for (let i = 0; i < 5; i++)
          k.panel(
            "roof",
            [0.9, 0.03, 0.07],
            [0, 2.2, z - 0.24 + i * 0.12],
            skirtDark,
            0.01,
          );
        for (const side of sides)
          k.panel("roof", [0.04, 0.08, 0.5], [side * 0.58, 2.1, z], skirtDark, 0.012);
      }
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.02, 0.03, 0.4, 12),
        [0.4, 2.28, 0.3],
        skirtDark,
      );
      k.oval("roof", [0.09, 0.06, 0.09], [-0.45, 2.1, 0.25], k.glass);

      // ---- Coach sides: window band, blue stripe, plug doors ----
      for (const side of sides) {
        const part = door(side);
        k.panel(part, [0.1, 1.35, 3.3], [side * 1.16, 0.55, -0.6], k.paint, 0.04);
        k.panel(part, [0.14, 0.56, 2.8], [side * 1.16, 1.48, -0.6], k.dark, 0.02);
        for (let i = 0; i < 6; i++) {
          const z = 0.68 - i * 0.51;
          k.panel(part, [0.06, 0.42, 0.38], [side * 1.235, 1.48, z], k.glass, 0.02);
          k.panel(
            part,
            [0.065, 0.46, 0.045],
            [side * 1.23, 1.48, z - 0.255],
            k.steel,
            0.012,
          );
        }
        k.panel(part, [0.065, 0.05, 2.8], [side * 1.23, 1.78, -0.6], k.steel, 0.012);
        k.panel(part, [0.06, 0.22, 3.1], [side * 1.21, 1.02, -0.6], stripe, 0.018);
        k.panel(part, [0.06, 0.05, 3.1], [side * 1.21, 1.17, -0.6], k.steel, 0.012);
        // Plug doors with porthole windows.
        for (const z of [0.32, -1.32]) {
          k.panel(part, [0.05, 1.15, 0.62], [side * 1.2, 0.62, z], k.dark, 0.015);
          k.panel(part, [0.05, 1.07, 0.54], [side * 1.21, 0.62, z], k.paint, 0.015);
          k.panel(part, [0.05, 0.4, 0.34], [side * 1.22, 1.32, z], k.glass, 0.015);
          k.panel(
            part,
            [0.05, 0.05, 0.2],
            [side * 1.23, 0.5, z - 0.12],
            k.steel,
            0.012,
          );
          const stepW = z > -0.5 ? 0.16 : 0.14;
          const stepX = z > -0.5 ? 1.2 : 1.18;
          k.panel(
            part,
            [stepW, 0.05, 0.5],
            [side * stepX, -0.02, z],
            skirtDark,
            0.015,
          );
        }
        // Lower vent louvers + rub rail + emblem.
        for (let i = 0; i < 4; i++)
          k.panel(
            part,
            [0.05, 0.05, 0.3],
            [side * 1.22, 0.12, -0.15 - i * 0.22],
            skirtDark,
            0.01,
          );
        k.bar(
          part,
          [side * 1.23, -0.08, 1.0],
          [side * 1.23, -0.08, -2.2],
          0.025,
          skirt,
        );
        k.panel(
          part,
          [0.06, 0.18, 0.18],
          [side * 1.22, 0.62, -0.5],
          stripe,
          0.015,
        ).rotation.x = Math.PI / 4;
      }

      // ---- Tail (bed): blunt cap, rear glass, light clusters ----
      k.hull("bed", [
        [-1.2, 0.15, 1.9, 1.13, 1.03],
        [-2.5, 0.12, 1.82, 1.1, 1.0],
        [-2.62, 0.1, 1.7, 1.05, 0.95],
      ]);
      k.panel("bed", [2.0, 1.5, 0.14], [0, 0.95, -2.58], k.paint, 0.05);
      k.panel("bed", [1.9, 0.12, 0.9], [0, 1.9, -2.1], k.paint, 0.05).rotation.x =
        -0.1;
      k.panel("bed", [1.34, 0.62, 0.08], [0, 1.38, -2.64], k.dark, 0.03);
      k.panel("bed", [1.2, 0.5, 0.07], [0, 1.38, -2.67], k.glass, 0.025);
      k.bar("bed", [0, 1.14, -2.7], [0.3, 1.5, -2.7], 0.014, k.dark);
      k.panel("bed", [2.02, 0.22, 0.1], [0, 1.0, -2.62], stripe, 0.03);
      k.panel("bed", [2.02, 0.05, 0.1], [0, 1.15, -2.62], k.steel, 0.015);
      for (const side of sides) {
        k.lamp("bed", [side * 0.82, 0.68, -2.64], 0.11, k.red, -1);
        k.lamp("bed", [side * 0.82, 0.42, -2.64], 0.07, k.red, -1);
        k.panel("bed", [0.3, 0.5, 0.06], [side * 0.82, 0.55, -2.64], k.dark, 0.02);
        k.panel(
          "bed",
          [0.34, 0.42, 0.12],
          [side * 1.0, -0.05, -2.55],
          skirtDark,
          0.03,
        );
      }
      k.panel("bed", [0.5, 0.14, 0.08], [0, 0.55, -2.66], k.dark, 0.025);
      k.panel("bed", [0.4, 0.08, 0.06], [0, 0.55, -2.69], headGlow, 0.02);
      k.panel("bed", [0.44, 0.3, 0.1], [0, 0.05, -2.66], skirtDark, 0.03);
      for (const x of [-0.9, -0.45, 0, 0.45, 0.9])
        k.panel("bed", [0.08, 0.5, 0.16], [x, -0.05, -2.5], skirt, 0.02);

      // ---- Bumpers: pilots, couplers, lamps ----
      k.panel("bumper-front", [2.0, 0.28, 0.3], [0, -0.32, 2.72], skirt, 0.08);
      for (let i = 0; i < 5; i++)
        k.bar(
          "bumper-front",
          [-0.8 + i * 0.4, -0.5, 2.86],
          [-0.8 + i * 0.4, -0.18, 2.66],
          0.035,
          skirtDark,
        );
      k.bar("bumper-front", [-0.9, -0.52, 2.86], [0.9, -0.52, 2.86], 0.03, skirtDark);
      k.mesh(
        "bumper-front",
        new T.CylinderGeometry(0.07, 0.07, 0.3, 20).rotateX(Math.PI / 2),
        [0, -0.32, 2.9],
        skirtDark,
      );
      k.mesh("bumper-front", new T.TorusGeometry(0.09, 0.028, 12, 32), [0, -0.32, 3.02], k.steel);
      for (const side of sides)
        k.lamp("bumper-front", [side * 0.7, -0.3, 2.86], 0.07, k.amber);
      k.panel("bumper-front", [1.2, 0.06, 0.4], [0, -0.5, 2.7], k.steel, 0.02);

      k.panel("bumper-rear", [2.1, 0.26, 0.28], [0, -0.3, -2.68], skirt, 0.075);
      k.tailLights(-2.79, 0.16);
      for (let i = 0; i < 5; i++)
        k.bar(
          "bumper-rear",
          [-0.8 + i * 0.4, -0.48, -2.82],
          [-0.8 + i * 0.4, -0.16, -2.62],
          0.035,
          skirtDark,
        );
      k.mesh(
        "bumper-rear",
        new T.CylinderGeometry(0.07, 0.07, 0.3, 20).rotateX(Math.PI / 2),
        [0, -0.3, -2.86],
        skirtDark,
      );
      k.mesh("bumper-rear", new T.TorusGeometry(0.09, 0.028, 12, 32), [0, -0.3, -2.98], k.steel);
      for (const side of sides)
        k.panel("bumper-rear", [0.5, 0.4, 0.05], [side * 0.9, -0.45, -2.5], k.rubber, 0.015);

      // ---- Skirted underbody: arches, vent skirts, tanks, shocks ----
      fenders(k, skirt);
      for (const side of sides) {
        k.panel("chassis-front", [0.1, 0.72, 1.0], [side * 1.12, -0.18, 0.3], skirt, 0.03);
        k.panel("chassis-rear", [0.1, 0.72, 1.3], [side * 1.12, -0.18, -0.85], skirt, 0.03);
        for (let r = 0; r < 2; r++)
          for (let c = 0; c < 4; c++) {
            k.panel(
              "chassis-front",
              [0.05, 0.09, 0.16],
              [side * 1.18, -0.1 + r * 0.2, -0.05 + c * 0.22],
              skirtDark,
              0.012,
            );
            k.panel(
              "chassis-rear",
              [0.05, 0.09, 0.16],
              [side * 1.18, -0.1 + r * 0.2, -1.0 + c * 0.22],
              skirtDark,
              0.012,
            );
          }
        // Access steps below the plug doors (rear pair tucked inboard of the tire).
        k.panel("chassis-front", [0.34, 0.06, 0.44], [side * 1.28, -0.52, 0.32], skirtDark, 0.015);
        k.panel("chassis-front", [0.3, 0.04, 0.36], [side * 1.28, -0.32, 0.32], skirt, 0.012);
        k.panel("chassis-rear", [0.2, 0.06, 0.44], [side * 1.14, -0.52, -1.32], skirtDark, 0.015);
        k.panel("chassis-rear", [0.18, 0.04, 0.36], [side * 1.14, -0.32, -1.32], skirt, 0.012);
        // Brake discs tucked inside the wheels.
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.3, 0.3, 0.08, 32).rotateZ(Math.PI / 2),
          [side * 1.18, -0.85, 1.65],
          k.steel,
        );
        k.mesh(
          "chassis-rear",
          new T.CylinderGeometry(0.3, 0.3, 0.08, 32).rotateZ(Math.PI / 2),
          [side * 1.18, -0.85, -1.65],
          k.steel,
        );
        k.shock("chassis-front", [side * 0.8, -0.3, 1.65], [side * 1.35, -0.8, 1.65], stripe);
        k.shock("chassis-rear", [side * 0.8, -0.3, -1.65], [side * 1.35, -0.8, -1.65], stripe);
      }
      // Center equipment boxes with flank vents, air tanks, cable runs.
      k.panel("chassis-front", [1.5, 0.42, 0.9], [0, -0.42, 0.35], skirtDark, 0.05);
      k.panel("chassis-rear", [1.5, 0.42, 0.9], [0, -0.42, -0.55], skirtDark, 0.05);
      for (const side of sides)
        for (let i = 0; i < 3; i++) {
          k.panel(
            "chassis-front",
            [0.05, 0.05, 0.6],
            [side * 0.76, -0.32 - i * 0.1, 0.35],
            k.dark,
            0.012,
          );
          k.panel(
            "chassis-rear",
            [0.05, 0.05, 0.6],
            [side * 0.76, -0.32 - i * 0.1, -0.55],
            k.dark,
            0.012,
          );
        }
      for (const side of sides) {
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.16, 0.16, 0.85, 28).rotateX(Math.PI / 2),
          [side * 0.45, -0.42, 0.7],
          skirt,
        );
        k.mesh(
          "chassis-rear",
          new T.CylinderGeometry(0.16, 0.16, 0.85, 28).rotateX(Math.PI / 2),
          [side * 0.45, -0.42, -1.0],
          skirt,
        );
      }
      k.tube(
        "chassis-front",
        [
          [-0.6, -0.66, 0.2],
          [0.0, -0.7, 0.6],
          [0.6, -0.66, 0.2],
        ],
        0.035,
        k.dark,
      );
      k.tube(
        "chassis-rear",
        [
          [-0.6, -0.66, -0.4],
          [0.0, -0.7, -0.9],
          [0.6, -0.66, -0.4],
        ],
        0.035,
        k.dark,
      );

      // ---- Wheel dress: hub caps + accent rings over the kit hubs ----
      const caps = [
        ["wheel-fl", 2.06, 1.65],
        ["wheel-fr", -2.06, 1.65],
        ["wheel-rl", 2.06, -1.65],
        ["wheel-rr", -2.06, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        const ring = new T.TorusGeometry(0.44, 0.025, 12, 64);
        ring.rotateY(Math.PI / 2);
        k.mesh(part, ring, [x, -0.85, z], stripe);
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.07, 28).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.SphereGeometry(0.05, 16, 12),
          [x + Math.sign(x) * 0.05, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "land-yacht",
    "Land Yacht",
    "Wind-driven land yacht with a tall mast, sail, and outrigger cockpit.",
    [15788758, 2060171, 6116938, 0.82, 8],
    (k) => {
      const pod = finish(0xdd7327, 0.42, 0.18);
      const podDark = finish(0xa8541f, 0.52, 0.12);
      const rope = finish(0xd8c9a3, 0.85, 0);
      const wood = finish(0x7a4e2a, 0.7, 0.05);
      const brass = gold();
      const mastLight = glow(0xfff3da);
      const starboard = glow(0x3aff7a);
      const sailCream = k.paint;
      const sailBlue = k.accent;

      // ---- Bow (hood): pointed pod nose, foredeck, windscreen ----
      k.hull(
        "hood",
        [
          [0.7, -0.3, 0.62, 0.92, 0.98],
          [1.8, -0.28, 0.55, 0.72, 0.8],
          [2.62, -0.18, 0.42, 0.16, 0.24],
        ],
        pod,
      );
      k.oval("hood", [0.16, 0.3, 0.22], [0, 0.12, 2.6], podDark);
      k.panel("hood", [0.7, 0.08, 0.9], [0, 0.6, 1.55], podDark, 0.03);
      k.bar("hood", [-0.2, 0.65, 1.55], [0.2, 0.65, 1.55], 0.025, k.steel);
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.28, 0.52, 2.12],
          [side * 0.42, 0.52, 2.12],
          0.03,
          k.steel,
        );
        k.bar(
          "hood",
          [side * 0.35, 0.52, 2.12],
          [side * 0.35, 0.6, 2.12],
          0.025,
          k.steel,
        );
        k.bar(
          "hood",
          [side * 0.5, 0.58, 1.3],
          [side * 0.5, 0.78, 1.3],
          0.028,
          k.steel,
        );
        k.bar(
          "hood",
          [side * 0.36, 0.55, 2.0],
          [side * 0.36, 0.75, 2.0],
          0.028,
          k.steel,
        );
        k.tube(
          "hood",
          [
            [side * 0.62, 0.66, 0.95],
            [side * 0.5, 0.78, 1.3],
            [side * 0.36, 0.75, 2.0],
            [side * 0.05, 0.52, 2.58],
          ],
          0.032,
          k.steel,
        );
        k.panel("hood", [0.3, 0.03, 0.12], [side * 0.45, 0.54, 1.9], k.dark, 0.01);
        k.panel("hood", [0.3, 0.03, 0.12], [side * 0.52, 0.6, 1.15], k.dark, 0.01);
        k.panel("hood", [0.1, 0.12, 0.16], [side * 0.66, 0.42, 2.0], k.dark, 0.02);
        k.mesh(
          "hood",
          new T.SphereGeometry(0.055, 14, 12),
          [side * 0.72, 0.42, 2.0],
          side > 0 ? k.red : starboard,
        );
      }
      // Bow roller + forestay chainplate.
      k.panel("hood", [0.2, 0.3, 0.12], [0, 0.32, 2.56], k.steel, 0.03);
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.07, 0.07, 0.22, 24).rotateZ(Math.PI / 2),
        [0, 0.45, 2.62],
        k.dark,
      );
      k.panel("hood", [0.1, 0.28, 0.06], [0, 0.18, 2.52], k.dark, 0.02);
      k.bar("hood", [0, 0.52, 2.58], [0, 0.75, 2.45], 0.024, rope);
      // Rope coil on the foredeck (port).
      for (let i = 0; i < 3; i++)
        k.mesh(
          "hood",
          new T.TorusGeometry(0.16 - i * 0.012, 0.042, 12, 40).rotateX(
            Math.PI / 2,
          ),
          [-0.42, 0.63 + i * 0.06, 1.15],
          rope,
        );
      // Windscreen: dark frame + glass + posts + top rail.
      k.panel("hood", [1.14, 0.52, 0.06], [0, 0.88, 0.92], k.dark, 0.025).rotation.x =
        -0.28;
      k.panel("hood", [1.0, 0.4, 0.05], [0, 0.9, 0.965], k.glass, 0.02).rotation.x =
        -0.28;
      for (const side of sides)
        k.bar(
          "hood",
          [side * 0.55, 0.58, 1.06],
          [side * 0.55, 1.16, 0.83],
          0.03,
          k.steel,
        );
      k.bar("hood", [-0.55, 1.16, 0.83], [0.55, 1.16, 0.83], 0.03, k.steel);

      // ---- Front bumper: steel bow bumper, pulpit rails, tow eyes ----
      k.panel("bumper-front", [1.9, 0.22, 0.3], [0, -0.11, 2.66], k.steel, 0.08);
      k.panel("bumper-front", [1.7, 0.1, 0.32], [0, -0.05, 2.66], pod, 0.04);
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.7, -0.05, 2.72],
          [side * 0.7, 0.55, 2.6],
          0.045,
          k.steel,
        );
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.03, 10, 32),
          [side * 0.55, -0.26, 2.7],
          k.dark,
        );
      }
      k.tube(
        "bumper-front",
        [
          [-0.7, 0.55, 2.6],
          [0, 0.62, 2.78],
          [0.7, 0.55, 2.6],
        ],
        0.04,
        k.steel,
      );

      // ---- Front chassis: arches, shocks, mast step, cockpit ----
      fenders(k, pod);
      for (const side of sides)
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          k.accent,
        );
      k.panel("chassis-front", [1.5, 0.1, 1.8], [0, -0.02, 0.1], k.dark, 0.03);
      for (const x of [-0.4, 0.4])
        k.panel("chassis-front", [0.08, 0.03, 1.6], [x, 0.04, 0.1], k.steel, 0.01);
      k.panel("chassis-front", [0.5, 0.18, 0.5], [0, 0.05, 0.3], k.dark, 0.05);
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.14, 0.16, 0.25, 32),
        [0, 0.2, 0.3],
        k.steel,
      );
      k.mesh(
        "chassis-front",
        new T.TorusGeometry(0.15, 0.03, 10, 40).rotateX(Math.PI / 2),
        [0, 0.32, 0.3],
        k.dark,
      );
      k.panel("chassis-front", [1.2, 0.35, 0.1], [0, 0.15, 0.95], podDark, 0.04);
      for (const side of sides)
        k.panel(
          "chassis-front",
          [0.18, 0.24, 0.44],
          [side * 0.85, 0.3, 0.05],
          k.steel,
          0.04,
        );
      // Bilge pump: brass barrel + wooden T-handle.
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.07, 0.07, 0.3, 24),
        [0.55, 0.15, -0.35],
        brass,
      );
      k.bar("chassis-front", [0.45, 0.32, -0.35], [0.65, 0.32, -0.35], 0.022, wood);
      k.bar("chassis-front", [0.55, 0.32, -0.35], [0.55, 0.22, -0.35], 0.022, k.steel);
      openSeat(k, 0, -0.42);

      // ---- Cockpit sides (doors): coaming, stripes, outrigger beams ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [0.95, 0.6],
            [0.95, -0.1],
            [-1.35, -0.1],
            [-1.35, 0.6],
          ],
          0.14,
          side * 0.98,
          pod,
          0.04,
        );
        k.panel(d, [0.06, 0.09, 2.2], [side * 1.1, 0.52, -0.2], sailBlue, 0.02);
        k.panel(d, [0.06, 0.04, 2.2], [side * 1.1, 0.4, -0.2], k.steel, 0.01);
        k.bar(d, [side * 1.02, 0.68, 0.95], [side * 1.02, 0.68, -1.35], 0.035, k.steel);
        for (const z of [0.8, -0.2, -1.2])
          k.bar(d, [side * 1.02, 0.6, z], [side * 1.02, 0.68, z], 0.025, k.steel);
        // Outrigger beam with upturned skid tip + support strut.
        k.panel(d, [1.5, 0.14, 0.34], [side * 1.65, 0.3, 0.05], pod, 0.05);
        k.panel(d, [0.5, 0.03, 0.2], [side * 1.9, 0.385, 0.05], k.white, 0.01);
        k.tube(
          d,
          [
            [side * 2.35, 0.3, 0.05],
            [side * 2.55, 0.34, 0.05],
            [side * 2.62, 0.52, 0.05],
          ],
          0.075,
          pod,
        );
        k.oval(d, [0.08, 0.08, 0.1], [side * 2.62, 0.54, 0.05], podDark);
        k.bar(d, [side * 2.1, 0.24, 0.05], [side * 0.95, -0.25, 0.05], 0.05, k.steel);
        k.panel(d, [0.1, 0.2, 0.4], [side * 1.12, 0.3, 0.05], k.steel, 0.03);
        // Shroud chainplate + turnbuckle at the beam tip.
        k.panel(d, [0.08, 0.22, 0.12], [side * 2.3, 0.42, 0.05], k.steel, 0.02);
        k.mesh(
          d,
          new T.CylinderGeometry(0.035, 0.035, 0.18, 16),
          [side * 2.3, 0.56, 0.05],
          k.dark,
        );
        for (const z of [0.45, -0.85])
          k.bar(
            d,
            [side * 1.11, 0.62, z - 0.12],
            [side * 1.11, 0.62, z + 0.12],
            0.022,
            k.steel,
          );
        // Jib-sheet winch on the coaming.
        k.mesh(
          d,
          new T.CylinderGeometry(0.05, 0.06, 0.1, 20),
          [side * 0.9, 0.66, -0.6],
          brass,
        );
      }

      // ---- Rig (roof): aluminum mast, boom, sails, standing rigging ----
      k.bar("roof", [0, 0.3, 0.3], [0, 5.85, 0.3], 0.09, k.steel);
      for (const y of [1.2, 2.4, 4.0])
        k.mesh(
          "roof",
          new T.TorusGeometry(0.105, 0.025, 12, 32).rotateX(Math.PI / 2),
          [0, y, 0.3],
          k.dark,
        );
      k.oval("roof", [0.12, 0.1, 0.12], [0, 5.9, 0.3], k.dark);
      k.panel("roof", [0.14, 0.3, 0.2], [0, 5.72, 0.3], k.dark, 0.03);
      for (const x of [-0.075, 0.075])
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.05, 0.05, 0.03, 20).rotateZ(Math.PI / 2),
          [x, 5.72, 0.3],
          brass,
        );
      k.bar("roof", [0, 5.95, 0.3], [0, 6.05, 0.3], 0.02, k.steel);
      k.mesh("roof", new T.SphereGeometry(0.05, 16, 12), [0, 6.08, 0.3], mastLight);
      // Wind vane arrow at the masthead.
      k.bar("roof", [0, 5.95, 0.28], [0, 5.95, -0.35], 0.015, k.steel);
      k.panel("roof", [0.02, 0.12, 0.25], [0, 5.95, -0.42], k.red, 0.008);
      k.mesh(
        "roof",
        new T.ConeGeometry(0.04, 0.15, 20).rotateX(Math.PI / 2),
        [0, 5.95, 0.45],
        k.red,
      );
      // Masthead burgee (orange pennant flying aft).
      k.profile("roof", [[-0.75, 5.95], [-0.1, 6.06], [-0.1, 5.84]], 0.02, 0, pod, 0.008);
      // Boom + gooseneck + end fittings.
      k.bar("roof", [0, 2.28, 0.32], [0, 2.38, -2.4], 0.07, k.steel);
      k.mesh("roof", new T.TorusGeometry(0.1, 0.03, 10, 32), [0, 2.28, 0.32], k.dark);
      k.oval("roof", [0.08, 0.08, 0.1], [0, 2.38, -2.42], k.dark);
      k.bar("roof", [-0.06, 2.3, -2.35], [-0.06, 2.46, -2.35], 0.02, k.steel);
      k.bar("roof", [0.06, 2.3, -2.35], [0.06, 2.46, -2.35], 0.02, k.steel);
      // Mainsail: cream base + blue foot, diagonal stripe, head.
      k.profile(
        "roof",
        [
          [0.25, 2.4],
          [-2.25, 2.45],
          [0.15, 5.6],
        ],
        0.06,
        0,
        sailCream,
        0.012,
      );
      k.profile(
        "roof",
        [
          [0.26, 2.38],
          [-2.26, 2.43],
          [-1.87, 2.95],
          [0.23, 2.95],
        ],
        0.085,
        0,
        sailBlue,
        0.012,
      );
      k.profile(
        "roof",
        [
          [0.202, 3.95],
          [-1.336, 3.65],
          [-0.993, 4.1],
          [0.186, 4.45],
        ],
        0.085,
        0,
        sailBlue,
        0.012,
      );
      k.profile(
        "roof",
        [
          [0.173, 4.85],
          [-0.612, 4.6],
          [-0.117, 5.25],
          [0.15, 5.62],
        ],
        0.085,
        0,
        sailBlue,
        0.012,
      );
      // Jib: cream base + blue foot and head.
      k.profile(
        "roof",
        [
          [2.35, 0.8],
          [0.4, 5.4],
          [0.4, 1.5],
        ],
        0.06,
        0,
        sailCream,
        0.012,
      );
      k.profile(
        "roof",
        [
          [2.35, 0.78],
          [0.4, 1.48],
          [0.4, 1.95],
          [1.884, 1.9],
        ],
        0.085,
        0,
        sailBlue,
        0.012,
      );
      k.profile(
        "roof",
        [
          [0.866, 4.3],
          [0.4, 5.42],
          [0.4, 4.3],
        ],
        0.085,
        0,
        sailBlue,
        0.012,
      );
      // Mast track + sail slides.
      k.bar("roof", [0, 2.5, 0.2], [0, 5.5, 0.2], 0.02, k.dark);
      for (let i = 0; i < 6; i++)
        k.panel("roof", [0.06, 0.07, 0.05], [0, 2.7 + i * 0.55, 0.2], k.steel, 0.01);
      // Jib hanks along the forestay.
      for (let i = 0; i < 5; i++) {
        const t = 0.12 + i * 0.19;
        const y = 0.75 + t * (5.55 - 0.75);
        const z = 2.45 + t * (0.35 - 2.45);
        k.mesh("roof", new T.SphereGeometry(0.04, 12, 10), [0.055, y, z], k.steel);
      }
      // Sail battens + edge ropes.
      for (const [y, leech] of [
        [3.2, -1.679],
        [4.0, -1.069],
        [4.8, -0.46],
      ] as const)
        k.bar("roof", [0, y, leech - 0.08], [0, y, leech + 0.55], 0.018, wood);
      k.tube(
        "roof",
        [
          [0, 2.45, -2.25],
          [0, 3.8, -1.22],
          [0, 4.8, -0.46],
          [0, 5.6, 0.15],
        ],
        0.018,
        rope,
      );
      k.tube(
        "roof",
        [
          [0, 2.42, 0.25],
          [0, 2.38, -1.0],
          [0, 2.45, -2.25],
        ],
        0.018,
        rope,
      );
      k.tube(
        "roof",
        [
          [0, 0.82, 2.35],
          [0, 3.1, 1.375],
          [0, 5.4, 0.4],
        ],
        0.018,
        rope,
      );
      // Standing + running rigging with turnbuckles.
      k.bar("roof", [0, 0.75, 2.45], [0, 5.55, 0.35], 0.024, rope);
      k.bar("roof", [0, 0.66, -2.57], [0, 5.7, 0.28], 0.024, rope);
      for (const side of sides) {
        k.bar("roof", [side * 2.3, 0.6, 0.05], [0, 5.45, 0.3], 0.024, rope);
        k.bar("roof", [0, 1.5, 0.45], [side * 1.0, 0.68, -0.6], 0.02, rope);
      }
      k.bar("roof", [0, 2.36, -2.35], [0, 0.8, -1.9], 0.022, rope);
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.035, 0.035, 0.18, 16),
        [0, 0.93, 2.37],
        k.dark,
      );
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.035, 0.035, 0.18, 16),
        [0, 0.97, -2.45],
        k.dark,
      );
      // Sail insignia + telltales.
      for (const side of sides) {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.16, 0.16, 0.02, 32).rotateZ(Math.PI / 2),
          [side * 0.05, 4.55, -0.2],
          sailCream,
        );
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.065, 0.065, 0.025, 24).rotateZ(Math.PI / 2),
          [side * 0.055, 4.55, -0.2],
          pod,
        );
      }
      for (const [y, z] of [
        [2.5, 1.0],
        [3.2, 0.85],
        [3.9, 0.7],
      ] as const)
        k.panel("roof", [0.02, 0.03, 0.18], [0.055, y, z], k.red, 0.006);

      // ---- Stern (bed): aft deck, compass, tiller, pushpit ----
      k.hull(
        "bed",
        [
          [-2.62, -0.3, 0.55, 0.62, 0.72],
          [-1.6, -0.3, 0.6, 0.85, 0.92],
          [-0.8, -0.3, 0.62, 0.92, 0.98],
        ],
        pod,
      );
      for (const side of sides)
        for (const [z, y] of [
          [-1.2, 0.615],
          [-1.55, 0.605],
          [-1.9, 0.59],
          [-2.25, 0.575],
        ] as const)
          k.panel("bed", [0.5, 0.025, 0.09], [side * 0.5, y, z], k.dark, 0.008);
      // Compass binnacle with card + needle.
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.12, 0.15, 0.35, 24),
        [0, 0.78, -1.15],
        k.dark,
      );
      k.mesh("bed", new T.SphereGeometry(0.13, 24, 16), [0, 1.0, -1.15], brass);
      k.mesh("bed", new T.SphereGeometry(0.105, 24, 16), [0, 1.03, -1.15], k.glass);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.085, 0.085, 0.02, 24),
        [0, 1.06, -1.15],
        sailCream,
      );
      k.panel("bed", [0.03, 0.012, 0.07], [0, 1.075, -1.115], k.red, 0.004);
      k.panel("bed", [0.03, 0.012, 0.07], [0, 1.075, -1.185], k.white, 0.004);
      k.mesh(
        "bed",
        new T.TorusGeometry(0.11, 0.02, 10, 40).rotateX(Math.PI / 2),
        [0, 1.06, -1.15],
        k.steel,
      );
      // Tiller + rudder head.
      k.panel("bed", [0.16, 0.22, 0.3], [0, 0.72, -2.45], k.steel, 0.04);
      k.bar("bed", [0, 0.85, -2.45], [0, 1.0, -1.3], 0.045, wood);
      k.bar("bed", [0, 0.985, -1.6], [0, 1.0, -1.3], 0.056, k.rubber);
      k.mesh("bed", new T.SphereGeometry(0.055, 14, 12), [0, 1.0, -1.3], k.rubber);
      // Traveler track + car + mainsheet block.
      k.bar("bed", [-0.7, 0.64, -1.9], [0.7, 0.64, -1.9], 0.035, k.steel);
      for (const side of sides)
        k.panel("bed", [0.1, 0.1, 0.12], [side * 0.72, 0.6, -1.9], k.dark, 0.02);
      k.panel("bed", [0.16, 0.12, 0.14], [0, 0.7, -1.9], k.dark, 0.02);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.05, 0.05, 0.04, 20).rotateX(Math.PI / 2),
        [0, 0.78, -1.9],
        brass,
      );
      k.mesh("bed", new T.TorusGeometry(0.05, 0.014, 8, 24), [0, 0.86, -1.9], k.steel);
      // Pushpit rails + stern light.
      k.tube(
        "bed",
        [
          [-0.7, 0.54, -2.5],
          [-0.7, 1.15, -2.5],
          [0.7, 1.15, -2.5],
          [0.7, 0.54, -2.5],
        ],
        0.035,
        k.steel,
      );
      k.bar("bed", [0, 1.15, -2.5], [0, 1.5, -2.5], 0.025, k.steel);
      k.mesh("bed", new T.SphereGeometry(0.05, 14, 12), [0, 1.53, -2.5], mastLight);
      k.panel("bed", [0.1, 0.28, 0.06], [0, 0.5, -2.58], k.steel, 0.02);
      for (const side of sides) {
        k.bar(
          "bed",
          [side * 0.5, 0.57, -2.35],
          [side * 0.64, 0.57, -2.35],
          0.028,
          k.steel,
        );
        k.bar(
          "bed",
          [side * 0.57, 0.57, -2.35],
          [side * 0.57, 0.64, -2.35],
          0.022,
          k.steel,
        );
        for (let i = 0; i < 2; i++)
          k.mesh(
            "bed",
            new T.TorusGeometry(0.13 - i * 0.01, 0.04, 10, 32).rotateX(
              Math.PI / 2,
            ),
            [side * 0.45, 0.65 + i * 0.055, -1.55],
            rope,
          );
      }
      // Ensign staff + flag.
      k.bar("bed", [0, 0.6, -2.6], [0, 1.4, -2.78], 0.022, wood);
      k.panel("bed", [0.02, 0.18, 0.34], [0, 1.28, -2.92], sailBlue, 0.006);

      // ---- Rear bumper: rub strake, lights, rudder, tow eyes ----
      k.panel("bumper-rear", [2.0, 0.22, 0.3], [0, -0.11, -2.68], k.steel, 0.08);
      k.panel("bumper-rear", [1.8, 0.1, 0.32], [0, -0.05, -2.68], pod, 0.04);
      k.tailLights(-2.85, 0.12);
      k.panel("bumper-rear", [0.08, 0.5, 0.35], [0, -0.35, -2.82], podDark, 0.03);
      for (const y of [-0.2, -0.45])
        k.bar("bumper-rear", [0, y, -2.72], [0, y, -2.9], 0.03, k.steel);
      for (const side of sides) {
        k.mesh(
          "bumper-rear",
          new T.TorusGeometry(0.09, 0.03, 10, 32),
          [side * 0.6, -0.26, -2.72],
          k.dark,
        );
        k.panel(
          "bumper-rear",
          [0.4, 0.05, 0.3],
          [side * 0.7, -0.24, -2.7],
          k.dark,
          0.015,
        );
      }

      // ---- Rear chassis: shocks, ballast, backbone, stores ----
      for (const side of sides)
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          k.accent,
        );
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.3, 0.3, 1.4, 32).rotateX(Math.PI / 2),
        [0, -0.35, -1.5],
        k.steel,
      );
      k.oval("chassis-rear", [0.3, 0.3, 0.15], [0, -0.35, -0.8], k.steel);
      k.oval("chassis-rear", [0.3, 0.3, 0.15], [0, -0.35, -2.2], k.steel);
      for (const z of [-1.1, -1.9])
        k.mesh(
          "chassis-rear",
          new T.TorusGeometry(0.31, 0.028, 10, 40),
          [0, -0.35, z],
          k.dark,
        );
      k.panel("chassis-rear", [0.7, 0.4, 0.5], [-0.55, -0.25, -0.7], k.dark, 0.06);
      k.panel("chassis-rear", [0.74, 0.08, 0.54], [-0.55, -0.03, -0.7], k.steel, 0.02);
      k.tube(
        "chassis-rear",
        [
          [0, -0.45, 2.2],
          [0, -0.5, 0.0],
          [0, -0.45, -2.2],
        ],
        0.06,
        k.steel,
      );
      k.panel("chassis-rear", [1.1, 0.12, 1.2], [0, -0.52, -1.5], podDark, 0.04);

      // ---- Wheel dress: pod-orange rings + dark caps over the kit hubs ----
      const caps = [
        ["wheel-fl", 2.06, 1.65],
        ["wheel-fr", -2.06, 1.65],
        ["wheel-rl", 2.06, -1.65],
        ["wheel-rr", -2.06, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        const ring = new T.TorusGeometry(0.44, 0.025, 12, 64);
        ring.rotateY(Math.PI / 2);
        k.mesh(part, ring, [x, -0.85, z], pod);
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.07, 28).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.SphereGeometry(0.05, 16, 12),
          [x + Math.sign(x) * 0.05, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "bumper-car",
    "Bumper Car",
    "Pavilion bumper car with a rubber ring, trolley pole, and a round pod.",
    [13777774, 2867926, 3356475, 0.84, 5],
    (k) => {
      const rubber = finish(0x1b1e21, 0.94, 0);
      const cream = finish(0xf2e7c8, 0.5, 0.05);
      const checkerDark = finish(0x3a3f45, 0.6, 0.1);
      // Points on the horizontal rubber-ring ellipse (theta 0 = nose).
      const arc = (a0: number, a1: number, n: number): XYZ[] => {
        const pts: XYZ[] = [];
        for (let i = 0; i <= n; i++) {
          const t = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
          pts.push([1.3 * Math.sin(t), 0.12, 0.1 + 1.85 * Math.cos(t)]);
        }
        return pts;
      };

      // ---- Nose (hood): round pink pod nose, grille, headlamps ----
      k.hull("hood", [
        [0.42, -0.15, 0.42, 1.08, 1.02],
        [1.6, -0.18, 0.5, 1.06, 1.0],
        [2.42, -0.2, 0.28, 0.9, 0.86],
      ]);
      k.oval("hood", [1.0, 0.52, 0.95], [0, 0.32, 1.5]);
      // Chrome grille: surround, dark inset, vertical slats.
      k.panel("hood", [0.72, 0.42, 0.1], [0, 0.04, 2.4], k.steel, 0.04);
      k.panel("hood", [0.56, 0.3, 0.08], [0, 0.04, 2.44], k.dark, 0.03);
      for (const x of [-0.19, 0, 0.19])
        k.bar("hood", [x, -0.08, 2.48], [x, 0.16, 2.48], 0.028, k.steel);
      k.bar("hood", [-0.28, 0.04, 2.485], [0.28, 0.04, 2.485], 0.02, k.steel);
      for (const side of sides) {
        k.oval("hood", [0.2, 0.16, 0.35], [side * 0.62, 0.4, 2.05]);
        k.lamp("hood", [side * 0.62, 0.35, 2.32], 0.13);
        k.lamp("hood", [side * 0.62, 0.1, 2.42], 0.055, k.amber);
      }
      // Chrome hood spear riding the nose crown + round badge.
      k.bar("hood", [0, 0.7, 2.15], [0, 0.82, 1.15], 0.035, k.steel);
      k.oval("hood", [0.07, 0.05, 0.07], [0, 0.72, 2.08], k.steel);

      // ---- Cockpit + pole (roof): tub, checkered seat, wheel, trolley ----
      k.oval("roof", [1.0, 0.28, 1.2], [0, 0.3, -0.15], k.dark);
      // Pink cockpit rim loop (joint hides under the dash cowl).
      k.tube(
        "roof",
        [
          [0, 0.62, 0.85],
          [0.6, 0.61, 0.8],
          [0.92, 0.6, 0.3],
          [0.92, 0.6, -0.5],
          [0.6, 0.6, -1.02],
          [0, 0.6, -1.1],
          [-0.6, 0.6, -1.02],
          [-0.92, 0.6, -0.5],
          [-0.92, 0.6, 0.3],
          [-0.6, 0.61, 0.8],
          [0, 0.62, 0.85],
        ],
        0.1,
        k.paint,
        64,
      );
      // Dash cowl with gauges and chrome trim.
      k.panel("roof", [1.2, 0.2, 0.3], [0, 0.6, 0.95], k.paint, 0.06);
      for (const x of [-0.25, 0.25])
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.06, 0.06, 0.04, 24).rotateX(Math.PI / 2),
          [x, 0.66, 0.79],
          k.dark,
        );
      k.bar("roof", [-0.55, 0.68, 0.82], [0.55, 0.68, 0.82], 0.02, k.steel);
      // Steering column + tilted wheel with spokes and hub.
      k.bar("roof", [0, 0.55, 0.85], [0, 0.85, 0.45], 0.045, k.steel);
      k.mesh(
        "roof",
        new T.TorusGeometry(0.2, 0.03, 12, 48),
        [0, 0.88, 0.42],
        k.dark,
      ).rotation.x = -0.9;
      for (const tip of [
        [-0.19, 0.88, 0.42],
        [0.19, 0.88, 0.42],
        [0, 0.762, 0.569],
      ] as const)
        k.bar("roof", [0, 0.88, 0.42], [tip[0], tip[1], tip[2]], 0.018, k.steel);
      k.bar("roof", [0, 0.857, 0.389], [0, 0.919, 0.464], 0.05, k.dark);
      k.oval("roof", [0.035, 0.035, 0.035], [0, 0.925, 0.47], k.paint);
      // Checkered seat base + backrest (alternating cream/dark squares).
      k.panel("roof", [0.95, 0.14, 0.75], [0, 0.62, -0.4], k.dark, 0.05);
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 5; col++)
          k.panel(
            "roof",
            [0.17, 0.04, 0.16],
            [-0.36 + col * 0.18, 0.7, -0.65 + row * 0.17],
            (row + col) % 2 === 0 ? cream : checkerDark,
            0.012,
          );
      k.panel("roof", [0.95, 0.7, 0.12], [0, 0.95, -0.88], k.dark, 0.05).rotation.x =
        -0.12;
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 5; col++) {
          const dy = 0.72 + row * 0.16 - 0.95;
          k.panel(
            "roof",
            [0.17, 0.15, 0.03],
            [-0.36 + col * 0.18, 0.958 + dy * 0.993, -0.815 - dy * 0.12],
            (row + col) % 2 === 0 ? cream : checkerDark,
            0.01,
          ).rotation.x = -0.12;
        }
      // Trolley pole: socket, spring housing, chrome mast, spark shoe.
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.14, 0.17, 0.18, 32),
        [0.55, 0.72, -1.35],
        k.dark,
      );
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.1, 0.1, 0.25, 24),
        [0.55, 0.9, -1.36],
        k.steel,
      );
      k.bar("roof", [0.55, 0.95, -1.36], [0.55, 3.2, -1.52], 0.055, k.steel);
      for (const y of [1.8, 2.6])
        k.bar(
          "roof",
          [0.55, y - 0.05, -1.36 - (y - 0.95) * 0.071],
          [0.55, y + 0.05, -1.36 - (y - 0.95) * 0.071],
          0.075,
          k.dark,
        );
      k.panel("roof", [0.3, 0.12, 0.14], [0.55, 3.25, -1.53], k.dark, 0.04);
      for (const x of [0.45, 0.65])
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.05, 0.05, 0.12, 20).rotateZ(Math.PI / 2),
          [x, 3.36, -1.53],
          k.steel,
        );
      k.bar("roof", [0.55, 3.28, -1.53], [0.55, 3.36, -1.53], 0.022, k.steel);
      k.oval("roof", [0.05, 0.07, 0.05], [0.55, 3.4, -1.53], k.amber);

      // ---- Pod flanks (doors): pink walls + rubber ring side arcs ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [1.35, -0.12],
            [1.35, 0.42],
            [0.9, 0.55],
            [-0.9, 0.55],
            [-1.35, 0.42],
            [-1.35, -0.12],
          ],
          0.12,
          side * 1.08,
          k.paint,
          0.04,
        );
        k.tube(d, side > 0 ? arc(55, 125, 10) : arc(-125, -55, 10), 0.23, rubber, 40);
        k.bar(d, [side * 1.16, 0.5, 1.2], [side * 1.16, 0.5, -1.2], 0.03, k.steel);
        k.oval(d, [0.04, 0.06, 0.09], [side * 1.15, 0.32, 1.0], k.amber);
        k.oval(d, [0.04, 0.06, 0.09], [side * 1.15, 0.32, -1.0], k.red);
        for (const z of [-0.9, -0.3, 0.3, 0.9])
          k.oval(d, [0.03, 0.03, 0.03], [side * 1.15, -0.05, z], k.dark);
      }

      // ---- Tail (bed): rear deck, tail pods, lamps, tie loops ----
      k.hull("bed", [
        [-2.45, -0.2, 0.3, 0.9, 0.86],
        [-1.2, -0.15, 0.45, 1.06, 1.0],
      ]);
      k.oval("bed", [1.0, 0.5, 0.85], [0, 0.3, -1.35]);
      k.panel("bed", [0.8, 0.24, 0.08], [0, 0.05, -2.4], k.steel, 0.03);
      for (const side of sides) {
        k.oval("bed", [0.16, 0.14, 0.25], [side * 0.55, 0.15, -2.15]);
        k.lamp("bed", [side * 0.55, 0.15, -2.38], 0.1, k.red, -1);
        k.mesh(
          "bed",
          new T.TorusGeometry(0.07, 0.02, 10, 32).rotateX(Math.PI / 2),
          [side * 0.35, 0.77, -1.5],
          k.steel,
        );
      }
      k.panel("bed", [1.0, 0.08, 0.5], [-0.3, 0.72, -1.55], k.dark, 0.03);
      for (const x of [-0.5, -0.3, -0.1])
        k.bar("bed", [x, 0.77, -1.75], [x, 0.77, -1.35], 0.018, k.steel);

      // ---- Front bumper: rubber ring nose arc + chrome chin ----
      k.tube("bumper-front", arc(-75, 75, 12), 0.24, rubber, 48);
      k.panel("bumper-front", [1.2, 0.16, 0.18], [0, -0.22, 2.35], k.steel, 0.05);
      for (const side of sides)
        k.bar(
          "bumper-front",
          [side * 0.45, -0.3, 2.45],
          [side * 0.45, 0.0, 2.45],
          0.045,
          k.steel,
        );
      k.mesh(
        "bumper-front",
        new T.TorusGeometry(0.09, 0.03, 12, 32),
        [0, -0.32, 2.44],
        k.dark,
      );

      // ---- Rear bumper: rubber ring tail arc + step + tow eye ----
      k.tube("bumper-rear", arc(105, 255, 12), 0.24, rubber, 48);
      k.panel("bumper-rear", [1.6, 0.12, 0.3], [0, -0.25, -2.3], k.steel, 0.05);
      for (const side of sides)
        k.oval("bumper-rear", [0.08, 0.06, 0.05], [side * 0.9, 0.12, -1.98], k.red);
      k.bar("bumper-rear", [0, -0.3, -2.45], [0, -0.3, -2.56], 0.035, k.dark);
      k.mesh(
        "bumper-rear",
        new T.TorusGeometry(0.09, 0.03, 12, 32),
        [0, -0.3, -2.58],
        k.dark,
      );

      // ---- Chassis dress: shocks, spark plates, steps, motor ----
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
          [0.35, 0.07, 0.5],
          [side * 1.15, -0.25, 0.1],
          k.steel,
          0.02,
        );
        k.bar(
          "chassis-front",
          [side * 0.8, -0.35, 0.1],
          [side * 1.15, -0.27, 0.1],
          0.03,
          k.dark,
        );
      }
      k.panel("chassis-front", [1.7, 0.07, 1.4], [0, -0.52, 1.1], k.steel, 0.03);
      k.panel("chassis-front", [1.7, 0.5, 0.07], [0, -0.35, 1.95], k.steel, 0.03)
        .rotation.x = 0.5;
      k.panel("chassis-rear", [1.7, 0.07, 1.4], [0, -0.52, -1.2], k.steel, 0.03);
      for (const [part, z] of [
        ["chassis-front", 1.1],
        ["chassis-rear", -1.2],
      ] as const)
        for (const x of [-0.7, 0, 0.7])
          for (const dz of [-0.55, 0.55])
            k.mesh(
              part,
              new T.CylinderGeometry(0.03, 0.03, 0.04, 12),
              [x, -0.48, z + dz],
              k.dark,
            );
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.3, 0.3, 1.2, 32).rotateZ(Math.PI / 2),
        [0, -0.35, -1.3],
        k.dark,
      );
      for (const side of sides)
        k.mesh(
          "chassis-rear",
          new T.CylinderGeometry(0.31, 0.31, 0.06, 32).rotateZ(Math.PI / 2),
          [side * 0.62, -0.35, -1.3],
          k.steel,
        );
      for (const x of [-0.2, 0, 0.2])
        k.panel("chassis-rear", [0.04, 0.5, 0.5], [x, -0.35, -1.3], k.steel, 0.015);
      k.tube(
        "chassis-rear",
        [
          [0.3, -0.3, -1.3],
          [0.5, -0.1, -1.4],
          [0.55, 0.3, -1.38],
          [0.55, 0.68, -1.35],
        ],
        0.045,
        k.dark,
        24,
      );

      // Pink trim rings + dark caps over the kit hubs.
      const caps = [
        ["wheel-fl", 2.07, 1.65],
        ["wheel-fr", -2.07, 1.65],
        ["wheel-rl", 2.07, -1.65],
        ["wheel-rr", -2.07, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        const ring = new T.TorusGeometry(0.44, 0.03, 12, 64);
        ring.rotateY(Math.PI / 2);
        k.mesh(part, ring, [x, -0.85, z], k.paint);
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.SphereGeometry(0.05, 16, 12),
          [x + Math.sign(x) * 0.04, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "soapbox-racer",
    "Soapbox Racer",
    "Plywood gravity racer with an open cockpit and a number roundel.",
    [13210711, 12729134, 4867132, 0.72, 5],
    (k) => {
      const red = k.accent;
      const ply = k.paint;
      const plank = finish(0xd9b983, 0.85, 0);
      const darkwood = finish(0x6e4a2a, 0.85, 0);
      const cushion = finish(0xc4a484, 0.9, 0);
      const rope = finish(0xa98f5f, 0.95, 0);
      const roundel = finish(0xf4f1e8, 0.55, 0);
      const screwX = new T.CylinderGeometry(0.024, 0.024, 0.03, 12).rotateZ(
        Math.PI / 2,
      );
      const screwY = new T.CylinderGeometry(0.024, 0.024, 0.025, 12);
      const screwZ = new T.CylinderGeometry(0.024, 0.024, 0.03, 12).rotateX(
        Math.PI / 2,
      );
      const deckY = (z: number) => 0.92 - 0.282 * (z - 0.35);
      const deckX = (z: number) => 0.93 - 0.46 * ((z - 0.45) / 2.07);

      // ---- Nose (hood): tapered plywood wedge, veneer deck, roundel ----
      k.hull("hood", [
        [2.62, -0.05, 0.28, 0.55, 0.42],
        [1.9, -0.12, 0.55, 0.78, 0.68],
        [1.1, -0.15, 0.78, 0.95, 0.88],
        [0.35, -0.15, 0.92, 1.02, 0.98],
      ]);
      k.hull(
        "hood",
        [
          [2.52, 0.28, 0.34, 0.52, 0.46],
          [1.5, 0.63, 0.69, 0.74, 0.68],
          [0.42, 0.89, 0.95, 0.97, 0.93],
        ],
        darkwood,
      );
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.34, 0.34, 0.03, 48),
        [0, 0.575, 1.7],
        roundel,
      ).rotation.x = 0.28;
      k.mesh(
        "hood",
        new T.TorusGeometry(0.34, 0.025, 12, 64),
        [0, 0.585, 1.7],
        red,
      ).rotation.x = -Math.PI / 2 + 0.28;
      k.panel("hood", [0.86, 0.3, 0.08], [0, 0.12, 2.6], ply, 0.02);
      k.bar("hood", [-0.42, 0.3, 2.65], [0.42, 0.3, 2.65], 0.045, red);
      k.bar("hood", [-0.5, -0.03, 2.65], [0.5, -0.03, 2.65], 0.045, red);
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.93, 0.95, 0.45],
          [side * 0.47, 0.33, 2.52],
          0.045,
          red,
        );
        k.bar(
          "hood",
          [side * 0.99, -0.12, 0.4],
          [side * 0.57, -0.04, 2.55],
          0.04,
          red,
        );
        k.bar(
          "hood",
          [side * 0.5, -0.03, 2.65],
          [side * 0.42, 0.3, 2.65],
          0.045,
          red,
        );
        for (let i = 0; i < 6; i++) {
          const z = 0.6 + i * 0.38;
          k.mesh(
            "hood",
            screwY,
            [side * deckX(z), deckY(z) + 0.05, z],
            k.steel,
          ).rotation.x = 0.28;
        }
      }
      for (const sx of [-0.3, 0.3])
        for (const sy of [0.05, 0.2])
          k.mesh("hood", screwZ, [sx, sy, 2.65], k.steel);

      // ---- Flanks: plywood side panels, red rails, planks, screws ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [-1.55, -0.15],
            [0.55, -0.15],
            [0.5, 0.9],
            [-1.45, 0.85],
          ],
          0.12,
          side * 1.0,
          ply,
          0.03,
        );
        k.bar(
          d,
          [side * 1.07, 0.87, -1.45],
          [side * 1.07, 0.92, 0.5],
          0.045,
          red,
        );
        k.bar(
          d,
          [side * 1.07, -0.13, -1.5],
          [side * 1.07, -0.13, 0.5],
          0.04,
          red,
        );
        for (const y of [0.2, 0.5])
          k.panel(
            d,
            [0.02, 0.03, 1.95],
            [side * 1.085, y, -0.5],
            darkwood,
            0.008,
          );
        k.panel(d, [0.1, 0.16, 1.7], [side * 1.12, 0.32, -0.5], ply, 0.02);
        for (let i = 0; i < 6; i++) {
          const z = -1.3 + i * 0.33;
          const topY = 0.85 + (z + 1.45) * (0.05 / 1.95);
          k.mesh(d, screwX, [side * 1.095, topY + 0.02, z], k.steel);
          k.mesh(d, screwX, [side * 1.095, -0.13, z], k.steel);
        }
        for (let i = 0; i < 4; i++)
          k.mesh(
            d,
            screwX,
            [side * 1.175, 0.32, -1.1 + i * 0.4],
            k.steel,
          );
      }

      // ---- Tail (bed): tapered stern, deck, tail frame, roundel ----
      k.hull("bed", [
        [-2.55, -0.05, 0.55, 0.62, 0.55],
        [-1.9, -0.12, 0.75, 0.85, 0.8],
        [-1.2, -0.15, 0.86, 0.97, 0.93],
        [-0.85, -0.15, 0.9, 1.0, 0.97],
      ]);
      k.hull(
        "bed",
        [
          [-2.5, 0.5, 0.57, 0.6, 0.54],
          [-1.5, 0.78, 0.85, 0.9, 0.86],
          [-0.9, 0.86, 0.93, 0.98, 0.95],
        ],
        darkwood,
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.16, 0.16, 0.03, 32).rotateX(Math.PI / 2),
        [0, 0.28, -2.555],
        roundel,
      );
      k.mesh(
        "bed",
        new T.TorusGeometry(0.16, 0.02, 12, 48),
        [0, 0.28, -2.56],
        red,
      );
      k.bar("bed", [-0.55, 0.57, -2.57], [0.55, 0.57, -2.57], 0.045, red);
      k.bar("bed", [-0.6, 0.0, -2.57], [0.6, 0.0, -2.57], 0.045, red);
      for (const side of sides) {
        k.bar(
          "bed",
          [side * 0.95, 0.92, -0.9],
          [side * 0.56, 0.56, -2.5],
          0.045,
          red,
        );
        k.bar(
          "bed",
          [side * 0.6, 0.0, -2.57],
          [side * 0.55, 0.57, -2.57],
          0.045,
          red,
        );
        for (let i = 0; i < 5; i++) {
          const t = i / 4;
          k.mesh(
            "bed",
            screwY,
            [
              side * (0.93 - t * 0.38),
              0.94 - t * 0.36,
              -0.95 - t * 1.5,
            ],
            k.steel,
          );
        }
        k.mesh("bed", screwZ, [side * 0.35, 0.28, -2.58], k.steel);
        k.mesh("bed", screwZ, [side * 0.35, 0.05, -2.58], k.steel);
      }

      // ---- Cockpit (roof group): floor, seat, headrest, rope steering ----
      k.panel("roof", [1.5, 0.1, 1.5], [0, 0.02, -0.25], ply, 0.03);
      for (const side of sides) {
        k.panel(
          "roof",
          [0.08, 0.5, 1.5],
          [side * 0.78, 0.45, -0.25],
          ply,
          0.02,
        );
        k.panel(
          "roof",
          [0.2, 0.06, 1.5],
          [side * 0.88, 0.9, -0.25],
          ply,
          0.02,
        );
        k.bar(
          "roof",
          [side * 0.88, 0.95, -0.95],
          [side * 0.88, 0.95, 0.42],
          0.05,
          red,
        );
        for (let i = 0; i < 5; i++)
          k.mesh(
            "roof",
            screwY,
            [side * 0.88, 1.0, -0.85 + i * 0.32],
            k.steel,
          );
      }
      k.bar("roof", [-0.88, 0.95, 0.42], [0.88, 0.95, 0.42], 0.05, red);
      k.bar("roof", [-0.88, 0.95, -0.95], [0.88, 0.95, -0.95], 0.05, red);
      for (let i = 0; i < 5; i++) {
        k.mesh("roof", screwY, [-0.7 + i * 0.35, 1.0, 0.42], k.steel);
        k.mesh("roof", screwY, [-0.7 + i * 0.35, 1.0, -0.95], k.steel);
      }
      k.panel("roof", [0.72, 0.2, 0.62], [0, 0.17, -0.5], cushion, 0.08);
      k.panel("roof", [0.7, 0.6, 0.18], [0, 0.5, -0.83], cushion, 0.07).rotation
        .x = -0.15;
      k.panel("roof", [0.46, 0.26, 0.16], [0, 0.98, -0.9], cushion, 0.07);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.15, 0.72, -0.9],
          [side * 0.15, 0.9, -0.9],
          0.03,
          k.steel,
        );
      k.bar("roof", [0, 0.08, 0.32], [0, 0.62, -0.02], 0.045, k.steel);
      k.mesh(
        "roof",
        new T.TorusGeometry(0.21, 0.034, 16, 64),
        [0, 0.66, -0.05],
        rope,
      ).rotation.x = -0.5;
      // Rope wrap spiraling around the wheel rim.
      const wrap: XYZ[] = [];
      for (let i = 0; i < 97; i++) {
        const a = (i / 96) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const rx = ca;
        const ry = sa * 0.878;
        const rz = sa * -0.479;
        const wob = Math.cos(a * 8) * 0.036;
        const wob2 = Math.sin(a * 8) * 0.036;
        wrap.push([
          rx * 0.21 + rx * wob2,
          0.66 + ry * 0.21 + 0.479 * wob + ry * wob2,
          -0.05 + rz * 0.21 + 0.878 * wob + rz * wob2,
        ]);
      }
      k.tube("roof", wrap, 0.012, rope, 128);
      for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
        const dx = Math.cos(a);
        const dy = Math.sin(a) * 0.878;
        const dz = Math.sin(a) * -0.479;
        k.bar(
          "roof",
          [-dx * 0.19, 0.66 - dy * 0.19, -0.05 - dz * 0.19],
          [dx * 0.19, 0.66 + dy * 0.19, -0.05 + dz * 0.19],
          0.022,
          darkwood,
        );
      }
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.05, 0.05, 0.09, 24),
        [0, 0.66, -0.05],
        darkwood,
      ).quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        new T.Vector3(0, 0.479, 0.878).normalize(),
      );
      k.panel("roof", [1.3, 0.1, 0.25], [0, 0.8, 0.3], plank, 0.02);
      for (const side of sides) {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.05, 0.05, 0.02, 24),
          [side * 0.25, 0.82, 0.17],
          roundel,
        ).rotation.x = -0.9;
        k.mesh(
          "roof",
          new T.TorusGeometry(0.055, 0.012, 10, 32),
          [side * 0.25, 0.82, 0.165],
          k.steel,
        ).rotation.x = -0.9;
        k.panel(
          "roof",
          [0.12, 0.02, 0.6],
          [side * 0.18, 0.28, -0.5],
          k.dark,
          0.008,
        );
      }
      k.panel("roof", [0.12, 0.05, 0.1], [0, 0.28, -0.35], k.steel, 0.015);

      // ---- Plank bumpers with brackets and bolts ----
      k.panel("bumper-front", [2.2, 0.24, 0.2], [0, -0.32, 2.78], plank, 0.03);
      k.panel("bumper-rear", [2.2, 0.24, 0.2], [0, -0.3, -2.72], plank, 0.03);
      for (const side of sides) {
        k.panel(
          "bumper-front",
          [0.14, 0.18, 0.35],
          [side * 0.5, -0.32, 2.62],
          k.dark,
          0.03,
        );
        k.panel(
          "bumper-rear",
          [0.14, 0.18, 0.35],
          [side * 0.5, -0.3, -2.6],
          k.dark,
          0.03,
        );
      }
      for (const bx of [-0.85, -0.35, 0.35, 0.85]) {
        k.mesh("bumper-front", screwZ, [bx, -0.32, 2.885], k.steel);
        k.mesh("bumper-rear", screwZ, [bx, -0.3, -2.825], k.steel);
      }

      // ---- Chassis dressing: apron, leaf springs, axle fairing ----
      k.panel("chassis-front", [1.1, 0.35, 0.08], [0, -0.25, 2.6], ply, 0.02);
      for (const sx of [-0.35, 0.35])
        for (const sy of [-0.32, -0.18])
          k.mesh("chassis-front", screwZ, [sx, sy, 2.645], k.steel);
      for (const side of sides) {
        for (const [part, z] of [
          ["chassis-front", 1.65],
          ["chassis-rear", -1.65],
        ] as const) {
          k.panel(part, [0.12, 0.035, 0.95], [side * 1.0, -0.66, z], k.dark, 0.01);
          k.panel(part, [0.12, 0.035, 0.75], [side * 1.0, -0.62, z], k.dark, 0.01);
          k.panel(part, [0.12, 0.035, 0.55], [side * 1.0, -0.58, z], k.dark, 0.01);
          k.bar(
            part,
            [side * 1.0, -0.8, z - 0.15],
            [side * 1.0, -0.62, z - 0.15],
            0.03,
            k.steel,
          );
          k.bar(
            part,
            [side * 1.0, -0.8, z + 0.15],
            [side * 1.0, -0.62, z + 0.15],
            0.03,
            k.steel,
          );
        }
        k.bar(
          "chassis-rear",
          [side * 0.8, -0.36, -1.65],
          [side * 0.8, -0.14, -1.65],
          0.035,
          k.dark,
        );
      }
      k.panel("chassis-rear", [2.3, 0.34, 0.55], [0, -0.53, -1.65], plank, 0.04);
      for (const side of sides)
        k.panel(
          "chassis-rear",
          [0.1, 0.4, 0.6],
          [side * 1.16, -0.5, -1.65],
          plank,
          0.03,
        ).rotation.z = -side * 0.18;
      k.bar(
        "chassis-rear",
        [-1.1, -0.45, -1.36],
        [1.1, -0.45, -1.36],
        0.025,
        red,
      );
      for (const sx of [-0.5, 0.5])
        for (const sy of [-0.42, -0.6])
          k.mesh("chassis-rear", screwZ, [sx, sy, -1.36], k.steel);
      k.mesh(
        "chassis-rear",
        new T.TorusGeometry(0.08, 0.025, 12, 32),
        [0, -0.5, -2.5],
        k.steel,
      );

      // Red trim rings and dark caps over the kit hubs.
      const caps = [
        ["wheel-fl", 1, 1.65],
        ["wheel-fr", -1, 1.65],
        ["wheel-rl", 1, -1.65],
        ["wheel-rr", -1, -1.65],
      ] as const;
      for (const [part, s, z] of caps) {
        k.mesh(
          part,
          new T.TorusGeometry(0.44, 0.028, 12, 64).rotateY(Math.PI / 2),
          [s * 1.96, -0.85, z],
          red,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.14, 0.14, 0.1, 32).rotateZ(Math.PI / 2),
          [s * 1.98, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.SphereGeometry(0.055, 24, 16),
          [s * 2.05, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "mail-truck",
    "Mail Truck",
    "Postal step van with a sliding door, roof markers, and a rear roller shutter.",
    [15329772, 2052740, 5922403, 0.8, 8],
    (k) => {
      const trimRed = finish(0xc0271f, 0.42, 0.25);
      const shutter = finish(0xb9bec2, 0.46, 0.55);

      // ---- Nose (hood): short step-van face, grille, lamps ----
      k.hull("hood", [
        [0.42, -0.15, 0.75, 1.12, 1.06],
        [2.44, -0.15, 0.62, 1.08, 1.02],
      ]);
      k.panel("hood", [2.0, 0.1, 0.6], [0, 0.72, 2.05], k.paint, 0.04);
      k.panel("hood", [1.0, 0.52, 0.1], [0, 0.22, 2.47], k.dark, 0.04);
      for (let i = 0; i < 5; i++)
        k.panel(
          "hood",
          [0.9, 0.03, 0.05],
          [0, 0.05 + i * 0.09, 2.53],
          k.steel,
          0.008,
        );
      k.bar("hood", [-0.55, 0.5, 2.5], [0.55, 0.5, 2.5], 0.028, k.steel);
      k.bar("hood", [-0.55, -0.04, 2.5], [0.55, -0.04, 2.5], 0.028, k.steel);
      for (const side of sides) {
        k.bar(
          "hood",
          [side * 0.55, -0.04, 2.5],
          [side * 0.55, 0.5, 2.5],
          0.028,
          k.steel,
        );
        // Rectangular headlamp look: dark bezel with a round lamp.
        k.panel("hood", [0.34, 0.4, 0.08], [side * 0.82, 0.3, 2.47], k.dark, 0.03);
        k.lamp("hood", [side * 0.82, 0.3, 2.52], 0.12);
        k.panel("hood", [0.3, 0.12, 0.08], [side * 0.82, -0.02, 2.47], k.dark, 0.02);
        k.lamp("hood", [side * 0.82, -0.02, 2.52], 0.05, k.amber);
      }

      // ---- Cab upper (roof): split windshield, markers, wipers, cab ----
      cabin(
        k,
        { front: 2.42, back: 0.55, height: 2.12, width: 1.08, slant: 0.16 },
      );
      // Split-windshield center divider.
      k.bar("roof", [0, 0.58, 2.46], [0, 1.98, 2.31], 0.05, k.paint);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.42, 0.75, 2.47],
          [side * 0.18, 1.25, 2.4],
          0.02,
          k.dark,
        );
      // Roof marker bar with five amber lamps.
      k.panel("roof", [1.7, 0.07, 0.12], [0, 2.05, 2.29], k.dark, 0.02);
      for (const x of [-0.68, -0.34, 0, 0.34, 0.68])
        k.panel("roof", [0.15, 0.08, 0.09], [x, 2.05, 2.35], k.amber, 0.02);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 1.12, 2.1, 2.24],
          [side * 1.12, 2.1, 0.7],
          0.03,
          k.steel,
        );
      // Cab interior: dash, right-hand-drive wheel, seats.
      k.panel("roof", [1.9, 0.22, 0.35], [0, 0.78, 1.95], k.dark, 0.05);
      k.bar("roof", [-0.5, 0.85, 1.85], [-0.5, 1.0, 1.65], 0.035, k.steel);
      k.mesh(
        "roof",
        new T.TorusGeometry(0.16, 0.028, 12, 40),
        [-0.5, 1.02, 1.63],
        k.dark,
      ).rotation.x = -0.5;
      for (const side of sides) {
        k.panel("roof", [0.5, 0.18, 0.5], [side * 0.5, 0.62, 0.9], k.dark, 0.07);
        k.panel(
          "roof",
          [0.5, 0.55, 0.15],
          [side * 0.5, 0.85, 0.62],
          k.dark,
          0.06,
        ).rotation.x = -0.15;
      }

      // ---- Sliding side doors: glass, tracks, stripe, mirrors, steps ----
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
        // Sliding-door slab with a window and dark seal frame.
        k.panel(d, [0.08, 1.0, 1.75], [side * 1.16, 1.05, 1.43], k.paint, 0.03);
        k.panel(d, [0.06, 0.65, 1.5], [side * 1.2, 1.14, 1.43], k.dark, 0.02);
        k.panel(d, [0.06, 0.55, 1.4], [side * 1.22, 1.14, 1.43], k.glass, 0.02);
        // Track rails with rollers above and below the door.
        k.bar(d, [side * 1.22, 1.62, 0.45], [side * 1.22, 1.62, 2.4], 0.025, k.steel);
        k.bar(d, [side * 1.22, 0.52, 0.45], [side * 1.22, 0.52, 2.4], 0.025, k.steel);
        for (const z of [0.75, 1.43, 2.11])
          k.mesh(
            d,
            new T.CylinderGeometry(0.045, 0.045, 0.05, 20).rotateZ(Math.PI / 2),
            [side * 1.22, 1.62, z],
            k.dark,
          );
        k.panel(d, [0.07, 0.06, 0.28], [side * 1.24, 0.9, 1.95], k.steel, 0.02);
        // Livery: thin red trim over a blue band.
        k.panel(d, [0.06, 0.05, 1.9], [side * 1.21, 0.44, 1.42], trimRed, 0.015);
        k.panel(d, [0.06, 0.17, 1.9], [side * 1.21, 0.3, 1.42], k.accent, 0.02);
        // Mirror on the front pillar.
        k.bar(d, [side * 1.15, 1.35, 2.25], [side * 1.42, 1.42, 2.3], 0.03, k.dark);
        k.panel(d, [0.1, 0.28, 0.18], [side * 1.45, 1.42, 2.3], k.dark, 0.03);
        k.panel(d, [0.07, 0.22, 0.03], [side * 1.45, 1.42, 2.195], k.steel, 0.012);
        // Grab handle, step, and markers.
        k.bar(d, [side * 1.24, 0.65, 0.6], [side * 1.24, 1.35, 0.6], 0.028, k.steel);
        k.bar(d, [side * 1.18, 0.75, 0.6], [side * 1.24, 0.75, 0.6], 0.02, k.steel);
        k.bar(d, [side * 1.18, 1.25, 0.6], [side * 1.24, 1.25, 0.6], 0.02, k.steel);
        k.panel(d, [0.34, 0.07, 0.3], [side * 1.12, -0.14, 1.0], k.steel, 0.02);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.21, 0.02, 0.62], k.amber, 0.012);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.21, 0.02, 2.26], k.amber, 0.012);
      }

      // ---- Cargo box (bed): tall box, roof ribs, roller shutter ----
      k.hull("bed", [
        [-2.5, -0.1, 2.2, 1.12, 1.04],
        [0.4, -0.1, 2.2, 1.12, 1.04],
      ]);
      k.panel("bed", [2.16, 2.15, 0.14], [0, 1.02, 0.33], k.paint, 0.04);
      k.panel("bed", [2.2, 0.12, 0.16], [0, 0.0, 0.33], k.dark, 0.03);
      k.panel("bed", [2.14, 0.1, 2.95], [0, 2.26, -1.05], k.paint, 0.04);
      for (const x of [-0.7, 0, 0.7])
        k.panel("bed", [0.08, 0.05, 2.9], [x, 2.33, -1.05], k.steel, 0.015);
      k.panel("bed", [2.2, 0.08, 0.12], [0, 2.24, -2.5], k.dark, 0.02);
      for (const side of sides) {
        // Stripe continuation down the cargo flank.
        k.panel("bed", [0.06, 0.05, 2.75], [side * 1.13, 0.44, -1.05], trimRed, 0.015);
        k.panel("bed", [0.06, 0.17, 2.75], [side * 1.13, 0.3, -1.05], k.accent, 0.02);
        // Rubber seal bridging the cab/box joint over the stripe ends.
        k.panel("bed", [0.14, 0.5, 0.3], [side * 1.16, 0.35, 0.4], k.dark, 0.03);
        k.bar("bed", [side * 1.04, 2.32, 0.35], [side * 1.04, 2.32, -2.5], 0.03, k.steel);
        k.bar(
          "bed",
          [side * 1.12, -0.02, 0.3],
          [side * 1.12, -0.02, -2.45],
          0.035,
          k.steel,
        );
        k.panel("bed", [0.05, 0.06, 0.14], [side * 1.12, 0.12, 0.1], k.amber, 0.012);
        k.panel("bed", [0.05, 0.06, 0.14], [side * 1.12, 0.12, -2.35], k.red, 0.012);
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.07, 0.07, 0.04, 24).rotateZ(Math.PI / 2),
          [side * 1.12, 0.02, -0.5],
          k.dark,
        );
        // Rear corner posts.
        k.bar(
          "bed",
          [side * 1.06, -0.05, -2.48],
          [side * 1.06, 2.15, -2.48],
          0.035,
          k.steel,
        );
      }
      // Rear roller shutter: dark recess, slats, grooves, lock bar.
      k.panel("bed", [1.8, 1.7, 0.12], [0, 0.95, -2.5], k.dark, 0.03);
      for (let i = 0; i < 9; i++)
        k.panel(
          "bed",
          [1.62, 0.12, 0.06],
          [0, 0.32 + i * 0.165, -2.56],
          shutter,
          0.015,
        );
      for (let i = 0; i < 8; i++)
        k.bar(
          "bed",
          [-0.81, 0.4 + i * 0.165, -2.585],
          [0.81, 0.4 + i * 0.165, -2.585],
          0.012,
          k.dark,
        );
      k.panel("bed", [1.66, 0.1, 0.08], [0, 0.22, -2.57], k.steel, 0.02);
      for (const side of sides)
        k.panel("bed", [0.12, 0.08, 0.06], [side * 0.5, 0.22, -2.62], k.dark, 0.015);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.14, 0.14, 1.7, 32).rotateZ(Math.PI / 2),
        [0, 1.85, -2.5],
        k.steel,
      );
      // Round taillights flanking the shutter, stripe stubs, work light.
      for (const side of sides) {
        k.panel("bed", [0.22, 0.22, 0.05], [side * 0.98, 0.35, -2.52], k.dark, 0.02);
        k.lamp("bed", [side * 0.98, 0.35, -2.56], 0.09, k.red, -1);
        k.panel("bed", [0.14, 0.05, 0.06], [side * 1.02, 0.44, -2.53], trimRed, 0.012);
        k.panel("bed", [0.14, 0.17, 0.06], [side * 1.02, 0.3, -2.53], k.accent, 0.015);
      }
      k.lamp("bed", [0.5, 2.0, -2.52], 0.07, k.white, -1);

      // ---- Front bumper: steel bar, hooks, fogs, plate ----
      k.panel("bumper-front", [2.4, 0.24, 0.32], [0, -0.11, 2.66], k.steel, 0.08);
      k.panel("bumper-front", [2.2, 0.05, 0.26], [0, 0.03, 2.66], k.dark, 0.015);
      for (const side of sides) {
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.08, 0.028, 12, 32),
          [side * 0.8, -0.14, 2.83],
          k.dark,
        );
        k.lamp("bumper-front", [side * 0.45, -0.11, 2.83], 0.07);
      }
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.11, 2.83], k.white, 0.01);

      // ---- Rear bumper: step, reflectors, flaps, hitch ----
      k.panel("bumper-rear", [2.3, 0.16, 0.5], [0, -0.22, -2.72], k.steel, 0.06);
      k.panel("bumper-rear", [2.1, 0.05, 0.44], [0, -0.13, -2.72], k.dark, 0.015);
      for (const side of sides) {
        k.panel(
          "bumper-rear",
          [0.3, 0.08, 0.04],
          [side * 0.98, -0.18, -2.98],
          k.red,
          0.012,
        );
        k.bar(
          "bumper-rear",
          [side * 1.2, -0.2, -2.7],
          [side * 1.65, -0.25, -2.78],
          0.04,
          k.dark,
        );
        k.panel("bumper-rear", [0.55, 0.45, 0.06], [side * 1.65, -0.5, -2.8], k.dark, 0.03);
        k.panel("bumper-rear", [0.4, 0.07, 0.3], [side * 1.0, -0.32, -2.8], k.steel, 0.02);
      }
      k.bar("bumper-rear", [0, -0.35, -2.8], [0, -0.35, -3.05], 0.055, k.dark);
      k.panel("bumper-rear", [0.4, 0.12, 0.03], [0, -0.22, -2.98], k.white, 0.01);

      // ---- Chassis dressing: fenders, tank, shocks, pipes ----
      fenders(k, k.paint);
      k.bar("chassis-front", [0.75, -0.55, 0.5], [0.75, -0.55, -0.3], 0.24, k.steel);
      for (const z of [0.3, -0.1])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.25, 0.028, 10, 40),
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
          [side * 0.55, -0.45, -2.0],
          [side * 0.55, -0.45, -2.9],
          0.065,
          k.steel,
        );
      }
      k.bar("chassis-rear", [-0.55, -0.45, -2.88], [0.55, -0.45, -2.88], 0.05, k.dark);
      k.panel("chassis-rear", [1.6, 0.5, 0.9], [0, -0.42, -1.2], k.dark, 0.06);

      // Blacked-out wheel centers over the kit hubs, per the concept.
      const caps = [
        ["wheel-fl", 1, 1.65],
        ["wheel-fr", -1, 1.65],
        ["wheel-rl", 1, -1.65],
        ["wheel-rr", -1, -1.65],
      ] as const;
      for (const [part, s, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.34, 0.34, 0.06, 48).rotateZ(Math.PI / 2),
          [s * 2.04, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.05, 32).rotateZ(Math.PI / 2),
          [s * 2.08, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.SphereGeometry(0.05, 24, 16),
          [s * 2.12, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "excavator",
    "Excavator",
    "Wheeled digger with a boom arm, bucket, and rotating glass cab.",
    [15247377, 2236966, 4869458, 0.9, 6],
    (k) => {
      const bucketSteel = finish(0x3d4046, 0.48, 0.72);
      const grease = finish(0x17181a, 0.7, 0.2);
      const seatMat = finish(0x2c2e33, 0.9, 0);

      // ---- Front stabilizers (hood): beam, jack legs, pads, work lights ----
      k.panel("hood", [2.3, 0.3, 0.4], [0, -0.15, 2.25], k.paint, 0.06);
      k.panel("hood", [1.1, 0.35, 0.45], [0, -0.62, 1.65], k.dark, 0.06);
      k.bar("hood", [-0.75, -0.02, 2.47], [0.75, -0.02, 2.47], 0.025, k.dark);
      for (const side of sides) {
        k.panel(
          "hood",
          [0.12, 0.34, 0.44],
          [side * 1.18, -0.15, 2.25],
          k.dark,
          0.03,
        );
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.14, 0.14, 0.3, 24).rotateZ(Math.PI / 2),
          [side * 1.0, -0.2, 2.25],
          k.paint,
        );
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.06, 0.06, 0.34, 16).rotateZ(Math.PI / 2),
          [side * 1.0, -0.2, 2.25],
          k.dark,
        );
        k.bar(
          "hood",
          [side * 1.0, -0.25, 2.25],
          [side * 1.16, -0.95, 2.3],
          0.12,
          k.paint,
        );
        k.bar(
          "hood",
          [side * 1.16, -0.9, 2.3],
          [side * 1.19, -1.3, 2.3],
          0.065,
          k.steel,
        );
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.09, 0.09, 0.1, 20),
          [side * 1.165, -0.95, 2.3],
          k.dark,
        );
        k.panel(
          "hood",
          [0.5, 0.09, 0.5],
          [side * 1.19, -1.37, 2.3],
          k.paint,
          0.02,
        );
        k.panel(
          "hood",
          [0.4, 0.05, 0.4],
          [side * 1.19, -1.43, 2.3],
          k.dark,
          0.015,
        );
        for (let i = 0; i < 3; i++)
          k.panel(
            "hood",
            [0.42, 0.03, 0.05],
            [side * 1.19, -1.46, 2.15 + i * 0.15],
            k.dark,
            0.008,
          );
        k.lamp("hood", [side * 0.55, -0.12, 2.47], 0.09);
        k.mesh(
          "hood",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.85, -0.32, 2.42],
          k.dark,
        );
        k.bar(
          "hood",
          [side * 0.55, -0.62, 1.7],
          [side * 1.35, -0.78, 1.65],
          0.05,
          k.steel,
        );
        k.bar(
          "hood",
          [side * 0.55, -0.62, 1.7],
          [side * 0.9, -0.69, 1.68],
          0.07,
          k.dark,
        );
        k.panel(
          "hood",
          [0.18, 0.1, 0.045],
          [side * 0.12, -0.15, 2.465],
          k.steel,
          0.008,
        ).rotation.z = side * 0.5;
      }

      // ---- Operator cab (roof): wraparound glass, beacon, interior ----
      k.panel("roof", [1.44, 0.42, 1.6], [-0.4, 1.21, 0.35], k.paint, 0.06);
      k.panel("roof", [1.5, 0.12, 1.66], [-0.4, 1.02, 0.35], k.dark, 0.03);
      for (let i = 0; i < 3; i++)
        k.panel(
          "roof",
          [0.04, 0.035, 0.5],
          [-1.13, 1.04 + i * 0.09, 0.5],
          k.dark,
          0.008,
        );
      k.panel("roof", [0.06, 0.05, 0.22], [-1.14, 1.32, 0.75], k.steel, 0.015);
      for (const hz of [0.55, 0.95])
        k.panel("roof", [0.05, 0.08, 0.06], [-1.14, 1.28, hz], k.dark, 0.015);
      for (const px of [-1.08, 0.24])
        for (const pz of [-0.37, 1.07])
          k.bar("roof", [px, 1.4, pz], [px, 2.36, pz], 0.055, k.paint);
      // Split windshield with dark frame.
      k.panel("roof", [0.62, 0.88, 0.05], [-0.725, 1.9, 1.12], k.glass, 0.02);
      k.panel("roof", [0.62, 0.88, 0.05], [-0.075, 1.9, 1.12], k.glass, 0.02);
      k.bar("roof", [-1.06, 2.33, 1.12], [0.26, 2.33, 1.12], 0.035, k.dark);
      k.bar("roof", [-1.06, 1.47, 1.12], [0.26, 1.47, 1.12], 0.035, k.dark);
      k.bar("roof", [-0.4, 1.47, 1.12], [-0.4, 2.33, 1.12], 0.035, k.dark);
      // Side and rear glass with frames.
      k.panel("roof", [0.05, 0.88, 1.3], [-1.1, 1.9, 0.35], k.glass, 0.02);
      k.bar("roof", [-1.1, 2.33, -0.32], [-1.1, 2.33, 1.02], 0.03, k.dark);
      k.bar("roof", [-1.1, 1.47, -0.32], [-1.1, 1.47, 1.02], 0.03, k.dark);
      k.bar("roof", [-1.1, 1.47, 0.35], [-1.1, 2.33, 0.35], 0.028, k.dark);
      k.panel("roof", [0.05, 0.88, 1.1], [0.3, 1.9, 0.3], k.glass, 0.02);
      k.bar("roof", [0.3, 2.33, -0.27], [0.3, 2.33, 0.87], 0.03, k.dark);
      k.bar("roof", [0.3, 1.47, -0.27], [0.3, 1.47, 0.87], 0.03, k.dark);
      k.panel("roof", [1.0, 0.7, 0.05], [-0.4, 1.95, -0.42], k.glass, 0.02);
      k.bar("roof", [-0.92, 2.32, -0.42], [0.12, 2.32, -0.42], 0.03, k.dark);
      k.bar("roof", [-0.92, 1.58, -0.42], [0.12, 1.58, -0.42], 0.03, k.dark);
      // Roof, beacon, work lights.
      k.panel("roof", [1.6, 0.14, 1.76], [-0.4, 2.43, 0.35], k.paint, 0.06);
      k.panel("roof", [1.6, 0.1, 0.08], [-0.4, 2.36, 1.24], k.paint, 0.03);
      k.panel("roof", [1.6, 0.1, 0.08], [-0.4, 2.36, -0.54], k.paint, 0.03);
      k.bar("roof", [-0.4, 2.5, 0.85], [-0.4, 2.62, 0.85], 0.08, k.dark);
      k.oval("roof", [0.115, 0.14, 0.115], [-0.4, 2.73, 0.85], k.amber);
      k.oval("roof", [0.06, 0.08, 0.06], [-0.4, 2.71, 0.85], k.white);
      k.lamp("roof", [-0.75, 2.36, 1.27], 0.07);
      k.lamp("roof", [-0.05, 2.36, 1.27], 0.07);
      k.lamp("roof", [-0.4, 2.36, -0.57], 0.07, k.white, -1);
      // Wipers.
      for (const wx of [-0.72, -0.08]) {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.035, 0.035, 0.04, 16).rotateX(Math.PI / 2),
          [wx, 1.55, 1.16],
          k.dark,
        );
        k.bar("roof", [wx, 1.55, 1.17], [wx + 0.12, 2.0, 1.17], 0.015, k.dark);
        k.bar(
          "roof",
          [wx + 0.02, 1.95, 1.17],
          [wx + 0.28, 2.1, 1.17],
          0.018,
          k.dark,
        );
      }
      // Mirrors.
      k.bar("roof", [-1.1, 2.2, 1.05], [-1.35, 2.25, 1.15], 0.025, k.dark);
      k.panel("roof", [0.08, 0.24, 0.16], [-1.38, 2.25, 1.15], k.dark, 0.03);
      k.panel("roof", [0.06, 0.18, 0.02], [-1.38, 2.25, 1.06], k.steel, 0.008);
      k.bar("roof", [0.3, 2.2, 1.05], [0.55, 2.25, 1.15], 0.025, k.dark);
      k.panel("roof", [0.08, 0.24, 0.16], [0.58, 2.25, 1.15], k.dark, 0.03);
      k.panel("roof", [0.06, 0.18, 0.02], [0.58, 2.25, 1.06], k.steel, 0.008);
      // Interior: seat, dash, joysticks.
      k.panel("roof", [1.3, 0.06, 1.4], [-0.4, 1.45, 0.3], k.dark, 0.02);
      k.panel("roof", [0.5, 0.16, 0.5], [-0.4, 1.6, -0.05], seatMat, 0.06);
      k.panel(
        "roof",
        [0.5, 0.6, 0.15],
        [-0.4, 1.95, -0.28],
        seatMat,
        0.06,
      ).rotation.x = -0.12;
      k.panel("roof", [0.3, 0.15, 0.12], [-0.4, 2.3, -0.33], seatMat, 0.05);
      k.panel("roof", [1.1, 0.3, 0.35], [-0.4, 1.62, 0.85], k.dark, 0.05);
      k.panel("roof", [0.08, 0.08, 0.02], [-0.55, 1.66, 0.67], k.white, 0.008);
      k.panel("roof", [0.08, 0.08, 0.02], [-0.25, 1.66, 0.67], k.amber, 0.008);
      for (const jx of [-0.62, -0.18]) {
        k.bar("roof", [jx, 1.55, 0.35], [jx, 1.85, 0.3], 0.03, k.dark);
        k.mesh("roof", new T.SphereGeometry(0.05, 20, 14), [jx, 1.87, 0.3], k.dark);
      }
      for (const gx of [-1.06, 0.22])
        k.bar("roof", [gx, 1.05, 1.1], [gx, 1.6, 1.1], 0.025, k.steel);

      // ---- Right flank (door-left): side frame, tanks, toolbox, rails ----
      k.panel("door-left", [0.3, 0.35, 3.3], [1.0, -0.35, 0], k.dark, 0.05);
      k.panel("door-left", [0.34, 0.08, 3.0], [1.0, -0.14, 0], k.paint, 0.02);
      k.panel("door-left", [0.5, 0.55, 0.8], [0.95, 0.15, -0.7], k.paint, 0.05);
      k.mesh(
        "door-left",
        new T.CylinderGeometry(0.06, 0.06, 0.08, 16),
        [0.95, 0.46, -0.7],
        k.dark,
      );
      k.panel("door-left", [0.06, 0.2, 0.08], [1.21, 0.15, -0.7], k.amber, 0.015);
      k.panel("door-left", [0.45, 0.4, 0.7], [0.95, 0.05, 0.45], k.paint, 0.04);
      k.panel("door-left", [0.49, 0.06, 0.74], [0.95, 0.28, 0.45], k.dark, 0.02);
      for (const lz of [0.25, 0.65])
        k.panel(
          "door-left",
          [0.06, 0.1, 0.08],
          [1.19, 0.12, lz],
          k.steel,
          0.015,
        );
      k.panel("door-left", [0.4, 0.06, 0.3], [0.95, -0.4, 0.45], k.steel, 0.02);
      k.panel("door-left", [0.4, 0.06, 0.3], [0.95, -0.62, 0.45], k.steel, 0.02);
      k.bar("door-left", [1.05, -0.1, 0.95], [1.05, 0.85, 0.95], 0.028, k.steel);
      k.bar("door-left", [1.05, -0.1, -0.2], [1.05, 0.85, -0.2], 0.028, k.steel);
      k.bar("door-left", [1.05, 0.85, 0.95], [1.05, 0.85, -0.2], 0.025, k.steel);
      for (const rz of [-1.5, -0.9, -0.3])
        k.bar(
          "door-left",
          [1.02, 0.78, rz],
          [1.02, 1.25, rz],
          0.025,
          k.steel,
        );
      k.bar(
        "door-left",
        [1.02, 1.25, -1.5],
        [1.02, 1.25, -0.3],
        0.025,
        k.steel,
      );
      k.panel("door-left", [0.05, 0.1, 2.6], [1.16, 0.28, 0], k.steel, 0.02);
      k.panel("door-left", [0.05, 0.07, 0.14], [1.16, 0.0, 1.45], k.amber, 0.012);
      k.panel("door-left", [0.05, 0.07, 0.14], [1.16, 0.0, -1.45], k.red, 0.012);

      // ---- Left flank (door-right): fuel tank, battery, cab steps ----
      k.panel("door-right", [0.3, 0.35, 3.3], [-1.0, -0.35, 0], k.dark, 0.05);
      k.panel("door-right", [0.34, 0.08, 3.0], [-1.0, -0.14, 0], k.paint, 0.02);
      k.mesh(
        "door-right",
        new T.CylinderGeometry(0.32, 0.32, 1.1, 32).rotateX(Math.PI / 2),
        [-0.95, -0.05, -0.6],
        k.paint,
      );
      for (const sz of [-0.9, -0.3])
        k.mesh(
          "door-right",
          new T.TorusGeometry(0.33, 0.025, 10, 40),
          [-0.95, -0.05, sz],
          k.dark,
        );
      k.mesh(
        "door-right",
        new T.CylinderGeometry(0.06, 0.06, 0.08, 16),
        [-0.95, 0.3, -0.6],
        k.dark,
      );
      k.panel("door-right", [0.45, 0.4, 0.5], [-0.95, 0.0, 0.55], k.dark, 0.04);
      k.panel("door-right", [0.49, 0.06, 0.54], [-0.95, 0.23, 0.55], k.steel, 0.02);
      k.panel("door-right", [0.08, 0.06, 0.08], [-0.85, 0.28, 0.45], k.red, 0.015);
      k.panel(
        "door-right",
        [0.08, 0.06, 0.08],
        [-1.05, 0.28, 0.65],
        k.steel,
        0.015,
      );
      for (const [sy, sz] of [
        [0.1, 0.35],
        [0.4, 0.35],
        [0.7, 0.35],
      ] as const)
        k.panel("door-right", [0.35, 0.06, 0.28], [-1.3, sy, sz], k.steel, 0.02);
      for (const hz of [0.25, 0.45]) {
        k.bar(
          "door-right",
          [-1.3, 1.0, hz],
          [-1.3, 0.05, hz],
          0.025,
          k.steel,
        );
        k.bar("door-right", [-1.3, 1.0, hz], [-1.1, 1.0, hz], 0.025, k.steel);
      }
      k.bar(
        "door-right",
        [-1.32, 0.7, 0.15],
        [-1.32, 1.9, 0.15],
        0.028,
        k.steel,
      );
      k.bar("door-right", [-1.05, -0.1, 0.95], [-1.05, 0.85, 0.95], 0.028, k.steel);
      k.bar("door-right", [-1.05, -0.1, -1.3], [-1.05, 0.85, -1.3], 0.028, k.steel);
      k.bar(
        "door-right",
        [-1.05, 0.85, 0.95],
        [-1.05, 0.85, -1.3],
        0.025,
        k.steel,
      );
      for (const rz of [-1.5, -0.9, -0.3])
        k.bar(
          "door-right",
          [-1.02, 0.78, rz],
          [-1.02, 1.25, rz],
          0.025,
          k.steel,
        );
      k.bar(
        "door-right",
        [-1.02, 1.25, -1.5],
        [-1.02, 1.25, -0.3],
        0.025,
        k.steel,
      );
      k.panel("door-right", [0.05, 0.1, 2.6], [-1.16, 0.28, 0], k.steel, 0.02);
      k.panel("door-right", [0.05, 0.07, 0.14], [-1.16, 0.0, 1.45], k.amber, 0.012);
      k.panel("door-right", [0.05, 0.07, 0.14], [-1.16, 0.0, -1.45], k.red, 0.012);

      // ---- Upper structure (bed): deck, slew ring, engine, counterweight ----
      k.panel("bed", [2.2, 0.12, 3.4], [0, 0.72, -0.4], k.paint, 0.03);
      for (let i = 0; i < 7; i++)
        k.bar(
          "bed",
          [-1.0, 0.79, -1.9 + i * 0.5],
          [1.0, 0.79, -1.9 + i * 0.5],
          0.015,
          k.dark,
        );
      for (const side of sides)
        k.bar(
          "bed",
          [side * 1.08, 0.72, -2.08],
          [side * 1.08, 0.72, 1.28],
          0.03,
          k.steel,
        );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.95, 1.0, 0.24, 48),
        [0, 0.52, -0.35],
        k.dark,
      );
      k.mesh(
        "bed",
        new T.TorusGeometry(0.92, 0.05, 10, 48).rotateX(Math.PI / 2),
        [0, 0.62, -0.35],
        grease,
      );
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * 2 * Math.PI;
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.03, 0.03, 0.06, 12),
          [Math.cos(a) * 1.0, 0.81, -0.35 + Math.sin(a) * 1.0],
          k.steel,
        );
      }
      k.panel("bed", [1.5, 0.24, 1.66], [-0.4, 0.89, 0.35], k.paint, 0.04);
      k.panel("bed", [1.9, 0.3, 1.7], [0.05, 0.93, -1.35], k.paint, 0.05);
      // Engine hood with top vents and side grilles.
      k.panel("bed", [1.7, 0.72, 1.25], [0.05, 1.44, -1.35], k.paint, 0.06);
      k.panel("bed", [1.5, 0.08, 1.1], [0.05, 1.83, -1.35], k.paint, 0.02);
      for (let i = 0; i < 6; i++)
        k.panel(
          "bed",
          [1.2, 0.03, 0.08],
          [0.05, 1.88, -1.8 + i * 0.18],
          k.dark,
          0.008,
        );
      for (const s of [-1, 1]) {
        const fx = 0.05 + s * 0.85;
        k.panel("bed", [0.06, 0.5, 0.9], [fx, 1.4, -1.35], k.dark, 0.02);
        for (let i = 0; i < 6; i++)
          k.panel(
            "bed",
            [0.04, 0.44, 0.06],
            [fx + s * 0.03, 1.4, -1.68 + i * 0.13],
            k.steel,
            0.008,
          );
      }
      k.panel("bed", [1.2, 0.5, 0.05], [0.05, 1.4, -0.71], k.dark, 0.02);
      // Counterweight with rear grille.
      k.panel("bed", [1.9, 0.85, 0.55], [0, 1.2, -2.3], k.paint, 0.1);
      k.panel("bed", [1.9, 0.08, 0.5], [0, 1.65, -2.3], k.dark, 0.02);
      k.panel("bed", [1.2, 0.5, 0.06], [0, 1.2, -2.59], k.dark, 0.02);
      for (let i = 0; i < 5; i++)
        k.panel(
          "bed",
          [0.07, 0.44, 0.04],
          [-0.44 + i * 0.22, 1.2, -2.63],
          k.steel,
          0.008,
        );
      for (const side of sides)
        k.panel(
          "bed",
          [0.12, 0.08, 0.03],
          [side * 0.75, 0.95, -2.6],
          k.red,
          0.01,
        );
      k.bar("bed", [0, 0.85, -2.6], [0, 0.85, -2.85], 0.05, k.dark);
      // Exhaust stack, air cleaner, rear rails, ladder, deck details.
      stack(k, "bed", -0.45, -1.75, 2.35);
      k.panel("bed", [0.16, 0.03, 0.16], [-0.45, 2.42, -1.83], k.dark, 0.01).rotation.x =
        0.3;
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.1, 0.1, 0.35, 20),
        [0.55, 1.95, -1.7],
        k.dark,
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.12, 0.12, 0.06, 20),
        [0.55, 2.14, -1.7],
        k.steel,
      );
      k.tube(
        "bed",
        [
          [0.55, 1.8, -1.7],
          [0.42, 1.62, -1.6],
          [0.3, 1.5, -1.5],
        ],
        0.05,
        k.dark,
        24,
      );
      for (const side of sides) {
        k.bar(
          "bed",
          [side * 1.0, 0.78, -2.0],
          [side * 1.0, 1.25, -2.0],
          0.025,
          k.steel,
        );
        k.bar(
          "bed",
          [side * 1.0, 1.25, -2.0],
          [side * 1.02, 1.25, -1.5],
          0.025,
          k.steel,
        );
      }
      k.bar("bed", [-1.0, 1.25, -2.0], [1.0, 1.25, -2.0], 0.025, k.steel);
      for (const lz of [-1.72, -1.98]) {
        k.bar("bed", [-1.12, -0.1, lz], [-1.12, 0.85, lz], 0.028, k.steel);
      }
      for (let i = 0; i < 4; i++) {
        const y = 0.3 + i * 0.15;
        k.bar("bed", [-1.26, y, -1.72], [-1.26, y, -1.98], 0.02, k.steel);
      }
      for (const side of sides)
        for (const tz of [1.1, -1.95])
          k.mesh(
            "bed",
            new T.TorusGeometry(0.05, 0.018, 8, 24).rotateX(Math.PI / 2),
            [side * 0.95, 0.79, tz],
            k.dark,
          );
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.05, 0.05, 0.3, 16),
        [0.85, 0.93, -1.95],
        k.red,
      );
      k.lamp("bed", [0.6, 1.9, -2.0], 0.07, k.white, -1);

      // ---- Digging gear (bed): boom foot, boom, rams, stick, bucket ----
      const cheekOutline = [
        [0.0, 0.78],
        [0.7, 0.78],
        [0.62, 1.72],
        [0.08, 1.78],
      ] as const;
      k.profile("bed", cheekOutline, 0.09, 0.47, k.paint, 0.03);
      k.profile("bed", cheekOutline, 0.09, 1.0, k.paint, 0.03);
      k.panel("bed", [0.7, 0.25, 0.8], [0.735, 0.9, 0.35], k.paint, 0.05);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.09, 0.09, 0.7, 24).rotateZ(Math.PI / 2),
        [0.735, 1.6, 0.35],
        k.dark,
      );
      for (const cx of [0.385, 1.085])
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.05, 0.05, 0.06, 16).rotateZ(Math.PI / 2),
          [cx, 1.6, 0.35],
          k.steel,
        );
      // Boom beam from foot pivot to elbow.
      k.panel(
        "bed",
        [0.4, 1.85, 0.55],
        [0.735, 2.275, 0.925],
        k.paint,
        0.05,
      ).rotation.x = 0.704;
      for (const side of sides)
        k.panel(
          "bed",
          [0.04, 1.5, 0.4],
          [0.735 + side * 0.21, 2.275, 0.925],
          k.paint,
          0.015,
        ).rotation.x = 0.704;
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.08, 0.08, 0.55, 24).rotateZ(Math.PI / 2),
        [0.735, 2.95, 1.5],
        k.dark,
      );
      for (const cx of [0.46, 1.01])
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.045, 0.045, 0.05, 16).rotateZ(Math.PI / 2),
          [cx, 2.95, 1.5],
          k.steel,
        );
      // Hoist ram under the boom.
      k.panel("bed", [0.3, 0.4, 0.25], [0.735, 0.95, -0.35], k.paint, 0.04);
      k.bar(
        "bed",
        [0.735, 1.05, -0.35],
        [0.735, 1.6, 0.24],
        0.11,
        k.paint,
      );
      k.bar(
        "bed",
        [0.735, 1.5, 0.14],
        [0.735, 2.045, 0.73],
        0.06,
        k.steel,
      );
      k.panel("bed", [0.2, 0.2, 0.2], [0.735, 2.0, 0.7], k.paint, 0.04);
      // Stick ram on top of the boom.
      k.panel("bed", [0.24, 0.24, 0.3], [0.735, 2.2, 0.87], k.paint, 0.04);
      k.bar(
        "bed",
        [0.735, 2.28, 0.9],
        [0.77, 2.74, 1.26],
        0.085,
        k.paint,
      );
      k.bar("bed", [0.77, 2.7, 1.22], [0.8, 3.2, 1.62], 0.05, k.steel);
      k.panel("bed", [0.2, 0.25, 0.2], [0.76, 3.05, 1.56], k.paint, 0.04);
      // Stick from elbow down to the bucket pin.
      k.panel(
        "bed",
        [0.28, 2.95, 0.38],
        [0.7275, 1.65, 2.1],
        k.paint,
        0.04,
      ).rotation.x = -0.433;
      for (const side of sides)
        k.panel(
          "bed",
          [0.03, 2.4, 0.3],
          [0.7275 + side * 0.15, 1.65, 2.1],
          k.paint,
          0.012,
        ).rotation.x = -0.433;
      // Bucket ram and links.
      k.bar("bed", [0.727, 1.52, 2.16], [0.724, 1.1, 2.4], 0.065, k.dark);
      k.bar("bed", [0.724, 1.14, 2.38], [0.72, 0.75, 2.62], 0.038, k.steel);
      for (const side of sides)
        k.bar(
          "bed",
          [0.72 + side * 0.17, 0.55, 2.58],
          [0.72 + side * 0.17, 0.2, 2.8],
          0.035,
          k.steel,
        );
      k.bar("bed", [0.4, 0.35, 2.7], [1.04, 0.35, 2.7], 0.055, k.steel);
      for (const bx of [0.55, 0.89])
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.08, 0.08, 0.08, 20).rotateZ(Math.PI / 2),
          [bx, 0.35, 2.7],
          k.dark,
        );
      // Steel bucket with teeth.
      const bucketOutline = [
        [2.6, 0.5],
        [2.9, 0.35],
        [3.1, -0.3],
        [2.95, -0.6],
        [2.6, -0.5],
        [2.5, 0.1],
      ] as const;
      k.profile("bed", bucketOutline, 0.06, 0.42, bucketSteel, 0.02);
      k.profile("bed", bucketOutline, 0.06, 1.02, bucketSteel, 0.02);
      k.panel(
        "bed",
        [0.6, 0.7, 0.08],
        [0.72, 0.15, 2.62],
        bucketSteel,
        0.02,
      ).rotation.x = -0.35;
      k.panel("bed", [0.6, 0.08, 0.6], [0.72, -0.5, 2.85], bucketSteel, 0.02);
      k.bar("bed", [0.4, -0.52, 3.12], [1.04, -0.52, 3.12], 0.05, bucketSteel);
      for (let i = 0; i < 5; i++)
        k.mesh(
          "bed",
          new T.ConeGeometry(0.07, 0.24, 4),
          [0.47 + i * 0.125, -0.6, 3.15],
          bucketSteel,
        ).rotation.x = Math.PI * 0.85;
      k.panel(
        "bed",
        [0.62, 0.06, 0.25],
        [0.72, 0.5, 2.55],
        bucketSteel,
        0.02,
      ).rotation.x = -0.3;
      for (const side of sides)
        k.panel(
          "bed",
          [0.04, 0.3, 0.4],
          [0.72 + side * 0.33, -0.3, 2.9],
          bucketSteel,
          0.015,
        ).rotation.x = 0.2;
      // Hydraulic hose runs up the boom.
      for (const hx of [0.6, 0.85])
        k.tube(
          "bed",
          [
            [hx, 1.1, -0.2],
            [hx + 0.02, 1.7, 0.3],
            [hx, 2.3, 0.9],
            [0.68, 2.85, 1.45],
            [0.7, 2.2, 1.9],
            [0.71, 1.4, 2.3],
          ],
          0.035,
          grease,
          48,
        );

      // ---- Front bumper: low bar, fogs, tow eyes ----
      k.panel("bumper-front", [2.2, 0.28, 0.3], [0, -0.42, 2.55], k.paint, 0.07);
      k.panel("bumper-front", [2.0, 0.1, 0.06], [0, -0.42, 2.71], k.dark, 0.02);
      for (const side of sides) {
        k.lamp("bumper-front", [side * 0.7, -0.42, 2.72], 0.08);
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.07, 0.025, 10, 28),
          [side * 0.35, -0.6, 2.6],
          k.dark,
        );
        k.panel(
          "bumper-front",
          [0.05, 0.07, 0.12],
          [side * 1.08, -0.42, 2.55],
          k.amber,
          0.012,
        );
      }
      k.panel("bumper-front", [0.36, 0.11, 0.03], [0, -0.42, 2.72], k.white, 0.01);

      // ---- Rear bumper: step, lights, flaps, hitch ----
      k.panel("bumper-rear", [2.0, 0.2, 0.36], [0, -0.15, -2.75], k.steel, 0.06);
      k.panel("bumper-rear", [1.8, 0.05, 0.3], [0, -0.03, -2.75], k.dark, 0.015);
      k.tailLights(-2.95, 0.0);
      for (const side of sides) {
        k.bar(
          "bumper-rear",
          [side * 1.65, -0.45, -2.78],
          [side * 1.65, -0.2, -2.78],
          0.03,
          k.dark,
        );
        k.panel(
          "bumper-rear",
          [0.55, 0.6, 0.06],
          [side * 1.65, -0.75, -2.78],
          k.dark,
          0.03,
        );
        k.panel(
          "bumper-rear",
          [0.4, 0.07, 0.03],
          [side * 1.65, -0.55, -2.82],
          k.red,
          0.012,
        );
      }
      k.bar("bumper-rear", [0, -0.3, -2.8], [0, -0.3, -3.1], 0.06, k.dark);

      // ---- Undercarriage: fenders, drivetrain, shocks, rear outriggers ----
      fenders(k, k.paint);
      k.oval("chassis-front", [0.28, 0.24, 0.3], [0, -0.8, 1.65], k.dark);
      k.bar("chassis-front", [0, -0.55, 1.5], [0, -0.5, 0.1], 0.07, k.steel);
      k.panel("chassis-front", [0.6, 0.4, 0.7], [0, -0.4, 0.5], k.dark, 0.06);
      k.bar("chassis-front", [-1.3, -0.75, 1.4], [1.3, -0.75, 1.4], 0.045, k.steel);
      k.oval("chassis-rear", [0.28, 0.24, 0.3], [0, -0.8, -1.65], k.dark);
      k.bar("chassis-rear", [0, -0.5, -0.2], [0, -0.55, -1.5], 0.07, k.steel);
      k.panel("chassis-rear", [0.7, 0.45, 0.8], [0, -0.4, -0.9], k.dark, 0.06);
      k.tube(
        "chassis-rear",
        [
          [0.5, -0.3, -0.5],
          [0.6, -0.2, -1.2],
          [0.5, -0.1, -1.7],
        ],
        0.06,
        k.steel,
        24,
      );
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          k.steel,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          k.steel,
        );
        k.bar(
          "chassis-rear",
          [side * 0.3, -0.5, -0.7],
          [side * 0.3, -0.5, -2.4],
          0.025,
          k.dark,
        );
        k.panel(
          "chassis-rear",
          [1.35, 0.22, 0.36],
          [side * 1.72, -0.28, -2.95],
          k.paint,
          0.05,
        );
        for (let i = 0; i < 3; i++)
          k.panel(
            "chassis-rear",
            [0.09, 0.24, 0.38],
            [side * (1.45 + i * 0.3), -0.28, -2.95],
            k.dark,
            0.01,
          );
        k.bar(
          "chassis-rear",
          [side * 2.3, -0.36, -2.95],
          [side * 2.3, -0.85, -2.95],
          0.095,
          k.paint,
        );
        k.bar(
          "chassis-rear",
          [side * 2.3, -0.85, -2.95],
          [side * 2.3, -1.3, -2.95],
          0.06,
          k.steel,
        );
        k.panel(
          "chassis-rear",
          [0.4, 0.09, 0.4],
          [side * 2.3, -1.35, -2.95],
          k.paint,
          0.02,
        );
        k.panel(
          "chassis-rear",
          [0.3, 0.05, 0.3],
          [side * 2.3, -1.41, -2.95],
          k.dark,
          0.015,
        );
      }

      // Dark hub caps over the kit hubs.
      const caps = [
        ["wheel-fl", 1, 1.65],
        ["wheel-fr", -1, 1.65],
        ["wheel-rl", 1, -1.65],
        ["wheel-rr", -1, -1.65],
      ] as const;
      for (const [part, s, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.12, 0.12, 0.06, 32).rotateZ(Math.PI / 2),
          [s * 2.12, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.04, 0.04, 0.09, 16).rotateZ(Math.PI / 2),
          [s * 2.13, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "motorhome",
    "Motorhome",
    "Class-A camper with a striped awning, roof AC, and a rear ladder.",
    [15919832, 2785151, 7040882, 0.82, 8],
    (k) => {
      const canvas = finish(0xf4efe2, 0.9, 0);
      const tint = finish(0x2b3430, 0.12, 0.45);

      // ---- Nose (hood): cab-over face, grille, lamps, stripes ----
      k.hull("hood", [
        [0.42, -0.15, 0.62, 1.1, 1.08],
        [2.44, -0.15, 0.62, 1.06, 1.02],
      ]);
      k.panel("hood", [2.0, 0.5, 0.12], [0, 0.24, 2.47], k.paint, 0.05);
      k.panel("hood", [2.02, 0.08, 0.06], [0, 0.47, 2.52], k.accent, 0.015);
      k.panel("hood", [2.02, 0.035, 0.06], [0, 0.56, 2.52], canvas, 0.01);
      k.panel("hood", [1.2, 0.4, 0.1], [0, 0.16, 2.52], k.dark, 0.03);
      for (let i = 0; i < 5; i++)
        k.panel(
          "hood",
          [1.08, 0.03, 0.04],
          [0, 0.03 + i * 0.07, 2.58],
          k.steel,
          0.008,
        );
      for (const side of sides) {
        k.lamp("hood", [side * 0.8, 0.3, 2.52], 0.13);
        k.lamp("hood", [side * 0.8, 0.03, 2.52], 0.06, k.amber);
      }
      k.panel("hood", [2.0, 0.16, 0.14], [0, -0.1, 2.44], k.dark, 0.04);
      k.panel("hood", [0.42, 0.13, 0.03], [0, -0.08, 2.52], canvas, 0.01);

      // ---- Cab top (roof): split windshield, cap, coach roof, AC ----
      k.hull("roof", [
        [0.9, 0.55, 2.5, 1.12, 1.08],
        [2.28, 0.55, 2.42, 1.08, 1.0],
        [2.46, 0.55, 0.78, 1.08, 1.06],
      ]);
      const tilt = -0.109;
      k.panel(
        "roof",
        [1.96, 1.56, 0.04],
        [0, 1.6, 2.4],
        k.dark,
        0.02,
      ).rotation.x = tilt;
      for (const side of sides)
        k.panel(
          "roof",
          [0.9, 1.5, 0.05],
          [side * 0.47, 1.6, 2.42],
          k.glass,
          0.02,
        ).rotation.x = tilt;
      k.bar("roof", [0, 0.86, 2.52], [0, 2.32, 2.34], 0.045, k.dark);
      for (const side of sides) {
        k.bar(
          "roof",
          [side * 1.0, 0.8, 2.5],
          [side * 0.97, 2.35, 2.32],
          0.05,
          k.paint,
        );
        k.bar(
          "roof",
          [side * 0.47, 0.95, 2.52],
          [side * 0.2, 1.55, 2.42],
          0.02,
          k.dark,
        );
        k.panel(
          "roof",
          [0.3, 0.025, 0.025],
          [side * 0.28, 1.45, 2.44],
          k.dark,
          0.008,
        ).rotation.x = tilt;
      }
      k.panel("roof", [2.0, 0.22, 0.3], [0, 2.42, 2.2], k.paint, 0.06);
      for (const x of [-0.72, -0.36, 0, 0.36, 0.72])
        k.panel("roof", [0.12, 0.07, 0.06], [x, 2.4, 2.36], k.amber, 0.015);
      k.panel("roof", [2.24, 0.14, 1.6], [0, 2.52, 1.55], k.paint, 0.05);
      k.panel("roof", [2.3, 0.14, 3.9], [0, 2.52, -1.0], k.paint, 0.05);
      for (const side of sides)
        k.bar(
          "roof",
          [side * 1.16, 2.47, 0.95],
          [side * 1.16, 2.47, -2.93],
          0.03,
          k.dark,
        );
      // Roof air-conditioner pod with grilles and fan.
      k.panel("roof", [1.15, 0.1, 1.45], [0, 2.62, -0.7], k.dark, 0.03);
      k.panel("roof", [1.05, 0.26, 1.35], [0, 2.78, -0.7], canvas, 0.07);
      k.panel("roof", [0.95, 0.06, 1.25], [0, 2.93, -0.7], k.paint, 0.02);
      for (let i = 0; i < 5; i++)
        k.panel(
          "roof",
          [0.9, 0.025, 0.05],
          [0, 2.7 + i * 0.045, -0.01],
          k.dark,
          0.008,
        );
      for (const side of sides)
        for (let i = 0; i < 3; i++)
          k.panel(
            "roof",
            [0.05, 0.025, 0.9],
            [side * 0.54, 2.72 + i * 0.05, -0.7],
            k.dark,
            0.008,
          );
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.3, 0.3, 0.05, 40),
        [0, 2.98, -0.7],
        k.dark,
      );
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.08, 0.08, 0.09, 24),
        [0, 2.99, -0.7],
        k.steel,
      );
      // Skylight, vent dome, antenna.
      k.panel("roof", [0.72, 0.1, 0.72], [0, 2.62, 0.35], k.dark, 0.03);
      k.panel("roof", [0.58, 0.08, 0.58], [0, 2.66, 0.35], tint, 0.025);
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.16, 0.18, 0.09, 32),
        [-0.55, 2.62, -2.1],
        k.steel,
      );
      k.oval("roof", [0.16, 0.1, 0.16], [-0.55, 2.68, -2.1], canvas);
      k.bar("roof", [0.95, 2.58, 0.7], [0.95, 3.02, 0.7], 0.015, k.dark);
      k.oval("roof", [0.03, 0.03, 0.03], [0.95, 3.04, 0.7], k.dark);
      // Cockpit hints behind the glass: dash, wheel, seats.
      k.panel("roof", [1.9, 0.22, 0.45], [0, 0.72, 2.1], k.dark, 0.06);
      k.mesh(
        "roof",
        new T.TorusGeometry(0.16, 0.026, 12, 40),
        [0.45, 1.05, 1.98],
        k.dark,
      ).rotation.x = -0.5;
      k.bar("roof", [0.45, 0.85, 2.08], [0.45, 1.02, 1.99], 0.03, k.steel);
      for (const side of sides) {
        k.panel(
          "roof",
          [0.55, 0.18, 0.55],
          [side * 0.5, 0.5, 1.35],
          k.dark,
          0.06,
        );
        k.panel(
          "roof",
          [0.55, 0.65, 0.16],
          [side * 0.5, 0.9, 1.1],
          k.dark,
          0.06,
        );
        k.panel(
          "roof",
          [0.3, 0.18, 0.12],
          [side * 0.5, 1.3, 1.08],
          k.dark,
          0.05,
        );
      }

      // ---- Coach sides: walls, cab glass, windows, stripes ----
      const coachWindow = (side: -1 | 1, z: number, w: number) => {
        const d = door(side);
        k.panel(d, [0.06, 0.86, w + 0.14], [side * 1.19, 1.62, z], k.dark, 0.02);
        k.panel(d, [0.05, 0.7, w], [side * 1.21, 1.62, z], tint, 0.018);
        k.bar(
          d,
          [side * 1.24, 1.62, z - w / 2],
          [side * 1.24, 1.62, z + w / 2],
          0.02,
          k.dark,
        );
        k.panel(
          d,
          [0.08, 0.05, w + 0.2],
          [side * 1.2, 2.09, z],
          k.paint,
          0.015,
        );
      };
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [-2.8, -0.15],
            [2.36, -0.15],
            [2.3, 0.62],
            [-2.74, 0.62],
          ],
          0.1,
          side * 1.12,
          k.paint,
          0.03,
        );
        k.profile(
          d,
          [
            [-2.8, 0.55],
            [0.95, 0.55],
            [0.95, 2.42],
            [-2.8, 2.42],
          ],
          0.1,
          side * 1.12,
          k.paint,
          0.03,
        );
        // Cab side glass with pillar and vent seam.
        k.panel(d, [0.06, 1.62, 1.3], [side * 1.19, 1.4, 1.62], k.dark, 0.02);
        k.panel(d, [0.05, 1.42, 1.12], [side * 1.21, 1.4, 1.62], tint, 0.018);
        k.bar(
          d,
          [side * 1.24, 0.75, 1.62],
          [side * 1.24, 2.15, 1.62],
          0.025,
          k.dark,
        );
        k.bar(
          d,
          [side * 1.24, 1.1, 1.1],
          [side * 1.24, 1.1, 2.14],
          0.018,
          k.dark,
        );
        k.panel(d, [0.07, 0.06, 0.28], [side * 1.2, 0.72, 1.15], k.steel, 0.02);
        // Double teal side stripes plus a canvas pinstripe.
        k.panel(d, [0.06, 0.11, 5.05], [side * 1.19, 0.3, -0.2], k.accent, 0.015);
        k.panel(d, [0.055, 0.035, 5.05], [side * 1.19, 0.4, -0.2], canvas, 0.01);
        k.panel(d, [0.055, 0.04, 5.05], [side * 1.19, 0.19, -0.2], k.accent, 0.01);
        k.panel(
          d,
          [0.055, 0.07, 3.75],
          [side * 1.19, 2.28, -0.92],
          k.accent,
          0.012,
        );
        // Chrome mirror on a swing arm.
        k.bar(
          d,
          [side * 1.1, 1.85, 2.25],
          [side * 1.42, 1.9, 2.3],
          0.03,
          k.dark,
        );
        k.panel(d, [0.1, 0.3, 0.2], [side * 1.45, 1.9, 2.3], k.dark, 0.03);
        k.panel(d, [0.08, 0.24, 0.03], [side * 1.45, 1.9, 2.19], k.steel, 0.012);
        // Cab step and grab bar.
        k.panel(d, [0.34, 0.07, 0.5], [side * 1.1, -0.18, 1.55], k.steel, 0.02);
        k.bar(
          d,
          [side * 1.19, 0.5, 2.2],
          [side * 1.19, 1.3, 2.25],
          0.025,
          k.steel,
        );
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, 2.28], k.amber, 0.012);
        k.panel(d, [0.05, 0.06, 0.12], [side * 1.19, -0.02, -2.7], k.red, 0.012);
        k.panel(d, [0.05, 0.07, 0.14], [side * 1.19, 2.0, -2.75], k.red, 0.012);
      }
      // Coach windows: entry side keeps a gap for the door.
      coachWindow(1, 0.68, 0.4);
      coachWindow(1, -1.2, 1.05);
      coachWindow(1, -2.3, 0.85);
      coachWindow(-1, 0.45, 0.85);
      coachWindow(-1, -0.75, 1.0);
      coachWindow(-1, -1.95, 1.0);

      // ---- Entry door + striped fabric awning (left flank) ----
      k.panel("door-left", [0.07, 1.62, 0.85], [1.19, 0.72, 0.0], k.paint, 0.02);
      k.panel("door-left", [0.05, 1.5, 0.73], [1.22, 0.72, 0.0], canvas, 0.015);
      k.panel("door-left", [0.06, 0.62, 0.65], [1.22, 1.3, 0.0], k.dark, 0.015);
      k.panel("door-left", [0.05, 0.5, 0.53], [1.24, 1.3, 0.0], tint, 0.015);
      k.panel("door-left", [0.06, 0.05, 0.22], [1.24, 0.72, 0.28], k.steel, 0.015);
      for (const y of [0.35, 1.1])
        k.panel("door-left", [0.05, 0.1, 0.06], [1.22, y, -0.38], k.steel, 0.012);
      k.panel("door-left", [0.05, 0.18, 0.73], [1.22, 0.02, 0.0], k.steel, 0.012);
      k.panel("door-left", [0.4, 0.07, 0.7], [1.15, -0.2, 0.0], k.steel, 0.02);
      k.panel("door-left", [0.3, 0.07, 0.6], [1.1, -0.35, 0.0], k.dark, 0.02);
      k.bar("door-left", [1.24, 0.3, 0.52], [1.24, 1.5, 0.52], 0.025, k.steel);
      k.panel("door-left", [0.07, 0.16, 0.2], [1.21, 2.02, 0.0], k.dark, 0.02);
      k.panel("door-left", [0.05, 0.1, 0.14], [1.24, 2.02, 0.0], k.amber, 0.015);
      k.bar("door-left", [1.2, 2.02, -0.85], [1.2, 2.02, 0.85], 0.035, k.dark);
      for (let i = 0; i < 8; i++) {
        const z = -0.75 + i * 0.1875 + 0.09375;
        const mat = i % 2 === 0 ? k.accent : canvas;
        k.panel(
          "door-left",
          [0.8, 0.03, 0.183],
          [1.56, 1.87, z],
          mat,
          0.008,
        ).rotation.z = -0.38;
        k.panel(
          "door-left",
          [0.025, 0.15, 0.183],
          [1.93, 1.64, z],
          i % 2 === 0 ? canvas : k.accent,
          0.006,
        );
      }
      k.bar("door-left", [1.93, 1.7, -0.8], [1.93, 1.7, 0.8], 0.03, canvas);
      for (const z of [-0.7, 0.7]) {
        k.bar("door-left", [1.2, 0.95, z], [1.9, 1.68, z], 0.024, k.steel);
        k.panel("door-left", [0.06, 0.12, 0.1], [1.2, 0.95, z], k.dark, 0.02);
      }

      // ---- Utility flank (right): hatches, hookups, fuel ----
      k.panel("door-right", [0.05, 0.4, 0.7], [-1.19, 0.0, -1.2], k.paint, 0.015);
      k.panel("door-right", [0.05, 0.4, 0.7], [-1.19, 0.0, -2.2], k.paint, 0.015);
      for (const z of [-1.2, -2.2]) {
        k.panel("door-right", [0.06, 0.05, 0.12], [-1.21, 0.1, z], k.steel, 0.012);
        k.bar(
          "door-right",
          [-1.21, -0.16, z - 0.3],
          [-1.21, -0.16, z + 0.3],
          0.015,
          k.dark,
        );
      }
      k.panel("door-right", [0.05, 0.28, 0.28], [-1.19, 0.0, -0.3], k.dark, 0.015);
      k.panel("door-right", [0.05, 0.22, 0.22], [-1.2, 0.0, -0.3], k.paint, 0.015);
      k.panel("door-right", [0.05, 0.3, 0.4], [-1.19, 0.0, 0.35], k.dark, 0.015);
      for (const dz of [-0.09, 0.09])
        k.mesh(
          "door-right",
          new T.CylinderGeometry(0.045, 0.045, 0.06, 20).rotateZ(Math.PI / 2),
          [-1.21, 0.0, 0.35 + dz],
          k.steel,
        );

      // ---- Rear cap (bed): window, lights, ladder, spare ----
      k.hull("bed", [
        [-2.92, -0.15, 2.45, 1.06, 1.0],
        [-2.3, -0.15, 2.45, 1.12, 1.08],
      ]);
      k.panel("bed", [1.25, 0.75, 0.07], [0, 1.7, -2.93], k.dark, 0.03);
      k.panel("bed", [1.1, 0.6, 0.06], [0, 1.7, -2.95], tint, 0.025);
      k.bar("bed", [-0.5, 1.7, -2.99], [0.5, 1.7, -2.99], 0.018, k.dark);
      k.bar("bed", [0.15, 1.45, -2.99], [0.45, 1.75, -2.99], 0.016, k.dark);
      k.panel("bed", [1.95, 0.11, 0.06], [0, 0.3, -2.93], k.accent, 0.015);
      k.panel("bed", [1.95, 0.035, 0.06], [0, 0.4, -2.93], canvas, 0.01);
      for (const side of sides) {
        k.panel(
          "bed",
          [0.24, 0.62, 0.09],
          [side * 0.93, 0.55, -2.94],
          k.dark,
          0.025,
        );
        k.lamp("bed", [side * 0.93, 0.65, -2.98], 0.08, k.red, -1);
        k.lamp("bed", [side * 0.93, 0.42, -2.98], 0.06, k.amber, -1);
        k.lamp("bed", [side * 0.93, 0.22, -2.98], 0.05, k.white, -1);
      }
      // Rear ladder with standoffs and roof hooks.
      for (const dx of [-0.17, 0.17])
        k.bar(
          "bed",
          [0.68 + dx, 0.0, -3.04],
          [0.68 + dx, 2.5, -3.04],
          0.03,
          k.steel,
        );
      for (let i = 0; i < 6; i++) {
        const y = 0.3 + i * 0.4;
        k.bar("bed", [0.51, y, -3.04], [0.85, y, -3.04], 0.022, k.steel);
      }
      for (const y of [0.15, 2.35])
        for (const dx of [-0.17, 0.17])
          k.bar(
            "bed",
            [0.68 + dx, y, -3.04],
            [0.68 + dx, y, -2.9],
            0.022,
            k.steel,
          );
      for (const dx of [-0.17, 0.17])
        k.bar(
          "bed",
          [0.68 + dx, 2.5, -3.04],
          [0.68 + dx, 2.62, -2.9],
          0.025,
          k.steel,
        );
      // Spare tire on a rear carrier, turned to face aft.
      k.spare("bed", [-0.38, 1.0, -3.02]);
      k.groups["bed"].children[k.groups["bed"].children.length - 1].rotation.set(
        0,
        Math.PI / 2,
        0,
      );
      k.bar("bed", [-0.38, 0.35, -2.9], [-0.38, 0.75, -3.0], 0.05, k.dark);
      k.bar("bed", [-0.38, 1.0, -2.88], [-0.38, 1.0, -3.0], 0.06, k.steel);
      k.panel("bed", [0.6, 0.4, 0.06], [-0.45, 0.05, -2.93], k.paint, 0.02);
      for (let i = 0; i < 3; i++)
        k.panel(
          "bed",
          [0.5, 0.03, 0.04],
          [-0.45, -0.05 + i * 0.08, -2.97],
          k.dark,
          0.008,
        );
      k.panel("bed", [0.1, 0.05, 0.06], [-0.2, 0.05, -2.97], k.steel, 0.012);
      for (const x of [-0.5, 0, 0.5])
        k.panel("bed", [0.14, 0.07, 0.05], [x, 2.32, -2.94], k.red, 0.015);
      for (const side of sides)
        k.panel("bed", [0.12, 0.07, 0.05], [side * 0.93, 0.02, -2.95], k.red, 0.012);
      k.panel("bed", [0.42, 0.13, 0.03], [0.05, -0.02, -2.95], canvas, 0.01);
      k.panel("bed", [0.2, 0.06, 0.05], [0.05, 0.09, -2.95], k.white, 0.012);

      // ---- Front bumper: bullbar, hooks, fogs ----
      k.panel("bumper-front", [2.4, 0.22, 0.3], [0, -0.14, 2.62], k.dark, 0.07);
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.7, -0.2, 2.82],
          [side * 0.7, 0.78, 2.82],
          0.06,
          k.steel,
        );
        k.bar(
          "bumper-front",
          [side * 0.7, -0.2, 2.62],
          [side * 0.7, -0.2, 2.82],
          0.05,
          k.steel,
        );
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.9, -0.2, 2.78],
          k.dark,
        );
        k.lamp("bumper-front", [side * 0.42, -0.14, 2.78], 0.07);
      }
      k.bar("bumper-front", [0, -0.15, 2.82], [0, 0.68, 2.82], 0.05, k.steel);
      for (const y of [0.68, 0.12])
        k.bar("bumper-front", [-0.7, y, 2.82], [0.7, y, 2.82], 0.055, k.steel);
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.14, 2.78], canvas, 0.01);

      // ---- Rear bumper: step, lights, hitch, flaps ----
      k.panel("bumper-rear", [2.3, 0.16, 0.45], [0, -0.14, -2.8], k.steel, 0.05);
      k.panel("bumper-rear", [2.1, 0.04, 0.35], [0, -0.04, -2.8], k.dark, 0.012);
      k.tailLights(-2.98, 0.08);
      k.bar("bumper-rear", [0, -0.3, -2.9], [0, -0.3, -3.12], 0.05, k.dark);
      k.panel("bumper-rear", [0.16, 0.12, 0.2], [0, -0.3, -3.1], k.dark, 0.03);
      for (const side of sides) {
        k.panel(
          "bumper-rear",
          [0.55, 0.42, 0.06],
          [side * 1.65, -0.55, -2.5],
          k.dark,
          0.03,
        );
        k.panel(
          "bumper-rear",
          [0.4, 0.06, 0.03],
          [side * 1.65, -0.42, -2.54],
          canvas,
          0.01,
        );
        k.panel(
          "bumper-rear",
          [0.4, 0.07, 0.3],
          [side * 1.0, -0.28, -2.85],
          k.dark,
          0.02,
        );
      }

      // ---- Chassis dressing: fenders, tanks, shocks, pipes ----
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
          [0.5, 0.35, 0.05],
          [side * 1.65, -0.6, 0.45],
          k.dark,
          0.03,
        );
      }
      k.bar("chassis-front", [0.78, -0.55, 0.55], [0.78, -0.55, -0.35], 0.26, k.steel);
      for (const z of [0.35, -0.15])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.27, 0.03, 10, 40),
          [0.78, -0.55, z],
          k.dark,
        );
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.06, 0.06, 0.08, 20),
        [0.78, -0.27, 0.1],
        k.dark,
      );
      k.panel("chassis-front", [0.5, 0.4, 0.7], [-0.78, -0.5, 0.1], k.dark, 0.06);
      k.panel("chassis-front", [1.4, 0.5, 0.9], [0, -0.35, -0.9], k.paint, 0.06);
      for (let i = 0; i < 3; i++)
        k.panel(
          "chassis-front",
          [1.2, 0.04, 0.05],
          [0, -0.45 + i * 0.12, -0.44],
          k.dark,
          0.01,
        );
      k.bar("chassis-rear", [0, -0.55, 1.6], [0, -0.6, -1.6], 0.07, k.dark);
      k.tube(
        "chassis-rear",
        [
          [0.45, -0.45, 0.8],
          [0.5, -0.5, -1.5],
          [0.55, -0.45, -2.8],
        ],
        0.06,
        k.steel,
      );
      k.panel("chassis-rear", [0.3, 0.24, 0.7], [0.5, -0.5, -2.2], k.dark, 0.08);
      k.panel("chassis-rear", [1.6, 0.4, 1.0], [0, -0.4, -1.9], k.dark, 0.06);

      // Dark hub caps over the gray kit hubs.
      const caps = [
        ["wheel-fl", 2.11, 1.65],
        ["wheel-fr", -2.11, 1.65],
        ["wheel-rl", 2.11, -1.65],
        ["wheel-rr", -2.11, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.04, 0.04, 0.09, 16).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.steel,
        );
      }
    },
  ),
  vehicle(
    "cable-car",
    "Cable Car",
    "Streetcar with open bench decks, a brass bell, and a clerestory roof.",
    [11086886, 16049597, 3816768, 0.78, 10],
    (k) => {
      const brass = gold();
      const wood = finish(0x9a6b3f, 0.7, 0);
      const woodDark = finish(0x6e4a2a, 0.75, 0);
      const signFace = finish(0x2e2a26, 0.6, 0.1);

      // ---- Open decks (hood = front, bed = rear): floors, benches, posts, dash ----
      for (const end of [1, -1] as const) {
        const part = end > 0 ? "hood" : "bed";
        const zc = end * 1.95;
        const zend = end * 2.6;
        // Plank floor.
        for (let i = 0; i < 9; i++)
          k.panel(
            part,
            [0.2, 0.06, 1.3],
            [-0.88 + i * 0.22, 0.12, zc],
            wood,
            0.015,
          );
        // Deck edge boards.
        for (const side of sides)
          k.panel(part, [0.08, 0.1, 1.3], [side * 0.99, 0.1, zc], k.paint, 0.02);
        k.panel(part, [2.06, 0.1, 0.08], [0, 0.1, zend], k.paint, 0.02);
        // Longitudinal benches along both sides: slat seats, legs, backrests.
        for (const side of sides) {
          const bx = side * 0.72;
          for (let s = 0; s < 4; s++)
            k.panel(
              part,
              [0.1, 0.04, 1.15],
              [bx - 0.15 + s * 0.1, 0.6, zc],
              wood,
              0.012,
            );
          k.panel(part, [0.05, 0.14, 1.15], [side * 0.94, 0.55, zc], woodDark, 0.012);
          for (const lz of [-0.45, 0, 0.45]) {
            k.panel(part, [0.06, 0.45, 0.06], [bx - 0.12, 0.37, zc + lz], woodDark, 0.012);
            k.panel(part, [0.06, 0.45, 0.06], [bx + 0.12, 0.37, zc + lz], woodDark, 0.012);
            k.panel(part, [0.05, 0.55, 0.05], [side * 0.97, 0.72, zc + lz], woodDark, 0.012);
          }
          for (let s = 0; s < 3; s++)
            k.panel(
              part,
              [0.04, 0.1, 1.15],
              [side * 0.97, 0.78 + s * 0.12, zc],
              wood,
              0.012,
            );
        }
        // Cream corner and mid posts up to the roof.
        for (const side of sides) {
          for (const pz of [zend - end * 0.05, zc])
            k.bar(part, [side * 1.0, 0.15, pz], [side * 1.0, 2.06, pz], 0.05, k.accent);
          // Side handrail over the bench backs plus brass grab bars.
          k.bar(
            part,
            [side * 1.0, 1.06, end * 1.35],
            [side * 1.0, 1.06, end * 2.55],
            0.045,
            k.accent,
          );
          for (const pz of [zend - end * 0.05, zc])
            k.bar(
              part,
              [side * 0.92, 0.55, pz],
              [side * 0.92, 1.65, pz],
              0.022,
              brass,
            );
        }
        // End dash panel with cream cap, lower apron, and upper end rail.
        k.panel(part, [2.06, 0.9, 0.08], [0, 0.6, zend], k.paint, 0.03);
        k.panel(part, [2.1, 0.07, 0.12], [0, 1.08, zend], k.accent, 0.02);
        k.panel(part, [2.06, 0.32, 0.08], [0, -0.06, zend], k.paint, 0.03);
        k.panel(part, [2.08, 0.05, 0.09], [0, 0.02, zend], k.accent, 0.012);
        k.bar(
          part,
          [-1.0, 1.72, zend - end * 0.05],
          [1.0, 1.72, zend - end * 0.05],
          0.04,
          k.accent,
        );
        for (const side of sides)
          k.bar(
            part,
            [side * 0.5, 1.08, zend - end * 0.05],
            [side * 0.5, 1.72, zend - end * 0.05],
            0.025,
            k.accent,
          );
        // Brake stand with a horizontal brake wheel.
        k.panel(part, [0.3, 0.08, 0.3], [0.35, 0.19, end * 1.5], k.dark, 0.02);
        k.panel(part, [0.1, 1.0, 0.1], [0.35, 0.62, end * 1.5], k.dark, 0.02);
        k.mesh(
          part,
          new T.TorusGeometry(0.16, 0.028, 12, 40),
          [0.35, 1.16, end * 1.5],
          k.steel,
        ).rotation.x = Math.PI / 2;
        k.bar(part, [0.21, 1.16, end * 1.5], [0.49, 1.16, end * 1.5], 0.02, k.steel);
        k.bar(
          part,
          [0.35, 1.16, end * 1.5 - 0.14],
          [0.35, 1.16, end * 1.5 + 0.14],
          0.02,
          k.steel,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.04, 0.04, 0.1, 16),
          [0.35, 1.16, end * 1.5],
          k.dark,
        );

        // ---- Cabin end wall with an open doorway, trim, and windows ----
        for (const side of sides)
          k.panel(part, [0.6, 1.9, 0.08], [side * 0.8, 1.1, end * 1.3], k.paint, 0.03);
        k.panel(part, [1.0, 0.2, 0.08], [0, 1.95, end * 1.3], k.paint, 0.03);
        for (const side of sides) {
          k.bar(
            part,
            [side * 0.52, 0.15, end * 1.36],
            [side * 0.52, 1.85, end * 1.36],
            0.035,
            k.accent,
          );
          k.panel(part, [0.4, 0.6, 0.06], [side * 0.8, 1.45, end * 1.32], k.accent, 0.02);
          k.panel(part, [0.3, 0.48, 0.05], [side * 0.8, 1.45, end * 1.345], k.glass, 0.015);
          k.bar(
            part,
            [side * 0.6, 0.5, end * 1.37],
            [side * 0.6, 1.7, end * 1.37],
            0.028,
            brass,
          );
        }
        k.bar(part, [-0.52, 1.85, end * 1.36], [0.52, 1.85, end * 1.36], 0.035, k.accent);
      }

      // ---- Cabin sides: wainscot walls, arched cream windows, frieze ----
      for (const side of sides) {
        const d = door(side);
        k.panel(d, [0.1, 0.62, 2.62], [side * 1.1, 0.46, 0], k.paint, 0.03);
        k.panel(d, [0.05, 0.06, 2.62], [side * 1.16, 0.68, 0], k.accent, 0.015);
        k.panel(d, [0.05, 0.06, 2.62], [side * 1.16, 0.26, 0], k.accent, 0.015);
        for (let i = 0; i < 7; i++)
          k.panel(d, [0.05, 0.5, 0.06], [side * 1.16, 0.47, -1.2 + i * 0.4], k.accent, 0.012);
        for (const wz of [-0.975, -0.325, 0.325, 0.975]) {
          k.panel(d, [0.08, 0.95, 0.6], [side * 1.1, 1.16, wz], k.accent, 0.02);
          k.panel(d, [0.06, 0.75, 0.46], [side * 1.13, 1.14, wz], k.glass, 0.015);
          k.mesh(
            d,
            new T.TorusGeometry(0.24, 0.035, 12, 32, Math.PI).rotateY(Math.PI / 2),
            [side * 1.14, 1.62, wz],
            k.accent,
          );
          k.bar(d, [side * 1.17, 0.78, wz], [side * 1.17, 1.52, wz], 0.02, k.accent);
          k.bar(
            d,
            [side * 1.17, 1.15, wz - 0.23],
            [side * 1.17, 1.15, wz + 0.23],
            0.02,
            k.accent,
          );
          k.panel(d, [0.1, 0.06, 0.66], [side * 1.11, 0.72, wz], k.accent, 0.015);
        }
        for (const pz of [-1.3, -0.65, 0, 0.65, 1.3])
          k.panel(d, [0.12, 1.0, 0.09], [side * 1.1, 1.16, pz], k.paint, 0.025);
        k.panel(d, [0.1, 0.3, 2.62], [side * 1.1, 1.72, 0], k.paint, 0.03);
        k.panel(d, [0.05, 0.05, 2.62], [side * 1.16, 1.6, 0], k.accent, 0.012);
        k.panel(d, [0.05, 0.05, 2.62], [side * 1.16, 1.86, 0], k.accent, 0.012);
        k.panel(d, [0.12, 0.24, 2.62], [side * 1.1, 1.97, 0], k.paint, 0.03);
        for (const pz of [-1.3, 1.3])
          k.panel(d, [0.12, 1.95, 0.12], [side * 1.1, 1.1, pz], k.accent, 0.03);
        for (const ry of [0.32, 0.6])
          for (let i = 0; i < 6; i++)
            k.mesh(
              d,
              new T.CylinderGeometry(0.022, 0.022, 0.04, 10).rotateZ(Math.PI / 2),
              [side * 1.16, ry, -1.0 + i * 0.4],
              k.steel,
            );
        k.panel(d, [0.14, 0.18, 2.62], [side * 1.08, 0.06, 0], k.paint, 0.03);
      }

      // ---- Roof: main slab, clerestory, bell, headlamps, destination boards ----
      k.panel("roof", [2.5, 0.12, 5.5], [0, 2.12, 0], k.paint, 0.05);
      for (const end of [1, -1] as const) {
        k.panel("roof", [2.5, 0.16, 0.08], [0, 2.1, end * 2.74], k.paint, 0.03);
        k.panel("roof", [2.54, 0.06, 0.1], [0, 2.03, end * 2.74], k.accent, 0.015);
      }
      for (const side of sides)
        k.panel("roof", [0.08, 0.1, 5.5], [side * 1.25, 2.1, 0], k.accent, 0.02);
      for (const end of [1, -1] as const) {
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.07, 0.08, 0.12, 24),
          [0.5, 2.24, end * 2.2],
          k.steel,
        );
        k.oval("roof", [0.09, 0.05, 0.09], [0.5, 2.32, end * 2.2], k.steel);
      }
      // Clerestory: cream base, posts, glass bands, mullions, cap.
      k.panel("roof", [1.5, 0.1, 2.5], [0, 2.23, 0], k.accent, 0.03);
      for (const side of sides) {
        for (const pz of [-1.15, 0, 1.15])
          k.panel("roof", [0.08, 0.45, 0.08], [side * 0.71, 2.45, pz], k.accent, 0.02);
        k.panel("roof", [0.05, 0.34, 2.3], [side * 0.71, 2.45, 0], k.glass, 0.015);
        for (let i = 0; i < 6; i++)
          k.bar(
            "roof",
            [side * 0.75, 2.28, -1.0 + i * 0.4],
            [side * 0.75, 2.62, -1.0 + i * 0.4],
            0.02,
            k.accent,
          );
      }
      for (const end of [1, -1] as const) {
        k.panel("roof", [1.37, 0.34, 0.05], [0, 2.45, end * 1.15], k.glass, 0.015);
        for (const mx of [-0.45, 0, 0.45])
          k.bar(
            "roof",
            [mx, 2.28, end * 1.185],
            [mx, 2.62, end * 1.185],
            0.02,
            k.accent,
          );
      }
      k.panel("roof", [1.54, 0.08, 2.54], [0, 2.66, 0], k.accent, 0.03);
      k.panel("roof", [1.7, 0.09, 2.7], [0, 2.74, 0], k.accent, 0.04);
      // Destination boards slung under both eaves.
      for (const side of sides) {
        k.panel("roof", [0.1, 0.36, 1.3], [side * 1.29, 1.98, 0], woodDark, 0.02);
        k.panel("roof", [0.06, 0.26, 1.14], [side * 1.33, 1.98, 0], signFace, 0.015);
        k.bar("roof", [side * 1.2, 1.82, -0.5], [side * 1.3, 1.82, -0.5], 0.025, k.dark);
        k.bar("roof", [side * 1.2, 1.82, 0.5], [side * 1.3, 1.82, 0.5], 0.025, k.dark);
      }
      // Brass bell on the front roof: base, yoke, lathed bell, clapper.
      k.panel("roof", [0.3, 0.08, 0.3], [0, 2.22, 1.7], brass, 0.02);
      for (const side of sides)
        k.bar("roof", [side * 0.12, 2.26, 1.7], [side * 0.12, 2.62, 1.7], 0.03, brass);
      k.bar("roof", [-0.12, 2.62, 1.7], [0.12, 2.62, 1.7], 0.025, brass);
      k.bar("roof", [0, 2.56, 1.7], [0, 2.62, 1.7], 0.02, brass);
      const bellProfile: Array<[number, number]> = [
        [0.16, 0],
        [0.155, 0.02],
        [0.11, 0.06],
        [0.075, 0.12],
        [0.062, 0.18],
        [0.07, 0.22],
        [0.045, 0.25],
        [0.015, 0.26],
      ];
      k.mesh(
        "roof",
        new T.LatheGeometry(
          bellProfile.map(([x, y]) => new T.Vector2(x, y)),
          48,
        ),
        [0, 2.32, 1.7],
        brass,
      );
      k.oval("roof", [0.035, 0.035, 0.035], [0, 2.28, 1.7], k.dark);
      // Brass headlamps on both roof ends.
      for (const end of [1, -1] as const) {
        const lz = end * 2.55;
        k.bar("roof", [-0.6, 2.18, lz], [-0.6, 2.3, lz], 0.035, brass);
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.11, 0.13, 0.24, 32).rotateX(Math.PI / 2),
          [-0.6, 2.36, lz + end * 0.05],
          brass,
        );
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.095, 0.095, 0.05, 32).rotateX(Math.PI / 2),
          [-0.6, 2.36, lz + end * 0.18],
          k.white,
        );
        k.mesh(
          "roof",
          new T.TorusGeometry(0.105, 0.02, 12, 40),
          [-0.6, 2.36, lz + end * 0.2],
          brass,
        );
        k.oval("roof", [0.05, 0.04, 0.05], [-0.6, 2.5, lz + end * 0.05], brass);
      }
      // Cabin ceiling and hanging hand straps.
      k.panel("roof", [2.1, 0.06, 2.5], [0, 2.02, 0], k.accent, 0.02);
      for (const sz of [-0.7, 0.7])
        for (const sx of [-0.5, 0.5]) {
          k.bar("roof", [sx, 1.99, sz], [sx, 1.8, sz], 0.015, k.dark);
          k.mesh("roof", new T.TorusGeometry(0.06, 0.015, 10, 24), [sx, 1.72, sz], woodDark);
        }

      // ---- End bumpers: beams, steps, tow loops, marker lamps ----
      for (const end of [1, -1] as const) {
        const part = end > 0 ? "bumper-front" : "bumper-rear";
        const bz = end * 2.72;
        k.panel(part, [2.3, 0.22, 0.28], [0, -0.08, bz], k.dark, 0.06);
        k.panel(part, [1.9, 0.08, 0.42], [0, -0.3, bz + end * 0.05], k.steel, 0.02);
        for (const side of sides)
          k.bar(
            part,
            [side * 0.8, -0.19, bz],
            [side * 0.8, -0.3, bz + end * 0.05],
            0.03,
            k.dark,
          );
        k.mesh(
          part,
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [0, -0.2, bz + end * 0.16],
          k.steel,
        );
        for (const side of sides)
          k.lamp(part, [side * 0.85, -0.08, bz + end * 0.14], 0.07, end > 0 ? k.white : k.red, end);
      }
      k.tailLights(-2.86, 0.1);

      // ---- Underframe: sills, truss rods, brakes, tanks, running boards ----
      for (const end of [1, -1] as const) {
        const part = end > 0 ? "chassis-front" : "chassis-rear";
        for (const side of sides)
          k.panel(part, [0.14, 0.24, 2.65], [side * 1.02, -0.12, end * 1.325], k.dark, 0.03);
        for (const bx of [-0.7, 0, 0.7])
          k.panel(part, [0.12, 0.14, 2.65], [bx, 0.02, end * 1.325], k.dark, 0.02);
        for (const cz of [0.25, 0.85, 1.5, 2.1, 2.55])
          k.panel(part, [1.95, 0.12, 0.14], [0, -0.18, end * cz], k.steel, 0.02);
        for (const side of sides) {
          k.bar(
            part,
            [side * 0.95, -0.3, end * 0.15],
            [side * 0.95, -0.3, end * 2.5],
            0.025,
            k.steel,
          );
          for (const qz of [0.85, 1.5, 2.1])
            k.bar(
              part,
              [side * 0.95, -0.3, end * qz],
              [side * 0.95, 0.0, end * qz],
              0.022,
              k.steel,
            );
          k.panel(part, [0.3, 0.32, 0.42], [side * 1.08, -0.8, end * 1.65], k.dark, 0.05);
          for (let s = 0; s < 3; s++)
            k.panel(
              part,
              [0.08, 0.04, 0.7],
              [side * 1.08, -0.6 + s * 0.05, end * 1.65],
              k.steel,
              0.012,
            );
          for (const hz of [1.35, 1.95])
            k.bar(
              part,
              [side * 1.08, -0.45, end * hz],
              [side * 1.08, -0.24, end * hz],
              0.022,
              k.dark,
            );
          k.shock(
            part,
            [side * 1.18, 0.55, end * 1.65],
            [side * 1.45, -0.67, end * 1.65],
            k.accent,
          );
          k.bar(part, [side * 1.2, -0.5, end * 1.65], [side * 0.6, -0.5, end * 1.65], 0.05, k.dark);
          k.bar(part, [side * 0.9, -0.5, end * 1.65], [side * 0.9, -0.24, end * 1.65], 0.025, k.dark);
          // Running board with grip strips and hanger brackets.
          k.panel(part, [0.3, 0.07, 0.95], [side * 1.08, -0.02, end * 0.475], wood, 0.02);
          for (const gz of [0.2, 0.475, 0.75])
            k.panel(part, [0.28, 0.02, 0.06], [side * 1.08, 0.025, end * gz], k.dark, 0.008);
          for (const hz of [0.15, 0.8])
            k.bar(
              part,
              [side * 1.02, -0.2, end * hz],
              [side * 1.08, -0.05, end * hz],
              0.022,
              k.steel,
            );
          // Deck boarding step.
          k.panel(part, [0.45, 0.07, 0.35], [side * 1.0, -0.25, end * 1.95], k.steel, 0.02);
          k.bar(
            part,
            [side * 1.02, -0.2, end * 1.95],
            [side * 1.0, -0.28, end * 1.95],
            0.025,
            k.dark,
          );
        }
        // Cabin bench seat facing the far end.
        k.panel(part, [1.7, 0.09, 0.42], [0, 0.62, end * 0.6], wood, 0.02);
        for (const side of sides)
          k.panel(part, [0.08, 0.45, 0.36], [side * 0.7, 0.37, end * 0.6], woodDark, 0.015);
        k.panel(part, [1.7, 0.45, 0.08], [0, 0.9, end * 0.85], wood, 0.02);
        k.panel(part, [1.74, 0.06, 0.12], [0, 1.14, end * 0.85], woodDark, 0.015);
      }
      // Air tank and brake cylinder slung under opposite halves.
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.16, 0.16, 1.1, 32).rotateX(Math.PI / 2),
        [0.45, -0.4, 0.9],
        k.steel,
      );
      k.oval("chassis-front", [0.16, 0.16, 0.1], [0.45, -0.4, 1.45], k.steel);
      k.oval("chassis-front", [0.16, 0.16, 0.1], [0.45, -0.4, 0.35], k.steel);
      k.bar("chassis-front", [0.45, -0.56, 0.6], [0.45, -0.24, 0.6], 0.03, k.dark);
      k.bar("chassis-front", [0.45, -0.56, 1.2], [0.45, -0.24, 1.2], 0.03, k.dark);
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.12, 0.12, 0.5, 24).rotateX(Math.PI / 2),
        [-0.45, -0.38, -0.9],
        k.dark,
      );
      k.panel("chassis-rear", [0.5, 0.4, 0.7], [-0.45, -0.35, -0.9], k.dark, 0.06);

      // Dark hub caps with brass centers over the kit hubs.
      const caps = [
        ["wheel-fl", 2.06, 1.65],
        ["wheel-fr", -2.06, 1.65],
        ["wheel-rl", 2.06, -1.65],
        ["wheel-rr", -2.06, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.13, 0.13, 0.06, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.045, 0.045, 0.09, 16).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          brass,
        );
      }
    },
  ),
  vehicle(
    "sneaker-speeder",
    "Sneaker Speeder",
    "Giant high-top sneaker with laces, an air cushion, and a tongue spoiler.",
    [13187630, 16119280, 2829875, 0.8, 6],
    (k) => {
      const suede = finish(13187630, 0.88, 0);
      const suedeDark = finish(0x8e2318, 0.9, 0);
      const leather = k.accent;
      const thread = finish(0xf0dfc0, 0.7, 0);
      const airGlass = finish(0xbfe3ef, 0.12, 0.35);
      const airBubble = finish(0xf4fbff, 0.25, 0.1);
      const gum = finish(0x6e241a, 0.92, 0);

      // ---- Toe (hood): toe box, white cap, headlamps, perforations ----
      k.hull(
        "hood",
        [
          [0.42, -0.15, 0.6, 1.12, 1.02],
          [1.5, -0.18, 0.55, 1.1, 1.0],
          [2.42, -0.2, 0.35, 0.92, 0.86],
        ],
        suede,
      );
      k.oval("hood", [1.0, 0.5, 0.95], [0, 0.45, 1.5], suede);
      k.oval("hood", [0.93, 0.42, 0.5], [0, 0.08, 2.3], leather);
      k.tube(
        "hood",
        [
          [-0.88, 0.22, 2.28],
          [-0.5, 0.4, 2.48],
          [0, 0.42, 2.59],
          [0.5, 0.4, 2.48],
          [0.88, 0.22, 2.28],
        ],
        0.02,
        thread,
        40,
      );
      for (let r = 0; r < 2; r++)
        for (let i = -2; i <= 2; i++)
          k.panel(
            "hood",
            [0.05, 0.025, 0.05],
            [
              i * 0.15,
              (r === 0 ? 0.488 : 0.442) - Math.abs(i) * (r === 0 ? 0.006 : 0.007),
              r === 0 ? 2.2 : 2.05,
            ],
            suedeDark,
            0.008,
          );
      for (const side of sides) k.lamp("hood", [side * 0.55, 0.22, 2.7], 0.13);

      // ---- Instep saddle and padded tongue ramp under the laces (roof) ----
      k.hull(
        "roof",
        [
          [-0.6, 0.35, 1.5, 0.85, 0.72],
          [0.5, 0.35, 1.0, 0.9, 0.78],
          [1.55, 0.3, 0.7, 0.95, 0.8],
        ],
        suede,
      );
      const ramp = k.panel("roof", [0.8, 2.0, 0.2], [0, 1.06, 0.36], suede, 0.08);
      ramp.rotation.x = -1.1;
      const tongue = k.panel(
        "roof",
        [0.8, 0.8, 0.24],
        [0, 1.68, -0.62],
        suede,
        0.1,
      );
      tongue.rotation.x = -0.35;
      const tag = new T.Mesh(new T.BoxGeometry(0.46, 0.3, 0.05), leather);
      tag.position.set(0, 0.15, 0.13);
      tag.castShadow = tag.receiveShadow = true;
      tongue.add(tag);
      const tagDot = new T.Mesh(
        new T.SphereGeometry(0.08, 24, 16),
        suedeDark,
      );
      tagDot.scale.set(1, 1, 0.55);
      tagDot.position.set(0, 0.15, 0.17);
      tagDot.castShadow = true;
      tongue.add(tagDot);
      // Crisscross laces between the eyelet rows.
      const eye: [number, number, number][] = [0, 1, 2, 3, 4, 5].map((i) => [
        0.6 + i * 0.035,
        0.8 + i * 0.13,
        1.2 - i * 0.33,
      ]);
      k.tube(
        "roof",
        [
          [-eye[0][0], eye[0][1], eye[0][2]],
          [0, eye[0][1] + 0.04, eye[0][2]],
          [eye[0][0], eye[0][1], eye[0][2]],
        ],
        0.05,
        leather,
        20,
      );
      for (let i = 0; i < 5; i++) {
        const [ax, ay, az] = eye[i];
        const [bx, by, bz] = eye[i + 1];
        const up = i % 2 === 0 ? 0.07 : 0.035;
        const down = i % 2 === 0 ? 0.035 : 0.07;
        k.tube(
          "roof",
          [
            [-ax, ay, az],
            [0, (ay + by) / 2 + up, (az + bz) / 2],
            [bx, by, bz],
          ],
          0.05,
          leather,
          24,
        );
        k.tube(
          "roof",
          [
            [-bx, by, bz],
            [0, (ay + by) / 2 + down, (az + bz) / 2],
            [ax, ay, az],
          ],
          0.05,
          leather,
          24,
        );
      }
      // Tied bow: knot and loops resting on the top lace.
      k.oval("roof", [0.1, 0.08, 0.1], [0, 1.52, -0.34], leather);
      for (const side of sides) {
        const loop = k.mesh(
          "roof",
          new T.TorusGeometry(0.11, 0.04, 10, 24),
          [side * 0.16, 1.58, -0.34],
          leather,
        );
        loop.rotation.y = Math.PI / 2 + side * 0.4;
      }

      // ---- Quarters (doors): collar, windows, eyelets, midsole, air ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [1.35, -0.12],
            [1.35, 0.55],
            [-0.5, 0.95],
            [-0.7, 1.95],
            [-1.8, 1.95],
            [-1.8, -0.12],
          ],
          0.14,
          side * 1.1,
          suede,
          0.04,
        );
        k.profile(
          d,
          [
            [1.3, -0.1],
            [1.3, 0.5],
            [-0.5, 0.9],
            [-0.5, -0.1],
          ],
          0.24,
          side * 0.92,
          suede,
          0.04,
        );
        // Padded ankle bones on the collar.
        k.oval(d, [0.12, 0.22, 0.26], [side * 1.14, 0.88, -1.0], suedeDark);
        k.oval(d, [0.1, 0.24, 0.24], [side * 1.14, 0.82, -1.7], suede);
        // Collar windows with steel frames.
        k.panel(d, [0.06, 0.5, 0.5], [side * 1.19, 1.35, -0.95], k.glass, 0.02);
        k.panel(d, [0.06, 0.5, 0.5], [side * 1.19, 1.35, -1.53], k.glass, 0.02);
        k.bar(
          d,
          [side * 1.21, 1.63, -0.66],
          [side * 1.21, 1.63, -1.82],
          0.028,
          k.steel,
        );
        k.bar(
          d,
          [side * 1.21, 1.07, -0.66],
          [side * 1.21, 1.07, -1.82],
          0.028,
          k.steel,
        );
        for (const pz of [-0.66, -1.24, -1.82])
          k.bar(
            d,
            [side * 1.21, 1.63, pz],
            [side * 1.21, 1.07, pz],
            0.028,
            k.steel,
          );
        // Collar top trim.
        k.tube(
          d,
          [
            [side * 1.1, 2.0, -0.65],
            [side * 1.1, 2.0, -1.25],
            [side * 1.1, 2.0, -1.85],
          ],
          0.08,
          suedeDark,
          20,
        );
        // Eyestay with silver eyelets.
        k.tube(
          d,
          eye.map(
            ([ex, ey, ez], i) =>
              [side * (ex + 0.1 - i * 0.016), ey + 0.01, ez + 0.02] as [
                number,
                number,
                number,
              ],
          ),
          0.075,
          suedeDark,
          40,
        );
        for (const [ex, ey, ez] of eye) {
          const ring = k.mesh(
            d,
            new T.TorusGeometry(0.055, 0.022, 10, 24),
            [side * ex, ey, ez],
            k.steel,
          );
          ring.rotation.x = -1.05;
          ring.rotation.y = side * 0.45;
        }
        // White midsole with red pinstripe over a gum outsole.
        k.panel(d, [0.14, 0.4, 3.9], [side * 1.12, -0.02, -0.1], leather, 0.06);
        k.bar(
          d,
          [side * 1.195, 0.19, 1.85],
          [side * 1.195, 0.19, -2.05],
          0.022,
          suedeDark,
        );
        k.panel(d, [0.16, 0.14, 3.9], [side * 1.12, -0.29, -0.1], gum, 0.05);
        // Visible air cushion with pressure chambers.
        k.panel(d, [0.18, 0.26, 1.5], [side * 1.12, -0.02, -1.0], airGlass, 0.06);
        for (const bz of [-1.4, -1.0, -0.6])
          k.oval(d, [0.05, 0.07, 0.16], [side * 1.2, -0.02, bz], airBubble);
        k.bar(
          d,
          [side * 1.21, 0.12, -0.3],
          [side * 1.21, 0.12, -1.7],
          0.02,
          k.steel,
        );
        k.bar(
          d,
          [side * 1.21, -0.16, -0.3],
          [side * 1.21, -0.16, -1.7],
          0.02,
          k.steel,
        );
        // Side slash and stitching.
        const slash = k.panel(
          d,
          [0.06, 0.2, 1.2],
          [side * 1.2, 0.4, 0.35],
          leather,
          0.025,
        );
        slash.rotation.x = 0.45;
        k.bar(d, [side * 1.215, 0.25, 1.3], [side * 1.215, 0.25, -1.75], 0.018, thread);
        k.bar(d, [side * 1.215, 0.1, -1.79], [side * 1.215, 1.9, -1.79], 0.018, thread);
      }

      // ---- Heel (bed): counter, collar pad, opening, spoiler tongue ----
      k.hull(
        "bed",
        [
          [-2.55, -0.15, 0.65, 1.05, 0.95],
          [-0.8, -0.15, 0.75, 1.1, 1.0],
        ],
        suede,
      );
      k.oval("bed", [1.02, 0.75, 0.65], [0, 0.75, -1.95], suede);
      k.panel("bed", [1.9, 0.14, 1.1], [0, 1.92, -1.25], suede, 0.05);
      k.oval("bed", [0.7, 0.1, 0.5], [0, 2.0, -1.25], k.dark);
      const rim = k.mesh(
        "bed",
        new T.TorusGeometry(0.62, 0.13, 14, 48),
        [0, 2.0, -1.25],
        suedeDark,
      );
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(1, 0.8, 1);
      const spoiler = k.panel(
        "bed",
        [1.5, 1.0, 0.28],
        [0, 2.32, -1.8],
        suede,
        0.12,
      );
      spoiler.rotation.x = -0.3;
      const sLabel = new T.Mesh(new T.BoxGeometry(0.7, 0.4, 0.05), leather);
      sLabel.position.set(0, 0.12, 0.15);
      sLabel.castShadow = sLabel.receiveShadow = true;
      spoiler.add(sLabel);
      const sDot = new T.Mesh(
        new T.SphereGeometry(0.09, 24, 16),
        suedeDark,
      );
      sDot.scale.set(1, 1, 0.5);
      sDot.position.set(0, 0.12, 0.19);
      sDot.castShadow = true;
      spoiler.add(sDot);
      for (const tx of [-0.68, 0.68]) {
        const trim = new T.Mesh(new T.BoxGeometry(0.08, 0.9, 0.3), leather);
        trim.position.set(tx, 0, 0);
        trim.castShadow = trim.receiveShadow = true;
        spoiler.add(trim);
      }
      const pull = k.mesh(
        "bed",
        new T.TorusGeometry(0.12, 0.04, 10, 24),
        [0, 2.86, -1.95],
        leather,
      );
      pull.rotation.y = Math.PI / 2;
      k.panel("bed", [0.3, 0.9, 0.06], [0, 0.8, -2.58], k.steel, 0.02);
      for (const side of sides)
        k.lamp("bed", [side * 0.8, 0.5, -2.38], 0.09, k.red, -1);
      k.tube(
        "bed",
        [
          [-0.9, 0.5, -2.2],
          [0, 0.35, -2.5],
          [0.9, 0.5, -2.2],
        ],
        0.02,
        thread,
        32,
      );

      // ---- Sole wraps (bumpers): midsole, lugs, lights ----
      k.panel("bumper-front", [2.3, 0.36, 0.42], [0, -0.04, 2.52], leather, 0.1);
      k.bar("bumper-front", [-1.1, 0.1, 2.72], [1.1, 0.1, 2.72], 0.022, suedeDark);
      for (let i = -2; i <= 2; i++)
        k.panel("bumper-front", [0.3, 0.16, 0.3], [i * 0.42, -0.3, 2.55], gum, 0.04);
      for (const side of sides)
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.03, 10, 24),
          [side * 0.6, -0.32, 2.76],
          leather,
        );
      k.panel("bumper-front", [0.4, 0.12, 0.04], [0, -0.04, 2.74], k.white, 0.01);
      k.panel("bumper-rear", [2.3, 0.36, 0.42], [0, -0.04, -2.58], leather, 0.1);
      k.bar("bumper-rear", [-1.1, 0.1, -2.78], [1.1, 0.1, -2.78], 0.022, suedeDark);
      for (let i = -2; i <= 2; i++)
        k.panel("bumper-rear", [0.3, 0.16, 0.3], [i * 0.42, -0.3, -2.6], gum, 0.04);
      k.tailLights(-2.8, 0.16);

      // ---- Chassis: sole fenders, shocks, gum tread ----
      fenders(k, leather);
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          leather,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          leather,
        );
      }
      k.panel("chassis-front", [1.7, 0.16, 1.9], [0, -0.44, 0.95], gum, 0.05);
      k.panel("chassis-rear", [1.7, 0.16, 1.7], [0, -0.44, -1.55], gum, 0.05);
      for (const [part, z0] of [
        ["chassis-front", 0.5],
        ["chassis-rear", -1.9],
      ] as const)
        for (let i = 0; i < 3; i++) {
          const z = z0 + i * 0.45;
          k.bar(
            part,
            [-0.7, -0.53, z],
            [0.7, -0.53, z + (i % 2 === 0 ? 0.22 : -0.22)],
            0.03,
            suedeDark,
          );
        }

      // White hub caps with red centers over the kit hubs.
      const caps = [
        ["wheel-fl", 2.08, 1.65],
        ["wheel-fr", -2.08, 1.65],
        ["wheel-rl", 2.08, -1.65],
        ["wheel-rr", -2.08, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.14, 0.14, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          leather,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.05, 0.05, 0.1, 16).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          suedeDark,
        );
      }
    },
  ),
  vehicle(
    "teapot-tempest",
    "Teapot Tempest",
    "Porcelain teapot with a spout nose, whistle cap, and steaming lid.",
    [8369881, 15043504, 5133918, 0.78, 8],
    (k) => {
      const petalPink = finish(0xd96a9b, 0.5, 0.05);
      const deepPink = finish(0xb03a72, 0.55, 0.05);
      const leafGreen = finish(0x4e8a4f, 0.6, 0);
      const cream = finish(0xfff3e0, 0.4, 0.05);
      const steamMat = new T.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
        roughness: 0.9,
        emissive: 0xcfd8dc,
        emissiveIntensity: 0.25,
        depthWrite: false,
      });
      const petalGeo = new T.SphereGeometry(1, 18, 12);
      const leafGeo = new T.SphereGeometry(1, 14, 10);

      // Door-bulge ellipsoid surface, so every side petal sits ON the porcelain.
      const sideX = (y: number, z: number) => {
        const dy = (y - 0.75) / 0.55;
        const dz = (z + 0.1) / 1.5;
        return 1.12 + 0.28 * Math.sqrt(Math.max(0.08, 1 - dy * dy - dz * dz));
      };

      const sideFlower = (side: 1 | -1, y: number, z: number, s: number) => {
        const d = door(side);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const py = y + Math.cos(a) * 0.17 * s;
          const pz = z + Math.sin(a) * 0.17 * s;
          const petal = k.mesh(
            d,
            petalGeo,
            [side * (sideX(py, pz) + 0.02), py, pz],
            i % 2 ? k.accent : petalPink,
          );
          petal.scale.set(0.07 * s, 0.13 * s, 0.095 * s);
          petal.rotation.x = a;
        }
        const center = k.mesh(
          d,
          petalGeo,
          [side * (sideX(y, z) + 0.03), y, z],
          cream,
        );
        center.scale.set(0.07 * s, 0.08 * s, 0.08 * s);
        const dot = k.mesh(
          d,
          petalGeo,
          [side * (sideX(y, z) + 0.06), y, z],
          deepPink,
        );
        dot.scale.set(0.05 * s, 0.035 * s, 0.035 * s);
        for (const lside of [-1, 1]) {
          const ly = y - 0.3 * s;
          const lz = z + lside * 0.2 * s;
          const leaf = k.mesh(
            d,
            leafGeo,
            [side * (sideX(ly, lz) + 0.02), ly, lz],
            leafGreen,
          );
          leaf.scale.set(0.05 * s, 0.09 * s, 0.17 * s);
          leaf.rotation.x = lside * 0.7;
        }
        k.bar(
          d,
          [side * (sideX(y - 0.05, z) + 0.005), y - 0.05, z],
          [
            side * (sideX(y - 0.3 * s, z - 0.04) + 0.005),
            y - 0.3 * s,
            z - 0.04,
          ],
          0.022,
          leafGreen,
        );
      };

      const flatFlower = (
        part: PartId,
        x: number,
        y: number,
        z: number,
        s: number,
        facing: 1 | -1,
      ) => {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const petal = k.mesh(
            part,
            petalGeo,
            [x + Math.cos(a) * 0.15 * s, y + Math.sin(a) * 0.15 * s, z],
            i % 2 ? k.accent : petalPink,
          );
          petal.scale.set(0.12 * s, 0.09 * s, 0.06 * s);
          petal.rotation.z = a;
        }
        const center = k.mesh(part, petalGeo, [x, y, z + facing * 0.02], cream);
        center.scale.set(0.075 * s, 0.075 * s, 0.06 * s);
        for (const lside of [-1, 1]) {
          const leaf = k.mesh(
            part,
            leafGeo,
            [x + lside * 0.19 * s, y - 0.24 * s, z],
            leafGreen,
          );
          leaf.scale.set(0.15 * s, 0.08 * s, 0.05 * s);
          leaf.rotation.z = lside * -0.6;
        }
        k.bar(
          part,
          [x, y - 0.05, z - facing * 0.01],
          [x + 0.04, y - 0.28 * s, z - facing * 0.01],
          0.02,
          leafGreen,
        );
      };

      // ---- Nose (hood): front belly of the pot + curved spout ----
      k.hull("hood", [
        [0.45, -0.05, 0.5, 1.2, 1.15],
        [2.3, -0.05, 0.45, 1.05, 0.95],
      ]);
      k.oval("hood", [1.18, 0.78, 1.05], [0, 0.68, 1.45]);
      // Spout base flange + S-curved spout rising to a flared tip.
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.34, 0.46, 0.35, 32).rotateX(
          Math.PI / 2 - 0.32,
        ),
        [0, 0.8, 2.4],
      );
      k.tube(
        "hood",
        [
          [0, 0.65, 1.95],
          [0, 0.8, 2.4],
          [0, 0.98, 2.7],
        ],
        0.27,
        k.paint,
        32,
      );
      k.tube(
        "hood",
        [
          [0, 0.98, 2.7],
          [0, 1.05, 2.82],
          [0, 1.12, 2.95],
        ],
        0.2,
        k.paint,
        24,
      );
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.21, 0.17, 0.3, 32, 1, true).rotateX(
          Math.PI / 2 - 0.5,
        ),
        [0, 1.2, 3.06],
      );
      k.mesh(
        "hood",
        new T.TorusGeometry(0.19, 0.035, 12, 40).rotateX(-0.5),
        [0, 1.27, 3.19],
      );
      k.mesh(
        "hood",
        new T.CircleGeometry(0.165, 32).rotateX(-0.5),
        [0, 1.26, 3.18],
        k.dark,
      );
      for (const side of sides) {
        k.lamp("hood", [side * 0.78, 0.25, 2.32], 0.09);
        flatFlower("hood", side * 0.35, 0.12, 2.32, 0.55, 1);
      }

      // ---- Lid (roof): shoulder, hinged lid, chrome whistle, steam ----
      k.oval("roof", [1.12, 0.55, 1.65], [0, 1.22, -0.1]);
      k.mesh(
        "roof",
        new T.CylinderGeometry(1.02, 1.06, 0.1, 64),
        [0, 1.72, -0.1],
        cream,
      );
      const lidProfile = [
        [0, 0],
        [0.95, 0],
        [1.0, 0.08],
        [0.9, 0.16],
        [0.5, 0.24],
        [0.15, 0.28],
        [0, 0.28],
      ].map(([r, y]) => new T.Vector2(r, y));
      k.mesh("roof", new T.LatheGeometry(lidProfile, 64), [0, 1.77, -0.1]);
      k.mesh(
        "roof",
        new T.TorusGeometry(0.98, 0.045, 14, 72).rotateX(Math.PI / 2),
        [0, 1.8, -0.1],
      );
      // Hinge at the rear of the lid.
      k.panel("roof", [0.22, 0.08, 0.14], [0, 1.84, -1.06], k.steel, 0.02);
      k.bar("roof", [-0.14, 1.84, -1.06], [0.14, 1.84, -1.06], 0.03, k.dark);
      // Chrome whistle: stem, barrel, mouth, lever.
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.16, 0.2, 0.12, 32),
        [0, 2.08, -0.1],
      );
      k.bar("roof", [0, 2.08, -0.1], [0, 2.32, -0.1], 0.085, k.steel);
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.13, 0.13, 0.6, 32).rotateX(Math.PI / 2),
        [0, 2.36, 0.1],
        k.steel,
      );
      k.oval("roof", [0.13, 0.13, 0.13], [0, 2.36, -0.22], k.steel);
      k.panel("roof", [0.1, 0.04, 0.16], [0, 2.48, 0.28], k.dark, 0.01);
      k.bar("roof", [-0.08, 2.5, 0.2], [0.08, 2.5, 0.2], 0.02, k.steel);
      k.mesh(
        "roof",
        new T.TorusGeometry(0.12, 0.025, 12, 40),
        [0, 2.36, 0.41],
        k.steel,
      );
      k.mesh("roof", new T.CircleGeometry(0.1, 32), [0, 2.36, 0.405], k.dark);
      k.bar("roof", [0.12, 2.3, 0.0], [0.3, 2.18, -0.15], 0.025, k.steel);
      k.oval("roof", [0.045, 0.045, 0.045], [0.3, 2.18, -0.15], k.accent);
      // Wisp of steam curling from the whistle mouth.
      k.tube(
        "roof",
        [
          [0, 2.52, 0.3],
          [0.09, 2.7, 0.33],
          [-0.07, 2.88, 0.3],
          [0.06, 3.06, 0.28],
          [-0.03, 3.22, 0.27],
        ],
        0.05,
        steamMat,
        64,
      );

      // ---- Flanks (doors): belly bulge + pink floral decals ----
      for (const side of sides) {
        const d = door(side);
        k.oval(d, [0.28, 0.55, 1.5], [side * 1.12, 0.75, -0.1]);
        sideFlower(side, 0.82, 0.5, 0.95);
        sideFlower(side, 0.72, -0.35, 1.15);
        sideFlower(side, 0.84, -1.1, 0.8);
      }

      // ---- Tail (bed): rear belly + loop handle over the rear deck ----
      k.hull("bed", [
        [-2.5, -0.05, 0.5, 1.15, 1.05],
        [0.4, -0.05, 0.55, 1.2, 1.15],
      ]);
      k.oval("bed", [1.22, 0.82, 1.1], [0, 0.7, -1.35]);
      k.mesh(
        "bed",
        new T.TorusGeometry(0.82, 0.17, 24, 72).rotateY(Math.PI / 2),
        [0, 1.6, -1.75],
      );
      k.oval("bed", [0.2, 0.26, 0.32], [0, 1.38, -0.95]);
      k.oval("bed", [0.26, 0.3, 0.34], [0, 0.82, -1.78]);
      for (const side of sides)
        flatFlower("bed", side * 0.5, 0.22, -2.52, 0.8, -1);

      // ---- Bumpers: derby bars, fogs, tails, flaps ----
      k.panel("bumper-front", [2.3, 0.26, 0.3], [0, -0.32, 2.72], k.dark, 0.07);
      k.panel(
        "bumper-front",
        [2.34, 0.06, 0.32],
        [0, -0.18, 2.72],
        k.steel,
        0.015,
      );
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.7, -0.32, 2.86],
          [side * 0.7, 0.35, 2.62],
          0.055,
          k.steel,
        );
        k.bar(
          "bumper-front",
          [side * 0.7, 0.35, 2.62],
          [side * 0.7, 0.35, 2.28],
          0.05,
          k.steel,
        );
        k.lamp("bumper-front", [side * 0.45, -0.32, 2.88], 0.08);
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.95, -0.47, 2.75],
          k.dark,
        );
      }
      k.bar(
        "bumper-front",
        [-0.7, 0.35, 2.62],
        [0.7, 0.35, 2.62],
        0.05,
        k.steel,
      );
      k.panel("bumper-front", [0.4, 0.12, 0.03], [0, -0.32, 2.885], k.white, 0.01);
      k.panel("bumper-rear", [2.3, 0.26, 0.3], [0, -0.32, -2.72], k.dark, 0.07);
      k.panel(
        "bumper-rear",
        [2.34, 0.06, 0.32],
        [0, -0.18, -2.72],
        k.steel,
        0.015,
      );
      k.tailLights(-2.88, -0.3);
      for (const side of sides) {
        k.bar(
          "bumper-rear",
          [side * 1.15, -0.35, -2.75],
          [side * 1.65, -0.4, -2.78],
          0.04,
          k.dark,
        );
        k.panel(
          "bumper-rear",
          [0.55, 0.45, 0.06],
          [side * 1.65, -0.55, -2.78],
          k.dark,
          0.03,
        );
        k.mesh(
          "bumper-rear",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.95, -0.47, -2.75],
          k.dark,
        );
      }
      k.bar("bumper-rear", [0, -0.35, -2.8], [0, -0.35, -3.0], 0.06, k.dark);
      k.panel("bumper-rear", [0.4, 0.12, 0.03], [0, -0.32, -2.885], k.white, 0.01);

      // ---- Chassis dress: shocks, trays, steps, skids ----
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
          [0.35, 0.07, 0.5],
          [side * 1.35, -0.35, 0.1],
          k.steel,
          0.02,
        );
        k.bar(
          "chassis-front",
          [side * 0.8, -0.35, 0.1],
          [side * 1.35, -0.35, 0.1],
          0.04,
          k.steel,
        );
      }
      k.panel("chassis-front", [1.9, 0.16, 2.2], [0, -0.42, 0.55], k.dark, 0.04);
      k.panel("chassis-front", [1.6, 0.1, 0.5], [0, -0.5, 2.3], k.steel, 0.03);
      k.panel("chassis-rear", [1.9, 0.16, 2.0], [0, -0.42, -1.55], k.dark, 0.04);
      k.panel("chassis-rear", [1.2, 0.4, 0.8], [0, -0.45, -1.5], k.steel, 0.06);
      k.bar("chassis-rear", [-0.6, -0.45, -1.5], [0.6, -0.45, -1.5], 0.03, k.dark);

      // Porcelain hub caps with pink centers over the kit hubs.
      const caps = [
        ["wheel-fl", 2.08, 1.65],
        ["wheel-fr", -2.08, 1.65],
        ["wheel-rl", 2.08, -1.65],
        ["wheel-rr", -2.08, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        k.mesh(
          part,
          new T.CylinderGeometry(0.14, 0.14, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.paint,
        );
        k.mesh(
          part,
          new T.CylinderGeometry(0.05, 0.05, 0.1, 16).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.accent,
        );
      }
    },
  ),
  vehicle(
    "traffic-cone",
    "Traffic Cone",
    "Oversized road cone with reflective bands and a flashing tip beacon.",
    [15229982, 15921902, 3356216, 0.84, 6],
    (k) => {
      const coneZ = 0.05;
      const lens = glow(0xff8f00);
      const frustum = (
        part: PartId,
        rTop: number,
        rBottom: number,
        y0: number,
        y1: number,
        material: T.Material,
        thetaStart = 0,
        thetaLength = Math.PI * 2,
      ) =>
        k.mesh(
          part,
          new T.CylinderGeometry(
            rTop,
            rBottom,
            y1 - y0,
            128,
            1,
            true,
            thetaStart,
            thetaLength,
          ),
          [0, (y0 + y1) / 2, coneZ],
          material,
        );
      const lip = (
        part: PartId,
        r: number,
        y: number,
        material: T.Material = k.paint,
      ) =>
        k.mesh(
          part,
          new T.TorusGeometry(r, 0.032, 14, 112).rotateX(Math.PI / 2),
          [0, y, coneZ],
          material,
        );

      // ---- Lower cone (hood): orange tiers, lip rings, rubber base, headlamps ----
      frustum("hood", 0.914, 1.12, 0.8, 1.35, k.paint);
      frustum("hood", 0.596, 0.764, 1.75, 2.2, k.paint);
      lip("hood", 1.125, 0.8, k.dark);
      lip("hood", 0.919, 1.35);
      lip("hood", 0.769, 1.75);
      lip("hood", 0.601, 2.2);
      // Molded ribs on the orange tiers (straight bars following the taper).
      for (const [y0, y1] of [
        [0.88, 1.28],
        [1.82, 2.13],
      ] as const) {
        const r0 = 1.12 - (y0 - 0.8) * 0.3745;
        const r1 = 1.12 - (y1 - 0.8) * 0.3745;
        for (const [dx, dz] of [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ] as const) {
          const inv = Math.SQRT1_2;
          k.bar(
            "hood",
            [dx * r0 * inv, y0, coneZ + dz * r0 * inv],
            [dx * r1 * inv, y1, coneZ + dz * r1 * inv],
            0.028,
            k.paint,
          );
        }
      }
      // Heavy black rubber base skirt: platform, flange collar, bolt ring.
      k.panel("hood", [2.9, 0.36, 3.3], [0, 0.46, coneZ], k.dark, 0.09);
      k.panel("hood", [3.02, 0.1, 3.42], [0, 0.32, coneZ], k.dark, 0.045);
      k.mesh(
        "hood",
        new T.CylinderGeometry(1.3, 1.38, 0.18, 96),
        [0, 0.72, coneZ],
        k.dark,
      );
      k.mesh(
        "hood",
        new T.TorusGeometry(1.3, 0.055, 14, 112).rotateX(Math.PI / 2),
        [0, 0.8, coneZ],
        k.dark,
      );
      const boltGeo = new T.CylinderGeometry(0.035, 0.035, 0.05, 12);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        k.mesh(
          "hood",
          boltGeo,
          [Math.cos(a) * 1.24, 0.82, coneZ + Math.sin(a) * 1.24],
          k.steel,
        );
      }
      // Front face: round headlamps, grille slats, reflective strip, markers.
      for (const side of sides) {
        k.lamp("hood", [side * 0.85, 0.46, 1.7], 0.14);
        k.panel(
          "hood",
          [0.06, 0.08, 0.12],
          [side * 1.46, 0.46, 1.55],
          k.amber,
          0.012,
        );
      }
      for (let i = 0; i < 4; i++)
        k.panel(
          "hood",
          [0.9, 0.03, 0.04],
          [0, 0.37 + i * 0.07, 1.71],
          k.steel,
          0.008,
        );
      k.panel("hood", [2.5, 0.07, 0.05], [0, 0.59, 1.7], k.accent, 0.015);

      // ---- Upper cone (roof): top tier, tip, flashing amber beacon ----
      frustum("roof", 0.24, 0.465, 2.55, 3.15, k.paint);
      lip("roof", 0.47, 2.55);
      frustum("roof", 0.15, 0.24, 3.15, 3.32, k.paint);
      lip("roof", 0.245, 3.15);
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.15, 0.15, 0.04, 48),
        [0, 3.33, coneZ],
        k.dark,
      );
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.21, 0.24, 0.14, 48),
        [0, 3.42, coneZ],
        k.dark,
      );
      k.mesh(
        "roof",
        new T.TorusGeometry(0.225, 0.022, 12, 64).rotateX(Math.PI / 2),
        [0, 3.36, coneZ],
        k.steel,
      );
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.165, 0.18, 0.26, 48),
        [0, 3.62, coneZ],
        lens,
      );
      for (const y of [3.55, 3.62, 3.69])
        k.mesh(
          "roof",
          new T.TorusGeometry(0.172, 0.013, 10, 64).rotateX(Math.PI / 2),
          [0, y, coneZ],
          lens,
        );
      k.oval("roof", [0.165, 0.13, 0.165], [0, 3.78, coneZ], lens);
      k.oval("roof", [0.04, 0.035, 0.04], [0, 3.9, coneZ], k.dark);

      // ---- Reflective bands + skirt sides (doors): split cone halves ----
      for (const side of sides) {
        const d = door(side);
        const theta = side > 0 ? 0 : Math.PI;
        frustum(d, 0.764, 0.914, 1.35, 1.75, k.accent, theta, Math.PI);
        frustum(d, 0.465, 0.596, 2.2, 2.55, k.accent, theta, Math.PI);
        k.bar(
          d,
          [side * 1.47, 0.42, -1.45],
          [side * 1.47, 0.42, 1.55],
          0.055,
          k.steel,
        );
        for (let i = 0; i < 5; i++)
          k.mesh(
            d,
            new T.CylinderGeometry(0.03, 0.03, 0.05, 12).rotateZ(
              Math.PI / 2,
            ),
            [side * 1.5, 0.42, -1.3 + i * 0.68],
            k.dark,
          );
        for (const [z, tilt] of [
          [-0.95, 0.6],
          [1.05, -0.6],
        ] as const)
          k.panel(
            d,
            [0.05, 0.1, 0.42],
            [side * 1.465, 0.52, z],
            k.accent,
            0.015,
          ).rotation.x = tilt;
        k.panel(
          d,
          [0.05, 0.07, 0.14],
          [side * 1.46, 0.44, coneZ],
          k.amber,
          0.012,
        );
      }

      // ---- Rear (bed): work light, markers, chevrons ----
      k.panel("bed", [2.5, 0.07, 0.05], [0, 0.59, -1.6], k.accent, 0.015);
      k.lamp("bed", [0.7, 0.44, -1.6], 0.11, k.white, -1);
      for (const side of sides)
        k.panel(
          "bed",
          [0.12, 0.08, 0.05],
          [side * 1.2, 0.44, -1.61],
          k.red,
          0.012,
        );
      k.panel("bed", [0.5, 0.1, 0.04], [-0.55, 0.5, -1.61], k.accent, 0.015)
        .rotation.z = 0.6;
      k.panel("bed", [0.5, 0.1, 0.04], [-0.55, 0.38, -1.61], k.accent, 0.015)
        .rotation.z = 0.6;
      k.bar("bed", [-0.2, 0.3, -1.62], [0.2, 0.3, -1.62], 0.025, k.steel);

      // ---- Bumpers: rubber beams, reflective stripes, tow loops ----
      k.panel("bumper-front", [2.5, 0.26, 0.34], [0, -0.11, 2.66], k.dark, 0.085);
      k.panel(
        "bumper-front",
        [2.3, 0.08, 0.05],
        [0, -0.05, 2.84],
        k.accent,
        0.015,
      );
      for (const side of sides) {
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.03, 12, 32),
          [side * 0.95, -0.28, 2.7],
          k.steel,
        );
        k.lamp("bumper-front", [side * 0.45, -0.11, 2.84], 0.07);
      }
      k.panel(
        "bumper-front",
        [0.4, 0.12, 0.03],
        [0, -0.11, 2.845],
        k.accent,
        0.01,
      );

      k.panel("bumper-rear", [2.4, 0.2, 0.42], [0, -0.12, -2.7], k.dark, 0.07);
      k.panel(
        "bumper-rear",
        [2.2, 0.08, 0.05],
        [0, -0.06, -2.92],
        k.accent,
        0.015,
      );
      k.tailLights(-2.9, -0.02);
      for (const side of sides)
        k.panel(
          "bumper-rear",
          [0.55, 0.5, 0.06],
          [side * 1.65, -0.45, -2.78],
          k.dark,
          0.03,
        );
      k.bar("bumper-rear", [0, -0.3, -2.85], [0, -0.3, -3.0], 0.06, k.dark);

      // ---- Chassis: shocks, tanks, skid plate, exhaust ----
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          k.paint,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          k.paint,
        );
      }
      k.panel("chassis-front", [1.6, 0.1, 0.9], [0, -0.52, 2.1], k.steel, 0.03);
      k.bar("chassis-front", [0.75, -0.55, 0.5], [0.75, -0.55, -0.3], 0.26, k.steel);
      for (const z of [0.3, -0.1])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.27, 0.03, 10, 40),
          [0.75, -0.55, z],
          k.dark,
        );
      k.panel("chassis-front", [0.5, 0.4, 0.7], [-0.75, -0.5, 0.1], k.dark, 0.06);
      k.tube(
        "chassis-rear",
        [
          [0.5, -0.35, -0.5],
          [0.5, -0.42, -1.6],
          [0.5, -0.42, -2.6],
          [0.5, -0.35, -2.9],
        ],
        0.07,
        k.steel,
      );
      k.bar(
        "chassis-rear",
        [0.5, -0.35, -2.82],
        [0.5, -0.35, -2.95],
        0.078,
        k.dark,
      );
      k.panel("chassis-rear", [1.7, 0.4, 1.2], [0, -0.45, -1.5], k.dark, 0.06);
      for (const z of [-1.2, -1.8])
        k.panel("chassis-rear", [1.74, 0.44, 0.08], [0, -0.45, z], k.steel, 0.02);

      // Dark hub caps over the kit hubs.
      const caps = [
        ["wheel-fl", 2.08, 1.65],
        ["wheel-fr", -2.08, 1.65],
        ["wheel-rl", 2.08, -1.65],
        ["wheel-rr", -2.08, -1.65],
      ] as const;
      for (const [part, x, z] of caps)
        k.mesh(
          part,
          new T.CylinderGeometry(0.14, 0.14, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
    },
  ),
  vehicle(
    "flying-saucer",
    "Flying Saucer",
    "Classic UFO saucer with a bubble dome over four derby wheels.",
    [12174028, 4448237, 3817544, 0.8, 8],
    (k) => {
      const cyan = glow(0x43dfed);
      const bandGlow = new T.MeshStandardMaterial({
        color: 0x43dfed,
        emissive: 0x43dfed,
        emissiveIntensity: 2.0,
        roughness: 0.35,
      });
      const brushed = finish(0x707880, 0.42, 0.6);
      const chrome = finish(0xd7dde2, 0.18, 0.9);
      const bubbleGlass = new T.MeshPhysicalMaterial({
        color: 0xa8d8e6,
        transparent: true,
        opacity: 0.55,
        roughness: 0.12,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      });
      // Faint inner shell so the bubble silhouette reads against bright sky.
      const bubbleRim = new T.MeshBasicMaterial({
        color: 0xdff4ff,
        transparent: true,
        opacity: 0.18,
        side: T.BackSide,
        depthWrite: false,
      });
      const green = glow(0x2aff5a);

      // ---- Saucer lower cone: nose half (hood), tail half (bed) ----
      // Cylinder theta 0 faces +Z, so [-PI/2, PI/2] is the nose half and the
      // two halves meet edge-to-edge under the side pods (no open seams).
      k.mesh(
        "hood",
        new T.CylinderGeometry(
          2.18,
          1.0,
          0.42,
          64,
          1,
          false,
          -Math.PI / 2,
          Math.PI,
        ),
        [0, 0.36, 0],
      );
      k.mesh(
        "bed",
        new T.CylinderGeometry(
          2.18,
          1.0,
          0.42,
          64,
          1,
          false,
          Math.PI / 2,
          Math.PI,
        ),
        [0, 0.36, 0],
      );

      // ---- Glowing cyan light band, split nose/tail ----
      for (const [part, start] of [
        ["hood", -Math.PI / 2],
        ["bed", Math.PI / 2],
      ] as const)
        k.mesh(
          part,
          new T.CylinderGeometry(2.24, 2.24, 0.26, 64, 1, true, start, Math.PI),
          [0, 0.66, 0],
          bandGlow,
        );

      // ---- Chrome trim rings above and below the band ----
      k.mesh(
        "roof",
        new T.TorusGeometry(2.2, 0.045, 20, 160).rotateX(Math.PI / 2),
        [0, 0.78, 0],
        chrome,
      );
      const trimArc = () =>
        new T.TorusGeometry(2.23, 0.045, 16, 80, Math.PI).rotateX(Math.PI / 2);
      k.mesh("hood", trimArc(), [0, 0.53, 0], chrome);
      k.mesh("bed", trimArc(), [0, 0.53, 0], chrome).rotation.y = Math.PI;

      // ---- Headlamps set into the band: white nose trio, red tail pair ----
      for (const x of [-0.55, 0, 0.55]) {
        const z = Math.sqrt(2.24 * 2.24 - x * x) - 0.01;
        k.lamp("hood", [x, 0.66, z], 0.09);
      }
      for (const x of [-0.55, 0.55]) {
        const z = -(Math.sqrt(2.24 * 2.24 - x * x) - 0.01);
        k.lamp("bed", [x, 0.66, z], 0.09, k.red, -1);
      }

      // ---- Rim rivets studding the lower cone ----
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI / 2 + ((i + 0.5) / 16) * Math.PI;
        k.mesh(
          "hood",
          new T.SphereGeometry(0.035, 12, 8),
          [Math.sin(a) * 2.05, 0.52, Math.cos(a) * 2.05],
          chrome,
        );
        const b = Math.PI / 2 + ((i + 0.5) / 16) * Math.PI;
        k.mesh(
          "bed",
          new T.SphereGeometry(0.035, 12, 8),
          [Math.sin(b) * 2.05, 0.52, Math.cos(b) * 2.05],
          chrome,
        );
      }

      // ---- Sensor-blister side pods (doors) with glowing portholes ----
      for (const side of sides) {
        const d = door(side);
        k.oval(d, [0.55, 0.32, 1.3], [side * 1.95, 0.4, 0]);
        for (const z of [-0.55, 0, 0.55]) {
          const x =
            side * (1.95 + 0.55 * Math.sqrt(1 - (z / 1.3) ** 2) - 0.015);
          k.mesh(
            d,
            new T.TorusGeometry(0.09, 0.02, 10, 32).rotateY(Math.PI / 2),
            [x, 0.4, z],
            chrome,
          );
          k.mesh(
            d,
            new T.CylinderGeometry(0.085, 0.085, 0.03, 24).rotateZ(Math.PI / 2),
            [x - side * 0.01, 0.4, z],
            cyan,
          );
        }
        // Aircraft nav light: red port (+X), green starboard (-X).
        k.oval(
          d,
          [0.05, 0.05, 0.05],
          [side * 2.28, 0.4, -1.05],
          side > 0 ? k.red : green,
        );
      }

      // ---- Upper disc + brushed ring detail (roof) ----
      k.mesh(
        "roof",
        new T.CylinderGeometry(1.05, 2.1, 0.35, 128),
        [0, 0.85, 0],
      );
      for (const y of [0.75, 0.85, 0.95])
        k.mesh(
          "roof",
          new T.TorusGeometry(2.1 - (y - 0.675) * 3, 0.018, 10, 128).rotateX(
            Math.PI / 2,
          ),
          [0, y, 0],
          brushed,
        );

      // ---- Dome collar + glass bubble ----
      k.mesh(
        "roof",
        new T.CylinderGeometry(1.02, 1.08, 0.14, 96),
        [0, 0.99, 0],
        k.steel,
      );
      k.mesh(
        "roof",
        new T.TorusGeometry(1.0, 0.055, 20, 96).rotateX(Math.PI / 2),
        [0, 1.08, 0],
        chrome,
      );
      k.mesh(
        "roof",
        new T.SphereGeometry(0.95, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2),
        [0, 1.06, 0],
        bubbleGlass,
      );
      k.mesh(
        "roof",
        new T.SphereGeometry(0.93, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
        [0, 1.06, 0],
        bubbleRim,
      );
      // Cyan pinstripe near the upper-disc rim, echoing the light band.
      k.mesh(
        "roof",
        new T.TorusGeometry(1.95, 0.03, 12, 160).rotateX(Math.PI / 2),
        [0, 0.725, 0],
        bandGlow,
      );

      // ---- Cockpit interior, visible through the bubble ----
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.98, 0.98, 0.05, 64),
        [0, 1.07, 0],
        k.dark,
      );
      k.panel("roof", [0.55, 0.16, 0.55], [0, 1.2, -0.15], k.dark, 0.06);
      k.panel("roof", [0.55, 0.55, 0.14], [0, 1.45, -0.42], k.dark, 0.06).rotation.x =
        -0.15;
      k.panel("roof", [0.3, 0.18, 0.12], [0, 1.75, -0.47], k.dark, 0.05);
      k.panel("roof", [1.0, 0.22, 0.3], [0, 1.32, 0.52], k.dark, 0.05);
      k.panel("roof", [0.4, 0.16, 0.03], [0, 1.44, 0.4], cyan, 0.01).rotation.x =
        -0.3;
      for (const [x, mat] of [
        [-0.25, cyan],
        [0, k.amber],
        [0.25, k.red],
      ] as const)
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.035, 0.035, 0.04, 16),
          [x, 1.45, 0.52],
          mat,
        );
      k.bar("roof", [0, 1.1, 0.15], [0, 1.38, 0.22], 0.03, k.steel);
      k.oval("roof", [0.05, 0.05, 0.05], [0, 1.4, 0.225], k.dark);
      for (const side of sides) {
        k.panel("roof", [0.15, 0.12, 0.5], [side * 0.55, 1.18, 0.1], k.dark, 0.03);
        k.panel("roof", [0.16, 0.03, 0.4], [side * 0.55, 1.25, 0.1], cyan, 0.01);
      }
      for (const side of sides)
        k.panel(
          "roof",
          [0.12, 0.05, 0.2],
          [side * 0.15, 1.12, 0.55],
          k.steel,
          0.015,
        ).rotation.x = 0.4;

      // ---- Tail fin + antenna mast on the rear upper disc (bed) ----
      k.profile(
        "bed",
        [
          [-1.7, 0.78],
          [-0.95, 0.98],
          [-1.15, 1.42],
          [-1.55, 1.42],
        ],
        0.1,
        0,
        k.paint,
        0.03,
      );
      k.oval("bed", [0.05, 0.05, 0.12], [0, 1.44, -1.35], k.red);
      k.bar("bed", [0, 0.79, -1.75], [0, 1.5, -1.9], 0.025, k.steel);
      k.oval("bed", [0.04, 0.04, 0.04], [0, 1.53, -1.91], cyan);

      // ---- Chrome guard arcs fore and aft ----
      k.tube(
        "bumper-front",
        [
          [-1.1, -0.15, 1.95],
          [-0.6, -0.18, 2.3],
          [0, -0.18, 2.42],
          [0.6, -0.18, 2.3],
          [1.1, -0.15, 1.95],
        ],
        0.07,
        chrome,
      );
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.85, -0.18, 2.2],
          [side * 0.9, 0.56, 1.95],
          0.045,
          chrome,
        );
        k.lamp("bumper-front", [side * 0.55, -0.18, 2.4], 0.07);
      }
      k.mesh(
        "bumper-front",
        new T.TorusGeometry(0.09, 0.03, 12, 32),
        [0, -0.3, 2.4],
        k.dark,
      );
      k.tube(
        "bumper-rear",
        [
          [-1.1, -0.15, -1.95],
          [-0.6, -0.18, -2.3],
          [0, -0.18, -2.42],
          [0.6, -0.18, -2.3],
          [1.1, -0.15, -1.95],
        ],
        0.07,
        chrome,
      );
      for (const side of sides) {
        k.bar(
          "bumper-rear",
          [side * 0.85, -0.18, -2.2],
          [side * 0.9, 0.56, -1.95],
          0.045,
          chrome,
        );
        k.lamp("bumper-rear", [side * 0.55, -0.18, -2.4], 0.07, k.red, -1);
      }
      k.mesh(
        "bumper-rear",
        new T.TorusGeometry(0.09, 0.03, 12, 32),
        [0, -0.3, -2.4],
        k.dark,
      );

      // ---- Belly emitter glowing under the saucer ----
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.42, 0.3, 0.3, 48),
        [0, 0.03, 0],
        chrome,
      );
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.28, 0.28, 0.06, 48),
        [0, -0.13, 0],
        cyan,
      );
      k.oval("chassis-front", [0.14, 0.1, 0.14], [0, -0.17, 0], cyan);
      for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3])
        k.mesh(
          "chassis-front",
          new T.SphereGeometry(0.05, 16, 12),
          [Math.cos(a) * 0.6, 0.12, Math.sin(a) * 0.6],
          cyan,
        );

      // ---- Underbody antenna fins ----
      for (const [part, x, z] of [
        ["chassis-front", 0.7, 0.55],
        ["chassis-front", -0.7, 0.55],
        ["chassis-front", 0, 0.85],
        ["chassis-rear", 0.7, -0.55],
        ["chassis-rear", -0.7, -0.55],
        ["chassis-rear", 0, -0.85],
      ] as const)
        k.mesh(
          part,
          new T.ConeGeometry(0.13, 0.55, 24).rotateX(Math.PI),
          [x, -0.1, z],
          chrome,
        );

      // ---- Belly vent grille (rear) ----
      k.panel("chassis-rear", [0.9, 0.1, 0.5], [0, -0.42, -1.2], k.dark, 0.03);
      for (let i = 0; i < 4; i++)
        k.bar(
          "chassis-rear",
          [-0.35, -0.48, -1.0 - i * 0.12],
          [0.35, -0.48, -1.0 - i * 0.12],
          0.02,
          k.steel,
        );

      // ---- Running gear: shocks, plasma cells, skid plates ----
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          cyan,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          cyan,
        );
        k.mesh(
          "chassis-front",
          new T.CylinderGeometry(0.16, 0.16, 0.7, 32).rotateX(Math.PI / 2),
          [side * 0.8, -0.42, 0.9],
          k.steel,
        );
        k.mesh(
          "chassis-front",
          new T.SphereGeometry(0.1, 20, 14),
          [side * 0.8, -0.42, 1.28],
          cyan,
        );
      }
      k.panel("chassis-front", [1.5, 0.08, 0.9], [0, -0.5, 2.0], k.steel, 0.03);
      k.panel("chassis-rear", [1.5, 0.08, 0.9], [0, -0.5, -2.0], k.steel, 0.03);

      // Dark hub caps with cyan trim rings over the kit hubs.
      const caps = [
        ["wheel-fl", 2.08, 1.65],
        ["wheel-fr", -2.08, 1.65],
        ["wheel-rl", 2.08, -1.65],
        ["wheel-rr", -2.08, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        const ring = new T.TorusGeometry(0.3, 0.025, 12, 64);
        ring.rotateY(Math.PI / 2);
        k.mesh(part, ring, [x, -0.85, z], cyan);
        k.mesh(
          part,
          new T.CylinderGeometry(0.14, 0.14, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
      }
    },
  ),
  vehicle(
    "dragster",
    "Top Fuel Dragster",
    "Long-nose rail dragster with a wing and chrome V8 over four derby wheels.",
    [1710622, 16106776, 9080724, 0.9, 5],
    (k) => {
      const orange = k.accent;
      const frame = k.paint;
      const chrome = k.steel;
      const canvas = finish(0x2b2e33, 0.9, 0);
      const webbing = finish(0x6e7378, 0.7, 0.2);

      // ---- Nose (hood): extra-long tapered rail nose over the front axle ----
      k.hull(
        "hood",
        [
          [0.85, -0.38, 0.5, 0.46, 0.42],
          [1.6, -0.42, 0.32, 0.36, 0.33],
          [2.35, -0.44, 0.1, 0.26, 0.23],
          [2.95, -0.42, -0.1, 0.12, 0.1],
        ],
        orange,
      );
      // Dark spine stripe hugging the sloping nose top, one tilted
      // segment per hull section so nothing floats above the slope.
      k.panel("hood", [0.12, 0.03, 0.65], [0, 0.402, 1.225], frame, 0.008).rotation.x =
        0.235;
      k.panel("hood", [0.11, 0.03, 0.65], [0, 0.202, 1.975], frame, 0.008).rotation.x =
        0.285;
      k.panel("hood", [0.1, 0.03, 0.5], [0, -0.008, 2.65], frame, 0.008).rotation.x =
        0.322;
      // Nose rivet rows along both flanks.
      for (const side of sides)
        for (let i = 0; i < 8; i++) {
          const z = 1.1 + i * 0.22;
          k.mesh(
            "hood",
            new T.SphereGeometry(0.028, 12, 8),
            [side * (0.45 - (z - 0.85) * 0.135), 0.3 - (z - 0.85) * 0.17, z],
            chrome,
          );
        }

      // ---- Chrome V8 (hood): block, splayed heads, blower, scoop, zoomies ----
      k.panel("hood", [0.72, 0.52, 0.9], [0, 0.2, 0.25], chrome, 0.06);
      k.panel("hood", [0.5, 0.2, 0.7], [0, -0.12, 0.25], k.dark, 0.05);
      for (const side of sides) {
        k.panel(
          "hood",
          [0.2, 0.38, 0.82],
          [side * 0.4, 0.3, 0.25],
          chrome,
          0.04,
        ).rotation.z = side * 0.3;
        k.panel(
          "hood",
          [0.14, 0.14, 0.74],
          [side * 0.54, 0.46, 0.25],
          orange,
          0.03,
        );
        for (let i = 0; i < 4; i++)
          k.mesh(
            "hood",
            new T.CylinderGeometry(0.03, 0.03, 0.05, 12).rotateZ(Math.PI / 2),
            [side * 0.62, 0.46, -0.03 + i * 0.19],
            chrome,
          );
        // Zoomie headers: four upswept pipes per bank with flared tips.
        for (let i = 0; i < 4; i++) {
          const z0 = -0.02 + i * 0.18;
          k.tube(
            "hood",
            [
              [side * 0.38, 0.28, z0],
              [side * 0.56, 0.34, z0 + 0.02],
              [side * 0.66, 0.56, z0 + 0.06],
              [side * 0.7, 0.8, z0 + 0.1],
            ],
            0.055,
            chrome,
            48,
          );
          k.mesh(
            "hood",
            new T.CylinderGeometry(0.068, 0.058, 0.1, 20),
            [side * 0.7, 0.84, z0 + 0.1],
            chrome,
          );
          k.panel(
            "hood",
            [0.06, 0.12, 0.12],
            [side * 0.38, 0.28, z0],
            k.dark,
            0.015,
          );
        }
      }
      // Blower case with drive ribs, scoop tray, triple red intake trumpets.
      k.panel("hood", [0.52, 0.3, 0.62], [0, 0.58, 0.25], chrome, 0.05);
      for (let i = 0; i < 4; i++)
        k.panel("hood", [0.56, 0.04, 0.06], [0, 0.5 + i * 0.07, 0.25], k.dark, 0.01);
      k.panel("hood", [0.6, 0.1, 0.5], [0, 0.78, 0.33], chrome, 0.03);
      for (const dx of [-0.17, 0, 0.17]) {
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.095, 0.095, 0.22, 32).rotateX(Math.PI / 2),
          [dx, 0.9, 0.45],
          chrome,
        );
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.07, 0.07, 0.24, 24).rotateX(Math.PI / 2),
          [dx, 0.9, 0.45],
          k.red,
        );
      }
      k.panel("hood", [0.62, 0.16, 0.1], [0, 0.9, 0.19], chrome, 0.03);
      // Front pulleys and belt drive ahead of the block.
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.14, 0.14, 0.08, 48).rotateX(Math.PI / 2),
        [0, 0.08, 0.73],
        k.dark,
      );
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.1, 0.1, 0.08, 40).rotateX(Math.PI / 2),
        [0, 0.58, 0.73],
        chrome,
      );
      for (const side of sides)
        k.bar(
          "hood",
          [side * 0.12, 0.08, 0.73],
          [side * 0.09, 0.58, 0.73],
          0.035,
          k.dark,
        );

      // ---- Cockpit (roof): orange tub, cage, windscreen, driver ----
      k.hull(
        "roof",
        [
          [-1.35, -0.12, 0.55, 0.8, 0.72],
          [-0.6, -0.15, 0.62, 0.85, 0.78],
          [0.05, -0.15, 0.55, 0.8, 0.72],
        ],
        orange,
      );
      k.oval("roof", [0.5, 0.18, 0.62], [0, 0.55, -0.6], k.dark);
      k.panel(
        "roof",
        [0.5, 0.55, 0.16],
        [0, 0.68, -1.05],
        k.dark,
        0.07,
      ).rotation.x = -0.15;
      k.oval("roof", [0.17, 0.19, 0.19], [0, 0.9, -0.68], orange);
      k.panel("roof", [0.2, 0.09, 0.06], [0, 0.91, -0.5], k.glass, 0.015);
      // Dash with gauges ahead of the driver.
      k.panel("roof", [0.7, 0.12, 0.25], [0, 0.6, -0.12], k.dark, 0.04);
      for (const dx of [-0.2, 0, 0.2])
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.05, 0.05, 0.05, 20).rotateX(Math.PI / 2),
          [dx, 0.66, -0.16],
          chrome,
        );
      // Butterfly steering wheel and column.
      k.bar("roof", [0, 0.5, 0.05], [0, 0.72, -0.22], 0.04, k.dark);
      k.mesh(
        "roof",
        new T.TorusGeometry(0.15, 0.028, 12, 40),
        [0, 0.74, -0.24],
        k.dark,
      ).rotation.x = -0.5;
      k.panel("roof", [0.12, 0.1, 0.05], [0, 0.74, -0.24], orange, 0.02);
      // Slanted windscreen with a tube frame.
      k.panel(
        "roof",
        [0.86, 0.4, 0.05],
        [0, 0.86, -0.02],
        k.glass,
        0.02,
      ).rotation.x = -0.32;
      for (const side of sides)
        k.bar(
          "roof",
          [side * 0.45, 0.58, 0.04],
          [side * 0.45, 1.1, -0.12],
          0.04,
          frame,
        );
      k.bar("roof", [-0.45, 1.1, -0.12], [0.45, 1.1, -0.12], 0.04, frame);
      // Full cage: A-pillars, top rails, rear hoop, diagonals, crossbars.
      for (const side of sides) {
        k.bar("roof", [side * 0.58, 0.6, -0.08], [side * 0.58, 1.38, -0.3], 0.055, frame);
        k.bar("roof", [side * 0.58, 1.38, -0.3], [side * 0.58, 1.38, -1.2], 0.055, frame);
        k.bar("roof", [side * 0.58, 0.6, -1.2], [side * 0.58, 1.38, -1.2], 0.055, frame);
        k.bar("roof", [side * 0.58, 1.38, -0.3], [side * 0.58, 0.6, -1.2], 0.04, frame);
      }
      k.bar("roof", [-0.58, 1.38, -0.3], [0.58, 1.38, -0.3], 0.055, frame);
      k.bar("roof", [-0.58, 1.38, -1.2], [0.58, 1.38, -1.2], 0.055, frame);
      // Cowl rivets.
      for (const side of sides)
        for (let i = 0; i < 5; i++)
          k.mesh(
            "roof",
            new T.SphereGeometry(0.026, 10, 8),
            [side * 0.82, 0.28, -1.1 + i * 0.3],
            chrome,
          );

      // ---- Flanks (doors): orange pods, silver stripes, tube trusses ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [-1.5, -0.2],
            [0.6, -0.2],
            [0.55, 0.5],
            [-1.45, 0.55],
          ],
          0.1,
          side * 0.98,
          orange,
          0.03,
        );
        k.panel(d, [0.05, 0.1, 1.85], [side * 1.05, 0.15, -0.45], chrome, 0.015);
        k.mesh(
          d,
          new T.CylinderGeometry(0.16, 0.16, 0.05, 32).rotateZ(Math.PI / 2),
          [side * 1.06, 0.05, -0.45],
          k.white,
        );
        k.mesh(
          d,
          new T.CylinderGeometry(0.09, 0.09, 0.06, 24).rotateZ(Math.PI / 2),
          [side * 1.06, 0.05, -0.45],
          orange,
        );
        k.bar(d, [side * 0.95, -0.38, 0.9], [side * 0.95, -0.38, -1.6], 0.06, frame);
        k.bar(d, [side * 0.95, -0.08, 0.9], [side * 0.95, -0.08, -1.6], 0.05, frame);
        const posts = [0.8, 0.2, -0.4, -1.0, -1.5];
        posts.forEach((z, i) => {
          k.bar(d, [side * 0.95, -0.38, z], [side * 0.95, -0.08, z], 0.04, frame);
          if (i < posts.length - 1)
            k.bar(
              d,
              [side * 0.95, i % 2 ? -0.08 : -0.38, z],
              [side * 0.95, i % 2 ? -0.38 : -0.08, posts[i + 1]],
              0.032,
              chrome,
            );
        });
        for (let i = 0; i < 7; i++)
          k.mesh(
            d,
            new T.SphereGeometry(0.026, 10, 8),
            [side * 1.04, 0.38, -1.25 + i * 0.3],
            chrome,
          );
        k.panel(d, [0.3, 0.06, 0.35], [side * 1.0, -0.44, -0.5], chrome, 0.02);
      }

      // ---- Rear deck, wing, and parachute packs (bed) ----
      k.panel("bed", [1.5, 0.16, 1.0], [0, 0.5, -1.65], orange, 0.05);
      k.panel("bed", [1.1, 0.3, 0.6], [0, 0.3, -1.35], k.dark, 0.06);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.09, 0.09, 0.12, 24),
        [0.3, 0.62, -1.35],
        chrome,
      );
      // Wing struts: four orange legs with dark cross-braces.
      for (const side of sides) {
        k.bar("bed", [side * 0.55, 0.55, -1.4], [side * 0.62, 2.5, -2.0], 0.06, orange);
        k.bar("bed", [side * 0.55, 0.55, -1.95], [side * 0.62, 2.5, -2.3], 0.06, orange);
        k.bar("bed", [side * 0.58, 1.5, -1.72], [side * 0.58, 1.5, -2.08], 0.03, frame);
      }
      k.bar("bed", [-0.6, 1.5, -1.9], [0.6, 1.5, -1.9], 0.03, frame);
      // Main plane with a silver top stripe and gurney flap.
      k.panel("bed", [2.3, 0.09, 0.75], [0, 2.55, -2.15], orange, 0.03);
      k.panel("bed", [2.32, 0.03, 0.2], [0, 2.61, -2.15], chrome, 0.008);
      k.panel("bed", [2.3, 0.12, 0.03], [0, 2.62, -2.51], frame, 0.008);
      for (const side of sides) {
        k.profile(
          "bed",
          [
            [-2.55, 2.05],
            [-1.75, 2.05],
            [-1.8, 2.95],
            [-2.5, 2.95],
          ],
          0.08,
          side * 1.15,
          orange,
          0.02,
        );
        k.panel("bed", [0.03, 0.12, 0.7], [side * 1.21, 2.5, -2.15], chrome, 0.008);
        for (let i = 0; i < 4; i++)
          k.mesh(
            "bed",
            new T.SphereGeometry(0.024, 10, 8),
            [side * 1.2, 2.2 + i * 0.2, -2.15],
            frame,
          );
      }
      // Twin parachute packs with straps, caps, and release cables.
      for (const side of sides) {
        k.panel("bed", [0.5, 0.45, 0.28], [side * 0.3, 0.98, -1.5], canvas, 0.09);
        k.panel("bed", [0.54, 0.1, 0.32], [side * 0.3, 0.98, -1.5], webbing, 0.03);
        k.panel("bed", [0.1, 0.49, 0.32], [side * 0.3, 0.98, -1.5], webbing, 0.03);
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.08, 0.08, 0.06, 20).rotateX(Math.PI / 2),
          [side * 0.3, 1.22, -1.5],
          chrome,
        );
        k.tube(
          "bed",
          [
            [side * 0.3, 1.1, -1.36],
            [side * 0.45, 1.0, -1.2],
            [side * 0.55, 0.9, -1.15],
          ],
          0.02,
          frame,
        );
      }
      k.panel("bed", [1.2, 0.2, 0.3], [0, 0.66, -1.5], frame, 0.05);

      // ---- Front frame (chassis-front): rails, tank, A-arms, shocks ----
      for (const side of sides) {
        k.bar(
          "chassis-front",
          [side * 0.55, -0.4, 2.7],
          [side * 0.55, -0.4, 0.2],
          0.07,
          frame,
        );
        k.bar(
          "chassis-front",
          [side * 0.55, -0.4, 2.7],
          [side * 0.12, -0.26, 2.9],
          0.055,
          frame,
        );
        k.bar(
          "chassis-front",
          [side * 0.55, -0.4, 1.65],
          [side * 0.55, 0.0, 1.65],
          0.05,
          frame,
        );
        k.bar(
          "chassis-front",
          [side * 0.55, 0.0, 1.65],
          [side * 1.15, -0.15, 1.65],
          0.05,
          frame,
        );
        k.bar(
          "chassis-front",
          [side * 0.55, -0.5, 1.65],
          [side * 1.15, -0.7, 1.65],
          0.05,
          frame,
        );
        k.bar(
          "chassis-front",
          [side * 1.15, -0.7, 1.65],
          [side * 1.15, -0.15, 1.65],
          0.055,
          frame,
        );
        k.bar(
          "chassis-front",
          [side * 0.3, -0.3, 1.3],
          [side * 1.15, -0.42, 1.65],
          0.032,
          chrome,
        );
        k.shock(
          "chassis-front",
          [side * 1.13, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          orange,
        );
      }
      for (const z of [2.4, 1.8, 1.2, 0.6])
        k.bar("chassis-front", [-0.55, -0.4, z], [0.55, -0.4, z], 0.06, frame);
      k.bar("chassis-front", [-0.5, -0.3, 1.3], [0.5, -0.3, 1.3], 0.05, frame);
      k.tube(
        "chassis-front",
        [
          [0, -0.28, 1.28],
          [0, 0.2, 0.4],
          [0, 0.5, -0.02],
        ],
        0.045,
        frame,
      );
      // Fuel tank slung under the nose with straps.
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.14, 0.14, 0.6, 32).rotateX(Math.PI / 2),
        [0, -0.52, 2.0],
        chrome,
      );
      k.oval("chassis-front", [0.14, 0.14, 0.1], [0, -0.52, 2.3], chrome);
      k.oval("chassis-front", [0.14, 0.14, 0.1], [0, -0.52, 1.7], chrome);
      for (const z of [1.85, 2.15])
        k.mesh(
          "chassis-front",
          new T.TorusGeometry(0.15, 0.025, 10, 32),
          [0, -0.52, z],
          frame,
        );
      k.panel("chassis-front", [0.8, 0.06, 1.0], [0, -0.64, 1.9], frame, 0.02);

      // ---- Rear frame (chassis-rear): rails, axle truss, cell, shocks ----
      for (const side of sides) {
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.4, 0.3],
          [side * 0.55, -0.4, -2.5],
          0.07,
          frame,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.4, -1.65],
          [side * 0.55, 0.0, -1.65],
          0.05,
          frame,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, 0.0, -1.65],
          [side * 1.15, -0.15, -1.65],
          0.05,
          frame,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.5, -1.65],
          [side * 1.15, -0.7, -1.65],
          0.05,
          frame,
        );
        k.bar(
          "chassis-rear",
          [side * 1.15, -0.7, -1.65],
          [side * 1.15, -0.15, -1.65],
          0.055,
          frame,
        );
        k.bar(
          "chassis-rear",
          [side * 0.55, -0.4, -1.2],
          [side * 0.55, 0.1, -1.65],
          0.05,
          frame,
        );
        k.shock(
          "chassis-rear",
          [side * 1.13, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          orange,
        );
        k.tube(
          "chassis-rear",
          [
            [side * 0.4, 0.1, -1.9],
            [side * 0.5, -0.2, -2.2],
            [side * 0.55, -0.35, -2.5],
          ],
          0.045,
          chrome,
        );
      }
      for (const z of [-0.3, -1.0, -1.7, -2.3])
        k.bar("chassis-rear", [-0.55, -0.4, z], [0.55, -0.4, z], 0.06, frame);
      k.panel("chassis-rear", [0.9, 0.5, 0.7], [0, -0.05, -2.0], k.dark, 0.06);
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.07, 0.07, 0.3, 20),
        [0.25, 0.3, -2.0],
        chrome,
      );
      k.panel("chassis-rear", [0.4, 0.3, 0.3], [-0.55, -0.2, -0.7], frame, 0.05);
      k.panel("chassis-rear", [1.3, 0.06, 0.8], [0, -0.5, -2.1], frame, 0.02);

      // ---- Nose tip (bumper-front): spike cone, splitter, tow loops ----
      k.mesh(
        "bumper-front",
        new T.ConeGeometry(0.1, 0.35, 32).rotateX(Math.PI / 2),
        [0, -0.26, 3.1],
        orange,
      );
      k.mesh(
        "bumper-front",
        new T.CylinderGeometry(0.11, 0.12, 0.12, 32).rotateX(Math.PI / 2),
        [0, -0.26, 2.93],
        frame,
      );
      k.mesh(
        "bumper-front",
        new T.TorusGeometry(0.12, 0.028, 12, 40),
        [0, -0.26, 2.87],
        chrome,
      );
      k.panel("bumper-front", [0.7, 0.06, 0.5], [0, -0.48, 2.85], frame, 0.02);
      for (const side of sides) {
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.08, 0.026, 10, 28),
          [side * 0.3, -0.42, 2.8],
          chrome,
        );
        k.panel(
          "bumper-front",
          [0.12, 0.05, 0.3],
          [side * 0.28, -0.52, 2.85],
          chrome,
          0.015,
        );
      }

      // ---- Tail (bumper-rear): crossbar, lamps, flaps, chute lever ----
      k.panel("bumper-rear", [1.9, 0.2, 0.25], [0, -0.15, -2.62], frame, 0.06);
      k.panel("bumper-rear", [1.92, 0.05, 0.27], [0, -0.06, -2.62], chrome, 0.015);
      for (const side of sides) {
        k.lamp("bumper-rear", [side * 0.7, -0.15, -2.78], 0.08, k.red, -1);
        k.bar(
          "bumper-rear",
          [side * 0.95, -0.2, -2.62],
          [side * 1.5, -0.35, -2.7],
          0.045,
          frame,
        );
        k.panel(
          "bumper-rear",
          [0.5, 0.42, 0.06],
          [side * 1.55, -0.6, -2.72],
          frame,
          0.03,
        );
        k.panel(
          "bumper-rear",
          [0.34, 0.08, 0.04],
          [side * 1.55, -0.45, -2.75],
          orange,
          0.01,
        );
      }
      k.mesh(
        "bumper-rear",
        new T.TorusGeometry(0.09, 0.03, 12, 32),
        [0, -0.32, -2.68],
        chrome,
      );
      k.bar("bumper-rear", [0.15, -0.2, -2.76], [0.35, -0.2, -2.76], 0.03, k.red);
      k.bar("bumper-rear", [0.25, -0.28, -2.76], [0.25, -0.12, -2.76], 0.03, k.red);

      // Dark hub caps with orange trim rings over the kit hubs.
      const caps = [
        ["wheel-fl", 2.12, 1.65],
        ["wheel-fr", -2.12, 1.65],
        ["wheel-rl", 2.12, -1.65],
        ["wheel-rr", -2.12, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        const ring = new T.TorusGeometry(0.3, 0.025, 12, 64);
        ring.rotateY(Math.PI / 2);
        k.mesh(part, ring, [x, -0.85, z], orange);
        k.mesh(
          part,
          new T.CylinderGeometry(0.14, 0.14, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          frame,
        );
      }
    },
  ),
  vehicle(
    "tuk-tuk",
    "Tuk-Tuk",
    "Three-wheeler taxi look with a canopy and bench over four derby wheels.",
    [2381480, 15317048, 3948355, 0.76, 10],
    (k) => {
      const yellow = k.accent;
      const blue = k.paint;
      const canvas = finish(0x2b4d9b, 0.9, 0);
      const canvasDark = finish(0x1d3468, 0.92, 0);
      const vinyl = finish(0x23262b, 0.85, 0);
      const taxi = glow(0xffd34d);
      const mat = finish(0x2b2e30, 0.95, 0);

      // ---- Front cowl (hood): rounded rickshaw nose, single headlamp ----
      k.hull(
        "hood",
        [
          [0.9, -0.12, 0.78, 1.0, 0.95],
          [1.7, -0.14, 0.62, 0.85, 0.8],
          [2.35, -0.12, 0.45, 0.6, 0.55],
        ],
        yellow,
      );
      k.oval("hood", [0.62, 0.52, 0.42], [0, 0.18, 2.3], yellow);
      // Blue center band with the single round headlamp.
      k.oval("hood", [0.2, 0.3, 0.16], [0, 0.28, 2.6], blue);
      k.lamp("hood", [0, 0.34, 2.7], 0.17);
      for (const side of sides) {
        k.lamp("hood", [side * 0.44, 0.12, 2.5], 0.06, k.amber);
        k.panel("hood", [0.06, 0.16, 0.95], [side * 0.92, 0.28, 1.45], blue, 0.02);
        k.bar(
          "hood",
          [side * 0.98, 0.72, 0.95],
          [side * 0.58, 0.42, 2.32],
          0.028,
          k.steel,
        );
      }
      for (let i = 0; i < 3; i++)
        k.panel(
          "hood",
          [0.44, 0.03, 0.05],
          [0, -0.02 + i * 0.07, 2.6],
          k.steel,
          0.008,
        );
      // Faux center front-fender hump for the trike read, tucked under the nose.
      k.oval("hood", [0.32, 0.18, 0.35], [0, -0.3, 2.45], yellow);
      k.panel("hood", [0.36, 0.04, 0.3], [0, -0.17, 2.45], k.steel, 0.012);

      // ---- Wraparound windscreen (hood): raked center pane + side wings ----
      k.bar("hood", [-0.82, 0.78, 1.78], [0.82, 0.78, 1.78], 0.045, k.dark);
      k.bar("hood", [-0.97, 2.18, 1.28], [0.97, 2.18, 1.28], 0.045, k.dark);
      k.bar("hood", [0, 0.78, 1.78], [0, 2.18, 1.28], 0.035, k.dark);
      for (const side of sides)
        k.bar(
          "hood",
          [side * 0.82, 0.78, 1.78],
          [side * 0.97, 2.18, 1.28],
          0.045,
          k.dark,
        );
      k.panel("hood", [1.62, 1.34, 0.05], [0, 1.48, 1.53], k.glass, 0.02).rotation.x =
        -0.36;
      for (const side of sides) {
        const wing = k.panel(
          "hood",
          [0.5, 1.24, 0.04],
          [side * 1.02, 1.45, 1.32],
          k.glass,
          0.018,
        );
        wing.rotation.x = -0.36;
        wing.rotation.y = side * 0.55;
        k.bar(
          "hood",
          [side * 0.97, 2.18, 1.28],
          [side * 1.2, 1.45, 1.05],
          0.035,
          k.dark,
        );
      }
      k.bar("hood", [-0.3, 1.0, 1.62], [0.15, 1.35, 1.5], 0.018, k.dark);

      // ---- Driver floor (chassis-front): pan, mat, saddle, handlebars ----
      k.panel("chassis-front", [1.9, 0.1, 2.3], [0, -0.14, 0.85], yellow, 0.04);
      k.panel("chassis-front", [1.7, 0.05, 2.0], [0, -0.07, 0.8], mat, 0.015);
      const stud = new T.CylinderGeometry(0.022, 0.022, 0.035, 10);
      for (let ix = 0; ix < 6; ix++)
        for (let iz = 0; iz < 4; iz++)
          k.mesh(
            "chassis-front",
            stud,
            [-0.55 + ix * 0.22, -0.03, 0.3 + iz * 0.35],
            k.steel,
          );
      // Dash cowl back + saddle seat.
      k.panel("chassis-front", [1.1, 0.35, 0.25], [0, 0.55, 1.45], yellow, 0.06);
      k.panel("chassis-front", [0.9, 0.06, 0.28], [0, 0.75, 1.45], mat, 0.02);
      k.panel("chassis-front", [0.62, 0.2, 0.6], [0, 0.32, 0.4], vinyl, 0.08);
      k.panel("chassis-front", [0.6, 0.5, 0.16], [0, 0.6, 0.08], vinyl, 0.07).rotation.x =
        -0.12;
      // Handlebar column with crossbar, grips, mirrors, speedo.
      k.bar("chassis-front", [0, 0.3, 1.4], [0, 1.02, 1.08], 0.05, k.steel);
      k.bar("chassis-front", [-0.36, 1.04, 1.06], [0.36, 1.04, 1.06], 0.035, k.dark);
      for (const side of sides) {
        k.bar(
          "chassis-front",
          [side * 0.3, 1.04, 1.06],
          [side * 0.46, 1.04, 1.06],
          0.05,
          mat,
        );
        k.bar(
          "chassis-front",
          [side * 0.34, 1.04, 1.06],
          [side * 0.44, 1.3, 1.0],
          0.018,
          k.steel,
        );
        k.panel(
          "chassis-front",
          [0.16, 0.1, 0.03],
          [side * 0.46, 1.33, 1.0],
          k.dark,
          0.012,
        );
      }
      k.mesh(
        "chassis-front",
        new T.CylinderGeometry(0.07, 0.07, 0.04, 24).rotateX(Math.PI / 2),
        [0, 1.06, 1.12],
        k.steel,
      );
      k.bar("chassis-front", [0, 1.06, 1.14], [0.03, 1.09, 1.14], 0.01, k.red);
      for (const x of [-0.2, 0.2])
        k.panel("chassis-front", [0.14, 0.04, 0.22], [x, 0.0, 1.3], mat, 0.01).rotation.x =
          0.5;
      k.bar("chassis-front", [0.32, 0.0, 0.9], [0.32, 0.35, 0.85], 0.025, k.steel);
      k.oval("chassis-front", [0.045, 0.045, 0.045], [0.32, 0.38, 0.85], mat);

      // ---- Canopy (roof): blue canvas top on steel posts ----
      k.panel("roof", [2.2, 0.12, 3.3], [0, 2.32, -0.35], canvas, 0.06);
      k.panel("roof", [1.9, 0.1, 3.0], [0, 2.42, -0.35], canvas, 0.05);
      for (const z of [1.1, 0.4, -0.35, -1.1, -1.85])
        k.tube(
          "roof",
          [
            [-1.05, 2.32, z],
            [0, 2.52, z],
            [1.05, 2.32, z],
          ],
          0.035,
          canvasDark,
          20,
        );
      for (const side of sides) {
        k.bar("roof", [side * 0.78, 0.75, 1.8], [side * 1.0, 2.3, 1.2], 0.05, k.dark);
        k.bar("roof", [side * 1.05, 0.4, -0.3], [side * 1.08, 2.3, -0.3], 0.05, k.dark);
        k.bar("roof", [side * 1.0, 0.5, -1.9], [side * 1.05, 2.3, -1.9], 0.05, k.dark);
        k.bar("roof", [side * 1.08, 2.3, 1.2], [side * 1.08, 2.3, -1.95], 0.05, k.dark);
        for (let i = 0; i < 10; i++)
          k.panel(
            "roof",
            [0.06, 0.12, 0.26],
            [side * 1.12, 2.2, 1.0 - i * 0.32],
            canvasDark,
            0.02,
          );
      }
      k.bar("roof", [-1.05, 2.3, 1.2], [1.05, 2.3, 1.2], 0.05, k.dark);
      k.bar("roof", [-1.05, 2.3, -1.95], [1.05, 2.3, -1.95], 0.05, k.dark);
      k.oval("roof", [0.06, 0.03, 0.06], [0, 2.24, -0.35], k.white);
      // Rear taxi sign on the back hoop.
      k.panel("roof", [0.74, 0.26, 0.14], [0, 2.0, -1.95], k.dark, 0.03);
      k.panel("roof", [0.62, 0.16, 0.03], [0, 2.0, -2.03], taxi, 0.01);

      // ---- Open sides (doors): low yellow panels, rails, steps ----
      for (const side of sides) {
        const d = door(side);
        k.profile(
          d,
          [
            [1.25, -0.15],
            [-1.95, -0.15],
            [-1.9, 0.42],
            [1.15, 0.42],
          ],
          0.14,
          side * 1.02,
          yellow,
          0.04,
        );
        k.panel(d, [0.05, 0.1, 2.9], [side * 1.11, 0.15, -0.35], blue, 0.02);
        k.panel(d, [0.02, 0.12, 0.44], [side * 1.1, 0.28, 0.3], k.white, 0.008);
        for (const z of [1.0, -1.75])
          k.bar(d, [side * 1.06, 0.42, z], [side * 1.06, 1.1, z], 0.032, k.dark);
        k.bar(d, [side * 1.06, 1.1, 1.0], [side * 1.06, 1.1, -1.75], 0.032, k.dark);
        k.panel(d, [0.4, 0.07, 0.5], [side * 1.15, -0.35, -0.3], k.steel, 0.02);
        for (let i = 0; i < 3; i++)
          k.bar(
            d,
            [side * 0.98, -0.31, -0.48 + i * 0.18],
            [side * 1.32, -0.31, -0.48 + i * 0.18],
            0.014,
            k.dark,
          );
        k.panel(d, [0.05, 0.08, 0.14], [side * 1.11, 0.05, 1.15], k.amber, 0.012);
        k.panel(d, [0.05, 0.08, 0.14], [side * 1.11, 0.05, -1.85], k.red, 0.012);
      }

      // ---- Rear body (bed): bench seat, pods, taxi sign, lights ----
      k.hull(
        "bed",
        [
          [-2.5, -0.12, 0.5, 1.0, 0.95],
          [-0.7, -0.12, 0.55, 1.05, 1.0],
        ],
        yellow,
      );
      k.panel("bed", [1.6, 0.22, 0.62], [0, 0.45, -1.3], vinyl, 0.08);
      k.panel("bed", [1.6, 0.62, 0.2], [0, 0.85, -1.68], vinyl, 0.08).rotation.x =
        -0.1;
      const button = new T.SphereGeometry(0.035, 12, 8);
      for (let ix = 0; ix < 4; ix++)
        for (const y of [0.78, 1.0]) {
          const b = k.mesh("bed", button, [-0.45 + ix * 0.3, y, -1.57], mat);
          b.scale.z = 0.55;
        }
      for (const side of sides) {
        k.panel("bed", [0.25, 0.5, 1.4], [side * 0.9, 0.5, -1.3], yellow, 0.05);
        k.panel("bed", [0.27, 0.1, 1.2], [side * 0.9, 0.42, -1.3], blue, 0.02);
        k.panel("bed", [0.2, 0.12, 0.5], [side * 0.72, 0.64, -1.3], vinyl, 0.05);
      }
      k.tube(
        "bed",
        [
          [-0.75, 0.62, -1.62],
          [0, 0.78, -1.72],
          [0.75, 0.62, -1.62],
        ],
        0.03,
        k.steel,
        20,
      );
      // Rear face: panel, taxi sign, plate, taillights.
      k.panel("bed", [1.9, 0.5, 0.1], [0, 0.35, -2.5], yellow, 0.04);
      k.panel("bed", [1.9, 0.1, 0.06], [0, 0.28, -2.55], blue, 0.02);
      k.panel("bed", [0.74, 0.26, 0.12], [0, 0.78, -2.52], k.dark, 0.03);
      k.panel("bed", [0.62, 0.16, 0.03], [0, 0.78, -2.59], taxi, 0.01);
      k.panel("bed", [0.34, 0.12, 0.03], [0, 0.05, -2.56], k.white, 0.01);
      for (const side of sides) {
        k.lamp("bed", [side * 0.78, 0.42, -2.56], 0.08, k.red, -1);
        k.panel("bed", [0.12, 0.08, 0.03], [side * 0.78, 0.12, -2.56], k.amber, 0.01);
      }

      // ---- Front bumper: chrome bullbar with loops ----
      k.tube(
        "bumper-front",
        [
          [-0.7, -0.22, 2.68],
          [0, -0.26, 2.88],
          [0.7, -0.22, 2.68],
        ],
        0.07,
        k.steel,
        24,
      );
      k.bar("bumper-front", [-0.7, -0.42, 2.62], [0.7, -0.42, 2.62], 0.05, k.steel);
      for (const side of sides) {
        k.bar(
          "bumper-front",
          [side * 0.7, -0.42, 2.62],
          [side * 0.7, -0.22, 2.68],
          0.045,
          k.steel,
        );
        k.mesh(
          "bumper-front",
          new T.TorusGeometry(0.09, 0.028, 12, 32),
          [side * 0.4, -0.42, 2.64],
          k.dark,
        );
        k.bar(
          "bumper-front",
          [side * 0.5, -0.3, 2.4],
          [side * 0.5, -0.3, 2.66],
          0.05,
          k.dark,
        );
      }

      // ---- Rear bumper: step, lights, mudflaps ----
      k.panel("bumper-rear", [2.0, 0.14, 0.4], [0, -0.2, -2.7], k.steel, 0.05);
      k.tailLights(-2.92, 0.02);
      for (const side of sides) {
        k.panel(
          "bumper-rear",
          [0.55, 0.45, 0.06],
          [side * 1.65, -0.5, -2.72],
          k.dark,
          0.03,
        );
        k.panel(
          "bumper-rear",
          [0.4, 0.07, 0.02],
          [side * 1.65, -0.4, -2.76],
          yellow,
          0.008,
        );
        k.bar(
          "bumper-rear",
          [side * 0.8, -0.22, -2.5],
          [side * 0.8, -0.22, -2.7],
          0.05,
          k.dark,
        );
      }
      k.bar("bumper-rear", [0, -0.32, -2.72], [0, -0.32, -2.95], 0.05, k.dark);

      // ---- Chassis dressing: fenders, shocks, tank, exhaust ----
      fenders(k, yellow);
      for (const side of sides) {
        k.shock(
          "chassis-front",
          [side * 1.18, 0.55, 1.65],
          [side * 1.45, -0.67, 1.65],
          yellow,
        );
        k.shock(
          "chassis-rear",
          [side * 1.18, 0.55, -1.65],
          [side * 1.45, -0.67, -1.65],
          yellow,
        );
        k.bar(
          "chassis-front",
          [side * 0.95, -0.2, -1.2],
          [side * 0.95, -0.2, 1.4],
          0.05,
          k.steel,
        );
      }
      k.panel("chassis-front", [1.1, 0.35, 0.7], [0, -0.3, 0.3], k.dark, 0.05);
      k.panel("chassis-rear", [1.9, 0.1, 1.8], [0, -0.14, -1.2], yellow, 0.04);
      k.tube(
        "chassis-rear",
        [
          [0.3, -0.3, 0.4],
          [0.45, -0.38, -1.2],
          [0.5, -0.38, -2.4],
        ],
        0.05,
        k.steel,
        24,
      );
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.11, 0.11, 0.5, 24).rotateX(Math.PI / 2),
        [0.5, -0.38, -2.2],
        k.steel,
      );
      k.mesh(
        "chassis-rear",
        new T.CylinderGeometry(0.07, 0.09, 0.12, 24).rotateX(Math.PI / 2),
        [0.5, -0.38, -2.5],
        k.dark,
      );
      k.panel("chassis-rear", [0.6, 0.3, 0.4], [-0.5, -0.3, -1.4], k.dark, 0.04);
      k.bar("chassis-rear", [-1.1, -0.5, -2.85], [1.1, -0.5, -2.85], 0.06, k.dark);

      // Dark hub caps with yellow trim rings over the kit hubs.
      const caps = [
        ["wheel-fl", 2.03, 1.65],
        ["wheel-fr", -2.03, 1.65],
        ["wheel-rl", 2.03, -1.65],
        ["wheel-rr", -2.03, -1.65],
      ] as const;
      for (const [part, x, z] of caps) {
        const ring = new T.TorusGeometry(0.3, 0.025, 12, 64);
        ring.rotateY(Math.PI / 2);
        k.mesh(part, ring, [x, -0.85, z], yellow);
        k.mesh(
          part,
          new T.CylinderGeometry(0.14, 0.14, 0.07, 32).rotateZ(Math.PI / 2),
          [x, -0.85, z],
          k.dark,
        );
      }
    },
  ),
];
