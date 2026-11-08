import * as T from "three";
import type { DinosaurKind } from "./custom-level";
import { DINOSAUR_BITE, DINOSAUR_LUNGE, dinosaurPose } from "./dungeon-hazards";

const palette = {
  raptor: [0x6c36cb, 0x346eff],
  pterosaur: [0xffac32, 0xff478e],
  spinosaurus: [0x239354, 0x8dd846],
  "ember-wyvern": [0xc42530, 0x8736b9],
};
type XYZ = [number, number, number];

/** Toy-like plastic figures. The body and feet stay fixed while the head snaps. */
export function buildDinosaur(root: T.Group, kind: DinosaurKind) {
  const plastic = (color: number) =>
    new T.MeshStandardMaterial({ color, roughness: 0.31, metalness: 0.12 });
  const [skin, accent] = palette[kind].map(plastic);
  const ivory = plastic(0xffedb0), black = plastic(0x191127);
  const ball = new T.SphereGeometry(1, 14, 10);
  const mesh = (parent: T.Group, geometry: T.BufferGeometry, material: T.Material, at: XYZ) => {
    const piece = new T.Mesh(geometry, material);
    piece.position.set(...at);
    piece.castShadow = piece.receiveShadow = true;
    parent.add(piece);
    return piece;
  };
  const oval = (parent: T.Group, material: T.Material, at: XYZ, size: XYZ) => {
    const piece = mesh(parent, ball.clone(), material, at);
    piece.scale.set(...size);
    return piece;
  };
  const link = (parent: T.Group, material: T.Material, start: XYZ, end: XYZ, base: number, tip: number) => {
    const a = new T.Vector3(...start), b = new T.Vector3(...end);
    const at = a.clone().lerp(b, 0.5);
    const piece = mesh(parent, new T.CylinderGeometry(tip, base, a.distanceTo(b), 12), material, [at.x, at.y, at.z]);
    piece.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.sub(a).normalize());
    return piece;
  };
  const winged = kind === "pterosaur" || kind === "ember-wyvern";
  const low = kind === "spinosaurus";
  const trunk = low ? 1.35 : 2.15;
  const { height, reach } = DINOSAUR_BITE[kind];
  // Strike rig: the body hunches forward over planted feet while the tail
  // counter-rotates upward; the neck and head then pitch down at the truck.
  const body = new T.Group();
  body.position.set(0, trunk - 0.8, -0.55);
  body.rotation.order = "YXZ";
  root.add(body);
  const tail = new T.Group();
  tail.position.set(0, 0.8, -0.75);
  body.add(tail);
  const trunkMesh = oval(root, skin, [0, trunk, -0.4], [1.12, 0.99, low ? 2.05 : 1.5]);
  const bellyMesh = oval(root, accent, [0, trunk - 0.43, 0.22], [0.86, 0.55, 1.28]);
  const tailBase = link(root, skin, [0, trunk, -1.3], [0.25, trunk - 0.55, -3.6], 0.78, 0.4);
  const tailTip = link(root, skin, [0.25, trunk - 0.55, -3.6], [0.72, trunk - 0.33, -5.2], 0.4, 0.02);
  body.attach(trunkMesh);
  body.attach(bellyMesh);
  tail.attach(tailBase);
  tail.attach(tailTip);
  for (const side of [-1, 1]) {
    oval(root, skin, [side * 0.9, trunk - 0.46, -0.64], [0.6, 0.76, 0.73]);
    link(root, skin, [side * 0.95, trunk - 0.4, -0.77], [side * 1.18, 0.27, -0.91], 0.45, 0.29);
    oval(root, accent, [side * 1.19, 0.22, -0.56], [0.43, 0.23, 0.74]);
    for (let toe = -1; toe <= 1; toe++)
      oval(root, ivory, [side * 1.19 + toe * 0.21, 0.15, 0.05], [0.085, 0.095, 0.2]);
    if (!winged) {
      const arm = link(root, skin, [side * 0.74, trunk + 0.2, 0.7], [side * 1.06, trunk - 0.48, 1.36], 0.32, 0.18);
      const forearm = oval(root, accent, [side * 1.08, trunk - 0.47, 1.4], [0.25, 0.17, 0.45]);
      body.attach(arm);
      body.attach(forearm);
    } else {
      const outline = new T.Shape([
        new T.Vector2(0, 0.95), new T.Vector2(side * 2.15, 1.3),
        new T.Vector2(side * 5.6, -1), new T.Vector2(side * 2.7, -0.84),
        new T.Vector2(side * 1.4, -1.8), new T.Vector2(0, -0.75),
      ]);
      const membrane = new T.ExtrudeGeometry(outline, { depth: 0.16, bevelEnabled: false }).rotateX(Math.PI / 2);
      const wing = mesh(root, membrane, accent, [side * 0.65, trunk + 0.52, 0]);
      wing.rotation.z = side * 0.22;
      const sparNear = link(root, skin, [side * 0.6, trunk + 0.5, 0.95], [side * 2.7, trunk + 0.98, 1.25], 0.26, 0.17);
      const sparFar = link(root, skin, [side * 2.7, trunk + 0.98, 1.25], [side * 6, trunk + 1.6, -0.95], 0.17, 0.03);
      body.attach(wing);
      body.attach(sparNear);
      body.attach(sparFar);
    }
  }
  if (low) {
    const sail = new T.Shape([
      new T.Vector2(-4.1, 1.5), new T.Vector2(-2.8, 2.5), new T.Vector2(-1.6, 4.2),
      new T.Vector2(-0.4, 4.55), new T.Vector2(0.6, 3.75), new T.Vector2(1.3, 2),
    ]);
    const sailMesh = mesh(root, new T.ExtrudeGeometry(sail, { depth: 0.26, bevelEnabled: false }).rotateY(-Math.PI / 2), accent, [0.13, 0, 0]);
    body.attach(sailMesh);
  } else if (!winged) {
    for (let i = 0; i < 4; i++) {
      const fin = mesh(root, new T.ConeGeometry(0.44, 1.04 - i * 0.13, 4), accent, [0, 3.29 - i * 0.15, -0.55 - i * 0.68]);
      fin.rotation.x = -0.32;
      body.attach(fin);
    }
  }

  const neck = new T.Group(), head = new T.Group(), jaw = new T.Group();
  body.add(neck);
  neck.position.set(0, 0.8, 0.95);
  neck.rotation.order = "YXZ";
  const headY = height - trunk;
  const neckBone = link(neck, skin, [0, 0, 0], [0, headY, 1.55], 0.87, 0.66);
  neck.add(head);
  head.position.set(0, headY, 1.25);
  const muzzle = reach - 1.65;
  oval(head, skin, [0, 0.37, 0.54], [0.83, 0.79, 1.01]);
  if (winged) {
    link(head, skin, [0, 0.16, 0.75], [0, 0.04, muzzle + 0.15], 0.58, 0.045);
    link(head, accent, [0, 0.67, 0.15], [0, 1.8, -1.42], 0.42, 0.025);
  } else {
    oval(head, skin, [0, 0.17, (muzzle + 0.44) / 2], [low ? 0.79 : 0.66, 0.38, (muzzle - 0.12) / 2]);
  }
  head.add(jaw);
  jaw.position.set(0, -0.16, 0.42);
  if (winged) {
    link(jaw, accent, [0, -0.1, 0], [0, 0.04, muzzle - 0.27], 0.44, 0.03);
  } else {
    oval(jaw, accent, [0, -0.12, (muzzle - 0.42) / 2], [0.6, 0.25, (muzzle - 0.42) / 2]);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const tooth = mesh(head, new T.ConeGeometry(0.105, 0.33, 7), ivory, [side * 0.53, -0.16, 0.88 + i * 0.31]);
        tooth.rotation.z = Math.PI;
      }
    }
  }
  for (const side of [-1, 1]) {
    oval(head, ivory, [side * 0.73, 0.51, 0.84], [0.17, 0.24, 0.23]);
    oval(head, black, [side * 0.86, 0.51, 0.9], [0.08, 0.13, 0.11]);
    oval(head, black, [side * 0.39, 0.37, muzzle - 0.35], [0.12, 0.072, 0.14]);
  }
  ball.dispose();
  return { neck, neckBone, head, jaw, body, tail };
}

/** Downward aim from a perched head to its target; never aims up. */
export function dinosaurAimPitch(headY: number, targetY: number, dist: number) {
  return Math.max(0, Math.min(1.0, Math.atan2(headY - targetY, Math.max(0.001, dist))));
}

export function poseDinosaur(
  model: ReturnType<typeof buildDinosaur>, elapsed: number, turn: number, aimPitch = 0,
) {
  const pose = dinosaurPose(elapsed);
  // The chomp rides the lunge envelope: it commits as the head extends and
  // relaxes as the envelope decays, so the return is smooth by construction.
  // Pivot weights sum to 1, aiming the muzzle aimPitch below horizontal.
  const bend = aimPitch * pose.lunge;
  model.body.rotation.x = bend * 0.45;
  model.tail.rotation.x = bend * 0.35;
  model.neck.rotation.y = turn * pose.turn;
  model.neck.rotation.x = bend * 0.35;
  model.head.rotation.x = bend * 0.2;
  const extension = DINOSAUR_LUNGE * pose.lunge;
  model.head.position.z = 1.25 + extension;
  const height = model.head.position.y;
  const length = 1.55 + extension;
  model.neckBone.position.z = length / 2;
  model.neckBone.rotation.x = Math.atan2(length, height);
  model.neckBone.scale.y = Math.hypot(height, length) / Math.hypot(height, 1.55);
  model.jaw.rotation.x = 0.06 + pose.open * 0.71;
}
