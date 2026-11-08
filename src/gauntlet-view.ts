import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { GauntletKind } from "./custom-level";
import type { DungeonHazard } from "./dungeon-hazards";
import type { GauntletPhysics } from "./gauntlet-physics";
import {
  SCREW_FIELD_SIZE, SCREW_POSITIONS, SPIKE_SIDE_X, VOLCANO_RIM,
  clawOpenness, screwLift, screwWave, spikeHeight, volcanoPhase,
} from "./gauntlet-timing";

const surface = (color: number, metalness = 0.28, roughness = 0.38) =>
  new T.MeshStandardMaterial({ color, metalness, roughness });
type XYZ = [number, number, number];
type State = NonNullable<ReturnType<GauntletPhysics["machines"]["get"]>>["state"];
type Animate = (time: number, state?: State) => void;
function mesh(root: T.Group, geometry: T.BufferGeometry, material: T.Material, at: XYZ) {
  const object = new T.Mesh(geometry, material);
  object.position.set(...at);
  object.castShadow = object.receiveShadow = true;
  root.add(object);
  return object;
}
function box(root: T.Group, material: T.Material, at: XYZ, size: XYZ, round = 0) {
  return mesh(root, round ? new RoundedBoxGeometry(...size, 3, round) : new T.BoxGeometry(...size), material, at);
}
function link(root: T.Group, material: T.Material, from: XYZ, to: XYZ, radius: number, tip = radius) {
  const a = new T.Vector3(...from), b = new T.Vector3(...to);
  const mid = a.clone().lerp(b, 0.5);
  const object = mesh(root, new T.CylinderGeometry(tip, radius, a.distanceTo(b), 12), material, [mid.x, mid.y, mid.z]);
  object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.sub(a).normalize());
}

function startGate(root: T.Group): Animate {
  const gray = surface(0x6f7d87, 0.64), dark = surface(0x293742), white = surface(0xf1e9cf);
  for (const side of [-1, 1]) {
    box(root, gray, [side * 9.8, 3.25, 0], [1.65, 6.5, 1.8], 0.18);
    box(root, dark, [side * 9.8, 0.35, 0], [2.8, 0.7, 3.2], 0.14);
  }
  box(root, gray, [0, 6.6, 0], [21.3, 1.75, 2.15], 0.22);
  box(root, dark, [0, 6.6, -1.1], [10, 1.1, 0.17], 0.08);
  for (const x of [-3, 0, 3]) box(root, white, [x, 6.6, -1.22], [1.3, 0.32, 0.1]);
  return () => {};
}

function screwField(root: T.Group, h: DungeonHazard): Animate {
  const blue = surface(0x196ca6), rim = surface(0x42a6dc), black = surface(0x0e293e);
  const shaft = surface(0x9baebc, 0.75);
  const heads = [0xef5031, 0xf7cb35, 0x7ecb51, 0x2d45a0].map((color) => surface(color));
  box(root, blue, [0, -1.48, 0], [SCREW_FIELD_SIZE, 2.96, SCREW_FIELD_SIZE], 1.35);
  for (const side of [-1, 1]) {
    box(root, rim, [side * 27.6, 0.32, 0], [0.64, 0.64, 54], 0.22);
    box(root, rim, [0, 0.32, side * 27.6], [54, 0.64, 0.64], 0.22);
  }
  const screws = SCREW_POSITIONS.map(({ x, z }, i) => {
    mesh(root, new T.CylinderGeometry(1.55, 1.55, 0.11, 20), black, [x, 0.04, z]);
    const pivot = new T.Group();
    root.add(pivot);
    pivot.position.set(x, 0, z);
    mesh(pivot, new T.CylinderGeometry(1.16, 1.3, 0.62, 12), heads[(i * 13 + Math.floor(i / 7)) % heads.length], [0, 0.37, 0]);
    box(pivot, black, [0, 0.685, 0], [1.45, 0.06, 0.2]);
    box(pivot, black, [0, 0.688, 0], [0.2, 0.06, 1.45]);
    mesh(pivot, new T.CylinderGeometry(0.48, 0.42, 5.7, 12), shaft, [0, -2.55, 0]);
    for (let n = 0; n < 7; n++) {
      const thread = mesh(pivot, new T.TorusGeometry(0.55, 0.125, 5, 12), shaft, [0, -0.35 - n * 0.67, 0]);
      thread.rotation.set(Math.PI / 2, 0.24, 0);
    }
    return pivot;
  });
  return (time) => {
    for (const screw of screws) screw.position.y = screw.rotation.y = 0;
    for (const { index, age } of screwWave(time, h.phase).shots) {
      screws[index].position.y = screwLift(age);
      screws[index].rotation.y = screws[index].position.y * 1.15;
    }
  };
}

function volcano(root: T.Group, h: DungeonHazard): Animate {
  const rock = surface(0x77412d, 0.04, 0.87), rim = surface(0xa64a22, 0.06, 0.67);
  const lava = new T.MeshStandardMaterial({ color: 0xff7626, emissive: 0xff3810, emissiveIntensity: 1.8 });
  const profile = [[0, 0], [7.1, 0], [6.9, 1.1], [5.6, 2.7], [4.65, 4.5], [3.5, 6.55], [3.1, 7], [2.2, 7], [1.95, 5.8], [0, 5.8]];
  const mountain = new T.LatheGeometry(profile.map(([x, y]) => new T.Vector2(x, y)), 32);
  const pos = mountain.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(x, z);
    const scale = 1 + 0.08 * Math.cos(a * 5) + 0.055 * Math.sin(a * 9 + pos.getY(i));
    pos.setXYZ(i, x * scale, pos.getY(i), z * scale);
  }
  mountain.computeVertexNormals();
  mesh(root, mountain, rock, [0, 0, 0]);
  mesh(root, new T.CylinderGeometry(2.23, 2.0, 0.28, 28), lava, [0, 5.94, 0]);
  const lip = mesh(root, new T.TorusGeometry(2.63, 0.36, 9, 28), rim, [0, VOLCANO_RIM - 0.1, 0]);
  lip.rotation.x = Math.PI / 2;
  const plume = new T.Group();
  root.add(plume);
  const ash = new T.MeshStandardMaterial({ color: 0x3d3030, transparent: true, opacity: 0.62, depthWrite: false, roughness: 1 });
  const fumes = Array.from({ length: 14 }, () => mesh(plume, new T.SphereGeometry(1, 12, 8), ash, [0, 0, 0]));
  const embers = Array.from({ length: 19 }, () => mesh(plume, new T.IcosahedronGeometry(0.43, 1), lava, [0, 0, 0]));
  for (const particle of [...fumes, ...embers]) {
    particle.castShadow = particle.receiveShadow = false;
    particle.userData.animate = true;
  }
  return (time) => {
    const { erupting, warning } = volcanoPhase(time + h.phase);
    plume.visible = warning || erupting;
    lava.emissiveIntensity = erupting ? 4.5 : warning ? 2.7 : 1.5;
    if (!plume.visible) return;
    const particles = (items: T.Mesh[], smoke: boolean) => items.forEach((particle, i) => {
      const t = (time * (smoke ? 0.79 : 1.65) + i * 0.347) % 1;
      const angle = i * 2.4 + time * 1.6;
      const reach = (smoke ? 4.7 : 3.0) * t + 0.65;
      particle.visible = erupting || (smoke && i < 5);
      particle.position.set(Math.sin(angle) * reach, VOLCANO_RIM + t * (erupting ? (smoke ? 41 : 28) : 7), Math.cos(angle) * reach);
      particle.scale.setScalar(smoke ? 0.9 + t * 4.1 : 1.5 - t * 0.68);
    });
    particles(fumes, true);
    particles(embers, false);
  };
}

function spikeGates(root: T.Group): Animate {
  const white = surface(0xe7e9e3), red = surface(0xc34230), green = surface(0x53c279), dark = surface(0x273844);
  for (const x of [-27, -9, 9, 27]) {
    box(root, white, [x, 5.15, 0], [1.05, 10.3, 2.3], 0.18);
    box(root, dark, [x, 0.35, 0], [2.3, 0.7, 4], 0.14);
  }
  box(root, white, [0, 10.4, 0], [55, 1.75, 2.65], 0.22);
  for (const x of [-18, 0, 18])
    box(root, x ? red : green, [x, 10.4, -1.39], [7.4, 0.75, 0.19], 0.09);
  const spikes = SPIKE_SIDE_X.map((x) => {
    const pivot = new T.Group();
    root.add(pivot);
    pivot.position.set(x, 10, 0);
    box(pivot, red, [0, 6.9, 0], [6.6, 0.85, 4], 0.22);
    const point = mesh(pivot, new T.ConeGeometry(3.0, 7.0, 6), dark, [0, 3.5, 0]);
    point.rotation.z = Math.PI;
    return pivot;
  });
  return (time, state) => spikes.forEach((spike, i) => {
    spike.position.y = spikeHeight(state?.kind === "spike-gates" ? time - state.started[i] : -1);
  });
}

function drillTank(root: T.Group): Animate {
  const armor = surface(0x185994, 0.62), edge = surface(0x46a5d7, 0.56);
  const rubber = surface(0x242b33, 0.08), steel = surface(0xb6c2cc, 0.76), dark = surface(0x566775, 0.7);
  const wedge = new T.Shape([new T.Vector2(-4.5, -3.8), new T.Vector2(4.5, -3.8), new T.Vector2(0, 4.8)]);
  const hull = new T.ExtrudeGeometry(wedge, { depth: 1.9, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.3, bevelSegments: 2 });
  hull.rotateX(Math.PI / 2).translate(0, 2.8, 0);
  mesh(root, hull, armor, [0, 0, 0]);
  for (const side of [-1, 1]) {
    box(root, rubber, [side * 3.25, 0.95, -1.15], [1.7, 1.9, 5.95], 0.48);
    for (let i = 0; i < 4; i++) {
      const roller = mesh(root, new T.CylinderGeometry(0.67, 0.67, 0.2, 12), steel, [side * 4.11, 0.86, -3.05 + i * 1.25]);
      roller.rotation.z = Math.PI / 2;
    }
    link(root, edge, [side * 4.15, 2.95, -3.55], [0, 2.95, 4.5], 0.17);
  }
  box(root, edge, [0, 2.95, -1.12], [2.35, 0.55, 1.9], 0.2);
  const drill = new T.Group();
  root.add(drill);
  drill.position.set(0, 1.65, 3.35);
  const bit = mesh(drill, new T.ConeGeometry(1.48, 6.9, 22), steel, [0, 0, 3.45]);
  bit.rotation.x = Math.PI / 2;
  const coil = Array.from({ length: 82 }, (_, i) => {
    const t = i / 81, a = t * Math.PI * 9, r = 1.43 * (1 - t) + 0.03;
    return new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, t * 6.8);
  });
  mesh(drill, new T.TubeGeometry(new T.CatmullRomCurve3(coil), 96, 0.135, 6, false), dark, [0, 0, 0]);
  return (time, state) => {
    drill.rotation.z = -time * 22;
    if (state?.kind === "drill-tank") {
      root.position.copy(state.body.translation());
      root.rotation.y = state.yaw;
    }
  };
}

function crusherClaw(root: T.Group): Animate {
  const lime = surface(0x67cf28, 0.45), green = surface(0x2f7c32), steel = surface(0xc2cfab, 0.66);
  box(root, green, [0, 0.4, -2.7], [7.9, 0.8, 6.0], 0.35);
  box(root, lime, [0, 2.85, -2.45], [4.2, 4.9, 3.1], 0.36);
  link(root, green, [0, 5.15, -2.7], [0, 4.0, 0.45], 1.3, 1.15);
  box(root, green, [0, 3.1, 0], [6.0, 2.1, 1.85], 0.32);
  const sides = [-1, 1];
  const pincers = sides.map((side) => {
    const arm = new T.Group();
    root.add(arm);
    arm.position.set(side * 2.65, 2.2, 0.0);
    const points: XYZ[] = [[0, 0, 0], [side * 1.6, -0.1, 2.2], [side * 1.95, -0.5, 4.9], [side * 0.8, -0.7, 7.0], [-side * 1.2, -0.68, 7.4]];
    for (let i = 1; i < points.length; i++)
      link(arm, lime, points[i - 1], points[i], 1.26 - i * 0.16, 1.1 - i * 0.2);
    for (const [x, y, z] of points.slice(1, -1))
      box(arm, green, [x - side * 0.62, y, z], [0.9, 1.0, 1.35], 0.2);
    link(arm, steel, [0, 1.1, 0], [0, -1.1, 0], 0.55);
    return arm;
  });
  return (time, state) => {
    const openness = state?.kind === "crusher-claw" ? clawOpenness(time - state.started, state.caught) : 1;
    pincers.forEach((arm, i) => { arm.rotation.y = sides[i] * (-0.22 + openness * 0.69); });
  };
}

export function buildGauntletMachine(root: T.Group, h: DungeonHazard & { kind: GauntletKind }): Animate {
  const build = {
    "start-gate": startGate, "screw-field": screwField, volcano,
    "spike-gates": spikeGates, "drill-tank": drillTank, "crusher-claw": crusherClaw,
  }[h.kind];
  const animate = build(root, h);
  animate(0);
  return animate;
}
