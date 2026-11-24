import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const mat = (color: number, roughness = 0.5, extra: T.MeshStandardMaterialParameters = {}) =>
  new T.MeshStandardMaterial({ color, roughness, metalness: 0.35, ...extra });

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

/** Deterministic jitter so preview and gameplay models match exactly. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Station pillar: column, glowing ring bands, beacon. */
export function buildStationPillar(root: T.Group) {
  mesh(root, new T.BoxGeometry(4, 1, 4), mat(0x2e343c, 0.6), 0, 0.5, 0);
  mesh(root, new T.CylinderGeometry(1.2, 1.5, 13, 20), mat(0x8a94a5, 0.45), 0, 7, 0);
  const bandMat = mat(0x4ff5e0, 0.3, { emissive: 0x2a9a8a, emissiveIntensity: 1.8 });
  for (const y of [3.5, 7, 10.5]) {
    const band = mesh(root, new T.TorusGeometry(1.45, 0.18, 12, 28), bandMat, 0, y, 0);
    band.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    mesh(root, new T.BoxGeometry(0.5, 9, 0.5), mat(0x3a414c, 0.55), Math.cos(a) * 1.5, 6, Math.sin(a) * 1.5);
  }
  mesh(root, new T.SphereGeometry(0.5, 16, 12),
    mat(0xff3b3b, 0.3, { emissive: 0xff2020, emissiveIntensity: 2.4 }), 0, 13.8, 0);
  return { group: root };
}

/** Solar panel array on a truss with an emissive cell grid. */
export function buildSolarPanel(root: T.Group) {
  const steel = mat(0x6a7684, 0.5);
  for (const x of [-3.5, 3.5]) {
    mesh(root, new T.CylinderGeometry(0.3, 0.45, 3.4, 16), steel, x, 1.7, 0);
    mesh(root, new T.CylinderGeometry(0.6, 0.7, 0.4, 16), mat(0x2e343c, 0.5), x, 0.2, 0);
  }
  const array = new T.Group();
  array.position.y = 4.2;
  array.rotation.x = -0.5;
  const frame = mat(0x2e343c, 0.5);
  mesh(array, new T.BoxGeometry(10.4, 0.25, 6.4), frame, 0, -0.15, 0);
  const cell = mat(0x1a4a8a, 0.25, { emissive: 0x0a2a5a, emissiveIntensity: 0.7, metalness: 0.6 });
  for (let ix = 0; ix < 6; ix++)
    for (let iz = 0; iz < 4; iz++) {
      const cx = -4.15 + ix * 1.66, cz = -2.5 + iz * 1.66;
      mesh(array, new T.BoxGeometry(1.5, 0.12, 1.5), cell, cx, 0.05, cz);
      const bus = mesh(array, new T.CylinderGeometry(0.03, 0.03, 1.5, 6), frame, cx, 0.12, cz);
      bus.rotation.x = Math.PI / 2;
    }
  const trussMat = mat(0x3a414c, 0.5);
  for (let ix = 0; ix < 5; ix++) {
    const strut = mesh(array, new T.CylinderGeometry(0.08, 0.08, 7.2, 8), trussMat, -4 + ix * 2, -0.6, 0);
    strut.rotation.x = Math.PI / 2;
    strut.rotation.z = 0.2;
  }
  for (const [x, z] of [[-5.2, -3.2], [5.2, -3.2], [-5.2, 3.2], [5.2, 3.2]] as const)
    mesh(array, new T.SphereGeometry(0.28, 14, 10), frame, x, 0, z);
  mesh(array, new T.BoxGeometry(1.2, 0.8, 0.8), mat(0xc23b3b, 0.5), 0, -0.7, 0);
  const cable = mesh(array, new T.TorusGeometry(1.6, 0.07, 8, 24), trussMat, 0, -0.7, 0);
  cable.rotation.x = Math.PI / 2;
  root.add(array);
  return { group: root };
}

/** Satellite dish on a post with feed arm. */
export function buildSatelliteDish(root: T.Group) {
  mesh(root, new T.CylinderGeometry(0.5, 0.7, 3, 14), mat(0x6a7684, 0.5), 0, 1.5, 0);
  const points: T.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    points.push(new T.Vector2(t * 2.2, t * t * 1.1));
  }
  const dish = mesh(root, new T.LatheGeometry(points, 28), mat(0xd8dce5, 0.35, { side: T.DoubleSide }), 0, 3.2, 0);
  dish.rotation.x = -0.7;
  const arm = mesh(root, new T.CylinderGeometry(0.09, 0.09, 2.4, 8), mat(0x3a414c, 0.5), 0, 4.6, 1.1);
  arm.rotation.x = 0.9;
  mesh(root, new T.SphereGeometry(0.25, 12, 10),
    mat(0xff5a5a, 0.3, { emissive: 0xff2020, emissiveIntensity: 1.6 }), 0, 5.1, 1.9);
  return { group: root };
}

/** Moon boulder cluster. */
export function buildMoonRock(root: T.Group) {
  const rockMat = mat(0x8a8580, 0.95, { metalness: 0 });
  const main = mesh(root, new T.DodecahedronGeometry(2.4, 2), rockMat, 0, 1.6, 0);
  main.rotation.set(0.4, 1.1, 0.2);
  main.scale.y = 0.8;
  const rand = mulberry32(4242);
  for (let i = 0; i < 8; i++) {
    const r = 0.4 + rand() * 0.7;
    const a = rand() * Math.PI * 2;
    const d = 2 + rand() * 2;
    const rock = mesh(root, new T.DodecahedronGeometry(r, 1), rockMat, Math.cos(a) * d, r * 0.6, Math.sin(a) * d);
    rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
  }
  // Embedded glowing crystals.
  const gemMat = mat(0x7ae0ff, 0.2, { emissive: 0x2a9ad5, emissiveIntensity: 1.2 });
  for (const [x, y, z] of [[-1.2, 2.6, 1.4], [1.5, 1.2, -1.1], [0.4, 3.1, -0.6]] as const) {
    const gem = mesh(root, new T.OctahedronGeometry(0.35, 1), gemMat, x, y, z);
    gem.scale.y = 1.8;
  }
  return { group: root };
}

/** Cargo crate with edge frames, bolts, vents, and a glowing strip. */
export function buildSpaceCrate(root: T.Group) {
  mesh(root, new RoundedBoxGeometry(3, 3, 3, 3, 0.12), mat(0x4a5a6a, 0.55), 0, 1.5, 0);
  const edge = mat(0xf2c200, 0.5);
  for (const y of [0.2, 2.8])
    for (const z of [-1.45, 1.45])
      mesh(root, new T.BoxGeometry(3.05, 0.18, 0.18), edge, 0, y, z);
  for (const y of [0.2, 2.8])
    for (const x of [-1.45, 1.45])
      mesh(root, new T.BoxGeometry(0.18, 0.18, 3.05), edge, x, y, 0);
  for (const x of [-1, 1])
    for (const y of [1, 2])
      mesh(root, new T.BoxGeometry(0.18, 3.05, 0.18), edge, x, y, 1.45);
  const boltMat = mat(0x2e343c, 0.4, { metalness: 0.7 });
  for (const x of [-1.45, 1.45])
    for (const y of [0.2, 2.8])
      for (const z of [-1.45, 1.45])
        mesh(root, new T.SphereGeometry(0.14, 12, 10), boltMat, x, y, z);
  for (let i = 0; i < 5; i++)
    mesh(root, new T.BoxGeometry(2.2, 0.1, 0.06), mat(0x1c222c, 0.6), 0, 0.8 + i * 0.35, -1.52);
  mesh(root, new T.CylinderGeometry(0.5, 0.5, 0.25, 20), boltMat, 0, 3.1, 0);
  mesh(root, new T.BoxGeometry(3.06, 0.3, 0.6),
    mat(0x4ff5e0, 0.3, { emissive: 0x2a9a8a, emissiveIntensity: 1.5 }), 0, 1.5, 0);
  return { group: root };
}

/** Station tower: tall shaft, glowing window bands, cab, dish, and beacon. */
export function buildStationTower(root: T.Group) {
  mesh(root, new T.CylinderGeometry(6, 6.6, 1, 28), mat(0x2e343c, 0.6), 0, 0.5, 0);
  mesh(root, new T.CylinderGeometry(3.2, 3.8, 18, 24), mat(0x9aa4b5, 0.45), 0, 10, 0);
  const winMat = mat(0xbfe9ff, 0.25, { emissive: 0x54c8f5, emissiveIntensity: 2.2 });
  for (const y of [5, 9.5, 14]) {
    const band = mesh(root, new T.TorusGeometry(3.55, 0.22, 12, 32), mat(0x3a414c, 0.5), 0, y - 0.9, 0);
    band.rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const win = mesh(root, new T.BoxGeometry(0.9, 0.8, 0.2), winMat, Math.cos(a) * 3.45, y, Math.sin(a) * 3.45);
      win.rotation.y = -a + Math.PI / 2;
    }
  }
  // Mid ring deck with railing posts.
  const deck = mesh(root, new T.CylinderGeometry(4.6, 4.6, 0.4, 28), mat(0x4a5462, 0.55), 0, 12.2, 0);
  deck.receiveShadow = true;
  const railMat = mat(0x8a94a5, 0.4, { metalness: 0.6 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    mesh(root, new T.CylinderGeometry(0.06, 0.06, 1.1, 6), railMat, Math.cos(a) * 4.4, 12.9, Math.sin(a) * 4.4);
  }
  const rail = mesh(root, new T.TorusGeometry(4.4, 0.06, 8, 40), railMat, 0, 13.45, 0);
  rail.rotation.x = Math.PI / 2;
  // Pipes and ladder rungs up the shaft.
  const pipeMat = mat(0x5a6575, 0.5);
  for (const a of [0.6, 2.2, 3.8, 5.4])
    mesh(root, new T.CylinderGeometry(0.16, 0.16, 17, 10), pipeMat, Math.cos(a) * 3.9, 9.5, Math.sin(a) * 3.9);
  for (let i = 0; i < 12; i++)
    mesh(root, new T.BoxGeometry(1.1, 0.09, 0.09), railMat, 0, 2.2 + i * 1.4, 3.95);
  for (const x of [-0.55, 0.55])
    mesh(root, new T.BoxGeometry(0.09, 16.5, 0.09), railMat, x, 9.5, 3.95);
  // Top cab with a glowing window ring, roof dome, dish, mast, and beacon.
  mesh(root, new T.CylinderGeometry(4.2, 3.4, 3.2, 24), mat(0xb8c0cf, 0.4), 0, 20.6, 0);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const win = mesh(root, new T.BoxGeometry(1.1, 1.1, 0.2), winMat, Math.cos(a) * 3.9, 20.8, Math.sin(a) * 3.9);
    win.rotation.y = -a + Math.PI / 2;
  }
  mesh(root, new T.SphereGeometry(3.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd8dce5, 0.35), 0, 22.2, 0);
  const points: T.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    points.push(new T.Vector2(t * 1.6, t * t * 0.8));
  }
  const dish = mesh(root, new T.LatheGeometry(points, 24), mat(0xd8dce5, 0.35, { side: T.DoubleSide }), 2.2, 23.4, 0);
  dish.rotation.z = -0.6;
  mesh(root, new T.CylinderGeometry(0.12, 0.12, 2.6, 8), pipeMat, -1.6, 24.4, 0);
  mesh(root, new T.SphereGeometry(0.42, 16, 12),
    mat(0xff3b3b, 0.3, { emissive: 0xff2020, emissiveIntensity: 2.6 }), -1.6, 25.9, 0);
  return { group: root };
}

/** Habitat dome: glowing window band, airlock door, vents, and lamps. */
export function buildHabitatDome(root: T.Group) {
  mesh(root, new T.CylinderGeometry(8.2, 8.8, 1.2, 36), mat(0x2e343c, 0.6), 0, 0.6, 0);
  const shell = mesh(root, new T.SphereGeometry(7.5, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(0xe4e8f0, 0.4), 0, 1.2, 0);
  shell.receiveShadow = true;
  const winMat = mat(0xffe9a8, 0.25, { emissive: 0xf5b83d, emissiveIntensity: 2.0 });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.2) continue; // airlock gap faces +z
    const r = 7.15, y = 3.4;
    const win = mesh(root, new T.BoxGeometry(1.2, 1.3, 0.25), winMat, Math.cos(a) * r, y, Math.sin(a) * r);
    win.rotation.y = -a + Math.PI / 2;
  }
  const trim = mesh(root, new T.TorusGeometry(7.5, 0.18, 10, 48), mat(0x9a5fe0, 0.4, { emissive: 0x5a2ea8, emissiveIntensity: 0.8 }), 0, 1.6, 0);
  trim.rotation.x = Math.PI / 2;
  // Airlock door with frame, steps, and lamps.
  mesh(root, new T.BoxGeometry(3.4, 3.6, 0.6), mat(0x3a414c, 0.5), 0, 2.6, 7.3);
  mesh(root, new T.BoxGeometry(2.2, 2.8, 0.7),
    mat(0x54c8f5, 0.3, { emissive: 0x1a6a9a, emissiveIntensity: 1.2 }), 0, 2.2, 7.35);
  for (let i = 0; i < 3; i++)
    mesh(root, new T.BoxGeometry(3.8 - i * 0.5, 0.35, 1.1), mat(0x4a5462, 0.55), 0, 0.35 + i * 0.35, 8.2 - i * 0.4);
  const lampMat = mat(0xfff2c8, 0.3, { emissive: 0xffe9a8, emissiveIntensity: 2.4 });
  for (const x of [-2.2, 2.2]) {
    mesh(root, new T.CylinderGeometry(0.09, 0.12, 2.6, 8), mat(0x5a6575, 0.5), x, 1.3, 7.6);
    mesh(root, new T.SphereGeometry(0.3, 14, 10), lampMat, x, 2.8, 7.6);
  }
  // Roof vents, beacon, and perimeter light posts.
  for (const [x, z] of [[-3.5, -2], [3.5, -2], [0, -4.5]] as const) {
    mesh(root, new T.CylinderGeometry(0.5, 0.65, 1.6, 12), mat(0x6a7684, 0.5), x, 7.4, z);
    mesh(root, new T.SphereGeometry(0.5, 12, 8), mat(0x2e343c, 0.5), x, 8.3, z);
  }
  mesh(root, new T.CylinderGeometry(0.1, 0.14, 2.2, 8), mat(0x6a7684, 0.5), 0, 9.6, 0);
  mesh(root, new T.SphereGeometry(0.36, 14, 10),
    mat(0x4ff5e0, 0.3, { emissive: 0x2a9a8a, emissiveIntensity: 2.4 }), 0, 10.9, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    mesh(root, new T.CylinderGeometry(0.08, 0.1, 1.6, 8), mat(0x4a5462, 0.5), Math.cos(a) * 9.6, 0.8, Math.sin(a) * 9.6);
    mesh(root, new T.SphereGeometry(0.22, 12, 8), lampMat, Math.cos(a) * 9.6, 1.75, Math.sin(a) * 9.6);
  }
  return { group: root };
}

/** Tumbling asteroid: jittered icosahedron with crater pits. */
export function buildAsteroid(root: T.Group) {
  const geo = new T.IcosahedronGeometry(2.6, 2);
  const rand = mulberry32(777);
  const pos = geo.attributes.position as T.BufferAttribute;
  const v = new T.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(0.82 + rand() * 0.36);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const rock = mesh(root, geo, mat(0x6e655c, 0.95, { metalness: 0.05 }), 0, 0, 0);
  const pitMat = mat(0x3a352f, 0.95, { metalness: 0 });
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2, b = rand() * Math.PI;
    const pit = mesh(root, new T.SphereGeometry(0.5 + rand() * 0.4, 12, 10), pitMat,
      Math.sin(b) * Math.cos(a) * 2.4, Math.cos(b) * 2.4, Math.sin(b) * Math.sin(a) * 2.4);
    pit.scale.set(1, 1, 0.4);
    pit.lookAt(0, 0, 0);
  }
  return { group: root, rock };
}

export function poseAsteroid(
  model: ReturnType<typeof buildAsteroid>,
  root: T.Group,
  x: number,
  y: number,
  z: number,
  time: number,
) {
  root.position.set(x, y, z);
  model.rock.rotation.set(time * 0.7, time * 0.45, time * 0.3);
}

/** Meteor: burning rock with a flame tail. */
export function buildMeteor(root: T.Group) {
  const rock = mesh(root, new T.DodecahedronGeometry(1.8, 1), mat(0x5a4a3a, 0.9, { metalness: 0.1 }), 0, 0, 0);
  const flameMat = mat(0xff7a1a, 0.4, {
    emissive: 0xff5a00, emissiveIntensity: 2.6, transparent: true, opacity: 0.9,
  });
  const flames = new T.Group();
  const tail = new T.Mesh(new T.ConeGeometry(1.5, 5, 14), flameMat);
  tail.position.y = 3.4;
  tail.castShadow = false;
  flames.add(tail);
  const rand = mulberry32(31337);
  for (let i = 0; i < 6; i++) {
    const ember = new T.Mesh(new T.SphereGeometry(0.22, 8, 8), flameMat);
    ember.position.set((rand() - 0.5) * 3, 1.5 + rand() * 4.5, (rand() - 0.5) * 3);
    ember.castShadow = false;
    flames.add(ember);
  }
  root.add(flames);
  return { group: root, rock, flames };
}

export function poseMeteor(
  model: ReturnType<typeof buildMeteor>,
  root: T.Group,
  x: number,
  y: number,
  z: number,
  live: boolean,
  time: number,
) {
  root.position.set(x, y, z);
  root.visible = live;
  model.rock.rotation.y = time * 2.2;
  const w = 1 + 0.18 * Math.sin(time * 13) + 0.09 * Math.sin(time * 29);
  model.flames.scale.set(w, 1, w);
}

/** Walking alien: big head, black eyes, swinging limbs. */
export function buildAlien(root: T.Group) {
  const skin = mat(0x59d668, 0.55, { metalness: 0.05 });
  const body = new T.Group();
  mesh(body, new T.CapsuleGeometry(0.55, 0.9, 8, 16), skin, 0, 1.6, 0);
  mesh(body, new T.SphereGeometry(0.75, 22, 16), skin, 0, 2.9, 0);
  const eyeMat = mat(0x0c0c12, 0.2);
  for (const side of [-1, 1]) {
    const eye = mesh(body, new T.SphereGeometry(0.22, 14, 12), eyeMat, side * 0.3, 3.0, 0.62);
    eye.scale.set(1, 1.35, 0.55);
    eye.rotation.z = side * -0.35;
    const stalk = mesh(body, new T.CylinderGeometry(0.05, 0.05, 0.5, 8), skin, side * 0.3, 3.75, 0);
    stalk.rotation.z = side * -0.3;
    mesh(body, new T.SphereGeometry(0.11, 10, 8),
      mat(0xbfff9e, 0.3, { emissive: 0x59d668, emissiveIntensity: 1.2 }), side * 0.38, 4.0, 0);
  }
  const limbs: T.Group[] = [];
  for (const [x, y, upper, lower] of [[-0.65, 1.9, 0.16, 0.7], [0.65, 1.9, 0.16, 0.7], [-0.3, 1.0, 0.2, 0.9], [0.3, 1.0, 0.2, 0.9]] as const) {
    const pivot = new T.Group();
    pivot.position.set(x, y, 0);
    mesh(pivot, new T.CapsuleGeometry(upper, lower, 6, 12), skin, 0, -lower / 2 - 0.1, 0);
    body.add(pivot);
    limbs.push(pivot);
  }
  root.add(body);
  return { group: root, body, limbs };
}

export function poseAlien(
  model: ReturnType<typeof buildAlien>,
  root: T.Group,
  x: number,
  baseY: number,
  z: number,
  yaw: number,
  phase: number,
) {
  root.position.set(x, baseY, z);
  root.rotation.y = yaw;
  model.body.position.y = Math.abs(Math.sin(phase)) * 0.18;
  model.limbs.forEach((limb, i) => {
    limb.rotation.x = Math.sin(phase + (i % 2 ? Math.PI : 0)) * 0.6;
  });
}

/** Flying saucer with rim lights and a zap beam. */
export function buildUfo(root: T.Group) {
  const hull = mat(0x9aa2b5, 0.3, { metalness: 0.85 });
  const saucer = mesh(root, new T.CylinderGeometry(3.2, 1.4, 1.2, 28), hull, 0, 0, 0);
  saucer.scale.y = 1;
  mesh(root, new T.SphereGeometry(1.3, 22, 14),
    mat(0xbfe9ff, 0.1, { transparent: true, opacity: 0.75, metalness: 0.1 }), 0, 0.9, 0);
  const rimMat = mat(0xff5a5a, 0.3, { emissive: 0xff2020, emissiveIntensity: 2 });
  const rimMat2 = mat(0x5aff8a, 0.3, { emissive: 0x20ff60, emissiveIntensity: 2 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    mesh(root, new T.SphereGeometry(0.22, 10, 8), i % 2 ? rimMat : rimMat2,
      Math.cos(a) * 2.9, -0.15, Math.sin(a) * 2.9);
  }
  const beamMat = mat(0xff3b3b, 0.3, {
    emissive: 0xff1010, emissiveIntensity: 3, transparent: true, opacity: 0.85,
  });
  const beam = new T.Mesh(new T.CylinderGeometry(0.35, 0.55, 1, 12, 1, true), beamMat);
  beam.castShadow = false;
  beam.visible = false;
  root.add(beam);
  return { group: root, beam };
}

export function poseUfo(
  model: ReturnType<typeof buildUfo>,
  root: T.Group,
  x: number,
  y: number,
  z: number,
  yaw: number,
  beamTo: { x: number; y: number; z: number } | null,
  time: number,
) {
  root.position.set(x, y + Math.sin(time * 2.2) * 0.4, z);
  root.rotation.y = yaw + time * 0.8;
  if (!beamTo) {
    model.beam.visible = false;
    return;
  }
  model.beam.visible = true;
  // Aim the beam cylinder from the saucer belly at the recorded hit point.
  const from = new T.Vector3(x, y - 0.6, z);
  const to = new T.Vector3(beamTo.x, beamTo.y, beamTo.z);
  const mid = from.clone().add(to).multiplyScalar(0.5).sub(root.position);
  model.beam.position.copy(mid);
  model.beam.scale.y = Math.max(0.1, from.distanceTo(to));
  model.beam.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    to.clone().sub(from).normalize(),
  );
}
