import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { VehiclePart } from "./vehicles";
import type { TruckMaterials } from "./truck";
/** Sedan collider set on the shared 13 part slots. */
export const COP_PARTS: VehiclePart[] = [
  { id: "chassis-front", pos: [0, 0, 0.8], size: [1.95, 0.6, 2.6], mass: 1600, hp: 300 },
  { id: "chassis-rear", pos: [0, 0, -1.6], size: [1.95, 0.6, 1.9], mass: 450, hp: 250 },
  { id: "wheel-fl", pos: [1.05, -0.6, 1.65], size: [0.5, 1.36, 1.36], mass: 70, hp: 100 },
  { id: "wheel-fr", pos: [-1.05, -0.6, 1.65], size: [0.5, 1.36, 1.36], mass: 70, hp: 100 },
  { id: "wheel-rl", pos: [1.05, -0.6, -1.65], size: [0.5, 1.36, 1.36], mass: 70, hp: 100, parent: "chassis-rear" },
  { id: "wheel-rr", pos: [-1.05, -0.6, -1.65], size: [0.5, 1.36, 1.36], mass: 70, hp: 100, parent: "chassis-rear" },
  { id: "hood", pos: [0, 0.5, 1.7], size: [1.85, 0.32, 1.3], mass: 45, hp: 90 },
  { id: "roof", pos: [0, 1.15, -0.3], size: [1.6, 0.22, 1.4], mass: 45, hp: 90 },
  { id: "door-left", pos: [1.0, 0.65, -0.35], size: [0.15, 0.8, 1.55], mass: 32, hp: 75 },
  { id: "door-right", pos: [-1.0, 0.65, -0.35], size: [0.15, 0.8, 1.55], mass: 32, hp: 75 },
  { id: "bed", pos: [0, 0.55, -1.95], size: [1.85, 0.32, 1.1], mass: 55, hp: 110, parent: "chassis-rear" },
  { id: "bumper-front", pos: [0, 0.05, 2.72], size: [2.0, 0.32, 0.25], mass: 38, hp: 100 },
  { id: "bumper-rear", pos: [0, 0.05, -2.72], size: [2.0, 0.32, 0.25], mass: 38, hp: 100, parent: "chassis-rear" },
];
export const COP_SUSPENSION: [number, number, number][] = [
  [1.05, -0.28, 1.65],
  [-1.05, -0.28, 1.65],
  [1.05, -0.28, -1.65],
  [-1.05, -0.28, -1.65],
];
export const COP_WHEEL_RADIUS = 0.68;
export const COP_SUSPENSION_REST = 0.55;
/** Black-and-white interceptor. Fixed livery; ignores the color picker. */
export function createCopCar(_materials: TruckMaterials = {}) {
  const car = new T.Group();
  car.name = "iron-flight-cop";
  const black = new T.MeshStandardMaterial({
    color: 0x14171b,
    metalness: 0.7,
    roughness: 0.3,
  });
  const white = new T.MeshStandardMaterial({
    color: 0xf2f4f4,
    metalness: 0.35,
    roughness: 0.35,
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
    mat: T.Material = black,
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
  for (const def of COP_PARTS) {
    const g = new T.Group();
    g.name = def.id;
    g.position.fromArray(def.pos);
    car.add(g);
    groups.set(def.id, g);
    if (def.id.startsWith("wheel")) {
      const tire = new T.TorusGeometry(0.5, 0.18, 32, 112);
      tire.rotateY(Math.PI / 2);
      mesh(g, tire, rubber);
      const drum = mesh(
        g,
        new T.CylinderGeometry(0.34, 0.34, 0.32, 40, 2),
        dark,
      );
      drum.rotation.z = Math.PI / 2;
      const disc = mesh(
        g,
        new T.CylinderGeometry(0.28, 0.28, 0.36, 32),
        steel,
      );
      disc.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        const ring = new T.TorusGeometry(0.33, 0.03, 12, 64);
        ring.rotateY(Math.PI / 2);
        mesh(g, ring, steel, [side * 0.18, 0, 0]);
        const cap = mesh(
          g,
          new T.SphereGeometry(0.2, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
          steel,
          [side * 0.16, 0, 0],
        );
        cap.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        const wall = new T.TorusGeometry(0.42, 0.02, 8, 72);
        wall.rotateY(Math.PI / 2);
        mesh(g, wall, dark, [side * 0.14, 0, 0]);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const lug = mesh(
            g,
            new T.CylinderGeometry(0.022, 0.022, 0.04, 6),
            cream,
            [side * 0.2, Math.cos(a) * 0.11, Math.sin(a) * 0.11],
          );
          lug.rotation.z = Math.PI / 2;
        }
      }
    } else {
      const structural = def.id.startsWith("chassis");
      const whitePanel =
        def.id.startsWith("door") || def.id === "bed";
      rounded(
        g,
        [...def.size],
        [0, 0, 0],
        structural ? dark : whitePanel ? white : black,
        structural ? 2 : 8,
        structural ? 0.06 : 0.1,
      );
    }
  }
  const hood = groups.get("hood")!,
    roof = groups.get("roof")!,
    bed = groups.get("bed")!,
    front = groups.get("chassis-front")!,
    rear = groups.get("chassis-rear")!;
  // Sedan shell: sills, fenders, pillars and underbody hardware.
  rounded(front, [1.9, 0.5, 2.5], [0, 0.02, 0.1], black, 8, 0.14);
  rounded(rear, [1.9, 0.5, 1.8], [0, 0.02, -0.05], black, 8, 0.14);
  for (const side of [-1, 1]) {
    rounded(front, [0.24, 0.34, 1.2], [side * 0.83, 0.2, 0.55], black, 6, 0.12);
    rounded(rear, [0.24, 0.36, 1.05], [side * 0.83, 0.2, -0.05], black, 6, 0.12);
    for (const [parent, z] of [[front, 0.85], [rear, -0.05]] as const) {
      const arch = new T.TorusGeometry(0.74, 0.055, 10, 56, Math.PI);
      arch.rotateY(Math.PI / 2);
      mesh(parent, arch, black, [side * 1.02, -0.4, z]);
    }
    bar(
      front,
      new T.Vector3(side * 0.5, -0.35, -1.2),
      new T.Vector3(side * 0.5, -0.35, 1.2),
      0.06,
      steel,
    );
  }
  bar(
    front,
    new T.Vector3(0, -0.4, -1.25),
    new T.Vector3(0, -0.4, 1.25),
    0.05,
    dark,
  );
  rounded(rear, [1.2, 0.35, 0.8], [0, -0.2, 0.2], dark, 2, 0.08);
  const muffler = mesh(
    rear,
    new T.CylinderGeometry(0.11, 0.11, 0.7, 20),
    steel,
    [0.45, -0.35, -0.6],
  );
  muffler.rotation.x = Math.PI / 2;
  // Cockpit: seats, dash with laptop, cage partition, wheel.
  const upholstery = new T.MeshStandardMaterial({
    color: 0x23262b,
    roughness: 0.95,
  });
  for (const x of [-0.45, 0.45]) {
    const seat = new T.Group();
    seat.name = x > 0 ? "driver-seat" : "passenger-seat";
    front.add(seat);
    rounded(seat, [0.6, 0.2, 0.58], [x, 0.5, -1.02], upholstery, 4, 0.08);
    rounded(seat, [0.6, 0.62, 0.16], [x, 0.86, -1.28], upholstery, 4, 0.08);
    rounded(seat, [0.32, 0.2, 0.15], [x, 1.24, -1.28], upholstery, 3, 0.06);
  }
  rounded(front, [0.7, 0.55, 0.14], [-0.45, 0.85, -1.28], upholstery, 3, 0.06);
  rounded(front, [1.7, 0.24, 0.55], [0, 0.72, -0.35], dark, 4, 0.09);
  rounded(front, [1.5, 0.05, 0.3], [0, 1.05, -0.62], white, 2, 0.02);
  for (const x of [-0.5, 0.5]) {
    rounded(front, [0.4, 0.5, 0.16], [x, 0.85, -1.32], upholstery, 3, 0.06);
    bar(
      front,
      new T.Vector3(x * 1.7, 0.45, -1.05),
      new T.Vector3(x * 1.7, 1.35, -1.05),
      0.025,
      steel,
    );
  }
  for (let i = 0; i < 4; i++)
    bar(
      front,
      new T.Vector3(-0.85, 0.6 + i * 0.22, -1.05),
      new T.Vector3(0.85, 0.6 + i * 0.22, -1.05),
      0.018,
      steel,
    );
  rounded(front, [0.42, 0.3, 0.04], [0, 0.95, -0.5], dark, 2, 0.015);
  const screen = rounded(
    front,
    [0.36, 0.24, 0.02],
    [0, 0.95, -0.47],
    new T.MeshStandardMaterial({
      color: 0x0a2a3a,
      emissive: 0x2a9adf,
      emissiveIntensity: 0.8,
    }),
    1,
    0.005,
  );
  screen.name = "mtd-screen";
  rounded(front, [0.5, 0.08, 0.3], [0, 0.62, -0.62], dark, 2, 0.02);
  const steering = mesh(
    front,
    new T.TorusGeometry(0.2, 0.032, 12, 44),
    rubber,
    [0.45, 0.92, -0.52],
  );
  steering.name = "steering-wheel-left";
  steering.rotation.x = -0.5;
  bar(
    front,
    new T.Vector3(0.45, 0.92, -0.52),
    new T.Vector3(0.45, 0.7, -0.3),
    0.032,
    dark,
  );
  // Hood vents, grille, headlights, signals and push bumper.
  rounded(hood, [1.5, 0.08, 0.5], [0, 0.18, -0.3], black, 4, 0.04);
  for (let i = 0; i < 5; i++)
    rounded(hood, [1.2, 0.03, 0.05], [0, 0.19, -0.48 + i * 0.11], dark, 1, 0.01);
  const nose = groups.get("bumper-front")!;
  rounded(nose, [1.95, 0.26, 0.2], [0, 0.03, 0.03], black, 6, 0.08);
  rounded(nose, [1.2, 0.18, 0.06], [0, 0.0, 0.14], dark, 2, 0.02);
  for (let i = 0; i < 4; i++)
    rounded(nose, [1.1, 0.03, 0.04], [0, -0.06 + i * 0.05, 0.16], steel, 1, 0.01);
  for (const x of [-0.68, 0.68]) {
    rounded(hood, [0.42, 0.16, 0.1], [x, 0.02, 0.6], light, 3, 0.04);
    rounded(nose, [0.3, 0.1, 0.06], [x, -0.06, 0.14], amber, 2, 0.02);
    const fog = mesh(
      nose,
      new T.CylinderGeometry(0.07, 0.07, 0.06, 20),
      light,
      [x * 0.7, -0.1, 0.15],
    );
    fog.rotation.x = Math.PI / 2;
  }
  for (const x of [-0.6, -0.2, 0.2, 0.6])
    bar(
      nose,
      new T.Vector3(x, -0.12, 0.3),
      new T.Vector3(x, 0.42, 0.3),
      0.035,
      dark,
    );
  for (const y of [-0.05, 0.32])
    bar(nose, new T.Vector3(-0.75, y, 0.3), new T.Vector3(0.75, y, 0.3), 0.035, dark);
  rounded(nose, [0.5, 0.3, 0.03], [0, 0.12, 0.3], dark, 2, 0.02);
  rounded(nose, [0.44, 0.11, 0.02], [0, -0.1, 0.2], cream, 1, 0.005);
  // Glasshouse, spotlights, mirrors, handles and trim.
  const windshield = rounded(
    roof,
    [1.44, 0.78, 0.05],
    [0, -0.36, 0.78],
    glass,
    6,
    0.02,
  );
  windshield.rotation.x = 0.42;
  const backglass = rounded(
    roof,
    [1.3, 0.62, 0.045],
    [0, -0.34, -0.76],
    glass,
    6,
    0.02,
  );
  backglass.rotation.x = -0.38;
  for (const x of [-0.68, 0.68]) {
    bar(
      roof,
      new T.Vector3(x, -0.7, 1.0),
      new T.Vector3(x * 0.92, -0.1, 0.66),
      0.045,
      black,
    );
    bar(
      roof,
      new T.Vector3(x, -0.66, -0.96),
      new T.Vector3(x * 0.92, -0.1, -0.64),
      0.045,
      black,
    );
  }
  for (const side of [-1, 1]) {
    const door = groups.get(side > 0 ? "door-left" : "door-right")!;
    rounded(door, [0.05, 0.44, 0.62], [0, 0.58, 0.32], glass, 4, 0.02);
    rounded(door, [0.05, 0.44, 0.55], [0, 0.58, -0.38], glass, 4, 0.02);
    rounded(door, [0.07, 0.5, 0.07], [0, 0.56, -0.03], white, 2, 0.02);
    for (const z of [0.3, -0.42])
      rounded(
        door,
        [0.06, 0.06, 0.22],
        [side * 0.09, 0.28, z],
        dark,
        2,
        0.02,
      );
    rounded(door, [0.03, 0.1, 1.45], [side * 0.085, -0.05, 0], dark, 1, 0.008);
    rounded(door, [0.2, 0.14, 0.5], [side * 0.06, -0.32, 0], dark, 2, 0.03);
    bar(
      door,
      new T.Vector3(side * 0.07, 0.5, 0.66),
      new T.Vector3(side * 0.22, 0.56, 0.66),
      0.025,
      black,
    );
    rounded(door, [0.15, 0.13, 0.22], [side * 0.28, 0.58, 0.66], black, 3, 0.04);
    bar(
      door,
      new T.Vector3(side * 0.05, 0.62, 0.6),
      new T.Vector3(side * 0.16, 0.86, 0.6),
      0.02,
      steel,
    );
    const spot = mesh(
      door,
      new T.CylinderGeometry(0.06, 0.07, 0.14, 16),
      dark,
      [side * 0.18, 0.92, 0.6],
    );
    spot.rotation.z = (side * Math.PI) / 2;
    const lens = mesh(
      door,
      new T.CylinderGeometry(0.05, 0.05, 0.02, 16),
      light,
      [side * 0.26, 0.92, 0.6],
    );
    lens.rotation.z = (side * Math.PI) / 2;
  }
  // Light bar: base, red/blue domes, clear center and alley lights.
  rounded(roof, [1.5, 0.09, 0.34], [0, 0.16, 0.1], dark, 3, 0.03);
  const domeA = rounded(
    roof,
    [0.55, 0.16, 0.28],
    [0.42, 0.28, 0.1],
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
    roof,
    [0.55, 0.16, 0.28],
    [-0.42, 0.28, 0.1],
    new T.MeshStandardMaterial({
      color: 0x0d1c7a,
      emissive: 0x2255ff,
      emissiveIntensity: 0.15,
      roughness: 0.25,
    }),
    4,
    0.06,
  );
  domeB.name = "lightbar-b";
  rounded(roof, [0.28, 0.14, 0.26], [0, 0.27, 0.1], glass, 3, 0.05);
  for (const x of [-0.68, 0.68])
    rounded(roof, [0.1, 0.1, 0.2], [x, 0.24, 0.1], light, 2, 0.03);
  mesh(roof, new T.CylinderGeometry(0.012, 0.018, 0.55, 8), dark, [0.5, 0.4, -0.5]);
  rounded(roof, [0.06, 0.12, 0.22], [-0.4, 0.2, -0.45], black, 2, 0.03);
  // Trunk lid, spoiler lip, taillights, exhausts and plate.
  rounded(bed, [1.7, 0.1, 1.0], [0, 0.19, 0], white, 4, 0.04);
  rounded(bed, [1.7, 0.08, 0.12], [0, 0.24, -0.5], black, 2, 0.03);
  rounded(bed, [0.3, 0.06, 0.02], [0, 0.2, 0.3], dark, 1, 0.01);
  const tailgate = groups.get("bumper-rear")!;
  rounded(tailgate, [1.95, 0.26, 0.2], [0, 0.03, -0.03], black, 6, 0.08);
  for (const x of [-0.68, 0.68]) {
    rounded(bed, [0.4, 0.18, 0.08], [x, 0.05, -0.55], tail, 3, 0.03);
    rounded(tailgate, [0.2, 0.08, 0.05], [x, 0.02, -0.14], cream, 1, 0.01);
    const pipe = mesh(
      tailgate,
      new T.CylinderGeometry(0.05, 0.055, 0.24, 18),
      steel,
      [x * 0.6, -0.1, -0.16],
    );
    pipe.rotation.x = Math.PI / 2;
  }
  rounded(tailgate, [0.44, 0.11, 0.02], [0, 0.02, -0.15], cream, 1, 0.005);
  for (const x of [-0.85, 0.85])
    rounded(tailgate, [0.25, 0.2, 0.04], [x, -0.12, -0.05], rubber, 1, 0.01);
  return car;
}
export function copCarStats(car: T.Object3D) {
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
