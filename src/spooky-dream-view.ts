import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { SpookyDreamKind } from "./custom-level";
import {
  SPOOKY_BUNTING,
  SPOOKY_FENCE,
  SPOOKY_GARGOYLE,
  SPOOKY_JACK,
  SPOOKY_TREE,
} from "./dungeon-hazards";
import { buildBuntingStrip, waveBuntingFlags } from "./sweet-dream-view";

const mat = (color: number, roughness = 0.7, extra: T.MeshStandardMaterialParameters = {}) =>
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

const HALLOWEEN = [0xff7a1a, 0x7c3aed, 0x2a2a35, 0xffd166, 0x34d399];

/** Lit jack-o'-lantern on a crooked post; inner glow flickers. */
function buildJack(root: T.Group): T.Group[] {
  const post = mesh(
    root,
    new T.CylinderGeometry(0.3, 0.4, 3.2, 12),
    mat(0x3a2a1a, 0.9),
    0,
    1.6,
    0,
  );
  post.rotation.z = 0.08;
  const gourd = new T.Group();
  gourd.position.y = 3.9;
  const pts: T.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const r = 1.35 * Math.sin(t * Math.PI) ** 0.8 + 0.05;
    pts.push(new T.Vector2(r, t * 2.2));
  }
  const body = new T.Mesh(
    new T.LatheGeometry(pts, 28),
    mat(0xe86a1e, 0.55),
  );
  body.castShadow = true;
  gourd.add(body);
  const stem = new T.Mesh(new T.CylinderGeometry(0.12, 0.18, 0.7, 10), mat(0x3f7a34, 0.8));
  stem.position.y = 2.4;
  stem.rotation.z = 0.25;
  gourd.add(stem);
  const glow = new T.Group();
  const face = mat(0xffb03a, 0.4, { emissive: 0xff8a00, emissiveIntensity: 2.2 });
  for (const x of [-0.5, 0.5]) {
    const eye = new T.Mesh(new T.ConeGeometry(0.3, 0.55, 4), face);
    eye.position.set(x, 1.35, 1.15);
    eye.rotation.x = Math.PI;
    glow.add(eye);
  }
  const grin = new T.Mesh(new T.BoxGeometry(1.1, 0.28, 0.1), face);
  grin.position.set(0, 0.6, 1.25);
  glow.add(grin);
  glow.userData.base = 2.2;
  gourd.add(glow);
  root.add(gourd);
  const mound = mesh(root, new T.SphereGeometry(1.6, 20, 12), mat(0x3a2e22, 0.95), 0, -0.4, 0);
  mound.scale.y = 0.35;
  for (const x of [-1.9, 1.9]) {
    const mini = mesh(root, new T.SphereGeometry(0.55, 14, 12), mat(0xe86a1e, 0.55), x, 0.45, 0.4);
    mini.scale.y = 0.85;
  }
  return [glow];
}

/** Gnarled dead tree with hanging mini pumpkins. */
function buildTree(root: T.Group): T.Group[] {
  const bark = mat(0x2e2118, 0.95);
  let y = 0;
  let lean = 0;
  for (const [h, r0, r1] of [[4.5, 1.0, 0.75], [4.0, 0.75, 0.55], [3.5, 0.55, 0.3]] as const) {
    const seg = mesh(root, new T.CylinderGeometry(r1, r0, h, 14), bark, lean, y + h / 2, 0);
    seg.rotation.z = 0.12;
    lean += 0.5;
    y += h * 0.96;
  }
  const branches: [number, number, number, number][] = [
    [2.2, 5.5, 0.5, 0.9],
    [-2.0, 7.5, -0.4, 1.1],
    [1.6, 9.5, 0.3, 0.8],
  ];
  for (const [x, yy, z, len] of branches) {
    const b = mesh(root, new T.CylinderGeometry(0.14, 0.3, 4.5, 10), bark, x, yy, z);
    b.rotation.z = x > 0 ? -1.1 : 1.1;
    b.scale.y = len;
    const mini = mesh(
      root,
      new T.SphereGeometry(0.5, 14, 12),
      mat(0xe86a1e, 0.55),
      x * 1.7,
      yy - 1.6,
      z,
    );
    mini.scale.y = 0.85;
    mesh(root, new T.CylinderGeometry(0.03, 0.03, 1.0, 6), bark, x * 1.7, yy - 0.9, z);
  }
  return [];
}

/** Perched gargoyle with pulsing eyes on a stone pedestal. */
function buildGargoyle(root: T.Group): T.Group[] {
  const stone = mat(0x8f96ac, 0.85);
  mesh(root, new T.BoxGeometry(3.2, 1.2, 3.2), stone, 0, 0.6, 0);
  mesh(root, new T.BoxGeometry(2.6, 0.5, 2.6), stone, 0, 1.4, 0);
  const body = mesh(root, new RoundedBoxGeometry(1.8, 2.2, 1.5, 3, 0.4), stone, 0, 2.7, 0);
  body.rotation.x = 0.25;
  const head = mesh(root, new T.BoxGeometry(1.1, 1.0, 1.2), stone, 0, 4.1, 0.2);
  head.rotation.x = -0.15;
  for (const x of [-0.45, 0.45])
    mesh(root, new T.ConeGeometry(0.16, 0.7, 10), stone, x, 4.85, 0.1);
  mesh(root, new T.BoxGeometry(0.5, 0.4, 0.5), stone, 0, 3.9, 0.85);
  for (const side of [-1, 1]) {
    const wing = mesh(root, new T.ConeGeometry(0.9, 2.6, 4), stone, side * 1.1, 3.4, -0.5);
    wing.rotation.z = side * 0.5;
    wing.rotation.y = side * 0.3;
    const arm = mesh(root, new T.CylinderGeometry(0.22, 0.28, 1.6, 10), stone, side * 1.0, 2.4, 0.5);
    arm.rotation.x = -0.7;
  }
  const eyes = new T.Group();
  for (const x of [-0.28, 0.28]) {
    const eye = new T.Mesh(
      new T.SphereGeometry(0.16, 12, 10),
      mat(0xb44dff, 0.3, { emissive: 0x9a2bff, emissiveIntensity: 2.5 }),
    );
    eye.position.set(x, 4.15, 0.82);
    eyes.add(eye);
  }
  eyes.userData.base = 2.5;
  root.add(eyes);
  return [eyes];
}

/** Iron fence run: posts, rails and spiked pickets. */
function buildFence(root: T.Group): T.Group[] {
  const iron = mat(0x23232e, 0.5, { metalness: 0.6 });
  const { postX } = SPOOKY_FENCE;
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(0.7, 4.4, 0.7), iron, side * postX, 2.2, 0);
    mesh(root, new T.ConeGeometry(0.5, 0.9, 4), iron, side * postX, 4.8, 0);
  }
  for (const y of [1.4, 3.1])
    mesh(root, new T.BoxGeometry(postX * 2, 0.22, 0.22), iron, 0, y, 0);
  const count = 14;
  for (let i = 0; i < count; i++) {
    const x = -postX + 1 + (i / (count - 1)) * (postX * 2 - 2);
    mesh(root, new T.CylinderGeometry(0.09, 0.11, 3.4, 12), iron, x, 1.9, 0);
    mesh(root, new T.SphereGeometry(0.2, 12, 10), iron, x, 3.7, 0);
    mesh(root, new T.ConeGeometry(0.14, 0.45, 8), iron, x, 4.0, 0);
  }
  return [];
}

export function buildSpookyDream(root: T.Group, kind: SpookyDreamKind): T.Group[] {
  if (kind === "jack-o-lantern") return buildJack(root);
  if (kind === "dead-tree") return buildTree(root);
  if (kind === "gargoyle") return buildGargoyle(root);
  if (kind === "iron-fence") return buildFence(root);
  const pivots = buildBuntingStrip(root, HALLOWEEN, SPOOKY_BUNTING.postX);
  // Recolor the shared sweet bunting hardware for Halloween: iron poles and
  // rope, ember finials. Flag materials are per-instance, so this is local.
  root.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const m = o.material as T.MeshStandardMaterial;
    if (!m?.color) return;
    const hex = m.color.getHex();
    if (hex === 0xf6f2ea) m.color.setHex(0x23232e);
    else if (hex === 0xff5f8f) m.color.setHex(0xff7a1a);
    else if (hex === 0x8a6f4d) m.color.setHex(0x1a1a22);
  });
  return pivots;
}

/** Jack flames flicker, gargoyle eyes pulse, bunting waves. */
export function poseSpookyDream(kind: SpookyDreamKind, pivots: T.Group[], time: number) {
  if (kind === "spooky-bunting") {
    waveBuntingFlags(pivots, time);
    return;
  }
  const pivot = pivots[0];
  if (!pivot) return;
  const base = (pivot.userData.base as number | undefined) ?? 2;
  const w =
    1 +
    0.18 * Math.sin(time * 11 + pivot.position.x) +
    0.09 * Math.sin(time * 27 + pivot.position.z);
  pivot.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const m = o.material as T.MeshStandardMaterial;
    if (m.emissiveIntensity !== undefined) m.emissiveIntensity = base * w;
  });
}
