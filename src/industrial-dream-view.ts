import * as T from "three";
import type { IndustrialDreamKind } from "./custom-level";
import { IND_PIPE } from "./dungeon-hazards";

const mat = (color: number, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
  new T.MeshStandardMaterial({ color, roughness, metalness: 0.3, ...extra });

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

const RUST = 0x8a5a2e;
const STEEL = 0x6a7684;
const DARK = 0x2e343c;

/** Smokestack: banded tapered stack, beacon, rising smoke puffs. */
function buildStack(root: T.Group): T.Group[] {
  mesh(root, new T.BoxGeometry(7, 2, 7), mat(DARK, 0.7), 0, 1, 0);
  mesh(
    root,
    new T.CylinderGeometry(1.4, 2.2, 20, 20),
    mat(0x9a8a7a, 0.7, { metalness: 0.1 }),
    0,
    12,
    0,
  );
  for (const [y, color] of [[7, 0xc23b3b], [13, 0xc23b3b], [19, 0xc23b3b]] as const)
    mesh(root, new T.CylinderGeometry(1.75, 1.95, 1.6, 20), mat(color, 0.6), 0, y, 0);
  const rim = mesh(root, new T.TorusGeometry(1.5, 0.3, 12, 24), mat(DARK, 0.6), 0, 22.1, 0);
  rim.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    mesh(root, new T.BoxGeometry(0.5, 1.2, 0.5), mat(RUST, 0.7), Math.cos(a) * 2.4, 2.6, Math.sin(a) * 2.4);
  }
  const fx = new T.Group();
  const beacon = new T.Mesh(
    new T.SphereGeometry(0.5, 14, 12),
    mat(0xff3b3b, 0.3, { emissive: 0xff2020, emissiveIntensity: 2.4 }),
  );
  beacon.position.y = 23;
  fx.add(beacon);
  const puffMat = mat(0xcfd4dc, 0.9, { transparent: true, opacity: 0.55, metalness: 0 });
  const puffs: T.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const puff = new T.Mesh(new T.SphereGeometry(1.1, 14, 12), puffMat);
    puff.castShadow = false;
    puff.userData.offset = i * 1.5;
    fx.add(puff);
    puffs.push(puff);
  }
  fx.userData.puffs = puffs;
  fx.userData.beacon = beacon;
  root.add(fx);
  poseStack(fx, 0);
  return [fx];
}

function poseStack(fx: T.Group, time: number) {
  const beacon = fx.userData.beacon as T.Mesh;
  const m = beacon.material as T.MeshStandardMaterial;
  m.emissiveIntensity = 1.2 + (Math.sin(time * 3) > 0 ? 1.6 : 0);
  for (const puff of fx.userData.puffs as T.Mesh[]) {
    const t = (time * 1.5 + (puff.userData.offset as number)) % 6;
    puff.position.y = 23.5 + t;
    const s = 0.7 + t * 0.35;
    puff.scale.set(s, s, s);
  }
}

/** Power pylon: lattice legs, cross-arms, insulators, warning sign. */
function buildPylon(root: T.Group): T.Group[] {
  const steel = mat(STEEL, 0.5, { metalness: 0.6 });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = mesh(root, new T.BoxGeometry(0.7, 20, 0.7), steel, sx * 2.2, 10, sz * 2.2);
      leg.rotation.z = sx * -0.08;
      leg.rotation.x = sz * 0.08;
    }
  for (const y of [5, 10, 15])
    for (const [w, d, x, z] of [[4.4, 0.4, 0, 1.9], [4.4, 0.4, 0, -1.9], [0.4, 4.4, 1.9, 0], [0.4, 4.4, -1.9, 0]] as const)
      mesh(root, new T.BoxGeometry(w, 0.4, d), steel, x, y, z);
  for (const y of [16.5, 18.5]) {
    mesh(root, new T.BoxGeometry(9, 0.6, 0.6), steel, 0, y, 0);
    for (const x of [-4, 0, 4])
      for (let d = 0; d < 3; d++)
        mesh(root, new T.CylinderGeometry(0.3, 0.3, 0.25, 12), mat(0x1c1c22, 0.5), x, y - 0.6 - d * 0.35, 0);
  }
  for (const y of [2.5, 7.5, 12.5]) {
    for (const [rx, rz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const brace = mesh(root, new T.BoxGeometry(0.3, 5.4, 0.3), steel, rx * 2.0, y, rz * 2.0);
      brace.rotation.z = rx * 0.35;
      brace.rotation.x = rz * -0.35;
    }
  }
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      mesh(root, new T.BoxGeometry(1.4, 0.5, 1.4), mat(DARK, 0.6), sx * 2.4, 0.25, sz * 2.4);
  mesh(root, new T.CylinderGeometry(0.15, 0.3, 2.5, 8), steel, 0, 20.5, 0);
  const sign = mesh(root, new T.BoxGeometry(1.8, 1.8, 0.15), mat(0xf2c200, 0.5), 0, 4, 2.35);
  sign.rotation.z = Math.PI / 4;
  mesh(root, new T.BoxGeometry(0.25, 1.0, 0.18), mat(0x1c1c22, 0.5), 0, 4.1, 2.35);
  return [];
}

/** Gear works: two meshed counter-rotating gears on a frame. */
function buildGears(root: T.Group): T.Group[] {
  const frame = mat(DARK, 0.6);
  for (const x of [-4.5, 4.5])
    mesh(root, new T.BoxGeometry(1, 8, 2), frame, x, 4, 0);
  mesh(root, new T.BoxGeometry(10, 1, 2.5), frame, 0, 0.5, 0);
  const gears = new T.Group();
  const makeGear = (r: number, teeth: number, color: number) => {
    const g = new T.Group();
    const disc = new T.Mesh(new T.CylinderGeometry(r, r, 1.2, 36), mat(color, 0.45, { metalness: 0.7 }));
    disc.rotation.x = Math.PI / 2;
    disc.castShadow = true;
    g.add(disc);
    const hub = new T.Mesh(new T.CylinderGeometry(r * 0.25, r * 0.25, 1.8, 16), frame);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    const toothGeo = new T.BoxGeometry(0.7, 0.9, 1.2);
    const toothMat = mat(color, 0.45, { metalness: 0.7 });
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const tooth = new T.Mesh(toothGeo, toothMat);
      tooth.position.set(Math.cos(a) * (r + 0.35), Math.sin(a) * (r + 0.35), 0);
      tooth.rotation.z = a;
      tooth.castShadow = true;
      g.add(tooth);
    }
    return g;
  };
  const a = makeGear(3, 16, RUST);
  a.position.set(-2.4, 4.5, 0);
  const b = makeGear(2, 14, STEEL);
  b.position.set(2.9, 4.2, 0);
  const c = makeGear(1.2, 10, 0xc23b3b);
  c.position.set(0.2, 7.6, 0);
  gears.add(a, b, c);
  gears.userData.c = c;
  gears.userData.a = a;
  gears.userData.b = b;
  root.add(gears);
  return [gears];
}

function poseGears(gears: T.Group, time: number) {
  const a = gears.userData.a as T.Group;
  const b = gears.userData.b as T.Group;
  const c = gears.userData.c as T.Group | undefined;
  a.rotation.z = time * 0.8;
  b.rotation.z = -time * 0.8 * 1.5 + 0.3;
  if (c) c.rotation.z = -time * 0.8 * 2.5 + 0.15;
}

/** Scrap pile: mound, crushed car, wheels, loose gears, barrel. */
function buildScrap(root: T.Group): T.Group[] {
  const mound = mesh(root, new T.SphereGeometry(4, 20, 14), mat(0x4a4238, 0.9, { metalness: 0.1 }), 0, -0.8, 0);
  mound.scale.y = 0.45;
  const carColors = [0x9a3b2e, 0x2e5a7a, 0x6a6f7e];
  for (let i = 0; i < 3; i++) {
    const cab = mesh(
      root,
      new T.BoxGeometry(3.4, 1.3, 2.2),
      mat(carColors[i], 0.6, { metalness: 0.4 }),
      -2.5 + i * 2.5,
      1.1 + (i % 2) * 0.9,
      (i - 1) * 1.4,
    );
    cab.rotation.set(0.12 * i, 0.5 * i, 0.1 * (i + 1));
    mesh(
      root,
      new T.BoxGeometry(1.8, 0.9, 2.0),
      mat(carColors[(i + 1) % 3], 0.6, { metalness: 0.4 }),
      cab.position.x + 0.3,
      cab.position.y + 1,
      cab.position.z,
    ).rotation.y = cab.rotation.y;
  }
  const tireGeo = new T.TorusGeometry(0.8, 0.35, 12, 20);
  const tireMat = mat(0x1c1c22, 0.8, { metalness: 0 });
  for (const [x, y, z] of [[3.4, 0.9, 2.2], [-3.6, 0.9, -1.8], [0.5, 2.6, -2.8]] as const) {
    const tire = mesh(root, tireGeo, tireMat, x, y, z);
    tire.rotation.set(0.4 * x, 0.3 * z, 0.2);
  }
  for (const [x, z, r] of [[2.8, -2.4, 1.1], [-1.5, 3.0, 0.8]] as const) {
    const gear = mesh(root, new T.CylinderGeometry(r, r, 0.5, 14), mat(RUST, 0.6, { metalness: 0.6 }), x, 0.6, z);
    gear.rotation.set(Math.PI / 2 - 0.2, 0, 0.4);
  }
  mesh(root, new T.CylinderGeometry(0.7, 0.7, 1.9, 16), mat(0x2b6de2, 0.5, { metalness: 0.5 }), -3.2, 1.0, 2.6);
  return [];
}

/** Pipe arch: gantry posts plus a valved overhead pipe. */
function buildPipeArch(root: T.Group): T.Group[] {
  const { postX } = IND_PIPE;
  const pipeMat = mat(0x2e8a7a, 0.45, { metalness: 0.6 });
  for (const side of [-1, 1]) {
    mesh(root, new T.CylinderGeometry(0.75, 0.9, 12, 16), pipeMat, side * postX, 6, 0);
    mesh(root, new T.BoxGeometry(2.4, 0.8, 2.4), mat(DARK, 0.6), side * postX, 0.4, 0);
  }
  const span = mesh(root, new T.CylinderGeometry(1, 1, postX * 2 + 2, 20), pipeMat, 0, 11.5, 0);
  span.rotation.z = Math.PI / 2;
  for (const x of [-postX / 2, 0, postX / 2]) {
    const ring = mesh(root, new T.TorusGeometry(1.05, 0.18, 10, 20), mat(RUST, 0.5, { metalness: 0.6 }), x, 11.5, 0);
    ring.rotation.y = Math.PI / 2;
  }
  const valve = new T.Group();
  valve.position.set(postX, 7.5, 1.2);
  const wheel = new T.Mesh(new T.TorusGeometry(0.9, 0.16, 10, 20), mat(0xc23b3b, 0.4, { metalness: 0.5 }));
  wheel.castShadow = true;
  valve.add(wheel);
  for (let i = 0; i < 3; i++) {
    const spoke = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 1.7, 8), wheel.material);
    spoke.rotation.z = (i / 3) * Math.PI;
    valve.add(spoke);
  }
  root.add(valve);
  return [];
}

/** Slime tank: glass vat of bubbling green slime. */
function buildTank(root: T.Group): T.Group[] {
  mesh(root, new T.BoxGeometry(6.5, 0.8, 6.5), mat(DARK, 0.6), 0, 0.4, 0);
  const glass = mesh(
    root,
    new T.BoxGeometry(5.5, 6, 5.5),
    mat(0xbfe3ff, 0.1, { transparent: true, opacity: 0.28, metalness: 0 }),
    0,
    3.8,
    0,
  );
  glass.castShadow = false;
  const slime = new T.Group();
  mesh(slime, new T.BoxGeometry(5.1, 3.2, 5.1),
    mat(0x39d353, 0.3, { emissive: 0x1a7a2e, emissiveIntensity: 0.8, transparent: true, opacity: 0.92 }),
    0, 2.2, 0);
  const bubbles: T.Mesh[] = [];
  const bubbleGeo = new T.SphereGeometry(0.35, 12, 10);
  const bubbleMat = mat(0x9dffb0, 0.2, { emissive: 0x39d353, emissiveIntensity: 0.6 });
  for (let i = 0; i < 6; i++) {
    const bubble = new T.Mesh(
      bubbleGeo,
      i % 2 ? bubbleMat : mat(0xd6ffe0, 0.2, { emissive: 0x9dffb0, emissiveIntensity: 0.5 }),
    );
    bubble.position.set(-1.8 + (i % 3) * 1.8, 1.2 + (i % 2) * 1.4, i < 3 ? -1 : 1);
    bubble.userData.base = bubble.position.y;
    bubble.userData.phase = i * 1.1;
    slime.add(bubble);
    bubbles.push(bubble);
  }
  slime.userData.bubbles = bubbles;
  root.add(slime);
  mesh(root, new T.BoxGeometry(6, 0.6, 6), mat(RUST, 0.6), 0, 7.1, 0);
  mesh(root, new T.CylinderGeometry(0.5, 0.5, 2.4, 12), mat(STEEL, 0.5, { metalness: 0.6 }), 1.8, 8.2, 0);
  mesh(root, new T.CylinderGeometry(0.5, 0.5, 3.0, 12), mat(STEEL, 0.5, { metalness: 0.6 }), -1.5, 2.5, 3.2)
    .rotation.x = Math.PI / 2;
  return [slime];
}

function poseTank(slime: T.Group, time: number) {
  for (const bubble of slime.userData.bubbles as T.Mesh[]) {
    const base = bubble.userData.base as number;
    const phase = bubble.userData.phase as number;
    bubble.position.y = base + Math.sin(time * 2 + phase) * 0.5;
  }
}

export function buildIndustrialDream(root: T.Group, kind: IndustrialDreamKind): T.Group[] {
  if (kind === "smokestack") return buildStack(root);
  if (kind === "power-pylon") return buildPylon(root);
  if (kind === "gear-works") return buildGears(root);
  if (kind === "scrap-pile") return buildScrap(root);
  if (kind === "pipe-arch") return buildPipeArch(root);
  return buildTank(root);
}

/** Stack beacons and smoke, gears mesh, tank bubbles. */
export function poseIndustrialDream(kind: IndustrialDreamKind, pivots: T.Group[], time: number) {
  const pivot = pivots[0];
  if (!pivot) return;
  if (kind === "smokestack") poseStack(pivot, time);
  else if (kind === "gear-works") poseGears(pivot, time);
  else if (kind === "slime-tank") poseTank(pivot, time);
}
