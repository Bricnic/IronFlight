import * as T from "three";
import type { PartId } from "./damage";
import { ConceptVehicleKit, finish, type XYZ } from "./concept-vehicle-kit";

export const sides = [-1, 1] as const;
export const door = (side: number) => (side < 0 ? "door-right" : "door-left");
type Hull = Parameters<ConceptVehicleKit["hull"]>[1];

export function shell(
  k: ConceptVehicleKit,
  hood: Hull,
  rear: Hull,
  flank: T.Material = k.paint,
) {
  k.hull("hood", hood);
  k.hull("bed", rear);
  for (const side of sides) {
    k.profile(
      door(side),
      [
        [-1.46, -0.17],
        [1.14, -0.17],
        [0.95, 0.48],
        [-1.38, 0.57],
      ],
      0.14,
      side * 1.13,
      flank,
      0.04,
    );
  }
}

export function fenders(
  k: ConceptVehicleKit,
  material: T.Material = k.paint,
  faceted = false,
) {
  for (const side of sides) {
    k.arch("chassis-front", side, 1.65, material, faceted);
    k.arch("chassis-rear", side, -1.65, material, faceted);
  }
}

export function bumpers(
  k: ConceptVehicleKit,
  material: T.Material = k.dark,
  lights = true,
) {
  k.panel(
    "bumper-front",
    [2.55, 0.24, 0.34],
    [0, -0.11, 2.63],
    material,
    0.085,
  );
  k.panel("bumper-rear", [2.46, 0.23, 0.3], [0, -0.09, -2.65], material, 0.078);
  if (lights)
    for (const side of sides)
      k.lamp("bumper-front", [side * 0.87, 0.27, 2.69], 0.156);
  k.tailLights(-2.79, 0.16);
}

export function cabin(
  k: ConceptVehicleKit,
  {
    front,
    back,
    height,
    width,
    slant,
  }: {
    front: number;
    back: number;
    height: number;
    width: number;
    slant: number;
  },
  roof: T.Material = k.paint,
) {
  const base = 0.53;
  const peakFront = front - slant;
  const peakBack = back + slant * 0.72;
  const rise = height - base;
  k.hull("roof", [
    [back, base - 0.08, base + 0.07, width, width],
    [peakBack, base - 0.08, height, width, width],
    [peakFront, base - 0.08, height, width, width],
    [front, base - 0.08, base + 0.02, width, width],
  ]);
  k.panel(
    "roof",
    [width * 2 + 0.08, 0.15, peakFront - peakBack + 0.04],
    [0, height, (peakFront + peakBack) / 2],
    roof,
    0.07,
  );
  const tilt = Math.atan2(-slant, rise);
  const paneLength = Math.hypot(slant, rise);
  for (const side of sides) {
    const x = side * width * 0.49;
    k.panel(
      "roof",
      [width * 0.88, paneLength * 0.86, 0.065],
      [x, base + rise * 0.49, (front + peakFront) / 2 + 0.04],
      k.dark,
      0.03,
    ).rotation.x = tilt;
    k.panel(
      "roof",
      [width * 0.79, paneLength * 0.77, 0.044],
      [x, base + rise * 0.49, (front + peakFront) / 2 + 0.083],
      k.glass,
      0.025,
    ).rotation.x = tilt;
    k.profile(
      "roof",
      [
        [back + 0.13, base + 0.12],
        [peakBack + 0.12, height - 0.11],
        [peakFront - 0.07, height - 0.11],
        [front - 0.18, base + 0.12],
      ],
      0.04,
      side * (width + 0.025),
      k.glass,
      0.027,
    );
    k.panel(
      door(side),
      [0.08, 0.067, 0.27],
      [side * 1.24, 0.4, back + 0.38],
      k.steel,
      0.022,
    );
  }
}

export function bubble(k: ConceptVehicleKit, center: XYZ, radii: XYZ) {
  k.oval("roof", radii, center, k.glass);
  k.oval(
    "roof",
    [radii[0] + 0.045, radii[1] * 0.19, radii[2] + 0.06],
    [center[0], center[1] - 0.095, center[2]],
    k.dark,
  );
}

export function openSeat(
  k: ConceptVehicleKit,
  x = 0,
  z = -0.42,
  material: T.Material = k.dark,
) {
  k.panel("chassis-front", [0.56, 0.19, 0.69], [x, 0.31, z], material, 0.085);
  k.panel(
    "chassis-front",
    [0.54, 0.78, 0.17],
    [x, 0.68, z - 0.29],
    material,
    0.075,
  ).rotation.x = -0.2;
  k.bar(
    "chassis-front",
    [x, 0.43, z + 0.68],
    [x, 0.7, z + 0.36],
    0.048,
    k.steel,
  );
  k.mesh(
    "chassis-front",
    new T.TorusGeometry(0.16, 0.026, 12, 48),
    [x, 0.72, z + 0.36],
    k.dark,
  ).rotation.x = -0.43;
}

export function canopy(
  k: ConceptVehicleKit,
  z: number,
  width: number,
  length: number,
  height: number,
  roof: T.Material,
) {
  const front = z + length / 2;
  const rear = z - length / 2;
  for (const side of sides) {
    const x = (side * width) / 2;
    k.bar("roof", [x, 0.39, front + 0.14], [x, height, front], 0.054);
    k.bar("roof", [x, 0.35, rear - 0.17], [x, height, rear], 0.054);
    k.bar("roof", [x, height, front], [x, height, rear], 0.056);
  }
  k.panel(
    "roof",
    [width + 0.14, 0.13, length + 0.12],
    [0, height + 0.04, z],
    roof,
    0.061,
  );
}

export function sideStripe(
  k: ConceptVehicleKit,
  y: number,
  length: number,
  material: T.Material = k.accent,
) {
  for (const side of sides)
    k.panel(
      door(side),
      [0.055, 0.092, length],
      [side * 1.223, y, -0.14],
      material,
      0.021,
    );
}

export function crate(
  k: ConceptVehicleKit,
  at: XYZ,
  size: XYZ,
  color: T.Material,
  straps: T.Material,
) {
  const [x, y, z] = at;
  const [w, h, d] = size;
  k.panel("bed", size, at, color, 0.045);
  k.panel("bed", [w + 0.024, 0.066, 0.16], [x, y + h / 2, z], straps, 0.018);
  k.panel(
    "bed",
    [0.16, 0.065, d + 0.024],
    [x, y + h / 2 + 0.009, z],
    straps,
    0.018,
  );
  k.panel("bed", [0.16, h, 0.033], [x, y, z - d / 2 - 0.01], straps, 0.01);
}

export function stack(
  k: ConceptVehicleKit,
  part: PartId,
  x: number,
  z: number,
  top: number,
  material: T.Material = k.steel,
) {
  k.tube(
    part,
    [
      [x, 0.04, z],
      [x, top - 0.38, z],
      [x, top - 0.13, z],
      [x, top, z - 0.17],
    ],
    0.095,
    material,
  );
  k.bar(part, [x, 0.32, z], [x, top - 0.46, z], 0.12, k.dark);
}

export function glow(color: number) {
  return new T.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.72,
    roughness: 0.38,
  });
}

export const cream = () => finish(0xffedc9, 0.44, 0.15);
export const gold = () => finish(0xd1a44e, 0.36, 0.67);
