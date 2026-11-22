import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { ToyboxDreamKind } from "./custom-level";
import { TOY_ARCH } from "./dungeon-hazards";

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

/** One LEGO-style brick with studs; w in studs of 0.8u. */
function brick(root: T.Group, color: number, w: number, x: number, y: number, z: number, d = 1.6) {
  const g = new T.Group();
  g.position.set(x, y, z);
  mesh(g, new RoundedBoxGeometry(w * 0.8, 0.96, d, 2, 0.08), mat(color, 0.35));
  const stud = new T.CylinderGeometry(0.24, 0.24, 0.2, 16);
  const sm = mat(color, 0.35);
  for (let i = 0; i < w; i++)
    mesh(g, stud, sm, -((w - 1) * 0.4) + i * 0.8, 0.58, 0);
  root.add(g);
  return g;
}

/** Giant rubber duck: squashed body, head, beak, tail. Rocks and bobs. */
function buildDuck(root: T.Group): T.Group[] {
  const duck = new T.Group();
  const yellow = mat(0xffd23b, 0.35);
  const body = mesh(duck, new T.SphereGeometry(1.9, 28, 20), yellow, 0, 1.7, -0.3);
  body.scale.set(1, 0.82, 1.15);
  const head = mesh(duck, new T.SphereGeometry(1.15, 24, 18), yellow, 0, 3.6, 1.2);
  head.scale.set(1, 1, 0.95);
  const beak = mesh(duck, new T.ConeGeometry(0.55, 1.1, 20), mat(0xf28c1e, 0.4), 0, 3.5, 2.5);
  beak.rotation.x = Math.PI / 2;
  const beakTop = mesh(duck, new T.SphereGeometry(0.5, 16, 12), mat(0xf28c1e, 0.4), 0, 3.72, 2.2);
  beakTop.scale.set(1, 0.55, 1);
  const eyeMat = mat(0x1a1a22, 0.25);
  const glintMat = new T.MeshBasicMaterial({ color: 0xffffff });
  for (const side of [-1, 1]) {
    mesh(duck, new T.SphereGeometry(0.22, 14, 12), eyeMat, side * 0.55, 3.95, 1.95);
    mesh(duck, new T.SphereGeometry(0.07, 8, 6), glintMat, side * 0.48, 4.02, 2.13);
  }
  const tail = mesh(duck, new T.ConeGeometry(0.7, 1.4, 16), yellow, 0, 2.5, -2.3);
  tail.rotation.x = -Math.PI / 2 - 0.5;
  for (const side of [-1, 1]) {
    const wing = mesh(duck, new T.SphereGeometry(0.9, 18, 14), yellow, side * 1.7, 1.8, -0.3);
    wing.scale.set(0.35, 0.7, 1);
  }
  root.add(duck);
  return [duck];
}

/** LEGO arch over the road: brick pillars plus a studded lintel. */
function buildArch(root: T.Group): T.Group[] {
  const { postX } = TOY_ARCH;
  const pillarColors = [0xe23b3b, 0x2b7de2, 0xf2c200, 0x2ca02c];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++)
      brick(root, pillarColors[(i + (side > 0 ? 2 : 0)) % 4], 2, side * postX, 0.5 + i * 1.0, 0, 1.6);
    brick(root, 0x7c3aed, 2, side * postX, 4.5, 0, 1.6);
    brick(root, 0xe23b3b, 2, side * postX, 5.5, 0, 1.6);
    brick(root, 0x2b7de2, 2, side * postX, 6.5, 0, 1.6);
  }
  const lintelColors = [0xf2c200, 0x2ca02c, 0xe23b3b, 0x2b7de2, 0x7c3aed, 0xf28c1e];
  const span = postX * 2;
  const bricks = 11;
  for (let i = 0; i < bricks; i++) {
    const x = -span / 2 + 1 + (i / (bricks - 1)) * (span - 2);
    const g = brick(root, lintelColors[i % lintelColors.length], 2, x, 7.6, 0, 1.6);
    g.rotation.y = Math.PI / 2;
  }
  return [];
}

/** Standing domino with 2|3 pips. */
function buildDomino(root: T.Group): T.Group[] {
  const tile = mesh(root, new RoundedBoxGeometry(3, 6, 0.9, 3, 0.15), mat(0x1c1c22, 0.4));
  tile.position.y = 3;
  mesh(root, new T.BoxGeometry(2.7, 0.12, 0.95), mat(0xd8d8e0, 0.4), 0, 3, 0);
  const pip = new T.SphereGeometry(0.28, 14, 12);
  const pipMat = mat(0xf2f2f5, 0.3);
  const top: [number, number][] = [[-0.7, 4.6], [0.7, 3.9]];
  const bottom: [number, number][] = [[-0.7, 2.1], [0, 1.5], [0.7, 0.9]];
  for (const [x, y] of [...top, ...bottom])
    for (const z of [0.42, -0.42]) mesh(root, pip, pipMat, x, y, z);
  return [];
}

/** Spinning d20: white icosahedron with dark edge lines. */
function buildDie(root: T.Group): T.Group[] {
  const die = new T.Group();
  die.position.y = 2.4;
  const geo = new T.IcosahedronGeometry(2, 0);
  const body = new T.Mesh(geo, mat(0xf4f1e8, 0.3));
  body.castShadow = true;
  die.add(body);
  const edges = new T.LineSegments(
    new T.EdgesGeometry(geo),
    new T.LineBasicMaterial({ color: 0x2a2a35 }),
  );
  die.add(edges);
  mesh(die, new T.CylinderGeometry(1.2, 1.5, 0.5, 20), mat(0x2b7de2, 0.4), 0, -2.1, 0);
  root.add(die);
  // Pedestal rings under the spinner plus a spill of mini dice.
  mesh(root, new T.CylinderGeometry(1.5, 1.8, 0.6, 20), mat(0xe23b3b, 0.4), 0, 0.3, 0);
  mesh(root, new T.TorusGeometry(1.8, 0.18, 12, 28), mat(0xf2c200, 0.4), 0, 0.62, 0).rotation.x =
    Math.PI / 2;
  const miniGeo = new T.IcosahedronGeometry(0.45, 0);
  const miniColors = [0xe23b3b, 0x2ca02c, 0x7c3aed, 0xf28c1e];
  const miniSpots: [number, number][] = [[2.6, 1.2], [-2.4, 1.6], [1.8, -2.2], [-2.0, -1.8]];
  miniSpots.forEach(([x, z], i) => {
    const mini = mesh(root, miniGeo, mat(miniColors[i], 0.4), x, 0.45, z);
    mini.rotation.set(i * 0.7, i * 1.3, i * 0.4);
  });
  return [die];
}

/** Translucent green gummy bear with a wobble pulse. */
function buildBear(root: T.Group): T.Group[] {
  const bear = new T.Group();
  const jelly = mat(0x2fd35f, 0.25, {
    transparent: true,
    opacity: 0.88,
    emissive: 0x0a4a1e,
    emissiveIntensity: 0.5,
  });
  const body = mesh(bear, new T.SphereGeometry(1.5, 24, 18), jelly, 0, 2.2, 0);
  body.scale.set(1, 1.25, 0.85);
  mesh(bear, new T.SphereGeometry(1.0, 22, 16), jelly, 0, 4.6, 0.2);
  const snout = mesh(bear, new T.SphereGeometry(0.5, 16, 12), jelly, 0, 4.4, 1.0);
  snout.scale.set(1, 0.8, 0.7);
  mesh(bear, new T.SphereGeometry(0.14, 10, 8), mat(0x1a1a22, 0.3), 0, 4.55, 1.4);
  for (const side of [-1, 1]) {
    mesh(bear, new T.SphereGeometry(0.38, 14, 12), jelly, side * 0.85, 5.35, 0.1);
    mesh(bear, new T.SphereGeometry(0.16, 10, 8), mat(0x1a1a22, 0.3), side * 0.4, 4.85, 0.95);
    const arm = mesh(bear, new T.CapsuleGeometry(0.42, 1.2, 8, 16), jelly, side * 1.6, 2.5, 0.1);
    arm.rotation.z = side * -0.5;
    const leg = mesh(bear, new T.CapsuleGeometry(0.5, 1.0, 8, 16), jelly, side * 0.75, 0.7, 0.1);
    leg.rotation.x = -0.4;
  }
  const belly = mesh(bear, new T.SphereGeometry(0.9, 18, 14), jelly, 0, 2.2, 1.0);
  belly.scale.set(0.85, 1.0, 0.5);
  root.add(bear);
  return [bear];
}

/** Wooden toy train engine: boiler, cabin, chimney, wheels. */
function buildTrain(root: T.Group): T.Group[] {
  const engine = new T.Group();
  mesh(engine, new T.BoxGeometry(3.2, 0.8, 8.5), mat(0x7a4a21, 0.6), 0, 1.0, 0);
  const boiler = mesh(engine, new T.CylinderGeometry(1.1, 1.1, 4.5, 24), mat(0x2b7de2, 0.35), 0, 2.2, 1.6);
  boiler.rotation.x = Math.PI / 2;
  mesh(engine, new T.CylinderGeometry(0.35, 0.5, 1.2, 16), mat(0x1c1c22, 0.5), 0, 3.5, 3.2);
  mesh(engine, new T.SphereGeometry(0.45, 16, 12), mat(0xf2c200, 0.35), 0, 3.2, 2.0);
  mesh(engine, new RoundedBoxGeometry(3.0, 2.6, 2.6, 2, 0.15), mat(0xe23b3b, 0.4), 0, 2.6, -2.6);
  mesh(engine, new T.BoxGeometry(3.2, 0.4, 2.8), mat(0xf2c200, 0.4), 0, 4.0, -2.6);
  for (const x of [-1.2, 1.2])
    mesh(engine, new T.BoxGeometry(0.9, 0.9, 0.1), mat(0xbfe3ff, 0.2), x, 2.9, -1.25);
  const wedge = mesh(engine, new T.BoxGeometry(2.8, 1.0, 1.4), mat(0xe23b3b, 0.4), 0, 0.9, 4.6);
  wedge.rotation.x = 0.5;
  const wheelGeo = new T.CylinderGeometry(0.7, 0.7, 0.4, 20);
  const wheelMat = mat(0x2ca02c, 0.4);
  const hubGeo = new T.CylinderGeometry(0.25, 0.25, 0.45, 12);
  const hubMat = mat(0xf2c200, 0.4);
  for (const side of [-1, 1])
    for (const z of [-2.8, -0.6, 1.8, 3.4]) {
      const w = mesh(engine, wheelGeo, wheelMat, side * 1.7, 0.7, z);
      w.rotation.z = Math.PI / 2;
      const hub = mesh(engine, hubGeo, hubMat, side * 1.7, 0.7, z);
      hub.rotation.z = Math.PI / 2;
    }
  root.add(engine);
  return [];
}

export function buildToyboxDream(root: T.Group, kind: ToyboxDreamKind): T.Group[] {
  if (kind === "rubber-duck") return buildDuck(root);
  if (kind === "brick-arch") return buildArch(root);
  if (kind === "domino") return buildDomino(root);
  if (kind === "toy-die") return buildDie(root);
  if (kind === "gummy-bear") return buildBear(root);
  return buildTrain(root);
}

/** Duck rocks, die spins, bear wobbles. */
export function poseToyboxDream(kind: ToyboxDreamKind, pivots: T.Group[], time: number) {
  const pivot = pivots[0];
  if (!pivot) return;
  if (kind === "rubber-duck") {
    pivot.rotation.z = Math.sin(time * 1.6) * 0.08;
    pivot.rotation.x = Math.sin(time * 1.1 + 1) * 0.05;
  } else if (kind === "toy-die") {
    pivot.rotation.y = time * 0.7;
  } else if (kind === "gummy-bear") {
    const w = 1 + Math.sin(time * 2.2) * 0.04;
    pivot.scale.set(w, 1 / w, w);
  }
}
