import * as T from "three";
import { PELICAN, pelicanPose, SHIP } from "./dungeon-hazards";
import type { DungeonPhysics } from "./dungeon-physics";

type Mech = DungeonPhysics["mechanisms"][number];
type XYZ = [number, number, number];

const mesh = (
  parent: T.Group,
  geometry: T.BufferGeometry,
  material: T.Material,
  at: XYZ,
) => {
  const piece = new T.Mesh(geometry, material);
  piece.position.set(...at);
  piece.castShadow = piece.receiveShadow = true;
  parent.add(piece);
  return piece;
};
const plastic = (color: number) =>
  new T.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.08 });
const oval = (
  parent: T.Group,
  material: T.Material,
  at: XYZ,
  size: XYZ,
  detail = 12,
) => {
  const piece = mesh(
    parent,
    new T.SphereGeometry(1, detail, Math.max(6, detail - 2)),
    material,
    at,
  );
  piece.scale.set(...size);
  return piece;
};
const link = (
  parent: T.Group,
  material: T.Material,
  start: XYZ,
  end: XYZ,
  base: number,
  tip: number,
) => {
  const a = new T.Vector3(...start), b = new T.Vector3(...end);
  const at = a.clone().lerp(b, 0.5);
  const piece = mesh(
    parent,
    new T.CylinderGeometry(tip, base, a.distanceTo(b), 10),
    material,
    [at.x, at.y, at.z],
  );
  piece.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    b.sub(a).normalize(),
  );
  return piece;
};

/** Harbour pelican, twice the truck: white body, orange bill and pouch. */
export function buildPelican(root: T.Group) {
  const feather = plastic(0xece7db);
  const shade = plastic(0xcfc8b8);
  const billMat = plastic(0xf2a54a);
  const pouchMat = plastic(0xe07856);
  const legMat = plastic(0x6b6259);
  const ivory = plastic(0xffedb0);
  const black = plastic(0x191127);
  const legs = new T.Group();
  root.add(legs);
  for (const side of [-1, 1]) {
    link(legs, legMat, [side * 0.7, 0, -0.3], [side * 0.7, 1.7, -0.3], 0.2, 0.16);
    const foot = mesh(legs, new T.BoxGeometry(0.9, 0.18, 1.5), legMat, [
      side * 0.7, 0.1, 0.15,
    ]);
    foot.rotation.y = side * 0.2;
  }
  const bodyG = new T.Group();
  root.add(bodyG);
  oval(bodyG, feather, [0, 3.2, -0.5], [2.2, 1.9, 3.2], 16);
  oval(bodyG, ivory, [0, 2.7, 1.4], [1.5, 1.2, 1.4], 12);
  const tail = mesh(bodyG, new T.ConeGeometry(1.1, 2.6, 8), shade, [0, 3.9, -3.9]);
  tail.rotation.x = -1.9;
  const neck = new T.Group();
  neck.position.set(0, 4.0, 1.8);
  neck.rotation.order = "YXZ";
  bodyG.add(neck);
  link(neck, feather, [0, 0, 0], [0, 1.2, 0.6], 0.75, 0.6);
  const head = new T.Group();
  head.position.set(0, 1.2, 0.6);
  neck.add(head);
  oval(head, feather, [0, 0.1, 0], [0.85, 0.8, 0.95], 12);
  const crest = mesh(head, new T.ConeGeometry(0.35, 1.1, 6), shade, [0, 0.75, -0.7]);
  crest.rotation.x = -0.9;
  for (const side of [-1, 1]) {
    oval(head, ivory, [side * 0.68, 0.3, 0.35], [0.2, 0.26, 0.24], 8);
    oval(head, black, [side * 0.8, 0.3, 0.42], [0.1, 0.14, 0.12], 8);
  }
  // Upper bill: tapered 4-sided prism, hook nailing the tip.
  const upper = mesh(head, new T.CylinderGeometry(0.14, 0.5, 4.6, 4), billMat, [0, -0.1, 2.9]);
  upper.rotation.x = Math.PI / 2;
  upper.rotation.y = Math.PI / 4;
  const hook = mesh(head, new T.ConeGeometry(0.16, 0.5, 6), billMat, [0, -0.28, 5.15]);
  hook.rotation.x = Math.PI;
  const billLower = new T.Group();
  billLower.position.set(0, -0.35, 0.6);
  head.add(billLower);
  const lower = mesh(billLower, new T.BoxGeometry(0.5, 0.14, 4.4), billMat, [0, 0, 2.2]);
  lower.rotation.y = 0;
  oval(billLower, pouchMat, [0, -0.55, 2.4], [0.75, 0.65, 2.2], 10);
  const billTip = new T.Group();
  billTip.position.set(0, -0.1, 5.3);
  head.add(billTip);
  const wings: Record<"L" | "R", T.Group> = {
    L: new T.Group(),
    R: new T.Group(),
  };
  ([
    ["L", -1],
    ["R", 1],
  ] as const).forEach(([key, side]) => {
    const wing = wings[key];
    wing.position.set(side * 1.9, 3.9, 0);
    bodyG.add(wing);
    link(wing, feather, [0, 0, 0.2], [side * 2.2, 0.3, 0.4], 0.42, 0.3);
    const membrane = mesh(wing, new T.BoxGeometry(4.6, 0.14, 2.1), feather, [side * 3.4, 0.25, -0.3]);
    membrane.rotation.y = side * -0.12;
    for (let f = 0; f < 3; f++)
      mesh(wing, new T.BoxGeometry(1.8, 0.1, 0.5), shade, [
        side * (5.6 + f * 0.35),
        0.2 - f * 0.06,
        -0.9 + f * 0.55,
      ]).rotation.y = side * -0.25;
  });
  return { bodyG, legs, neck, head, billLower, billTip, wingL: wings.L, wingR: wings.R };
}

export function posePelican(
  model: ReturnType<typeof buildPelican>,
  root: T.Group,
  pel: NonNullable<Mech["pelican"]>,
  now: number,
  aimPitch = 0,
) {
  const bite = pel.bite;
  const elapsed = bite ? now - bite.started : 0;
  const pose = pelicanPose(elapsed);
  root.position.set(pel.pos.x, pel.pos.y, pel.pos.z);
  root.rotation.y = pel.yaw + (bite ? bite.turn * pose.turn : 0);
  let spread = 0;
  if (pel.phase === "fly") spread = 1;
  else if (pel.phase === "takeoff")
    spread = Math.min(1, (now - pel.phaseT) / PELICAN.takeoff);
  else if (pel.phase === "land")
    spread = 1 - Math.min(1, (now - pel.phaseT) / PELICAN.land);
  const flap = Math.sin(now * 9) * 0.5 * spread;
  model.wingL.rotation.set(0, -1.3 * (1 - spread), -(0.15 + flap));
  model.wingR.rotation.set(0, 1.3 * (1 - spread), 0.15 + flap);
  model.legs.rotation.x = -1.15 * spread;
  const bend = aimPitch * pose.lunge;
  model.bodyG.rotation.x = 0.12 * spread + bend * 0.3;
  model.bodyG.position.y = bite ? 0 : Math.sin(now * 2.2) * 0.12 * (1 - spread);
  model.neck.rotation.x = bend * 0.5;
  model.head.rotation.x = bend * 0.3;
  model.head.position.z = 0.6 + pose.lunge * 1.6;
  model.head.rotation.y = bite ? 0 : Math.sin(now * 0.9) * 0.4 * (1 - spread);
  model.billLower.rotation.x = 0.06 + pose.open * 0.85;
}

const CHAIN_LINKS = 10;

/** Deck anchor with a live chain: coiled toward the road, then hooked to the truck. */
export function buildAnchor(root: T.Group) {
  const iron = plastic(0x3a4148);
  const rust = plastic(0x8e5a2e);
  link(root, iron, [0, 0, 0], [0, 4.4, 0], 0.3, 0.26);
  mesh(root, new T.BoxGeometry(3.2, 0.4, 0.4), iron, [0, 3.6, 0]);
  mesh(root, new T.BoxGeometry(1.2, 0.5, 1.2), iron, [0, 0.25, 0]);
  for (const side of [-1, 1]) {
    link(root, iron, [0, 0.4, 0], [side * 1.7, 1.7, 0], 0.26, 0.2);
    const fluke = mesh(root, new T.ConeGeometry(0.55, 1.1, 4), iron, [side * 1.85, 2.1, 0]);
    fluke.rotation.z = side * -0.5;
    fluke.rotation.y = Math.PI / 4;
  }
  const ring = mesh(root, new T.TorusGeometry(0.55, 0.13, 8, 18), iron, [0, 4.75, 0]);
  ring.rotation.y = 0;
  for (const y of [1.2, 2.9])
    mesh(root, new T.CylinderGeometry(0.34, 0.34, 0.3, 10), rust, [0, y, 0]);
  const links: T.Mesh[] = [];
  const linkGeo = new T.TorusGeometry(0.3, 0.11, 6, 12);
  for (let i = 0; i < CHAIN_LINKS; i++) {
    const piece = mesh(root, linkGeo, iron, [0, -10, 0]);
    piece.userData.animate = true;
    links.push(piece);
  }
  return { links };
}

/** Stretch the chain links between two root-local points. */
export function layAnchorChain(
  model: ReturnType<typeof buildAnchor>,
  from: XYZ,
  to: XYZ,
) {
  const a = new T.Vector3(...from), b = new T.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length() || 1;
  dir.divideScalar(len);
  const up = new T.Vector3(0, 1, 0);
  model.links.forEach((piece, i) => {
    const t = (i + 0.5) / model.links.length;
    piece.position.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
    piece.quaternion.setFromUnitVectors(up, dir);
    piece.rotateY((i % 2) * (Math.PI / 2));
  });
}

/** Departing ferry: hull, deck, rails, wheelhouse, containers, mast and flag. */
export function buildShip(root: T.Group) {
  const hullMat = plastic(0x33454f);
  const stripeMat = plastic(0x8e3b2f);
  const deckMat = plastic(0x8a6b48);
  const railMat = plastic(0xe8e4da);
  const cabinMat = plastic(0xf2efe6);
  const glassMat = plastic(0x1d2b36);
  const stackMat = plastic(0x2b2f36);
  const bandMat = plastic(0xf2a54a);
  const mastMat = plastic(0x5c4a36);
  const flagMat = new T.MeshBasicMaterial({ color: 0xf2772e, side: T.DoubleSide });
  const box = (w: number, h: number, d: number, mat: T.Material, at: XYZ) =>
    mesh(root, new T.BoxGeometry(w, h, d), mat, at);
  // Hull below the deck, waterline stripe, pyramid bow. The hull top sits
  // below the deck and the deck inside the hull walls: no coplanar faces.
  box(SHIP.w, 5.6, SHIP.d, hullMat, [0, 1, 0]);
  box(SHIP.w + 0.4, 1, SHIP.d + 0.4, stripeMat, [0, 0.2, 0]);
  const bow = mesh(root, new T.ConeGeometry(SHIP.w / 2, 10, 4), hullMat, [0, 1, SHIP.d / 2 + 4]);
  bow.rotation.x = Math.PI / 2;
  bow.scale.set(1, 1, 0.25);
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++)
      mesh(root, new T.CylinderGeometry(0.5, 0.5, 0.3, 10), glassMat, [
        side * (SHIP.w / 2 + 0.05),
        2.2,
        -20 + i * 8,
      ]).rotation.z = Math.PI / 2;
  // Deck, rails, wheelhouse, stack, cargo.
  box(SHIP.w - 0.4, SHIP.deckH, SHIP.d - 0.4, deckMat, [0, SHIP.deckY - SHIP.deckH / 2, 0]);
  for (const side of [-1, 1]) {
    box(SHIP.railT, SHIP.railH, SHIP.d, railMat, [
      side * (SHIP.w / 2 - SHIP.railT / 2),
      SHIP.deckY + SHIP.railH / 2,
      0,
    ]);
  }
  box(SHIP.w, SHIP.railH, SHIP.railT, railMat, [
    0,
    SHIP.deckY + SHIP.railH / 2,
    SHIP.d / 2 - SHIP.railT / 2,
  ]);
  const cb = SHIP.cabin;
  box(cb.w, cb.h, cb.d, cabinMat, [cb.x, SHIP.deckY + cb.h / 2, cb.z]);
  box(cb.w + 0.2, 1, cb.d * 0.7, glassMat, [cb.x, SHIP.deckY + cb.h - 0.8, cb.z]);
  box(cb.w * 0.5, 0.4, cb.d * 0.6, stackMat, [cb.x, SHIP.deckY + cb.h + 0.2, cb.z]);
  mesh(root, new T.CylinderGeometry(1, 1.2, 4, 12), stackMat, [cb.x - 1.5, SHIP.deckY + cb.h + 2, cb.z - 0.5]);
  mesh(root, new T.CylinderGeometry(1.18, 1.18, 0.8, 12), bandMat, [cb.x - 1.5, SHIP.deckY + cb.h + 3.2, cb.z - 0.5]);
  const cg = SHIP.cargo;
  const cargoMats = [plastic(0xc25a3a), plastic(0x3a7dc2), plastic(0x4da64d), plastic(0xd9a13b)];
  for (const side of [-1, 1])
    for (let j = 0; j < 5; j++)
      box(cg.w, 2.6, 7.6, cargoMats[(j + (side > 0 ? 2 : 0)) % cargoMats.length], [
        side * cg.x,
        SHIP.deckY + 1.3,
        cg.z - cg.d / 2 + 4 + j * 8,
      ]);
  // Mast + stern flag, clear of the driving lane.
  link(root, mastMat, [9, SHIP.deckY, 20], [9, SHIP.deckY + 9, 20], 0.25, 0.18);
  mesh(root, new T.BoxGeometry(0.25, 0.25, 5), mastMat, [9, SHIP.deckY + 7.5, 20]);
  const flag = mesh(root, new T.PlaneGeometry(2.6, 1.6), flagMat, [10.4, SHIP.deckY + 8, 20]);
  flag.rotation.y = Math.PI / 2;
  link(root, mastMat, [-11, SHIP.deckY, -26], [-11, SHIP.deckY + 6, -26], 0.18, 0.12);
  const stern = mesh(root, new T.PlaneGeometry(1.8, 1.1), flagMat, [-10, SHIP.deckY + 5.3, -26]);
  stern.rotation.y = Math.PI / 2;
  return {};
}
