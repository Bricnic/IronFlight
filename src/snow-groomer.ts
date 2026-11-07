import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PARTS } from "./damage";
import type { VehiclePart } from "./vehicles";
import type { TruckMaterials } from "./truck";

/** Monster-clone colliders: identical sim behavior, groomer visuals. */
export const GROOMER_PARTS: VehiclePart[] = PARTS.map((p) => ({ ...p }));
export const GROOMER_SUSPENSION: [number, number, number][] = [
  [1.65, -0.35, 1.65],
  [-1.65, -0.35, 1.65],
  [1.65, -0.35, -1.65],
  [-1.65, -0.35, -1.65],
];
export const GROOMER_WHEEL_RADIUS = 1.05;
export const GROOMER_SUSPENSION_REST = 0.6;

/** Lime snow groomer: twin tracks, bluff cab, mesh plow blade, rear bed. */
export function createSnowGroomer(_materials: TruckMaterials = {}) {
  const groomer = new T.Group();
  groomer.name = "iron-flight-groomer";
  // Fixed lime livery: the tuning picker must not recolor the cab.
  const lime = new T.MeshStandardMaterial({
    color: 0xb5d900,
    metalness: 0.1,
    roughness: 0.45,
  });
  const limeDark = new T.MeshStandardMaterial({
    color: 0x8fae00,
    metalness: 0.1,
    roughness: 0.5,
  });
  const glass = new T.MeshStandardMaterial({
    color: 0x232a30,
    metalness: 0.2,
    roughness: 0.1,
  });
  const seal = new T.MeshStandardMaterial({
    color: 0x101214,
    roughness: 0.7,
  });
  const belt = new T.MeshStandardMaterial({
    color: 0x1d1f24,
    roughness: 0.9,
  });
  const grouser = new T.MeshStandardMaterial({
    color: 0x2c2f34,
    metalness: 0.3,
    roughness: 0.7,
  });
  const roadWheel = new T.MeshStandardMaterial({
    color: 0x7a7f86,
    metalness: 0.6,
    roughness: 0.4,
  });
  const bladeGray = new T.MeshStandardMaterial({
    color: 0x7b8188,
    metalness: 0.5,
    roughness: 0.45,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x26282c,
    metalness: 0.4,
    roughness: 0.6,
  });
  const armDark = new T.MeshStandardMaterial({
    color: 0x2a2d31,
    metalness: 0.5,
    roughness: 0.5,
  });
  const alu = new T.MeshStandardMaterial({
    color: 0xa8adb3,
    metalness: 0.7,
    roughness: 0.35,
  });
  const beacon = new T.MeshStandardMaterial({
    color: 0xff7a00,
    emissive: 0xff7a00,
    emissiveIntensity: 2.0,
  });
  const lampWhite = new T.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.0,
  });
  const latchWhite = new T.MeshStandardMaterial({
    color: 0xf2f3f4,
    roughness: 0.4,
  });

  function mesh(
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    material: T.Material,
    pos: number[] = [0, 0, 0],
  ) {
    const m = new T.Mesh(geometry, material);
    m.position.fromArray(pos);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function rounded(
    parent: T.Object3D,
    size: number[],
    pos: number[],
    mat: T.Material = lime,
    segments = 4,
    radius = 0.04,
  ) {
    return mesh(
      parent,
      new RoundedBoxGeometry(size[0], size[1], size[2], segments, radius),
      mat,
      pos,
    );
  }
  function roadDisc(
    parent: T.Object3D,
    pos: number[],
    r = 0.32,
  ) {
    const d = mesh(parent, new T.CylinderGeometry(r, r, 0.2, 36), roadWheel, pos);
    d.rotation.z = Math.PI / 2;
    const hubcap = mesh(
      parent,
      new T.CylinderGeometry(r * 0.35, r * 0.35, 0.24, 12),
      dark,
      pos,
    );
    hubcap.rotation.z = Math.PI / 2;
    return d;
  }
  function bar(
    parent: T.Object3D,
    a: T.Vector3,
    b: T.Vector3,
    radius = 0.05,
    mat: T.Material = armDark,
  ) {
    const m = mesh(
      parent,
      new T.CylinderGeometry(radius, radius, a.distanceTo(b), 10),
      mat,
    );
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return m;
  }

  const groups = new Map<string, T.Group>();
  for (const def of GROOMER_PARTS) {
    const g = new T.Group();
    g.name = def.id;
    g.position.fromArray(def.pos);
    groomer.add(g);
    groups.set(def.id, g);
    if (def.id.startsWith("wheel")) {
      roadDisc(g, [0, 0, 0]);
    } else if (def.id === "chassis-front") {
      rounded(g, [2.0, 0.5, 2.6], [0, -0.5, 0.1], dark);
    } else if (def.id === "chassis-rear") {
      rounded(g, [2.0, 0.5, 1.8], [0, -0.5, -0.05], dark);
    } else if (def.id === "hood") {
      rounded(g, [2.0, 1.0, 1.3], [0, -0.3, 0.1], lime);
    } else if (def.id === "bumper-front") {
      rounded(g, [1.6, 0.4, 0.6], [0, -0.8, 0.2], armDark);
    } else if (def.id === "roof") {
      rounded(g, [1.9, 1.0, 1.9], [0, -0.3, 0.3], lime);
    } else if (def.id.startsWith("door")) {
      const base = rounded(g, [0.16, 1.2, 1.8], [0, -0.3, 0.2], lime);
      base.name = "door-base";
    } else if (def.id === "bed") {
      rounded(g, [2.3, 0.15, 2.4], [0, -0.6, -0.35], alu);
    } else {
      rounded(g, [2.0, 0.5, 0.4], [0, -1.1, 0], dark);
    }
  }

  const front = groups.get("chassis-front")!;
  const rear = groups.get("chassis-rear")!;
  const hood = groups.get("hood")!;
  const roof = groups.get("roof")!;
  const bed = groups.get("bed")!;
  const push = groups.get("bumper-front")!;
  const tail = groups.get("bumper-rear")!;

  // Twin tracks: belt boxes, 22 grousers each, 4 road wheels per flank
  // (2 static + the 2 spinning wheel-group discs).
  for (const side of [-1, 1]) {
    rounded(front, [0.8, 0.95, 2.9], [side * 1.1, -1.28, 0.65], belt);
    rounded(rear, [0.8, 0.95, 2.9], [side * 1.1, -1.28, 0.15], belt);
    // Sloped track ends.
    const noseWedge = rounded(
      front,
      [0.8, 0.7, 0.5],
      [side * 1.1, -1.45, 2.15],
      belt,
      1,
      0.05,
    );
    noseWedge.rotation.x = 0.5;
    const tailWedge = rounded(
      rear,
      [0.8, 0.7, 0.5],
      [side * 1.1, -1.45, -1.35],
      belt,
      1,
      0.05,
    );
    tailWedge.rotation.x = -0.5;
    for (let i = 0; i < 22; i++) {
      const z = -2.62 + i * 0.249;
      const top = i % 2 === 0;
      const y = top ? -0.76 : -1.8;
      const parent = z >= 0 ? front : rear;
      const lz = z - (z >= 0 ? 0.8 : -1.6);
      rounded(
        parent,
        [0.86, 0.12, 0.18],
        [side * 1.1, y, lz],
        grouser,
        2,
        0.02,
      );
    }
    roadDisc(front, [side * 1.1, -1.28, -0.05]);
    roadDisc(rear, [side * 1.1, -1.28, 0.85]);
  }

  // Bluff cab nose + raked windshield band with divider and wiper.
  rounded(roof, [1.9, 0.6, 0.15], [0, -1.05, 1.15], lime, 1, 0.02);
  rounded(roof, [1.85, 0.9, 0.06], [0, -0.35, 1.22], seal, 1, 0.02);
  const windshield = rounded(roof, [1.7, 0.8, 0.08], [0, -0.35, 1.28], glass, 1, 0.02);
  windshield.rotation.x = 0.18;
  rounded(roof, [0.06, 0.8, 0.1], [0, -0.35, 1.3], seal, 1, 0.01);
  for (const side of [-1, 1]) {
    rounded(roof, [0.12, 0.9, 0.12], [side * 0.9, -0.35, 1.25], lime, 1, 0.02);
  }
  bar(
    roof,
    new T.Vector3(-0.4, -0.7, 1.36),
    new T.Vector3(-0.1, -0.35, 1.34),
    0.02,
    seal,
  );
  // Roof beacons on lime plinths + mirror blocks on the cab corners.
  for (const x of [-0.6, 0, 0.6]) {
    rounded(roof, [0.18, 0.1, 0.18], [x, 0.22, 1.0], limeDark, 1, 0.02);
    mesh(roof, new T.CylinderGeometry(0.07, 0.09, 0.12, 12), beacon, [x, 0.32, 1.0]);
  }
  for (const side of [-1, 1]) {
    rounded(roof, [0.16, 0.22, 0.16], [side * 1.0, -0.35, 1.2], limeDark, 1, 0.02);
    bar(
      roof,
      new T.Vector3(side * 0.92, -0.35, 1.2),
      new T.Vector3(side * 0.75, -0.35, 1.2),
      0.025,
      seal,
    );
  }

  // Cab flanks: side glass, door seam, latch, logo decal, engine vents.
  for (const side of [-1, 1]) {
    const door = groups.get(side > 0 ? "door-left" : "door-right")!;
    // Trim sits proud of the 0.08 door face; coplanar faces z-fight.
    rounded(door, [0.06, 0.85, 1.55], [side * 0.06, 0.42, 0.6], seal, 1, 0.01);
    const pane = rounded(
      door,
      [0.08, 0.7, 1.4],
      [side * 0.06, 0.42, 0.6],
      glass,
      1,
      0.01,
    );
    pane.name = "door-glass";
    rounded(door, [0.02, 1.0, 0.03], [side * 0.085, -0.3, -0.35], seal, 1, 0.005);
    rounded(door, [0.06, 0.12, 0.2], [side * 0.1, -0.2, -0.2], latchWhite, 1, 0.01);
    rounded(door, [0.02, 0.15, 0.45], [side * 0.085, -0.45, 0.45], seal, 1, 0.005);
    for (let i = 0; i < 3; i++) {
      rounded(
        door,
        [0.06, 0.08, 0.7],
        [side * 0.06, -0.1 + i * 0.18, -0.7],
        seal,
        1,
        0.01,
      );
    }
  }

  // Exhaust stack with rear-facing tip + rear work lamp bar.
  const stack = mesh(
    bed,
    new T.CylinderGeometry(0.1, 0.1, 1.3, 14),
    dark,
    [-0.9, 0.35, 0.95],
  );
  stack.position.y = 0.35;
  const tip = mesh(
    bed,
    new T.CylinderGeometry(0.1, 0.1, 0.35, 14),
    dark,
    [-0.9, 1.0, 0.8],
  );
  tip.rotation.x = Math.PI / 2;
  rounded(bed, [1.2, 0.08, 0.08], [0, 0.1, -1.5], dark, 1, 0.01);
  for (const x of [-0.4, 0.4]) {
    rounded(bed, [0.12, 0.1, 0.06], [x, 0.1, -1.52], lampWhite, 1, 0.01);
  }

  // Rear bed: open tub, rail walls with 3 posts per side.
  for (const side of [-1, 1]) {
    rounded(bed, [0.1, 0.45, 2.4], [side * 1.1, -0.3, -0.35], alu);
    for (let i = 0; i < 3; i++) {
      rounded(
        bed,
        [0.14, 0.55, 0.14],
        [side * 1.1, -0.28, -1.25 + i * 0.9],
        bladeGray,
        1,
        0.02,
      );
    }
  }
  rounded(bed, [2.3, 0.45, 0.1], [0, -0.3, -1.5], alu);

  // Plow: A-frame push arms, center ram, 4 mesh panels, angled wings.
  for (const side of [-1, 1]) {
    bar(
      push,
      new T.Vector3(side * 0.5, -0.6, 0.2),
      new T.Vector3(side * 1.2, -1.1, 1.2),
      0.09,
      armDark,
    );
  }
  bar(push, new T.Vector3(0, -0.5, 0.2), new T.Vector3(0, -0.9, 1.2), 0.07, roadWheel);
  rounded(push, [3.6, 1.3, 0.25], [0, -1.2, 1.3], bladeGray);
  for (let p = 0; p < 4; p++) {
    const px = -1.35 + p * 0.9;
    rounded(push, [0.8, 1.1, 0.06], [px, -1.2, 1.42], alu, 1, 0.01);
    for (let ix = 0; ix < 3; ix++)
      for (let iy = 0; iy < 4; iy++)
        rounded(
          push,
          [0.08, 0.08, 0.04],
          [px - 0.24 + ix * 0.24, -1.55 + iy * 0.24, 1.45],
          dark,
          1,
          0.005,
        );
  }
  for (const side of [-1, 1]) {
    const wing = rounded(
      push,
      [0.5, 1.3, 0.22],
      [side * 1.95, -1.2, 1.15],
      bladeGray,
    );
    wing.rotation.y = side * 0.35;
  }
  rounded(push, [3.7, 0.12, 0.3], [0, -1.82, 1.3], dark, 1, 0.02);

  // Tail: mudflaps + track guards.
  for (const side of [-1, 1]) {
    rounded(tail, [0.7, 0.5, 0.08], [side * 1.1, -1.2, -0.1], belt, 1, 0.02);
  }

  return groomer;
}

export function groomerStats(groomer: T.Object3D) {
  let triangles = 0;
  let meshes = 0;
  groomer.traverse((o) => {
    if (o instanceof T.Mesh) {
      const count = o instanceof T.InstancedMesh ? o.count : 1;
      triangles +=
        ((o.geometry.index?.count ?? o.geometry.attributes.position.count) /
          3) *
        count;
      meshes++;
    }
  });
  return { triangles, meshes };
}
