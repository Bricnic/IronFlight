import * as T from "three";
import type { CandyLethalKind } from "./custom-level";
import { CANDY_PRESS } from "./dungeon-hazards";

export type CandyLethalMode = "slide" | "jaw" | "stamp" | "shear";

/** Animation family per trap; the view drives pivots from snapOpenness. */
export function candyLethalMode(kind: CandyLethalKind): CandyLethalMode {
  switch (kind) {
    case "jawbreaker-crusher":
    case "gummy-vice":
      return "slide";
    case "candy-snap-jaws":
    case "sugar-chomper":
      return "jaw";
    case "peppermint-slammer":
    case "caramel-crusher":
      return "stamp";
    default:
      return "shear";
  }
}

const mat = (color: number, roughness = 0.5, extra: T.MeshStandardMaterialParameters = {}) =>
  new T.MeshStandardMaterial({ color, roughness, metalness: 0.05, ...extra });

function mesh(
  parent: T.Object3D,
  geometry: T.BufferGeometry,
  material: T.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new T.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Strike balls rest clear of the lane and crush together at car-body height. */
const SLIDE_SHUT = 2.8;
const SLIDE_TRAVEL = 4.2;
/** Stamp plate bottom: parked high, slammed down onto the car body. */
const STAMP_SHUT = 1.0;
const STAMP_TRAVEL = 7;

export function poseCandyLethal(kind: CandyLethalKind, pivots: T.Group[], open: number) {
  const mode = candyLethalMode(kind);
  if (mode === "slide" && pivots.length >= 2) {
    pivots[0].position.x = -(SLIDE_SHUT + open * SLIDE_TRAVEL);
    pivots[1].position.x = SLIDE_SHUT + open * SLIDE_TRAVEL;
  } else if (mode === "jaw" && pivots.length >= 1) {
    pivots[0].rotation.x = (1 - open) * 0.95;
  } else if (mode === "stamp" && pivots.length >= 1) {
    pivots[0].position.y = STAMP_SHUT + open * STAMP_TRAVEL;
  } else if (mode === "shear" && pivots.length >= 2) {
    pivots[0].rotation.z = -(0.05 + open * 0.55);
    pivots[1].rotation.z = 0.05 + open * 0.55;
  }
}

/** Striped jawbreaker spheres on candy-cane pistons; housings stay solid. */
function buildJawbreaker(root: T.Group): T.Group[] {
  const red = mat(0xd42a2a, 0.35);
  const white = mat(0xf6f2ea, 0.35);
  const steel = mat(0x8a93a0, 0.4, { metalness: 0.6 });
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(2.6, 0.6, 2.6), steel, side * CANDY_PRESS.postX, 0.3, 0);
    mesh(
      root,
      new T.CylinderGeometry(1.1, 1.3, CANDY_PRESS.postH, 16),
      side < 0 ? red : white,
      side * CANDY_PRESS.postX,
      CANDY_PRESS.postH / 2,
      0,
    );
    for (let i = 0; i < 4; i++)
      mesh(
        root,
        new T.TorusGeometry(1.25, 0.18, 10, 20),
        i % 2 ? white : red,
        side * CANDY_PRESS.postX,
        2 + i * 1.8,
        0,
      ).rotation.x = Math.PI / 2;
  }
  const pivots: T.Group[] = [];
  for (const side of [-1, 1]) {
    const pivot = new T.Group();
    pivot.position.set(side * (SLIDE_SHUT + SLIDE_TRAVEL), 0, 0);
    const ball = side < 0 ? mat(0xff6fa5, 0.25) : mat(0x3fa7ff, 0.25);
    mesh(pivot, new T.SphereGeometry(2.4, 24, 18), ball, 0, 2.2, 0);
    for (let i = 0; i < 3; i++) {
      const band = mesh(pivot, new T.TorusGeometry(2.25, 0.28, 10, 28), white, 0, 2.2, 0);
      band.rotation.y = Math.PI / 2;
      band.rotation.x = -0.5 + i * 0.5;
    }
    const rod = mesh(pivot, new T.CylinderGeometry(0.5, 0.5, 3.4, 12), steel, side * 3.4, 2.2, 0);
    rod.rotation.z = Math.PI / 2;
    mesh(pivot, new T.CylinderGeometry(0.8, 0.8, 0.6, 12), red, side * 1.9, 2.2, 0).rotation.z =
      Math.PI / 2;
    root.add(pivot);
    pivots.push(pivot);
  }
  return pivots;
}

/** Static lower dentures; the upper jaw slams down from a rear hinge. */
function buildSnapJaws(root: T.Group, gumColor: number, teethColor: number): T.Group[] {
  const gum = mat(gumColor, 0.4);
  const teeth = mat(teethColor, 0.25);
  const steel = mat(0x8a5a2b, 0.7);
  mesh(root, new T.BoxGeometry(7, 1.2, 8), gum, 0, 0.6, 0);
  for (let i = 0; i < 8; i++) {
    const x = -3.1 + i * 0.9;
    mesh(root, new T.ConeGeometry(0.42, 1.1, 4), teeth, x, 1.6, 3.2);
    mesh(root, new T.ConeGeometry(0.42, 1.1, 4), teeth, x, 1.6, -3.2);
  }
  for (const side of [-1, 1]) {
    const gear = mesh(root, new T.CylinderGeometry(1.1, 1.1, 0.7, 12), steel, side * 4.2, 1.2, -3.4);
    gear.rotation.z = Math.PI / 2;
  }
  const pivot = new T.Group();
  pivot.position.set(0, 4.6, -3.6);
  mesh(pivot, new T.BoxGeometry(7, 1.2, 8), gum, 0, 0, 3.6);
  for (let i = 0; i < 8; i++) {
    const x = -3.1 + i * 0.9;
    const fang = mesh(pivot, new T.ConeGeometry(0.45, 1.4, 4), teeth, x, -1.1, 6.4);
    fang.rotation.x = Math.PI;
    const molar = mesh(pivot, new T.ConeGeometry(0.45, 1.2, 4), teeth, x, -1.0, 1.2);
    molar.rotation.x = Math.PI;
  }
  const spring = mesh(pivot, new T.CylinderGeometry(0.4, 0.4, 7.4, 10), steel, 0, 0.4, 0.4);
  spring.rotation.z = Math.PI / 2;
  root.add(pivot);
  return [pivot];
}

/** Translucent gummy paws squeezing from both sides at car-body height. */
function buildGummyVice(root: T.Group): T.Group[] {
  const steel = mat(0x6b4423, 0.7);
  mesh(root, new T.BoxGeometry(15, 0.5, 6), mat(0xd9a7c7, 0.6), 0, 0.25, 0);
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(2.4, 3, 5), steel, side * 7.6, 1.5, 0);
    const gear = mesh(root, new T.CylinderGeometry(1, 1, 0.6, 12), mat(0xe8b4d0, 0.5), side * 7.6, 3.4, 0);
    gear.rotation.x = Math.PI / 2;
  }
  const flavors = [0x5fd35f, 0xff8c2e];
  const pivots: T.Group[] = [];
  for (let s = 0; s < 2; s++) {
    const side = s === 0 ? -1 : 1;
    const pivot = new T.Group();
    pivot.position.set(side * (SLIDE_SHUT + SLIDE_TRAVEL), 0, 0);
    const jelly = mat(flavors[s], 0.15, { transparent: true, opacity: 0.88 });
    const pad = mesh(pivot, new T.SphereGeometry(2.1, 20, 14), jelly, 0, 2.2, 0);
    pad.scale.set(0.75, 1, 1);
    for (let i = 0; i < 4; i++) {
      const a = -0.6 + i * 0.4;
      mesh(pivot, new T.SphereGeometry(0.62, 14, 10), jelly, side * 1.1, 2.2 + Math.sin(a) * 1.9, Math.cos(a) * 1.9 - 0.4);
    }
    mesh(pivot, new T.SphereGeometry(0.7, 14, 10), jelly, side * 1.4, 1.2, 0);
    root.add(pivot);
    pivots.push(pivot);
  }
  return pivots;
}

/** Gantry posts plus beam; the peppermint stamp drops between them. */
function buildSlammer(root: T.Group, discColor: number, swirlColor: number): T.Group[] {
  const red = mat(0xd42a2a, 0.4);
  const white = mat(0xf6f2ea, 0.4);
  const steel = mat(0x7fb3c8, 0.45, { metalness: 0.4 });
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(2.6, 0.6, 2.6), steel, side * CANDY_PRESS.postX, 0.3, 0);
    for (let i = 0; i < 6; i++)
      mesh(
        root,
        new T.CylinderGeometry(0.9, 0.9, 1.45, 16),
        i % 2 ? white : red,
        side * CANDY_PRESS.postX,
        1.3 + i * 1.45,
        0,
      );
  }
  mesh(root, new T.BoxGeometry(CANDY_PRESS.postX * 2 + 3, 1.4, 2.4), steel, 0, 10.2, 0);
  for (const side of [-1, 1])
    mesh(root, new T.CylinderGeometry(0.14, 0.14, 2.2, 8), steel, side * 2.2, 8.6, 0);
  const pivot = new T.Group();
  pivot.position.set(0, STAMP_SHUT + STAMP_TRAVEL, 0);
  const disc = mesh(pivot, new T.CylinderGeometry(3.4, 3.4, 1.2, 28), mat(discColor, 0.3), 0, 0.6, 0);
  disc.receiveShadow = true;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    mesh(pivot, new T.SphereGeometry(0.7, 12, 8), mat(swirlColor, 0.3), Math.cos(a) * 2, 0.1, Math.sin(a) * 2);
  }
  const rim = mesh(pivot, new T.TorusGeometry(3.4, 0.3, 10, 32), steel, 0, 0.6, 0);
  rim.rotation.x = Math.PI / 2;
  mesh(pivot, new T.CylinderGeometry(0.5, 0.5, 2.4, 12), steel, 0, 2.4, 0);
  root.add(pivot);
  return [pivot];
}

/** Two stretched-candy blades scissoring shut across the lane at hood height. */
function buildShear(root: T.Group, bladeColor: number, twistColor: number): T.Group[] {
  const steel = mat(0x6b4423, 0.7);
  mesh(root, new T.BoxGeometry(3, 1, 3), steel, 0, 0.5, 0);
  mesh(root, new T.CylinderGeometry(0.5, 0.7, 2.2, 12), steel, 0, 1.6, 0);
  for (const side of [-1, 1])
    mesh(root, new T.SphereGeometry(0.8, 14, 10), mat(twistColor, 0.4), side * 2.6, 0.8, 2.2);
  const pivots: T.Group[] = [];
  for (let s = 0; s < 2; s++) {
    const side = s === 0 ? -1 : 1;
    const pivot = new T.Group();
    pivot.position.set(0, 2.2, s === 0 ? -0.5 : 0.5);
    const blade = mat(bladeColor, 0.35);
    const bar = mesh(pivot, new T.BoxGeometry(7.5, 0.9, 0.9), blade, side * 4.4, 0, 0);
    bar.castShadow = true;
    for (let i = 0; i < 5; i++)
      mesh(pivot, new T.TorusGeometry(0.62, 0.2, 8, 14), mat(twistColor, 0.35), side * (1.6 + i * 1.3), 0, 0).rotation.y =
        Math.PI / 2;
    const tip = mesh(pivot, new T.ConeGeometry(0.55, 1.4, 4), blade, side * 8.6, 0, 0);
    tip.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    const loop = mesh(pivot, new T.TorusGeometry(0.9, 0.28, 8, 18), blade, side * 0.4, 1.2, 0);
    loop.rotation.y = Math.PI / 2;
    root.add(pivot);
    pivots.push(pivot);
  }
  const bolt = mesh(root, new T.CylinderGeometry(0.8, 0.8, 2.2, 16), mat(0xf6f2ea, 0.35), 0, 2.2, 0);
  bolt.rotation.x = Math.PI / 2;
  return pivots;
}

/** Chocolate press gantry; the caramel apple plate slams onto the car body. */
function buildCaramel(root: T.Group): T.Group[] {
  const chocolate = mat(0x5a3218, 0.6);
  const caramel = mat(0xd98a2b, 0.3);
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(2.8, 0.6, 2.8), chocolate, side * CANDY_PRESS.postX, 0.3, 0);
    mesh(root, new T.BoxGeometry(1.8, CANDY_PRESS.postH, 1.8), chocolate, side * CANDY_PRESS.postX, CANDY_PRESS.postH / 2, 0);
    for (let row = 0; row < 3; row++)
      mesh(root, new T.BoxGeometry(2, 0.5, 2), mat(0x6b3d1f, 0.55), side * CANDY_PRESS.postX, 2 + row * 2.4, 0);
  }
  mesh(root, new T.BoxGeometry(CANDY_PRESS.postX * 2 + 3, 1.6, 2.6), chocolate, 0, 10.1, 0);
  for (let i = 0; i < 4; i++)
    mesh(root, new T.ConeGeometry(0.3, 0.9, 8), caramel, -4.5 + i * 3, 9.0, 1.4).rotation.x = Math.PI;
  const pivot = new T.Group();
  pivot.position.set(0, STAMP_SHUT + STAMP_TRAVEL, 0);
  mesh(pivot, new T.CylinderGeometry(3.2, 3.2, 1.0, 28), caramel, 0, 0.5, 0);
  mesh(pivot, new T.SphereGeometry(2.2, 20, 14), caramel, 0, 1.6, 0).scale.set(1, 0.7, 1);
  mesh(pivot, new T.CylinderGeometry(0.16, 0.16, 1.2, 8), chocolate, 0, 3.2, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const drip = mesh(pivot, new T.ConeGeometry(0.28, 1.1, 8), caramel, Math.cos(a) * 3.1, 0.1, Math.sin(a) * 3.1);
    drip.rotation.x = Math.PI;
  }
  mesh(pivot, new T.CylinderGeometry(0.6, 0.6, 2.6, 12), chocolate, 0, 3.4, 0);
  root.add(pivot);
  return [pivot];
}

/** Animated lethal models; the caller poses pivots from the snap cycle. */
export function buildCandyLethal(root: T.Group, kind: CandyLethalKind): T.Group[] {
  let pivots: T.Group[];
  switch (kind) {
    case "jawbreaker-crusher":
      pivots = buildJawbreaker(root);
      break;
    case "candy-snap-jaws":
      pivots = buildSnapJaws(root, 0xff6fa5, 0xf6f2ea);
      break;
    case "gummy-vice":
      pivots = buildGummyVice(root);
      break;
    case "peppermint-slammer":
      pivots = buildSlammer(root, 0xd42a2a, 0xf6f2ea);
      break;
    case "taffy-snapper":
      pivots = buildShear(root, 0xff9ec7, 0xf6f2ea);
      break;
    case "licorice-shears":
      pivots = buildShear(root, 0x1d1a22, 0xc23b2e);
      break;
    case "sugar-chomper":
      pivots = buildSnapJaws(root, 0xb98ae0, 0xeaf6ff);
      break;
    case "caramel-crusher":
      pivots = buildCaramel(root);
      break;
  }
  poseCandyLethal(kind, pivots, 1);
  return pivots;
}
