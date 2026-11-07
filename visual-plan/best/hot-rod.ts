import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PARTS } from "./damage";
import type { VehiclePart } from "./vehicles";
import type { TruckMaterials } from "./truck";

/** Monster-clone colliders; doors tuck to the coupe flank for the decal. */
export const HOTROD_PARTS: VehiclePart[] = PARTS.map((p) =>
  p.id === "door-left"
    ? { ...p, pos: [0.95, 0.35, -0.1] as const }
    : p.id === "door-right"
      ? { ...p, pos: [-0.95, 0.35, -0.1] as const }
      : { ...p },
);
export const HOTROD_SUSPENSION: [number, number, number][] = [
  [1.65, -0.35, 1.65],
  [-1.65, -0.35, 1.65],
  [1.65, -0.35, -1.65],
  [-1.65, -0.35, -1.65],
];
export const HOTROD_WHEEL_RADIUS = 1.05;
export const HOTROD_SUSPENSION_REST = 0.6;

/** Black highboy coupe: exposed aluminum V8, white headers, big rear tires. */
export function createHotRod(_materials: TruckMaterials = {}) {
  const rod = new T.Group();
  rod.name = "iron-flight-hot-rod";
  // Fixed gloss-black livery: the tuning picker must not recolor the body.
  const black = new T.MeshStandardMaterial({
    color: 0x17171a,
    metalness: 0.3,
    roughness: 0.35,
  });
  const steel = new T.MeshStandardMaterial({
    color: 0x8d9b9f,
    metalness: 0.85,
    roughness: 0.32,
  });
  const alu = new T.MeshStandardMaterial({
    color: 0xc9cdd2,
    metalness: 0.9,
    roughness: 0.3,
  });
  const scoopGray = new T.MeshStandardMaterial({
    color: 0xd5d8dc,
    metalness: 0.6,
    roughness: 0.35,
  });
  const pipe = new T.MeshStandardMaterial({
    color: 0xf2f3f4,
    roughness: 0.4,
  });
  const red = new T.MeshStandardMaterial({
    color: 0xbe222a,
    metalness: 0.3,
    roughness: 0.4,
  });
  const rubber = new T.MeshStandardMaterial({
    color: 0x1b1c1f,
    roughness: 0.9,
  });
  const hubGray = new T.MeshStandardMaterial({
    color: 0x9aa0a6,
    metalness: 0.7,
    roughness: 0.35,
  });
  const glass = new T.MeshStandardMaterial({
    color: 0x232a30,
    metalness: 0.2,
    roughness: 0.15,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x101114,
    metalness: 0.4,
    roughness: 0.6,
  });
  const seatRed = new T.MeshStandardMaterial({
    color: 0x8e1a20,
    roughness: 0.85,
  });
  const lamp = new T.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.5,
  });
  const tailRed = new T.MeshStandardMaterial({
    color: 0xef241c,
    emissive: 0xa80b00,
    emissiveIntensity: 1.2,
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
    mat: T.Material = black,
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
  for (const def of HOTROD_PARTS) {
    const g = new T.Group();
    g.name = def.id;
    g.position.fromArray(def.pos);
    rod.add(g);
    groups.set(def.id, g);
  }
  const front = groups.get("chassis-front")!;
  const rear = groups.get("chassis-rear")!;
  const hood = groups.get("hood")!;
  const roof = groups.get("roof")!;
  const bed = groups.get("bed")!;
  const nose = groups.get("bumper-front")!;
  const tail = groups.get("bumper-rear")!;

  // Wheels: narrow 8-spoke fronts with red dots, wide deep-tread rears.
  for (const [id, wide] of [
    ["wheel-fl", false],
    ["wheel-fr", false],
    ["wheel-rl", true],
    ["wheel-rr", true],
  ] as const) {
    const g = groups.get(id)!;
    const R = wide ? 0.7 : 0.75;
    const tube = wide ? 0.35 : 0.3;
    const tire = new T.TorusGeometry(R, tube, 32, 96);
    tire.rotateY(Math.PI / 2);
    mesh(g, tire, rubber);
    const blocks = wide ? 24 : 20;
    const tread = new T.BoxGeometry(wide ? 0.5 : 0.34, 0.14, 0.24);
    const treads = new T.InstancedMesh(tread, rubber, blocks * 2);
    treads.castShadow = true;
    treads.receiveShadow = true;
    g.add(treads);
    const dummy = new T.Object3D();
    let ti = 0;
    for (let i = 0; i < blocks; i++) {
      for (const side of [-1, 1]) {
        const angle = (i / blocks) * Math.PI * 2 + side * 0.03;
        dummy.position.set(
          side * (wide ? 0.24 : 0.16),
          Math.cos(angle) * 1.04,
          Math.sin(angle) * 1.04,
        );
        dummy.rotation.set(angle, side * 0.4, 0);
        dummy.updateMatrix();
        treads.setMatrixAt(ti++, dummy.matrix);
      }
    }
    const drum = mesh(
      g,
      new T.CylinderGeometry(wide ? 0.5 : 0.42, wide ? 0.5 : 0.42, wide ? 0.5 : 0.34, 32),
      dark,
    );
    drum.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const lip = new T.TorusGeometry(wide ? 0.5 : 0.42, 0.03, 10, 48);
      lip.rotateY(Math.PI / 2);
      mesh(g, lip, hubGray, [side * (wide ? 0.27 : 0.19), 0, 0]);
      const spokes = 8;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        const rr = wide ? 0.3 : 0.24;
        const spoke = rounded(
          g,
          [0.05, 0.2, 0.06],
          [
            side * (wide ? 0.27 : 0.19),
            Math.cos(a) * rr,
            Math.sin(a) * rr,
          ],
          hubGray,
          1,
          0.012,
        );
        spoke.rotation.x = a;
      }
      const dot = mesh(
        g,
        new T.CylinderGeometry(wide ? 0.09 : 0.07, wide ? 0.09 : 0.07, 0.06, 12),
        red,
        [side * (wide ? 0.29 : 0.21), 0, 0],
      );
      dot.rotation.z = Math.PI / 2;
    }
  }

  // Frame rails, floor, silver belly strip.
  for (const side of [-1, 1]) {
    rounded(front, [0.15, 0.25, 2.6], [side * 0.6, -0.9, 0.1], dark, 1, 0.02);
    rounded(rear, [0.15, 0.25, 2.0], [side * 0.6, -0.9, -0.1], dark, 1, 0.02);
  }
  rounded(front, [1.2, 0.1, 2.6], [0, -0.95, 0.1], dark, 1, 0.02);
  rounded(rear, [1.2, 0.1, 2.0], [0, -0.95, -0.1], dark, 1, 0.02);
  rounded(front, [0.23, 0.06, 2.6], [0, -1.02, 0.1], steel, 1, 0.01);
  rounded(rear, [0.23, 0.06, 2.0], [0, -1.02, -0.1], steel, 1, 0.01);

  // Cabin: tall square coupe on the roof group + door flanks.
  rounded(roof, [2.1, 0.12, 2.4], [0, -0.44, -0.2], black);
  const windshield = rounded(roof, [1.7, 0.9, 0.08], [0, -0.95, 0.75], glass, 1, 0.02);
  windshield.rotation.x = 0.15;
  rounded(roof, [1.7, 0.5, 0.12], [0, -1.3, 0.75], black, 1, 0.02);
  rounded(roof, [1.9, 2.3, 0.18], [0, -1.65, -1.5], black);
  rounded(roof, [1.7, 0.1, 2.0], [0, -0.32, -0.2], black, 3, 0.04);
  for (const side of [-1, 1]) {
    const door = groups.get(side > 0 ? "door-left" : "door-right")!;
    rounded(door, [0.15, 2.3, 2.3], [0, -0.15, -0.3], black);
    rounded(door, [0.1, 0.4, 1.5], [side * 0.04, 0.6, -0.55], glass, 1, 0.02);
    rounded(door, [0.05, 0.08, 0.22], [side * 0.08, -0.45, -0.35], pipe, 1, 0.01);
  }
  // Red seat + white steering yoke glimpsed through the glass.
  rounded(roof, [0.55, 0.7, 0.18], [0.3, -1.15, -0.9], seatRed, 1, 0.04);
  const yoke = mesh(roof, new T.TorusGeometry(0.16, 0.03, 10, 24), pipe, [0.3, -1.1, -0.35]);
  yoke.rotation.x = -0.5;
  bar(roof, new T.Vector3(0.3, -1.1, -0.35), new T.Vector3(0.3, -1.35, -0.15), 0.025, dark);

  // Firewall with studs ahead of the cabin.
  rounded(hood, [1.6, 1.0, 0.12], [0, -0.9, -0.75], black, 1, 0.02);
  for (let ix = 0; ix < 3; ix++)
    for (let iy = 0; iy < 2; iy++)
      mesh(
        hood,
        new T.CylinderGeometry(0.035, 0.035, 0.05, 8),
        steel,
        [-0.4 + ix * 0.4, -1.1 + iy * 0.3, -0.68],
      ).rotation.x = Math.PI / 2;

  // Exposed V8: aluminum block, red sump, 8 intake studs, 3-step scoop.
  rounded(hood, [1.2, 0.8, 1.2], [0, -1.2, 0.0], alu);
  rounded(hood, [1.24, 0.18, 1.24], [0, -1.55, 0.0], red, 1, 0.02);
  for (let ix = 0; ix < 2; ix++)
    for (let iz = 0; iz < 4; iz++)
      mesh(
        hood,
        new T.CylinderGeometry(0.06, 0.06, 0.12, 10),
        scoopGray,
        [-0.3 + ix * 0.6, -0.75, -0.45 + iz * 0.3],
      );
  rounded(hood, [0.7, 0.14, 0.7], [0, -0.68, 0.0], scoopGray, 1, 0.02);
  rounded(hood, [0.55, 0.14, 0.55], [0, -0.55, 0.0], scoopGray, 1, 0.02);
  rounded(hood, [0.4, 0.14, 0.4], [0, -0.42, 0.0], scoopGray, 1, 0.02);

  // White headers: 3 per flank dropping into a side collector.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = -0.4 + i * 0.4;
      bar(
        hood,
        new T.Vector3(side * 0.6, -1.2, z),
        new T.Vector3(side * 0.75, -1.75, z),
        0.075,
        pipe,
      );
      bar(
        hood,
        new T.Vector3(side * 0.75, -1.75, z),
        new T.Vector3(side * 0.78, -1.75, -0.7),
        0.075,
        pipe,
      );
    }
    bar(
      hood,
      new T.Vector3(side * 0.78, -1.75, -0.75),
      new T.Vector3(side * 0.78, -1.75, -1.7),
      0.1,
      pipe,
    );
    bar(
      rear,
      new T.Vector3(side * 0.78, -1.1, 1.6),
      new T.Vector3(side * 0.78, -1.1, 0.9),
      0.1,
      pipe,
    );
  }

  // Front axle, white grille shell with dark core, paired headlamps.
  bar(
    nose,
    new T.Vector3(-1.0, -0.9, -0.45),
    new T.Vector3(1.0, -0.9, -0.45),
    0.06,
    dark,
  );
  rounded(nose, [0.35, 0.9, 0.8], [0, -0.7, -0.4], pipe);
  rounded(nose, [0.2, 0.7, 0.6], [0, -0.7, -0.35], dark, 1, 0.02);
  for (const x of [-0.35, 0.35]) {
    const headlamp = mesh(
      nose,
      new T.CylinderGeometry(0.11, 0.11, 0.1, 16),
      lamp,
      [x, -0.35, -0.4],
    );
    headlamp.rotation.x = Math.PI / 2;
    const ring = new T.TorusGeometry(0.11, 0.025, 8, 24);
    mesh(nose, ring, steel, [x, -0.35, -0.34]);
  }

  // Tapered tail: fuel cap, red studs, white rear bar.
  rounded(bed, [1.9, 0.9, 1.1], [0, -0.8, -0.2], black);
  const tailTop = rounded(bed, [1.7, 0.5, 0.9], [0, -0.5, -0.25], black, 3, 0.12);
  tailTop.rotation.x = 0.12;
  mesh(bed, new T.CylinderGeometry(0.06, 0.06, 0.08, 10), steel, [0.5, -0.2, -0.3]);
  for (const x of [-0.7, 0.7]) {
    mesh(bed, new T.CylinderGeometry(0.06, 0.06, 0.08, 10), tailRed, [x, -0.75, -0.78]).rotation.x =
      Math.PI / 2;
  }
  rounded(tail, [1.74, 0.15, 0.15], [0, -0.9, -0.1], pipe, 1, 0.03);
  for (const side of [-1, 1]) {
    bar(
      tail,
      new T.Vector3(side * 0.7, -0.9, -0.1),
      new T.Vector3(side * 0.7, -0.9, 0.3),
      0.04,
      dark,
    );
  }

  return rod;
}

export function hotRodStats(rod: T.Object3D) {
  let triangles = 0;
  let meshes = 0;
  rod.traverse((o) => {
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
