import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PARTS } from "./damage";
import type { VehiclePart } from "./vehicles";
import type { TruckMaterials } from "./truck";

/** Monster-clone colliders; doors sit on the bed wall for the decal. */
export const WRECKER_PARTS: VehiclePart[] = PARTS.map((p) =>
  p.id === "door-left"
    ? { ...p, pos: [0.964, 0.2, -0.1] as const }
    : p.id === "door-right"
      ? { ...p, pos: [-0.964, 0.2, -0.1] as const }
      : { ...p },
);
export const WRECKER_SUSPENSION: [number, number, number][] = [
  [1.65, -0.35, 1.65],
  [-1.65, -0.35, 1.65],
  [1.65, -0.35, -1.65],
  [-1.65, -0.35, -1.65],
];
export const WRECKER_WHEEL_RADIUS = 1.05;
export const WRECKER_SUSPENSION_REST = 0.6;

/** Yellow crane truck: cab-over, pedestal boom with hook, loaded flatbed. */
export function createTowTruck(_materials: TruckMaterials = {}) {
  const wrecker = new T.Group();
  wrecker.name = "iron-flight-wrecker";
  // Fixed taxi-yellow livery: the tuning picker must not recolor the truck.
  const yellow = new T.MeshStandardMaterial({
    color: 0xf6b900,
    metalness: 0.15,
    roughness: 0.5,
  });
  const yellowDark = new T.MeshStandardMaterial({
    color: 0xc78f00,
    metalness: 0.15,
    roughness: 0.55,
  });
  const chassisDark = new T.MeshStandardMaterial({
    color: 0x33363b,
    metalness: 0.5,
    roughness: 0.55,
  });
  const tankGray = new T.MeshStandardMaterial({
    color: 0x6b7076,
    metalness: 0.6,
    roughness: 0.4,
  });
  const rubber = new T.MeshStandardMaterial({
    color: 0x1b1c1f,
    roughness: 0.9,
  });
  const hubSilver = new T.MeshStandardMaterial({
    color: 0x9aa0a6,
    metalness: 0.75,
    roughness: 0.35,
  });
  const glass = new T.MeshStandardMaterial({
    color: 0x2b343b,
    metalness: 0.2,
    roughness: 0.15,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x1c1e21,
    metalness: 0.4,
    roughness: 0.6,
  });
  const beacon = new T.MeshStandardMaterial({
    color: 0xff9e1b,
    emissive: 0xff9e1b,
    emissiveIntensity: 2.0,
  });
  const hookRed = new T.MeshStandardMaterial({
    color: 0xc01e26,
    metalness: 0.3,
    roughness: 0.45,
  });
  const stripeWhite = new T.MeshStandardMaterial({
    color: 0xf2f3f4,
    roughness: 0.4,
  });
  const lampWhite = new T.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.2,
  });
  const tailRed = new T.MeshStandardMaterial({
    color: 0xef241c,
    emissive: 0xa80b00,
    emissiveIntensity: 1.2,
  });
  const crateBrown = new T.MeshStandardMaterial({
    color: 0x7a5a3a,
    roughness: 0.8,
  });
  const ramSteel = new T.MeshStandardMaterial({
    color: 0x565b61,
    metalness: 0.8,
    roughness: 0.3,
  });
  const seatGray = new T.MeshStandardMaterial({
    color: 0x3a3f45,
    roughness: 0.85,
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
    mat: T.Material = yellow,
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
  function bar(
    parent: T.Object3D,
    a: T.Vector3,
    b: T.Vector3,
    radius = 0.05,
    mat: T.Material = ramSteel,
  ) {
    const m = mesh(
      parent,
      new T.CylinderGeometry(radius, radius, a.distanceTo(b), 12),
      mat,
    );
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return m;
  }
  function wheel(parent: T.Object3D, hub: T.Material) {
    const tire = new T.TorusGeometry(0.72, 0.33, 32, 96);
    tire.rotateY(Math.PI / 2);
    mesh(parent, tire, rubber);
    const tread = new T.BoxGeometry(0.44, 0.13, 0.22);
    const treads = new T.InstancedMesh(tread, rubber, 72);
    treads.castShadow = true;
    treads.receiveShadow = true;
    parent.add(treads);
    const dummy = new T.Object3D();
    let ti = 0;
    for (let i = 0; i < 36; i++) {
      for (const side of [-1, 1]) {
        const angle = (i / 36) * Math.PI * 2 + side * 0.03;
        dummy.position.set(
          side * 0.21,
          Math.cos(angle) * 1.04,
          Math.sin(angle) * 1.04,
        );
        dummy.rotation.set(angle, side * 0.4, 0);
        dummy.updateMatrix();
        treads.setMatrixAt(ti++, dummy.matrix);
      }
    }
    const drum = mesh(
      parent,
      new T.CylinderGeometry(0.46, 0.46, 0.44, 28),
      dark,
    );
    drum.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const lip = new T.TorusGeometry(0.46, 0.03, 10, 44);
      lip.rotateY(Math.PI / 2);
      mesh(parent, lip, hub, [side * 0.24, 0, 0]);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spoke = rounded(
          parent,
          [0.05, 0.26, 0.07],
          [side * 0.24, Math.cos(a) * 0.27, Math.sin(a) * 0.27],
          hub,
          1,
          0.012,
        );
        spoke.rotation.x = a;
      }
      const cap = mesh(
        parent,
        new T.CylinderGeometry(0.1, 0.1, 0.06, 12),
        hub,
        [side * 0.26, 0, 0],
      );
      cap.rotation.z = Math.PI / 2;
    }
  }

  const groups = new Map<string, T.Group>();
  for (const def of WRECKER_PARTS) {
    const g = new T.Group();
    g.name = def.id;
    g.position.fromArray(def.pos);
    wrecker.add(g);
    groups.set(def.id, g);
  }
  const front = groups.get("chassis-front")!;
  const rear = groups.get("chassis-rear")!;
  const hood = groups.get("hood")!;
  const roof = groups.get("roof")!;
  const bed = groups.get("bed")!;
  const nose = groups.get("bumper-front")!;
  const tail = groups.get("bumper-rear")!;

  // Chassis rails, side tanks, striped outriggers with ground pads.
  for (const side of [-1, 1]) {
    rounded(front, [0.18, 0.5, 2.6], [side * 0.5, -0.55, 0.1], chassisDark, 1, 0.03);
    rounded(rear, [0.18, 0.5, 1.9], [side * 0.5, -0.55, -0.05], chassisDark, 1, 0.03);
    rounded(front, [0.9, 0.5, 0.9], [side * 1.0, -0.75, -0.5], tankGray, 1, 0.05);
    rounded(rear, [0.5, 0.9, 0.3], [side * 1.5, -0.9, 1.55], hookRed, 1, 0.02);
    rounded(rear, [0.52, 0.2, 0.32], [side * 1.5, -0.7, 1.55], stripeWhite, 1, 0.01);
    rounded(rear, [0.52, 0.2, 0.32], [side * 1.5, -1.1, 1.55], stripeWhite, 1, 0.01);
    rounded(rear, [0.6, 0.1, 0.5], [side * 1.5, -1.4, 1.55], dark, 1, 0.02);
  }

  // Four wheels: silver-hub steer axle, yellow-hub drive axle.
  wheel(groups.get("wheel-fl")!, hubSilver);
  wheel(groups.get("wheel-fr")!, hubSilver);
  wheel(groups.get("wheel-rl")!, yellow);
  wheel(groups.get("wheel-rr")!, yellow);

  // Cab-over: bluff cab, split windshield, side glass, interior hints.
  rounded(hood, [2.0, 2.1, 1.4], [0, -0.5, 0.55], yellow);
  rounded(hood, [1.6, 0.62, 0.1], [0, 0.2, 1.28], glass, 1, 0.02);
  rounded(hood, [0.07, 0.62, 0.12], [0, 0.2, 1.29], dark, 1, 0.01);
  bar(hood, new T.Vector3(-0.45, -0.05, 1.36), new T.Vector3(-0.2, 0.35, 1.35), 0.02, dark);
  bar(hood, new T.Vector3(0.45, -0.05, 1.36), new T.Vector3(0.2, 0.35, 1.35), 0.02, dark);
  for (const side of [-1, 1]) {
    rounded(hood, [0.1, 0.62, 0.7], [side * 1.0, 0.2, 0.55], glass, 1, 0.02);
    rounded(hood, [0.12, 2.0, 0.14], [side * 1.0, -0.5, 1.2], dark, 1, 0.02);
    rounded(hood, [0.5, 0.12, 0.3], [side * 1.1, -1.2, 0.6], dark, 1, 0.02);
    rounded(hood, [0.5, 0.12, 0.3], [side * 1.1, -1.5, 0.6], dark, 1, 0.02);
    bar(
      hood,
      new T.Vector3(side * 1.0, 0.3, 1.15),
      new T.Vector3(side * 1.25, 0.3, 1.15),
      0.025,
      dark,
    );
    rounded(hood, [0.08, 0.3, 0.2], [side * 1.28, 0.15, 1.15], dark, 1, 0.02);
    const dome = mesh(
      hood,
      new T.CylinderGeometry(0.09, 0.11, 0.14, 12),
      beacon,
      [side * 0.7, 0.62, 0.9],
    );
    dome.position.y = 0.62;
    rounded(hood, [0.2, 0.06, 0.2], [side * 0.7, 0.53, 0.9], dark, 1, 0.01);
  }
  rounded(hood, [0.5, 0.6, 0.15], [0.4, -0.35, 0.5], seatGray, 1, 0.04);
  const wheelRim = mesh(
    hood,
    new T.TorusGeometry(0.17, 0.03, 10, 28),
    dark,
    [0.4, -0.1, 0.85],
  );
  wheelRim.rotation.x = -0.5;

  // Side tanks double as the door-group anchors.
  for (const side of [-1, 1]) {
    const door = groups.get(side > 0 ? "door-left" : "door-right")!;
    rounded(door, [0.6, 0.55, 1.0], [side * 0.416, -0.45, 0.6], tankGray, 1, 0.05);
    rounded(door, [0.62, 0.1, 0.5], [side * 0.416, -0.3, 0.6], dark, 1, 0.01);
  }

  // Crane pedestal, control box, ram, 2-stage level boom with decals.
  rounded(hood, [1.2, 1.5, 0.8], [0, -0.3, -0.8], yellow);
  rounded(hood, [0.5, 0.7, 0.3], [0.75, -0.4, -0.8], tankGray, 1, 0.03);
  rounded(hood, [0.52, 0.12, 0.32], [0.75, -0.2, -0.8], stripeWhite, 1, 0.01);
  rounded(roof, [0.5, 0.55, 3.4], [0, -0.45, -0.85], yellow);
  rounded(roof, [0.4, 0.42, 1.6], [0, -0.42, -1.7], yellowDark, 1, 0.03);
  for (const z of [-0.6, -1.6]) {
    rounded(roof, [0.52, 0.3, 0.45], [0, -0.45, z], stripeWhite, 1, 0.01);
    rounded(roof, [0.54, 0.14, 0.2], [0, -0.45, z - 0.1], hookRed, 1, 0.01);
    rounded(roof, [0.54, 0.14, 0.2], [0, -0.45, z + 0.12], hookRed, 1, 0.01);
  }
  bar(
    hood,
    new T.Vector3(0, -0.5, -0.8),
    new T.Vector3(0, 0.75, -1.5),
    0.13,
    ramSteel,
  );
  bar(
    hood,
    new T.Vector3(0, 0.1, -1.15),
    new T.Vector3(0, 0.75, -1.5),
    0.08,
    tankGray,
  );

  // Cable, red hook block, black hook over the bed rear third.
  bar(bed, new T.Vector3(0, 0.7, -0.65), new T.Vector3(0, -0.1, -0.65), 0.035, dark);
  rounded(bed, [0.3, 0.3, 0.22], [0, -0.25, -0.65], hookRed, 1, 0.04);
  const hook = new T.TorusGeometry(0.14, 0.045, 10, 24, Math.PI * 1.5);
  const hookMesh = mesh(bed, hook, dark, [0, -0.5, -0.65]);
  hookMesh.rotation.z = Math.PI * 0.75;

  // Flatbed tub: paneled walls, recesses, rub rail, tie studs, full load.
  rounded(bed, [2.0, 0.15, 3.1], [0, -0.85, 0.75], yellow);
  for (const side of [-1, 1]) {
    rounded(bed, [0.12, 0.8, 3.1], [side * 0.98, -0.4, 0.75], yellow);
    rounded(bed, [0.14, 0.1, 3.1], [side * 0.98, -0.15, 0.75], tankGray, 1, 0.01);
    for (let i = 0; i < 3; i++) {
      rounded(
        bed,
        [0.06, 0.4, 0.5],
        [side * 1.02, -0.45, -0.5 + i * 0.9],
        yellowDark,
        1,
        0.01,
      );
    }
    for (let i = 0; i < 3; i++) {
      mesh(
        bed,
        new T.CylinderGeometry(0.04, 0.04, 0.08, 8),
        dark,
        [side * 0.9, 0.0, -0.5 + i * 0.9],
      );
    }
  }
  rounded(bed, [2.0, 0.8, 0.12], [0, -0.4, -0.75], yellow);
  rounded(bed, [0.8, 0.4, 0.6], [-0.4, -0.55, 0.3], hookRed);
  rounded(bed, [0.82, 0.08, 0.62], [-0.4, -0.33, 0.3], stripeWhite, 1, 0.01);
  rounded(bed, [0.6, 0.45, 0.6], [0.5, -0.53, 0.7], tankGray);
  rounded(bed, [0.55, 0.4, 0.55], [0.45, -0.55, -0.1], crateBrown);
  const coil = new T.TorusGeometry(0.22, 0.08, 10, 28);
  coil.rotateX(Math.PI / 2);
  mesh(bed, coil, dark, [-0.3, -0.7, -0.35]);
  rounded(bed, [1.4, 0.12, 0.12], [0.1, -0.68, 1.1], hookRed, 1, 0.02);
  rounded(bed, [0.2, 0.13, 0.13], [-0.2, -0.68, 1.1], stripeWhite, 1, 0.01);
  rounded(bed, [0.2, 0.13, 0.13], [0.4, -0.68, 1.1], stripeWhite, 1, 0.01);

  // Gray front bumper with lamps; rear light bar + mudflaps.
  rounded(nose, [2.0, 0.4, 0.35], [0, -0.85, 0.1], tankGray, 1, 0.05);
  for (const x of [-0.6, 0.6]) {
    const headlamp = mesh(
      nose,
      new T.CylinderGeometry(0.09, 0.09, 0.08, 12),
      lampWhite,
      [x, -0.85, 0.28],
    );
    headlamp.rotation.x = Math.PI / 2;
  }
  rounded(tail, [2.0, 0.25, 0.2], [0, -0.6, -0.05], dark, 1, 0.03);
  for (let i = 0; i < 4; i++) {
    rounded(
      tail,
      [0.14, 0.12, 0.06],
      [-0.6 + i * 0.4, -0.6, -0.15],
      i % 2 ? beacon : tailRed,
      1,
      0.01,
    );
  }
  for (const side of [-1, 1]) {
    rounded(tail, [0.5, 0.5, 0.06], [side * 1.0, -1.1, -0.1], rubber, 1, 0.02);
  }

  return wrecker;
}

export function towTruckStats(wrecker: T.Object3D) {
  let triangles = 0;
  let meshes = 0;
  wrecker.traverse((o) => {
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
