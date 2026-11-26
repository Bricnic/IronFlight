import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { StuntDreamKind } from "./custom-level";
import { STUNT_RING, STUNT_STAR } from "./dungeon-hazards";

const mat = (color: number, roughness = 0.5, extra: T.MeshStandardMaterialParameters = {}) =>
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

const CANDY = [0xff6fa5, 0x4fd2ff, 0xffd166, 0x7de08a, 0xc49bff, 0xff8a5c];

/** Ferris wheel: spinning rim, spokes, and self-leveling cupcake gondolas. */
function buildFerris(root: T.Group): T.Group[] {
  const frame = mat(0xfff2f7, 0.4);
  mesh(root, new T.BoxGeometry(10, 1, 8), mat(0xe85d9e, 0.5), 0, 0.5, 0);
  for (const side of [-1, 1]) {
    const leg = mesh(root, new T.BoxGeometry(1.2, 15, 1.2), frame, side * 4, 7, 0);
    leg.rotation.z = side * -0.22;
  }
  const hub = mesh(root, new T.CylinderGeometry(1, 1, 3, 20), mat(0xe85d9e, 0.4), 0, 14, 0);
  hub.rotation.x = Math.PI / 2;
  const wheel = new T.Group();
  wheel.position.y = 14;
  const rim = new T.Mesh(new T.TorusGeometry(10, 0.5, 14, 56), frame);
  rim.castShadow = true;
  wheel.add(rim);
  const spokeGeo = new T.CylinderGeometry(0.18, 0.18, 10, 10);
  for (let i = 0; i < 8; i++) {
    const spoke = new T.Mesh(spokeGeo, frame);
    const a = (i / 8) * Math.PI * 2;
    spoke.position.set(Math.cos(a) * 5, Math.sin(a) * 5, 0);
    spoke.rotation.z = a - Math.PI / 2;
    spoke.castShadow = true;
    wheel.add(spoke);
  }
  const bulbGeo = new T.SphereGeometry(0.28, 10, 8);
  const bulbMat = mat(0xfff6c9, 0.3, { emissive: 0xffe27a, emissiveIntensity: 1.6 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bulb = new T.Mesh(bulbGeo, bulbMat);
    bulb.position.set(Math.cos(a) * 10, Math.sin(a) * 10, 0.55);
    wheel.add(bulb);
  }
  root.add(wheel);
  // Gondolas hang from rim anchors but stay upright (posed every frame).
  const hangers: T.Group[] = [];
  for (let i = 0; i < 8; i++) {
    const hanger = new T.Group();
    const color = CANDY[i % CANDY.length];
    mesh(hanger, new T.BoxGeometry(1.6, 1.4, 1.4), mat(color, 0.4), 0, -1.6, 0);
    mesh(hanger, new T.ConeGeometry(1.1, 1.2, 14), mat(0xfff2f7, 0.4), 0, -0.4, 0);
    mesh(hanger, new T.SphereGeometry(0.25, 10, 8), mat(0xe23b3b, 0.3), 0, 0.35, 0);
    mesh(hanger, new T.CylinderGeometry(0.08, 0.08, 1.2, 8), frame, 0, -0.3, 0);
    root.add(hanger);
    hangers.push(hanger);
  }
  wheel.userData.hangers = hangers;
  wheel.userData.radius = 10;
  wheel.userData.centerY = 14;
  poseFerrisWheel(wheel, 0);
  return [wheel];
}

function poseFerrisWheel(wheel: T.Group, time: number) {
  const angle = time * 0.35;
  wheel.rotation.z = angle;
  const hangers = wheel.userData.hangers as T.Group[];
  const radius = wheel.userData.radius as number;
  const centerY = wheel.userData.centerY as number;
  hangers.forEach((h, i) => {
    const a = angle + (i / hangers.length) * Math.PI * 2;
    h.position.set(Math.cos(a) * radius, centerY + Math.sin(a) * radius, 0);
    h.rotation.z = 0;
  });
}

/** Ring of fire: flaming drive-through torus on posts. */
function buildRing(root: T.Group): T.Group[] {
  const { postX } = STUNT_RING;
  const postMat = mat(0x3a3f4a, 0.6, { metalness: 0.4 });
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(1.2, 12, 1.2), postMat, side * postX, 6, 0);
    mesh(root, new T.CylinderGeometry(0.9, 0.9, 1.6, 16), mat(0xe23b3b, 0.5), side * postX, 0.8, 1.6);
  }
  const flames = new T.Group();
  const fire = mat(0xc23c00, 0.4, { emissive: 0xd93a00, emissiveIntensity: 2.6 });
  const core = mat(0xff8a1a, 0.4, { emissive: 0xff6a00, emissiveIntensity: 2.2 });
  const ring = new T.Mesh(new T.TorusGeometry(8, 0.9, 16, 48), fire);
  ring.position.y = 9;
  ring.castShadow = true;
  flames.add(ring);
  const inner = new T.Mesh(new T.TorusGeometry(8, 0.45, 12, 48), core);
  inner.position.set(0, 9, 0.3);
  flames.add(inner);
  const flameGeo = new T.ConeGeometry(0.55, 1.6, 10);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const f = new T.Mesh(flameGeo, i % 2 ? fire : core);
    f.position.set(Math.cos(a) * 8, 9 + Math.sin(a) * 8, 0);
    f.rotation.z = a - Math.PI / 2;
    flames.add(f);
  }
  flames.userData.base = 2.6;
  root.add(flames);
  return [flames];
}

/** Drop tower: striped column, rider ring, cupcake crown. */
function buildTower(root: T.Group): T.Group[] {
  mesh(root, new T.BoxGeometry(8, 1, 8), mat(0xe85d9e, 0.5), 0, 0.5, 0);
  for (let i = 0; i < 4; i++)
    mesh(
      root,
      new T.BoxGeometry(4, 4, 4),
      mat(i % 2 ? 0xfff2f7 : 0xe85d9e, 0.45),
      0,
      3 + i * 4,
      0,
    );
  const car = new T.Group();
  car.position.y = 6;
  const band = new T.Mesh(new T.TorusGeometry(4, 0.7, 12, 32), mat(0x4fd2ff, 0.4));
  band.rotation.x = Math.PI / 2;
  band.castShadow = true;
  car.add(band);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    mesh(car, new T.BoxGeometry(1.2, 1.4, 1.2), mat(CANDY[i % CANDY.length], 0.4),
      Math.cos(a) * 4, 0.8, Math.sin(a) * 4);
  }
  root.add(car);
  mesh(root, new T.CylinderGeometry(2.6, 3.2, 1.6, 20), mat(0x8a5a3b, 0.6), 0, 19.5, 0);
  const frost = mesh(root, new T.SphereGeometry(2.8, 20, 14), mat(0xfff2f7, 0.4), 0, 20.8, 0);
  frost.scale.y = 0.6;
  mesh(root, new T.SphereGeometry(0.6, 14, 12), mat(0xe23b3b, 0.3), 0, 22.4, 0);
  return [];
}

/** Ticket booth: hut, striped awning, glowing sign. */
function buildBooth(root: T.Group): T.Group[] {
  mesh(root, new RoundedBoxGeometry(7, 4.5, 6, 4, 0.25), mat(0xfff2f7, 0.5), 0, 2.25, 0);
  mesh(root, new RoundedBoxGeometry(7.6, 0.6, 6.6, 3, 0.2), mat(0xe85d9e, 0.5), 0, 4.75, 0);
  mesh(root, new T.BoxGeometry(4.5, 1.8, 0.2), mat(0x2a2a35, 0.4), 0, 2.6, 3.05);
  mesh(root, new T.BoxGeometry(5, 0.3, 1.2), mat(0x8a5a3b, 0.6), 0, 1.5, 3.2);
  for (let i = 0; i < 5; i++)
    mesh(root, new T.BoxGeometry(1.3, 0.15, 2.2), mat(i % 2 ? 0xfff2f7 : 0xe85d9e, 0.5),
      -2.6 + i * 1.3, 4.1 - 0.12 * i, 3.6).rotation.x = 0.35;
  mesh(root, new T.BoxGeometry(5.5, 1.4, 0.3),
    mat(0xffd166, 0.4, { emissive: 0xffc95a, emissiveIntensity: 0.9 }), 0, 5.9, 0);
  for (const x of [-2.5, 2.5])
    mesh(root, new T.CylinderGeometry(0.12, 0.12, 1.2, 8), mat(0x3a3f4a, 0.5), x, 5.2, 0);
  // Corner globes, menu board, and queue rails.
  for (const x of [-3.4, 3.4])
    for (const z of [-2.9, 2.9])
      mesh(root, new T.SphereGeometry(0.4, 14, 12),
        mat(0xfff6c9, 0.3, { emissive: 0xffe27a, emissiveIntensity: 1.2 }), x, 5.3, z);
  mesh(root, new T.BoxGeometry(2.2, 1.4, 0.15), mat(0x2a2a35, 0.4), -4.8, 2.4, 1.5);
  for (const z of [0.4, 1.2, 2.0])
    mesh(root, new T.BoxGeometry(1.8, 0.12, 0.05), mat(0xffd166, 0.4), -4.8, 2.0 + z * 0.3, 1.62);
  for (const side of [-1, 1]) {
    for (const z of [5.5, 8])
      mesh(root, new T.CylinderGeometry(0.12, 0.15, 1.1, 12), mat(0xc0c6d0, 0.35, { metalness: 0.7 }),
        side * 2.5, 0.55, z);
    const rail = mesh(root, new T.CylinderGeometry(0.07, 0.07, 2.5, 10), mat(0xe85d9e, 0.4),
      side * 2.5, 1.05, 6.75);
    rail.rotation.x = Math.PI / 2;
  }
  return [];
}

/** Five-point star panel on posts with chasing bulbs. */
function starShape(outer: number, inner: number): T.Shape {
  const shape = new T.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function buildStar(root: T.Group): T.Group[] {
  const { postX } = STUNT_STAR;
  for (const side of [-1, 1])
    mesh(root, new T.BoxGeometry(1, 10, 1), mat(0x3a3f4a, 0.6, { metalness: 0.4 }), side * postX, 5, 0);
  const panel = new T.Mesh(
    new T.ExtrudeGeometry(starShape(4.2, 1.9), { depth: 0.8, bevelEnabled: false }),
    mat(0xffc95a, 0.35, { emissive: 0xa86a00, emissiveIntensity: 0.5 }),
  );
  panel.position.set(0, 11.5, -0.4);
  panel.castShadow = true;
  root.add(panel);
  const groups: T.Group[] = [new T.Group(), new T.Group()];
  const bulbGeo = new T.SphereGeometry(0.32, 10, 8);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const bulb = new T.Mesh(
      bulbGeo,
      mat(0xfff6c9, 0.3, { emissive: 0xffe27a, emissiveIntensity: 2 }),
    );
    bulb.position.set(Math.cos(a) * 4.2, 11.5 + Math.sin(a) * 4.2, 0.6);
    groups[i % 2].add(bulb);
  }
  for (const g of groups) {
    g.userData.base = 2;
    root.add(g);
  }
  const origin = new T.Object3D();
  origin.name = "prefab-light-origin";
  origin.position.set(0, 11.5, 0.6);
  root.add(origin);
  return groups;
}

export function buildStuntDream(root: T.Group, kind: StuntDreamKind): T.Group[] {
  if (kind === "ferris-wheel") return buildFerris(root);
  if (kind === "ring-of-fire") return buildRing(root);
  if (kind === "drop-tower") return buildTower(root);
  if (kind === "ticket-booth") return buildBooth(root);
  return buildStar(root);
}

/** Ferris spins with level gondolas, ring flames flicker, star bulbs chase. */
export function poseStuntDream(kind: StuntDreamKind, pivots: T.Group[], time: number) {
  if (kind === "ferris-wheel") {
    if (pivots[0]) poseFerrisWheel(pivots[0], time);
    return;
  }
  if (kind === "marquee-star") {
    for (const [i, g] of pivots.entries()) {
      const base = (g.userData.base as number | undefined) ?? 2;
      const on = Math.sin(time * 4 + i * Math.PI) > 0 ? 1 : 0.25;
      g.traverse((o) => {
        if (!(o instanceof T.Mesh)) return;
        const m = o.material as T.MeshStandardMaterial;
        if (m.emissiveIntensity !== undefined) m.emissiveIntensity = base * on;
      });
    }
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
