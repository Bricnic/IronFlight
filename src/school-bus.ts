import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { VehiclePart } from "./vehicles";
import type { TruckMaterials } from "./truck";
/** Transit school-bus collider set on the shared 13 part slots. */
export const BUS_PARTS: VehiclePart[] = [
  { id: "chassis-front", pos: [0, 0.15, 0.8], size: [2.2, 0.9, 2.6], mass: 2000, hp: 300 },
  { id: "chassis-rear", pos: [0, 0.15, -1.6], size: [2.2, 0.9, 1.9], mass: 900, hp: 250 },
  { id: "wheel-fl", pos: [1.1, -0.6, 1.65], size: [0.55, 1.5, 1.5], mass: 80, hp: 100 },
  { id: "wheel-fr", pos: [-1.1, -0.6, 1.65], size: [0.55, 1.5, 1.5], mass: 80, hp: 100 },
  { id: "wheel-rl", pos: [1.1, -0.6, -1.65], size: [0.55, 1.5, 1.5], mass: 80, hp: 100, parent: "chassis-rear" },
  { id: "wheel-rr", pos: [-1.1, -0.6, -1.65], size: [0.55, 1.5, 1.5], mass: 80, hp: 100, parent: "chassis-rear" },
  { id: "hood", pos: [0, 0.75, 2.2], size: [2.0, 0.6, 0.8], mass: 50, hp: 90 },
  { id: "roof", pos: [0, 2.0, -0.3], size: [2.15, 0.25, 4.6], mass: 45, hp: 90 },
  { id: "door-left", pos: [1.1, 1.0, -0.3], size: [0.16, 1.5, 4.4], mass: 35, hp: 75 },
  { id: "door-right", pos: [-1.1, 1.0, -0.3], size: [0.16, 1.5, 4.4], mass: 35, hp: 75 },
  { id: "bed", pos: [0, 1.0, -2.55], size: [2.0, 1.6, 0.4], mass: 60, hp: 110, parent: "chassis-rear" },
  { id: "bumper-front", pos: [0, 0.2, 2.85], size: [2.2, 0.35, 0.25], mass: 42, hp: 100 },
  { id: "bumper-rear", pos: [0, 0.2, -2.85], size: [2.2, 0.35, 0.25], mass: 42, hp: 100, parent: "chassis-rear" },
];
export const BUS_SUSPENSION: [number, number, number][] = [
  [1.1, -0.3, 1.65],
  [-1.1, -0.3, 1.65],
  [1.1, -0.3, -1.65],
  [-1.1, -0.3, -1.65],
];
export const BUS_WHEEL_RADIUS = 0.75;
export const BUS_SUSPENSION_REST = 0.6;
/** Transit-style school bus. Fixed yellow livery. */
export function createSchoolBus(_materials: TruckMaterials = {}) {
  const car = new T.Group();
  car.name = "iron-flight-bus";
  const yellow = new T.MeshStandardMaterial({
    color: 0xe8a100,
    metalness: 0.35,
    roughness: 0.4,
  });
  const black = new T.MeshStandardMaterial({
    color: 0x14171b,
    metalness: 0.5,
    roughness: 0.5,
  });
  const steel = new T.MeshStandardMaterial({
    color: 0x8d9b9f,
    metalness: 0.85,
    roughness: 0.32,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x202a30,
    metalness: 0.65,
    roughness: 0.45,
  });
  const rubber = new T.MeshStandardMaterial({
    color: 0x14191d,
    roughness: 0.92,
  });
  const glass = new T.MeshPhysicalMaterial({
    color: 0xa9d3dd,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: T.DoubleSide,
    metalness: 0.05,
    roughness: 0.12,
    clearcoat: 1,
  });
  const cream = new T.MeshStandardMaterial({
    color: 0xffead0,
    metalness: 0.3,
    roughness: 0.4,
  });
  const light = new T.MeshStandardMaterial({
    color: 0xfff2ca,
    emissive: 0xffdb8e,
    emissiveIntensity: 1.3,
  });
  const amber = new T.MeshStandardMaterial({
    color: 0xff9a1f,
    emissive: 0xcc5e00,
    emissiveIntensity: 0.9,
  });
  const tail = new T.MeshStandardMaterial({
    color: 0xef241c,
    emissive: 0xa80b00,
    emissiveIntensity: 1.2,
  });
  const stopRed = new T.MeshStandardMaterial({
    color: 0xc2140c,
    emissive: 0x7a0d0d,
    emissiveIntensity: 0.6,
    roughness: 0.4,
  });
  function mesh(
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    material: T.Material,
    pos = [0, 0, 0],
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
    segments = 3,
    radius = 0.06,
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
    radius = 0.045,
    mat: T.Material = steel,
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
  const groups = new Map<string, T.Group>();
  for (const def of BUS_PARTS) {
    const g = new T.Group();
    g.name = def.id;
    g.position.fromArray(def.pos);
    car.add(g);
    groups.set(def.id, g);
    if (def.id.startsWith("wheel")) {
      const tire = new T.TorusGeometry(0.57, 0.18, 36, 128);
      tire.rotateY(Math.PI / 2);
      mesh(g, tire, rubber);
      const drum = mesh(
        g,
        new T.CylinderGeometry(0.4, 0.4, 0.36, 48, 2),
        dark,
      );
      drum.rotation.z = Math.PI / 2;
      const disc = mesh(
        g,
        new T.CylinderGeometry(0.33, 0.33, 0.4, 40),
        steel,
      );
      disc.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        const ring = new T.TorusGeometry(0.39, 0.034, 12, 80);
        ring.rotateY(Math.PI / 2);
        mesh(g, ring, steel, [side * 0.2, 0, 0]);
        const cap = mesh(
          g,
          new T.SphereGeometry(0.24, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
          steel,
          [side * 0.18, 0, 0],
        );
        cap.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        const wall = new T.TorusGeometry(0.49, 0.022, 8, 88);
        wall.rotateY(Math.PI / 2);
        mesh(g, wall, dark, [side * 0.16, 0, 0]);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const lug = mesh(
            g,
            new T.CylinderGeometry(0.024, 0.024, 0.04, 6),
            cream,
            [side * 0.22, Math.cos(a) * 0.13, Math.sin(a) * 0.13],
          );
          lug.rotation.z = Math.PI / 2;
        }
      }
    } else {
      const structural = def.id.startsWith("chassis");
      rounded(
        g,
        [...def.size],
        [0, 0, 0],
        structural ? dark : yellow,
        structural ? 2 : 8,
        structural ? 0.06 : 0.08,
      );
    }
  }
  const hood = groups.get("hood")!,
    roof = groups.get("roof")!,
    bed = groups.get("bed")!,
    front = groups.get("chassis-front")!,
    rear = groups.get("chassis-rear")!;
  // Lower body, frame rails, tanks, exhaust and steps.
  rounded(front, [2.15, 0.8, 2.5], [0, 0.3, 0.1], yellow, 8, 0.1);
  rounded(rear, [2.15, 0.8, 1.8], [0, 0.3, -0.05], yellow, 8, 0.1);
  for (const side of [-1, 1]) {
    for (const [parent, z] of [[front, 0.85], [rear, -0.05]] as const) {
      const arch = new T.TorusGeometry(0.81, 0.06, 10, 64, Math.PI);
      arch.rotateY(Math.PI / 2);
      mesh(parent, arch, black, [side * 1.08, -0.5, z]);
    }
    bar(
      front,
      new T.Vector3(side * 0.6, -0.45, -1.2),
      new T.Vector3(side * 0.6, -0.45, 1.2),
      0.07,
      steel,
    );
    rounded(front, [0.5, 0.12, 0.8], [side * 0.85, -0.42, 1.55], dark, 2, 0.03);
  }
  bar(
    front,
    new T.Vector3(0, -0.5, -1.25),
    new T.Vector3(0, -0.5, 1.25),
    0.055,
    dark,
  );
  rounded(rear, [1.4, 0.45, 1.0], [0, -0.3, 0.2], dark, 2, 0.08);
  rounded(rear, [0.8, 0.4, 0.5], [-0.5, -0.28, -0.55], steel, 2, 0.06);
  rounded(front, [0.7, 0.35, 0.45], [0.6, -0.28, -0.9], black, 2, 0.05);
  const muffler = mesh(
    rear,
    new T.CylinderGeometry(0.13, 0.13, 0.8, 20),
    steel,
    [0.55, -0.45, -0.6],
  );
  muffler.rotation.x = Math.PI / 2;
  rounded(front, [0.3, 0.06, 0.4], [-0.8, 0.05, 0.9], dark, 1, 0.01);
  // Interior: driver cockpit, six bench rows, stanchions, floor.
  rounded(front, [1.9, 0.06, 2.4], [0, 0.42, 0.05], dark, 1, 0.01);
  rounded(rear, [1.9, 0.06, 1.7], [0, 0.42, -0.05], dark, 1, 0.01);
  const bench = new T.MeshStandardMaterial({
    color: 0x4a3a52,
    roughness: 0.95,
  });
  const cockpit = new T.Group();
  cockpit.name = "driver-cockpit";
  front.add(cockpit);
  rounded(cockpit, [0.62, 0.2, 0.6], [0.55, 0.62, 0.9], bench, 4, 0.08);
  rounded(cockpit, [0.62, 0.62, 0.16], [0.55, 0.98, 0.62], bench, 4, 0.08);
  rounded(cockpit, [1.7, 0.24, 0.5], [0, 0.85, 1.35], dark, 4, 0.09);
  rounded(cockpit, [0.4, 0.12, 0.3], [-0.3, 1.0, 1.3], black, 2, 0.03);
  const steering = mesh(
    cockpit,
    new T.TorusGeometry(0.22, 0.034, 12, 48),
    rubber,
    [0.55, 1.02, 1.15],
  );
  steering.name = "steering-wheel-left";
  steering.rotation.x = -0.45;
  bar(
    cockpit,
    new T.Vector3(0.55, 1.02, 1.15),
    new T.Vector3(0.55, 0.8, 1.4),
    0.034,
    dark,
  );
  for (let row = 0; row < 6; row++) {
    const z = 0.35 - row * 0.55;
    const parent = z >= -0.5 ? front : rear;
    const lz = z >= -0.5 ? z - 0.8 : z + 1.6;
    for (const x of [-0.55, 0.55]) {
      rounded(parent, [0.8, 0.14, 0.45], [x, 0.72, lz], bench, 3, 0.06);
      rounded(parent, [0.8, 0.5, 0.12], [x, 1.0, lz - 0.22], bench, 3, 0.06);
      for (const lx of [-0.3, 0.3])
        bar(
          parent,
          new T.Vector3(x + lx, 0.45, lz + 0.15),
          new T.Vector3(x + lx, 0.66, lz + 0.15),
          0.02,
          steel,
        );
    }
  }
  for (const [parent, z] of [[front, -0.2], [front, 0.6], [rear, 0.4], [rear, -0.6]] as const)
    bar(
      parent,
      new T.Vector3(0, 0.45, z),
      new T.Vector3(0, 1.75, z),
      0.025,
      yellow,
    );
  // Front cap: split windshield, destination box, door, warnings.
  for (const x of [-0.48, 0.48]) {
    const pane = rounded(hood, [0.88, 0.8, 0.06], [x, 0.75, 0.28], glass, 6, 0.02);
    pane.rotation.x = 0.12;
    const wiper = rounded(hood, [0.03, 0.5, 0.02], [x, 0.5, 0.36], black, 1, 0.008);
    wiper.rotation.z = 0.25;
    wiper.rotation.x = 0.12;
  }
  rounded(hood, [0.08, 0.85, 0.08], [0, 0.75, 0.28], yellow, 2, 0.02);
  rounded(hood, [1.2, 0.22, 0.06], [0, 1.28, 0.3], black, 2, 0.02);
  rounded(hood, [1.0, 0.12, 0.04], [0, 1.28, 0.33], amber, 1, 0.01);
  rounded(hood, [0.7, 1.1, 0.06], [-0.6, 0.1, 0.38], glass, 4, 0.02);
  rounded(hood, [0.78, 1.18, 0.04], [-0.6, 0.1, 0.35], black, 2, 0.02);
  rounded(hood, [0.04, 1.1, 0.05], [-0.6, 0.1, 0.4], black, 1, 0.01);
  rounded(hood, [0.5, 0.08, 0.3], [-0.6, -0.52, 0.3], dark, 1, 0.01);
  for (const [x, mat] of [[-0.85, tail], [-0.35, amber], [0.35, amber], [0.85, tail]] as const)
    rounded(hood, [0.16, 0.16, 0.06], [x, 1.28, -0.05], mat, 3, 0.05);
  for (const x of [-0.7, 0.7]) {
    rounded(hood, [0.4, 0.18, 0.08], [x, -0.28, 0.38], light, 3, 0.04);
    rounded(hood, [0.24, 0.1, 0.06], [x, -0.1, 0.39], amber, 2, 0.02);
  }
  for (const side of [-1, 1]) {
    bar(
      hood,
      new T.Vector3(side * 0.95, 0.9, 0.3),
      new T.Vector3(side * 1.25, 1.0, 0.3),
      0.025,
      black,
    );
    rounded(hood, [0.14, 0.3, 0.2], [side * 1.3, 1.05, 0.3], black, 3, 0.05);
    bar(
      hood,
      new T.Vector3(side * 0.9, 0.1, 0.35),
      new T.Vector3(side * 1.2, 0.5, 0.45),
      0.02,
      steel,
    );
    const cross = mesh(
      hood,
      new T.SphereGeometry(0.11, 20, 12),
      glass,
      [side * 1.22, 0.55, 0.46],
    );
    cross.scale.set(1, 1, 0.5);
  }
  // Side window bands, pillars, rails, stop sign and rivets.
  for (const side of [-1, 1]) {
    const door = groups.get(side > 0 ? "door-left" : "door-right")!;
    for (let i = 0; i < 8; i++) {
      const z = -1.85 + i * 0.53;
      rounded(door, [0.05, 0.56, 0.44], [0, 0.42, z], glass, 4, 0.02);
      rounded(door, [0.06, 0.62, 0.03], [0, 0.42, z + 0.24], black, 1, 0.008);
      rounded(door, [0.06, 0.03, 0.46], [0, 0.14, z], black, 1, 0.008);
      rounded(door, [0.06, 0.03, 0.46], [0, 0.7, z], black, 1, 0.008);
    }
    rounded(door, [0.04, 0.09, 4.3], [side * 0.08, -0.05, 0], black, 1, 0.01);
    rounded(door, [0.04, 0.07, 4.3], [side * 0.08, -0.5, 0], black, 1, 0.01);
    rounded(door, [0.05, 0.5, 0.7], [0, -0.32, 1.7], black, 2, 0.02);
    for (let i = 0; i < 14; i++)
      for (const y of [0.72, -0.28])
        rounded(
          door,
          [0.03, 0.03, 0.03],
          [side * 0.07, y, -1.95 + i * 0.3],
          steel,
          1,
          0.008,
        );
  }
  const signDoor = groups.get("door-left")!;
  bar(
    signDoor,
    new T.Vector3(0.08, 0.3, 1.5),
    new T.Vector3(0.3, 0.3, 1.5),
    0.025,
    black,
  );
  const stop = mesh(
    signDoor,
    new T.CylinderGeometry(0.28, 0.28, 0.04, 8),
    stopRed,
    [0.34, 0.3, 1.5],
  );
  stop.rotation.z = Math.PI / 2;
  const stopInner = mesh(
    signDoor,
    new T.CylinderGeometry(0.22, 0.22, 0.045, 8),
    cream,
    [0.34, 0.3, 1.5],
  );
  stopInner.rotation.z = Math.PI / 2;
  for (const x of [-0.2, 0.2])
    rounded(signDoor, [0.02, 0.05, 0.3], [0.37, 0.3 + x * 0.4, 1.5], stopRed, 1, 0.005);
  // Roof: ribs, hatch, vents, markers.
  for (let i = 0; i < 8; i++) {
    const rib = new T.TorusGeometry(1.04, 0.028, 8, 40, Math.PI);
    mesh(roof, rib, yellow, [0, -0.85, -1.95 + i * 0.56]);
  }
  rounded(roof, [0.7, 0.06, 0.7], [0, 0.14, 0.2], black, 2, 0.02);
  rounded(roof, [0.6, 0.05, 0.6], [0, 0.15, 0.2], glass, 2, 0.02);
  for (const z of [-1.4, 1.4])
    mesh(roof, new T.SphereGeometry(0.13, 16, 10), yellow, [0.4, 0.16, z]);
  for (let i = 0; i < 5; i++) {
    rounded(roof, [0.08, 0.06, 0.05], [(i - 2) * 0.36, 0.08, 2.28], amber, 1, 0.01);
    rounded(roof, [0.08, 0.06, 0.05], [(i - 2) * 0.36, 0.08, -2.28], tail, 1, 0.01);
  }
  // Rear cap: window, door, warnings, taillights.
  rounded(bed, [1.4, 0.6, 0.06], [0, 0.35, -0.2], glass, 4, 0.02);
  rounded(bed, [1.5, 0.66, 0.04], [0, 0.35, -0.18], black, 2, 0.02);
  rounded(bed, [0.9, 1.2, 0.04], [0, -0.1, -0.21], yellow, 2, 0.02);
  rounded(bed, [0.06, 0.3, 0.06], [0.3, -0.1, -0.24], black, 1, 0.01);
  for (const [x, mat] of [[-0.7, tail], [-0.25, amber], [0.25, amber], [0.7, tail]] as const)
    rounded(bed, [0.16, 0.16, 0.06], [x, 0.68, -0.2], mat, 3, 0.05);
  for (const x of [-0.8, 0.8]) {
    rounded(bed, [0.2, 0.4, 0.06], [x, -0.3, -0.2], tail, 2, 0.02);
    rounded(bed, [0.2, 0.14, 0.06], [x, -0.02, -0.2], amber, 2, 0.02);
    rounded(bed, [0.2, 0.1, 0.06], [x, -0.55, -0.2], cream, 1, 0.01);
  }
  // Bumpers: crossing arm, plates, steps, flaps.
  const nose = groups.get("bumper-front")!;
  rounded(nose, [2.15, 0.3, 0.2], [0, 0, 0], black, 4, 0.06);
  const armBase = rounded(nose, [0.15, 0.15, 0.15], [0.8, 0.2, 0.1], yellow, 2, 0.03);
  armBase.name = "crossing-arm-base";
  for (let i = 0; i < 5; i++) {
    const seg = rounded(
      nose,
      [0.3, 0.08, 0.06],
      [-0.55 + i * 0.3, 0.28, 0.12],
      i % 2 ? black : yellow,
      1,
      0.01,
    );
    seg.rotation.z = 0.06;
  }
  rounded(nose, [0.44, 0.11, 0.02], [-0.6, 0.0, 0.12], cream, 1, 0.005);
  const tailgate = groups.get("bumper-rear")!;
  rounded(tailgate, [2.15, 0.3, 0.2], [0, 0, 0], black, 4, 0.06);
  rounded(tailgate, [1.2, 0.06, 0.3], [0, 0.16, -0.02], dark, 1, 0.01);
  rounded(tailgate, [0.44, 0.11, 0.02], [0, 0.0, -0.12], cream, 1, 0.005);
  for (const x of [-0.85, 0.85]) {
    rounded(tailgate, [0.3, 0.25, 0.04], [x, -0.16, 0.02], rubber, 1, 0.01);
    rounded(nose, [0.3, 0.25, 0.04], [x, -0.16, 0.0], rubber, 1, 0.01);
  }
  return car;
}
export function schoolBusStats(car: T.Object3D) {
  let triangles = 0,
    meshes = 0;
  car.traverse((o) => {
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
