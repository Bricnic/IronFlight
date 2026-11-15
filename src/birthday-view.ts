import * as T from "three";
import {
  BIRTHDAY_CANDLE,
  BIRTHDAY_CARD,
  BOUNCY_CASTLE,
  birthdayCardCycle,
  birthdayCardOpenness,
  birthdayCardTelegraphing,
  type DungeonHazard,
} from "./dungeon-hazards";
import type { DungeonPhysics } from "./dungeon-physics";
import type { Simulation } from "./simulation";

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
  new T.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1 });

/** Tall striped birthday candle on a dish; the flame pivot flickers in the view. */
export function buildBirthdayCandle(root: T.Group) {
  const dishMat = plastic(0x3a3f45);
  const waxMat = plastic(0xf6f2ea);
  const stripeMat = plastic(0xff5f8f);
  const wickMat = plastic(0x14100b);
  const h = BIRTHDAY_CANDLE.height;
  const r = BIRTHDAY_CANDLE.radius;
  mesh(root, new T.CylinderGeometry(0.9, 1.0, 0.18, 24), dishMat, [0, -h / 2 + 0.09, 0]);
  mesh(root, new T.CylinderGeometry(r, r * 1.1, h, 20), waxMat, [0, 0, 0]);
  // Spiral-look stripes: thin stacked rings up the stick.
  for (let i = 0; i < 6; i++) {
    const ring = mesh(
      root,
      new T.TorusGeometry(r + 0.01, 0.055, 8, 20),
      i % 2 ? waxMat : stripeMat,
      [0, -h / 2 + 0.35 + i * 0.32, 0],
    );
    ring.rotation.x = Math.PI / 2;
  }
  mesh(root, new T.CylinderGeometry(0.03, 0.03, 0.16, 8), wickMat, [0, h / 2 + 0.06, 0]);
  const flame = new T.Group();
  flame.position.set(0, h / 2 + 0.36, 0);
  const outer = new T.Mesh(
    new T.ConeGeometry(0.19, 0.55, 12),
    new T.MeshBasicMaterial({ color: 0xff7a1a }),
  );
  outer.userData.animate = true;
  const core = new T.Mesh(
    new T.SphereGeometry(0.1, 12, 10),
    new T.MeshBasicMaterial({ color: 0xffe9a8 }),
  );
  core.position.y = -0.11;
  core.userData.animate = true;
  flame.add(outer, core);
  flame.userData.base = 1;
  root.add(flame);
  return [flame];
}

/** Helium balloon: glossy envelope, knot, and a live string to the hooked part. */
export function buildBalloon(root: T.Group) {
  const envelope = new T.Group();
  root.add(envelope);
  const skin = new T.MeshStandardMaterial({
    color: 0xff4f6d,
    roughness: 0.25,
    metalness: 0.05,
  });
  const bandMat = plastic(0xf6f2ea);
  const knotMat = plastic(0xb03a48);
  const bulb = mesh(envelope, new T.SphereGeometry(2.2, 28, 22), skin, [0, 0, 0]);
  bulb.scale.set(1, 1.2, 1);
  const band = mesh(envelope, new T.TorusGeometry(1.85, 0.16, 10, 28), bandMat, [0, 0.6, 0]);
  band.rotation.x = Math.PI / 2;
  const knot = mesh(envelope, new T.ConeGeometry(0.35, 0.7, 12), knotMat, [0, -2.9, 0]);
  knot.rotation.x = Math.PI;
  const string = mesh(
    root,
    new T.CylinderGeometry(0.035, 0.035, 1, 6),
    plastic(0xe8e0d0),
    [0, -6, 0],
  );
  string.userData.animate = true;
  return { envelope, string };
}

/** Giant greeting card: base plate, hinged biting lid, landing telegraph ring. */
export function buildBirthdayCard(root: T.Group) {
  const stock = plastic(0xf6ecd8);
  const trimMat = plastic(0xff5f8f);
  const goldMat = plastic(0xe8b53a);
  const w = BIRTHDAY_CARD.w, d = BIRTHDAY_CARD.d, baseH = BIRTHDAY_CARD.baseH;
  mesh(root, new T.BoxGeometry(w, baseH, d), stock, [0, baseH / 2, 0]);
  // Pink border trim around the base top.
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(w, 0.08, 0.5), trimMat, [0, baseH + 0.02, side * (d / 2 - 0.25)]);
    mesh(root, new T.BoxGeometry(0.5, 0.08, d), trimMat, [side * (w / 2 - 0.25), baseH + 0.02, 0]);
  }
  // Confetti dots scattered on the base (deterministic layout).
  const confetti = [0xff5f8f, 0x4fa8ff, 0x6fe07a, 0xe8b53a];
  for (let i = 0; i < 12; i++) {
    const cx = -4.5 + (i % 4) * 3 + ((i * 37) % 10) / 10;
    const cz = -4 + Math.floor(i / 4) * 3.4 + ((i * 53) % 10) / 12;
    mesh(
      root,
      new T.CylinderGeometry(0.22, 0.22, 0.1, 10),
      plastic(confetti[i % confetti.length]),
      [cx, baseH + 0.03, cz],
    );
  }
  // Hinge knuckles along the back edge.
  for (const hx of [-4, 0, 4]) {
    const knuckle = mesh(
      root,
      new T.CylinderGeometry(0.35, 0.35, 1.8, 12),
      trimMat,
      [hx, baseH + 0.3, d / 2],
    );
    knuckle.rotation.z = Math.PI / 2;
  }
  // Lower teeth jutting forward from the front lip; the lid carries the upper row.
  const toothMat = plastic(0xffffff);
  for (let i = 0; i < 7; i++) {
    const tooth = mesh(
      root,
      new T.ConeGeometry(0.4, 0.9, 4),
      toothMat,
      [(i - 3) * 1.5, baseH - 0.05, -d / 2 - 0.2],
    );
    tooth.rotation.x = -Math.PI / 2;
  }
  // Hinged lid, mirroring the chomp-book jaw: pivot at the back edge, panel
  // reaching forward over the base. rotation.x = openness * 1.12.
  const lid = new T.Group();
  lid.position.set(0, baseH + BIRTHDAY_CARD.lidH / 2, d / 2 - 1);
  root.add(lid);
  const panel = mesh(
    lid,
    new T.BoxGeometry(w, BIRTHDAY_CARD.lidH, d),
    stock,
    [0, 0, -(d / 2 - 1)],
  );
  panel.userData.animate = true;
  const art = new T.Mesh(
    new T.PlaneGeometry(w - 1.2, d - 1.2),
    new T.MeshStandardMaterial({ map: birthdayCardTexture(), roughness: 0.6 }),
  );
  art.rotation.x = -Math.PI / 2;
  art.position.set(0, BIRTHDAY_CARD.lidH / 2 + 0.02, -(d / 2 - 1));
  art.castShadow = art.receiveShadow = true;
  art.userData.animate = true;
  lid.add(art);
  for (let i = 0; i < 7; i++) {
    const tooth = mesh(
      lid,
      new T.ConeGeometry(0.4, 0.9, 4),
      toothMat,
      [(i - 3) * 1.5 + 0.75, 0, -(d / 2 - 1) - d / 2 - 0.2],
    );
    tooth.rotation.x = -Math.PI / 2;
    tooth.userData.animate = true;
  }
  for (const sx of [-5, 5]) {
    const star = mesh(
      lid,
      new T.SphereGeometry(0.35, 10, 8),
      goldMat,
      [sx, BIRTHDAY_CARD.lidH / 2 + 0.2, -(d / 2 - 1)],
    );
    star.userData.animate = true;
  }
  // Landing telegraph: red ring at the upcoming spot, hidden when idle.
  const marker = new T.Group();
  const ring = new T.Mesh(
    new T.RingGeometry(BIRTHDAY_CARD.kill - 0.8, BIRTHDAY_CARD.kill, 48),
    new T.MeshBasicMaterial({ color: 0xff2a2a, side: T.DoubleSide, transparent: true, opacity: 0.9 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.userData.animate = true;
  const disc = new T.Mesh(
    new T.CircleGeometry(BIRTHDAY_CARD.kill - 0.8, 48),
    new T.MeshBasicMaterial({ color: 0xff2a2a, side: T.DoubleSide, transparent: true, opacity: 0.22 }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -0.02;
  disc.userData.animate = true;
  marker.add(ring, disc);
  marker.visible = false;
  root.add(marker);
  return { lid, marker };
}

/** Inflatable bouncy pad: striped mattress, bumper rim, corner turrets. Static. */
export function buildBouncyCastle(root: T.Group, scale = 1) {
  const size = BOUNCY_CASTLE.size * scale;
  const stripeA = plastic(0xff5f8f);
  const stripeB = plastic(0xf6f2ea);
  const rimMat = plastic(0x4fa8ff);
  const turretMat = plastic(0xe8b53a);
  mesh(root, new T.BoxGeometry(size, 1, size), stripeB, [0, 0.5, 0]);
  // Alternating stripes across the mattress top.
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    mesh(
      root,
      new T.BoxGeometry(size, 0.12, size / bands),
      i % 2 ? stripeB : stripeA,
      [0, 1.03, -size / 2 + (size / bands) * (i + 0.5)],
    );
  }
  // Puffy bumper rim around the edge.
  const rim = 0.8;
  for (const side of [-1, 1]) {
    mesh(root, new T.BoxGeometry(size + rim * 2, 1.2, rim), rimMat, [0, 0.6, side * (size / 2 + rim / 2)]);
    mesh(root, new T.BoxGeometry(rim, 1.2, size + rim * 2), rimMat, [side * (size / 2 + rim / 2), 0.6, 0]);
  }
  // Corner turrets with cone caps.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (size / 2 + rim / 2), z = sz * (size / 2 + rim / 2);
      mesh(root, new T.CylinderGeometry(0.9, 1.1, 3.2, 14), turretMat, [x, 2.2, z]);
      mesh(root, new T.ConeGeometry(1.2, 1.6, 14), stripeA, [x, 4.6, z]);
    }
  }
  return {};
}

/** Lid artwork; stub-safe (fillRect/fillText only, like the dungeon labels). */
function birthdayCardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffd9e8";
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "#ff5f8f";
  ctx.fillRect(0, 0, 512, 36);
  ctx.fillRect(0, 476, 512, 36);
  ctx.fillRect(0, 0, 36, 512);
  ctx.fillRect(476, 0, 36, 512);
  const dots: [string, number, number][] = [
    ["#4fa8ff", 90, 120], ["#6fe07a", 200, 90], ["#e8b53a", 320, 120],
    ["#4fa8ff", 420, 200], ["#6fe07a", 100, 400], ["#e8b53a", 410, 400],
  ];
  for (const [color, x, y] of dots) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 14, y - 14, 28, 28);
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#b03a48";
  ctx.font = "bold 64px sans-serif";
  ctx.fillText("HAPPY", 256, 230);
  ctx.fillText("BIRTHDAY!", 256, 300);
  ctx.font = "bold 30px sans-serif";
  ctx.fillStyle = "#7a4a12";
  ctx.fillText("MIND THE LANDING", 256, 360);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export function poseBirthdayCard(
  model: ReturnType<typeof buildBirthdayCard>,
  root: T.Group,
  mech: Mech | undefined,
  h: DungeonHazard,
  sim: Simulation,
) {
  const c = mech?.card;
  const pos = c?.pos ?? { x: h.x, z: h.z };
  root.position.set(pos.x, h.y ?? 0, pos.z);
  root.rotation.y = h.yaw ?? 0;
  const sc = h.scale ?? 1;
  root.scale.setScalar(sc);
  const shifted = sim.time + h.phase;
  model.lid.rotation.x = birthdayCardOpenness(shifted) * 1.12;
  const tele =
    birthdayCardTelegraphing(shifted) &&
    c !== undefined &&
    c.done !== birthdayCardCycle(shifted) &&
    c.next !== undefined;
  model.marker.visible = tele;
  if (tele && c?.next) {
    model.marker.position.set(
      (c.next.x - pos.x) / sc,
      0.15,
      (c.next.z - pos.z) / sc,
    );
    const pulse = 1 + 0.06 * Math.sin(sim.time * 10);
    model.marker.scale.set(pulse, 1, pulse);
  }
}

export function poseBalloon(
  model: ReturnType<typeof buildBalloon>,
  root: T.Group,
  mech: Mech | undefined,
  sim: Simulation,
  now: number,
) {
  const body = mech?.body;
  if (body) {
    const t = body.translation();
    root.position.set(t.x, t.y, t.z);
  }
  const b = mech?.balloon;
  const popped = b?.popped === true;
  model.envelope.visible = !popped;
  model.string.visible = !popped;
  if (popped || !b) return;
  // Idle sway around the authored yaw; the haul keeps the envelope steady overhead.
  root.rotation.y = (mech?.h.yaw ?? 0) + (b.hooked ? 0 : Math.sin(now * 0.8) * 0.3);
  model.envelope.rotation.z = b.hooked ? 0 : Math.sin(now * 1.1) * 0.06;
  // String spans the knot to the hooked part, or hangs coiled when idle.
  root.updateMatrixWorld(true);
  const hook = b.hooked && mech ? sim.dungeon.balloonHookWorld(mech) : undefined;
  const from = new T.Vector3(0, -3.1, 0);
  const to = hook
    ? root.worldToLocal(new T.Vector3(hook.x, hook.y, hook.z))
    : new T.Vector3(Math.sin(now * 1.3) * 0.8, -9, Math.cos(now * 0.9) * 0.8);
  const dir = to.clone().sub(from);
  const len = Math.max(0.01, dir.length());
  model.string.position.copy(from).addScaledVector(dir, 0.5);
  model.string.scale.set(1, len, 1);
  model.string.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
}
