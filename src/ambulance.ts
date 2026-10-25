import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { VehiclePart } from "./vehicles";
import type { TruckMaterials } from "./truck";
/** Box-ambulance collider set on the shared 13 part slots. */
export const AMBULANCE_PARTS: VehiclePart[] = [
  { id: "chassis-front", pos: [0, 0.1, 0.8], size: [2.1, 0.8, 2.6], mass: 1800, hp: 300 },
  { id: "chassis-rear", pos: [0, 0.1, -1.6], size: [2.1, 0.8, 1.9], mass: 650, hp: 250 },
  { id: "wheel-fl", pos: [1.1, -0.65, 1.65], size: [0.55, 1.44, 1.44], mass: 70, hp: 100 },
  { id: "wheel-fr", pos: [-1.1, -0.65, 1.65], size: [0.55, 1.44, 1.44], mass: 70, hp: 100 },
  { id: "wheel-rl", pos: [1.1, -0.65, -1.65], size: [0.55, 1.44, 1.44], mass: 70, hp: 100, parent: "chassis-rear" },
  { id: "wheel-rr", pos: [-1.1, -0.65, -1.65], size: [0.55, 1.44, 1.44], mass: 70, hp: 100, parent: "chassis-rear" },
  { id: "hood", pos: [0, 0.62, 1.7], size: [2.0, 0.5, 1.3], mass: 50, hp: 90 },
  { id: "roof", pos: [0, 1.62, -1.25], size: [2.05, 0.25, 2.9], mass: 45, hp: 90 },
  { id: "door-left", pos: [1.05, 0.85, -0.35], size: [0.16, 1.4, 1.6], mass: 32, hp: 75 },
  { id: "door-right", pos: [-1.05, 0.85, -0.35], size: [0.16, 1.4, 1.6], mass: 32, hp: 75 },
  { id: "bed", pos: [0, 0.85, -2.5], size: [2.0, 1.5, 0.3], mass: 60, hp: 110, parent: "chassis-rear" },
  { id: "bumper-front", pos: [0, 0.1, 2.72], size: [2.05, 0.35, 0.25], mass: 40, hp: 100 },
  { id: "bumper-rear", pos: [0, 0.15, -2.72], size: [2.05, 0.35, 0.3], mass: 45, hp: 100, parent: "chassis-rear" },
];
export const AMBULANCE_SUSPENSION: [number, number, number][] = [
  [1.1, -0.3, 1.65],
  [-1.1, -0.3, 1.65],
  [1.1, -0.3, -1.65],
  [-1.1, -0.3, -1.65],
];
export const AMBULANCE_WHEEL_RADIUS = 0.72;
export const AMBULANCE_SUSPENSION_REST = 0.6;
/** White box ambulance with a red stripe. Fixed livery. */
export function createAmbulance(_materials: TruckMaterials = {}) {
  const car = new T.Group();
  car.name = "iron-flight-ambulance";
  const white = new T.MeshStandardMaterial({
    color: 0xf2f4f4,
    metalness: 0.3,
    roughness: 0.4,
  });
  const stripe = new T.MeshStandardMaterial({
    color: 0xc2140c,
    metalness: 0.4,
    roughness: 0.35,
  });
  const starBlue = new T.MeshStandardMaterial({
    color: 0x1240c2,
    emissive: 0x0a2a8a,
    emissiveIntensity: 0.5,
    roughness: 0.4,
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
    mat: T.Material = white,
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
  for (const def of AMBULANCE_PARTS) {
    const g = new T.Group();
    g.name = def.id;
    g.position.fromArray(def.pos);
    car.add(g);
    groups.set(def.id, g);
    if (def.id.startsWith("wheel")) {
      const tire = new T.TorusGeometry(0.54, 0.18, 32, 112);
      tire.rotateY(Math.PI / 2);
      mesh(g, tire, rubber);
      const drum = mesh(
        g,
        new T.CylinderGeometry(0.37, 0.37, 0.34, 44, 2),
        dark,
      );
      drum.rotation.z = Math.PI / 2;
      const disc = mesh(
        g,
        new T.CylinderGeometry(0.3, 0.3, 0.38, 36),
        steel,
      );
      disc.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        const ring = new T.TorusGeometry(0.36, 0.032, 12, 72);
        ring.rotateY(Math.PI / 2);
        mesh(g, ring, steel, [side * 0.19, 0, 0]);
        const cap = mesh(
          g,
          new T.SphereGeometry(0.22, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
          steel,
          [side * 0.17, 0, 0],
        );
        cap.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        const wall = new T.TorusGeometry(0.46, 0.02, 8, 80);
        wall.rotateY(Math.PI / 2);
        mesh(g, wall, dark, [side * 0.15, 0, 0]);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const lug = mesh(
            g,
            new T.CylinderGeometry(0.024, 0.024, 0.04, 6),
            cream,
            [side * 0.21, Math.cos(a) * 0.12, Math.sin(a) * 0.12],
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
        structural ? dark : white,
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
  // Cab shell, frame rails, tanks and exhaust.
  rounded(front, [2.05, 0.7, 2.5], [0, 0.15, 0.1], white, 8, 0.12);
  rounded(rear, [2.05, 0.7, 1.8], [0, 0.15, -0.05], white, 8, 0.12);
  for (const side of [-1, 1]) {
    rounded(front, [0.2, 0.5, 1.3], [side * 0.93, 0.35, 0.5], white, 6, 0.1);
    for (const [parent, z] of [[front, 0.85], [rear, -0.05]] as const) {
      const arch = new T.TorusGeometry(0.78, 0.06, 10, 60, Math.PI);
      arch.rotateY(Math.PI / 2);
      mesh(parent, arch, dark, [side * 1.06, -0.45, z]);
    }
    bar(
      front,
      new T.Vector3(side * 0.55, -0.4, -1.2),
      new T.Vector3(side * 0.55, -0.4, 1.2),
      0.07,
      steel,
    );
  }
  bar(
    front,
    new T.Vector3(0, -0.45, -1.25),
    new T.Vector3(0, -0.45, 1.25),
    0.055,
    dark,
  );
  rounded(rear, [1.3, 0.4, 0.9], [0, -0.25, 0.2], dark, 2, 0.08);
  rounded(rear, [0.9, 0.3, 0.5], [-0.4, -0.25, -0.5], steel, 2, 0.06);
  const muffler = mesh(
    rear,
    new T.CylinderGeometry(0.12, 0.12, 0.75, 20),
    steel,
    [0.5, -0.4, -0.6],
  );
  muffler.rotation.x = Math.PI / 2;
  // Cab interior: seats, dash, console, wheel.
  const upholstery = new T.MeshStandardMaterial({
    color: 0x2a4a5a,
    roughness: 0.95,
  });
  for (const x of [-0.48, 0.48]) {
    const seat = new T.Group();
    seat.name = x > 0 ? "driver-seat" : "passenger-seat";
    front.add(seat);
    rounded(seat, [0.62, 0.2, 0.6], [x, 0.62, -0.15], upholstery, 4, 0.08);
    rounded(seat, [0.62, 0.62, 0.16], [x, 0.98, -0.42], upholstery, 4, 0.08);
    rounded(seat, [0.34, 0.2, 0.15], [x, 1.36, -0.42], upholstery, 3, 0.06);
  }
  rounded(front, [1.75, 0.26, 0.6], [0, 0.85, 0.55], dark, 4, 0.09);
  rounded(front, [0.5, 0.34, 0.3], [0, 0.72, 0.1], dark, 2, 0.04);
  rounded(
    front,
    [0.4, 0.24, 0.03],
    [0, 0.92, 0.22],
    new T.MeshStandardMaterial({
      color: 0x0a2a3a,
      emissive: 0x3adf8a,
      emissiveIntensity: 0.7,
    }),
    1,
    0.005,
  );
  const steering = mesh(
    front,
    new T.TorusGeometry(0.21, 0.034, 12, 44),
    rubber,
    [0.48, 1.02, 0.35],
  );
  steering.name = "steering-wheel-left";
  steering.rotation.x = -0.45;
  bar(
    front,
    new T.Vector3(0.48, 1.02, 0.35),
    new T.Vector3(0.48, 0.8, 0.6),
    0.034,
    dark,
  );
  // Nose: grille, headlights, signals, plate and tow hooks.
  rounded(hood, [1.7, 0.1, 0.9], [0, 0.28, 0.1], white, 4, 0.04);
  const nose = groups.get("bumper-front")!;
  rounded(nose, [2.0, 0.3, 0.22], [0, 0.05, 0.03], steel, 6, 0.08);
  rounded(nose, [2.0, 0.1, 0.24], [0, 0.16, 0.03], dark, 2, 0.03);
  rounded(hood, [1.4, 0.3, 0.08], [0, -0.02, 0.62], dark, 2, 0.03);
  for (let i = 0; i < 5; i++)
    rounded(hood, [1.3, 0.035, 0.05], [0, -0.12 + i * 0.06, 0.65], steel, 1, 0.01);
  for (const x of [-0.72, 0.72]) {
    rounded(hood, [0.44, 0.2, 0.1], [x, 0.05, 0.6], light, 3, 0.04);
    rounded(nose, [0.32, 0.12, 0.06], [x, 0.02, 0.15], amber, 2, 0.02);
    const fog = mesh(
      nose,
      new T.CylinderGeometry(0.075, 0.075, 0.06, 20),
      light,
      [x * 0.7, -0.08, 0.15],
    );
    fog.rotation.x = Math.PI / 2;
    const hook = new T.TorusGeometry(0.08, 0.022, 8, 20);
    mesh(nose, hook, stripe, [x * 0.5, -0.16, 0.16]);
  }
  rounded(nose, [0.44, 0.11, 0.02], [0, -0.02, 0.16], cream, 1, 0.005);
  // Windshield, wipers, cab roof and the red/white light bar.
  const windshield = rounded(
    hood,
    [1.8, 0.85, 0.06],
    [0, 0.62, 0.05],
    glass,
    6,
    0.02,
  );
  windshield.rotation.x = 0.28;
  for (const x of [-0.45, 0.45]) {
    const wiper = rounded(hood, [0.03, 0.5, 0.02], [x, 0.42, 0.2], dark, 1, 0.008);
    wiper.rotation.z = 0.3;
    wiper.rotation.x = 0.28;
  }
  rounded(hood, [1.95, 0.12, 1.1], [0, 1.0, -0.35], white, 4, 0.05);
  rounded(hood, [2.0, 0.14, 1.0], [0, 0.28, -0.35], stripe, 2, 0.02);
  rounded(hood, [1.6, 0.08, 0.36], [0, 1.12, -0.75], dark, 3, 0.03);
  const domeA = rounded(
    hood,
    [0.6, 0.17, 0.3],
    [0.45, 1.25, -0.75],
    new T.MeshStandardMaterial({
      color: 0x7a0d0d,
      emissive: 0xff2222,
      emissiveIntensity: 0.15,
      roughness: 0.25,
    }),
    4,
    0.06,
  );
  domeA.name = "lightbar-a";
  const domeB = rounded(
    hood,
    [0.6, 0.17, 0.3],
    [-0.45, 1.25, -0.75],
    new T.MeshStandardMaterial({
      color: 0xd8d8d8,
      emissive: 0xffffff,
      emissiveIntensity: 0.15,
      roughness: 0.25,
    }),
    4,
    0.06,
  );
  domeB.name = "lightbar-b";
  rounded(hood, [0.3, 0.15, 0.28], [0, 1.24, -0.75], glass, 3, 0.05);
  for (const x of [-0.72, 0.72])
    rounded(hood, [0.12, 0.1, 0.22], [x, 1.2, -0.75], light, 2, 0.03);
  // Cab + box side doors, glass, mirrors, steps and stripe.
  for (const side of [-1, 1]) {
    const door = groups.get(side > 0 ? "door-left" : "door-right")!;
    rounded(door, [0.06, 0.5, 0.7], [0, 0.42, 0.3], glass, 4, 0.02);
    rounded(door, [0.06, 0.6, 0.5], [0, 0.3, -0.45], glass, 4, 0.02);
    rounded(door, [0.08, 0.06, 0.24], [side * 0.1, 0.05, 0.3], dark, 2, 0.02);
    rounded(door, [0.08, 0.3, 0.06], [side * 0.1, 0.1, -0.45], steel, 2, 0.02);
    rounded(door, [0.03, 0.16, 1.5], [side * 0.09, -0.12, 0], stripe, 1, 0.008);
    rounded(door, [0.3, 0.1, 0.7], [side * 0.12, -0.68, 0.3], dark, 2, 0.03);
    bar(
      door,
      new T.Vector3(side * 0.08, 0.5, 0.68),
      new T.Vector3(side * 0.3, 0.56, 0.68),
      0.028,
      dark,
    );
    rounded(door, [0.16, 0.2, 0.26], [side * 0.36, 0.6, 0.68], white, 3, 0.05);
    rounded(door, [0.02, 0.16, 0.2], [side * 0.29, 0.6, 0.68], glass, 1, 0.005);
    rounded(door, [0.1, 0.06, 0.2], [side * 0.08, -0.42, -0.45], dark, 1, 0.01);
  }
  // Box walls: compartments, windows, rub rails, stars and scene lights.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = -0.85 + i * 0.75;
      rounded(rear, [0.06, 0.7, 0.6], [side * 1.03, 0.55, z], white, 2, 0.02);
      rounded(rear, [0.07, 0.08, 0.2], [side * 1.04, 0.35, z], dark, 1, 0.01);
      for (const hy of [0.3, 0.8])
        rounded(rear, [0.05, 0.1, 0.05], [side * 1.03, hy, z - 0.28], steel, 1, 0.01);
    }
    rounded(rear, [0.06, 0.5, 0.7], [side * 1.03, 0.75, 1.15], glass, 4, 0.02);
    rounded(rear, [0.04, 0.16, 2.7], [side * 1.04, -0.02, 0.1], stripe, 1, 0.008);
    for (const y of [0.32, -0.3])
      rounded(rear, [0.05, 0.07, 2.7], [side * 1.03, y, 0.1], dark, 1, 0.01);
    rounded(rear, [0.04, 0.44, 0.44], [side * 1.04, 0.75, -0.1], white, 2, 0.01);
    for (let i = 0; i < 3; i++) {
      const barMesh = rounded(
        rear,
        [0.05, 0.1, 0.36],
        [side * 1.05, 0.75, -0.1],
        starBlue,
        1,
        0.01,
      );
      barMesh.rotation.x = (i * Math.PI) / 3;
    }
    rounded(rear, [0.06, 0.12, 0.2], [side * 1.03, 1.28, 1.3], light, 1, 0.01);
    rounded(rear, [0.06, 0.12, 0.2], [side * 1.03, 1.28, -1.1], tail, 1, 0.01);
    for (let i = 0; i < 10; i++)
      rounded(
        rear,
        [0.03, 0.03, 0.03],
        [side * 1.02, 1.05, -1.15 + i * 0.26],
        steel,
        1,
        0.008,
      );
  }
  // Box roof: AC pod, vents, markers and rear warning lights.
  rounded(roof, [1.1, 0.22, 1.4], [0, 0.2, 0.1], white, 4, 0.08);
  rounded(roof, [0.9, 0.06, 1.2], [0, 0.3, 0.1], dark, 2, 0.02);
  for (let i = 0; i < 5; i++)
    rounded(roof, [0.8, 0.03, 0.06], [0, 0.32, -0.4 + i * 0.25], steel, 1, 0.01);
  for (const z of [-1.0, 1.0])
    mesh(roof, new T.SphereGeometry(0.12, 16, 10), white, [0.5, 0.2, z]);
  for (let i = 0; i < 5; i++) {
    rounded(roof, [0.08, 0.06, 0.05], [(i - 2) * 0.35, 0.1, 1.42], amber, 1, 0.01);
    rounded(roof, [0.08, 0.06, 0.05], [(i - 2) * 0.35, 0.1, -1.42], tail, 1, 0.01);
  }
  for (const x of [-0.7, 0.7])
    rounded(roof, [0.24, 0.14, 0.08], [x, 0.05, -1.44], tail, 2, 0.03);
  rounded(roof, [0.24, 0.14, 0.08], [0, 0.05, -1.44], amber, 2, 0.03);
  // Rear double doors, taillights, step bumper and plate.
  rounded(bed, [0.06, 1.3, 0.24], [0, 0.05, 0.16], dark, 1, 0.01);
  for (const x of [-0.5, 0.5]) {
    rounded(bed, [0.9, 0.5, 0.05], [x, 0.4, 0.16], glass, 3, 0.02);
    rounded(bed, [0.06, 0.5, 0.08], [x * 0.2, -0.1, 0.17], steel, 2, 0.02);
    for (const hy of [-0.5, 0.0, 0.5])
      rounded(bed, [0.08, 0.1, 0.06], [x * 1.8, hy, 0.15], steel, 1, 0.01);
  }
  rounded(bed, [0.36, 0.36, 0.04], [0, -0.42, 0.16], white, 2, 0.01);
  for (let i = 0; i < 3; i++) {
    const arm = rounded(bed, [0.3, 0.08, 0.05], [0, -0.42, 0.17], starBlue, 1, 0.01);
    arm.rotation.z = (i * Math.PI) / 3;
  }
  const step = groups.get("bumper-rear")!;
  rounded(step, [2.0, 0.12, 0.5], [0, -0.05, -0.1], dark, 2, 0.03);
  for (let i = 0; i < 8; i++)
    rounded(step, [0.18, 0.03, 0.4], [-0.8 + i * 0.23, 0.02, -0.1], steel, 1, 0.008);
  for (const x of [-0.85, 0.85]) {
    rounded(bed, [0.22, 0.5, 0.08], [x, -0.2, 0.14], tail, 2, 0.02);
    rounded(bed, [0.22, 0.16, 0.08], [x, 0.15, 0.14], amber, 2, 0.02);
    rounded(bed, [0.22, 0.12, 0.08], [x, -0.52, 0.14], cream, 1, 0.01);
    rounded(step, [0.25, 0.22, 0.04], [x, -0.14, 0.05], rubber, 1, 0.01);
  }
  rounded(step, [0.44, 0.11, 0.02], [0, 0.05, -0.32], cream, 1, 0.005);
  return car;
}
export function ambulanceStats(car: T.Object3D) {
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
