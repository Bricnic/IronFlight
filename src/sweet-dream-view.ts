import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { SweetDreamKind } from "./custom-level";
import {
  SWEET_BALLOON_POLE,
  SWEET_BUNTING,
  SWEET_CUPCAKE,
  SWEET_GIFT,
  SWEET_HAT,
} from "./dungeon-hazards";

const mat = (color: number, roughness = 0.5, extra: T.MeshStandardMaterialParameters = {}) =>
  new T.MeshStandardMaterial({ color, roughness, metalness: 0.08, ...extra });

function mesh(
  root: T.Object3D,
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
  root.add(m);
  return m;
}

const PASTELS = [0xff6f9f, 0xffd166, 0x6fd3ff, 0x8fe388, 0xc79bff, 0xff9d6f];

/** Two poles with a sagging garland of waving pastel flags. */
export function buildBuntingStrip(
  root: T.Group,
  colors: number[],
  postX = SWEET_BUNTING.postX,
): T.Group[] {
  const poleMat = mat(0xf6f2ea, 0.4);
  for (const side of [-1, 1]) {
    mesh(root, new T.CylinderGeometry(0.35, 0.45, 9, 20), poleMat, side * postX, 4.5, 0);
    mesh(root, new T.SphereGeometry(0.55, 16, 12), mat(0xff5f8f, 0.35), side * postX, 9.2, 0);
  }
  const curve = new T.QuadraticBezierCurve3(
    new T.Vector3(-postX, 8.6, 0),
    new T.Vector3(0, 4.2, 0),
    new T.Vector3(postX, 8.6, 0),
  );
  mesh(root, new T.TubeGeometry(curve, 64, 0.09, 12), mat(0x8a6f4d, 0.7));
  const flagShape = new T.Shape();
  flagShape.moveTo(-0.55, 0);
  flagShape.lineTo(0.55, 0);
  flagShape.lineTo(0, -1.3);
  flagShape.closePath();
  const flagGeo = new T.ShapeGeometry(flagShape);
  const pivots: T.Group[] = [];
  const count = 12;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const at = curve.getPoint(t);
    const pivot = new T.Group();
    pivot.position.copy(at);
    const flag = new T.Mesh(
      flagGeo,
      new T.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.6,
        metalness: 0.05,
        side: T.DoubleSide,
      }),
    );
    flag.castShadow = true;
    pivot.add(flag);
    root.add(pivot);
    pivots.push(pivot);
  }
  return pivots;
}

function buildBunting(root: T.Group): T.Group[] {
  return buildBuntingStrip(root, PASTELS, SWEET_BUNTING.postX);
}

/** Shared flag wave for both bunting families. */
export function waveBuntingFlags(pivots: T.Group[], time: number) {
  for (const [i, pivot] of pivots.entries())
    pivot.rotation.y = Math.sin(time * 2.4 + i * 0.7) * 0.35;
}

/** Tall pole with a swaying cluster of glossy party balloons. */
function buildBalloonPole(root: T.Group): T.Group[] {
  mesh(
    root,
    new T.CylinderGeometry(0.3, 0.4, SWEET_BALLOON_POLE.h, 20),
    mat(0xf6f2ea, 0.4),
    0,
    SWEET_BALLOON_POLE.h / 2,
    0,
  );
  mesh(root, new T.CylinderGeometry(1.1, 1.3, 0.5, 20), mat(0x3a3f45, 0.6), 0, 0.25, 0);
  const cluster = new T.Group();
  cluster.position.y = SWEET_BALLOON_POLE.h;
  const offsets: [number, number, number, number][] = [
    [0, 2.2, 0, 1.5],
    [-1.2, 1.4, 0.4, 1.2],
    [1.2, 1.5, -0.3, 1.25],
    [-0.4, 1.2, -1.1, 1.1],
    [0.5, 1.3, 1.1, 1.15],
  ];
  offsets.forEach(([x, y, z, s], i) => {
    const skin = new T.MeshStandardMaterial({
      color: PASTELS[i % PASTELS.length],
      roughness: 0.25,
      metalness: 0.05,
    });
    const bulb = mesh(root, new T.SphereGeometry(s, 24, 18), skin, 0, 0, 0);
    bulb.position.set(x, SWEET_BALLOON_POLE.h + y, z);
    bulb.scale.y = 1.2;
    cluster.attach(bulb);
    const string = mesh(
      root,
      new T.CylinderGeometry(0.03, 0.03, y, 6),
      mat(0xe8e0d0, 0.7),
      0,
      0,
      0,
    );
    string.position.set(x / 2, SWEET_BALLOON_POLE.h + y / 2, z / 2);
    cluster.attach(string);
  });
  root.add(cluster);
  return [cluster];
}

/** Oversized cupcake: fluted cup, frosting swirl, glossy cherry. */
function buildCupcake(root: T.Group): T.Group[] {
  const { w, h } = SWEET_CUPCAKE;
  const cupMat = mat(0x4d9de0, 0.5);
  mesh(root, new T.CylinderGeometry(w * 0.42, w * 0.3, h * 0.45, 28), cupMat, 0, h * 0.225, 0);
  for (let i = 0; i < 3; i++)
    mesh(root, new T.TorusGeometry(w * 0.36 - i * 0.08, 0.09, 10, 28), mat(0x3570a8, 0.5), 0, h * (0.12 + i * 0.12), 0).rotation.x =
      Math.PI / 2;
  const frostMat = mat(0xfff3fa, 0.45);
  const tiers: [number, number][] = [
    [w * 0.5, h * 0.5],
    [w * 0.38, h * 0.64],
    [w * 0.24, h * 0.76],
  ];
  for (const [r, y] of tiers)
    mesh(root, new T.TorusGeometry(r, r * 0.42, 14, 32), frostMat, 0, y, 0).rotation.x = Math.PI / 2;
  mesh(root, new T.ConeGeometry(w * 0.1, h * 0.16, 20), frostMat, 0, h * 0.9, 0);
  mesh(root, new T.SphereGeometry(0.32, 20, 16), mat(0xd42a2a, 0.25), 0, h * 1.0, 0);
  const stem = mesh(root, new T.CylinderGeometry(0.04, 0.04, 0.7, 8), mat(0x3f7a34, 0.6), 0, h * 1.0 + 0.3, 0);
  stem.rotation.z = 0.3;
  return [];
}

/** Pastel present with lid, ribbons, and a torus bow. */
function buildGiftBox(root: T.Group): T.Group[] {
  const { w, h, d } = SWEET_GIFT;
  const boxMat = mat(0xff6f9f, 0.45);
  const ribbonMat = mat(0xffe08a, 0.4);
  mesh(root, new RoundedBoxGeometry(w, h, d, 4, 0.18), boxMat, 0, h / 2, 0);
  mesh(root, new RoundedBoxGeometry(w + 0.25, h * 0.28, d + 0.25, 4, 0.12), boxMat, 0, h * 0.94, 0);
  mesh(root, new T.BoxGeometry(0.5, h * 1.02, d + 0.06), ribbonMat, 0, h / 2, 0);
  mesh(root, new T.BoxGeometry(w + 0.06, h * 0.3, 0.5), ribbonMat, 0, h * 0.94, 0);
  for (const side of [-1, 1]) {
    const loop = mesh(root, new T.TorusGeometry(0.55, 0.2, 12, 24), ribbonMat, side * 0.55, h + 0.35, 0);
    loop.rotation.y = Math.PI / 2;
    loop.rotation.x = side * 0.4;
  }
  mesh(root, new T.SphereGeometry(0.3, 16, 12), ribbonMat, 0, h + 0.35, 0);
  const tag = mesh(root, new RoundedBoxGeometry(0.9, 0.6, 0.08, 2, 0.05), mat(0xf6f2ea, 0.5), 0.9, h * 0.45, d / 2 + 0.1);
  tag.rotation.z = 0.2;
  mesh(root, new T.CylinderGeometry(0.03, 0.03, 0.8, 6), ribbonMat, 0.9, h * 0.45 + 0.55, d / 2 + 0.1);
  return [];
}

/** Giant striped party hat with brim and fluffy pompom. */
function buildPartyHat(root: T.Group): T.Group[] {
  const { w, h } = SWEET_HAT;
  mesh(root, new T.CylinderGeometry(w * 0.75, w * 0.8, 0.4, 32), mat(0x7c5cff, 0.5), 0, 0.2, 0);
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const t0 = i / stripes, t1 = (i + 1) / stripes;
    mesh(
      root,
      new T.CylinderGeometry(w * 0.55 * (1 - t1) + 0.05, w * 0.55 * (1 - t0) + 0.05, (h / stripes) * 1.02, 32),
      i % 2 ? mat(0xff6f9f, 0.45) : mat(0xf6f2ea, 0.45),
      0,
      0.4 + (h * (t0 + t1)) / 2,
      0,
    );
  }
  mesh(root, new T.IcosahedronGeometry(0.7, 3), mat(0xffd166, 0.7), 0, h + 0.5, 0);
  return [];
}

export function buildSweetDream(root: T.Group, kind: SweetDreamKind): T.Group[] {
  if (kind === "bunting-string") return buildBunting(root);
  if (kind === "balloon-pole") return buildBalloonPole(root);
  if (kind === "cupcake") return buildCupcake(root);
  if (kind === "gift-box") return buildGiftBox(root);
  return buildPartyHat(root);
}

/** Wave bunting flags and sway balloon clusters; static kinds ignore time. */
export function poseSweetDream(kind: SweetDreamKind, pivots: T.Group[], time: number) {
  if (kind === "bunting-string") waveBuntingFlags(pivots, time);
  else if (kind === "balloon-pole" && pivots[0]) {
    pivots[0].rotation.x = Math.sin(time * 1.3) * 0.06;
    pivots[0].rotation.z = Math.cos(time * 1.1) * 0.06;
  }
}
