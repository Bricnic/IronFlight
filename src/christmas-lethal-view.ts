import * as T from "three";
import type { ChristmasLethalKind } from "./custom-level";
import { CHRISTMAS_PRESS } from "./dungeon-hazards";

export type ChristmasLethalMode = "slide" | "jaw" | "stamp" | "shear";

/** Animation family per trap; the view drives pivots from snapOpenness. */
export function christmasLethalMode(kind: ChristmasLethalKind): ChristmasLethalMode {
  switch (kind) {
    case "christmas-nutcracker":
    case "christmas-ice-vice":
      return "slide";
    case "christmas-toy-chomper":
    case "christmas-yeti-jaws":
      return "jaw";
    case "christmas-ornament-slammer":
    case "christmas-sleigh-crusher":
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

/** Strike blocks rest clear of the lane and crush together at car-body height. */
const SLIDE_SHUT = 2.8;
const SLIDE_TRAVEL = 4.2;
/** Stamp plate bottom: parked high, slammed down onto the car body. */
const STAMP_SHUT = 1.0;
const STAMP_TRAVEL = 7;

export function poseChristmasLethal(kind: ChristmasLethalKind, pivots: T.Group[], open: number) {
  const mode = christmasLethalMode(kind);
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

/** Nutcracker jaw blocks with gold teeth on red pistons; housings stay solid. */
function buildNutcracker(root: T.Group): T.Group[] {
  const red = mat(0xb03a2e, 0.45);
  const gold = mat(0xd8a83a, 0.35, { metalness: 0.5 });
  const dark = mat(0x2a2118, 0.7);
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(2.6, 0.6, 2.6), dark, side * CHRISTMAS_PRESS.postX, 0.3, 0);
    mesh(
      root,
      new T.CylinderGeometry(1.1, 1.3, CHRISTMAS_PRESS.postH, 16),
      red,
      side * CHRISTMAS_PRESS.postX,
      CHRISTMAS_PRESS.postH / 2,
      0,
    );
    for (let i = 0; i < 4; i++)
      mesh(
        root,
        new T.TorusGeometry(1.25, 0.18, 10, 20),
        gold,
        side * CHRISTMAS_PRESS.postX,
        2 + i * 1.8,
        0,
      ).rotation.x = Math.PI / 2;
    mesh(root, new T.CylinderGeometry(0.5, 0.7, 0.8, 12), dark, side * CHRISTMAS_PRESS.postX, CHRISTMAS_PRESS.postH + 0.4, 0);
  }
  const pivots: T.Group[] = [];
  for (const side of [-1, 1]) {
    const pivot = new T.Group();
    pivot.position.set(side * (SLIDE_SHUT + SLIDE_TRAVEL), 0, 0);
    mesh(pivot, new T.BoxGeometry(2.2, 3.6, 4.4), red, 0, 2.2, 0);
    mesh(pivot, new T.BoxGeometry(2.4, 0.5, 4.6), gold, 0, 4.2, 0);
    mesh(pivot, new T.BoxGeometry(2.4, 0.5, 4.6), gold, 0, 0.4, 0);
    for (let i = 0; i < 4; i++) {
      const tooth = mesh(pivot, new T.ConeGeometry(0.42, 1.1, 4), gold, -side * 1.5, 1.4 + i * 0.75, -1.5 + (i % 2) * 3.0);
      tooth.rotation.z = side * Math.PI / 2;
    }
    mesh(pivot, new T.SphereGeometry(0.5, 12, 8), dark, -side * 0.6, 3.4, 1.4);
    mesh(pivot, new T.SphereGeometry(0.5, 12, 8), dark, -side * 0.6, 3.4, -1.4);
    const rod = mesh(pivot, new T.CylinderGeometry(0.5, 0.5, 3.4, 12), dark, side * 2.8, 2.2, 0);
    rod.rotation.z = Math.PI / 2;
    root.add(pivot);
    pivots.push(pivot);
  }
  return pivots;
}

/** Translucent ice walls squeezing from both sides at car-body height. */
function buildIceVice(root: T.Group): T.Group[] {
  const wood = mat(0x6b4423, 0.7);
  mesh(root, new T.BoxGeometry(15, 0.5, 6), mat(0xdfe9f2, 0.7), 0, 0.25, 0);
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(2.4, 3, 5), wood, side * 7.6, 1.5, 0);
    const wheel = mesh(root, new T.TorusGeometry(0.9, 0.25, 10, 18), mat(0x8a5a2b, 0.7), side * 7.6, 3.6, 0);
    wheel.rotation.y = Math.PI / 2;
  }
  const pivots: T.Group[] = [];
  for (let s = 0; s < 2; s++) {
    const side = s === 0 ? -1 : 1;
    const pivot = new T.Group();
    pivot.position.set(side * (SLIDE_SHUT + SLIDE_TRAVEL), 0, 0);
    const ice = mat(0x9ad6ff, 0.15, { transparent: true, opacity: 0.88 });
    const wall = mesh(pivot, new T.BoxGeometry(1.6, 4.4, 5.2), ice, 0, 2.2, 0);
    void wall;
    for (let i = 0; i < 4; i++)
      mesh(pivot, new T.ConeGeometry(0.35, 1.3, 6), ice, -side * 1.1, 1.2 + i * 0.8, -1.8 + (i % 2) * 3.6).rotation.z =
        side * Math.PI / 2;
    mesh(pivot, new T.SphereGeometry(0.5, 12, 8), mat(0xeaf6ff, 0.3), 0, 4.6, 1.8);
    mesh(pivot, new T.SphereGeometry(0.5, 12, 8), mat(0xeaf6ff, 0.3), 0, 4.6, -1.8);
    root.add(pivot);
    pivots.push(pivot);
  }
  return pivots;
}

/** Static lower teeth; the wrapped upper jaw slams down from a rear hinge. */
function buildChomper(root: T.Group, wrapColor: number, trimColor: number, teethColor: number): T.Group[] {
  const wrap = mat(wrapColor, 0.45);
  const trim = mat(trimColor, 0.4);
  const teeth = mat(teethColor, 0.25);
  const brass = mat(0x8a6a2b, 0.5, { metalness: 0.4 });
  mesh(root, new T.BoxGeometry(7, 1.2, 8), wrap, 0, 0.6, 0);
  mesh(root, new T.BoxGeometry(7.2, 0.4, 1.2), trim, 0, 0.6, 0);
  for (let i = 0; i < 8; i++) {
    const x = -3.1 + i * 0.9;
    mesh(root, new T.ConeGeometry(0.42, 1.1, 4), teeth, x, 1.6, 3.2);
    mesh(root, new T.ConeGeometry(0.42, 1.1, 4), teeth, x, 1.6, -3.2);
  }
  for (const side of [-1, 1]) {
    const gear = mesh(root, new T.CylinderGeometry(1.1, 1.1, 0.7, 12), brass, side * 4.2, 1.2, -3.4);
    gear.rotation.z = Math.PI / 2;
    mesh(root, new T.SphereGeometry(0.35, 10, 8), trim, side * 4.2, 2.3, -3.4);
  }
  const pivot = new T.Group();
  pivot.position.set(0, 4.6, -3.6);
  mesh(pivot, new T.BoxGeometry(7, 1.2, 8), wrap, 0, 0, 3.6);
  mesh(pivot, new T.BoxGeometry(7.2, 0.4, 1.2), trim, 0, 0, 3.6);
  for (let i = 0; i < 8; i++) {
    const x = -3.1 + i * 0.9;
    const fang = mesh(pivot, new T.ConeGeometry(0.45, 1.4, 4), teeth, x, -1.1, 6.4);
    fang.rotation.x = Math.PI;
    const molar = mesh(pivot, new T.ConeGeometry(0.45, 1.2, 4), teeth, x, -1.0, 1.2);
    molar.rotation.x = Math.PI;
  }
  const bow = mesh(pivot, new T.TorusGeometry(0.6, 0.24, 8, 14), trim, 0, 0.9, 5.5);
  bow.rotation.x = Math.PI / 2;
  const spring = mesh(pivot, new T.CylinderGeometry(0.4, 0.4, 7.4, 10), brass, 0, 0.4, 0.4);
  spring.rotation.z = Math.PI / 2;
  root.add(pivot);
  return [pivot];
}

/** Peppermint gantry; the giant bauble stamp drops between the posts. */
function buildSlammer(root: T.Group): T.Group[] {
  const red = mat(0xc81f2e, 0.4);
  const white = mat(0xf2f7fb, 0.4);
  const steel = mat(0x7fb3c8, 0.45, { metalness: 0.4 });
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(2.6, 0.6, 2.6), steel, side * CHRISTMAS_PRESS.postX, 0.3, 0);
    for (let i = 0; i < 6; i++)
      mesh(
        root,
        new T.CylinderGeometry(0.9, 0.9, 1.45, 16),
        i % 2 ? white : red,
        side * CHRISTMAS_PRESS.postX,
        1.3 + i * 1.45,
        0,
      );
  }
  mesh(root, new T.BoxGeometry(CHRISTMAS_PRESS.postX * 2 + 3, 1.4, 2.4), steel, 0, 10.2, 0);
  for (const side of [-1, 1])
    mesh(root, new T.CylinderGeometry(0.14, 0.14, 2.2, 8), steel, side * 2.2, 8.6, 0);
  const pivot = new T.Group();
  pivot.position.set(0, STAMP_SHUT + STAMP_TRAVEL, 0);
  mesh(pivot, new T.SphereGeometry(3.0, 26, 18), mat(0xc81f2e, 0.25), 0, 2.6, 0);
  mesh(pivot, new T.CylinderGeometry(2.6, 3.0, 1.2, 26), mat(0xc81f2e, 0.25), 0, 0.6, 0);
  mesh(pivot, new T.CylinderGeometry(0.7, 0.9, 0.8, 12), mat(0xd8a83a, 0.35, { metalness: 0.5 }), 0, 5.9, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    mesh(pivot, new T.SphereGeometry(0.5, 10, 8), mat(0xf2f7fb, 0.3), Math.cos(a) * 2.7, 2.6, Math.sin(a) * 2.7);
  }
  const rim = mesh(pivot, new T.TorusGeometry(2.9, 0.3, 10, 32), steel, 0, 0.6, 0);
  rim.rotation.x = Math.PI / 2;
  mesh(pivot, new T.CylinderGeometry(0.5, 0.5, 2.4, 12), steel, 0, 7.0, 0);
  root.add(pivot);
  return [pivot];
}

/** Timber gantry with garlands; the red sleigh slams onto the car body. */
function buildSleigh(root: T.Group): T.Group[] {
  const timber = mat(0x7a5230, 0.75);
  const red = mat(0xb03a2e, 0.5);
  const green = mat(0x1f6b3a, 0.7);
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(2.8, 0.6, 2.8), timber, side * CHRISTMAS_PRESS.postX, 0.3, 0);
    mesh(root, new T.BoxGeometry(1.8, CHRISTMAS_PRESS.postH, 1.8), timber, side * CHRISTMAS_PRESS.postX, CHRISTMAS_PRESS.postH / 2, 0);
    for (let row = 0; row < 3; row++) {
      mesh(root, new T.TorusGeometry(0.9, 0.3, 8, 14), green, side * CHRISTMAS_PRESS.postX, 2 + row * 2.4, 0).rotation.x =
        Math.PI / 2;
      mesh(root, new T.SphereGeometry(0.2, 8, 6), red, side * CHRISTMAS_PRESS.postX + 0.9, 2 + row * 2.4, 0);
    }
  }
  mesh(root, new T.BoxGeometry(CHRISTMAS_PRESS.postX * 2 + 3, 1.6, 2.6), timber, 0, 10.1, 0);
  for (let i = 0; i < 4; i++) {
    const a = -4.5 + i * 3;
    mesh(root, new T.SphereGeometry(0.45, 10, 8), green, a, 9.0, 1.4);
    mesh(root, new T.SphereGeometry(0.18, 8, 6), red, a, 8.6, 1.4);
  }
  const pivot = new T.Group();
  pivot.position.set(0, STAMP_SHUT + STAMP_TRAVEL, 0);
  mesh(pivot, new T.BoxGeometry(6.4, 1.0, 4.2), red, 0, 0.5, 0);
  mesh(pivot, new T.BoxGeometry(5.6, 0.9, 3.4), mat(0x8a2a22, 0.5), 0, 1.4, 0);
  for (const side of [-1, 1]) {
    const runner = mesh(pivot, new T.TorusGeometry(1.6, 0.28, 8, 20, Math.PI), mat(0xd8a83a, 0.35, { metalness: 0.5 }), side * 2.4, 1.0, 0);
    runner.rotation.y = Math.PI / 2;
    mesh(pivot, new T.BoxGeometry(0.3, 1.2, 0.3), mat(0xd8a83a, 0.35, { metalness: 0.5 }), side * 2.4, 0.4, 1.2);
    mesh(pivot, new T.BoxGeometry(0.3, 1.2, 0.3), mat(0xd8a83a, 0.35, { metalness: 0.5 }), side * 2.4, 0.4, -1.2);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    mesh(pivot, new T.SphereGeometry(0.35, 10, 8), green, Math.cos(a) * 2.6, 1.0, Math.sin(a) * 1.8);
  }
  mesh(pivot, new T.CylinderGeometry(0.6, 0.6, 2.6, 12), timber, 0, 3.0, 0);
  root.add(pivot);
  return [pivot];
}

/** Two frosty blades scissoring shut across the lane at hood height. */
function buildShear(root: T.Group, bladeColor: number, trimColor: number, pivotColor: number): T.Group[] {
  const steel = mat(0x3a3f45, 0.6, { metalness: 0.4 });
  mesh(root, new T.BoxGeometry(3, 1, 3), steel, 0, 0.5, 0);
  mesh(root, new T.CylinderGeometry(0.5, 0.7, 2.2, 12), steel, 0, 1.6, 0);
  for (const side of [-1, 1])
    mesh(root, new T.SphereGeometry(0.8, 14, 10), mat(trimColor, 0.4), side * 2.6, 0.8, 2.2);
  const pivots: T.Group[] = [];
  for (let s = 0; s < 2; s++) {
    const side = s === 0 ? -1 : 1;
    const pivot = new T.Group();
    pivot.position.set(0, 2.2, s === 0 ? -0.5 : 0.5);
    const blade = mat(bladeColor, 0.3);
    const bar = mesh(pivot, new T.BoxGeometry(7.5, 0.9, 0.9), blade, side * 4.4, 0, 0);
    bar.castShadow = true;
    for (let i = 0; i < 5; i++)
      mesh(pivot, new T.ConeGeometry(0.4, 1.1, 6), mat(trimColor, 0.3), side * (1.6 + i * 1.3), -0.7, 0).rotation.x =
        Math.PI;
    const tip = mesh(pivot, new T.ConeGeometry(0.55, 1.4, 4), blade, side * 8.6, 0, 0);
    tip.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    const loop = mesh(pivot, new T.TorusGeometry(0.9, 0.28, 8, 18), blade, side * 0.4, 1.2, 0);
    loop.rotation.y = Math.PI / 2;
    root.add(pivot);
    pivots.push(pivot);
  }
  const bolt = mesh(root, new T.CylinderGeometry(0.8, 0.8, 2.2, 16), mat(pivotColor, 0.35), 0, 2.2, 0);
  bolt.rotation.x = Math.PI / 2;
  return pivots;
}

/** Animated lethal models; the caller poses pivots from the snap cycle. */
export function buildChristmasLethal(root: T.Group, kind: ChristmasLethalKind): T.Group[] {
  let pivots: T.Group[];
  switch (kind) {
    case "christmas-nutcracker":
      pivots = buildNutcracker(root);
      break;
    case "christmas-ice-vice":
      pivots = buildIceVice(root);
      break;
    case "christmas-toy-chomper":
      pivots = buildChomper(root, 0x1f6b3a, 0xd8a83a, 0xf2f7fb);
      break;
    case "christmas-yeti-jaws":
      pivots = buildChomper(root, 0xe8eef4, 0x9ad6ff, 0xbfe3ff);
      break;
    case "christmas-ornament-slammer":
      pivots = buildSlammer(root);
      break;
    case "christmas-sleigh-crusher":
      pivots = buildSleigh(root);
      break;
    case "christmas-icicle-shears":
      pivots = buildShear(root, 0x9ad6ff, 0xeaf6ff, 0x3fa7ff);
      break;
    case "christmas-tinsel-snapper":
      pivots = buildShear(root, 0xd8a83a, 0xc81f2e, 0xc81f2e);
      break;
  }
  poseChristmasLethal(kind, pivots, 1);
  return pivots;
}
