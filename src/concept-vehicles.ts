import * as T from "three";
import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js";
import { ConceptVehicleKit, finish, type XYZ } from "./concept-vehicle-kit";

const SIDES = [-1, 1] as const;
const doors = ["door-right", "door-left"] as const;

function duneBuggy() {
  const k = new ConceptVehicleKit("dune-buggy", {
    paint: 0x36c8c9,
    accent: 0xd85a34,
    rim: 0x555857,
    tireWidth: 0.87,
    spokes: 8,
  });
  k.hull("hood", [
    [0.51, 0.08, 0.84, 1.07, 1.18],
    [1.67, -0.12, 0.56, 0.94, 1.03],
    [2.49, -0.17, 0.21, 0.69, 0.82],
  ]);
  k.panel("hood", [0.78, 0.047, 0.5], [0, 0.58, 1.64], k.dark).rotation.x =
    0.27;
  k.panel("bed", [2.18, 0.44, 0.89], [0, 0.48, -2.07]);
  k.spare("bed", [0, 0.93, -2.01]);
  for (const side of SIDES) {
    const door = side < 0 ? doors[0] : doors[1];
    k.profile(
      door,
      [
        [-1.5, 0.1],
        [0.63, 0.12],
        [0.68, 0.72],
        [-1.35, 0.95],
      ],
      0.12,
      side * 1.13,
    );
    k.bar(door, [side * 1.15, 0.78, 0.71], [side * 1.15, 1.01, -1.46], 0.07);
    k.bar(door, [side * 1.17, -0.12, 0.83], [side * 1.17, -0.12, -1.66], 0.07);
    k.bar("roof", [side * 1.12, 0.6, 0.78], [side * 0.9, 1.87, 0.3], 0.078);
    k.bar("roof", [side * 0.9, 1.87, 0.3], [side * 0.91, 1.86, -1.08], 0.078);
    k.bar("roof", [side * 0.91, 1.86, -1.08], [side * 1.1, 0.48, -2.03], 0.078);
    k.bar("roof", [side * 1.03, 0.41, -1.4], [side * 0.9, 1.87, 0.3], 0.049);
    k.panel(
      "chassis-front",
      [0.61, 0.18, 0.68],
      [side * 0.52, 0.24, -0.41],
      k.dark,
      0.08,
    );
    k.panel(
      "chassis-front",
      [0.57, 0.95, 0.15],
      [side * 0.52, 0.78, -0.76],
      k.dark,
      0.07,
    ).rotation.x = -0.24;
    k.shock(
      "chassis-front",
      [side * 1.15, 0.7, 1.65],
      [side * 1.46, -0.64, 1.65],
      k.accent,
    );
    k.shock(
      "chassis-rear",
      [side * 1.08, 0.85, -1.65],
      [side * 1.47, -0.64, -1.65],
      k.accent,
    );
  }
  for (const z of [0.3, -1.08])
    k.bar("roof", [-0.9, 1.87, z], [0.9, 1.87, z], 0.078);
  k.bar("roof", [-0.9, 1.87, 0.3], [0.91, 1.86, -1.08], 0.052);
  k.panel("chassis-front", [1.92, 0.2, 0.33], [0, 0.64, 0.6], k.dark);
  const steering = new T.TorusGeometry(0.18, 0.028, 12, 48);
  k.mesh("chassis-front", steering, [0.51, 0.8, 0.28], k.dark).rotation.x =
    -0.34;
  k.bar("bumper-front", [-1.02, 0.14, 2.53], [1.02, 0.14, 2.53], 0.095);
  k.bar("bumper-front", [-0.76, -0.28, 2.24], [0.76, -0.28, 2.24], 0.074);
  for (const x of [-0.68, -0.23, 0.23, 0.68])
    k.lamp("bumper-front", [x, 0.38, 2.55], 0.165, k.amber);
  k.bar("bumper-rear", [-1.05, -0.08, -2.64], [1.05, -0.08, -2.64], 0.085);
  k.tailLights();
  return k.root;
}

function rallyHatch() {
  const k = new ConceptVehicleKit("rally-hatch", {
    paint: 0xe9b838,
    accent: 0xf7f2e5,
    rim: 0xecebe4,
    tireWidth: 0.67,
    spokes: 12,
  });
  k.hull("hood", [
    [0.64, 0.23, 0.76, 1.15, 1.24],
    [2.24, 0.12, 0.56, 1.18, 1.22],
    [2.56, 0.1, 0.43, 1.13, 1.11],
  ]);
  k.panel(
    "hood",
    [0.83, 0.075, 0.48],
    [0, 0.7, 1.21],
    k.paint,
    0.032,
  ).rotation.x = 0.12;
  for (let i = 0; i < 5; i++)
    k.panel(
      "hood",
      [0.51, 0.025, 0.033],
      [0, 0.752 - i * 0.009, 1.07 + i * 0.07],
      k.dark,
      0.01,
    );
  k.hull("roof", [
    [-2.19, 0.57, 0.8, 1.22, 1.14],
    [-1.52, 0.63, 1.73, 1.25, 1.02],
    [0.08, 0.64, 1.75, 1.25, 1.05],
    [0.85, 0.62, 0.71, 1.24, 1.22],
  ]);
  k.panel("roof", [2.13, 0.14, 1.73], [0, 1.75, -0.71], k.paint, 0.06);
  k.panel("roof", [1.93, 1.13, 0.09], [0, 1.216, 0.485], k.dark).rotation.x =
    -0.63;
  k.panel("roof", [1.79, 1.01, 0.07], [0, 1.23, 0.525], k.glass).rotation.x =
    -0.63;
  k.panel("roof", [1.77, 0.81, 0.08], [0, 1.23, -1.89], k.glass).rotation.x =
    0.67;
  k.panel("bed", [2.38, 0.66, 1.44], [0, 0.34, -1.79]);
  for (const side of SIDES) {
    const door = side < 0 ? doors[0] : doors[1];
    k.panel(door, [0.19, 0.73, 2.1], [side * 1.16, 0.24, -0.33]);
    k.profile(
      "roof",
      [
        [-1.99, 0.8],
        [-1.47, 1.58],
        [-0.03, 1.61],
        [0.57, 0.81],
      ],
      0.063,
      side * 1.17,
      k.dark,
      0.022,
    );
    k.profile(
      "roof",
      [
        [-1.88, 0.86],
        [-1.43, 1.51],
        [-0.88, 1.52],
        [-0.88, 0.86],
      ],
      0.026,
      side * 1.216,
      k.glass,
      0.016,
    );
    k.profile(
      "roof",
      [
        [-0.79, 0.86],
        [-0.79, 1.53],
        [-0.06, 1.54],
        [0.46, 0.86],
      ],
      0.026,
      side * 1.216,
      k.glass,
      0.016,
    );
    k.panel(
      door,
      [0.069, 0.11, 2.1],
      [side * 1.26, 0.06, -0.31],
      k.accent,
      0.02,
    );
    k.panel(
      door,
      [0.09, 0.066, 0.28],
      [side * 1.275, 0.52, -0.72],
      k.dark,
      0.018,
    );
    k.panel(door, [0.3, 0.19, 0.25], [side * 1.28, 0.79, 0.63], k.dark);
    k.arch("chassis-front", side, 1.65, k.dark, true);
    k.arch("chassis-rear", side, -1.65, k.dark, true);
    k.panel(
      "chassis-rear",
      [0.52, 0.59, 0.07],
      [side * 1.66, -0.67, -2.62],
      k.rubber,
    );
    k.profile(
      "bed",
      [
        [-2.64, 1.51],
        [-2.34, 1.88],
        [-1.95, 1.95],
        [-2.2, 1.49],
      ],
      0.09,
      side * 1.05,
      k.dark,
    );
  }
  k.panel("bed", [2.14, 0.105, 0.55], [0, 1.91, -2.25], k.dark);
  k.panel("bumper-front", [2.66, 0.29, 0.38], [0, 0.01, 2.63], k.dark);
  k.panel("bumper-front", [2.24, 0.39, 0.12], [0, 0.33, 2.59], k.dark);
  for (const x of [-0.81, -0.3, 0.3, 0.81])
    k.lamp("bumper-front", [x, 0.33, 2.76], 0.165);
  k.panel("bumper-rear", [2.57, 0.28, 0.31], [0, 0.01, -2.61], k.dark);
  k.tailLights(-2.7, 0.34);
  return k.root;
}

function racingSemi() {
  const k = new ConceptVehicleKit("racing-semi", {
    paint: 0xbd292c,
    accent: 0xf4e5bd,
    rim: 0xa0a7aa,
    tireWidth: 0.84,
    spokes: 6,
  });
  k.panel("hood", [2.7, 1.02, 2.47], [0, 0.27, 1.12], k.paint, 0.16);
  k.panel("hood", [2.72, 0.52, 0.14], [0, 0.48, 2.31], k.accent, 0.06);
  k.panel("roof", [2.66, 1.42, 2.41], [0, 1.19, 1.07], k.paint, 0.13);
  k.panel("roof", [2.74, 0.19, 2.51], [0, 1.89, 1.08], k.accent, 0.08);
  k.panel("bumper-front", [2.79, 0.26, 0.31], [0, -0.12, 2.53], k.dark);
  for (const side of SIDES) {
    const door = side < 0 ? doors[0] : doors[1];
    k.panel(
      "roof",
      [1.14, 0.64, 0.11],
      [side * 0.622, 1.35, 2.283],
      k.dark,
      0.065,
    );
    k.panel(
      "roof",
      [1.01, 0.54, 0.08],
      [side * 0.622, 1.35, 2.339],
      k.glass,
      0.044,
    );
    k.panel(
      door,
      [0.19, 1.48, 1.61],
      [side * 1.29, 0.85, 1.03],
      k.paint,
      0.065,
    );
    k.panel(
      door,
      [0.16, 0.46, 1.57],
      [side * 1.338, 0.47, 1.03],
      k.accent,
      0.04,
    );
    k.panel(door, [0.11, 0.59, 1.13], [side * 1.397, 1.28, 1.1], k.dark);
    k.panel(door, [0.071, 0.48, 1.02], [side * 1.447, 1.28, 1.1], k.glass);
    k.panel(
      door,
      [0.08, 0.078, 0.26],
      [side * 1.445, 0.87, 0.53],
      k.dark,
      0.022,
    );
    k.bar(door, [side * 1.34, 1.25, 2.12], [side * 1.7, 1.25, 2.12]);
    k.panel(door, [0.19, 0.39, 0.15], [side * 1.72, 1.35, 2.12], k.dark);
    k.arch("chassis-front", side, 1.65, k.accent);
    k.arch("chassis-rear", side, -1.65, k.dark);
    k.bar(
      "chassis-rear",
      [side * 1.13, -0.31, -1.4],
      [side * 1.13, -0.31, -0.5],
      0.22,
      k.steel,
    );
    const stackX = side * 1.15;
    k.tube(
      "bed",
      [
        [stackX, 0, -0.39],
        [stackX, 1.55, -0.39],
        [stackX, 2.27, -0.39],
        [stackX, 2.45, -0.62],
      ],
      0.106,
      k.steel,
      48,
    );
    k.bar("bed", [stackX, 0.31, -0.39], [stackX, 1.36, -0.39], 0.147, k.dark);
    for (const y of [0.47, 0.76, 1.05, 1.32])
      k.bar(
        "bed",
        [stackX, y, -0.39],
        [stackX, y + 0.028, -0.39],
        0.158,
        k.steel,
      );
    k.lamp("bumper-front", [side * 1.02, 0.13, 2.58], 0.17);
  }
  k.panel("hood", [1.39, 0.73, 0.14], [0, 0.32, 2.432], k.dark, 0.085);
  for (let i = 0; i < 12; i++)
    k.panel(
      "hood",
      [1.21, 0.024, 0.031],
      [0, 0.02 + i * 0.054, 2.518],
      k.steel,
      0.008,
    );
  k.panel("bed", [1.6, 0.16, 1.58], [0, 0.26, -1.72], k.dark);
  const coupling = new T.Shape();
  coupling.absarc(0, 0, 0.65, -0.38, Math.PI + 0.38, false);
  coupling.lineTo(-0.14, -0.18);
  coupling.lineTo(0.14, -0.18);
  coupling.closePath();
  const plate = new T.ExtrudeGeometry(coupling, {
    depth: 0.12,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    bevelSegments: 4,
    curveSegments: 40,
  });
  plate.rotateX(Math.PI / 2);
  k.mesh("bed", plate, [0, 0.53, -1.63], k.dark);
  k.panel("bumper-rear", [2.48, 0.22, 0.24], [0, -0.12, -2.64], k.steel);
  k.tailLights(-2.81, 0.03);
  return k.root;
}

function armoredScout() {
  const k = new ConceptVehicleKit("armored-scout", {
    paint: 0x545b43,
    accent: 0xd97532,
    rim: 0x474b46,
    tireWidth: 0.91,
    spokes: 7,
  });
  k.hull("hood", [
    [0.42, -0.24, 1.11, 1.17, 1.14],
    [1.54, -0.28, 0.68, 1.24, 1.13],
    [2.63, -0.19, 0.36, 1.13, 0.92],
  ]);
  k.hull("roof", [
    [-1.56, 0.36, 0.98, 1.25, 1.02],
    [-0.89, 0.51, 1.72, 1.34, 1.02],
    [0.15, 0.55, 1.76, 1.29, 1.06],
    [0.92, 0.5, 1.0, 1.18, 1.17],
  ]);
  k.hull("bed", [
    [-2.61, -0.17, 0.39, 0.98, 1.06],
    [-2.05, -0.21, 0.94, 1.27, 1.18],
    [-0.97, -0.21, 1.13, 1.34, 1.16],
  ]);
  k.bar("roof", [0, 1.73, -0.4], [0, 1.86, -0.4], 0.49, k.dark);
  k.bar("roof", [0, 1.84, -0.4], [0, 1.92, -0.4], 0.435, k.paint);
  k.bar("roof", [-0.17, 1.96, -0.37], [0.17, 1.96, -0.37], 0.032, k.steel);
  k.panel("bumper-front", [2.48, 0.3, 0.31], [0, -0.17, 2.68], k.paint);
  for (const side of SIDES) {
    const door = side < 0 ? doors[0] : doors[1];
    k.profile(
      door,
      [
        [-1.13, 0.13],
        [0.63, 0.12],
        [0.57, 1.05],
        [-0.31, 1.42],
        [-1.16, 1.02],
      ],
      0.13,
      side * 1.23,
      k.paint,
      0.025,
    );
    for (const z of [-0.97, 0.42])
      k.panel(door, [0.1, 0.16, 0.16], [side * 1.325, 0.52, z], k.dark, 0.024);
    k.panel(
      door,
      [0.093, 0.072, 0.29],
      [side * 1.34, 0.95, 0.21],
      k.steel,
      0.02,
    );
    k.panel(
      "roof",
      [0.87, 0.48, 0.1],
      [side * 0.49, 1.37, 0.56],
      k.dark,
    ).rotation.x = -0.8;
    k.panel(
      "roof",
      [0.74, 0.35, 0.078],
      [side * 0.49, 1.39, 0.604],
      k.glass,
      0.03,
    ).rotation.x = -0.8;
    k.arch("chassis-front", side, 1.65, k.paint, true);
    k.arch("chassis-rear", side, -1.65, k.paint, true);
    k.lamp("hood", [side * 0.88, 0.41, 2.61], 0.145, k.amber);
    k.mesh(
      "bumper-front",
      new T.TorusGeometry(0.135, 0.045, 16, 44),
      [side * 0.72, -0.21, 2.89],
      k.accent,
    );
    k.panel(
      "bumper-front",
      [0.28, 0.12, 0.22],
      [side * 0.72, -0.09, 2.79],
      k.steel,
    );
  }
  k.panel("bumper-rear", [2.47, 0.29, 0.32], [0, -0.17, -2.63], k.paint);
  for (let i = 0; i < 4; i++)
    k.panel(
      "hood",
      [0.93, 0.046, 0.065],
      [0, 0.03 + i * 0.07, 2.665],
      k.dark,
      0.012,
    );
  k.tailLights(-2.69, 0.23);
  return k.root;
}

function iceCreamVan() {
  const k = new ConceptVehicleKit("ice-cream-van", {
    paint: 0x9ee0c0,
    accent: 0xed85ad,
    rim: 0x454c4e,
    tireWidth: 0.79,
    spokes: 8,
  });
  const cream = finish(0xffefcb, 0.38, 0.15);
  const waffle = finish(0xc99457, 0.76, 0);
  k.hull("hood", [
    [0.72, -0.12, 0.83, 1.17, 1.32],
    [1.81, -0.2, 0.66, 1.22, 1.24],
    [2.55, -0.2, 0.36, 1.09, 1.1],
  ]);
  k.panel(
    "hood",
    [1.33, 0.14, 1.42],
    [0, 0.52, 1.76],
    cream,
    0.065,
  ).rotation.x = 0.25;
  k.panel("roof", [2.55, 1.34, 2.95], [0, 1.19, 0.23], cream, 0.13);
  k.panel("roof", [2.66, 0.41, 3.6], [0, 1.91, -0.33], k.paint, 0.2);
  k.panel("bed", [2.53, 1.89, 2.23], [0, 0.81, -1.45], cream, 0.15);
  k.panel("bed", [2.56, 0.54, 2.21], [0, 0.02, -1.44], k.paint, 0.1);
  k.panel("bed", [2.49, 0.23, 0.12], [0, 0.43, -2.559], k.accent, 0.056);
  k.panel("bumper-front", [2.62, 0.25, 0.36], [0, -0.02, 2.64], k.dark);
  for (const side of SIDES) {
    const door = side < 0 ? doors[0] : doors[1];
    k.panel(
      "roof",
      [1.09, 0.82, 0.13],
      [side * 0.6, 1.27, 1.725],
      k.dark,
    ).rotation.x = -0.19;
    k.panel(
      "roof",
      [0.96, 0.71, 0.074],
      [side * 0.6, 1.27, 1.801],
      k.glass,
    ).rotation.x = -0.19;
    k.panel(door, [0.13, 1.43, 1.26], [side * 1.27, 0.75, 1.03], cream);
    k.panel(door, [0.1, 0.55, 1.23], [side * 1.32, 0.13, 1.03], k.paint);
    k.panel(door, [0.085, 0.59, 0.94], [side * 1.35, 1.24, 1.1], k.glass);
    k.panel(
      door,
      [0.077, 0.073, 0.25],
      [side * 1.385, 0.77, 0.64],
      k.steel,
      0.023,
    );
    k.panel(door, [0.1, 0.2, 1.57], [side * 1.33, 0.44, 0.92], k.accent, 0.035);
    k.panel(
      "bed",
      [0.1, 0.2, 2.17],
      [side * 1.29, 0.44, -1.43],
      k.accent,
      0.035,
    );
    k.arch("chassis-front", side, 1.65);
    k.arch("chassis-rear", side, -1.65);
    k.lamp("bumper-front", [side * 0.96, 0.36, 2.55], 0.17);
  }
  k.panel("bed", [0.13, 0.91, 1.84], [1.306, 1.13, -1.16], k.dark, 0.045);
  for (let i = 0; i < 13; i++)
    k.panel(
      "bed",
      [0.075, 0.046, 1.64],
      [1.389, 0.75 + i * 0.061, -1.16],
      k.steel,
      0.015,
    );
  k.panel("bed", [0.23, 0.11, 1.91], [1.36, 0.666, -1.16], k.steel, 0.03);
  k.bar("bumper-front", [-1.01, 0.17, 2.81], [1.01, 0.17, 2.81], 0.075);
  k.panel("bumper-front", [0.85, 0.37, 0.11], [0, 0.37, 2.58], k.dark);
  for (let i = -4; i <= 4; i++)
    k.bar(
      "bumper-front",
      [i * 0.079, 0.22, 2.655],
      [i * 0.079, 0.52, 2.655],
      0.017,
      k.steel,
    );
  k.panel("bumper-rear", [2.62, 0.26, 0.28], [0, -0.03, -2.64], k.dark);
  k.tailLights(-2.74, 0.25);

  const sign = new T.Group();
  sign.position.set(0, 2.61, -0.49).sub(k.groups.roof.position);
  sign.rotation.x = 1.02;
  k.groups.roof.add(sign);
  const cone = new T.Mesh(new T.ConeGeometry(0.44, 1.04, 64, 8), waffle);
  cone.rotation.z = Math.PI;
  sign.add(cone);
  const scoop = new T.Mesh(
    new T.LatheGeometry(
      [
        [0.05, 0.43],
        [0.42, 0.43],
        [0.48, 0.52],
        [0.47, 0.63],
        [0.36, 0.71],
        [0.39, 0.78],
        [0.34, 0.88],
        [0.24, 0.96],
        [0.26, 1.04],
        [0.19, 1.14],
        [0.09, 1.24],
        [0, 1.31],
      ].map(([r, y]) => new T.Vector2(r, y)),
      96,
    ),
    k.accent,
  );
  sign.add(scoop);
  const swirl = Array.from({ length: 81 }, (_, i) => {
    const t = i / 80;
    const angle = t * Math.PI * 5;
    const r = 0.49 * (1 - t * 0.84);
    return new T.Vector3(
      r * Math.cos(angle),
      0.54 + t * 0.68,
      r * Math.sin(angle),
    );
  });
  sign.add(
    new T.Mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(swirl), 112, 0.055, 14, false),
      cream,
    ),
  );
  sign.traverse((o) => {
    if (o instanceof T.Mesh) o.castShadow = o.receiveShadow = true;
  });
  k.panel("roof", [0.27, 0.31, 0.18], [0, 2.25, -0.61], k.dark);
  k.panel("roof", [0.27, 0.39, 0.18], [0, 2.29, -0.1], k.dark);
  return k.root;
}

function stripe(
  k: ConceptVehicleKit,
  part: "hood" | "roof",
  center: XYZ,
  radius: XYZ,
  start: number,
  end: number,
) {
  for (const side of SIDES) {
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= 32; i++) {
      const angle = start + (end - start) * (i / 32);
      for (const x of [side * 0.16 - 0.06, side * 0.16 + 0.06]) {
        const ring = Math.sqrt(1 - (x / radius[0]) ** 2);
        vertices.push(
          x,
          center[1] + (radius[1] * ring + 0.012) * Math.cos(angle),
          center[2] + (radius[2] * ring + 0.012) * Math.sin(angle),
        );
      }
      if (i > 0) {
        const p = (i - 1) * 2;
        indices.push(p, p + 2, p + 1, p + 1, p + 2, p + 3);
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    k.mesh(part, geometry, [0, 0, 0], k.accent);
  }
}

/** Put both the trim and the pane directly on the curved shell. */
function curvedWindow(
  k: ConceptVehicleKit,
  center: XYZ,
  radius: XYZ,
  face: "side" | "end",
  sign: number,
  [bottom, top, bottomMin, bottomMax, topMin, topMax]: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
  ],
) {
  const across = face === "end" ? 0 : 2;
  const depth = face === "end" ? 2 : 0;
  const lerp = T.MathUtils.lerp;
  for (const [material, inset, lift] of [
    [k.dark, 0, 0.013],
    [k.glass, 0.039, 0.021],
  ] as const) {
    const pane = new ParametricGeometry(
      (u, v, p) => {
        if ((face === "end" ? sign : -sign) < 0) u = 1 - u;
        const y = lerp(bottom + inset, top - inset, v);
        const row = (y - bottom) / (top - bottom);
        const h = lerp(
          lerp(bottomMin, topMin, row) + inset,
          lerp(bottomMax, topMax, row) - inset,
          u,
        );
        const length = Math.sqrt(
          Math.max(
            0,
            1 -
              ((y - center[1]) / radius[1]) ** 2 -
              ((h - center[across]) / radius[across]) ** 2,
          ),
        );
        p.y = y;
        p.setComponent(across, h);
        p.setComponent(
          depth,
          center[depth] + sign * (radius[depth] * length + lift),
        );
      },
      24,
      18,
    );
    k.mesh("roof", pane, [0, 0, 0], material);
  }
}

function bajaBeetle() {
  const k = new ConceptVehicleKit("baja-beetle", {
    paint: 0x315dcc,
    accent: 0xf8eac6,
    rim: 0x4b5056,
    tireWidth: 0.89,
    spokes: 8,
  });
  const hood: XYZ = [0, 0.21, 1.49];
  const hoodRadius: XYZ = [1.2, 0.61, 1.12];
  const canopy: XYZ = [0, 0.48, -0.33];
  const canopyRadius: XYZ = [1.23, 1.38, 1.7];
  k.oval("hood", hoodRadius, hood);
  k.oval("roof", canopyRadius, canopy);
  stripe(k, "hood", hood, hoodRadius, 0.01, 1.76);
  stripe(k, "roof", canopy, canopyRadius, -0.76, 0.54);
  curvedWindow(
    k,
    canopy,
    canopyRadius,
    "end",
    1,
    [0.89, 1.55, -0.76, 0.76, -0.56, 0.56],
  );
  curvedWindow(
    k,
    canopy,
    canopyRadius,
    "end",
    -1,
    [0.91, 1.47, -0.65, 0.65, -0.51, 0.51],
  );
  k.panel("bed", [1.49, 0.47, 0.95], [0, 0.14, -2.03], k.dark, 0.1);
  k.bar("bed", [0, 0.21, -2.5], [0, 0.21, -2.67], 0.28, k.steel);
  for (const side of SIDES) {
    const door = side < 0 ? doors[0] : doors[1];
    k.oval(door, [0.19, 0.56, 1.23], [side * 1.11, 0.34, -0.32]);
    curvedWindow(
      k,
      canopy,
      canopyRadius,
      "side",
      side,
      [0.9, 1.41, -1.49, -0.73, -1.24, -0.73],
    );
    curvedWindow(
      k,
      canopy,
      canopyRadius,
      "side",
      side,
      [0.9, 1.47, -0.61, 0.74, -0.61, 0.26],
    );
    k.panel(
      door,
      [0.077, 0.066, 0.26],
      [side * 1.314, 0.58, -0.63],
      k.steel,
      0.017,
    );
    k.arch("chassis-front", side, 1.65);
    k.arch("chassis-rear", side, -1.65);
    k.oval("hood", [0.31, 0.27, 0.48], [side * 0.94, 0.38, 2.05]);
    k.lamp("hood", [side * 0.96, 0.47, 2.43], 0.177);
    k.tube(
      "bed",
      [
        [side * 0.46, 0.16, -2.22],
        [side * 0.82, -0.05, -2.42],
        [side * 0.76, -0.19, -2.73],
        [side * 0.59, -0.18, -2.94],
      ],
      0.061,
      k.steel,
    );
  }
  k.tube(
    "bumper-front",
    [
      [-1.34, 0.03, 2.5],
      [-1.12, 0.04, 2.79],
      [0, 0.04, 2.83],
      [1.12, 0.04, 2.79],
      [1.34, 0.03, 2.5],
    ],
    0.083,
  );
  k.tube(
    "bumper-rear",
    [
      [-1.26, 0.04, -2.52],
      [-1.0, 0.04, -2.78],
      [0, 0.04, -2.89],
      [1.0, 0.04, -2.78],
      [1.26, 0.04, -2.52],
    ],
    0.077,
  );
  k.tailLights(-2.73, 0.35);
  return k.root;
}

export const CONCEPT_VEHICLES = [
  {
    id: "dune-buggy",
    name: "Dune Buggy",
    blurb: "Open tube cage, rally lamps and exposed long-travel shocks.",
    build: duneBuggy,
  },
  {
    id: "rally-hatch",
    name: "Rally Hatch",
    blurb: "Box flares, white rally rims and a high rear wing.",
    build: rallyHatch,
  },
  {
    id: "racing-semi",
    name: "Racing Semi",
    blurb:
      "Red-and-ivory cab-over with twin stacks and an exposed fifth wheel.",
    build: racingSemi,
  },
  {
    id: "armored-scout",
    name: "Armored Scout",
    blurb: "Faceted armor, split windshield and orange recovery shackles.",
    build: armoredScout,
  },
  {
    id: "ice-cream-van",
    name: "Ice Cream Van",
    blurb:
      "Mint bodywork, a metal serving shutter and a roof-mounted swirl cone.",
    build: iceCreamVan,
  },
  {
    id: "baja-beetle",
    name: "Baja Beetle",
    blurb: "Rounded blue bodywork, cream racing stripes and exposed exhaust.",
    build: bajaBeetle,
  },
] as const;
