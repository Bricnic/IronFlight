import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { VehiclePart } from "./vehicles";
import type { TruckMaterials } from "./truck";
/** Low, narrow collider set on the shared 13 part slots. */
export const SPORTS_PARTS: VehiclePart[] = [
  { id: "chassis-front", pos: [0, 0, 0.8], size: [1.9, 0.55, 2.6], mass: 1500, hp: 300 },
  { id: "chassis-rear", pos: [0, 0, -1.6], size: [1.9, 0.55, 1.9], mass: 400, hp: 250 },
  { id: "wheel-fl", pos: [1.05, -0.55, 1.65], size: [0.45, 1.24, 1.24], mass: 60, hp: 100 },
  { id: "wheel-fr", pos: [-1.05, -0.55, 1.65], size: [0.45, 1.24, 1.24], mass: 60, hp: 100 },
  { id: "wheel-rl", pos: [1.05, -0.55, -1.65], size: [0.45, 1.24, 1.24], mass: 60, hp: 100, parent: "chassis-rear" },
  { id: "wheel-rr", pos: [-1.05, -0.55, -1.65], size: [0.45, 1.24, 1.24], mass: 60, hp: 100, parent: "chassis-rear" },
  { id: "hood", pos: [0, 0.45, 1.7], size: [1.8, 0.3, 1.3], mass: 40, hp: 90 },
  { id: "roof", pos: [0, 1.02, -0.3], size: [1.5, 0.2, 1.3], mass: 40, hp: 90 },
  { id: "door-left", pos: [0.98, 0.55, -0.35], size: [0.14, 0.7, 1.5], mass: 30, hp: 75 },
  { id: "door-right", pos: [-0.98, 0.55, -0.35], size: [0.14, 0.7, 1.5], mass: 30, hp: 75 },
  { id: "bed", pos: [0, 0.5, -1.95], size: [1.8, 0.3, 1.1], mass: 50, hp: 110, parent: "chassis-rear" },
  { id: "bumper-front", pos: [0, 0, 2.72], size: [1.95, 0.3, 0.25], mass: 35, hp: 100 },
  { id: "bumper-rear", pos: [0, 0.05, -2.72], size: [1.95, 0.3, 0.25], mass: 35, hp: 100, parent: "chassis-rear" },
];
export const SPORTS_SUSPENSION: [number, number, number][] = [
  [1.05, -0.25, 1.65],
  [-1.05, -0.25, 1.65],
  [1.05, -0.25, -1.65],
  [-1.05, -0.25, -1.65],
];
export const SPORTS_WHEEL_RADIUS = 0.62;
export const SPORTS_SUSPENSION_REST = 0.5;
/** Low-slung coupe. Every attachment owns a named group and local pivot. */
export function createSportsCar(materials: TruckMaterials = {}) {
  const car = new T.Group();
  car.name = "iron-flight-sports";
  const paint =
    materials.paint ??
    new T.MeshStandardMaterial({
      color: 0x1f6feb,
      metalness: 0.7,
      roughness: 0.25,
    });
  const steel =
    materials.metal ??
    new T.MeshStandardMaterial({
      color: 0x8d9b9f,
      metalness: 0.85,
      roughness: 0.32,
    });
  paint.userData.truckColorSlot = "primaryColor";
  steel.userData.truckColorSlot = "secondaryColor";
  const dark = new T.MeshStandardMaterial({
    color: 0x202a30,
    metalness: 0.65,
    roughness: 0.45,
  });
  const carbon = new T.MeshStandardMaterial({
    color: 0x111417,
    metalness: 0.4,
    roughness: 0.55,
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
  const tail = new T.MeshStandardMaterial({
    color: 0xef241c,
    emissive: 0xa80b00,
    emissiveIntensity: 1.2,
  });
  const caliper = new T.MeshStandardMaterial({
    color: 0xc2140c,
    metalness: 0.4,
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
    mat: T.Material = paint,
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
  for (const def of SPORTS_PARTS) {
    const g = new T.Group();
    g.name = def.id;
    g.position.fromArray(def.pos);
    car.add(g);
    groups.set(def.id, g);
    if (def.id.startsWith("wheel")) {
      const tire = new T.TorusGeometry(0.44, 0.18, 32, 112);
      tire.rotateY(Math.PI / 2);
      mesh(g, tire, rubber);
      const drum = mesh(
        g,
        new T.CylinderGeometry(0.3, 0.3, 0.3, 40, 2),
        steel,
      );
      drum.rotation.z = Math.PI / 2;
      const disc = mesh(
        g,
        new T.CylinderGeometry(0.26, 0.26, 0.34, 32),
        dark,
        [0, 0, 0],
      );
      disc.rotation.z = Math.PI / 2;
      rounded(g, [0.36, 0.16, 0.12], [0, 0.05, 0.3], caliper, 2, 0.03);
      for (const side of [-1, 1]) {
        const lip = new T.TorusGeometry(0.3, 0.028, 12, 64);
        lip.rotateY(Math.PI / 2);
        mesh(g, lip, steel, [side * 0.17, 0, 0]);
        const hub = mesh(
          g,
          new T.CylinderGeometry(0.09, 0.11, 0.1, 20),
          dark,
          [side * 0.18, 0, 0],
        );
        hub.rotation.z = Math.PI / 2;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          for (const lean of [-0.09, 0.09]) {
            const spoke = rounded(
              g,
              [0.05, 0.2, 0.055],
              [
                side * 0.17,
                Math.cos(a + lean) * 0.19,
                Math.sin(a + lean) * 0.19,
              ],
              steel,
              1,
              0.012,
            );
            spoke.rotation.x = a + lean;
          }
          const bolt = mesh(
            g,
            new T.CylinderGeometry(0.018, 0.018, 0.03, 6),
            cream,
            [side * 0.2, Math.cos(a) * 0.13, Math.sin(a) * 0.13],
          );
          bolt.rotation.z = Math.PI / 2;
        }
      }
    } else {
      const structural = def.id.startsWith("chassis");
      rounded(
        g,
        [...def.size],
        [0, 0, 0],
        structural ? dark : def.id.startsWith("bumper") ? steel : paint,
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
  // Low nose wedge, fender crowns and arch trim over each wheel.
  rounded(front, [1.86, 0.4, 2.5], [0, -0.04, 0.1], paint, 8, 0.14);
  rounded(rear, [1.86, 0.4, 1.8], [0, -0.04, -0.05], paint, 8, 0.14);
  for (const side of [-1, 1]) {
    rounded(
      front,
      [0.3, 0.3, 1.15],
      [side * 0.78, 0.14, 0.55],
      paint,
      6,
      0.12,
    );
    rounded(
      rear,
      [0.3, 0.32, 1.0],
      [side * 0.78, 0.14, -0.05],
      paint,
      6,
      0.12,
    );
    for (const [parent, z] of [[front, 0.85], [rear, -0.05]] as const) {
      const arch = new T.TorusGeometry(0.68, 0.05, 10, 48, Math.PI);
      arch.rotateY(Math.PI / 2);
      mesh(parent, arch, carbon, [side * 1.0, -0.35, z]);
    }
  }
  // Cockpit: bucket seats, dash, wheel and shifter.
  const upholstery = new T.MeshStandardMaterial({
    color: 0x7a1210,
    roughness: 0.9,
  });
  for (const x of [-0.42, 0.42]) {
    const seat = new T.Group();
    seat.name = x > 0 ? "driver-seat" : "passenger-seat";
    front.add(seat);
    rounded(seat, [0.56, 0.18, 0.55], [x, 0.42, -1.05], upholstery, 4, 0.07);
    rounded(seat, [0.56, 0.6, 0.15], [x, 0.76, -1.3], upholstery, 4, 0.07);
    rounded(seat, [0.3, 0.2, 0.14], [x, 1.12, -1.3], upholstery, 3, 0.06);
  }
  rounded(front, [1.6, 0.22, 0.5], [0, 0.62, -0.42], dark, 4, 0.08);
  rounded(front, [0.5, 0.1, 0.06], [0.42, 0.72, -0.3], carbon, 2, 0.02);
  const steering = mesh(
    front,
    new T.TorusGeometry(0.19, 0.03, 12, 40),
    rubber,
    [0.42, 0.82, -0.55],
  );
  steering.name = "steering-wheel-left";
  steering.rotation.x = -0.5;
  bar(
    front,
    new T.Vector3(0.42, 0.82, -0.55),
    new T.Vector3(0.42, 0.62, -0.32),
    0.032,
    dark,
  );
  bar(
    front,
    new T.Vector3(0.1, 0.35, -0.75),
    new T.Vector3(0.1, 0.55, -0.7),
    0.02,
    steel,
  );
  mesh(front, new T.SphereGeometry(0.045, 16, 12), carbon, [0.1, 0.57, -0.69]);
  // Hood scoop, vents and quad headlight clusters.
  rounded(hood, [0.72, 0.12, 0.62], [0, 0.18, -0.18], paint, 4, 0.05);
  rounded(hood, [0.5, 0.06, 0.3], [0, 0.2, 0.12], dark, 2, 0.02);
  for (const x of [-0.55, 0.55])
    for (let i = 0; i < 4; i++)
      rounded(
        hood,
        [0.3, 0.02, 0.06],
        [x, 0.16, -0.42 + i * 0.12],
        dark,
        1,
        0.008,
      );
  for (const x of [-0.62, 0.62])
    for (const dz of [0.42, 0.6]) {
      const lamp = mesh(
        hood,
        new T.CylinderGeometry(0.11, 0.11, 0.08, 28),
        light,
        [x, 0.0, dz],
      );
      lamp.rotation.x = Math.PI / 2;
      const ring = new T.TorusGeometry(0.115, 0.022, 10, 36);
      mesh(hood, ring, steel, [x, 0.0, dz + 0.045]);
    }
  rounded(hood, [0.16, 0.05, 0.02], [0, 0.1, 0.62], cream, 2, 0.01);
  // Glass canopy, pillars and roof scoop.
  const windshield = rounded(
    roof,
    [1.34, 0.72, 0.05],
    [0, -0.32, 0.72],
    glass,
    4,
    0.02,
  );
  windshield.rotation.x = 0.48;
  const backglass = rounded(
    roof,
    [1.2, 0.55, 0.045],
    [0, -0.3, -0.7],
    glass,
    4,
    0.02,
  );
  backglass.rotation.x = -0.42;
  for (const x of [-0.62, 0.62]) {
    bar(
      roof,
      new T.Vector3(x, -0.62, 0.95),
      new T.Vector3(x * 0.9, -0.08, 0.6),
      0.04,
      dark,
    );
    bar(
      roof,
      new T.Vector3(x, -0.6, -0.9),
      new T.Vector3(x * 0.9, -0.08, -0.58),
      0.04,
      dark,
    );
  }
  rounded(roof, [0.34, 0.1, 0.5], [0, 0.14, -0.2], paint, 3, 0.04);
  rounded(roof, [0.2, 0.05, 0.3], [0, 0.16, -0.2], dark, 2, 0.02);
  mesh(roof, new T.CylinderGeometry(0.015, 0.02, 0.3, 8), dark, [0, 0.28, -0.55]);
  // Doors: glass, handles, stripes, mirrors, skirts and intakes.
  for (const side of [-1, 1]) {
    const door = groups.get(side > 0 ? "door-left" : "door-right")!;
    rounded(door, [0.05, 0.4, 1.05], [0, 0.5, -0.05], glass, 3, 0.02);
    rounded(
      door,
      [0.06, 0.06, 0.24],
      [side * 0.09, 0.18, -0.4],
      steel,
      2,
      0.02,
    );
    const stripe = rounded(
      door,
      [0.02, 0.14, 1.4],
      [side * 0.08, -0.18, 0],
      cream,
      1,
      0.005,
    );
    stripe.name = "livery-stripe";
    rounded(door, [0.16, 0.16, 1.5], [0, -0.42, 0], carbon, 3, 0.04);
    rounded(door, [0.1, 0.3, 0.4], [side * 0.05, 0.1, -0.62], dark, 2, 0.03);
    for (let i = 0; i < 3; i++)
      rounded(
        door,
        [0.11, 0.04, 0.34],
        [side * 0.05, 0.02 + i * 0.09, -0.62],
        steel,
        1,
        0.01,
      );
    bar(
      door,
      new T.Vector3(side * 0.06, 0.42, 0.62),
      new T.Vector3(side * 0.2, 0.5, 0.62),
      0.025,
      dark,
    );
    rounded(door, [0.14, 0.12, 0.2], [side * 0.26, 0.52, 0.62], paint, 3, 0.04);
    rounded(
      door,
      [0.02, 0.09, 0.16],
      [side * 0.2, 0.52, 0.62],
      glass,
      1,
      0.005,
    );
  }
  // Rear deck: louvered engine cover and a full GT wing.
  rounded(bed, [1.7, 0.1, 1.0], [0, 0.18, 0.05], paint, 4, 0.04);
  for (const x of [-0.45, 0.45])
    for (let i = 0; i < 4; i++)
      rounded(
        bed,
        [0.32, 0.02, 0.07],
        [x, 0.22, -0.25 + i * 0.14],
        dark,
        1,
        0.008,
      );
  for (const x of [-0.6, 0.6]) {
    rounded(bed, [0.08, 0.5, 0.3], [x, 0.42, -0.3], carbon, 2, 0.03);
    rounded(bed, [0.05, 0.34, 0.42], [x * 1.5, 0.62, -0.38], carbon, 2, 0.02);
  }
  const wing = rounded(bed, [1.9, 0.06, 0.46], [0, 0.66, -0.38], paint, 4, 0.02);
  wing.rotation.x = -0.09;
  const flap = rounded(bed, [1.9, 0.04, 0.2], [0, 0.74, -0.52], carbon, 2, 0.015);
  flap.rotation.x = -0.28;
  rounded(bed, [0.5, 0.05, 0.04], [0, 0.62, -0.58], tail, 1, 0.01);
  // Front splitter, grille, canards and tow hook.
  const splitter = groups.get("bumper-front")!;
  rounded(splitter, [1.95, 0.09, 0.55], [0, -0.12, 0.1], carbon, 3, 0.03);
  rounded(splitter, [1.9, 0.2, 0.18], [0, 0.02, 0.05], paint, 6, 0.07);
  rounded(splitter, [1.3, 0.2, 0.06], [0, -0.02, 0.16], dark, 2, 0.02);
  for (let i = 0; i < 7; i++)
    rounded(
      splitter,
      [0.05, 0.16, 0.04],
      [(i - 3) * 0.16, -0.02, 0.19],
      steel,
      1,
      0.012,
    );
  for (const x of [-0.85, 0.85]) {
    const canard = rounded(
      splitter,
      [0.3, 0.03, 0.22],
      [x, 0.1, 0.12],
      carbon,
      1,
      0.008,
    );
    canard.rotation.z = x > 0 ? -0.12 : 0.12;
    const hook = new T.TorusGeometry(0.07, 0.02, 8, 20);
    mesh(splitter, hook, cream, [x * 0.5, -0.18, 0.2]);
  }
  // Rear diffuser, quad exhausts and full-width tail bar.
  const diffuser = groups.get("bumper-rear")!;
  rounded(diffuser, [1.9, 0.2, 0.18], [0, 0.04, -0.05], paint, 6, 0.07);
  rounded(diffuser, [1.7, 0.16, 0.3], [0, -0.1, -0.08], dark, 3, 0.03);
  for (let i = 0; i < 7; i++)
    rounded(
      diffuser,
      [0.04, 0.14, 0.28],
      [(i - 3) * 0.22, -0.1, -0.08],
      carbon,
      1,
      0.01,
    );
  rounded(diffuser, [1.6, 0.13, 0.05], [0, 0.12, -0.15], tail, 3, 0.02);
  for (const x of [-0.45, -0.15, 0.15, 0.45]) {
    const pipe = mesh(
      diffuser,
      new T.CylinderGeometry(0.055, 0.06, 0.22, 20),
      steel,
      [x, -0.06, -0.2],
    );
    pipe.rotation.x = Math.PI / 2;
    const tip = mesh(
      diffuser,
      new T.CylinderGeometry(0.045, 0.045, 0.02, 20),
      dark,
      [x, -0.06, -0.31],
    );
    tip.rotation.x = Math.PI / 2;
  }
  const plate = rounded(
    diffuser,
    [0.44, 0.11, 0.02],
    [0, -0.02, -0.16],
    cream,
    1,
    0.005,
  );
  plate.name = "plate-rear";
  return car;
}
export function sportsCarStats(car: T.Object3D) {
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
