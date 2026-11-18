import * as T from "three";
import {
  BIRTHDAY_CAKES,
  BIRTHDAY_CANDLE,
  BIRTHDAY_CARD,
  BOUNCY_CASTLE,
  birthdayCardCycle,
  birthdayCardOpenness,
  birthdayCardTelegraphing,
  mulberry32,
  type BirthdayCakeKind,
  type DungeonHazard,
} from "./dungeon-hazards";
import type { DungeonPhysics } from "./dungeon-physics";
import type { Simulation } from "./simulation";
import { pbr } from "./materials";

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

/** Shared cake palette, mirrored in visual-plan/cake-visual-target.md. */
export const CAKE_PALETTE = {
  spongeChocolate: 0x6b3a1e,
  spongePink: 0xff7fa8,
  icingWhite: 0xfff6f0,
  dripPink: 0xff5f9e,
  mint: 0x63d9b5,
  cherry: 0xe02040,
  stemChocolate: 0x4a2410,
} as const;

/** Speckled sponge crumb; stub-safe (fillRect/fillStyle only). */
function cakeCrumbTexture(base: string, crumb: string, seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  const rnd = mulberry32(seed);
  ctx.fillStyle = crumb;
  for (let i = 0; i < 900; i++)
    ctx.fillRect(Math.floor(rnd() * 256), Math.floor(rnd() * 256), 2, 2);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(10, 2);
  return tex;
}

/** Scalloped icing drip skirt hanging over a tier rim; DoubleSide. */
function dripSkirt(r: number, h: number, drips: number, phase: number) {
  const steps = drips * 8;
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const ro = r + 0.3;
  const top = h + 0.06;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const w = Math.pow(0.5 + 0.5 * Math.sin(a * drips + phase), 1.6);
    const bottom = top - (1.3 + 2.1 * w);
    const c = Math.cos(a), s = Math.sin(a);
    positions.push(ro * c, top, ro * s, ro * c, bottom, ro * s);
    uvs.push((i / steps) * drips, 1, (i / steps) * drips, 0);
    if (i < steps) {
      const b = i * 2;
      index.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/**
 * Shared birthday cake centerpiece builder: lathe-profiled sponge tiers with
 * flat drivable tops, scalloped icing drips, sprinkles, and a cherry topper.
 * Tier radii/heights come from BIRTHDAY_CAKES, so the visuals match the
 * static cylinder colliders exactly; only sub-unit icing trim (drip skirt,
 * wall bead, sprinkles) sits outside the collider shells.
 */
export function buildBirthdayCake(root: T.Group, kind: BirthdayCakeKind) {
  const spec = BIRTHDAY_CAKES[kind];
  const spongeChoc = new T.MeshStandardMaterial({
    map: cakeCrumbTexture("#6b3a1e", "#4a2410", 11),
    roughness: 0.75,
  });
  const spongePink = new T.MeshStandardMaterial({
    map: cakeCrumbTexture("#ff7fa8", "#e85d8a", 23),
    roughness: 0.7,
  });
  const icing = new T.MeshPhysicalMaterial({
    map: pbr("marble_01", 6).map,
    color: CAKE_PALETTE.icingWhite,
    roughness: 0.32,
    clearcoat: 0.5,
    clearcoatRoughness: 0.4,
  });
  const dripPink = new T.MeshPhysicalMaterial({
    color: CAKE_PALETTE.dripPink,
    roughness: 0.35,
    clearcoat: 0.5,
    clearcoatRoughness: 0.4,
    side: T.DoubleSide,
  });
  const dripWhite = new T.MeshPhysicalMaterial({
    color: CAKE_PALETTE.icingWhite,
    roughness: 0.32,
    clearcoat: 0.5,
    clearcoatRoughness: 0.4,
    side: T.DoubleSide,
  });
  const bead = plastic(CAKE_PALETTE.mint);
  const sprinkles = [0xff5f9e, 0x63d9b5, 0x4fa8ff, 0xffd23b, 0xffffff].map((c) =>
    plastic(c),
  );
  const cherryMat = new T.MeshPhysicalMaterial({
    color: CAKE_PALETTE.cherry,
    roughness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
  });
  const stemMat = plastic(CAKE_PALETTE.stemChocolate);
  const leafMat = plastic(0x2f9e5f);

  let base = 0;
  spec.tiers.forEach((tier, ti) => {
    const { r, h } = tier;
    const radial = Math.max(96, Math.round(r * 3));
    const sponge = ti % 2 === 0 ? spongeChoc : spongePink;
    const drip = ti % 2 === 0 ? dripWhite : dripPink;
    // Exact cylinder match: sharp profile corners, flat top cap at local h.
    // The drip skirt hides the rim; the icing sheet covers the cap.
    const body = new T.Mesh(
      new T.LatheGeometry(
        [
          new T.Vector2(0, 0),
          new T.Vector2(r, 0),
          new T.Vector2(r, h),
          new T.Vector2(0, h),
        ],
        radial,
      ),
      sponge,
    );
    body.position.y = base;
    body.castShadow = body.receiveShadow = true;
    root.add(body);
    const sheet = mesh(
      root,
      new T.CircleGeometry(r - 0.4, radial),
      icing,
      [0, base + h + 0.04, 0],
    );
    sheet.rotation.x = -Math.PI / 2;
    const drips = Math.max(12, Math.round((2 * Math.PI * r) / 5));
    const phase = ti * 1.3 + (kind === "birthday-cake-table" ? 0.7 : 0);
    const skirt = mesh(root, dripSkirt(r, h, drips, phase), drip, [0, base, 0]);
    skirt.castShadow = false;
    // Rounded tips on the longest drips.
    const tipGeo = new T.SphereGeometry(0.6, 8, 6);
    for (let k = 0; k < drips; k++) {
      const a = ((3 * Math.PI) / 2 - phase + k * 2 * Math.PI) / drips;
      mesh(root, tipGeo, drip, [
        (r + 0.3) * Math.cos(a),
        base + h + 0.06 - 3.4 + 0.3,
        (r + 0.3) * Math.sin(a),
      ]);
    }
    // Piped mint bead on the wall, clear of the driving surface.
    const ring = mesh(
      root,
      new T.TorusGeometry(r + 0.1, 0.3, 10, radial),
      bead,
      [0, base + h - 0.4, 0],
    );
    ring.rotation.x = Math.PI / 2;
    // Flat sprinkles scattered on the icing sheet (deterministic layout).
    const rnd = mulberry32(ti * 7919 + 13);
    const count = Math.round(r * 1.1);
    const sprinkleGeo = new T.BoxGeometry(0.55, 0.16, 0.2);
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * (r - 3);
      const s = mesh(root, sprinkleGeo, sprinkles[i % sprinkles.length], [
        Math.cos(a) * rr,
        base + h + 0.14,
        Math.sin(a) * rr,
      ]);
      s.rotation.y = rnd() * Math.PI;
    }
    base += h;
  });
  // Cherry topper: the stem matches its collider exactly; the cherry ball
  // clears truck roofs so only the stem needs to collide.
  const topY = base;
  mesh(
    root,
    new T.CylinderGeometry(spec.stemR, spec.stemR, spec.stemH, 24),
    stemMat,
    [0, topY + spec.stemH / 2, 0],
  );
  mesh(root, new T.SphereGeometry(2.6, 32, 24), cherryMat, [0, topY + spec.stemH + 1.9, 0]);
  const leaf = mesh(
    root,
    new T.SphereGeometry(0.9, 12, 8),
    leafMat,
    [1.1, topY + spec.stemH + 4.1, 0.4],
  );
  leaf.scale.set(1.4, 0.25, 0.7);
  leaf.rotation.y = 0.6;
  return { topY };
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
