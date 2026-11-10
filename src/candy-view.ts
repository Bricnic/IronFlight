import * as T from "three";
import type { CandyKind } from "./custom-level";
import {
  CANDY_ARCH,
  CANDY_CHOCOLATE,
  CANDY_LAMP,
  CANDY_STALL,
  CANDY_STAND,
  CANDY_TRUNK,
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

const RED = 0xd42a2a;
const WHITE = 0xf6f2ea;
const UP = new T.Vector3(0, 1, 0);

/** Striped posts with a peppermint arc; cars drive between the posts. */
function buildArch(root: T.Group) {
  const red = mat(RED, 0.4);
  const white = mat(WHITE, 0.4);
  const { postX } = CANDY_ARCH;
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
    const disc = mesh(
      root,
      new T.CylinderGeometry(1.3, 1.3, 0.4, 24),
      red,
      side * postX,
      8.2,
      0.9,
    );
    disc.rotation.x = Math.PI / 2;
    const dot = mesh(
      root,
      new T.CylinderGeometry(0.45, 0.45, 0.5, 16),
      white,
      side * postX,
      8.2,
      0.9,
    );
    dot.rotation.x = Math.PI / 2;
  }
  const segments = 12;
  for (let i = 0; i < segments; i++) {
    const theta = (Math.PI * (i + 0.5)) / segments;
    const piece = mesh(
      root,
      new T.CylinderGeometry(0.8, 0.8, 1.9, 20),
      i % 2 ? white : red,
      postX * Math.cos(theta),
      10 + postX * Math.sin(theta),
      0,
    );
    piece.quaternion.setFromUnitVectors(
      UP,
      new T.Vector3(-Math.sin(theta), Math.cos(theta), 0),
    );
  }
}

/** Chocolate trunk with three gumdrop tiers; only the trunk collides. */
function buildTree(root: T.Group) {
  mesh(
    root,
    new T.CylinderGeometry(CANDY_TRUNK.w / 2 - 0.1, CANDY_TRUNK.w / 2 + 0.1, 5, 16),
    mat(0x4a2c14, 0.7),
    0,
    2.5,
    0,
  );
  const ringOrange = mat(0xff8c2e, 0.5);
  const ringWhite = mat(WHITE, 0.5);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    mesh(
      root,
      new T.BoxGeometry(0.5, 0.5, 0.5),
      i % 2 ? ringWhite : ringOrange,
      Math.cos(a) * 1.6,
      0.25,
      Math.sin(a) * 1.6,
    );
  }
  const tiers = [
    { r: 3.2, y: 5.0, count: 8, color: 0xff6fa5 },
    { r: 2.4, y: 6.8, count: 6, color: 0x5fd35f },
    { r: 1.6, y: 8.4, count: 4, color: 0xff8c2e },
  ];
  for (const tier of tiers) {
    const gum = mat(tier.color, 0.35);
    for (let i = 0; i < tier.count; i++) {
      const a = (i / tier.count) * Math.PI * 2;
      const drop = mesh(
        root,
        new T.SphereGeometry(1.1, 20, 14),
        gum,
        Math.cos(a) * tier.r,
        tier.y,
        Math.sin(a) * tier.r,
      );
      drop.scale.set(1, 0.8, 1);
    }
  }
  mesh(root, new T.SphereGeometry(0.8, 16, 12), mat(WHITE, 0.3), 0, 9.6, 0);

}

/** Rainbow swirl disc on a striped pole over a circus base. */
function buildLollipop(root: T.Group) {
  const red = mat(0xc23b2e, 0.5);
  const white = mat(WHITE, 0.5);
  mesh(
    root,
    new T.CylinderGeometry(2, 2.8, CANDY_STAND.h, 24),
    red,
    0,
    CANDY_STAND.h / 2,
    0,
  );
  const rim = mesh(
    root,
    new T.TorusGeometry(2.5, 0.25, 12, 32),
    white,
    0,
    CANDY_STAND.h,
    0,
  );
  rim.rotation.x = Math.PI / 2;
  for (let i = 0; i < 7; i++)
    mesh(
      root,
      new T.CylinderGeometry(0.35, 0.35, 1, 12),
      i % 2 ? red : white,
      0,
      CANDY_STAND.h + 0.5 + i,
      0,
    );
  const discY = CANDY_STAND.h + 7.6;
  const disc = mesh(
    root,
    new T.CylinderGeometry(3, 3, 0.6, 36),
    white,
    0,
    discY,
    0,
  );
  disc.rotation.x = Math.PI / 2;
  const swirl = [0xe23b3b, 0xff8c2e, 0xffd23b, 0x5fd35f, 0x3fa7ff, 0x9a5fe0];
  for (const face of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      const r = 0.6 + i * 0.35;
      mesh(
        root,
        new T.SphereGeometry(0.55, 14, 10),
        mat(swirl[i], 0.3),
        Math.cos(a) * r,
        discY + Math.sin(a) * r,
        face * 0.35,
      );
    }
}

/** Scored chocolate wall; one corner exposes wafer layers. */
function buildChocolate(root: T.Group) {
  const { w, h, d } = CANDY_CHOCOLATE;
  mesh(root, new T.BoxGeometry(w, h, d), mat(0x5a3218, 0.6), 0, h / 2, 0);
  const square = mat(0x6b3d1f, 0.55);
  for (const face of [-1, 1])
    for (let col = 0; col < 6; col++)
      for (let row = 0; row < 2; row++)
        mesh(
          root,
          new T.BoxGeometry(1.6, 1.1, 0.3),
          square,
          -5 + col * 2,
          0.9 + row * 1.2,
          face * (d / 2 + 0.15),
        );
  const wafer = mat(0xd9b98a, 0.8);
  for (let i = 0; i < 3; i++)
    mesh(
      root,
      new T.BoxGeometry(1.2, 0.18, 1.2),
      wafer,
      w / 2 - 0.8,
      h + 0.1 + i * 0.22,
      0,
    );
}

/** Striped booth with two cotton candy cones on the counter. */
function buildStall(root: T.Group) {
  const { w, h, d } = CANDY_STALL;
  mesh(root, new T.BoxGeometry(w, 2.2, d), mat(0x8a5a2b, 0.7), 0, 1.1, 0);
  const red = mat(RED, 0.6);
  const white = mat(WHITE, 0.6);
  for (let i = 0; i < 6; i++)
    mesh(
      root,
      new T.BoxGeometry(0.8, 1.8, 0.1),
      i % 2 ? white : red,
      -2.5 + i,
      1.1,
      d / 2 + 0.05,
    );
  const post = mat(0x6b4423, 0.7);
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
      i % 2 ? white : red,
      -2.75 + i * 1.1,
      h + 1.4,
      0,
    );
    mesh(
      root,
      new T.BoxGeometry(1, 0.6, 0.15),
      i % 2 ? white : red,
      -2.75 + i * 1.1,
      h + 1.0,
      d / 2 + 0.7,
    );
  }
  const fluff: Array<[number, number]> = [
    [-1.4, 0xff9ec7],
    [1.4, 0x8ecfff],
  ];
  for (const [x, color] of fluff) {
    const cone = mesh(
      root,
      new T.ConeGeometry(0.5, 1.2, 14),
      mat(0xd9a75f, 0.8),
      x,
      2.8,
      0,
    );
    cone.rotation.x = Math.PI;
    const candy = mat(color, 1);
    mesh(root, new T.SphereGeometry(0.9, 16, 12), candy, x, 3.6, 0);
    mesh(root, new T.SphereGeometry(0.7, 16, 12), candy, x, 4.3, 0);
    mesh(root, new T.SphereGeometry(0.55, 14, 10), candy, x, 4.9, 0);
  }
}

/** Gumball globe on a lamp pole; the globe glows like a lamp. */
function buildLamp(root: T.Group) {
  const red = mat(0xb03a2e, 0.45);
  mesh(
    root,
    new T.CylinderGeometry(1.1, 1.3, 0.8, 20),
    red,
    0,
    0.4,
    0,
  );
  const poleH = CANDY_LAMP.h - 1.6;
  mesh(root, new T.CylinderGeometry(0.35, 0.35, poleH, 14), red, 0, 0.8 + poleH / 2, 0);
  mesh(root, new T.CylinderGeometry(0.9, 0.9, 0.5, 20), red, 0, 6.4, 0);
  const globeY = 8.3;
  mesh(
    root,
    new T.SphereGeometry(0.5, 14, 10),
    mat(0xffd27a, 0.4, { emissive: 0xffc95a, emissiveIntensity: 1.6 }),
    0,
    globeY,
    0,
  );
  const flavors = [
    0xe23b3b, 0xff8c2e, 0xffd23b, 0x5fd35f,
    0x3fa7ff, 0x9a5fe0, 0xff6fa5, 0x35cbd2,
  ];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    mesh(
      root,
      new T.SphereGeometry(0.32, 12, 8),
      mat(flavors[i], 0.3),
      Math.cos(a) * 0.9,
      globeY - 0.5,
      Math.sin(a) * 0.9,
    );
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    mesh(
      root,
      new T.SphereGeometry(0.32, 12, 8),
      mat(flavors[(i + 4) % flavors.length], 0.3),
      Math.cos(a) * 0.5,
      globeY + 0.5,
      Math.sin(a) * 0.5,
    );
  }
  const glass = mesh(
    root,
    new T.SphereGeometry(1.7, 24, 18),
    new T.MeshStandardMaterial({
      color: 0xcfe8ff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0,
    }),
    0,
    globeY,
    0,
  );
  glass.castShadow = false;
  mesh(root, new T.ConeGeometry(1.9, 1.0, 20), red, 0, globeY + 2.0, 0);
  mesh(root, new T.SphereGeometry(0.3, 12, 8), red, 0, globeY + 2.6, 0);

}

/** Static decor: builds into root and returns no animated pivots. */
export function buildCandyDecor(root: T.Group, kind: CandyKind): T.Group[] {
  if (kind === "candy-cane-arch") buildArch(root);
  else if (kind === "gumdrop-tree") buildTree(root);
  else if (kind === "lollipop-stand") buildLollipop(root);
  else if (kind === "chocolate-barrier") buildChocolate(root);
  else if (kind === "cotton-candy-stall") buildStall(root);
  else if (kind === "gumball-lamp") buildLamp(root);
  return [];
}
