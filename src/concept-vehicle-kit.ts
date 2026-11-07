import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PARTS, type PartId } from "./damage";

export type XYZ = readonly [number, number, number];
type Profile = readonly (readonly [z: number, y: number])[];
type Section = readonly [
  z: number,
  low: number,
  high: number,
  lowerHalfWidth: number,
  upperHalfWidth: number,
];
type Palette = {
  paint: number;
  accent: number;
  rim: number;
  tireWidth: number;
  spokes: number;
};

export function finish(color: number, roughness = 0.45, metalness = 0.25) {
  return new T.MeshStandardMaterial({ color, roughness, metalness });
}

/** Coordinates are vehicle-local (+Z forward). Meshes move with their damage part. */
export class ConceptVehicleKit {
  readonly root = new T.Group();
  readonly groups = Object.fromEntries(
    PARTS.map(({ id, pos }) => {
      const group = new T.Group();
      group.name = id;
      group.position.fromArray(pos);
      this.root.add(group);
      return [id, group];
    }),
  ) as Record<PartId, T.Group>;
  readonly paint: T.MeshPhysicalMaterial;
  readonly accent: T.MeshStandardMaterial;
  readonly rim: T.MeshStandardMaterial;
  readonly dark = finish(0x202528, 0.52);
  readonly steel = finish(0xaab4b8, 0.31, 0.68);
  readonly rubber = finish(0x24282c, 0.94, 0);
  readonly glass = finish(0x40576a, 0.16, 0.38);
  readonly white = new T.MeshStandardMaterial({
    color: 0xfff2d7,
    emissive: 0xffe3ae,
    emissiveIntensity: 0.55,
  });
  readonly amber = new T.MeshStandardMaterial({
    color: 0xffad41,
    emissive: 0xff850b,
    emissiveIntensity: 0.55,
  });
  readonly red = new T.MeshStandardMaterial({
    color: 0xe13726,
    emissive: 0xa91712,
    emissiveIntensity: 0.5,
  });

  constructor(id: string, palette: Palette) {
    this.root.name = `iron-flight-${id}`;
    this.paint = new T.MeshPhysicalMaterial({
      color: palette.paint,
      roughness: 0.38,
      metalness: 0.23,
      clearcoat: 0.65,
      clearcoatRoughness: 0.28,
    });
    this.accent = finish(palette.accent);
    this.rim = finish(palette.rim, 0.37, 0.48);
    for (const { id: part, pos } of PARTS) {
      if (!part.startsWith("wheel-")) continue;
      this.wheel(
        this.groups[part],
        1.05,
        palette.tireWidth,
        palette.spokes,
        Math.sign(pos[0]),
      );
    }
    this.chassis("chassis-front", 0.83, 2.68);
    this.chassis("chassis-rear", -1.52, 2.02);
  }

  mesh(
    part: PartId,
    geometry: T.BufferGeometry,
    at: XYZ,
    material: T.Material = this.paint,
  ) {
    const group = this.groups[part];
    const mesh = new T.Mesh(geometry, material);
    mesh.position.fromArray(at).sub(group.position);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  panel(
    part: PartId,
    size: XYZ,
    at: XYZ,
    material: T.Material = this.paint,
    bevel = 0.055,
  ) {
    return this.mesh(
      part,
      new RoundedBoxGeometry(...size, 3, bevel),
      at,
      material,
    );
  }

  oval(part: PartId, size: XYZ, at: XYZ, material: T.Material = this.paint) {
    const mesh = this.mesh(part, new T.SphereGeometry(1, 56, 32), at, material);
    mesh.scale.fromArray(size);
    return mesh;
  }

  bar(
    part: PartId,
    from: XYZ,
    to: XYZ,
    radius = 0.06,
    material: T.Material = this.dark,
  ) {
    const a = new T.Vector3(...from);
    const b = new T.Vector3(...to);
    const middle = a.clone().lerp(b, 0.5);
    const mesh = this.mesh(
      part,
      new T.CylinderGeometry(radius, radius, a.distanceTo(b), 24),
      [middle.x, middle.y, middle.z],
      material,
    );
    mesh.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    return mesh;
  }

  tube(
    part: PartId,
    points: XYZ[],
    radius: number,
    material: T.Material = this.dark,
    segments = 36,
  ) {
    const curve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...p)),
    );
    return this.mesh(
      part,
      new T.TubeGeometry(curve, segments, radius, 12, false),
      [0, 0, 0],
      material,
    );
  }

  profile(
    part: PartId,
    outline: Profile,
    width: number,
    x: number,
    material: T.Material = this.paint,
    bevel = 0.035,
  ) {
    const shape = new T.Shape(outline.map(([z, y]) => new T.Vector2(z, y)));
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 4,
    });
    geometry.rotateY(-Math.PI / 2).translate(width / 2, 0, 0);
    return this.mesh(part, geometry, [x, 0, 0], material);
  }

  hull(
    part: PartId,
    sections: readonly Section[],
    material: T.Material = this.paint,
  ) {
    const geometry = new T.BufferGeometry();
    const vertices = sections.flatMap(([z, low, high, lower, upper]) => [
      -lower,
      low,
      z,
      lower,
      low,
      z,
      upper,
      high,
      z,
      -upper,
      high,
      z,
    ]);
    const last = (sections.length - 1) * 4;
    const indices = [
      0,
      2,
      1,
      0,
      3,
      2,
      last,
      last + 1,
      last + 2,
      last,
      last + 2,
      last + 3,
    ];
    for (let offset = 0; offset < last; offset += 4)
      for (let i = 0; i < 4; i++) {
        const a = offset + i;
        const b = offset + ((i + 1) % 4);
        indices.push(a, b, b + 4, a, b + 4, a + 4);
      }
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex(indices);
    const flat = geometry.toNonIndexed();
    geometry.dispose();
    flat.computeVertexNormals();
    return this.mesh(part, flat, [0, 0, 0], material);
  }

  arch(
    part: PartId,
    side: number,
    z: number,
    material: T.Material = this.paint,
    faceted = false,
  ) {
    const segments = faceted ? 5 : 48;
    const endCut = faceted ? 0.22 : 0.15;
    const ring = (radius: number) =>
      Array.from({ length: segments + 1 }, (_, i): [number, number] => {
        const angle = endCut + (i / segments) * (Math.PI - endCut * 2);
        return [z + Math.cos(angle) * radius, -0.59 + Math.sin(angle) * radius];
      });
    this.profile(
      part,
      [...ring(1.31), ...ring(1.13).reverse()],
      faceted ? 0.58 : 0.69,
      side * 1.56,
      material,
      0.04,
    );
  }

  lamp(part: PartId, at: XYZ, radius: number, lens = this.white, facing = 1) {
    const [x, y, z] = at;
    this.bar(
      part,
      [x, y, z - facing * 0.09],
      [x, y, z],
      radius * 1.17,
      this.dark,
    );
    this.bar(part, at, [x, y, z + facing * 0.035], radius, lens);
    const bezel = new T.TorusGeometry(radius * 1.03, 0.021, 12, 48);
    this.mesh(part, bezel, [x, y, z + facing * 0.026], this.steel);
  }

  tailLights(z = -2.66, y = 0.17) {
    for (const side of [-1, 1]) {
      this.panel(
        "bumper-rear",
        [0.44, 0.18, 0.09],
        [side * 1.03, y, z],
        this.dark,
      );
      this.panel(
        "bumper-rear",
        [0.34, 0.12, 0.07],
        [side * 1.03, y, z - 0.055],
        this.red,
      );
    }
  }

  shock(part: PartId, from: XYZ, to: XYZ, spring: T.Material) {
    const a = new T.Vector3(...from);
    const b = new T.Vector3(...to);
    const axis = b.clone().sub(a).normalize();
    const radial = new T.Vector3(0, 0, 1).cross(axis).normalize();
    const tangent = axis.clone().cross(radial);
    this.bar(part, from, to, 0.048, this.steel);
    const housing = a.clone().lerp(b, 0.64);
    this.bar(part, from, [housing.x, housing.y, housing.z], 0.083, this.dark);
    const points = Array.from({ length: 73 }, (_, i): XYZ => {
      const t = i / 72;
      const angle = t * 14 * Math.PI;
      const p = a
        .clone()
        .lerp(b, 0.13 + t * 0.74)
        .addScaledVector(radial, Math.cos(angle) * 0.12)
        .addScaledVector(tangent, Math.sin(angle) * 0.12);
      return [p.x, p.y, p.z];
    });
    this.tube(part, points, 0.023, spring, 112);
  }

  spare(part: PartId, at: XYZ) {
    const group = this.groups[part];
    const wheel = new T.Group();
    wheel.position.fromArray(at).sub(group.position);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
    this.wheel(wheel, 0.66, 0.4, 6, 1);
  }

  private chassis(
    part: "chassis-front" | "chassis-rear",
    z: number,
    length: number,
  ) {
    this.panel(part, [1.72, 0.29, length], [0, -0.25, z], this.dark);
    for (const side of [-1, 1])
      this.panel(
        part,
        [0.17, 0.28, length],
        [side * 0.79, -0.41, z],
        this.steel,
      );
    const axle = part === "chassis-front" ? 1.65 : -1.65;
    this.bar(part, [-1.51, -0.8, axle], [1.51, -0.8, axle], 0.1);
    this.oval(part, [0.28, 0.22, 0.24], [0, -0.8, axle], this.dark);
  }

  private wheel(
    parent: T.Group,
    radius: number,
    width: number,
    spokes: number,
    outer: number,
  ) {
    const tireProfile = [
      [0.53, -0.46],
      [0.6, -0.48],
      [0.69, -0.5],
      [0.79, -0.5],
      [0.87, -0.48],
      [0.92, -0.44],
      [0.95, -0.37],
      [0.963, -0.26],
      [0.967, 0],
      [0.963, 0.26],
      [0.95, 0.37],
      [0.92, 0.44],
      [0.87, 0.48],
      [0.79, 0.5],
      [0.69, 0.5],
      [0.6, 0.48],
      [0.53, 0.46],
      [0.53, -0.46],
    ].map(([r, x]) => new T.Vector2(r * radius, x * width));
    const tire = new T.LatheGeometry(tireProfile, 112);
    tire.rotateZ(-Math.PI / 2);
    const add = (geometry: T.BufferGeometry, material: T.Material, x = 0) => {
      const mesh = new T.Mesh(geometry, material);
      mesh.position.x = x;
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    add(tire, this.rubber);
    const blocks = 32;
    const tread = new T.InstancedMesh(
      new RoundedBoxGeometry(
        width * 0.43,
        radius * 0.095,
        radius * 0.153,
        1,
        0.015,
      ),
      this.rubber,
      blocks * 3,
    );
    tread.name = "tread-block";
    tread.castShadow = tread.receiveShadow = true;
    const block = new T.Object3D();
    for (let i = 0; i < blocks; i++)
      for (const row of [-1, 0, 1]) {
        const angle = ((i + Math.abs(row) * 0.42) / blocks) * 2 * Math.PI;
        const r = radius * (row === 0 ? 0.958 : 0.944);
        block.position.set(
          row * width * 0.294,
          Math.cos(angle) * r,
          Math.sin(angle) * r,
        );
        block.rotation.set(angle, row * 0.46, 0, "XYZ");
        block.updateMatrix();
        tread.setMatrixAt(i * 3 + row + 1, block.matrix);
      }
    parent.add(tread);
    const rimRadius = radius * 0.55;
    const drum = new T.CylinderGeometry(
      rimRadius * 0.96,
      rimRadius * 0.96,
      width * 0.85,
      64,
    );
    drum.rotateZ(-Math.PI / 2);
    add(drum, this.dark);
    const lip = new T.TorusGeometry(rimRadius, radius * 0.043, 14, 72);
    lip.rotateY(Math.PI / 2);
    add(lip, this.rim, outer * width * 0.45);
    const hub = new T.CylinderGeometry(
      radius * 0.21,
      radius * 0.24,
      width * 0.15,
      40,
    );
    hub.rotateZ(-Math.PI / 2);
    add(hub, this.rim, outer * width * 0.43);
    for (let i = 0; i < spokes; i++) {
      const angle = (i / spokes) * 2 * Math.PI;
      const spoke = add(
        new RoundedBoxGeometry(
          width * 0.13,
          radius * 0.32,
          radius * 0.085,
          2,
          0.026,
        ),
        this.rim,
        outer * width * 0.43,
      );
      spoke.position.y = Math.cos(angle) * radius * 0.363;
      spoke.position.z = Math.sin(angle) * radius * 0.363;
      spoke.rotation.x = angle;
    }
    const lugGeometry = new T.CylinderGeometry(0.034, 0.034, 0.035, 8);
    lugGeometry.rotateZ(Math.PI / 2);
    const lugs = new T.InstancedMesh(lugGeometry, this.steel, 6);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * 2 * Math.PI;
      block.position.set(
        outer * width * 0.52,
        Math.cos(angle) * radius * 0.147,
        Math.sin(angle) * radius * 0.147,
      );
      block.rotation.set(0, 0, 0);
      block.updateMatrix();
      lugs.setMatrixAt(i, block.matrix);
    }
    parent.add(lugs);
  }
}
