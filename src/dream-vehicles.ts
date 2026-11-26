import * as T from "three";
import { vehicle } from "./themed-vehicles";
import { finish, type XYZ } from "./concept-vehicle-kit";
import type { PartId } from "./damage";
import { sides, door, cream, gold, glow } from "./themed-vehicle-body";

/**
 * Dream cars: one aspirational showpiece per level collection, unlocked by
 * earning a gold medal AND the gold star on that collection's dream level
 * (see src/dream-cars.ts). Kit-built on the standard 4-wheel chassis like
 * every garage car; each carries named animation nodes driven through its
 * `animate` callback from the game view.
 */

export type DreamAnimate = (root: T.Group, time: number, speedMs: number) => void;

type FlameNode = { mesh: T.Mesh; mat: T.MeshStandardMaterial; phase: number };
type TwinkleNode = { mat: T.MeshStandardMaterial; phase: number; base: number };
type SpinnerNode = { node: T.Object3D; base: number; speed: number; axis: "x" | "y" | "z" };

function flamesOf(root: T.Group): FlameNode[] {
  return ((root.userData.dreamFlames ??= []) as FlameNode[]);
}
function twinklesOf(root: T.Group): TwinkleNode[] {
  return ((root.userData.dreamTwinkles ??= []) as TwinkleNode[]);
}
function spinnersOf(root: T.Group): SpinnerNode[] {
  return ((root.userData.dreamSpinners ??= []) as SpinnerNode[]);
}
function bobbersOf(root: T.Group): { node: T.Object3D; baseY: number; phase: number; amp: number }[] {
  return ((root.userData.dreamBobbers ??= []) as { node: T.Object3D; baseY: number; phase: number; amp: number }[]);
}

/** Shared flame-flicker + twinkle + spinner + bob driver. */
export function animateDream(root: T.Group, time: number): void {
  for (const f of flamesOf(root)) {
    const s = 1 + 0.16 * Math.sin(time * 13 + f.phase) * Math.sin(time * 7.3 + f.phase * 2);
    f.mesh.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    f.mat.emissiveIntensity = 1.9 + 0.7 * Math.sin(time * 11 + f.phase);
  }
  for (const t of twinklesOf(root))
    t.mat.emissiveIntensity = t.base * (0.55 + 0.45 * Math.sin(time * 4 + t.phase));
  for (const s of spinnersOf(root)) s.node.rotation[s.axis] = s.base + time * s.speed;
  for (const b of bobbersOf(root))
    b.node.position.y = b.baseY + b.amp * Math.sin(time * 2.2 + b.phase);
}

function flameMaterial(color = 0xffb03a): T.MeshStandardMaterial {
  return new T.MeshStandardMaterial({
    color,
    emissive: 0xff7a1a,
    emissiveIntensity: 2,
    roughness: 0.4,
  });
}

const cakeCruiser = vehicle(
  "cake-cruiser",
  "Cake Cruiser",
  "Two-tier showpiece with live candlepower. Do not eat and drive.",
  [0xf267a7, 0x74dcbc, 0xfff2d7, 0.9, 8],
  (k) => {
    const icing = cream();
    const cherry = finish(0xd21f3c, 0.25, 0.1);
    const chocolate = finish(0x5a2e1a, 0.7, 0);
    // Hood: bottom-tier nose with frosting rim, drips, and a cherry.
    k.mesh("hood", new T.CylinderGeometry(1.12, 1.22, 0.55, 36), [0, 0.18, 1.72], k.paint);
    const rim = k.mesh("hood", new T.TorusGeometry(1.14, 0.09, 14, 48), [0, 0.46, 1.72], icing);
    rim.rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      k.oval("hood", [0.09, 0.16, 0.09], [Math.cos(a) * 1.16, 0.32, 1.72 + Math.sin(a) * 1.16], icing);
    }
    k.mesh("hood", new T.SphereGeometry(0.16, 20, 14), [0.35, 0.55, 1.72], cherry);
    k.bar("hood", [0.35, 0.62, 1.72], [0.42, 0.82, 1.72], 0.02, chocolate);
    // Roof: top tier, plate, and five striped candles with live flames.
    k.mesh("roof", new T.CylinderGeometry(1.05, 1.05, 0.08, 36), [0, 0.78, -0.4], gold());
    k.mesh("roof", new T.CylinderGeometry(0.82, 0.9, 0.5, 36), [0, 1.06, -0.4], icing);
    const rim2 = k.mesh("roof", new T.TorusGeometry(0.84, 0.07, 12, 40), [0, 1.3, -0.4], k.paint);
    rim2.rotation.x = Math.PI / 2;
    const candleSpots: XYZ[] = [[0, 1.31, -0.4], [0.4, 1.31, -0.25], [-0.4, 1.31, -0.25], [0.28, 1.31, -0.72], [-0.28, 1.31, -0.72]];
    candleSpots.forEach(([x, y, z], i) => {
      const stripeA = i % 2 ? k.accent : k.paint;
      const stripeB = i % 2 ? k.paint : icing;
      for (let s = 0; s < 3; s++)
        k.mesh("roof", new T.CylinderGeometry(0.055, 0.055, 0.16, 16), [x, y + 0.08 + s * 0.16, z], s % 2 ? stripeB : stripeA);
      const mat = flameMaterial();
      const flame = k.mesh("roof", new T.ConeGeometry(0.075, 0.26, 14), [x, y + 0.62, z], mat);
      flamesOf(k.root).push({ mesh: flame, mat, phase: i * 1.7 });
    });
    // Doors: frosting panels with candy dots and wafer sticks.
    for (const side of sides) {
      k.panel(door(side), [0.1, 0.62, 2.0], [side * 1.2, 0.28, -0.2], icing);
      for (let i = 0; i < 5; i++)
        k.oval(door(side), [0.06, 0.09, 0.09], [side * 1.27, 0.3, -0.95 + i * 0.38], [k.paint, k.accent, cherry, chocolate, gold()][i]);
      k.bar(door(side), [side * 1.24, 0.62, 0.5], [side * 1.24, 0.62, -0.9], 0.045, chocolate);
    }
    // Bed: gift box with lid and ribbon cross.
    k.mesh("bed", new T.BoxGeometry(1.7, 0.72, 1.5), [0, 0.28, -1.85], k.accent);
    k.mesh("bed", new T.BoxGeometry(1.82, 0.14, 1.62), [0, 0.68, -1.85], k.paint);
    k.mesh("bed", new T.BoxGeometry(0.22, 0.78, 1.56), [0, 0.3, -1.85], icing);
    k.mesh("bed", new T.BoxGeometry(1.76, 0.78, 0.22), [0, 0.3, -1.85], icing);
    k.oval("bed", [0.16, 0.12, 0.16], [0, 0.82, -1.85], cherry);
    // Bumpers: candy-cane striped crash bars.
    for (const [part, z] of [["bumper-front", 2.72], ["bumper-rear", -2.72]] as const) {
      for (let i = 0; i < 7; i++)
        k.mesh(part, new T.CylinderGeometry(0.09, 0.09, 0.3, 14),
          [-0.9 + i * 0.3, 0.1, z], i % 2 ? k.paint : icing)
          .rotateZ(Math.PI / 2);
      k.bar(part, [-1.05, 0.1, z], [1.05, 0.1, z], 0.03, chocolate);
    }
    k.lamp("hood", [0.62, 0.32, 2.28], 0.11);
    k.lamp("hood", [-0.62, 0.32, 2.28], 0.11);
    k.tailLights(-2.66, 0.24);
  },
);

const gingerbreadGlider = vehicle(
  "gingerbread-glider",
  "Gingerbread Glider",
  "Icing-trimmed winter wagon with gumdrop running lights.",
  [0x8a4f2a, 0xf4f6f8, 0xc22e2e, 0.86, 8],
  (k) => {
    const ginger = finish(0x8a4f2a, 0.85, 0);
    const icing = finish(0xf6f9ff, 0.5, 0);
    const gumdrop = [0xe23b6e, 0x2fa36b, 0x2b7de2, 0xf2a007];
    const gumMat = (c: number) =>
      new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2, roughness: 0.35 });
    // Hood: sloped gingerbread nose with icing seams and gumdrop lamps.
    k.mesh("hood", new T.BoxGeometry(1.9, 0.5, 1.3), [0, 0.2, 1.75], ginger);
    k.mesh("hood", new T.BoxGeometry(1.96, 0.08, 1.36), [0, 0.47, 1.75], icing);
    for (const sx of [-0.6, 0.6]) {
      const mat = gumMat(0xffe9a8);
      k.mesh("hood", new T.SphereGeometry(0.13, 18, 12), [sx, 0.28, 2.42], mat);
      twinklesOf(k.root).push({ mat, phase: sx, base: 1.4 });
    }
    // Snowflake hood ornament: three crossed glowing bars.
    const flake = glow(0xbfe3ff);
    for (let i = 0; i < 3; i++) {
      const bar = k.mesh("hood", new T.BoxGeometry(0.5, 0.045, 0.045), [0, 0.62, 1.75], flake);
      bar.rotation.y = (i * Math.PI) / 3;
    }
    k.oval("hood", [0.07, 0.07, 0.07], [0, 0.62, 1.75], flake);
    // Roof: snowdrift humps, mini pine, and chimney.
    for (const [x, z, r] of [[-0.5, -0.5, 0.42], [0.45, -0.35, 0.5], [0, -1.0, 0.38]] as const)
      k.oval("roof", [r, r * 0.55, r], [x, 1.55, z], icing);
    k.mesh("roof", new T.ConeGeometry(0.22, 0.55, 18), [0.62, 1.85, -1.15], finish(0x2e7d46, 0.8, 0));
    k.mesh("roof", new T.ConeGeometry(0.13, 0.3, 18), [0.62, 2.1, -1.15], icing);
    k.mesh("roof", new T.BoxGeometry(0.22, 0.5, 0.22), [-0.62, 1.8, -1.15], ginger);
    k.mesh("roof", new T.BoxGeometry(0.3, 0.08, 0.3), [-0.62, 2.06, -1.15], icing);
    // Doors: ginger panels, icing window frames, gumdrop buttons.
    for (const side of sides) {
      k.panel(door(side), [0.1, 0.66, 2.1], [side * 1.2, 0.3, -0.2], ginger);
      k.mesh(door(side), new T.BoxGeometry(0.06, 0.4, 0.7), [side * 1.26, 0.52, -0.2], icing);
      k.mesh(door(side), new T.BoxGeometry(0.07, 0.28, 0.58), [side * 1.26, 0.52, -0.2], finish(0x9fd4ff, 0.2, 0.4));
      gumdrop.forEach((c, i) => {
        const mat = gumMat(c);
        k.oval(door(side), [0.07, 0.09, 0.09], [side * 1.27, 0.08, -0.8 + i * 0.4], mat);
        twinklesOf(k.root).push({ mat, phase: side * 2 + i * 1.3, base: 1.2 });
      });
    }
    // Bed: cookie tray with stacked cookie wheels.
    k.mesh("bed", new T.BoxGeometry(1.8, 0.1, 1.6), [0, 0.55, -1.85], finish(0x9aa2ad, 0.4, 0.6));
    for (const [x, z] of [[-0.45, -1.6], [0.45, -1.6], [-0.45, -2.1], [0.45, -2.1]] as const) {
      k.mesh("bed", new T.CylinderGeometry(0.22, 0.22, 0.34, 20), [x, 0.76, z], ginger);
      for (let chip = 0; chip < 5; chip++) {
        const a = (chip / 5) * Math.PI * 2;
        k.oval("bed", [0.035, 0.035, 0.035], [x + Math.cos(a) * 0.12, 0.94, z + Math.sin(a) * 0.12], chocolate());
      }
    }
    // Bumpers: candy-cane striped bars with twist caps.
    for (const [part, z] of [["bumper-front", 2.72], ["bumper-rear", -2.72]] as const) {
      for (let i = 0; i < 8; i++)
        k.mesh(part, new T.CylinderGeometry(0.085, 0.085, 0.26, 14),
          [-0.91 + i * 0.26, 0.1, z], i % 2 ? finish(0xc22e2e, 0.5, 0) : icing)
          .rotateZ(Math.PI / 2);
      for (const sx of [-1.08, 1.08])
        k.mesh(part, new T.SphereGeometry(0.11, 16, 12), [sx, 0.1, z], icing);
    }
    k.lamp("hood", [0.62, 0.3, 2.3], 0.1);
    k.lamp("hood", [-0.62, 0.3, 2.3], 0.1);
    k.tailLights(-2.66, 0.24);
  },
);

function chocolate() {
  return finish(0x3a1f12, 0.8, 0);
}

const hauntedHearse = vehicle(
  "haunted-hearse",
  "Haunted Hearse",
  "One-way ride with a ghost passenger who insists on directions.",
  [0x4a2d6e, 0x9a5fe0, 0xc8ccd4, 0.9, 8],
  (k) => {
    const bone = cream();
    const pumpkin = (e = 1.6) =>
      new T.MeshStandardMaterial({ color: 0xe86a17, emissive: 0xc33f00, emissiveIntensity: e, roughness: 0.5 });
    // Hood: long coffin hood with skull ornament and pumpkin lamps.
    k.panel("hood", [1.9, 0.42, 1.9], [0, 0.2, 1.75], k.paint);
    k.mesh("hood", new T.SphereGeometry(0.17, 22, 16), [0, 0.52, 1.75], bone);
    k.oval("hood", [0.05, 0.06, 0.03], [-0.06, 0.54, 1.9], k.dark);
    k.oval("hood", [0.05, 0.06, 0.03], [0.06, 0.54, 1.9], k.dark);
    for (const sx of [-0.62, 0.62]) {
      const mat = pumpkin();
      k.mesh("hood", new T.SphereGeometry(0.16, 20, 14), [sx, 0.3, 2.32], mat);
      k.mesh("hood", new T.CylinderGeometry(0.03, 0.04, 0.1, 10), [sx, 0.45, 2.32], finish(0x2e5d23, 0.8, 0));
      twinklesOf(k.root).push({ mat, phase: sx * 3, base: 1.8 });
    }
    // Roof: landau bars, moon disc, and a bobbing ghost passenger.
    k.bar("roof", [-0.85, 1.05, -0.2], [-0.85, 1.05, -1.4], 0.04, k.accent);
    k.bar("roof", [0.85, 1.05, -0.2], [0.85, 1.05, -1.4], 0.04, k.accent);
    const moon = k.mesh("roof", new T.CylinderGeometry(0.3, 0.3, 0.06, 28), [0, 1.62, -1.5], bone);
    moon.rotation.x = Math.PI / 2;
    const ghostMat = new T.MeshStandardMaterial({
      color: 0xdff4ff, emissive: 0x9fd8ff, emissiveIntensity: 0.9,
      transparent: true, opacity: 0.88, roughness: 0.4,
    });
    const ghost = new T.Group();
    ghost.position.set(0.45, 1.35, -0.55);
    const gHead = new T.Mesh(new T.SphereGeometry(0.2, 22, 16), ghostMat);
    gHead.position.y = 0.22;
    const gBody = new T.Mesh(new T.ConeGeometry(0.2, 0.5, 22), ghostMat);
    gBody.position.y = -0.08;
    const gEye = new T.MeshBasicMaterial({ color: 0x10202e });
    for (const ex of [-0.07, 0.07]) {
      const eye = new T.Mesh(new T.SphereGeometry(0.035, 10, 8), gEye);
      eye.position.set(ex, 0.26, 0.17);
      ghost.add(eye);
    }
    ghost.add(gHead, gBody);
    ghost.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = true;
    });
    k.groups["roof"].add(ghost);
    ghost.position.sub(k.groups["roof"].position);
    bobbersOf(k.root).push({ node: ghost, baseY: ghost.position.y, phase: 0.8, amp: 0.09 });
    // Doors: purple panels, bat wings, arched windows.
    for (const side of sides) {
      k.panel(door(side), [0.1, 0.7, 2.1], [side * 1.2, 0.3, -0.2], k.paint);
      k.mesh(door(side), new T.BoxGeometry(0.06, 0.34, 0.6), [side * 1.26, 0.55, -0.2], finish(0x6fd6e0, 0.2, 0.5));
      for (const wz of [-0.15, 0.35]) {
        const wing = k.mesh(door(side), new T.ConeGeometry(0.16, 0.5, 4), [side * 1.3, 0.42, -1.15 + wz], k.dark);
        wing.rotation.z = side * 0.5;
        wing.rotation.y = Math.PI / 4;
      }
      k.oval(door(side), [0.05, 0.12, 0.12], [side * 1.27, 0.05, -0.2], k.accent);
    }
    // Bed: coffin with lid and gold cross.
    k.mesh("bed", new T.BoxGeometry(1.5, 0.6, 1.7), [0, 0.3, -1.85], finish(0x2b1b3d, 0.6, 0.1));
    k.mesh("bed", new T.BoxGeometry(1.6, 0.12, 1.8), [0, 0.64, -1.85], k.paint);
    k.mesh("bed", new T.BoxGeometry(0.14, 0.1, 0.7), [0, 0.72, -1.85], gold());
    k.mesh("bed", new T.BoxGeometry(0.14, 0.1, 0.7), [0, 0.72, -1.85], gold()).rotateY(Math.PI / 2);
    // Bumpers: tombstone-gray bars with skull studs.
    const stone = finish(0x8d8fa3, 0.75, 0.05);
    for (const [part, z] of [["bumper-front", 2.72], ["bumper-rear", -2.72]] as const) {
      k.mesh(part, new T.BoxGeometry(2.0, 0.22, 0.24), [0, 0.1, z], stone);
      for (let i = 0; i < 5; i++)
        k.mesh(part, new T.SphereGeometry(0.07, 14, 10), [-0.8 + i * 0.4, 0.24, z], bone);
    }
    k.tailLights(-2.66, 0.24);
  },
);

const windupWonder = vehicle(
  "windup-wonder",
  "Windup Wonder",
  "Clockwork toy terror. Key included, mercy not.",
  [0xe23b3b, 0xffc933, 0x2b7de2, 0.8, 6],
  (k) => {
    // Hood: brick stud field.
    k.panel("hood", [1.9, 0.4, 1.8], [0, 0.22, 1.75], k.paint);
    for (let ix = 0; ix < 4; ix++)
      for (let iz = 0; iz < 3; iz++)
        k.mesh("hood", new T.CylinderGeometry(0.09, 0.09, 0.09, 16),
          [-0.6 + ix * 0.4, 0.46, 1.15 + iz * 0.4], k.accent);
    // Roof: giant spinning wind-up key on a chrome stem.
    k.mesh("roof", new T.CylinderGeometry(0.09, 0.11, 0.9, 18), [0, 1.6, -0.6], k.steel);
    const key = new T.Group();
    key.position.set(0, 2.2, -0.6);
    const bowMat = gold();
    for (const sx of [-0.22, 0.22]) {
      const bow = new T.Mesh(new T.TorusGeometry(0.2, 0.055, 14, 32), bowMat);
      bow.position.x = sx;
      bow.castShadow = true;
      key.add(bow);
    }
    const hub = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.5, 14), bowMat);
    hub.rotation.z = Math.PI / 2;
    key.add(hub);
    k.groups["roof"].add(key);
    key.position.sub(k.groups["roof"].position);
    spinnersOf(k.root).push({ node: key, base: 0, speed: 2.2, axis: "y" });
    k.panel("roof", [1.7, 0.18, 1.5], [0, 1.28, -0.5], k.accent);
    // Doors: blue panels with star medallions.
    for (const side of sides) {
      k.panel(door(side), [0.1, 0.66, 2.1], [side * 1.2, 0.3, -0.2], finish(0x2b7de2, 0.45, 0.2));
      k.mesh(door(side), new T.CylinderGeometry(0.3, 0.3, 0.06, 28), [side * 1.26, 0.35, -0.2], k.accent)
        .rotateZ(Math.PI / 2);
      k.mesh(door(side), new T.SphereGeometry(0.1, 14, 10), [side * 1.3, 0.35, -0.2], k.paint);
      k.bar(door(side), [side * 1.22, 0.66, 0.9], [side * 1.22, 0.66, -1.3], 0.035, k.accent);
    }
    // Bed: stacked toy blocks.
    const blockCols = [0x2b7de2, 0x2fa35f, 0xffc933, 0xe23b3b];
    blockCols.forEach((c, i) => {
      const bx = -0.45 + (i % 2) * 0.9, bz = -1.6 - Math.floor(i / 2) * 0.55;
      k.mesh("bed", new T.BoxGeometry(0.8, 0.42, 0.5), [bx, 0.45, bz], finish(c, 0.5, 0.1));
      k.mesh("bed", new T.CylinderGeometry(0.07, 0.07, 0.08, 12), [bx, 0.7, bz], finish(c, 0.5, 0.1));
    });
    // Bumpers: domino bars with pips.
    for (const [part, z] of [["bumper-front", 2.72], ["bumper-rear", -2.72]] as const) {
      k.mesh(part, new T.BoxGeometry(2.0, 0.2, 0.22), [0, 0.1, z], cream());
      for (let i = 0; i < 6; i++)
        k.oval(part, [0.05, 0.05, 0.03], [-0.75 + i * 0.3, 0.1, z + (z > 0 ? 0.12 : -0.12)], k.dark);
    }
    // Dice mirrors on stalks.
    for (const side of sides) {
      k.bar(door(side), [side * 1.15, 0.9, 0.75], [side * 1.45, 1.1, 0.75], 0.03, k.dark);
      const die = k.mesh(door(side), new T.BoxGeometry(0.16, 0.16, 0.16), [side * 1.45, 1.22, 0.75], cream());
      die.rotation.set(0.4, 0.4, 0);
      k.oval(door(side), [0.02, 0.035, 0.035], [side * 1.54, 1.22, 0.75], k.dark);
    }
    k.lamp("hood", [0.62, 0.3, 2.3], 0.1);
    k.lamp("hood", [-0.62, 0.3, 2.3], 0.1);
    k.tailLights(-2.66, 0.24);
  },
);

const loopLauncher = vehicle(
  "loop-launcher",
  "Loop Launcher",
  "Rocket-boosted stunt rig tuned for inverted flight.",
  [0x2456e0, 0xd42a2a, 0xd1a44e, 0.95, 8],
  (k) => {
    const checkerW = cream();
    const checkerB = finish(0x14161a, 0.6, 0.1);
    // Hood: nose cone with checkered stripe and gold trim.
    k.mesh("hood", new T.ConeGeometry(0.55, 1.1, 28), [0, 0.35, 2.2], k.paint).rotateX(Math.PI / 2);
    for (let i = 0; i < 6; i++)
      k.mesh("hood", new T.BoxGeometry(0.28, 0.06, 0.3), [-0.7 + i * 0.28, 0.52, 1.55], i % 2 ? checkerB : checkerW);
    k.bar("hood", [-0.85, 0.5, 1.55], [0.85, 0.5, 1.55], 0.035, gold());
    // Roof: loop-ring spoiler on pylons with a gold star.
    for (const sx of [-0.55, 0.55])
      k.bar("roof", [sx, 1.1, -1.1], [sx, 2.0, -1.1], 0.06, k.dark);
    const loop = k.mesh("roof", new T.TorusGeometry(0.95, 0.11, 18, 56), [0, 2.35, -1.1], k.accent);
    loop.rotation.y = Math.PI / 2;
    k.oval("roof", [0.14, 0.14, 0.14], [0, 3.35, -1.1], gold());
    k.mesh("roof", new T.CylinderGeometry(0.05, 0.05, 0.3, 12), [0, 3.15, -1.1], gold());
    // Doors: star-spangled panels with gold stripes.
    for (const side of sides) {
      k.panel(door(side), [0.1, 0.66, 2.1], [side * 1.2, 0.3, -0.2], k.paint);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        k.oval(door(side), [0.03, 0.05, 0.05],
          [side * 1.26, 0.35 + Math.sin(a) * 0.16, -0.2 + Math.cos(a) * 0.16], checkerW);
      }
      k.oval(door(side), [0.03, 0.07, 0.07], [side * 1.26, 0.35, -0.2], gold());
      k.bar(door(side), [side * 1.24, 0.02, 0.9], [side * 1.24, 0.02, -1.3], 0.04, gold());
      k.bar(door(side), [side * 1.24, 0.68, 0.9], [side * 1.24, 0.68, -1.3], 0.04, gold());
    }
    // Bed: triple rocket exhausts with live flames.
    for (const sx of [-0.5, 0, 0.5]) {
      k.mesh("bed", new T.CylinderGeometry(0.2, 0.24, 0.7, 22), [sx, 0.5, -1.9], k.dark);
      k.mesh("bed", new T.TorusGeometry(0.2, 0.045, 12, 24), [sx, 0.5, -2.26], gold());
      const mat = flameMaterial(0xff8a2a);
      const flame = k.mesh("bed", new T.ConeGeometry(0.14, 0.55, 16), [sx, 0.5, -2.6], mat);
      flame.rotation.x = -Math.PI / 2;
      flamesOf(k.root).push({ mesh: flame, mat, phase: sx * 4 });
    }
    k.mesh("bed", new T.BoxGeometry(1.7, 0.5, 0.5), [0, 0.25, -1.35], k.paint);
    // Bumpers: checkered crash bars.
    for (const [part, z] of [["bumper-front", 2.72], ["bumper-rear", -2.72]] as const) {
      for (let i = 0; i < 8; i++)
        k.mesh(part, new T.BoxGeometry(0.25, 0.2, 0.22), [-0.875 + i * 0.25, 0.1, z], i % 2 ? checkerB : checkerW);
    }
    // Checkered pennant flags on rear poles.
    for (const sx of [-0.8, 0.8]) {
      k.bar("bed", [sx, 0.6, -2.5], [sx, 1.9, -2.5], 0.03, k.steel);
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 3; c++)
          k.mesh("bed", new T.BoxGeometry(0.22, 0.16, 0.02),
            [sx + 0.12 + c * 0.22, 1.72 - r * 0.17, -2.5], (r + c) % 2 ? checkerB : checkerW);
    }
    k.lamp("hood", [0.62, 0.3, 2.1], 0.1);
    k.lamp("hood", [-0.62, 0.3, 2.1], 0.1);
    k.tailLights(-2.66, 0.24);
  },
);

const slagHauler = vehicle(
  "slag-hauler",
  "Slag Hauler",
  "Foundry-fresh crucible carrier. Molten all the way down.",
  [0xb34a1f, 0xf2c200, 0x3a3f45, 1.0, 8],
  (k) => {
    const steel = finish(0x4a5158, 0.45, 0.7);
    const molten = new T.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff4400, emissiveIntensity: 2.2, roughness: 0.35 });
    // Hood: riveted foundry hood.
    k.panel("hood", [1.9, 0.45, 1.9], [0, 0.22, 1.75], k.paint);
    for (let ix = 0; ix < 5; ix++)
      for (const zz of [1.05, 2.45])
        k.mesh("hood", new T.SphereGeometry(0.05, 12, 10), [-0.8 + ix * 0.4, 0.46, zz], steel);
    k.bar("hood", [-0.95, 0.3, 1.75], [0.95, 0.3, 1.75], 0.04, k.accent);
    // Roof: beacon and twin stacks with glowing bands.
    for (const sx of [-0.5, 0.5]) {
      k.mesh("roof", new T.CylinderGeometry(0.11, 0.13, 1.0, 18), [sx, 1.7, -0.9], k.dark);
      const band = new T.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff4400, emissiveIntensity: 1.6, roughness: 0.4 });
      k.mesh("roof", new T.CylinderGeometry(0.12, 0.12, 0.12, 18), [sx, 1.95, -0.9], band);
      twinklesOf(k.root).push({ mat: band, phase: sx * 5, base: 1.8 });
      k.mesh("roof", new T.CylinderGeometry(0.14, 0.14, 0.06, 18), [sx, 2.22, -0.9], steel);
    }
    const beaconMat = new T.MeshStandardMaterial({ color: 0xffc933, emissive: 0xffaa00, emissiveIntensity: 2, roughness: 0.3 });
    k.mesh("roof", new T.CylinderGeometry(0.09, 0.11, 0.22, 16), [0, 1.5, 0.3], beaconMat);
    twinklesOf(k.root).push({ mat: beaconMat, phase: 0, base: 2.2 });
    k.panel("roof", [1.7, 0.16, 1.6], [0, 1.28, -0.5], k.paint);
    // Doors: hazard-striped panels with grab handles.
    for (const side of sides) {
      k.panel(door(side), [0.1, 0.66, 2.1], [side * 1.2, 0.3, -0.2], k.paint);
      for (let i = 0; i < 6; i++)
        k.mesh(door(side), new T.BoxGeometry(0.04, 0.12, 0.3), [side * 1.27, 0.12, -0.85 + i * 0.32],
          i % 2 ? k.dark : k.accent);
      k.bar(door(side), [side * 1.28, 0.5, 0.3], [side * 1.28, 0.5, -0.1], 0.03, steel);
    }
    // Bed: crucible pot with molten top, crane arm, hook and chain.
    k.mesh("bed", new T.CylinderGeometry(0.72, 0.58, 1.0, 32), [0, 0.62, -1.85], steel);
    k.mesh("bed", new T.TorusGeometry(0.68, 0.07, 14, 36), [0, 1.12, -1.85], k.dark).rotation.x = Math.PI / 2;
    k.mesh("bed", new T.CylinderGeometry(0.6, 0.6, 0.07, 32), [0, 1.1, -1.85], molten);
    twinklesOf(k.root).push({ mat: molten, phase: 1.2, base: 2.4 });
    k.bar("bed", [-0.85, 0.3, -1.2], [-0.85, 1.7, -1.2], 0.06, k.accent);
    k.bar("bed", [-0.85, 1.7, -1.2], [0, 1.7, -1.85], 0.05, k.accent);
    for (let i = 0; i < 3; i++)
      k.mesh("bed", new T.TorusGeometry(0.06, 0.018, 8, 16), [0, 1.55 - i * 0.11, -1.85], steel);
    k.mesh("bed", new T.TorusGeometry(0.09, 0.03, 10, 20, Math.PI * 1.5), [0, 1.14, -1.85], steel);
    // Bumpers: heavy steel I-beams with hazard ends.
    for (const [part, z] of [["bumper-front", 2.72], ["bumper-rear", -2.72]] as const) {
      k.mesh(part, new T.BoxGeometry(2.1, 0.26, 0.26), [0, 0.1, z], steel);
      for (const sx of [-0.95, 0.95])
        k.mesh(part, new T.BoxGeometry(0.24, 0.27, 0.27), [sx, 0.1, z], k.accent);
    }
    k.lamp("hood", [0.62, 0.3, 2.3], 0.1);
    k.lamp("hood", [-0.62, 0.3, 2.3], 0.1);
    k.tailLights(-2.66, 0.24);
  },
);

const canyonCamper = vehicle(
  "canyon-camper",
  "Canyon Camper",
  "Roof-tent ranger with a canoe and zero checkout time.",
  [0xc9a06a, 0x3e6b34, 0x5a4a38, 0.95, 8],
  (k) => {
    const canvas = finish(0xe8dcc0, 0.85, 0);
    // Hood: dusty hood with compass inlay.
    k.panel("hood", [1.9, 0.42, 1.9], [0, 0.22, 1.75], k.paint);
    k.mesh("hood", new T.CylinderGeometry(0.16, 0.16, 0.05, 24), [0, 0.46, 1.75], cream());
    k.bar("hood", [-0.09, 0.49, 1.75], [0.09, 0.49, 1.75], 0.02, k.accent);
    k.bar("hood", [0, 0.49, 1.66], [0, 0.49, 1.84], 0.02, k.accent);
    // Roof: rooftop tent with bedroll, rails, and a lantern.
    k.mesh("roof", new T.BoxGeometry(1.5, 0.5, 1.7), [0, 1.45, -0.65], k.accent);
    k.mesh("roof", new T.ConeGeometry(1.0, 0.45, 4), [0, 1.92, -0.65], canvas).rotation.y = Math.PI / 4;
    k.mesh("roof", new T.CylinderGeometry(0.13, 0.13, 1.3, 16), [0, 1.5, 0.42], finish(0xa33d2e, 0.8, 0))
      .rotateX(Math.PI / 2);
    for (const sx of [-0.7, 0.7])
      k.bar("roof", [sx, 1.28, 0.2], [sx, 1.28, -1.5], 0.035, k.dark);
    const lampMat = new T.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc855, emissiveIntensity: 1.6, roughness: 0.4 });
    k.mesh("roof", new T.BoxGeometry(0.14, 0.2, 0.14), [0.82, 1.5, -0.1], k.dark);
    k.mesh("roof", new T.BoxGeometry(0.1, 0.14, 0.1), [0.82, 1.5, -0.1], lampMat);
    twinklesOf(k.root).push({ mat: lampMat, phase: 0.5, base: 1.7 });
    // Doors: green panels, map pocket, side steps.
    for (const side of sides) {
      k.panel(door(side), [0.1, 0.66, 2.1], [side * 1.2, 0.3, -0.2], k.accent);
      k.mesh(door(side), new T.BoxGeometry(0.05, 0.3, 0.44), [side * 1.27, 0.32, -0.2], canvas);
      k.bar(door(side), [side * 1.3, 0.32, -0.32], [side * 1.3, 0.32, -0.08], 0.015, k.dark);
      k.mesh(door(side), new T.BoxGeometry(0.34, 0.07, 1.6), [side * 1.32, -0.12, -0.2], k.dark);
    }
    // Bed: camper shell with windows, canoe on top, spare tire at back.
    k.mesh("bed", new T.BoxGeometry(1.7, 0.75, 1.7), [0, 0.62, -1.85], canvas);
    for (const sx of [-0.45, 0.45])
      k.mesh("bed", new T.BoxGeometry(0.4, 0.3, 0.05), [sx, 0.72, -0.98], finish(0x9fd4ff, 0.2, 0.4));
    const canoe = k.mesh("bed", new T.CapsuleGeometry(0.22, 1.5, 8, 20), [0, 1.2, -1.85], k.accent);
    canoe.rotation.x = Math.PI / 2;
    canoe.scale.x = 1.4;
    k.bar("bed", [-0.5, 1.05, -1.85], [0.5, 1.05, -1.85], 0.03, k.dark);
    k.mesh("bed", new T.TorusGeometry(0.3, 0.12, 14, 28), [0, 0.55, -2.78], k.dark);
    // Bumpers: tube bull bar front, step + jerry can rear.
    k.bar("bumper-front", [-0.9, 0.1, 2.72], [-0.9, 0.75, 2.72], 0.05, k.dark);
    k.bar("bumper-front", [0.9, 0.1, 2.72], [0.9, 0.75, 2.72], 0.05, k.dark);
    k.bar("bumper-front", [-0.9, 0.72, 2.72], [0.9, 0.72, 2.72], 0.05, k.dark);
    k.mesh("bumper-front", new T.BoxGeometry(2.0, 0.14, 0.2), [0, 0.1, 2.72], k.dark);
    k.mesh("bumper-rear", new T.BoxGeometry(2.0, 0.14, 0.34), [0, 0.05, -2.72], k.dark);
    k.mesh("bumper-rear", new T.BoxGeometry(0.34, 0.44, 0.2), [0.65, 0.36, -2.72], k.accent);
    k.bar("bumper-rear", [0.65, 0.6, -2.72], [0.65, 0.6, -2.6], 0.025, k.dark);
    k.lamp("hood", [0.62, 0.3, 2.3], 0.1);
    k.lamp("hood", [-0.62, 0.3, 2.3], 0.1);
    k.tailLights(-2.66, 0.24);
  },
);

const saturnSaucer = vehicle(
  "saturn-saucer",
  "Saturn Saucer",
  "Close-encounter cruiser with right-of-way everywhere.",
  [0xb9c4d0, 0x4ff5e0, 0x2a3340, 0.9, 8],
  (k) => {
    const hull = finish(0xb9c4d0, 0.3, 0.75);
    const glassDome = new T.MeshStandardMaterial({
      color: 0x9fd4ff, emissive: 0x2a6a9a, emissiveIntensity: 0.5,
      transparent: true, opacity: 0.65, roughness: 0.15, metalness: 0.3,
    });
    const rimLight = (phase: number) => {
      const mat = new T.MeshStandardMaterial({ color: 0x4ff5e0, emissive: 0x2af5c8, emissiveIntensity: 2, roughness: 0.3 });
      twinklesOf(k.root).push({ mat, phase, base: 2.2 });
      return mat;
    };
    // Saucer rim in four quarter arcs, one per body part so damage splits
    // the disc. Torus starts at +X; order YXZ puts each arc in its quadrant.
    const rim = (part: PartId, yRot: number) => {
      const m = k.mesh(part, new T.TorusGeometry(1.45, 0.3, 20, 44, Math.PI / 2), [0, 0.3, 0], hull);
      m.rotation.order = "YXZ";
      m.rotation.set(Math.PI / 2, yRot, 0);
      return m;
    };
    rim("hood", -Math.PI / 4); // front quadrant (+Z)
    // Hull plates under the rim so the saucer reads as a solid disc.
    k.mesh("hood", new T.CylinderGeometry(1.35, 1.5, 0.22, 36), [0, 0.3, 0.75], hull);
    k.mesh("bed", new T.CylinderGeometry(1.35, 1.5, 0.22, 36), [0, 0.24, -0.75], hull);
    // Hood: front rim arc + laser cannon with pulsing tip.
    const cannon = k.mesh("hood", new T.CylinderGeometry(0.09, 0.12, 0.9, 18), [0, 0.42, 2.2], k.dark);
    cannon.rotation.x = Math.PI / 2;
    const tipMat = new T.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff2020, emissiveIntensity: 2.4, roughness: 0.3 });
    k.mesh("hood", new T.SphereGeometry(0.09, 16, 12), [0, 0.42, 2.68], tipMat);
    twinklesOf(k.root).push({ mat: tipMat, phase: 0, base: 2.6 });
    // Roof: glass dome with alien driver.
    k.mesh("roof", new T.SphereGeometry(0.75, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.55, -0.3], glassDome);
    k.mesh("roof", new T.TorusGeometry(0.75, 0.06, 12, 36), [0, 0.55, -0.3], hull).rotation.x = Math.PI / 2;
    const alienMat = finish(0x51d651, 0.55, 0.05);
    k.mesh("roof", new T.SphereGeometry(0.2, 22, 16), [0, 0.95, -0.3], alienMat);
    k.mesh("roof", new T.CylinderGeometry(0.12, 0.16, 0.25, 16), [0, 0.72, -0.3], alienMat);
    for (const sx of [-0.08, 0.08])
      k.mesh("roof", new T.SphereGeometry(0.05, 12, 10), [sx, 0.98, -0.12], k.dark);
    // Doors: side rim arcs + portholes.
    for (const side of sides) {
      rim(door(side), side > 0 ? Math.PI / 4 : -Math.PI * 0.75);
      for (let i = 0; i < 3; i++)
        k.mesh(door(side), new T.CylinderGeometry(0.09, 0.09, 0.06, 18),
          [side * 1.42, 0.32, -0.5 + i * 0.5], glassDome).rotateZ(Math.PI / 2);
    }
    // Rim chase lights around the disc edge.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const part = (Math.abs(Math.cos(a)) > 0.5 ? (Math.cos(a) > 0 ? door(1) : door(-1)) : a > 0 && a < Math.PI ? "hood" : "bed") as PartId;
      k.mesh(part, new T.SphereGeometry(0.06, 12, 10),
        [Math.cos(a) * 1.7, 0.22, Math.sin(a) * 1.7], rimLight(i * 0.9));
    }
    // Bed: rear rim arc + Saturn-ring spoiler with planet.
    rim("bed", Math.PI * 0.75);
    k.bar("bed", [0, 0.6, -2.3], [0, 1.5, -2.3], 0.05, k.dark);
    const ring = k.mesh("bed", new T.TorusGeometry(0.55, 0.09, 14, 48), [0, 1.85, -2.3], gold());
    ring.rotation.x = Math.PI / 2 - 0.35;
    k.mesh("bed", new T.SphereGeometry(0.3, 28, 20), [0, 1.85, -2.3], finish(0xc9a06a, 0.6, 0.2));
    // Bumpers: rover skid plates + moon hubcaps on the nose.
    for (const [part, z] of [["bumper-front", 2.72], ["bumper-rear", -2.72]] as const) {
      k.mesh(part, new T.BoxGeometry(1.6, 0.12, 0.5), [0, -0.05, z], hull);
      k.mesh(part, new T.CylinderGeometry(0.16, 0.16, 0.08, 24), [0, 0.12, z], finish(0x8d8fa3, 0.7, 0.1));
    }
    k.lamp("hood", [0.62, 0.35, 2.15], 0.1);
    k.lamp("hood", [-0.62, 0.35, 2.15], 0.1);
    k.tailLights(-2.66, 0.24);
  },
);

export const DREAM_VEHICLES = [
  cakeCruiser,
  gingerbreadGlider,
  hauntedHearse,
  windupWonder,
  loopLauncher,
  slagHauler,
  canyonCamper,
  saturnSaucer,
];

export function dreamAnimate(root: T.Group, time: number): void {
  animateDream(root, time);
}



