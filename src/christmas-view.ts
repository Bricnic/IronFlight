import * as T from "three";
import type { ChristmasKind } from "./custom-level";
import {
  CHRISTMAS_ARCH,
  CHRISTMAS_DEER,
  CHRISTMAS_GIFTS,
  CHRISTMAS_LANTERN,
  CHRISTMAS_STALL,
  CHRISTMAS_TRUNK,
} from "./dungeon-hazards";

const mat = (color: number, roughness = 0.55, extra: T.MeshStandardMaterialParameters = {}) =>
  new T.MeshStandardMaterial({ color, roughness, metalness: 0.05, ...extra });

function mesh(
  root: T.Object3D,
  geometry: T.BufferGeometry,
  material: T.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new T.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  root.add(m);
  return m;
}

const RED = 0xc81f2e;
const WHITE = 0xf2f7fb;
const GREEN = 0x1f6b3a;
const GOLD = 0xd8a83a;
const UP = new T.Vector3(0, 1, 0);

/** Snow-dusted fir with baubles and a star; only the trunk collides. */
function buildTree(root: T.Group) {
  mesh(
    root,
    new T.CylinderGeometry(CHRISTMAS_TRUNK.w / 2 - 0.1, CHRISTMAS_TRUNK.w / 2 + 0.1, 5, 16),
    mat(0x5a3a22, 0.8),
    0,
    2.5,
    0,
  );
  const skirt = mesh(
    root,
    new T.CylinderGeometry(2.2, 2.6, 0.5, 20),
    mat(RED, 0.6),
    0,
    0.25,
    0,
  );
  void skirt;
  const tiers = [
    { r: 3.4, y: 4.6, h: 2.6, baubles: 8 },
    { r: 2.6, y: 6.4, h: 2.4, baubles: 6 },
    { r: 1.8, y: 8.0, h: 2.2, baubles: 4 },
  ];
  const fir = mat(GREEN, 0.7);
  const snow = mat(WHITE, 0.9);
  const baubleColors = [0xd42a2a, 0xffd23b, 0x3fa7ff, 0xff6fa5];
  for (const [ti, tier] of tiers.entries()) {
    mesh(root, new T.ConeGeometry(tier.r, tier.h, 18), fir, 0, tier.y, 0);
    mesh(root, new T.ConeGeometry(tier.r * 0.7, tier.h * 0.45, 18), snow, 0, tier.y + tier.h * 0.32, 0);
    for (let i = 0; i < tier.baubles; i++) {
      const a = (i / tier.baubles) * Math.PI * 2 + ti * 0.5;
      mesh(
        root,
        new T.SphereGeometry(0.32, 12, 8),
        mat(baubleColors[(i + ti) % baubleColors.length], 0.25),
        Math.cos(a) * tier.r * 0.82,
        tier.y - tier.h * 0.28,
        Math.sin(a) * tier.r * 0.82,
      );
    }
  }
  mesh(root, new T.CylinderGeometry(0.08, 0.08, 1.2, 8), mat(0x5a3a22, 0.8), 0, 9.4, 0);
  const star = mesh(root, new T.OctahedronGeometry(0.7), mat(GOLD, 0.3, { emissive: 0xffc95a, emissiveIntensity: 0.8 }), 0, 10.2, 0);
  star.scale.set(1, 1.4, 1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    mesh(
      root,
      new T.BoxGeometry(0.4, 0.4, 0.4),
      mat(i % 2 ? RED : GOLD, 0.5),
      Math.cos(a) * 2.9,
      0.7,
      Math.sin(a) * 2.9,
    );
  }
}

/** Peppermint posts wrapped in light strings with an ice-blue arc; cars drive between the posts. */
function buildArch(root: T.Group) {
  const red = mat(RED, 0.4);
  const white = mat(WHITE, 0.4);
  const { postX } = CHRISTMAS_ARCH;
  const bulb = mat(0xffd27a, 0.4, { emissive: 0xffc95a, emissiveIntensity: 1.4 });
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(2.4, 0.6, 2.4), white, side * postX, 0.3, 0);
    for (let i = 0; i < 8; i++)
      mesh(
        root,
        new T.CylinderGeometry(0.8, 0.8, 1.25, 20),
        i % 2 ? white : red,
        side * postX,
        0.6 + 0.625 + i * 1.25,
        0,
      );
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05;
      mesh(
        root,
        new T.SphereGeometry(0.22, 10, 8),
        bulb,
        side * postX + Math.cos(a) * 0.95,
        1.4 + i * 1.4,
        Math.sin(a) * 0.95,
      );
    }
    const wreath = mesh(
      root,
      new T.TorusGeometry(1.0, 0.32, 10, 20),
      mat(GREEN, 0.7),
      side * postX,
      8.2,
      0.9,
    );
    void wreath;
    mesh(root, new T.SphereGeometry(0.2, 10, 8), red, side * postX - 0.7, 8.9, 0.9);
    mesh(root, new T.SphereGeometry(0.2, 10, 8), red, side * postX + 0.7, 8.9, 0.9);
  }
  const ice = mat(0x9ad6ff, 0.25, { emissive: 0x3fa7ff, emissiveIntensity: 0.35 });
  const segments = 12;
  for (let i = 0; i < segments; i++) {
    const theta = (Math.PI * (i + 0.5)) / segments;
    const piece = mesh(
      root,
      new T.CylinderGeometry(0.8, 0.8, 2.0, 20),
      i % 2 ? ice : white,
      postX * Math.cos(theta),
      10 + postX * Math.sin(theta),
      0,
    );
    piece.quaternion.setFromUnitVectors(
      UP,
      new T.Vector3(-Math.sin(theta), Math.cos(theta), 0),
    );
  }
  const star = mesh(root, new T.OctahedronGeometry(0.8), mat(GOLD, 0.3, { emissive: 0xffc95a, emissiveIntensity: 1.2 }), 0, 10 + postX + 0.8, 0);
  star.scale.set(1, 1.4, 1);
}

/** Wooden market booth with gifts and cocoa mugs under a striped awning. */
function buildStall(root: T.Group) {
  const { w, h, d } = CHRISTMAS_STALL;
  mesh(root, new T.BoxGeometry(w, 2.2, d), mat(0x7a5230, 0.8), 0, 1.1, 0);
  const green = mat(GREEN, 0.6);
  const white = mat(WHITE, 0.6);
  for (let i = 0; i < 6; i++)
    mesh(
      root,
      new T.BoxGeometry(0.8, 1.8, 0.1),
      i % 2 ? white : green,
      -2.5 + i,
      1.1,
      d / 2 + 0.05,
    );
  const post = mat(0x5a3a22, 0.8);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      mesh(
        root,
        new T.CylinderGeometry(0.18, 0.18, 3, 10),
        post,
        sx * (w / 2 - 0.3),
        3.7,
        sz * (d / 2 - 0.3),
      );
  for (let i = 0; i < 6; i++) {
    mesh(
      root,
      new T.BoxGeometry(1.1, 0.15, d + 1.4),
      i % 2 ? white : mat(RED, 0.6),
      -2.75 + i * 1.1,
      h + 1.4,
      0,
    );
    mesh(
      root,
      new T.BoxGeometry(1, 0.6, 0.15),
      i % 2 ? white : mat(RED, 0.6),
      -2.75 + i * 1.1,
      h + 1.0,
      d / 2 + 0.7,
    );
  }
  const giftColors = [RED, GREEN, GOLD];
  for (let i = 0; i < 3; i++) {
    const gx = -1.8 + i * 1.8;
    mesh(root, new T.BoxGeometry(1.2, 0.9, 1.2), mat(giftColors[i], 0.5), gx, 2.65, -1.0);
    mesh(root, new T.BoxGeometry(1.3, 0.2, 0.3), mat(GOLD, 0.4), gx, 2.65, -1.0);
  }
  for (const mx of [-0.9, 0.9]) {
    mesh(root, new T.CylinderGeometry(0.28, 0.24, 0.5, 14), mat(WHITE, 0.5), mx, 2.45, 1.2);
    mesh(root, new T.SphereGeometry(0.16, 10, 8), mat(0x4a2c14, 0.7), mx, 2.72, 1.2);
  }
  const lampArm = mesh(root, new T.CylinderGeometry(0.08, 0.08, 1.2, 8), post, w / 2 - 0.3, 4.6, d / 2 + 0.2);
  lampArm.rotation.x = Math.PI / 2;
  void lampArm;
  mesh(root, new T.SphereGeometry(0.3, 12, 8), mat(0xffd27a, 0.4, { emissive: 0xffc95a, emissiveIntensity: 1.6 }), w / 2 - 0.3, 4.3, d / 2 + 0.8);
}

/** Iron street lantern with a glowing head and a hanging wreath. */
function buildLantern(root: T.Group) {
  const iron = mat(0x23282e, 0.5, { metalness: 0.5 });
  mesh(root, new T.CylinderGeometry(1.0, 1.2, 0.8, 16), iron, 0, 0.4, 0);
  const poleH = CHRISTMAS_LANTERN.h - 1.6;
  mesh(root, new T.CylinderGeometry(0.3, 0.4, poleH, 12), iron, 0, 0.8 + poleH / 2, 0);
  mesh(root, new T.CylinderGeometry(0.7, 0.7, 0.4, 12), iron, 0, 0.8 + poleH, 0);
  const glassY = 0.8 + poleH + 0.9;
  mesh(
    root,
    new T.BoxGeometry(1.1, 1.4, 1.1),
    mat(0xffd27a, 0.4, { emissive: 0xffc95a, emissiveIntensity: 1.6 }),
    0,
    glassY,
    0,
  );
  for (const [cx, cz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]] as const)
    mesh(root, new T.BoxGeometry(0.12, 1.5, 0.12), iron, cx, glassY, cz);
  mesh(root, new T.ConeGeometry(1.0, 0.9, 4), iron, 0, glassY + 1.15, 0).rotation.y = Math.PI / 4;
  mesh(root, new T.ConeGeometry(1.05, 0.35, 4), mat(WHITE, 0.9), 0, glassY + 1.5, 0).rotation.y = Math.PI / 4;
  mesh(root, new T.SphereGeometry(0.18, 10, 8), iron, 0, glassY + 1.8, 0);
  const hook = mesh(root, new T.TorusGeometry(0.35, 0.07, 8, 14), iron, 0.5, 4.6, 0);
  void hook;
  const wreath = mesh(root, new T.TorusGeometry(0.65, 0.24, 10, 20), mat(GREEN, 0.7), 0.5, 3.7, 0);
  void wreath;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    mesh(root, new T.SphereGeometry(0.12, 8, 6), mat(RED, 0.4), 0.5 + Math.cos(a) * 0.65, 3.7 + Math.sin(a) * 0.65, 0);
  }
}

/** Gift-box wall; ribboned presents in two stacked rows. */
function buildGifts(root: T.Group) {
  const { w, h, d } = CHRISTMAS_GIFTS;
  const paper = [RED, GREEN, 0x3fa7ff, GOLD];
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 6; col++) {
      const x = -w / 2 + 1 + col * 2;
      const y = 0.75 + row * 1.5;
      const color = paper[(row * 6 + col) % paper.length];
      mesh(root, new T.BoxGeometry(1.9, 1.4, d), mat(color, 0.5), x, y, 0);
      mesh(root, new T.BoxGeometry(0.4, 1.45, d + 0.06), mat(WHITE, 0.4), x, y, 0);
    }
  for (let col = 0; col < 3; col++) {
    const x = -w / 2 + 2 + col * 4;
    mesh(root, new T.BoxGeometry(1.6, 0.5, 1.2), mat(paper[col], 0.5), x, h + 0.25, 0);
    const bow = mesh(root, new T.TorusGeometry(0.28, 0.12, 8, 12), mat(RED, 0.4), x, h + 0.6, 0);
    bow.rotation.x = Math.PI / 2;
  }
  mesh(root, new T.BoxGeometry(w, 0.3, d + 0.6), mat(WHITE, 0.9), 0, 0.15, 0);
}

/** Wooden reindeer statue on a round stone base; plinth and statue both collide. */
function buildReindeer(root: T.Group) {
  const { w, h, d } = CHRISTMAS_DEER;
  mesh(root, new T.BoxGeometry(w, h, d), mat(0x8f979b, 0.9), 0, h / 2, 0);
  mesh(root, new T.CylinderGeometry(1.9, 2.1, 0.4, 20), mat(WHITE, 0.9), 0, h + 0.2, 0);
  const wood = mat(0x8a5a2b, 0.7);
  const darkWood = mat(0x6b4423, 0.7);
  const y0 = h + 0.4;
  mesh(root, new T.BoxGeometry(1.1, 1.1, 2.2), wood, 0, y0 + 1.15, 0);
  for (const [lx, lz] of [[-0.4, -0.8], [0.4, -0.8], [-0.4, 0.8], [0.4, 0.8]] as const)
    mesh(root, new T.BoxGeometry(0.32, 1.1, 0.32), darkWood, lx, y0 + 0.55, lz);
  const neck = mesh(root, new T.BoxGeometry(0.7, 1.4, 0.7), wood, 0, y0 + 2.2, 1.2);
  neck.rotation.x = 0.35;
  mesh(root, new T.BoxGeometry(0.8, 0.8, 1.1), wood, 0, y0 + 2.9, 1.6);
  mesh(root, new T.SphereGeometry(0.22, 12, 8), mat(RED, 0.3, { emissive: 0xd42a2a, emissiveIntensity: 0.6 }), 0, y0 + 2.8, 2.25);
  for (const side of [-1, 1]) {
    mesh(root, new T.SphereGeometry(0.11, 8, 6), mat(0x182330, 0.4), side * 0.42, y0 + 3.0, 1.85);
    const beam = mesh(root, new T.CylinderGeometry(0.09, 0.12, 1.4, 8), mat(GOLD, 0.4, { metalness: 0.5 }), side * 0.35, y0 + 3.9, 1.5);
    beam.rotation.z = side * -0.25;
    for (let i = 0; i < 3; i++) {
      const tine = mesh(root, new T.CylinderGeometry(0.06, 0.07, 0.6, 8), mat(GOLD, 0.4, { metalness: 0.5 }), side * (0.5 + i * 0.12), y0 + 3.7 + i * 0.35, 1.5);
      tine.rotation.z = side * 1.1;
    }
  }
  const scarf = mesh(root, new T.TorusGeometry(0.62, 0.2, 8, 16), mat(RED, 0.6), 0, y0 + 1.9, 1.05);
  scarf.rotation.x = Math.PI / 2 - 0.3;
  mesh(root, new T.SphereGeometry(0.18, 10, 8), mat(GOLD, 0.4, { metalness: 0.5 }), 0, y0 + 1.55, 1.45);
}

/** Static decor: builds into root and returns no animated pivots. */
export function buildChristmasDecor(root: T.Group, kind: ChristmasKind): T.Group[] {
  if (kind === "christmas-tree") buildTree(root);
  else if (kind === "christmas-light-arch") buildArch(root);
  else if (kind === "christmas-market-stall") buildStall(root);
  else if (kind === "christmas-lantern") buildLantern(root);
  else if (kind === "christmas-gift-wall") buildGifts(root);
  else if (kind === "christmas-reindeer") buildReindeer(root);
  return [];
}
