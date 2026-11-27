import * as T from "three";
import { vehicle } from "./themed-vehicles";
import { ConceptVehicleKit, finish, type XYZ } from "./concept-vehicle-kit";
import {
  sides,
  door,
  cream,
  gold,
  cabin,
  fenders,
} from "./themed-vehicle-body";

/**
 * Dream cars: one aspirational showpiece per level collection, unlocked by
 * earning a gold medal AND the gold star on that collection's dream level
 * (see src/dream-cars.ts). Kit-built on the standard 4-wheel chassis like
 * every garage car; each carries named animation nodes driven through its
 * `animate` callback from the game view.
 */

export type DreamAnimate = (
  root: T.Group,
  time: number,
  speedMs: number,
) => void;

type FlameNode = { mesh: T.Mesh; mat: T.MeshStandardMaterial; phase: number };
type TwinkleNode = { mat: T.MeshStandardMaterial; phase: number; base: number };
type SpinnerNode = {
  node: T.Object3D;
  base: number;
  speed: number;
  axis: "x" | "y" | "z";
};

function flamesOf(root: T.Group): FlameNode[] {
  return (root.userData.dreamFlames ??= []) as FlameNode[];
}
function twinklesOf(root: T.Group): TwinkleNode[] {
  return (root.userData.dreamTwinkles ??= []) as TwinkleNode[];
}
function spinnersOf(root: T.Group): SpinnerNode[] {
  return (root.userData.dreamSpinners ??= []) as SpinnerNode[];
}
/** Attached flame-flicker, twinkle and shaft-centered spinner animations. */
export function animateDream(root: T.Group, time: number): void {
  for (const f of flamesOf(root)) {
    const s =
      1 +
      0.16 * Math.sin(time * 13 + f.phase) * Math.sin(time * 7.3 + f.phase * 2);
    f.mesh.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    f.mat.emissiveIntensity = 1.9 + 0.7 * Math.sin(time * 11 + f.phase);
  }
  for (const t of twinklesOf(root))
    t.mat.emissiveIntensity =
      t.base * (0.55 + 0.45 * Math.sin(time * 4 + t.phase));
  for (const s of spinnersOf(root))
    s.node.rotation[s.axis] = s.base + time * s.speed;
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
    k.mesh(
      "hood",
      new T.CylinderGeometry(1.12, 1.22, 0.55, 36),
      [0, 0.18, 1.72],
      k.paint,
    );
    const rim = k.mesh(
      "hood",
      new T.TorusGeometry(1.14, 0.09, 14, 48),
      [0, 0.46, 1.72],
      icing,
    );
    rim.rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      k.oval(
        "hood",
        [0.09, 0.16, 0.09],
        [Math.cos(a) * 1.16, 0.32, 1.72 + Math.sin(a) * 1.16],
        icing,
      );
    }
    k.mesh(
      "hood",
      new T.SphereGeometry(0.16, 20, 14),
      [0.35, 0.55, 1.72],
      cherry,
    );
    k.bar("hood", [0.35, 0.62, 1.72], [0.42, 0.82, 1.72], 0.02, chocolate);
    // Roof: top tier, plate, and five striped candles with live flames.
    k.mesh(
      "roof",
      new T.CylinderGeometry(1.05, 1.05, 0.08, 36),
      [0, 0.78, -0.4],
      gold(),
    );
    k.mesh(
      "roof",
      new T.CylinderGeometry(0.82, 0.9, 0.5, 36),
      [0, 1.06, -0.4],
      icing,
    );
    const rim2 = k.mesh(
      "roof",
      new T.TorusGeometry(0.84, 0.07, 12, 40),
      [0, 1.3, -0.4],
      k.paint,
    );
    rim2.rotation.x = Math.PI / 2;
    const candleSpots: XYZ[] = [
      [0, 1.31, -0.4],
      [0.4, 1.31, -0.25],
      [-0.4, 1.31, -0.25],
      [0.28, 1.31, -0.72],
      [-0.28, 1.31, -0.72],
    ];
    candleSpots.forEach(([x, y, z], i) => {
      const stripeA = i % 2 ? k.accent : k.paint;
      const stripeB = i % 2 ? k.paint : icing;
      for (let s = 0; s < 3; s++)
        k.mesh(
          "roof",
          new T.CylinderGeometry(0.055, 0.055, 0.16, 16),
          [x, y + 0.08 + s * 0.16, z],
          s % 2 ? stripeB : stripeA,
        );
      const mat = flameMaterial();
      const flame = k.mesh(
        "roof",
        new T.ConeGeometry(0.075, 0.26, 14),
        [x, y + 0.62, z],
        mat,
      );
      flamesOf(k.root).push({ mesh: flame, mat, phase: i * 1.7 });
    });
    // Doors: frosting panels with candy dots and wafer sticks.
    for (const side of sides) {
      k.panel(door(side), [0.1, 0.62, 2.0], [side * 1.2, 0.28, -0.2], icing);
      for (let i = 0; i < 5; i++)
        k.oval(
          door(side),
          [0.06, 0.09, 0.09],
          [side * 1.27, 0.3, -0.95 + i * 0.38],
          [k.paint, k.accent, cherry, chocolate, gold()][i],
        );
      k.bar(
        door(side),
        [side * 1.24, 0.62, 0.5],
        [side * 1.24, 0.62, -0.9],
        0.045,
        chocolate,
      );
    }
    // Bed: gift box with lid and ribbon cross.
    k.mesh(
      "bed",
      new T.BoxGeometry(1.7, 0.72, 1.5),
      [0, 0.28, -1.85],
      k.accent,
    );
    k.mesh(
      "bed",
      new T.BoxGeometry(1.82, 0.14, 1.62),
      [0, 0.68, -1.85],
      k.paint,
    );
    k.mesh("bed", new T.BoxGeometry(0.22, 0.78, 1.56), [0, 0.3, -1.85], icing);
    k.mesh("bed", new T.BoxGeometry(1.76, 0.78, 0.22), [0, 0.3, -1.85], icing);
    k.oval("bed", [0.16, 0.12, 0.16], [0, 0.82, -1.85], cherry);
    // Bumpers: candy-cane striped crash bars.
    for (const [part, z] of [
      ["bumper-front", 2.72],
      ["bumper-rear", -2.72],
    ] as const) {
      for (let i = 0; i < 7; i++)
        k.mesh(
          part,
          new T.CylinderGeometry(0.09, 0.09, 0.3, 14),
          [-0.9 + i * 0.3, 0.1, z],
          i % 2 ? k.paint : icing,
        ).rotateZ(Math.PI / 2);
      k.bar(part, [-1.05, 0.1, z], [1.05, 0.1, z], 0.03, chocolate);
    }
    k.lamp("hood", [0.62, 0.32, 2.28], 0.11);
    k.lamp("hood", [-0.62, 0.32, 2.28], 0.11);
    k.tailLights(-2.66, 0.24);
  },
);

/** A continuous lower shell, enclosed cabin and mounted wheel arches.
 * All coordinates are vehicle-local; kit.mesh converts to damage-part space.
 * Decorations must intersect their mounting surface, including when animated.
 */
function coachwork(k: ConceptVehicleKit, height = 1.35, back = -1.15) {
  k.panel("chassis-front", [2.38, 0.38, 2.7], [0, 0.02, 0.65], k.paint);
  k.panel("chassis-rear", [2.38, 0.38, 2.1], [0, 0.02, -1.55], k.paint);
  k.panel("hood", [2.25, 0.6, 1.85], [0, 0.34, 1.68], k.paint);
  k.panel("bed", [2.25, 0.46, 1.55], [0, 0.27, -1.85], k.paint);
  for (const side of sides) {
    k.panel(door(side), [0.17, 0.65, 2.3], [side * 1.13, 0.3, -0.2], k.paint);
    k.panel(door(side), [0.22, 0.15, 2.5], [side * 1.17, -0.02, -0.2], k.dark);
    for (const z of [-1.65, 1.65]) {
      const part = z > 0 ? "chassis-front" : "chassis-rear";
      k.bar(
        part,
        [side * 0.8, -0.25, z],
        [side * 1.65, -0.85, z],
        0.11,
        k.steel,
      );
      k.panel(part, [0.7, 0.15, 0.7], [side * 1.13, 0.52, z], k.paint);
    }
  }
  cabin(k, { front: 0.85, back, height, width: 1.06, slant: 0.22 });
  fenders(k, k.paint);
  for (const [part, z] of [
    ["bumper-front", 2.67],
    ["bumper-rear", -2.67],
  ] as const) {
    k.panel(part, [2.55, 0.23, 0.32], [0, 0.12, z], k.dark);
    for (const x of [-0.75, 0.75])
      k.bar(part, [x, -0.08, Math.sign(z) * 2.35], [x, 0.12, z], 0.1, k.steel);
  }
  for (const x of [-0.74, 0.74]) k.lamp("hood", [x, 0.4, 2.61], 0.14);
  k.tailLights(-2.84, 0.16);
}

function mountedBeacon(k: ConceptVehicleKit, at: XYZ, color: number) {
  const [x, y, z] = at;
  k.mesh(
    "roof",
    new T.CylinderGeometry(0.15, 0.17, 0.1, 24),
    [x, y, z],
    k.dark,
  );
  const mat = new T.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  k.mesh(
    "roof",
    new T.CapsuleGeometry(0.11, 0.12, 8, 20),
    [x, y + 0.12, z],
    mat,
  );
  twinklesOf(k.root).push({ mat, phase: x + z, base: 0.85 });
}

const gingerbreadGlider = vehicle(
  "gingerbread-glider",
  "Gingerbread Glider",
  "An icing-trimmed gingerbread wagon with a snow-covered cabin and strapped cookie cargo.",
  [0x99572f, 0xf4f6f8, 0xc22e2e, 0.86, 8],
  (k) => {
    coachwork(k, 1.35);
    const icing = cream();
    const chocolate = finish(0x422316, 0.8, 0);
    k.panel("hood", [2.26, 0.09, 1.86], [0, 0.66, 1.68], icing);
    // Snow sits directly on a solid cabin roof; the chimney passes through it.
    k.panel("roof", [2.19, 0.12, 1.68], [0, 1.45, -0.18], icing);
    for (const x of [-0.7, 0, 0.7])
      k.oval("roof", [0.37, 0.16, 0.5], [x, 1.49, -0.25], icing);
    k.panel("roof", [0.28, 0.58, 0.28], [-0.65, 1.66, -0.66], k.paint);
    k.panel("roof", [0.39, 0.09, 0.39], [-0.65, 1.96, -0.66], icing);
    k.mesh(
      "roof",
      new T.CylinderGeometry(0.08, 0.1, 0.15, 16),
      [0.61, 1.56, -0.6],
      chocolate,
    );
    k.mesh(
      "roof",
      new T.ConeGeometry(0.28, 0.6, 24),
      [0.61, 1.89, -0.6],
      finish(0x296346, 0.8, 0),
    );
    k.mesh(
      "roof",
      new T.ConeGeometry(0.19, 0.38, 24),
      [0.61, 2.02, -0.6],
      icing,
    );
    for (const side of sides) {
      k.bar(
        door(side),
        [side * 1.23, 0.58, 0.83],
        [side * 1.23, 0.58, -1.2],
        0.04,
        icing,
      );
      for (let i = 0; i < 4; i++)
        k.oval(
          door(side),
          [0.065, 0.095, 0.095],
          [side * 1.235, 0.28, -0.85 + i * 0.43],
          finish([0xde3155, 0x299565, 0x337de2, 0xf2a007][i], 0.3, 0),
        );
    }
    k.panel("bed", [1.9, 0.13, 1.35], [0, 0.56, -1.85], icing);
    for (const x of [-0.46, 0.46])
      for (const z of [-1.57, -2.14]) {
        k.mesh(
          "bed",
          new T.CylinderGeometry(0.24, 0.24, 0.28, 24),
          [x, 0.75, z],
          k.paint,
        );
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5;
          k.oval(
            "bed",
            [0.035, 0.026, 0.035],
            [x + Math.cos(a) * 0.14, 0.895, z + Math.sin(a) * 0.14],
            chocolate,
          );
        }
      }
    // Straps cross the cookie tray and turn down to its frame.
    for (const x of [-0.46, 0.46]) {
      const strap: XYZ[] = [
        [x, 0.54, -1.2],
        [x, 0.9, -1.38],
        [x, 0.9, -2.33],
        [x, 0.54, -2.5],
      ];
      for (let i = 1; i < strap.length; i++)
        k.bar("bed", strap[i - 1], strap[i], 0.035, k.accent);
    }
    for (let i = 0; i < 9; i++)
      k.panel(
        "bumper-front",
        [0.27, 0.23, 0.08],
        [-1.08 + i * 0.27, 0.12, 2.85],
        i % 2 ? k.rim : icing,
        0.02,
      );
  },
);

const hauntedHearse = vehicle(
  "haunted-hearse",
  "Haunted Hearse",
  "A complete gothic coach with coffin cargo and a ghost lantern bolted to its roof.",
  [0x382447, 0x9566b6, 0xc0b6a4, 0.9, 8],
  (k) => {
    coachwork(k, 1.43, -2.35);
    const bone = cream();
    // Long rear cabin, opaque glass inserts and supported landau trim.
    for (const side of sides) {
      k.panel("bed", [0.05, 0.55, 0.76], [side * 1.1, 0.96, -1.76], k.glass);
      for (const z of [-1.4, -2.1])
        k.bar(
          "bed",
          [side * 1.14, 0.62, z],
          [side * 1.14, 1.34, z],
          0.035,
          bone,
        );
      k.bar(
        "bed",
        [side * 1.145, 0.7, -2.08],
        [side * 1.145, 1.27, -1.43],
        0.035,
        k.accent,
      );
      k.bar(
        door(side),
        [side * 1.24, 0.17, 0.78],
        [side * 1.24, 0.17, -1.25],
        0.035,
        k.accent,
      );
    }
    k.panel("roof", [2.18, 0.13, 2.82], [0, 1.5, -0.88], k.paint);
    // Ghost is an inset relief inside a roof-mounted glass lantern, not a floating passenger.
    k.panel("roof", [0.7, 0.12, 0.65], [0, 1.62, -0.55], k.steel);
    for (const x of [-0.3, 0.3])
      for (const z of [-0.82, -0.28])
        k.bar("roof", [x, 1.62, z], [x, 2.31, z], 0.035, k.steel);
    k.panel("roof", [0.76, 0.12, 0.71], [0, 2.32, -0.55], k.paint);
    const ghost = finish(0xd5ece0, 0.45, 0);
    k.mesh(
      "roof",
      new T.CylinderGeometry(0.19, 0.24, 0.4, 24),
      [0, 1.88, -0.55],
      ghost,
    );
    k.oval("roof", [0.2, 0.23, 0.18], [0, 2.11, -0.55], ghost);
    for (const x of [-0.075, 0.075])
      k.oval("roof", [0.035, 0.05, 0.025], [x, 2.14, -0.38], k.dark);
    k.mesh(
      "roof",
      new T.ConeGeometry(0.12, 0.22, 16),
      [0, 2.45, -0.55],
      k.accent,
    );
    // Hood skull on a pedestal: the jaw touches the plinth.
    k.panel("hood", [0.32, 0.12, 0.32], [0, 0.7, 1.75], k.steel);
    k.oval("hood", [0.17, 0.18, 0.15], [0, 0.9, 1.75], bone);
    k.panel("hood", [0.18, 0.12, 0.17], [0, 0.78, 1.8], bone);
    for (const x of [-0.06, 0.06])
      k.oval("hood", [0.047, 0.05, 0.025], [x, 0.92, 1.885], k.dark);
    for (const side of sides)
      mountedBeacon(k, [side * 0.77, 1.59, -1.7], 0xe08a30);
  },
);

const windupWonder = vehicle(
  "windup-wonder",
  "Windup Wonder",
  "A glossy clockwork toy truck with an enclosed blue cab and a seated brass winding key.",
  [0xdf4137, 0xffc738, 0x2d79c9, 0.8, 6],
  (k) => {
    coachwork(k, 1.35);
    k.panel("roof", [2.19, 0.14, 1.67], [0, 1.44, -0.17], k.accent);
    for (let x = -0.7; x < 0.8; x += 0.46)
      for (let z = 1.1; z < 2.4; z += 0.45)
        k.mesh(
          "hood",
          new T.CylinderGeometry(0.1, 0.1, 0.09, 20),
          [x, 0.68, z],
          k.accent,
        );
    for (const side of sides) {
      k.panel(door(side), [0.05, 0.46, 1.95], [side * 1.235, 0.3, -0.2], k.rim);
      k.mesh(
        door(side),
        new T.CylinderGeometry(0.19, 0.19, 0.055, 32),
        [side * 1.28, 0.32, -0.2],
        k.accent,
      ).rotateZ(Math.PI / 2);
    }
    // The spindle runs continuously from the roof bearing into the rotating key hub.
    const brass = gold();
    k.mesh(
      "roof",
      new T.CylinderGeometry(0.2, 0.23, 0.12, 24),
      [0, 1.55, -0.45],
      k.dark,
    );
    k.bar("roof", [0, 1.5, -0.45], [0, 2.09, -0.45], 0.09, brass);
    const key = new T.Group();
    key.position.set(0, 2.09, -0.45);
    const cross = new T.Mesh(
      new T.CylinderGeometry(0.075, 0.075, 0.61, 20),
      brass,
    );
    cross.rotation.z = Math.PI / 2;
    key.add(cross);
    for (const x of [-0.25, 0.25]) {
      const bow = new T.Mesh(new T.TorusGeometry(0.24, 0.065, 16, 40), brass);
      bow.position.set(x, 0.18, 0);
      key.add(bow);
    }
    key.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = o.receiveShadow = true;
    });
    k.groups.roof.add(key);
    key.position.sub(k.groups.roof.position);
    spinnersOf(k.root).push({ node: key, base: 0, speed: 1.3, axis: "y" });
    k.panel("bed", [2.05, 0.12, 1.35], [0, 0.55, -1.85], k.accent);
    for (const [i, c] of [0x347ece, 0x36a568, 0xffc738, 0xe14940].entries()) {
      const x = i % 2 ? 0.46 : -0.46,
        z = i < 2 ? -1.56 : -2.15;
      const mat = finish(c, 0.32, 0.05);
      k.panel("bed", [0.83, 0.48, 0.52], [x, 0.83, z], mat);
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.085, 0.085, 0.08, 16),
        [x, 1.1, z],
        mat,
      );
    }
    for (const side of sides) {
      k.bar(
        door(side),
        [side * 1.08, 0.86, 0.56],
        [side * 1.43, 0.94, 0.56],
        0.045,
        k.dark,
      );
      k.panel(door(side), [0.2, 0.23, 0.2], [side * 1.43, 1.02, 0.56], cream());
      k.oval(
        door(side),
        [0.025, 0.04, 0.04],
        [side * 1.54, 1.02, 0.56],
        k.dark,
      );
    }
  },
);

const loopLauncher = vehicle(
  "loop-launcher",
  "Loop Launcher",
  "A streamliner stunt truck with a braced loop spoiler and a bank of mounted rocket nozzles.",
  [0x255ac7, 0xdd4034, 0xd4ad58, 0.95, 8],
  (k) => {
    coachwork(k, 1.18, -0.95);
    const ivory = cream();
    k.panel("hood", [0.26, 0.035, 1.78], [0, 0.655, 1.67], ivory, 0.012);
    // Loop sits in the transverse plane; two triangular braces meet the ring itself.
    const ringZ = -1.72,
      ringY = 1.87;
    k.mesh(
      "bed",
      new T.TorusGeometry(0.72, 0.105, 20, 64),
      [0, ringY, ringZ],
      k.accent,
    );
    for (const x of [-0.51, 0.51]) {
      k.bar("bed", [x, 0.5, -1.2], [x, 1.4, ringZ], 0.07, k.steel);
      k.bar("bed", [x, 0.5, -2.35], [x, 1.4, ringZ], 0.07, k.steel);
      k.panel("bed", [0.27, 0.12, 1.23], [x, 0.55, -1.77], k.dark);
    }
    for (const x of [-0.53, 0, 0.53]) {
      k.mesh(
        "bed",
        new T.CylinderGeometry(0.2, 0.2, 0.95, 28),
        [x, 0.73, -2.03],
        k.steel,
      ).rotateX(Math.PI / 2);
      k.mesh(
        "bed",
        new T.TorusGeometry(0.19, 0.04, 12, 32),
        [x, 0.73, -2.5],
        k.rim,
      );
      k.panel("bed", [0.39, 0.23, 0.6], [x, 0.51, -1.98], k.dark);
      const mat = flameMaterial();
      // Translate the cone so its base is the animation origin and stays in the nozzle.
      const flame = k.mesh(
        "bed",
        new T.ConeGeometry(0.145, 0.55, 20).translate(0, 0.275, 0),
        [x, 0.73, -2.48],
        mat,
      );
      flame.rotation.x = -Math.PI / 2;
      flamesOf(k.root).push({ mesh: flame, mat, phase: x * 4 });
    }
    for (const side of sides) {
      k.panel(
        door(side),
        [0.035, 0.14, 2.17],
        [side * 1.235, 0.26, -0.2],
        ivory,
        0.01,
      );
      for (let i = 0; i < 8; i++)
        k.panel(
          door(side),
          [0.04, 0.14, 0.135],
          [side * 1.255, 0.26, -1.2 + i * 0.27],
          k.dark,
          0.005,
        );
    }
  },
);

const slagHauler = vehicle(
  "slag-hauler",
  "Slag Hauler",
  "An armored foundry truck with a seated crucible, reinforced crane and connected chain hoist.",
  [0xb34a25, 0xeabf23, 0x49515a, 1, 8],
  (k) => {
    coachwork(k, 1.4, -0.85);
    const steel = finish(0x626c72, 0.4, 0.65);
    for (const side of sides) {
      k.panel(
        door(side),
        [0.06, 0.22, 2.1],
        [side * 1.24, 0.24, -0.2],
        k.accent,
      );
      for (let i = 0; i < 6; i++)
        k.panel(
          door(side),
          [0.07, 0.22, 0.16],
          [side * 1.25, 0.24, -1.1 + i * 0.35],
          k.dark,
          0.01,
        ).rotation.x = -0.4;
      // Exhausts start on the side sill, with clamps to the cab all the way up.
      k.bar(
        "roof",
        [side * 0.91, 0.42, -0.66],
        [side * 0.91, 1.98, -0.66],
        0.11,
        k.dark,
      );
      for (const y of [0.65, 1.28])
        k.bar(
          "roof",
          [side * 0.74, y, -0.66],
          [side * 1.04, y, -0.66],
          0.045,
          steel,
        );
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.15, 0.15, 0.07, 24),
        [side * 0.91, 1.98, -0.66],
        steel,
      );
    }
    mountedBeacon(k, [0, 1.51, -0.05], 0xffbc35);
    k.panel("bed", [2.1, 0.17, 1.54], [0, 0.57, -1.85], steel);
    // Open lathed vessel: a closed cylinder cap would overlap the molten surface.
    const vesselProfile = [
      [0, 0.61],
      [0.55, 0.61],
      [0.73, 1.48],
      [0.65, 1.48],
      [0.48, 0.72],
      [0, 0.72],
    ];
    k.mesh(
      "bed",
      new T.LatheGeometry(
        vesselProfile.map(([r, y]) => new T.Vector2(r, y)),
        48,
      ),
      [0, 0, -1.86],
      steel,
    );
    k.mesh(
      "bed",
      new T.TorusGeometry(0.72, 0.075, 16, 48),
      [0, 1.48, -1.86],
      k.dark,
    ).rotation.x = Math.PI / 2;
    const molten = new T.MeshStandardMaterial({
      color: 0xe86a14,
      emissive: 0xff4400,
      emissiveIntensity: 1.15,
      roughness: 0.5,
    });
    k.mesh(
      "bed",
      new T.CylinderGeometry(0.64, 0.64, 0.07, 48),
      [0, 1.37, -1.86],
      molten,
    );
    twinklesOf(k.root).push({ mat: molten, phase: 1.2, base: 1.2 });
    // Crane bolted to bed, gusseted at its elbow, with a continuous cable and alternating links.
    k.panel("bed", [0.42, 0.14, 0.44], [-0.85, 0.7, -1.34], k.dark);
    k.bar("bed", [-0.85, 0.65, -1.34], [-0.85, 2.25, -1.34], 0.105, k.accent);
    k.bar("bed", [-0.85, 2.25, -1.34], [0.15, 2.25, -1.85], 0.095, k.accent);
    k.bar("bed", [-0.85, 1.8, -1.34], [-0.35, 2.25, -1.595], 0.065, steel);
    k.bar("bed", [0.15, 2.25, -1.85], [0.15, 1.72, -1.85], 0.025, k.dark);
    for (let i = 0; i < 5; i++) {
      const link = k.mesh(
        "bed",
        new T.TorusGeometry(0.058, 0.022, 10, 20),
        [0.15, 2.18 - i * 0.1, -1.85],
        steel,
      );
      link.rotation.y = i % 2 ? Math.PI / 2 : 0;
    }
    k.mesh(
      "bed",
      new T.TorusGeometry(0.1, 0.035, 12, 28, Math.PI * 1.65),
      [0.15, 1.64, -1.85],
      steel,
    ).rotation.z = Math.PI / 2;
  },
);

const canyonCamper = vehicle(
  "canyon-camper",
  "Canyon Camper",
  "A trail-ready expedition camper with a supported pop-top, strapped canoe and rear spare carrier.",
  [0xb69061, 0x3f694b, 0x857561, 0.95, 8],
  (k) => {
    coachwork(k, 1.4, -1.05);
    const canvas = finish(0xdfd2b6, 0.85, 0);
    k.panel("bed", [2.12, 1.05, 1.55], [0, 0.94, -1.85], canvas);
    k.panel("bed", [2.24, 0.12, 1.65], [0, 1.5, -1.85], k.accent);
    for (const side of sides) {
      k.panel("bed", [0.055, 0.43, 0.84], [side * 1.08, 1.03, -1.85], k.dark);
      k.panel("bed", [0.04, 0.34, 0.73], [side * 1.115, 1.03, -1.85], k.glass);
      k.bar(
        "bed",
        [side * 1.14, 0.83, -1.85],
        [side * 1.14, 1.22, -1.85],
        0.025,
        k.steel,
      );
      k.panel(
        door(side),
        [0.25, 0.12, 1.9],
        [side * 1.24, -0.08, -0.2],
        k.dark,
      );
    }
    // Pop-top is a closed triangular canvas prism on a solid mounting tray.
    k.panel("roof", [2.12, 0.12, 1.52], [0, 1.5, -0.14], k.dark);
    k.profile(
      "roof",
      [
        [-0.88, 1.55],
        [0.58, 1.55],
        [0.58, 1.72],
        [-0.88, 2.03],
      ],
      1.92,
      0,
      canvas,
    );
    k.bar("roof", [-0.98, 2.03, -0.88], [0.98, 2.03, -0.88], 0.045, k.accent);
    k.panel("roof", [1.98, 0.07, 1.52], [0, 1.89, -0.15], k.accent).rotation.x =
      0.21;
    // Inverted canoe rides on crossbars; feet and taut straps touch its hull.
    for (const z of [-1.38, -2.3]) {
      for (const x of [-0.72, 0.72])
        k.bar("bed", [x, 1.5, z], [x, 1.72, z], 0.055, k.steel);
      k.bar("bed", [-0.92, 1.72, z], [0.92, 1.72, z], 0.055, k.dark);
    }
    k.hull(
      "bed",
      [
        [-2.75, 1.7, 1.94, 0.02, 0.03],
        [-2.36, 1.65, 1.98, 0.25, 0.39],
        [-1.45, 1.65, 1.98, 0.25, 0.39],
        [-1.04, 1.7, 1.94, 0.02, 0.03],
      ],
      k.accent,
    );
    for (const z of [-1.4, -2.3]) {
      const strap: XYZ[] = [
        [-0.72, 1.5, z],
        [-0.34, 1.99, z],
        [0.34, 1.99, z],
        [0.72, 1.5, z],
      ];
      for (let i = 1; i < strap.length; i++)
        k.bar("bed", strap[i - 1], strap[i], 0.035, k.dark);
    }
    // Spare tire backed by a carrier attached to rear bulkhead and bumper.
    k.bar("bed", [0, 0.3, -2.55], [0, 1.07, -2.77], 0.09, k.steel);
    k.bar("bed", [-0.5, 0.45, -2.6], [0.5, 0.45, -2.6], 0.065, k.dark);
    k.mesh(
      "bed",
      new T.CylinderGeometry(0.27, 0.27, 0.27, 32),
      [0, 0.93, -2.77],
      k.rim,
    ).rotateX(Math.PI / 2);
    k.mesh(
      "bed",
      new T.TorusGeometry(0.34, 0.13, 16, 40),
      [0, 0.93, -2.78],
      k.rubber,
    );
    // Work lantern on a roof bracket, with a visible lens instead of a hidden inner cube.
    k.bar("roof", [0.91, 1.35, 0.35], [1.18, 1.6, 0.35], 0.045, k.dark);
    k.panel("roof", [0.2, 0.28, 0.2], [1.18, 1.69, 0.35], k.dark);
    k.panel("roof", [0.13, 0.17, 0.035], [1.18, 1.7, 0.46], k.white);
  },
);

const meteorProspector = vehicle(
  "meteor-prospector",
  "Meteor Prospector",
  "A lunar mining rover with a pressure cabin, sample drill, gold-foil cargo and deployable solar equipment.",
  [0xd7dedf, 0xd28b35, 0x74818a, 0.9, 8],
  (k) => {
    coachwork(k, 1.5, -1.02);
    const foil = finish(0xd3a745, 0.47, 0.65);
    const blue = finish(0x183b69, 0.3, 0.45);
    const white = finish(0xe1e6e5, 0.5, 0.3);
    // Pressure cabin glazing is opaque coated glass with structural corner posts.
    for (const side of sides) {
      k.bar(
        "roof",
        [side * 0.98, 0.56, 0.75],
        [side * 0.98, 1.48, 0.61],
        0.055,
        white,
      );
      k.panel(door(side), [0.07, 0.42, 1.55], [side * 1.24, 0.29, -0.17], foil);
      for (const z of [-0.65, 0.25])
        k.mesh(
          door(side),
          new T.CylinderGeometry(0.07, 0.07, 0.045, 16),
          [side * 1.3, 0.29, z],
          k.steel,
        ).rotateZ(Math.PI / 2);
    }
    // Articulated sampling drill: flange -> shoulder -> arm -> drill housing -> bit.
    k.mesh(
      "hood",
      new T.CylinderGeometry(0.25, 0.28, 0.17, 28),
      [0, 0.72, 1.43],
      k.dark,
    );
    k.bar("hood", [0, 0.73, 1.43], [0, 1.04, 1.43], 0.12, k.accent);
    k.bar("hood", [0, 1.04, 1.43], [0, 1.04, 2.45], 0.105, k.accent);
    for (const z of [1.43, 2.45])
      k.mesh(
        "hood",
        new T.CylinderGeometry(0.17, 0.17, 0.28, 24),
        [0, 1.04, z],
        k.steel,
      ).rotateZ(Math.PI / 2);
    // Forward-pointing bit clears the hood and bumper instead of drilling into its own bodywork.
    k.bar("hood", [0, 1.04, 2.43], [0, 1.04, 2.82], 0.13, k.dark);
    k.mesh(
      "hood",
      new T.ConeGeometry(0.12, 0.28, 24),
      [0, 1.04, 2.95],
      k.steel,
    ).rotation.x = Math.PI / 2;
    k.panel("bed", [1.9, 0.72, 1.25], [0, 0.86, -1.86], foil);
    // Foil ribs are fixed to the cargo housing, not separate floating boxes.
    for (let i = 0; i < 7; i++)
      k.panel(
        "bed",
        [1.96, 0.045, 0.045],
        [0, 0.62 + i * 0.085, -2.51],
        k.accent,
        0.01,
      );
    // A solar table on four feet, bolted through the cargo lid.
    for (const x of [-0.72, 0.72])
      for (const z of [-1.4, -2.3])
        k.bar("bed", [x, 1.17, z], [x, 1.56, z], 0.055, k.steel);
    k.panel("bed", [2.05, 0.1, 1.47], [0, 1.58, -1.85], k.steel);
    k.panel("bed", [1.94, 0.035, 1.36], [0, 1.645, -1.85], blue, 0.01);
    for (let i = 0; i < 7; i++)
      k.panel(
        "bed",
        [0.018, 0.018, 1.36],
        [-0.84 + i * 0.28, 1.67, -1.85],
        k.steel,
        0.003,
      );
    for (let i = 0; i < 4; i++)
      k.panel(
        "bed",
        [1.94, 0.018, 0.018],
        [0, 1.67, -2.38 + i * 0.35],
        k.steel,
        0.003,
      );
    // Roof antenna has a continuous mast, hub and rim: no hovering satellite dish.
    k.mesh(
      "roof",
      new T.CylinderGeometry(0.17, 0.2, 0.12, 24),
      [-0.55, 1.62, -0.4],
      k.dark,
    );
    k.bar("roof", [-0.55, 1.6, -0.4], [-0.55, 2.1, -0.4], 0.055, k.steel);
    k.oval("roof", [0.33, 0.11, 0.33], [-0.55, 2.1, -0.4], white);
    k.bar("roof", [-0.55, 2.1, -0.4], [-0.55, 2.32, -0.4], 0.025, k.accent);
    mountedBeacon(k, [0.55, 1.61, -0.35], 0x55c8dc);
    for (const x of [-0.7, 0.7])
      k.panel("bumper-front", [0.3, 0.14, 0.05], [x, 0.12, 2.86], k.accent);
  },
);

const magmaHauler = vehicle(
  "magma-hauler",
  "Magma Hauler",
  "An obsidian-armored hauler with a live crucible bed and twin stack flames. Erupts on arrival.",
  [0x23262b, 0xff6a1a, 0x3a3f45, 1, 8],
  (k) => {
    coachwork(k, 1.4, -0.85);
    const magma = new T.MeshStandardMaterial({
      color: 0xff7a1a,
      emissive: 0xff4400,
      emissiveIntensity: 1.6,
      roughness: 0.5,
    });
    // Hood: armored cowl sunk into the nose, with a glowing grille.
    k.panel("hood", [2.0, 0.18, 1.4], [0, 0.68, 1.68], k.dark);
    for (let i = 0; i < 5; i++)
      k.mesh(
        "hood",
        new T.BoxGeometry(0.18, 0.3, 0.08),
        [-0.6 + i * 0.3, 0.35, 2.6],
        magma,
      );
    twinklesOf(k.root).push({ mat: magma, phase: 0.6, base: 1.6 });
    // Roof: twin exhaust stacks with live flames, clamped to the cab.
    for (const x of [-0.55, 0.55]) {
      k.bar("roof", [x, 1.3, -0.5], [x, 2.15, -0.5], 0.12, k.dark);
      for (const y of [1.55, 1.9])
        k.bar("roof", [x * 0.35, y, -0.5], [x * 1.05, y, -0.5], 0.04, k.steel);
      k.mesh(
        "roof",
        new T.CylinderGeometry(0.15, 0.15, 0.08, 24),
        [x, 2.15, -0.5],
        k.steel,
      );
      const mat = flameMaterial();
      const flame = k.mesh(
        "roof",
        new T.ConeGeometry(0.11, 0.34, 16),
        [x, 2.27, -0.5],
        mat,
      );
      flamesOf(k.root).push({ mesh: flame, mat, phase: x * 4 });
    }
    mountedBeacon(k, [0, 1.51, -0.05], 0xff4400);
    // Bed: crucible tank with bands, hazard bars and a molten surface.
    const tank = finish(0x2c3138, 0.45, 0.6);
    k.mesh(
      "bed",
      new T.CylinderGeometry(0.85, 0.95, 0.7, 32),
      [0, 0.83, -1.85],
      tank,
    );
    for (const y of [0.68, 1.0]) {
      const band = k.mesh(
        "bed",
        new T.TorusGeometry(0.92, 0.05, 12, 40),
        [0, y, -1.85],
        k.dark,
      );
      band.rotation.x = Math.PI / 2;
    }
    const molten = new T.MeshStandardMaterial({
      color: 0xe86a14,
      emissive: 0xff4400,
      emissiveIntensity: 1.4,
      roughness: 0.5,
    });
    k.mesh(
      "bed",
      new T.CylinderGeometry(0.78, 0.78, 0.06, 32),
      [0, 1.17, -1.85],
      molten,
    );
    twinklesOf(k.root).push({ mat: molten, phase: 2.1, base: 1.4 });
    for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4])
      k.bar(
        "bed",
        [Math.cos(a) * 0.9, 0.6, -1.85 + Math.sin(a) * 0.9],
        [Math.cos(a) * 0.9, 1.1, -1.85 + Math.sin(a) * 0.9],
        0.04,
        k.accent,
      );
    // Doors: magma pinstripes fused to the armor.
    for (const side of sides)
      k.panel(
        door(side),
        [0.05, 0.08, 2.0],
        [side * 1.23, 0.35, -0.2],
        magma,
      );
    // Bumpers: glowing tow hooks on the nose.
    for (const x of [-0.6, 0.6])
      k.mesh(
        "bumper-front",
        new T.TorusGeometry(0.09, 0.03, 10, 20),
        [x, 0.12, 2.85],
        k.accent,
      );
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
  meteorProspector,
  magmaHauler,
];

export function dreamAnimate(root: T.Group, time: number): void {
  animateDream(root, time);
}
