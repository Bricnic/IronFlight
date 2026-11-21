import * as T from "three";
import { BAT, MOTH } from "./dungeon-hazards";
import { applyNightGlow, makeGlowTexture } from "./course-view";
import type { DungeonPhysics } from "./dungeon-physics";
import { MUSHROOM } from "./mushroom-shape";

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
  new T.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 });
const glowMat = (color: number, emissive: number, day: number, night: number, roughness = 0.35) => {
  const mat = new T.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: day,
    roughness,
  });
  mat.userData.nightGlow = { day, night };
  return mat;
};
/** Additive halo sprite; driven by applyNightGlow like lamp posts. */
const halo = (parent: T.Group, color: number, scale: number, at: XYZ, opacity = 0.85) => {
  const sprite = new T.Sprite(
    new T.SpriteMaterial({
      map: makeGlowTexture(),
      color,
      blending: T.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity,
    }),
  );
  sprite.name = "lamp-glow";
  sprite.raycast = () => {};
  sprite.scale.set(scale, scale, 1);
  sprite.position.set(...at);
  sprite.visible = false;
  parent.add(sprite);
  return sprite;
};

/** Giant caterpillar: 8 fleshy segments, bristles, glowing warning spots. */
export function buildCaterpillar(root: T.Group) {
  const hide = plastic(0x4a6b3a);
  const belly = plastic(0x7a9b4a);
  const spotMat = glowMat(0x1a3a2a, 0x80ec27, 0.5, 1.8);
  const segments: T.Group[] = [];
  for (let i = 0; i < 8; i++) {
    const seg = new T.Group();
    seg.position.set(0, 1.5, 4.5 - i * 1.3);
    root.add(seg);
    const ball = mesh(seg, new T.SphereGeometry(1.15 - i * 0.04, 20, 14), i % 2 ? belly : hide, [0, 0, 0]);
    ball.scale.set(1, 0.9, 1.1);
    ball.userData.animate = true;
    const spot = mesh(seg, new T.SphereGeometry(0.28, 10, 8), spotMat, [0, 0.95, 0]);
    spot.scale.set(1, 0.5, 1);
    spot.userData.animate = true;
    for (const side of [-1, 1]) {
      const leg = mesh(seg, new T.ConeGeometry(0.16, 0.8, 6), belly, [side * 1.0, -0.9, 0]);
      leg.rotation.z = side * 0.5;
      leg.userData.animate = true;
      const bristle = mesh(seg, new T.ConeGeometry(0.06, 0.7, 5), hide, [side * 0.7, 0.9, 0.3]);
      bristle.rotation.z = side * -0.4;
      bristle.userData.animate = true;
    }
    segments.push(seg);
  }
  const head = new T.Group();
  head.position.set(0, 1.7, 5.9);
  root.add(head);
  const skull = mesh(head, new T.SphereGeometry(1.0, 18, 12), hide, [0, 0, 0]);
  skull.userData.animate = true;
  const eyeMat = glowMat(0x331100, 0xffaa22, 0.6, 1.6);
  for (const side of [-1, 1]) {
    const eye = mesh(head, new T.SphereGeometry(0.22, 10, 8), eyeMat, [side * 0.45, 0.35, 0.75]);
    eye.userData.animate = true;
    const fang = mesh(head, new T.ConeGeometry(0.14, 0.7, 6), belly, [side * 0.3, -0.6, 0.6]);
    fang.rotation.x = Math.PI;
    fang.userData.animate = true;
  }
  halo(root, 0x4ff5e0, 4, [0, 2.5, 0], 0.5);
  return { segments, head };
}

export function poseCaterpillar(
  model: ReturnType<typeof buildCaterpillar>,
  root: T.Group,
  hy: number,
  cat: NonNullable<Mech["caterpillar"]>,
  now: number,
  night: boolean,
) {
  root.position.set(cat.pos.x, hy, cat.pos.z);
  root.rotation.y = cat.yaw;
  // Peristaltic crawl ripple from tail to head.
  model.segments.forEach((seg, i) => {
    const w = Math.sin(now * 6 - i * 0.9);
    seg.position.y = 1.5 + w * 0.18;
    seg.scale.set(1 + w * 0.06, 1 - w * 0.06, 1);
  });
  model.head.position.y = 1.7 + Math.sin(now * 6 + 0.9) * 0.15;
  model.head.rotation.x = Math.sin(now * 3) * 0.1;
  applyNightGlow(root, night);
}

/** Dust moth: fuzzy body, broad flapping wings, glowing dust glands. */
export function buildMoth(root: T.Group) {
  const fur = plastic(0x6b5a7a);
  const wingMat = new T.MeshStandardMaterial({
    color: 0x8a7a9a,
    emissive: 0x4a3a6a,
    emissiveIntensity: 0.7,
    roughness: 0.7,
    side: T.DoubleSide,
  });
  wingMat.userData.nightGlow = { day: 0.7, night: 1.6 };
  const dustMat = glowMat(0x2a4a1a, 0x80ec27, 0.6, 2.0);
  const bodyG = new T.Group();
  root.add(bodyG);
  const abdomen = mesh(bodyG, new T.SphereGeometry(0.9, 18, 12), fur, [0, 0, -1.2]);
  abdomen.scale.set(1, 0.9, 1.8);
  abdomen.userData.animate = true;
  const thorax = mesh(bodyG, new T.SphereGeometry(0.8, 18, 12), fur, [0, 0.15, 0.6]);
  thorax.userData.animate = true;
  const gland = mesh(bodyG, new T.SphereGeometry(0.45, 12, 10), dustMat, [0, -0.6, -1.0]);
  gland.userData.animate = true;
  const eyeMat = glowMat(0x110011, 0xff6fe0, 0.6, 1.8);
  for (const side of [-1, 1]) {
    const eye = mesh(bodyG, new T.SphereGeometry(0.25, 12, 10), eyeMat, [side * 0.4, 0.45, 1.2]);
    eye.userData.animate = true;
    const feeler = mesh(bodyG, new T.CylinderGeometry(0.03, 0.06, 1.4, 6), fur, [side * 0.25, 0.9, 1.3]);
    feeler.rotation.x = -0.5;
    feeler.rotation.z = side * 0.3;
    feeler.userData.animate = true;
  }
  const wings: T.Group[] = [];
  for (const side of [-1, 1]) {
    const wing = new T.Group();
    wing.position.set(side * 0.6, 0.3, 0.2);
    bodyG.add(wing);
    const panel = mesh(wing, new T.SphereGeometry(1.9, 20, 12), wingMat, [side * 1.8, 0, -0.3]);
    panel.scale.set(1.15, 0.08, 0.85);
    panel.userData.animate = true;
    const tip = mesh(wing, new T.SphereGeometry(0.5, 12, 10), dustMat, [side * 3.4, 0, -0.6]);
    tip.userData.animate = true;
    wings.push(wing);
  }
  halo(bodyG, 0x80ec27, 5, [0, -1, -1], 0.55);
  // Falling-mote and ground-pile pools, synced from sim state each frame.
  const motes: T.Sprite[] = [];
  for (let i = 0; i < 8; i++) {
    const sprite = new T.Sprite(
      new T.SpriteMaterial({
        map: makeGlowTexture(),
        color: 0x80ec27,
        blending: T.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
      }),
    );
    sprite.raycast = () => {};
    sprite.scale.set(1.6, 1.6, 1);
    sprite.visible = false;
    root.add(sprite);
    motes.push(sprite);
  }
  const piles: T.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const pile = new T.Mesh(
      new T.CircleGeometry(2.2, 20),
      new T.MeshBasicMaterial({
        color: 0x80ec27,
        transparent: true,
        opacity: 0.5,
        blending: T.AdditiveBlending,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    pile.rotation.x = -Math.PI / 2;
    pile.raycast = () => {};
    pile.visible = false;
    root.add(pile);
    piles.push(pile);
  }
  return { bodyG, wings, motes, piles };
}

export function poseMoth(
  model: ReturnType<typeof buildMoth>,
  root: T.Group,
  h: { x: number; y?: number; z: number },
  mo: NonNullable<Mech["moth"]>,
  now: number,
  night: boolean,
) {
  const groundY = h.y ?? 0;
  // Root rides the moth like the spider root; pools hang off it in root space.
  root.position.set(mo.pos.x, mo.pos.y, mo.pos.z);
  root.rotation.y = mo.yaw;
  model.bodyG.position.set(0, Math.sin(now * 3) * 0.3, 0);
  const flap = Math.sin(now * 10) * 0.7;
  model.wings[0].rotation.z = flap;
  model.wings[1].rotation.z = -flap;
  // World-to-root under the root's own yaw (matrixWorld is stale at pose time).
  const c = Math.cos(mo.yaw), s = Math.sin(mo.yaw);
  const place = (o: T.Object3D, x: number, y: number, z: number) => {
    const dx = x - mo.pos.x, dz = z - mo.pos.z;
    o.position.set(dx * c - dz * s, y - mo.pos.y, dx * s + dz * c);
  };
  model.motes.forEach((sprite, i) => {
    const mote = mo.motes[i];
    sprite.visible = !!mote;
    if (mote) place(sprite, mote.x, mote.y, mote.z);
  });
  model.piles.forEach((pile, i) => {
    const state = mo.piles[i];
    pile.visible = !!state;
    if (state) {
      place(pile, state.x, groundY + 0.15, state.z);
      const age = Math.max(0, Math.min(1, (state.until - now) / MOTH.pileLife));
      (pile.material as T.MeshBasicMaterial).opacity = 0.15 + 0.45 * age;
      const s = 0.6 + 0.4 * (1 - age);
      pile.scale.set(s, s, 1);
    }
  });
  applyNightGlow(root, night);
}

/** Cave bat: hangs upside down perched; unfolds to flee. */
export function buildBat(root: T.Group) {
  const hide = plastic(0x3a2a4a);
  hide.transparent = true;
  const wingMat = new T.MeshStandardMaterial({
    color: 0x5a4a6a,
    roughness: 0.7,
    side: T.DoubleSide,
    transparent: true,
  });
  const bodyG = new T.Group();
  root.add(bodyG);
  // Hanging: feet grip above, head dangles below.
  const body = mesh(bodyG, new T.SphereGeometry(0.45, 16, 12), hide, [0, -0.5, 0]);
  body.scale.set(1, 1.3, 1);
  body.userData.animate = true;
  const head = mesh(bodyG, new T.SphereGeometry(0.32, 14, 10), hide, [0, -1.15, 0.1]);
  head.userData.animate = true;
  const eyeMat = glowMat(0x220022, 0xff44ff, 0.6, 2.0);
  eyeMat.transparent = true;
  for (const side of [-1, 1]) {
    const eye = mesh(bodyG, new T.SphereGeometry(0.09, 8, 6), eyeMat, [side * 0.15, -1.1, 0.35]);
    eye.userData.animate = true;
    const ear = mesh(bodyG, new T.ConeGeometry(0.12, 0.4, 6), hide, [side * 0.2, -1.5, 0]);
    ear.rotation.x = Math.PI;
    ear.userData.animate = true;
    const foot = mesh(bodyG, new T.CylinderGeometry(0.05, 0.05, 0.5, 6), hide, [side * 0.15, 0.35, 0]);
    foot.userData.animate = true;
  }
  const wings: T.Group[] = [];
  for (const side of [-1, 1]) {
    const wing = new T.Group();
    wing.position.set(side * 0.35, -0.5, 0);
    bodyG.add(wing);
    const panel = mesh(wing, new T.SphereGeometry(0.9, 14, 8), wingMat, [side * 0.7, -0.3, 0]);
    panel.scale.set(1.1, 1.2, 0.08);
    panel.userData.animate = true;
    // Wing finger spars.
    for (let f = 0; f < 3; f++) {
      const spar = mesh(
        wing,
        new T.CylinderGeometry(0.03, 0.03, 1.4, 5),
        hide,
        [side * (0.5 + f * 0.35), -0.3, 0.02],
      );
      spar.rotation.z = side * (0.5 + f * 0.25);
      spar.userData.animate = true;
    }
    wings.push(wing);
  }
  return { bodyG, wings };
}

export function poseBat(
  model: ReturnType<typeof buildBat>,
  root: T.Group,
  h: { x: number; y?: number; z: number; yaw?: number },
  bat: NonNullable<Mech["bat"]>,
  now: number,
  night: boolean,
) {
  const perchY = h.y ?? 0;
  if (!bat.fled) {
    root.position.set(h.x, perchY, h.z);
    root.rotation.set(0, h.yaw ?? 0, 0);
    // Folded wings + sleepy sway.
    model.wings[0].rotation.z = 0.9 + Math.sin(now * 1.5) * 0.05;
    model.wings[1].rotation.z = -0.9 - Math.sin(now * 1.5) * 0.05;
    model.bodyG.rotation.z = Math.sin(now * 1.1) * 0.06;
  } else {
    // Burst away from the perch, climbing as it flaps.
    const t = now - bat.fledAt;
    const dx = Math.sin(bat.fleeYaw), dz = Math.cos(bat.fleeYaw);
    root.position.set(
      h.x + dx * BAT.fleeSpeed * t,
      perchY + Math.min(14, 1.5 + 6 * t),
      h.z + dz * BAT.fleeSpeed * t,
    );
    root.rotation.set(0, bat.fleeYaw, 0);
    model.bodyG.rotation.z = 0;
    const flap = Math.sin(now * 18) * 0.9;
    model.wings[0].rotation.z = flap;
    model.wings[1].rotation.z = -flap;
    // Fade out after 2s of flight.
    const fade = Math.max(0, Math.min(1, 1 - (t - 1.5) / 2));
    root.traverse((o) => {
      if (o instanceof T.Mesh) {
        const mat = o.material as T.MeshStandardMaterial;
        if (mat.transparent) mat.opacity = fade;
      }
    });
  }
  applyNightGlow(root, night);
}

/** Glow mushroom: spotted cap, gills, stalk; cyan beacon. */
export function buildMushroom(root: T.Group) {
  const stalk = plastic(0xe8dcc8);
  const capMat = glowMat(0x1a5a5a, 0x4ff5e0, 0.3, 1.0, 0.7);
  const spotMat = glowMat(0xd8f8f0, 0xbffff0, 0.25, 0.8);
  const g = new T.Group();
  root.add(g);
  const stem = mesh(g, new T.CylinderGeometry(MUSHROOM.stemTopRadius, MUSHROOM.stemBottomRadius, MUSHROOM.stemHeight, 14), stalk, [0, MUSHROOM.stemHeight / 2, 0]);
  stem.userData.animate = true;
  const ring = mesh(g, new T.TorusGeometry(0.5, 0.12, 8, 16), stalk, [0, 1.4, 0]);
  ring.rotation.x = Math.PI / 2;
  ring.userData.animate = true;
  const cap = mesh(g, new T.SphereGeometry(MUSHROOM.capRadius, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), capMat, [0, MUSHROOM.capY, 0]);
  cap.userData.animate = true;
  const gills = mesh(g, new T.CylinderGeometry(MUSHROOM.gillRadius, MUSHROOM.gillRadius, MUSHROOM.gillHeight, 20), stalk, [0, MUSHROOM.gillY, 0]);
  gills.userData.animate = true;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const spot = mesh(
      g,
      new T.SphereGeometry(0.22 - (i % 3) * 0.04, 8, 6),
      spotMat,
      [Math.cos(a) * 0.95, 2.75 + (i % 2) * 0.25, Math.sin(a) * 0.95],
    );
    spot.scale.set(1, 0.6, 1);
    spot.userData.animate = true;
  }
  halo(g, 0x4ff5e0, 5, [0, 2.6, 0], 0.6);
  return { top: 3.4 };
}

export function poseMushroom(
  _model: ReturnType<typeof buildMushroom>,
  root: T.Group,
  h: { x: number; y?: number; z: number; yaw?: number },
  now: number,
  night: boolean,
) {
  void now;
  root.position.set(h.x, h.y ?? 0, h.z);
  root.rotation.y = h.yaw ?? 0;
  applyNightGlow(root, night);
}

/** Cave fairy: tiny glowing sprite-winged wanderer. */
export function buildFairy(root: T.Group) {
  const skin = plastic(0xf0d8e8);
  const dressMat = glowMat(0x8a2a6a, 0xff6fe0, 0.5, 1.8);
  const wingMat = new T.MeshBasicMaterial({
    color: 0xffc8f0,
    transparent: true,
    opacity: 0.55,
    blending: T.AdditiveBlending,
    depthWrite: false,
    side: T.DoubleSide,
  });
  const bodyG = new T.Group();
  root.add(bodyG);
  const torso = mesh(bodyG, new T.SphereGeometry(0.22, 12, 10), dressMat, [0, 0, 0]);
  torso.scale.set(0.8, 1.2, 0.8);
  torso.userData.animate = true;
  const head = mesh(bodyG, new T.SphereGeometry(0.16, 12, 10), skin, [0, 0.36, 0]);
  head.userData.animate = true;
  const wings: T.Group[] = [];
  for (const side of [-1, 1]) {
    const wing = new T.Group();
    wing.position.set(side * 0.12, 0.15, -0.05);
    bodyG.add(wing);
    const panel = mesh(wing, new T.SphereGeometry(0.3, 10, 8), wingMat, [side * 0.25, 0.15, 0]);
    panel.scale.set(1, 1.4, 0.1);
    panel.userData.animate = true;
    wings.push(wing);
  }
  const glow = halo(bodyG, 0xff6fe0, 3.0, [0, 0.2, 0], 0.75);
  return { bodyG, wings, glow };
}

export function poseFairy(
  model: ReturnType<typeof buildFairy>,
  root: T.Group,
  h: { x: number; y?: number; z: number; yaw?: number; phase: number },
  now: number,
  night: boolean,
) {
  const baseY = h.y ?? 0;
  // Lazy wandering loop around the placed spot; the root keeps prefab yaw
  // while the body turns along the wander heading.
  root.position.set(
    h.x + Math.sin(now * 0.5 + h.phase) * 3 + Math.sin(now * 1.3 + h.phase * 2) * 0.5,
    baseY + Math.sin(now * 1.7 + h.phase) * 0.8,
    h.z + Math.cos(now * 0.4 + h.phase) * 3,
  );
  root.rotation.y = h.yaw ?? 0;
  model.bodyG.rotation.y = Math.atan2(
    Math.cos(now * 0.5 + h.phase),
    -Math.sin(now * 0.4 + h.phase),
  );
  const flap = Math.sin(now * 22 + h.phase) * 0.8;
  model.wings[0].rotation.z = flap;
  model.wings[1].rotation.z = -flap;
  model.bodyG.position.y = Math.sin(now * 4 + h.phase) * 0.08;
  applyNightGlow(root, night);
}

/** Firefly: gold glow mote on a wandering path. */
export function buildFirefly(root: T.Group) {
  const body = mesh(
    root,
    new T.SphereGeometry(0.12, 8, 6),
    plastic(0x2a2018),
    [0, 0, 0],
  );
  body.userData.animate = true;
  const lampMat = glowMat(0x5a4a1a, 0xffd23b, 0.6, 2.2);
  const lamp = mesh(root, new T.SphereGeometry(0.1, 8, 6), lampMat, [0, -0.05, 0.12]);
  lamp.userData.animate = true;
  const glow = halo(root, 0xffd23b, 1.8, [0, 0, 0], 0.8);
  return { glow };
}

export function poseFirefly(
  model: ReturnType<typeof buildFirefly>,
  root: T.Group,
  h: { x: number; y?: number; z: number; phase: number },
  now: number,
  night: boolean,
) {
  const baseY = h.y ?? 0;
  root.position.set(
    h.x + Math.sin(now * 0.7 + h.phase) * 4 + Math.sin(now * 2.1) * 0.6,
    Math.max(0.5, baseY + Math.sin(now * 1.1 + h.phase * 1.7) * 1.5),
    h.z + Math.cos(now * 0.55 + h.phase) * 4,
  );
  // Blink: slow breathing gate with a fast shimmer.
  const blink = Math.max(0, Math.sin(now * 1.3 + h.phase * 3)) ** 2;
  (model.glow.material as T.SpriteMaterial).opacity = 0.15 + 0.75 * blink;
  applyNightGlow(root, night);
}
