import * as T from "three";
import type { OutdoorDreamKind } from "./custom-level";
import { OUT_TRAIL } from "./dungeon-hazards";

const mat = (color: number, roughness = 0.7, extra: T.MeshStandardMaterialParameters = {}) =>
  new T.MeshStandardMaterial({ color, roughness, metalness: 0.02, ...extra });

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

const ROCK_BANDS = [0xb0502e, 0xc96a3a, 0x9a4526, 0xd08050];

/** Pine tree: trunk, three foliage tiers, pinecones. */
function buildPine(root: T.Group): T.Group[] {
  mesh(root, new T.CylinderGeometry(0.5, 0.7, 4, 12), mat(0x6a4a2e, 0.9), 0, 2, 0);
  const leaf = mat(0x2f7a3a, 0.8);
  const tiers: [number, number, number][] = [[3, 3.2, 4.5], [2.3, 2.8, 6.5], [1.5, 2.4, 8.3]];
  for (const [r, h, y] of tiers)
    mesh(root, new T.ConeGeometry(r, h, 16), leaf, 0, y, 0);
  const coneMat = mat(0x7a5a3b, 0.9);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    mesh(root, new T.SphereGeometry(0.28, 10, 8), coneMat, Math.cos(a) * 1.8, 4.2 + (i % 3), Math.sin(a) * 1.8);
  }
  mesh(root, new T.SphereGeometry(0.35, 10, 8), mat(0x4d8a3f, 0.8), 0, 9.7, 0);
  return [];
}

/** Mesa butte: banded slabs, cap rock, scrub. */
function buildMesa(root: T.Group): T.Group[] {
  const slabs: [number, number][] = [[12, 2.5], [10, 2.5], [8, 2.5], [9, 2]];
  let y = 0;
  slabs.forEach(([w, h], i) => {
    const slab = mesh(
      root,
      new T.BoxGeometry(w, h, w * 0.9),
      mat(ROCK_BANDS[i % ROCK_BANDS.length], 0.85),
      (i % 2 ? -0.5 : 0.5),
      y + h / 2,
      0,
    );
    slab.rotation.y = i * 0.12;
    y += h;
  });
  const cap = mesh(root, new T.DodecahedronGeometry(2.6, 0), mat(0x8a5a3a, 0.85), 0.5, y + 1, 0);
  cap.scale.y = 0.6;
  for (const [x, z] of [[-4, 2.5], [3.5, -2], [1, 3.8]] as const)
    mesh(root, new T.SphereGeometry(0.8, 12, 10), mat(0x4d8a3f, 0.8), x, y + 0.4, z);
  for (const [x, z] of [[-5.5, -3.5], [5.5, 3.5], [0, -5]] as const)
    mesh(root, new T.DodecahedronGeometry(0.9, 0), mat(0x9a8a7a, 0.9), x, 0.5, z);
  return [];
}

/** Trailhead arch: log posts, beam, hanging sign. */
function buildTrailArch(root: T.Group): T.Group[] {
  const { postX } = OUT_TRAIL;
  const log = mat(0x6a4a2e, 0.9);
  for (const side of [-1, 1]) {
    mesh(root, new T.CylinderGeometry(0.75, 0.9, 10, 20), log, side * postX, 5, 0);
    mesh(root, new T.SphereGeometry(1.0, 12, 10), mat(0x4d8a3f, 0.8), side * postX, 10.2, 0);
    for (const y of [2.5, 5.5, 8]) {
      const band = mesh(root, new T.TorusGeometry(0.82, 0.09, 8, 20), mat(0x3a2e1e, 0.9), side * postX, y, 0);
      band.rotation.x = Math.PI / 2;
    }
  }
  const beam = mesh(root, new T.CylinderGeometry(0.6, 0.6, postX * 2 + 3, 20), log, 0, 9.8, 0);
  beam.rotation.z = Math.PI / 2;
  mesh(root, new T.SphereGeometry(0.45, 14, 12),
    mat(0xffe9a8, 0.3, { emissive: 0xffc95a, emissiveIntensity: 1.4 }), 0, 8.9, 0);
  for (const x of [-2.5, 2.5])
    mesh(root, new T.CylinderGeometry(0.08, 0.08, 1.6, 8), mat(0x3a2e1e, 0.9), x, 8.9, 0);
  mesh(root, new T.BoxGeometry(6.5, 1.6, 0.3), mat(0x8a6a42, 0.85), 0, 7.9, 0);
  mesh(root, new T.BoxGeometry(4.5, 0.25, 0.32), mat(0xf2e8d5, 0.7), 0, 8.1, 0);
  mesh(root, new T.BoxGeometry(3.2, 0.25, 0.32), mat(0xf2e8d5, 0.7), 0, 7.5, 0);
  return [];
}

/** Waterfall: banded cliff, translucent falls, pulsing foam. */
function buildFalls(root: T.Group): T.Group[] {
  for (let i = 0; i < 3; i++)
    mesh(root, new T.BoxGeometry(10, 4.5, 4), mat(ROCK_BANDS[(i + 1) % 4], 0.85), 0, 2.25 + i * 4.4, -1);
  mesh(root, new T.BoxGeometry(10.5, 1, 4.5), mat(0x6a8a4d, 0.8), 0, 13.8, -1);
  const falls = mesh(
    root,
    new T.BoxGeometry(7, 12, 0.6),
    mat(0x7ad2ff, 0.25, { transparent: true, opacity: 0.82, emissive: 0x2a7ab0, emissiveIntensity: 0.4 }),
    0,
    6.5,
    1.4,
  );
  falls.castShadow = false;
  for (const x of [-2.2, 0, 2.2])
    mesh(root, new T.BoxGeometry(0.7, 12, 0.65),
      mat(0xe8f7ff, 0.2, { transparent: true, opacity: 0.7 }), x, 6.5, 1.4).castShadow = false;
  const foam = new T.Group();
  const foamMat = mat(0xf2fbff, 0.3, { transparent: true, opacity: 0.9 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const puff = new T.Mesh(new T.SphereGeometry(0.9, 12, 10), foamMat);
    puff.position.set(Math.cos(a) * 3.2, 0.5, 1.4 + Math.sin(a) * 1.6);
    puff.userData.phase = i * 0.8;
    puff.castShadow = false;
    foam.add(puff);
  }
  root.add(foam);
  return [foam];
}

function poseFoam(foam: T.Group, time: number) {
  for (const puff of foam.children) {
    const phase = (puff.userData.phase as number | undefined) ?? 0;
    const s = 1 + Math.sin(time * 3 + phase) * 0.18;
    puff.scale.set(s, s, s);
  }
}

/** Raft pond: rock-rimmed pool with a log raft. */
function buildRaft(root: T.Group): T.Group[] {
  mesh(root, new T.CylinderGeometry(4.5, 4.5, 0.5, 24), mat(0x3fa7d9, 0.3), 0, 0.25, 0);
  mesh(root, new T.CylinderGeometry(4.5, 4.5, 0.2, 24),
    mat(0xbfe9ff, 0.2, { transparent: true, opacity: 0.5 }), 0, 0.55, 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rock = mesh(root, new T.DodecahedronGeometry(0.8, 0), mat(0x9a8a7a, 0.9),
      Math.cos(a) * 4.8, 0.4, Math.sin(a) * 4.8);
    rock.rotation.set(i, i * 2, i * 0.5);
  }
  const raft = new T.Group();
  raft.position.y = 0.75;
  raft.rotation.y = 0.4;
  for (let i = 0; i < 5; i++)
    mesh(raft, new T.CylinderGeometry(0.35, 0.35, 5, 12), mat(0x8a6a42, 0.85), -1.6 + i * 0.8, 0, 0)
      .rotation.x = Math.PI / 2;
  for (const z of [-1.8, 1.8])
    mesh(raft, new T.CylinderGeometry(0.15, 0.15, 4.4, 8), mat(0x6a4a2e, 0.9), 0, 0.4, z)
      .rotation.z = Math.PI / 2;
  root.add(raft);
  return [];
}

/** Compass rock: boulder topped with a spinning compass. */
function buildCompass(root: T.Group): T.Group[] {
  const rock = mesh(root, new T.DodecahedronGeometry(1.8, 1), mat(0x8a8078, 0.9), 0, 1.2, 0);
  rock.scale.y = 0.75;
  const side = mesh(root, new T.DodecahedronGeometry(0.9, 1), mat(0x9a8a7a, 0.9), 2.2, 0.5, 1.2);
  side.rotation.set(0.5, 1.1, 0.2);
  mesh(root, new T.CylinderGeometry(1.1, 1.2, 0.5, 28), mat(0xb08a3b, 0.4, { metalness: 0.7 }), 0, 2.6, 0);
  mesh(root, new T.CylinderGeometry(0.95, 0.95, 0.1, 28), mat(0xf2f0e8, 0.3), 0, 2.85, 0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tick = mesh(root, new T.BoxGeometry(0.08, 0.06, i % 3 ? 0.18 : 0.3), mat(0x1c1c22, 0.4),
      Math.cos(a) * 0.78, 2.92, Math.sin(a) * 0.78);
    tick.rotation.y = -a;
  }
  const needle = new T.Group();
  needle.position.y = 3.0;
  const north = new T.Mesh(new T.ConeGeometry(0.18, 0.9, 14), mat(0xc23b3b, 0.4));
  north.rotation.x = Math.PI / 2;
  north.position.z = -0.4;
  const south = new T.Mesh(new T.ConeGeometry(0.18, 0.9, 14), mat(0xf2f0e8, 0.4));
  south.rotation.x = -Math.PI / 2;
  south.position.z = 0.4;
  needle.add(north, south);
  mesh(needle, new T.SphereGeometry(0.14, 10, 8), mat(0x1c1c22, 0.4), 0, 0.1, 0);
  root.add(needle);
  return [needle];
}

export function buildOutdoorDream(root: T.Group, kind: OutdoorDreamKind): T.Group[] {
  if (kind === "pine-tree") return buildPine(root);
  if (kind === "mesa-rock") return buildMesa(root);
  if (kind === "trail-arch") return buildTrailArch(root);
  if (kind === "waterfall") return buildFalls(root);
  if (kind === "raft-pond") return buildRaft(root);
  return buildCompass(root);
}

/** Falls foam pulses, compass needle spins. */
export function poseOutdoorDream(kind: OutdoorDreamKind, pivots: T.Group[], time: number) {
  const pivot = pivots[0];
  if (!pivot) return;
  if (kind === "waterfall") poseFoam(pivot, time);
  else if (kind === "compass-rock") pivot.rotation.y = time * 1.2;
}
