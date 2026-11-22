import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { WinterDreamKind } from "./custom-level";
import {
  WINTER_BUOY,
  WINTER_CASTLE,
  WINTER_HOUSE,
  WINTER_PINE,
  WINTER_SLED,
  WINTER_TOWER,
} from "./dungeon-hazards";

const mat = (color: number, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
  new T.MeshStandardMaterial({ color, roughness, metalness: 0.05, ...extra });

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

const GINGER = 0x8a5227;
const SNOW = 0xf4f8ff;
const glowMat = (color: number) =>
  mat(color, 0.3, { emissive: color, emissiveIntensity: 1.2 });

/** Gingerbread cottage: candy roof, icing trim, glowing windows. */
function buildHouse(root: T.Group): T.Group[] {
  const { w, h, d } = WINTER_HOUSE;
  const ginger = mat(GINGER, 0.7);
  mesh(root, new RoundedBoxGeometry(w, h * 0.62, d, 3, 0.15), ginger, 0, h * 0.31, 0);
  const roofH = h * 0.38;
  for (const side of [-1, 1]) {
    const slab = mesh(
      root,
      new T.BoxGeometry(w * 0.62, 0.35, d + 1.2),
      mat(0xc25e7e, 0.55),
      side * w * 0.24,
      h * 0.62 + roofH * 0.45,
      0,
    );
    slab.rotation.z = -side * 0.5;
    const snow = mesh(
      root,
      new T.BoxGeometry(w * 0.62, 0.3, d + 1.4),
      mat(SNOW, 0.5),
      side * w * 0.29,
      h * 0.62 + roofH * 0.45 + 0.55,
      0,
    );
    snow.rotation.z = -side * 0.5;
  }
  mesh(root, new T.CylinderGeometry(0.5, 0.5, 2.4, 16), ginger, w * 0.3, h + 0.6, -d * 0.2);
  mesh(root, new T.SphereGeometry(0.7, 16, 12), mat(SNOW, 0.5), w * 0.3, h + 1.9, -d * 0.2);
  // Door + glowing windows + gumdrops.
  mesh(root, new RoundedBoxGeometry(2, 3.4, 0.3, 2, 0.1), mat(0x5a3418, 0.7), 0, 1.7, d / 2 + 0.05);
  for (const x of [-w * 0.3, w * 0.3])
    mesh(root, new T.PlaneGeometry(1.4, 1.4), glowMat(0xffd97a), x, h * 0.35, d / 2 + 0.06);
  for (let i = 0; i < 8; i++) {
    const t = -w / 2 + 0.8 + (i / 7) * (w - 1.6);
    mesh(
      root,
      new T.SphereGeometry(0.32, 12, 10),
      mat([0xff5f8f, 0x6fd3ff, 0x8fe388, 0xffd166][i % 4], 0.4),
      t,
      h * 0.62 + 0.2,
      d / 2 + 0.25,
    );
  }
  return [];
}

/** Gingerbread castle: tall keep, four candy towers, glowing gate. */
function buildCastle(root: T.Group): T.Group[] {
  const { w, h, d } = WINTER_CASTLE;
  const ginger = mat(GINGER, 0.7);
  mesh(root, new RoundedBoxGeometry(w, h * 0.6, d, 3, 0.3), ginger, 0, h * 0.3, 0);
  mesh(root, new T.BoxGeometry(w + 1, 1, d + 1), mat(SNOW, 0.5), 0, h * 0.6 + 0.4, 0);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = sx * (w / 2 - 1.2), z = sz * (d / 2 - 1.2);
      mesh(root, new T.CylinderGeometry(1.7, 1.9, h * 0.78, 20), ginger, x, h * 0.39, z);
      mesh(root, new T.ConeGeometry(2.4, 3.4, 20), mat(0xc25e7e, 0.55), x, h * 0.78 + 1.6, z);
      mesh(root, new T.SphereGeometry(0.8, 14, 10), mat(SNOW, 0.5), x, h * 0.78 + 3.4, z);
      mesh(root, new T.PlaneGeometry(1, 1.4), glowMat(0xffd97a), x, h * 0.5, z + sz * 1.95);
    }
  mesh(root, new RoundedBoxGeometry(4.4, 6, 0.5, 2, 0.2), mat(0x2e1a0c, 0.8), 0, 3, d / 2 + 0.1);
  for (let i = 0; i < 6; i++)
    mesh(
      root,
      new T.SphereGeometry(0.45, 12, 10),
      mat(0xff5f8f, 0.4),
      -3.75 + i * 1.5,
      6.6,
      d / 2 + 0.2,
    );
  for (const y of [10, 15])
    for (const x of [-5.5, -2.75, 0, 2.75, 5.5])
      mesh(root, new T.PlaneGeometry(1.1, 1.3), glowMat(0xffd97a), x, y, d / 2 + 0.06);
  return [];
}

/** Snow-dusted evergreen with a glowing star topper. */
function buildPine(root: T.Group): T.Group[] {
  mesh(root, new T.CylinderGeometry(0.7, 0.9, 3, 16), mat(0x5a3a26, 0.8), 0, 1.5, 0);
  const tiers: [number, number, number][] = [
    [3.6, 4.6, 3.4],
    [2.9, 6.6, 3.0],
    [2.2, 8.4, 2.6],
    [1.4, 10.0, 2.2],
  ];
  for (const [ti, [r, y, h]] of tiers.entries()) {
    mesh(root, new T.ConeGeometry(r, h, 36), mat(0x2f7a4d, 0.7), 0, y, 0);
    mesh(root, new T.ConeGeometry(r * 0.72, h * 0.5, 36), mat(SNOW, 0.55), 0, y + h * 0.32, 0);
    for (let i = 0; i < 4; i++) {
      const a = ((i + ti * 0.5) / 4) * Math.PI * 2;
      mesh(
        root,
        new T.SphereGeometry(0.42, 16, 12),
        mat(SNOW, 0.55),
        Math.cos(a) * r * 0.8,
        y - h * 0.2,
        Math.sin(a) * r * 0.8,
      );
    }
  }
  const star = mesh(root, new T.OctahedronGeometry(0.7), glowMat(0xffe08a), 0, 12.2, 0);
  star.scale.y = 1.4;
  return [];
}

/** Striped peppermint float for the ice pond. Bobs and spins. */
function buildBuoy(root: T.Group): T.Group[] {
  const pivot = new T.Group();
  const ball = new T.Mesh(new T.SphereGeometry(1.5, 28, 20), mat(0xf6f2ea, 0.35));
  ball.castShadow = true;
  pivot.add(ball);
  for (let i = 0; i < 3; i++) {
    const ring = new T.Mesh(
      new T.TorusGeometry(1.42, 0.22, 12, 32),
      mat(0xd42a2a, 0.35),
    );
    ring.rotation.x = Math.PI / 2 + (i - 1) * 0.5;
    ring.position.y = (i - 1) * 0.75;
    ring.castShadow = true;
    pivot.add(ring);
  }
  const base = new T.Mesh(
    new T.CylinderGeometry(1.9, 2.1, 0.5, 24),
    mat(0xbfe3f2, 0.3, { transparent: true, opacity: 0.85 }),
  );
  base.position.y = -1.6;
  pivot.add(base);
  const mast = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 1.6, 10), mat(0x3a3f45, 0.6));
  mast.position.y = 1.9;
  mast.castShadow = true;
  pivot.add(mast);
  const lamp = new T.Mesh(
    new T.SphereGeometry(0.42, 16, 12),
    mat(0xffd97a, 0.3, { emissive: 0xffc44d, emissiveIntensity: 1.6 }),
  );
  lamp.position.y = 2.9;
  pivot.add(lamp);
  const cage = new T.Mesh(new T.TorusGeometry(0.55, 0.07, 8, 20), mat(0x3a3f45, 0.6));
  cage.position.y = 2.9;
  cage.rotation.x = Math.PI / 2;
  pivot.add(cage);
  pivot.position.y = WINTER_BUOY.h / 2 + 1.2;
  pivot.userData.baseY = pivot.position.y;
  root.add(pivot);
  return [pivot];
}

/** Candy-cane lift tower with a swaying gondola cabin. */
function buildTower(root: T.Group): T.Group[] {
  const { h } = WINTER_TOWER;
  const segs = 10;
  for (let i = 0; i < segs; i++)
    mesh(
      root,
      new T.CylinderGeometry(0.55, 0.55, (h / segs) * 1.02, 16),
      i % 2 ? mat(0xf6f2ea, 0.4) : mat(0xd42a2a, 0.4),
      0,
      (h / segs) * (i + 0.5),
      0,
    );
  mesh(root, new T.BoxGeometry(7, 0.8, 1.2), mat(0x3a3f45, 0.6), 0, h - 0.6, 0);
  mesh(root, new T.CylinderGeometry(1.4, 1.6, 0.6, 20), mat(0x3a3f45, 0.6), 0, 0.3, 0);
  const cable = mesh(
    root,
    new T.CylinderGeometry(0.06, 0.06, 7, 8),
    mat(0x222222, 0.5),
    0,
    h - 1.2,
    0,
  );
  cable.rotation.z = Math.PI / 2;
  const cabin = new T.Group();
  cabin.position.set(2.4, h - 1.2, 0);
  const box = new T.Mesh(new RoundedBoxGeometry(2.2, 2.4, 2.6, 3, 0.25), mat(0xc25e7e, 0.5));
  box.position.y = -2.2;
  box.castShadow = true;
  cabin.add(box);
  const glass = new T.Mesh(
    new T.PlaneGeometry(1.6, 1.2),
    mat(0xbfe3f2, 0.2, { emissive: 0x9fd4ff, emissiveIntensity: 0.35 }),
  );
  glass.position.set(0, -2.2, 1.32);
  cabin.add(glass);
  const hanger = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 1.2, 8), mat(0x222222, 0.5));
  hanger.position.y = -0.5;
  cabin.add(hanger);
  root.add(cabin);
  return [cabin];
}

/** Wooden sled with bent tube runners, slat bed, and a gift load. */
function buildSled(root: T.Group): T.Group[] {
  const wood = mat(0x7a4a26, 0.7);
  const runnerCurve = new T.CatmullRomCurve3([
    new T.Vector3(0, 0.25, -2.7),
    new T.Vector3(0, 0.25, 2.2),
    new T.Vector3(0, 0.7, 3.2),
    new T.Vector3(0, 1.5, 3.7),
  ]);
  for (const x of [-1.1, 1.1]) {
    const tube = new T.TubeGeometry(runnerCurve, 32, 0.14, 12);
    mesh(root, tube, wood, x, 0, 0);
    for (const z of [-1.8, 0, 1.8])
      mesh(root, new T.CylinderGeometry(0.09, 0.09, 0.7, 10), wood, x, 0.6, z);
  }
  for (let i = 0; i < 6; i++)
    mesh(root, new T.BoxGeometry(2.6, 0.16, 0.62), wood, 0, 1.0, -2 + i * 0.8);
  for (const x of [-1.25, 1.25])
    mesh(root, new T.BoxGeometry(0.16, 0.5, 4.6), wood, x, 1.3, 0);
  mesh(root, new RoundedBoxGeometry(1.6, 1.2, 1.6, 2, 0.1), mat(0xff6f9f, 0.5), 0, 1.9, -0.6);
  mesh(root, new T.BoxGeometry(0.35, 1.25, 1.65), mat(0xffe08a, 0.45), 0, 1.9, -0.6);
  return [];
}

export function buildWinterDream(root: T.Group, kind: WinterDreamKind): T.Group[] {
  if (kind === "gingerbread-house") return buildHouse(root);
  if (kind === "gingerbread-castle") return buildCastle(root);
  if (kind === "frosted-pine") return buildPine(root);
  if (kind === "peppermint-buoy") return buildBuoy(root);
  if (kind === "ski-lift-tower") return buildTower(root);
  return buildSled(root);
}

/** Buoys bob and spin; gondola cabins sway; all else is static. */
export function poseWinterDream(kind: WinterDreamKind, pivots: T.Group[], time: number) {
  if (kind === "peppermint-buoy" && pivots[0]) {
    const baseY = (pivots[0].userData.baseY as number | undefined) ?? 0;
    pivots[0].position.y = baseY + Math.sin(time * 1.8) * 0.35;
    pivots[0].rotation.y = time * 0.9;
  } else if (kind === "ski-lift-tower" && pivots[0]) {
    pivots[0].rotation.x = Math.sin(time * 1.1) * 0.07;
    pivots[0].rotation.z = Math.cos(time * 0.9) * 0.07;
  }
}
