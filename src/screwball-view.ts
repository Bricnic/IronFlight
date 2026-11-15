import * as T from "three";
import { MAILBOX, SPEED_TUBE, TEETER } from "./dungeon-hazards";
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
  new T.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1 });

/** Straight glass speed tube with orange end rings. */
export function buildSpeedTube(root: T.Group) {
  const shellGeo = new T.CylinderGeometry(
    SPEED_TUBE.radius,
    SPEED_TUBE.radius,
    SPEED_TUBE.length,
    24,
    1,
    true,
  );
  shellGeo.rotateX(Math.PI / 2);
  const shell = new T.Mesh(
    shellGeo,
    new T.MeshStandardMaterial({
      color: 0xbfe6ff,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.3,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  shell.castShadow = false;
  shell.receiveShadow = true;
  root.add(shell);
  const ringMat = plastic(0xf2772e);
  for (const end of [-1, 1]) {
    const ring = mesh(
      root,
      new T.TorusGeometry(SPEED_TUBE.radius + 0.2, 0.45, 10, 28),
      ringMat,
      [0, 0, (end * SPEED_TUBE.length) / 2],
    );
    ring.rotation.y = 0;
  }
  return {};
}

/** Checkered automated teeter-totter deck; the root follows the body. */
export function buildTeeterTotter(root: T.Group) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const cw = 16, chh = 16;
  for (let x = 0; x < 8; x++)
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = (x + y) % 2 ? "#f2f0ea" : "#14171c";
      ctx.fillRect(x * cw, y * chh, cw, chh);
    }
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  const deck = mesh(
    root,
    new T.BoxGeometry(TEETER.w, TEETER.h, TEETER.d),
    new T.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.05 }),
    [0, 0, 0],
  );
  deck.name = "teeter-deck";
  return {};
}

type MailboxDebris = { mesh: T.Mesh; vel: T.Vector3; spin: T.Vector3 };

/** Killer mailbox: post box on a post, hinged door, parcel prop, debris set. */
export function buildMailbox(root: T.Group) {
  const bodyMat = plastic(0x2b4a6f);
  const darkMat = plastic(0x141c26);
  const flagMat = plastic(0xd23b2e);
  const intact = new T.Group();
  root.add(intact);
  mesh(intact, new T.BoxGeometry(0.6, 2.2, 0.6), darkMat, [0, 1.1, 0]);
  mesh(intact, new T.BoxGeometry(3, 2.6, 4.4), bodyMat, [0, 3.2, 0]);
  const roofGeo = new T.CylinderGeometry(1.5, 1.5, 4.4, 14, 1, false, 0, Math.PI);
  roofGeo.rotateX(Math.PI / 2);
  roofGeo.rotateY(Math.PI / 2);
  mesh(intact, roofGeo, bodyMat, [0, 4.5, 0]);
  const flagPole = mesh(intact, new T.CylinderGeometry(0.07, 0.07, 2.2, 6), flagMat, [1.4, 5.2, -1]);
  flagPole.rotation.z = 0;
  mesh(intact, new T.BoxGeometry(0.12, 0.7, 1.1), flagMat, [1.4, 6.1, -0.6]);
  // Door hinged at the bottom front; starts swung open, slams on posting.
  const doorPivot = new T.Group();
  doorPivot.position.set(0, 2.1, 2.25);
  intact.add(doorPivot);
  const door = mesh(doorPivot, new T.BoxGeometry(2.6, 2.2, 0.18), bodyMat, [0, 1.1, 0]);
  door.name = "mailbox-door";
  doorPivot.rotation.x = 1.5;
  mesh(intact, new T.BoxGeometry(2.4, 2.0, 0.1), darkMat, [0, 3.2, 2.15]);
  mesh(intact, new T.BoxGeometry(1.1, 0.5, 0.3), flagMat, [0, 5.6, 1.2]);
  // Parcel prop: brown box with tape cross, scaled in around the shrink victim.
  const parcel = new T.Group();
  const boxMat = plastic(0xa97c4f);
  const tapeMat = plastic(0xe8e0d0);
  mesh(parcel, new T.BoxGeometry(2.2, 2.2, 2.2), boxMat, [0, 0, 0]);
  mesh(parcel, new T.BoxGeometry(2.3, 0.4, 2.3), tapeMat, [0, 0, 0]);
  mesh(parcel, new T.BoxGeometry(0.4, 2.3, 2.3), tapeMat, [0, 0, 0]);
  parcel.visible = false;
  root.add(parcel);
  // Explosion debris: panels that burst ballistically on a fixed script.
  const debris: MailboxDebris[] = [];
  const chunks: [T.BufferGeometry, XYZ][] = [
    [new T.BoxGeometry(2.6, 2.2, 0.18), [0, 3.2, 2.3]],
    [new T.BoxGeometry(3, 2.6, 0.3), [-1.6, 3, -2.2]],
    [new T.BoxGeometry(3, 2.6, 0.3), [1.6, 3, -2.2]],
    [new T.CylinderGeometry(1.5, 1.5, 2.2, 10), [0, 4.5, -1]],
    [new T.BoxGeometry(0.6, 2.2, 0.6), [0, 1.1, 0]],
  ];
  chunks.forEach(([geo, at], i) => {
    const piece = mesh(root, geo, i % 2 ? darkMat : bodyMat, at);
    piece.visible = false;
    piece.userData.animate = true;
    piece.userData.home = [at[0], at[1], at[2]] as XYZ;
    const a = (i * Math.PI * 2) / chunks.length;
    debris.push({
      mesh: piece,
      vel: new T.Vector3(Math.cos(a) * 7, 7 + (i % 3) * 1.5, Math.sin(a) * 7),
      spin: new T.Vector3(i * 1.3 + 2, i * 0.7 + 1, i * 1.1 + 3),
    });
  });
  // Explosion flash: fireball sphere plus spark cones, same recipe as the
  // carousel traps. Pure geometry so the blast reads on any renderer.
  const burst = new T.Group();
  burst.position.set(0, 3.2, 0);
  burst.visible = false;
  root.add(burst);
  const flash = new T.MeshBasicMaterial({
    color: 0xffb626,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  mesh(burst, new T.SphereGeometry(1.8, 24, 16), flash, [0, 0, 0]);
  for (let j = 0; j < 10; j++) {
    const spark = mesh(burst, new T.ConeGeometry(0.3, 3, 12), flash, [
      Math.sin(j * 2.4) * 2,
      Math.cos(j * 1.8) * 2,
      Math.cos(j * 2.4) * 2,
    ]);
    spark.rotation.set(j, j * 2.4, j * 1.8);
  }
  return { intact, doorPivot, parcel, debris, burst };
}

/** Parcel flight arc shared by physics (body) and view (prop). */
export function parcelArc(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  e: number,
) {
  const mid = {
    x: (from.x + to.x) / 2,
    y: Math.max(from.y, to.y) + 4,
    z: (from.z + to.z) / 2,
  };
  const a = {
    x: from.x + (mid.x - from.x) * e,
    y: from.y + (mid.y - from.y) * e,
    z: from.z + (mid.z - from.z) * e,
  };
  const b = {
    x: mid.x + (to.x - mid.x) * e,
    y: mid.y + (to.y - mid.y) * e,
    z: mid.z + (to.z - mid.z) * e,
  };
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, z: a.z + (b.z - a.z) * e };
}

export function poseMailbox(
  model: ReturnType<typeof buildMailbox>,
  root: T.Group,
  h: { x: number; y?: number; z: number; yaw?: number },
  mb: NonNullable<Mech["mailbox"]> | undefined,
  now: number,
) {
  const baseY = h.y ?? 0;
  if (mb?.started === undefined) {
    model.intact.visible = true;
    model.parcel.visible = false;
    model.burst.visible = false;
    model.doorPivot.rotation.x = 1.5;
    root.rotation.z = 0;
    for (const d of model.debris) d.mesh.visible = false;
    return;
  }
  const t = now - mb.started;
  const to = { x: h.x, y: baseY + 3.5, z: h.z };
  if (t >= MAILBOX.explode) {
    model.intact.visible = false;
    model.parcel.visible = false;
    root.rotation.z = 0;
    const dt = t - MAILBOX.explode;
    model.burst.visible = dt < 0.9;
    model.burst.scale.setScalar(1 + Math.max(0, dt) * 3);
    for (const d of model.debris) {
      d.mesh.visible = true;
      const home = d.mesh.userData.home as XYZ;
      d.mesh.position.set(
        home[0] + d.vel.x * dt,
        Math.max(0.3, home[1] + d.vel.y * dt - 16 * dt * dt),
        home[2] + d.vel.z * dt,
      );
      d.mesh.rotation.set(
        d.spin.x * dt,
        d.spin.y * dt,
        d.spin.z * dt,
      );
    }
    return;
  }
  // Shrink, then the parcel flight, the slam, and the tense shake.
  const e =
    t < MAILBOX.shrink
      ? 0
      : (() => {
          const k = Math.min(1, (t - MAILBOX.shrink) / (MAILBOX.fly - MAILBOX.shrink));
          return k * k * (3 - 2 * k);
        })();
  const arc = parcelArc(mb.carFrom, to, e);
  const yaw = h.yaw ?? 0;
  model.parcel.visible = t >= MAILBOX.shrink * 0.75;
  const grow = t < MAILBOX.shrink ? Math.max(0.01, t / MAILBOX.shrink) : 1;
  model.parcel.scale.setScalar(grow);
  model.parcel.position.set(arc.x - h.x, arc.y - baseY, arc.z - h.z);
  model.parcel.position.applyAxisAngle(new T.Vector3(0, 1, 0), -yaw);
  model.doorPivot.rotation.x = t >= MAILBOX.fly ? 0 : 1.5;
  root.rotation.z =
    t >= MAILBOX.fly && t < MAILBOX.explode ? Math.sin(t * 40) * 0.02 : 0;
}
