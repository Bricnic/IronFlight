import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pbr } from "./materials";
import {
  DINOSAUR_BITE,
  snapOpenness,
  limeJawPose,
  type DungeonHazard,
} from "./dungeon-hazards";
import { dungeonHazards } from "./dungeon-hazards";
import { isDinosaur, isGauntletMachine } from "./custom-level";
import { buildDinosaur, dinosaurAimPitch, poseDinosaur } from "./dinosaur-view";
import { buildLimeChomper } from "./toy-track-view";
import { buildGauntletMachine } from "./gauntlet-view";
import { buildGuidedPipe } from "./guided-pipe-view";
import { assignCandleLights, buildCandleLightPool, CANDLE_LIGHT_COUNT, type CandleSource } from "./candle-lights";
import type { Simulation } from "./simulation";

const standard = (color: number, metalness = 0.15, roughness = 0.55) =>
  new T.MeshStandardMaterial({ color, metalness, roughness });
type Model = {
  h: DungeonHazard;
  root: T.Group;
  /** Animated pivots, driven by snapOpenness in update(). */
  pivots: T.Group[];
  triangles: number;
  dinosaur?: ReturnType<typeof buildDinosaur>;
  machine?: ReturnType<typeof buildGauntletMachine>;
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
const labelMessages: Record<string, [string, string]> = {
  hands: ["STONE CLAP", "TIMED CRUSH / DRIVE BETWEEN"],
  scissors: ["GIANT SNIP", "TIMED BLADES / DRIVE BETWEEN"],
  clippers: ["CRUSH CLIP", "TIMED JAWS / DRIVE BETWEEN"],
  cup: ["SQUISH CUP", "TIMED SQUASH / DRIVE BETWEEN"],
  "lime-chomper": ["LIME CHOMPER", "CROSS WHEN THE JAWS ARE OPEN"],
};
/** Upright billboard label anchored above the model at the given local height. */
export function buildDungeonLabel(h: DungeonHazard, topY: number): T.Sprite {
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
  ctx.fillText(labelMessages[h.kind][0], 384, 76);
  ctx.fillStyle = "#eef0e4";
  ctx.font = "bold 23px sans-serif";
  ctx.fillText(labelMessages[h.kind][1], 384, 133);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  const label = new T.Sprite(
    new T.SpriteMaterial({ map: tex, depthTest: true }),
  );
  label.scale.set(6, 1.5, 1);
  label.position.set(0, topY, 0);
  return label;
}
const boneMat = () =>
  new T.MeshStandardMaterial({
    color: 0xd8c9a8,
    metalness: 0.05,
    roughness: 0.6,
  });
/** Fine horizontal streaks for brushed steel; stub-safe (fillRect only). */
function brushedTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#8a8a8a";
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    const w =
      Math.sin(y * 12.9898) * 43758.5453 +
      Math.sin(y * 3.7) * 12543.21;
    const v = 118 + Math.floor(36 * (w - Math.floor(w)));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, 256, 1);
  }
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  return tex;
}
const brushedSteel = (color: number) => {
  const mat = new T.MeshStandardMaterial({
    color,
    metalness: 0.9,
    roughness: 0.55,
    roughnessMap: brushedTexture(),
  });
  return mat;
};
const darkMat = () =>
  new T.MeshStandardMaterial({ color: 0x14161c, roughness: 0.9 });
/** A bare skull about 0.9 wide; shared by the skull prop and skeletons. */
export function buildSkullMesh(scale = 1) {
  const group = new T.Group();
  const bone = boneMat(),
    dark = darkMat();
  const add = (
    geometry: T.BufferGeometry,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const m = new T.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const cranium = add(new T.SphereGeometry(0.42, 28, 20), bone, 0, 0.08, 0);
  cranium.scale.set(1, 0.92, 1.05);
  add(new T.BoxGeometry(0.42, 0.3, 0.3), bone, 0, -0.18, 0.3);
  add(new T.BoxGeometry(0.36, 0.14, 0.26), bone, 0, -0.38, 0.28);
  for (const side of [-1, 1])
    add(new T.SphereGeometry(0.115, 16, 12), dark, side * 0.17, 0.1, 0.36);
  const nose = add(new T.ConeGeometry(0.06, 0.14, 4), dark, 0, -0.12, 0.44);
  nose.rotation.x = Math.PI;
  for (let i = 0; i < 4; i++)
    add(
      new T.BoxGeometry(0.07, 0.1, 0.03),
      bone,
      -0.12 + i * 0.08,
      -0.3,
      0.44,
    );
  group.scale.setScalar(scale);
  return group;
}
/** A standing skeleton about 2.6 tall; decor inside cages and jail cells. */
export function buildSkeletonMesh(scale = 1) {
  const group = new T.Group();
  const bone = boneMat();
  const add = (
    geometry: T.BufferGeometry,
    x: number,
    y: number,
    z: number,
  ) => {
    const m = new T.Mesh(geometry, bone);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const skull = buildSkullMesh(0.9);
  skull.position.set(0, 2.5, 0);
  group.add(skull);
  add(new T.CylinderGeometry(0.1, 0.12, 1.3, 12), 0, 1.7, 0);
  for (let i = 0; i < 3; i++) {
    const rib = add(
      new T.TorusGeometry(0.5 - i * 0.05, 0.07, 8, 20, Math.PI * 1.5),
      0,
      2.2 - i * 0.22,
      0,
    );
    rib.rotation.set(0, 0, Math.PI * 0.75);
  }
  add(new T.BoxGeometry(0.52, 0.24, 0.3), 0, 0.95, 0);
  for (const side of [-1, 1]) {
    const arm = add(
      new T.CylinderGeometry(0.07, 0.08, 1.15, 10),
      side * 0.62,
      1.75,
      0,
    );
    arm.rotation.z = side * 0.12;
    const hand = add(new T.SphereGeometry(0.11, 10, 8), side * 0.7, 1.15, 0);
    hand.scale.set(0.8, 1.2, 0.8);
    const leg = add(
      new T.CylinderGeometry(0.09, 0.1, 0.85, 10),
      side * 0.2,
      0.42,
      0,
    );
    leg.rotation.z = -side * 0.05;
    add(new T.BoxGeometry(0.16, 0.1, 0.34), side * 0.22, 0.05, 0.06);
  }
  group.scale.setScalar(scale);
  return group;
}
function buildHandClaw(
  bone: T.Material,
  spreadY: number,
  spreadZ: number,
): T.Group {
  // Three chained knuckle segments with an increasing downward curl.
  const claw = new T.Group();
  let parent: T.Object3D = claw;
  let length = 1.5;
  const segs: [number, number][] = [
    [0.42, 1.5],
    [0.3, 1.25],
    [0.18, 1.0],
  ];
  for (const [i, [radius, len]] of segs.entries()) {
    const joint = new T.Group();
    joint.position.set(i === 0 ? 0 : length, 0, 0);
    joint.rotation.z = -0.18 - i * 0.16;
    joint.rotation.y = spreadZ * 0.35;
    const seg = new T.Mesh(
      new T.CylinderGeometry(radius * 0.72, radius, len, 28),
      bone,
    );
    seg.rotation.z = -Math.PI / 2;
    seg.position.x = len / 2;
    seg.castShadow = true;
    seg.receiveShadow = true;
    joint.add(seg);
    const knuckle = new T.Mesh(new T.SphereGeometry(radius, 24, 18), bone);
    knuckle.castShadow = true;
    joint.add(knuckle);
    parent.add(joint);
    parent = joint;
    length = len;
    void spreadY;
  }
  const tip = new T.Mesh(new T.ConeGeometry(0.16, 0.7, 24), bone);
  tip.rotation.z = -Math.PI / 2 - 0.5;
  tip.position.set(length + 0.25, -0.15, 0);
  tip.castShadow = true;
  parent.add(tip);
  return claw;
}
/** Deterministic radial jitter for craggy rock; indexed-safe. */
function crag(geo: T.BufferGeometry, seed: number, amount: number) {
  const pos = geo.attributes.position,
    v = new T.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const h = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const s = 1 + (h - Math.floor(h) - 0.5) * amount;
    pos.setXYZ(i, v.x * s, v.y * s, v.z * s);
  }
  geo.computeVertexNormals();
  return geo;
}
function buildHandsModel(h: DungeonHazard, root: T.Group): T.Group[] {
  const stone = pbr("dark_rock_02", 1, {
    color: 0xf2f4f6,
    roughness: 0.95,
  });
  stone.flatShading = true;
  const bone = boneMat();
  const gem = new T.MeshStandardMaterial({
    color: 0x7a0d05,
    emissive: 0xff1a00,
    emissiveIntensity: 3.5,
    roughness: 0.3,
  });
  const strap = standard(0xc9b184, 0, 0.9);
  const pivots: T.Group[] = [];
  // No altar: the truck drives straight through the clap zone.
  for (const side of [-1, 1]) {
    const pivot = new T.Group();
    pivot.position.set(side * 10.5, 6.2, 0);
    // Segments run inward along local X; mirror with rotation, not scale.
    const inward = new T.Group();
    inward.rotation.y = side < 0 ? 0 : Math.PI;
    pivot.add(inward);
    const segR = [2.1, 1.9, 1.7];
    for (const [i, r] of segR.entries()) {
      const chunk = new T.Mesh(
        crag(new T.IcosahedronGeometry(r, 3), side * 10 + i, 0.35),
        stone,
      );
      chunk.position.set(1.4 + i * 1.7, i === 0 ? 0.3 : 0, 0);
      chunk.scale.set(1.15, 0.95, 0.95);
      chunk.rotation.set(i * 1.3, i * 0.7, 0.4);
      chunk.castShadow = true;
      chunk.receiveShadow = true;
      inward.add(chunk);
      const plate = new T.Mesh(new T.BoxGeometry(1.5, 0.5, 2.6), stone);
      plate.position.set(1.4 + i * 1.7, r * 0.75, 0);
      plate.rotation.y = i * 0.5;
      plate.castShadow = true;
      inward.add(plate);
      for (const sz of [-1, 1]) {
        const spike = new T.Mesh(new T.ConeGeometry(0.45, 1.6, 16), stone);
        spike.position.set(1.4 + i * 1.7, -r * 0.7, sz * r * 0.55);
        spike.rotation.x = sz * 2.6;
        spike.castShadow = true;
        inward.add(spike);
      }
    }
    const jewel = new T.Mesh(new T.IcosahedronGeometry(0.85, 2), gem);
    jewel.position.set(3.1, 2.1, 0);
    inward.add(jewel);
    const socket = new T.Mesh(new T.TorusGeometry(0.95, 0.22, 10, 20), stone);
    socket.position.set(3.1, 1.9, 0);
    socket.rotation.x = Math.PI / 2 - 0.3;
    inward.add(socket);
    const palm = new T.Mesh(
      crag(new T.SphereGeometry(1.7, 36, 26), side * 20, 0.2),
      stone,
    );
    palm.position.set(5.9, -0.2, 0);
    palm.scale.set(1.2, 0.9, 1.1);
    palm.castShadow = true;
    palm.receiveShadow = true;
    inward.add(palm);
    for (const [i, strapMesh] of [0, 1, 2].entries()) {
      void strapMesh;
      const tatter = new T.Mesh(
        new T.PlaneGeometry(0.7, 3.2, 1, 4),
        strap,
      );
      const pos = tatter.geometry.attributes.position;
      for (let v = 0; v < pos.count; v++)
        pos.setZ(v, Math.sin(v * 1.7 + i) * 0.25);
      tatter.geometry.computeVertexNormals();
      tatter.position.set(1.2 + i * 1.6, 1.8, side * (0.6 - i * 0.6));
      tatter.rotation.set(0.3, 0.4 * i, 0.5 + i * 0.3);
      tatter.castShadow = true;
      (tatter.material as T.Material).side = T.DoubleSide;
      inward.add(tatter);
    }
    // Five-claw fan: outer talons spread wide, middle talons reach furthest.
    const spreads: [number, number, number][] = [
      [0.55, -0.85, 0.85],
      [0.2, -0.45, 1],
      [0, 0, 1.1],
      [0.2, 0.45, 1],
      [0.55, 0.85, 0.85],
    ];
    for (const [lift, fan, reach] of spreads) {
      const claw = buildHandClaw(bone, lift, fan);
      claw.position.set(7.2, -0.2 + lift, fan * 1.1);
      claw.rotation.y = -fan * 0.4;
      claw.scale.setScalar(reach * 1.15);
      inward.add(claw);
    }
    root.add(pivot);
    pivots.push(pivot);
  }
  return pivots;
}
function bladeShape(mirror: 1 | -1) {
  // Pivot at the origin, tip nine below; serrated on the inner edge.
  const shape = new T.Shape();
  const X = (x: number) => x * mirror;
  shape.moveTo(X(-0.7), 1.6);
  shape.lineTo(X(0.7), 1.6);
  shape.lineTo(X(0.75), -1.2);
  const teeth = 9;
  for (let i = 0; i < teeth; i++) {
    const y0 = -1.2 - ((i * 8.3) / teeth),
      y1 = -1.2 - (((i + 0.5) * 8.3) / teeth),
      y2 = -1.2 - (((i + 1) * 8.3) / teeth);
    shape.lineTo(X(0.75), y0);
    shape.lineTo(X(1.25), y1);
    shape.lineTo(X(0.75), y2);
  }
  shape.lineTo(X(0.12), -10.6);
  shape.lineTo(X(0), -11.2);
  shape.lineTo(X(-0.35), -9.8);
  shape.lineTo(X(-0.7), -1.2);
  shape.closePath();
  return shape;
}
function buildScissorsModel(h: DungeonHazard, root: T.Group): T.Group[] {
  const steel = brushedSteel(0xc7ccd2);
  const rust = pbr("green_metal_rust", 1, {
    color: 0xb98a5a,
    metalness: 0.55,
    roughness: 0.6,
  });
  const dark = standard(0x2b2f33, 0.7, 0.45);
  const pivot = new T.Group();
  pivot.position.set(0, 11, 0);
  root.add(pivot);
  // No cutting block: the blades stab the ground; the truck drives between them.
  const bolt = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 1.7, 32), dark);
  bolt.rotation.x = Math.PI / 2;
  bolt.castShadow = true;
  pivot.add(bolt);
  for (const side of [-1, 1]) {
    const cap = new T.Mesh(new T.SphereGeometry(0.5, 24, 18), steel);
    cap.position.z = side * 0.95;
    pivot.add(cap);
    const washer = new T.Mesh(
      new T.TorusGeometry(1.0, 0.2, 12, 28),
      dark,
    );
    washer.position.z = side * 0.7;
    pivot.add(washer);
  }
  const arms: T.Group[] = [];
  for (const side of [-1, 1] as (1 | -1)[]) {
    const arm = new T.Group();
    const bladeGeo = new T.ExtrudeGeometry(bladeShape(side), {
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 2,
    });
    bladeGeo.translate(0, 0, side * 0.28 - 0.225);
    const blade = new T.Mesh(bladeGeo, steel);
    blade.castShadow = true;
    blade.receiveShadow = true;
    arm.add(blade);
    const shank = new T.Mesh(new T.BoxGeometry(1.15, 5.6, 0.55), rust);
    shank.position.set(side * 1.7, 3.6, side * 0.28);
    shank.rotation.z = -side * 0.32;
    shank.castShadow = true;
    arm.add(shank);
    const ring = new T.Mesh(new T.TorusGeometry(2.0, 0.55, 24, 64), rust);
    ring.position.set(side * 3.1, 6.4, side * 0.28);
    ring.castShadow = true;
    arm.add(ring);
    pivot.add(arm);
    arms.push(arm);
  }
  return arms;
}
function buildClippersModel(h: DungeonHazard, root: T.Group): T.Group[] {
  const steel = brushedSteel(0xa8b0b8);
  const dark = standard(0x3a4046, 0.75, 0.45);
  // Side rails pin the crusher to the ground.
  for (const side of [-1, 1]) {
    const rail = new T.Mesh(new T.BoxGeometry(1.4, 1.0, 9.5), dark);
    rail.position.set(side * 4.2, 0.5, 0);
    rail.castShadow = true;
    rail.receiveShadow = true;
    root.add(rail);
    const foot = new T.Mesh(new T.BoxGeometry(2.4, 0.5, 2.4), dark);
    foot.position.set(side * 4.2, 0.25, -3.5);
    foot.castShadow = true;
    root.add(foot);
  }
  // Lower jaw: thin ground scoop with eight short upward teeth.
  const scoop = new T.Mesh(new T.BoxGeometry(7.2, 0.35, 6.4), steel);
  scoop.position.set(0, 0.18, 0.4);
  scoop.castShadow = true;
  scoop.receiveShadow = true;
  root.add(scoop);
  for (let i = 0; i < 8; i++) {
    const tooth = new T.Mesh(new T.ConeGeometry(0.55, 0.9, 4), steel);
    tooth.rotation.y = Math.PI / 4;
    tooth.position.set(-3.05 + i * 0.87, 0.8, 0.4);
    tooth.castShadow = true;
    root.add(tooth);
  }
  // Pivot cheeks and pin at the back.
  for (const side of [-1, 1]) {
    const cheek = new T.Mesh(new T.BoxGeometry(0.9, 3.6, 2.6), steel);
    cheek.position.set(side * 3.6, 1.8, -3.0);
    cheek.castShadow = true;
    root.add(cheek);
    const gusset = new T.Mesh(new T.BoxGeometry(0.7, 2.6, 3.0), steel);
    gusset.position.set(side * 3.6, 2.3, 0.6);
    gusset.rotation.x = 0.5;
    gusset.castShadow = true;
    root.add(gusset);
  }
  const back = new T.Mesh(new T.BoxGeometry(8.1, 3.4, 0.8), steel);
  back.position.set(0, 1.7, -4.1);
  back.castShadow = true;
  root.add(back);
  const pin = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 8.6, 32), dark);
  pin.rotation.z = Math.PI / 2;
  pin.position.set(0, 3.6, -3.0);
  pin.castShadow = true;
  root.add(pin);
  for (const x of [-2.4, 0, 2.4]) {
    const knuckle = new T.Mesh(
      new T.CylinderGeometry(1.05, 1.05, 1.1, 32),
      steel,
    );
    knuckle.rotation.z = Math.PI / 2;
    knuckle.position.set(x, 3.6, -3.0);
    knuckle.castShadow = true;
    root.add(knuckle);
  }
  for (const [x, y, z] of [
    [-4.2, 1.05, -3.2],
    [4.2, 1.05, -3.2],
    [-4.2, 1.05, 3.2],
    [4.2, 1.05, 3.2],
    [-3.6, 3.4, -1.6],
    [3.6, 3.4, -1.6],
    [-3.6, 3.4, -4.4],
    [3.6, 3.4, -4.4],
  ]) {
    const dome = new T.Mesh(new T.SphereGeometry(0.3, 18, 14), dark);
    dome.position.set(x, y, z);
    dome.castShadow = true;
    root.add(dome);
  }
  for (const side of [-1, 1]) {
    const nut = new T.Mesh(new T.CylinderGeometry(1.0, 1.0, 0.5, 6), dark);
    nut.rotation.z = Math.PI / 2;
    nut.position.set(side * 4.5, 3.6, -3.0);
    root.add(nut);
  }
  // Upper jaw: hinged plate with eight downward teeth. Shut, the tips bite
  // just under the roofline; open, the truck clears the mouth.
  const jaw = new T.Group();
  jaw.position.set(0, 3.6, -3.0);
  const plate = new T.Mesh(new T.BoxGeometry(7.2, 1.0, 7.0), steel);
  plate.position.set(0, 0.3, 3.5);
  plate.castShadow = true;
  jaw.add(plate);
  for (let i = 0; i < 8; i++) {
    const tooth = new T.Mesh(new T.ConeGeometry(0.6, 1.2, 4), steel);
    tooth.rotation.x = Math.PI;
    tooth.rotation.y = Math.PI / 4;
    tooth.position.set(-3.05 + i * 0.87, -0.7, 3.5);
    tooth.castShadow = true;
    jaw.add(tooth);
  }
  const spine = new T.Mesh(new T.BoxGeometry(1.6, 0.8, 7.0), dark);
  spine.position.set(0, 1.1, 3.5);
  jaw.add(spine);
  root.add(jaw);
  // Lever arm: long bar angled up and right, counter-rocking with the jaw.
  const lever = new T.Group();
  lever.position.set(0, 3.6, -3.0);
  const bar = new T.Mesh(new T.BoxGeometry(1.3, 0.55, 13), steel);
  bar.position.set(0, 0, -5.6);
  bar.castShadow = true;
  lever.add(bar);
  const grip = new T.Mesh(new T.BoxGeometry(1.7, 0.8, 2.2), dark);
  grip.position.set(0, 0.1, -11.2);
  lever.add(grip);
  lever.rotation.x = 0.47;
  lever.rotation.y = 0.5;
  root.add(lever);
  return [jaw, lever];
}
function buildCupModel(h: DungeonHazard, root: T.Group): T.Group[] {
  const ceramic = standard(0xf2ede4, 0, 0.5);
  const coffee = standard(0x2a1608, 0, 0.35);
  const pivot = new T.Group();
  pivot.position.set(0, 8.2, 0);
  const body = new T.Mesh(new T.CylinderGeometry(4, 3.2, 5, 24), ceramic);
  body.castShadow = true;
  body.receiveShadow = true;
  pivot.add(body);
  const brew = new T.Mesh(new T.CylinderGeometry(3.5, 3.5, 0.3, 24), coffee);
  brew.position.y = 2.2;
  pivot.add(brew);
  const handle = new T.Mesh(new T.TorusGeometry(1.6, 0.35, 12, 24), ceramic);
  handle.position.x = 4.4;
  handle.rotation.y = Math.PI / 2;
  handle.castShadow = true;
  pivot.add(handle);
  root.add(pivot);
  return [pivot];
}
function buildCageModel(h: DungeonHazard, root: T.Group): T.Group[] {
  const iron = standard(0x2b2f33, 0.7, 0.5);
  const base = new T.Mesh(new T.CylinderGeometry(1.85, 2.0, 0.35, 24), iron);
  base.position.y = 0.18;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const bar = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 3.6, 12), iron);
    bar.position.set(Math.cos(a) * 1.45, 2.1, Math.sin(a) * 1.45);
    bar.castShadow = true;
    root.add(bar);
  }
  for (const y of [0.6, 3.6]) {
    const ring = new T.Mesh(new T.TorusGeometry(1.45, 0.14, 10, 28), iron);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    root.add(ring);
  }
  const dome = new T.Mesh(
    new T.SphereGeometry(1.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3),
    iron,
  );
  dome.position.y = 3.6;
  dome.castShadow = true;
  root.add(dome);
  const skeleton = buildSkeletonMesh(0.78);
  skeleton.position.y = 0.35;
  root.add(skeleton);
  return [];
}
function buildJailCellModel(h: DungeonHazard, root: T.Group): T.Group[] {
  // Bars are physics solids (see course.ts); the model holds the prisoner.
  const skeleton = buildSkeletonMesh(1);
  skeleton.position.set(0.8, 0, -0.6);
  skeleton.rotation.y = 0.7;
  root.add(skeleton);
  const straw = standard(0x8a7648, 0, 1);
  for (let i = 0; i < 5; i++) {
    const wisp = new T.Mesh(new T.BoxGeometry(1.4, 0.08, 0.12), straw);
    wisp.position.set(-1.5 + (i % 3) * 1.2, 0.06, 1.5 + Math.floor(i / 3) * 0.8);
    wisp.rotation.y = i * 0.7;
    root.add(wisp);
  }
  const bowl = new T.Mesh(
    new T.CylinderGeometry(0.45, 0.3, 0.3, 16),
    standard(0x4a4f55, 0.4, 0.7),
  );
  bowl.position.set(-1.8, 0.15, -1.6);
  root.add(bowl);
  return [];
}
/** Candle cluster: iron dish, three wax sticks, unlit flame cores. Flames are pivots so update() flickers them. */
function buildCandleModel(h: DungeonHazard, root: T.Group): T.Group[] {
  const iron = standard(0x23262b, 0.75, 0.45);
  const wax = standard(0xe8dcc0, 0, 0.55);
  const wickMat = standard(0x14100b, 0, 1);
  const dish = new T.Mesh(new T.CylinderGeometry(1.0, 1.1, 0.18, 24), iron);
  dish.position.y = 0.09;
  dish.castShadow = true;
  dish.receiveShadow = true;
  root.add(dish);
  const rim = new T.Mesh(new T.TorusGeometry(1.0, 0.07, 10, 28), iron);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.18;
  root.add(rim);
  const flames: T.Group[] = [];
  const sticks: [number, number, number][] = [
    [0, 0, 1.6],
    [0.48, 0.22, 1.1],
    [-0.38, -0.3, 0.8],
  ];
  for (const [i, [sx, sz, sh]] of sticks.entries()) {
    const stick = new T.Mesh(new T.CylinderGeometry(0.24, 0.28, sh, 20), wax);
    stick.position.set(sx, 0.18 + sh / 2, sz);
    stick.castShadow = true;
    stick.receiveShadow = true;
    root.add(stick);
    const collar = new T.Mesh(new T.TorusGeometry(0.25, 0.06, 8, 20), wax);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(sx, 0.18 + sh - 0.06, sz);
    root.add(collar);
    const wick = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.14, 8), wickMat);
    wick.position.set(sx, 0.18 + sh + 0.05, sz);
    root.add(wick);
    const flame = new T.Group();
    flame.position.set(sx, 0.18 + sh + 0.32, sz);
    const outer = new T.Mesh(
      new T.ConeGeometry(0.17, 0.5, 12),
      new T.MeshBasicMaterial({ color: 0xff7a1a }),
    );
    outer.userData.animate = true;
    const core = new T.Mesh(
      new T.SphereGeometry(0.09, 12, 10),
      new T.MeshBasicMaterial({ color: 0xffe9a8 }),
    );
    core.position.y = -0.1;
    core.userData.animate = true;
    flame.add(outer, core);
    flame.userData.base = 0.9 + i * 0.12;
    root.add(flame);
    flames.push(flame);
  }
  for (const [dx, dz, s] of [
    [0.72, -0.45, 1],
    [-0.7, 0.5, 0.75],
  ]) {
    const drip = new T.Mesh(new T.SphereGeometry(0.16 * s, 12, 10), wax);
    drip.scale.y = 0.45;
    drip.position.set(dx, 0.2, dz);
    root.add(drip);
  }
  void h;
  return flames;
}
export function buildDungeonModel(h: DungeonHazard): Model {
  const root = new T.Group();
  root.name = h.id;
  root.position.set(h.x, h.y ?? 0, h.z);
  root.rotation.y = h.yaw ?? 0;
  const model: Model = { h, root, pivots: [], triangles: 0 };
  if (h.kind === "hands") {
    model.pivots = buildHandsModel(h, root);
    root.add(buildDungeonLabel(h, 16.5));
  } else if (h.kind === "scissors") {
    model.pivots = buildScissorsModel(h, root);
    root.add(buildDungeonLabel(h, 22.5));
  } else if (h.kind === "clippers") {
    model.pivots = buildClippersModel(h, root);
    root.add(buildDungeonLabel(h, 14.5));
  } else if (h.kind === "cup") {
    model.pivots = buildCupModel(h, root);
    root.add(buildDungeonLabel(h, 16));
  } else if (h.kind === "cage") {
    model.pivots = buildCageModel(h, root);
  } else if (h.kind === "candle") {
    model.pivots = buildCandleModel(h, root);
  } else if (h.kind === "lime-chomper") {
    model.pivots = [buildLimeChomper(root)];
    root.add(buildDungeonLabel(h, 21));
  } else if (h.kind === "guided-pipe") {
    buildGuidedPipe(root);
  } else if (isGauntletMachine(h.kind)) {
    model.machine = buildGauntletMachine(root, { ...h, kind: h.kind });
  } else if (isDinosaur(h.kind)) {
    root.scale.setScalar(h.scale ?? 1);
    model.dinosaur = buildDinosaur(root, h.kind);
    poseDinosaur(model.dinosaur, 0, 0);
  } else {
    model.pivots = buildJailCellModel(h, root);
  }
  // Rest pose matches the cycle start (fully open); update() drives it live.
  if (h.kind === "hands" && model.pivots.length >= 2) {
    model.pivots[0].rotation.z = 0.96;
    model.pivots[1].rotation.z = -0.96;
  } else if (h.kind === "scissors" && model.pivots.length >= 2) {
    model.pivots[0].rotation.z = -0.62;
    model.pivots[1].rotation.z = 0.62;
  } else if (h.kind === "clippers" && model.pivots.length >= 2) {
    model.pivots[0].rotation.x = -1.05;
    model.pivots[1].rotation.x = 0.9;
  }
  consolidate(root);
  root.traverse((o) => {
    if (o instanceof T.Mesh)
      model.triangles +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });

  return model;
}
export class DungeonView extends T.Group {
  private key = "";
  private builtTrack?: Simulation["courseTrack"];
  private models: Model[] = [];
  private candlePool: T.PointLight[] = [];
  /** Live editing: shift one hazard model by delta. */
  moveModel(id: string, dx: number, dy: number, dz: number) {
    const m = this.models.find((m) => m.h.id === id);
    if (m) m.root.position.add(new T.Vector3(dx, dy, dz));
  }
  /** Strike inspection for tests: head world position plus jaw openness. */
  inspectDinosaur(id: string) {
    const m = this.models.find((m) => m.h.id === id && m.dinosaur);
    if (!m?.dinosaur) return undefined;
    m.root.updateMatrixWorld(true);
    const head = m.dinosaur.head.getWorldPosition(new T.Vector3());
    return {
      head: { x: head.x, y: head.y, z: head.z },
      jawOpen: m.dinosaur.jaw.rotation.x,
    };
  }
  /** Live editing: drop one hazard model by id. */
  removeModel(id: string) {
    const at = this.models.findIndex((m) => m.h.id === id);
    if (at < 0) return;
    const [m] = this.models.splice(at, 1);
    m.root.traverse((o) => {
      if (o instanceof T.Sprite) {
        const mat = o.material as T.SpriteMaterial;
        if (mat.map instanceof T.CanvasTexture) mat.map.dispose();
        mat.dispose();
        return;
      }
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const mat of Array.isArray(o.material)
          ? o.material
          : [o.material]) {
          if (
            mat instanceof T.MeshBasicMaterial &&
            mat.map instanceof T.CanvasTexture
          )
            mat.map.dispose();
          if (
            mat instanceof T.MeshStandardMaterial &&
            mat.roughnessMap instanceof T.CanvasTexture
          )
            mat.roughnessMap.dispose();
          mat.dispose();
        }
      }
    });
    m.root.removeFromParent();
  }
  update(s: Simulation) {
    const key = s.courseTrack?.id ?? "";
    // Editor saves replace the definition without changing the level id.
    if (key !== this.key || s.courseTrack !== this.builtTrack) {
      this.builtTrack = s.courseTrack;
      this.traverse((o) => {
        if (o instanceof T.Sprite) {
          const mat = o.material as T.SpriteMaterial;
          if (mat.map instanceof T.CanvasTexture) mat.map.dispose();
          mat.dispose();
          return;
        }
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
            if (
              m instanceof T.MeshStandardMaterial &&
              m.roughnessMap instanceof T.CanvasTexture
            )
              m.roughnessMap.dispose();
            m.dispose();
          }
        }
      });
      this.clear();
      this.models = [];
      this.key = key;
      if (s.courseTrack)
        for (const h of dungeonHazards(s.courseTrack)) {
          const m = buildDungeonModel(h);
          this.models.push(m);
          this.add(m.root);
        }
    }
    for (const mech of s.dungeon.mechanisms) {
      if (this.models.some((m) => m.h.id === mech.h.id)) continue;
      const m = buildDungeonModel(mech.h);
      this.models.push(m);
      this.add(m.root);
    }
    for (const m of this.models) {
      if (m.machine) {
        m.machine(s.time, s.dungeon.gauntlet.machines.get(m.h.id)?.state);
        continue;
      }
      if (m.dinosaur && isDinosaur(m.h.kind)) {
        const bite = s.dungeon.mechanisms.find(({ h }) => h.id === m.h.id)?.bite;
        const elapsed = bite ? s.time - bite.started : 0;
        let aim = 0;
        if (bite) {
          const car = s.body.translation();
          const restHead = m.root.localToWorld(
            new T.Vector3(0, DINOSAUR_BITE[m.h.kind].height, 1.65),
          );
          aim = dinosaurAimPitch(
            restHead.y,
            car.y,
            Math.hypot(car.x - restHead.x, car.z - restHead.z),
          );
        }
        poseDinosaur(m.dinosaur, elapsed, bite?.turn ?? 0, aim);
        continue;
      }
      if (m.h.kind === "lime-chomper") {
        m.pivots[0].rotation.x = -0.82 * limeJawPose(s.time + m.h.phase).openness;
        continue;
      }
      const open = snapOpenness(s.time + m.h.phase);
      if (m.h.kind === "hands" && m.pivots.length >= 2) {
        m.pivots[0].rotation.z = -0.79 + open * 1.75;
        m.pivots[1].rotation.z = 0.79 - open * 1.75;
      } else if (m.h.kind === "scissors" && m.pivots.length >= 2) {
        m.pivots[0].rotation.z = -(0.02 + open * 0.6);
        m.pivots[1].rotation.z = 0.02 + open * 0.6;
      } else if (m.h.kind === "clippers" && m.pivots.length >= 2) {
        m.pivots[0].rotation.x = 0.22 - open * 1.27;
        m.pivots[1].rotation.x = 0.05 + open * 0.85;
      } else if (m.h.kind === "cup" && m.pivots.length >= 1) {
        m.pivots[0].position.y = 1.2 + open * 7;
      } else if (m.h.kind === "candle") {
        m.pivots.forEach((f, i) => {
          const base = (f.userData.base as number | undefined) ?? 1;
          const w =
            1 +
            0.12 * Math.sin(s.time * 13 + m.h.phase + i * 2.1) +
            0.06 * Math.sin(s.time * 29 + i * 1.3);
          f.scale.set(base * w, base * (1 + (w - 1) * 1.6), base * w);
        });
      }
    }
    if (this.candlePool.length === 0) this.candlePool = buildCandleLightPool();
    for (const light of this.candlePool) if (!light.parent) this.add(light);
    const focus = s.body.translation();
    assignCandleLights(
      this.candlePool,
      this.candleSources(),
      new T.Vector3(focus.x, focus.y, focus.z),
      s.weather.night,
      s.time,
    );
  }
  candleSources(): CandleSource[] {
    return this.models
      .filter((m) => m.h.kind === "candle")
      .map((m) => ({
        id: m.h.id,
        x: m.root.position.x,
        z: m.root.position.z,
        y: m.root.position.y,
        phase: m.h.phase,
      }));
  }
  candleLightStats() {
    return {
      active: this.candlePool.filter((l) => l.visible).length,
      total: CANDLE_LIGHT_COUNT,
    };
  }
  inspect() {
    return this.models.map((m) => ({
      id: m.h.id,
      kind: m.h.kind,
      triangles: m.triangles,
      animated: m.pivots.length > 0 || !!m.dinosaur || (!!m.machine && m.h.kind !== "start-gate"),
    }));
  }
}
