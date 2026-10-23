import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pbr, flameMaterial } from "./materials";
import {
  comicHazards,
  BURNER_RAMP,
  BURNER_SUPPORTS,
  BURNER_DRUM,
  mechanismAngle,
  POTIONS,
  type ComicHazard,
} from "./comic-hazards";
import type { Simulation } from "./simulation";

const palette = {
  leather: 0x29151b,
  gold: 0xb58b40,
  paper: 0xd6c6a0,
  ivory: 0xffdfac,
  gum: 0x712d39,
  iron: 0x35444a,
  red: 0xb52c2f,
};
const standard = (color: number, metalness = 0.15, roughness = 0.55) =>
  new T.MeshStandardMaterial({ color, metalness, roughness });
type Model = {
  h: ComicHazard;
  root: T.Group;
  jaw?: T.Group;
  flames: T.Mesh[];
  water?: T.Mesh;
  ramp?: T.Mesh;
  jet?: T.Group;
  triangles: number;
};
/** Authoring primitives are merged per material and moving assembly after construction. */
function consolidate(root: T.Group) {
  for (const child of root.children.filter((c) => c instanceof T.Group))
    consolidate(child as T.Group);
  const batches = new Map<T.Material, T.Mesh[]>();
  for (const c of root.children)
    if (
      c instanceof T.Mesh &&
      !c.userData.animate &&
      !Array.isArray(c.material)
    ) {
      const batch = batches.get(c.material) ?? [];
      batch.push(c);
      batches.set(c.material, batch);
    }
  for (const [mat, meshes] of batches) {
    if (meshes.length < 2) continue;
    const pieces = meshes.map((m) => {
      m.updateMatrix();
      return (
        m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
      ).applyMatrix4(m.matrix);
    });
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach((g) => g.dispose());
    if (!geometry) continue;
    const merged = new T.Mesh(geometry, mat);
    merged.castShadow = true;
    merged.receiveShadow = true;
    root.add(merged);
    for (const m of meshes) {
      root.remove(m);
      m.geometry.dispose();
    }
  }
}
function build(h: ComicHazard): Model {
  const root = new T.Group();
  root.name = h.id;
  root.position.set(h.x, 0, h.z);
  const model: Model = { h, root, flames: [], triangles: 0 };
  const metal = pbr("green_metal_rust", 1, {
    color: 0x89958f,
    roughness: 0.58,
    metalness: 0.6,
  });
  const leather = pbr("rock_06", 1, {
    color: palette.leather,
    roughness: 0.83,
    normalScale: new T.Vector2(0.23, 0.23),
  });
  const paper = standard(palette.paper, 0, 0.89),
    gold = standard(palette.gold, 0.75, 0.32),
    ivory = standard(palette.ivory, 0, 0.34),
    gum = standard(palette.gum, 0, 0.6);
  const dark = standard(0x090b0e, 0, 0.9);
  const add = (
    geo: T.BufferGeometry,
    mat: T.Material,
    x = 0,
    y = 0,
    z = 0,
    parent: T.Group = root,
  ) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (
    w: number,
    height: number,
    d: number,
    mat: T.Material,
    x = 0,
    y = 0,
    z = 0,
    parent = root,
    r = 0.12,
  ) => {
    const geometry = new RoundedBoxGeometry(w, height, d, 5, r);
    const tile = mat.userData.tile;
    if (tile) {
      const p = geometry.attributes.position,
        n = geometry.attributes.normal,
        uv = geometry.attributes.uv;
      for (let i = 0; i < p.count; i++)
        if (Math.abs(n.getY(i)) > 0.5)
          uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
        else if (Math.abs(n.getX(i)) > 0.5)
          uv.setXY(i, p.getZ(i) / tile, p.getY(i) / tile);
        else uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile);
    }
    return add(geometry, mat, x, y, z, parent);
  };
  const sphere = (
    r: number,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
    parent = root,
  ) => add(new T.SphereGeometry(r, 80, 48), mat, x, y, z, parent);
  const cylinder = (
    r: number,
    height: number,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
    parent = root,
  ) => add(new T.CylinderGeometry(r, r, height, 96, 16), mat, x, y, z, parent);
  const bolts = (parent: T.Group, w: number, d: number, y: number) => {
    for (const x of [-w, w])
      for (let z = -d; z <= d; z += 1.4) {
        const b = add(
          new T.CylinderGeometry(0.12, 0.12, 0.12, 6, 2),
          gold,
          x,
          y,
          z,
          parent,
        );
        b.rotation.x = 0.08;
      }
  };
  const teeth = (parent: T.Group, upper: boolean) => {
    for (const side of [-1, 1])
      for (let i = 0; i < 11; i++) {
        const tooth = add(
          new T.ConeGeometry(
            0.38 + 0.05 * (i % 3),
            1.45 + (i % 3) * 0.2,
            48,
            16,
          ),
          ivory,
          (i - 5) * 1.02,
          (upper ? -1 : 1) * 0.95,
          side * 5.45,
          parent,
        );
        if (upper) tooth.rotation.z = Math.PI;
        tooth.rotation.x = side * 0.15;
      }
    for (const side of [-1, 1])
      for (let i = 0; i < 7; i++) {
        const t = add(
          new T.ConeGeometry(0.32, 1.3, 40, 12),
          ivory,
          side * 5.5,
          (upper ? -1 : 1) * 0.95,
          (i - 3) * 1.4,
          parent,
        );
        if (upper) t.rotation.z = Math.PI;
      }
  };
  const eyes = (parent: T.Group, y: number, z: number) => {
    const glow = new T.MeshStandardMaterial({
      color: 0xff4817,
      emissive: 0xff2508,
      emissiveIntensity: 1.2,
      roughness: 0.23,
    });
    for (const side of [-1, 1]) {
      const socket = sphere(1.4, dark, side * 2.6, y, z, parent);
      socket.scale.set(1.3, 0.72, 0.45);
      const eye = sphere(1.05, glow, side * 2.6, y - 0.08, z - 0.42, parent);
      eye.scale.set(1.35, 0.6, 0.35);
      const iris = sphere(
        0.7,
        new T.MeshStandardMaterial({
          color: 0xffc545,
          emissive: 0xff9e16,
          emissiveIntensity: 0.7,
          roughness: 0.2,
        }),
        side * 2.6,
        y - 0.08,
        z - 0.6,
        parent,
      );
      iris.scale.set(1.2, 0.65, 0.3);
      const pupil = sphere(0.4, dark, side * 2.6, y - 0.08, z - 0.87, parent);
      pupil.scale.set(0.3, 1.2, 0.2);
      const brow = box(
        3,
        0.35,
        0.5,
        leather,
        side * 2.6,
        y + 0.6,
        z - 0.4,
        parent,
      );
      brow.rotation.z = side * 0.25;
    }
  };
  if (["book", "teeth", "computer", "flippers"].includes(h.kind)) {
    const isBook = h.kind === "book",
      isComputer = h.kind === "computer",
      isTrap = h.kind === "flippers";
    const cover = isBook
      ? leather
      : isComputer
        ? metal
        : isTrap
          ? standard(0x963bc0, 0.55, 0.35)
          : gum;
    box(12, 0.5, 12, cover, 0, 0.25);
    bolts(root, 5.65, 5.65, 0.57);
    const jaw = new T.Group();
    jaw.position.set(0, 1.2, 5);
    root.add(jaw);
    model.jaw = jaw;
    box(12, 1.6, 12, cover, 0, 0, -5, jaw, 0.24);
    // Geometry extends from the hinge exactly like the kinematic crushing slab.
    const upper = new T.Group();
    upper.position.z = -5;
    jaw.add(upper);
    if (isBook) {
      for (let i = 0; i < 34; i++) {
        const leaf = box(
          11.4,
          0.025,
          11.25,
          paper,
          Math.sin(i * 2.4) * 0.07,
          -0.82 - i * 0.012,
          0,
          upper,
          0.008,
        );
        leaf.rotation.y = Math.sin(i) * 0.004;
      }
      box(10.8, 0.07, 10.5, leather, 0, -1.24, 0, upper, 0.13);
      box(0.9, 1.9, 12.2, leather, -5.7, 0.05, 0, upper, 0.4);
      for (const z of [-4.4, -2.2, 0, 2.2, 4.4])
        box(1.05, 0.2, 0.3, gold, -5.7, 1, z, upper);
      // Embossed frame and engraved corner bindings on the exposed cover.
      for (const side of [-1, 1]) {
        box(0.13, 0.12, 10.5, gold, side * 5.1, 0.86, 0, upper);
        box(10.3, 0.12, 0.13, gold, 0, 0.86, side * 5.2, upper);
        for (const end of [-1, 1]) {
          const plate = box(
            1.6,
            0.15,
            1.6,
            gold,
            side * 5,
            0.86,
            end * 5,
            upper,
          );
          plate.rotation.y = 0.15 * side;
        }
      }
      // Eyes sit proud of the cover, facing the player through the opened mouth.
      eyes(upper, 0.05, -5.95);
      const skull = sphere(0.72, paper, 0, 0.1, -6.05, upper);
      skull.scale.set(1, 0.8, 0.3);
      for (const side of [-1, 1])
        sphere(0.16, dark, side * 0.25, 0.22, -6.27, upper);
      box(0.4, 0.3, 0.2, dark, 0, -0.22, -6.25, upper);
    } else if (isComputer) {
      box(11, 0.4, 10.7, metal, 0, -0.96, 0, upper, 0.35);
      const display = new T.MeshStandardMaterial({
        color: 0x07242d,
        emissive: 0x0b6377,
        emissiveIntensity: 0.8,
        roughness: 0.21,
      });
      box(9.6, 0.13, 8.8, display, 0, -1.23, 0, upper, 0.25);
      const face = new T.Group();
      face.position.set(0, -1.4, -0.8);
      face.rotation.x = -Math.PI / 2;
      upper.add(face);
      eyes(face, 0, 0);
      for (let i = 0; i < 28; i++)
        box(
          8.8,
          0.012,
          0.027,
          standard(0x1b6678, 0, 0.6),
          0,
          -1.31,
          -3.6 + i * 0.25,
          upper,
          0.005,
        );
      for (let row = 0; row < 4; row++)
        for (let i = 0; i < 16; i++)
          box(
            0.52,
            0.16,
            0.5,
            i % 3 ? ivory : gold,
            (i - 7.5) * 0.6,
            0.7,
            -4.5 + row * 0.7,
            root,
            0.06,
          );
      box(3, 0.08, 1.2, metal, 0, 0.62, 0.2);
      for (let i = 0; i < 20; i++)
        box(0.07, 0.06, 2, dark, 4.2 + i * 0.06, 0.82, 1.8, upper, 0.01);
      cylinder(0.3, 0.15, gold, 4.6, 0.7, -5.2, root);
    } else if (isTrap) {
      for (const side of [-1, 1]) {
        box(
          1.4,
          0.5,
          11,
          new T.MeshStandardMaterial({
            color: side < 0 ? 0x31bbce : 0xe54a92,
            metalness: 0.65,
            roughness: 0.25,
          }),
          side * 4.4,
          -0.7,
          0,
          upper,
          0.5,
        );
        const spring = add(
          new T.TorusGeometry(1.25, 0.2, 24, 80),
          gold,
          side * 6,
          1,
          4,
        );
        spring.rotation.y = Math.PI / 2;
      }
      eyes(upper, 0.1, -5.95);
    } else {
      eyes(upper, 0.1, -5.95);
      const tongue = box(3, 0.4, 6, standard(0xb74a69, 0, 0.42), 0, 0.7, 0);
      tongue.rotation.y = 0.12;
    }
    if (!isComputer && !isTrap) {
      // Deep oval throat and sculpted lip replace the first pass's flat page slab.
      const throat = sphere(4.25, dark, 0, -1.28, 0, upper);
      throat.scale.set(1.14, 0.16, 1.03);
      const rim = add(
        new T.TorusGeometry(4.35, 0.38, 32, 120),
        gum,
        0,
        -1.36,
        0,
        upper,
      );
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(1.12, 1, 1);
      for (let ring = 0; ring < 3; ring++) {
        const fold = add(
          new T.TorusGeometry(3.7 - ring * 0.8, 0.13, 20, 96),
          standard(0x29141d, 0, 0.85),
          0,
          -1.46 - ring * 0.04,
          0,
          upper,
        );
        fold.rotation.x = Math.PI / 2;
        fold.scale.set(1.12, 1, 1);
      }
      for (let i = 0; i < 17; i++) {
        const a = Math.PI + (i / 16) * Math.PI;
        const t = add(
          new T.ConeGeometry(0.3, 1.4 + (i % 3) * 0.14, 48, 16),
          ivory,
          Math.cos(a) * 4.5,
          -1.85,
          Math.sin(a) * 4.2,
          upper,
        );
        t.rotation.z = Math.PI;
        t.rotation.x = Math.sin(a) * 0.25;
      }
      const tongue = box(2.8, 0.4, 4.5, gum, 0, 0.68, 0.5, root, 0.2);
      tongue.rotation.y = -0.1;
    }
    if (isTrap) {
      box(5, 0.25, 4, standard(0xffd04c, 0.4, 0.35), 0, 0.63, 0, root, 0.3);
      for (const side of [-1, 1]) {
        const curve = new T.CatmullRomCurve3(
          Array.from({ length: 321 }, (_, i) => {
            const t = i / 320;
            return new T.Vector3(
              side * 6.5 + Math.sin(t * Math.PI * 30) * 0.55,
              0.85 + Math.cos(t * Math.PI * 30) * 0.55,
              2 + t * 3.5,
            );
          }),
        );
        add(new T.TubeGeometry(curve, 320, 0.12, 16, false), gold);
      }
    }
    teeth(root, false);
    teeth(upper, true);
    // Dark throat, curved articulated hinge, grounded support housings.
    box(9, 2, 0.7, dark, 0, 1, 5.4);
    for (const side of [-1, 1]) {
      box(0.65, 3, 2, metal, side * 6.4, 1.5, 4.8);
      const hinge = cylinder(0.7, 1.3, gold, side * 6.3, 1.2, 5);
      hinge.rotation.z = Math.PI / 2;
      sphere(0.4, metal, side * 6.95, 1.2, 5);
    }
  } else if (h.kind === "hydrant") {
    const paint = pbr("green_metal_rust", 1, {
      color: 0xff5535,
      metalness: 0.55,
      roughness: 0.45,
    });
    box(5, 0.3, 5, metal, 0, 0.15);
    cylinder(0.85, 2.7, paint, 0, 1.5, 0);
    sphere(0.87, paint, 0, 2.85, 0);
    for (const y of [0.4, 1.2, 2.2]) {
      cylinder(1, 0.16, gold, 0, y, 0);
      bolts(root, 0.6, 0.7, y + 0.1);
    }
    for (const side of [-1, 1]) {
      const outlet = cylinder(0.5, 1.7, paint, side * 1, 1.8, 0);
      outlet.rotation.z = Math.PI / 2;
      const cap = cylinder(0.57, 0.2, gold, side * 1.8, 1.8, 0);
      cap.rotation.z = Math.PI / 2;
      for (let i = 0; i < 16; i++) {
        const link = add(
          new T.TorusGeometry(0.1, 0.035, 10, 20),
          metal,
          side * (1.75 - i * 0.06),
          1.65 - Math.sin((i / 16) * Math.PI) * 0.8,
          0.4,
        );
        link.rotation.y = i % 2 ? Math.PI / 2 : 0;
      }
    }
    const jet = new T.Group();
    root.add(jet);
    model.jet = jet;
    const water = new T.MeshStandardMaterial({
      color: 0xb6e8ff,
      transparent: true,
      opacity: 0.6,
      roughness: 0.15,
      emissive: 0x207ca3,
      emissiveIntensity: 0.35,
    });
    for (let i = 0; i < 22; i++) {
      const droplet = sphere(
        0.3 + (i % 3) * 0.13,
        water,
        Math.sin(i * 2.4) * 1.3,
        3 + i * 0.6,
        Math.cos(i * 2.4) * 1.3,
        jet,
      );
      droplet.scale.y = 2;
    }
    jet.visible = false;
  } else if (h.kind === "burner") {
    const black = pbr("green_metal_rust", 1, {
      color: 0x1a1515,
      roughness: 0.85,
      metalness: 0.4,
    });
    box(12, 0.24, 10, black, 0, 0.12);
    const r = BURNER_RAMP,
      asphalt = pbr("asphalt_02", 1, { color: 0xc3c4c5, roughness: 0.95 });
    asphalt.userData.tile = 3;
    const ramp = box(r.w, r.h, r.d, asphalt, r.x, r.y, r.z);
    ramp.rotation.x = r.angle;
    model.ramp = ramp;
    for (const side of [-1, 1]) {
      box(0.6, 1.6, 12, metal, side * 6.5, 0.8);
    }
    for (const s of BURNER_SUPPORTS) box(s.w, s.h, s.d, metal, s.x, s.y, s.z);
    for (const x of BURNER_DRUM.x) {
      cylinder(
        BURNER_DRUM.radius,
        BURNER_DRUM.height,
        black,
        x,
        BURNER_DRUM.y,
        0,
      );
      for (const y of [0.1, 0.4, 1.3, 1.65])
        cylinder(1.17, 0.12, metal, x, y, 0);
    }
    const f = flameMaterial();
    for (let i = 0; i < 34; i++) {
      const mesh = add(
        new T.PlaneGeometry(2.3, 5 + (i % 3), 12, 24),
        f,
        ((i % 9) - 4) * 1.25,
        2.8,
        Math.floor(i / 9) * 2 - 3,
      );
      mesh.rotation.y = ((i % 3) * Math.PI) / 3;
      mesh.userData.animate = true;
      model.flames.push(mesh);
    }
    // Dense heat grating has actual modeled slots, not a flat painted rectangle.
    for (let i = 0; i < 40; i++)
      box(0.1, 0.16, 9, metal, (i - 19.5) * 0.29, 0.32);
  } else if (h.kind === "water") {
    const basin = pbr("concrete_floor_02", 1, { color: 0xabbec3 });
    box(12, 0.6, 24, basin, 0, -4.3);
    for (const side of [-1, 1]) box(1, 0.4, 26, basin, side * 6.5, 0.2);
    for (const z of [-12.5, 12.5]) {
      box(12, 4, 1, basin, 0, -2, z);
    }
    for (const side of [-1, 1]) box(0.6, 4, 24, basin, side * 6.3, -2, 0);
    const geo = new T.PlaneGeometry(12, 24, 224, 224);
    geo.rotateX(-Math.PI / 2);
    const water = new T.MeshPhysicalMaterial({
      color: 0x207c9f,
      metalness: 0.25,
      roughness: 0.12,
      transparent: true,
      opacity: 0.78,
      clearcoat: 1,
    });
    const mesh = add(geo, water, 0, 0.1);
    mesh.userData.animate = true;
    model.water = mesh;
    water.onBeforeCompile = (shader) => {
      shader.uniforms.waterTime = { value: 0 };
      water.userData.shader = shader;
      shader.fragmentShader =
        "uniform float waterTime; varying vec2 poolUv;\n" +
        shader.fragmentShader.replace(
          "#include <color_fragment>",
          "#include <color_fragment>\nfloat ripple=sin(poolUv.x*4.0+sin(poolUv.y*2.0+waterTime))*sin(poolUv.y*3.2-waterTime*1.5); diffuseColor.rgb += vec3(.12,.22,.26)*pow(abs(ripple),12.0);",
        );
      shader.vertexShader =
        "uniform float waterTime; varying vec2 poolUv;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\npoolUv=position.xz; transformed.y += sin(position.x*2.0+waterTime*2.0)*.06+sin(position.z*1.4-waterTime*2.5)*.04;",
        );
    };
    const boost = standard(0x22a5ca, 0.5, 0.35);
    box(10, 0.08, 12, boost, 0, 0.04, -27);
    for (let i = 0; i < 7; i++)
      for (const side of [-1, 1]) {
        const arrow = box(0.25, 0.08, 3, ivory, side * 1, 0.1, -32 + i * 1.5);
        arrow.rotation.y = side * 0.7;
      }
    // Heavy pipework and rivets make the water crossing a supported industrial trough.
    for (const side of [-1, 1]) {
      const pipe = cylinder(0.25, 26, metal, side * 6.5, 0.6, 0);
      pipe.rotation.x = Math.PI / 2;
      for (let z = -12; z <= 12; z += 2) sphere(0.16, gold, side * 6.5, 0.6, z);
    }
  } else {
    box(18, 0.3, 4, metal, 0, 0.15);
    const colors = [0x27aeff, 0xb5becb, 0xa567ef, 0xf4a336];
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 4.4;
      const glass = new T.MeshPhysicalMaterial({
        color: colors[i],
        metalness: 0.1,
        roughness: 0.15,
        transparent: true,
        opacity: 0.62,
        clearcoat: 1,
      });
      const liquid = new T.MeshStandardMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: 0.5,
        roughness: 0.3,
      });
      const points = Array.from({ length: 97 }, (_, j) => {
        const y = (j / 96) * 2.7;
        const r =
          0.28 +
          0.74 *
            Math.sin((Math.min(1, y / 2) * Math.PI) / 2) ** 2 *
            (y > 1.6 ? Math.max(0.18, (2.5 - y) / 0.9) : 1);
        return new T.Vector2(r, y);
      });
      box(1.4, 1.2, 1.4, metal, x, 0.6);
      add(new T.LatheGeometry(points, 128), glass, x, 1, 0);
      sphere(0.76, liquid, x, 1.8, 0).scale.y = 0.9;
      cylinder(0.35, 0.4, gold, x, 3.7, 0);
      const seal = add(
        new T.TorusGeometry(0.35, 0.07, 24, 64),
        gold,
        x,
        3.42,
        0,
      );
      seal.rotation.x = Math.PI / 2;
      for (let b = 0; b < 7; b++)
        sphere(
          0.045 + b * 0.007,
          ivory,
          x + Math.sin(b * 3) * 0.3,
          1.5 + b * 0.18,
          0.2,
        );
    }
  }
  const messages: Record<string, [string, string]> = {
    book: ["CURSED CHAPTER", "WAIT FOR THE JAW / DRIVE AROUND"],
    teeth: ["BITE CLUB", "WAIT FOR THE JAW / DRIVE AROUND"],
    computer: ["FATAL ERROR", "CRUSHING LAPTOP / DRIVE AROUND"],
    flippers: ["COLOUR SNAP", "TOUCH THE PAD AND IT SNAPS"],
    hydrant: ["PRESSURE POP", "LAUNCHES YOU / 90 MPH RUPTURE"],
    burner: ["HOT WHEELS", "JUMP THE FIRE / DRIVE AROUND"],
    water: ["SKIM OR SWIM", "ENTER >200 MPH / KEEP 180+"],
    potion: ["PICK YOUR POISON", "5 SECONDS / DO NOT MIX"],
  };
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#141b20";
  ctx.fillRect(0, 0, 768, 192);
  ctx.strokeStyle = "#ecb34e";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 756, 180);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd28d";
  ctx.font = "bold 52px sans-serif";
  ctx.fillText(messages[h.kind][0], 384, 76);
  ctx.fillStyle = "#eef0e4";
  ctx.font = "bold 23px sans-serif";
  ctx.fillText(messages[h.kind][1], 384, 133);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  const label = add(
    new T.PlaneGeometry(4.2, 1.3),
    new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }),
    0,
    0.045,
    h.kind === "burner" ? BURNER_RAMP.z - 8 : -20,
  );
  label.rotation.x = -Math.PI / 2;
  consolidate(root);
  root.traverse((o) => {
    if (o instanceof T.Mesh)
      model.triangles +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });
  return model;
}
export class ComicView extends T.Group {
  private key = "";
  private models: Model[] = [];
  update(s: Simulation) {
    const key = s.courseTrack?.id ?? "";
    if (key !== this.key) {
      this.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            if (
              m instanceof T.MeshBasicMaterial &&
              m.map instanceof T.CanvasTexture
            )
              m.map.dispose();
            m.dispose();
          }
        }
      });
      this.clear();
      this.models = [];
      this.key = key;
      if (s.courseTrack)
        for (const h of comicHazards(s.courseTrack)) {
          const m = build(h);
          this.models.push(m);
          this.add(m.root);
        }
    }
    for (const m of this.models) {
      if (m.jaw)
        m.jaw.rotation.x = mechanismAngle(
          m.h,
          s.time,
          s.comic.mechanisms.find((h) => h.h.id === m.h.id)?.triggered,
        );
      for (const f of m.flames)
        (f.material as T.ShaderMaterial).uniforms.time.value = s.time;
      if (m.water) {
        const shader = (m.water.material as T.Material).userData.shader;
        if (shader) shader.uniforms.waterTime.value = s.time;
      }
      if (m.jet) {
        const triggered =
          s.comic.mechanisms.find((h) => h.h.id === m.h.id)?.triggered ?? -100;
        m.jet.visible = s.time - triggered < 1.8;
        m.jet.scale.y = 0.8 + Math.sin(s.time * 7) * 0.12;
      }
    }
  }
  inspect() {
    return this.models.map((m) => ({
      id: m.h.id,
      kind: m.h.kind,
      triangles: m.triangles,
      ramp: m.ramp
        ? {
            position: m.ramp.getWorldPosition(new T.Vector3()).toArray(),
            angle: m.ramp.rotation.x,
          }
        : undefined,
      animated: !!m.jaw || !!m.water || !!m.jet || !!m.flames.length,
    }));
  }
}
