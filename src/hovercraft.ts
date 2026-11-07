import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PARTS } from "./damage";
import type { VehiclePart } from "./vehicles";
import type { TruckMaterials } from "./truck";

/** Monster-clone colliders; doors drop to the cabin flank for the livery decal. */
export const HOVERCRAFT_PARTS: VehiclePart[] = PARTS.map((p) =>
  p.id === "door-left"
    ? { ...p, pos: [1.5, 0.12, -0.1] as const }
    : p.id === "door-right"
      ? { ...p, pos: [-1.5, 0.12, -0.1] as const }
      : { ...p },
);
export const HOVERCRAFT_SUSPENSION: [number, number, number][] = [
  [1.65, -0.35, 1.65],
  [-1.65, -0.35, 1.65],
  [1.65, -0.35, -1.65],
  [-1.65, -0.35, -1.65],
];
export const HOVERCRAFT_WHEEL_RADIUS = 1.05;
export const HOVERCRAFT_SUSPENSION_REST = 0.6;

/** Tan military hovercraft: skirt barge, cabin with gun, rear lift-fan ring. */
export function createHovercraft(_materials: TruckMaterials = {}) {
  const craft = new T.Group();
  craft.name = "iron-flight-hovercraft";
  // Fixed military livery: the tuning picker must not recolor the tan hull.
  const tan = new T.MeshStandardMaterial({
    color: 0xd2ac6e, // r1 matte voxel tan
    metalness: 0.05,
    roughness: 0.6,
  });
  const tanDark = new T.MeshStandardMaterial({
    color: 0xb99f6e,
    metalness: 0.05,
    roughness: 0.65,
  });
  const skirt = new T.MeshStandardMaterial({
    color: 0x191a1e,
    roughness: 0.85,
  });
  const glass = new T.MeshStandardMaterial({
    color: 0x2a2e33,
    metalness: 0.4,
    roughness: 0.25,
  });
  const gun = new T.MeshStandardMaterial({
    color: 0x232528,
    metalness: 0.7,
    roughness: 0.4,
  });
  const blade = new T.MeshStandardMaterial({
    color: 0x3a3f45,
    metalness: 0.5,
    roughness: 0.5,
  });
  const strap = new T.MeshStandardMaterial({
    color: 0x6e747b,
    metalness: 0.3,
    roughness: 0.6,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x141518,
    metalness: 0.4,
    roughness: 0.6,
  });
  const lamp = new T.MeshStandardMaterial({
    color: 0xfff6dd,
    emissive: 0xffedb5,
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
    mat: T.Material = tan,
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
  function stud(
    parent: T.Object3D,
    pos: number[],
    mat: T.Material = tanDark,
    r = 0.05,
    h = 0.06,
  ) {
    return mesh(parent, new T.CylinderGeometry(r, r, h, 10), mat, pos);
  }
  function bar(
    parent: T.Object3D,
    a: T.Vector3,
    b: T.Vector3,
    radius = 0.05,
    mat: T.Material = gun,
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

  tan.roughness = 0.75; // r1 matte finish
  const groups = new Map<string, T.Group>();
  for (const def of HOVERCRAFT_PARTS) {
    const g = new T.Group();
    g.name = def.id;
    g.position.fromArray(def.pos);
    craft.add(g);
    groups.set(def.id, g);
    if (def.id.startsWith("wheel")) {
      // A hovercraft has no road wheels. This pea-sized nub stays buried in
      // the deck slab even while the group spins; it only keeps the part
      // group non-empty for damage bounds. The x-inboard offset sits on the
      // wheel spin axis.
      const nub = rounded(
        g,
        [0.12, 0.12, 0.12],
        [def.pos[0] > 0 ? -0.45 : 0.45, 0, 0],
        skirt,
        1,
        0.02,
      );
      nub.name = "wheel-filler";
    } else if (def.id === "chassis-front") {
      rounded(g, [2.2, 0.5, 2.6], [0, -0.9, 0.1], dark);
    } else if (def.id === "chassis-rear") {
      rounded(g, [2.2, 0.5, 1.8], [0, -0.9, -0.05], dark);
    } else if (def.id === "hood") {
      rounded(g, [2.4, 0.5, 1.5], [0, -1.0, 0], tan);
    } else if (def.id === "bumper-front") {
      rounded(g, [2.8, 0.9, 0.5], [0, -1.4, 0.05], skirt);
    } else if (def.id === "roof") {
      rounded(g, [2.0, 0.95, 2.4], [0, -1.68, 0], tan);
    } else if (def.id.startsWith("door")) {
      rounded(g, [0.18, 1.0, 2.4], [0, 0.03, 0], tan);
    } else if (def.id === "bed") {
      rounded(g, [2.4, 0.5, 1.5], [0, -1.0, 0.1], tan);
    } else {
      rounded(g, [2.8, 0.9, 0.5], [0, -1.4, 0], skirt);
    }
  }

  const front = groups.get("chassis-front")!;
  const rear = groups.get("chassis-rear")!;
  const hood = groups.get("hood")!;
  const roof = groups.get("roof")!;
  const bed = groups.get("bed")!;
  const nose = groups.get("bumper-front")!;
  const tail = groups.get("bumper-rear")!;

  // Skirt band + hull deck, split across the chassis groups.
  rounded(front, [3.5, 0.9, 2.9], [0, -1.4, 0.65], skirt);
  rounded(rear, [3.5, 0.9, 2.9], [0, -1.4, 0.15], skirt);
  rounded(front, [3.05, 0.5, 2.9], [0, -0.7, 0.65], tan);
  rounded(rear, [2.6, 0.5, 2.9], [0, -0.7, 0.15], tan);
  for (const [parent, z0] of [[front, 0.65], [rear, 0.15]] as const) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        rounded(
          parent,
          [0.14, 0.12, 0.22],
          [side * 1.46, -1.02, z0 - 1.3 + i * 0.237],
          skirt,
          2,
          0.02,
        );
      }
    }
  }
  // Hull side panel seams + deck-edge stud rows.
  for (const [parent, z0] of [[front, 0.65], [rear, 0.15]] as const) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        rounded(
          parent,
          [0.06, 0.44, 0.05],
          [side * 1.31, -0.7, z0 - 1.2 + i * 0.4],
          tanDark,
          1,
          0.01,
        );
      }
      const studRow = new T.InstancedMesh(
        new T.CylinderGeometry(0.04, 0.04, 0.06, 10),
        tanDark,
        12,
      );
      studRow.castShadow = true;
      parent.add(studRow);
      const dummy = new T.Object3D();
      for (let i = 0; i < 12; i++) {
        dummy.position.set(side * 1.15, -0.42, z0 - 1.3 + i * 0.237);
        dummy.updateMatrix();
        studRow.setMatrixAt(i, dummy.matrix);
      }
    }
  }
  // Side intake trunks with 4 dark straps each.
  for (const side of [-1, 1]) {
    rounded(rear, [0.4, 0.55, 1.7], [side * 1.1, -0.35, 0.0], tan);
    for (let i = 0; i < 4; i++) {
      rounded(
        rear,
        [0.46, 0.6, 0.14],
        [side * 1.1, -0.35, -0.6 + i * 0.4],
        strap,
        1,
        0.02,
      );
    }
  }

  // Foredeck crown, sloped nose plate, anti-slip strip with studs.
  const slope = rounded(hood, [2.2, 0.12, 0.8], [0, -0.55, 0.9], tan);
  slope.rotation.x = -0.25;
  rounded(hood, [0.9, 0.06, 0.6], [0, -0.32, 0.55], dark, 1, 0.01);
  for (let ix = 0; ix < 2; ix++)
    for (let iz = 0; iz < 3; iz++)
      stud(hood, [-0.2 + ix * 0.4, -0.28, 0.35 + iz * 0.2], strap, 0.04, 0.05);

  // Nose taper, grille slats, paired nose lamps.
  rounded(nose, [2.3, 0.8, 0.35], [0, -1.35, 0.35], skirt);
  rounded(nose, [2.0, 0.45, 0.3], [0, -0.65, 0.3], tan);
  rounded(nose, [1.2, 0.3, 0.12], [0, -0.45, 0.42], dark, 1, 0.02);
  for (let i = 0; i < 5; i++) {
    rounded(
      nose,
      [1.1, 0.035, 0.05],
      [0, -0.56 + i * 0.055, 0.47],
      strap,
      1,
      0.008,
    );
  }
  for (const x of [-0.75, 0.75]) {
    const headlamp = mesh(
      nose,
      new T.CylinderGeometry(0.045, 0.045, 0.06, 12),
      lamp,
      [x, -0.45, 0.45],
    );
    headlamp.rotation.x = Math.PI / 2;
  }

  // Cabin roof plate, studs, and the roof machine gun.
  rounded(roof, [2.1, 0.12, 2.5], [0, -1.15, 0], tanDark);
  for (let ix = 0; ix < 2; ix++)
    for (let iz = 0; iz < 3; iz++)
      stud(roof, [-0.5 + ix * 1.0, -1.06, -0.8 + iz * 0.8], tan, 0.05, 0.06);
  const nosePlate = rounded(roof, [1.9, 0.7, 0.12], [0, -1.35, 1.2], tan);
  nosePlate.rotation.x = 0.5;
  mesh(roof, new T.CylinderGeometry(0.09, 0.11, 0.25, 12), gun, [0, -1.0, 0.1]);
  rounded(roof, [0.28, 0.3, 0.7], [0, -0.8, 0.25], gun);
  const barrel = mesh(
    roof,
    new T.CylinderGeometry(0.06, 0.06, 1.3, 12),
    gun,
    [0.12, -0.75, 1.0],
  );
  barrel.rotation.x = Math.PI / 2;
  const drum = mesh(
    roof,
    new T.CylinderGeometry(0.14, 0.14, 0.16, 14),
    dark,
    [-0.2, -0.78, 0.2],
  );
  drum.rotation.z = Math.PI / 2;
  bar(roof, new T.Vector3(-0.1, -0.85, -0.1), new T.Vector3(-0.22, -1.0, -0.3), 0.03, gun);
  bar(roof, new T.Vector3(0.1, -0.85, -0.1), new T.Vector3(0.22, -1.0, -0.3), 0.03, gun);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    stud(
      roof,
      [Math.cos(a) * 0.22, -1.02, 0.1 + Math.sin(a) * 0.22],
      strap,
      0.03,
      0.05,
    );
  }

  // Cabin flanks: framed windows and 3 stepped rub strakes per side.
  for (const side of [-1, 1]) {
    const door = groups.get(side > 0 ? "door-left" : "door-right")!;
    for (const z of [-0.95, 0.95]) {
      rounded(door, [0.05, 0.42, 0.58], [side * 0.03, 0.18, z], tanDark, 1, 0.01);
      rounded(door, [0.08, 0.34, 0.5], [side * 0.06, 0.18, z], glass, 1, 0.01);
    }
    for (let i = 0; i < 3; i++) {
      rounded(
        door,
        [0.14, 0.16, 5.4],
        [side * (0.09 + i * 0.065), -0.97 + i * 0.25, 0.1],
        i === 1 ? tanDark : tan,
        1,
        0.02,
      );
    }
  }

  // Fan-ring plinth, 10 voussoir bricks, 6 blades, hub.
  for (const side of [-1, 1]) {
    rounded(bed, [0.3, 1.0, 1.3], [side * 1.0, -0.35, -0.15], tan);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const brick = rounded(
      bed,
      [0.32, 0.62, 0.65],
      [Math.cos(a) * 0.85, -0.5 + Math.sin(a) * 0.85, -0.15],
      i % 2 ? tanDark : tan,
    );
    brick.rotation.z = a;
  }
  for (let i = 0; i < 6; i++) {
    const b = (i / 6) * Math.PI * 2;
    const fan = rounded(
      bed,
      [0.12, 0.7, 0.3],
      [Math.cos(b) * 0.4, -0.5 + Math.sin(b) * 0.4, -0.15],
      blade,
      1,
      0.02,
    );
    fan.rotation.order = "ZYX";
    fan.rotation.z = b;
    fan.rotation.y = 0.6;
  }
  const hub = mesh(
    bed,
    new T.CylinderGeometry(0.16, 0.16, 0.5, 16),
    dark,
    [0, -0.5, -0.15],
  );
  hub.rotation.x = Math.PI / 2;
  bar(
    bed,
    new T.Vector3(-1.0, -0.5, -0.15),
    new T.Vector3(1.0, -0.5, -0.15),
    0.05,
    dark,
  );

  // Stern deck with 4x8 anti-slip stud rows.
  rounded(tail, [2.2, 0.14, 0.55], [0, -0.55, 0.05], tanDark, 1, 0.02);
  for (let ix = 0; ix < 4; ix++)
    for (let iz = 0; iz < 8; iz++)
      stud(
        tail,
        [-0.75 + ix * 0.5, -0.46, -0.17 + iz * 0.065],
        tan,
        0.035,
        0.05,
      );

  return craft;
}

export function hovercraftStats(craft: T.Object3D) {
  let triangles = 0;
  let meshes = 0;
  craft.traverse((o) => {
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
