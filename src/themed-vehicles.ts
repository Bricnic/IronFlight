import * as T from "three";
import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js";
import { PARTS, type PartId } from "./damage";
import { ConceptVehicleKit, finish, type XYZ } from "./concept-vehicle-kit";
import {
  bubble,
  bumpers,
  cabin,
  canopy,
  crate,
  cream,
  door,
  fenders,
  glow,
  gold,
  openSeat,
  shell,
  sides,
  sideStripe,
  stack,
} from "./themed-vehicle-body";

type Palette = [
  paint: number,
  accent: number,
  rim: number,
  width: number,
  spokes: number,
];

function vehicle<Id extends string>(
  id: Id,
  name: string,
  blurb: string,
  [paint, accent, rim, tireWidth, spokes]: Palette,
  model: (kit: ConceptVehicleKit) => void,
) {
  return {
    id,
    name,
    blurb,
    build() {
      const kit = new ConceptVehicleKit(id, {
        paint,
        accent,
        rim,
        tireWidth,
        spokes,
      });
      model(kit);
      return kit.root;
    },
  };
}

function disk(
  k: ConceptVehicleKit,
  part: PartId,
  at: XYZ,
  radius: number,
  material: T.Material,
) {
  const [x, y, z] = at;
  k.bar(part, [x, y, z - 0.046], [x, y, z + 0.046], radius, material);
}

function facePlate(
  k: ConceptVehicleKit,
  part: PartId,
  points: number[][],
  z: number,
  material: T.Material,
) {
  const shape = new T.Shape(points.map(([x, y]) => new T.Vector2(x, y)));
  const plate = new T.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelThickness: 0.018,
    bevelSize: 0.018,
    bevelSegments: 3,
  });
  k.mesh(part, plate, [0, 0, z], material);
}

const canopyRunner = vehicle(
  "canopy-runner",
  "Canopy Runner",
  "Jungle safari buggy with a canvas roof and strapped fuel cans.",
  [0x697537, 0xb18c45, 0x64684b, 0.86, 8],
  (k) => {
    shell(
      k,
      [
        [0.48, -0.04, 0.66, 1.06, 1.08],
        [2.08, -0.19, 0.4, 0.95, 1.02],
        [2.52, -0.2, 0.31, 0.83, 0.85],
      ],
      [
        [-2.6, -0.13, 0.36, 1, 1.08],
        [-1.13, -0.18, 0.49, 1.11, 1.16],
      ],
    );
    canopy(k, -0.38, 1.9, 1.67, 1.66, finish(0xc7af7b, 0.9, 0));
    openSeat(k, 0.48);
    openSeat(k, -0.48);
    fenders(k, k.paint);
    bumpers(k, k.dark, false);
    for (const x of [-0.74, -0.25, 0.25, 0.74])
      k.lamp("bumper-front", [x, 0.31, 2.63], 0.16, k.amber);
    for (const side of sides) {
      crate(
        k,
        [side * 0.61, 0.64, -1.88],
        [0.37, 0.42, 0.54],
        k.accent,
        k.dark,
      );
      k.bar(
        door(side),
        [side * 1.27, 0.09, -1.02],
        [side * 1.27, 0.31, 0.88],
        0.047,
        k.dark,
      );
      k.shock(
        "chassis-rear",
        [side * 1.18, 0.57, -1.65],
        [side * 1.45, -0.67, -1.65],
        k.accent,
      );
    }
  },
);

const duneRaider = vehicle(
  "dune-raider",
  "Dune Raider",
  "Sand rally pickup with twin intakes and traction ladders.",
  [0xc1a371, 0xae5631, 0x8d8067, 0.84, 8],
  (k) => {
    shell(
      k,
      [
        [0.67, -0.06, 0.76, 1.13, 1.22],
        [1.87, -0.24, 0.52, 1.12, 1.18],
        [2.53, -0.22, 0.27, 0.97, 1.02],
      ],
      [
        [-2.62, -0.16, 0.42, 1.11, 1.22],
        [-0.98, -0.16, 0.48, 1.12, 1.24],
      ],
    );
    cabin(
      k,
      { front: 0.95, back: -1.06, height: 1.49, width: 1.07, slant: 0.59 },
      k.accent,
    );
    sideStripe(k, 0.29, 1.85);
    fenders(k, k.dark, true);
    bumpers(k);
    k.tube(
      "bumper-front",
      [
        [-1.06, -0.03, 2.74],
        [-0.82, 0.44, 2.72],
        [0.82, 0.44, 2.72],
        [1.06, -0.03, 2.74],
      ],
      0.064,
    );
    for (const side of sides) {
      stack(k, "hood", side * 0.88, 0.77, 1.13, k.dark);
      k.panel("bed", [0.38, 0.08, 1.37], [side * 0.53, 0.57, -1.81], k.accent);
      for (let i = 0; i < 8; i++)
        k.bar(
          "bed",
          [side * 0.53 - 0.17, 0.62, -1.21 - i * 0.16],
          [side * 0.53 + 0.17, 0.62, -1.21 - i * 0.16],
          0.021,
          k.dark,
        );
    }
  },
);

const frostPatrol = vehicle(
  "frost-patrol",
  "Frost Patrol",
  "Ice-blue rescue wagon with an amber beacon and a loaded roof basket.",
  [0x85bdd7, 0xf2f6ee, 0x7e96a5, 0.83, 10],
  (k) => {
    shell(
      k,
      [
        [0.97, -0.15, 0.78, 1.2, 1.19],
        [2.56, -0.17, 0.56, 1.13, 1.17],
      ],
      [
        [-2.56, -0.18, 0.71, 1.16, 1.2],
        [-1.02, -0.2, 0.68, 1.2, 1.21],
      ],
    );
    cabin(
      k,
      { front: 1.19, back: -2.27, height: 1.82, width: 1.17, slant: 0.23 },
      k.accent,
    );
    sideStripe(k, 0.28, 2.19);
    fenders(k, k.dark);
    bumpers(k, k.steel);
    k.panel("roof", [1.78, 0.09, 1.29], [0, 1.96, -0.9], k.dark);
    for (const side of sides) {
      k.bar(
        "roof",
        [side * 0.86, 2.11, -1.53],
        [side * 0.86, 2.11, -0.27],
        0.042,
        k.dark,
      );
      k.panel(
        "roof",
        [0.53, 0.24, 0.66],
        [side * 0.39, 2.12, -0.89],
        finish(0xb83730),
      );
      k.lamp("roof", [side * 0.64, 1.99, 0.63], 0.13, k.amber);
    }
    for (const z of [-1.52, -0.29])
      k.bar("roof", [-0.86, 2.11, z], [0.86, 2.11, z], 0.042);
  },
);

const prismRacer = vehicle(
  "prism-racer",
  "Prism Racer",
  "A low silver electric wedge with cyan light bars and a dark canopy.",
  [0xb1bdc9, 0x43dfed, 0x606d81, 0.74, 12],
  (k) => {
    const cyan = glow(0x3be8f4);
    shell(
      k,
      [
        [0.98, -0.25, 0.68, 1.3, 1.15],
        [1.88, -0.27, 0.43, 1.18, 1.05],
        [2.68, -0.24, 0.17, 0.92, 0.8],
      ],
      [
        [-2.65, -0.22, 0.35, 1.28, 1.16],
        [-1.62, -0.19, 0.66, 1.36, 1.2],
        [-0.88, -0.17, 0.68, 1.2, 1.16],
      ],
      k.dark,
    );
    bubble(k, [0, 0.6, -0.14], [1.08, 0.61, 1.45]);
    fenders(k, k.paint, true);
    bumpers(k, k.dark, false);
    k.panel("bumper-front", [1.85, 0.058, 0.078], [0, 0.16, 2.76], cyan, 0.023);
    k.panel("bed", [2.23, 0.093, 0.51], [0, 0.83, -2.21], k.dark);
    for (const side of sides) {
      k.profile(
        door(side),
        [
          [-1.14, 0.05],
          [1.02, 0.12],
          [0.38, 0.31],
          [-1.08, 0.23],
        ],
        0.19,
        side * 1.23,
        k.paint,
      );
      k.bar(
        door(side),
        [side * 1.348, 0.12, -1.03],
        [side * 1.348, 0.21, 0.76],
        0.025,
        cyan,
      );
      k.panel("bed", [0.12, 0.24, 0.32], [side * 0.77, 0.7, -2.17], k.steel);
    }
  },
);

const sunChariot = vehicle(
  "sun-chariot",
  "Sun Chariot",
  "Lapis-blue chariot with stepped gold rails and a sun-disk crest.",
  [0x26498a, 0xd0a34c, 0x9d6d31, 0.79, 10],
  (k) => {
    const brass = gold();
    shell(
      k,
      [
        [0.73, -0.14, 0.78, 1.18, 1.12],
        [2.44, -0.13, 0.46, 0.79, 0.94],
      ],
      [
        [-2.55, -0.15, 0.52, 1.1, 1.24],
        [-1.2, -0.11, 0.57, 1.12, 1.17],
      ],
    );
    openSeat(k);
    k.profile(
      "roof",
      [
        [-1.33, 0.36],
        [-0.98, 0.35],
        [-1.04, 1.34],
        [-1.29, 1.34],
      ],
      1.74,
      0,
      k.paint,
      0.09,
    );
    disk(k, "roof", [0, 1.54, -1.25], 0.42, brass);
    disk(k, "roof", [0, 1.54, -1.18], 0.31, k.accent);
    k.mesh(
      "roof",
      new T.TorusGeometry(0.43, 0.045, 16, 64),
      [0, 1.54, -1.25],
      brass,
    );
    fenders(k, brass);
    bumpers(k, brass);
    k.oval("hood", [0.25, 0.16, 0.42], [0, 0.58, 1.99], brass);
    k.oval("hood", [0.13, 0.105, 0.13], [0, 0.58, 2.36], brass);
    for (const side of sides) {
      k.panel(
        "hood",
        [0.49, 0.067, 0.28],
        [side * 0.38, 0.56, 2.04],
        brass,
      ).rotation.y = side * 0.26;
      for (const z of [1.79, 2.03, 2.25])
        k.tube(
          "hood",
          [
            [side * 0.15, 0.63, z],
            [side * 0.31, 0.57, z + 0.045],
            [side * 0.43, 0.52, z - 0.04],
          ],
          0.035,
          brass,
          20,
        );
      for (let i = 0; i < 4; i++)
        k.panel(
          door(side),
          [0.064, 0.097, 1.68 - i * 0.29],
          [side * 1.24, -0.01 + i * 0.117, -0.12],
          brass,
          0.022,
        );
    }
  },
);

const rocketCoupe = vehicle(
  "rocket-coupe",
  "Rocket Coupe",
  "Mint-and-ivory fifties coupe with whitewalls, chrome, and pointed tailfins.",
  [0x6ec6aa, 0xf9eacc, 0xb2b2a8, 0.77, 8],
  (k) => {
    shell(
      k,
      [
        [0.85, -0.14, 0.69, 1.15, 1.14],
        [2.21, -0.14, 0.46, 1.22, 1.19],
        [2.59, -0.12, 0.32, 1.08, 1.12],
      ],
      [
        [-2.68, -0.16, 0.43, 1.05, 1.19],
        [-0.95, -0.17, 0.6, 1.2, 1.23],
      ],
      k.accent,
    );
    k.oval("hood", [1.19, 0.34, 0.91], [0, 0.41, 1.56]);
    cabin(
      k,
      { front: 1, back: -1.6, height: 1.64, width: 1.02, slant: 0.61 },
      k.accent,
    );
    fenders(k);
    bumpers(k, k.steel);
    k.panel("bumper-front", [1.12, 0.19, 0.12], [0, 0.15, 2.78], k.dark);
    for (const side of sides) {
      k.profile(
        "bed",
        [
          [-2.68, 0.27],
          [-1.11, 0.56],
          [-2.61, 1.12],
        ],
        0.18,
        side * 1.09,
        k.paint,
        0.071,
      );
      k.lamp("bed", [side * 1.07, 0.76, -2.63], 0.119, k.red, -1);
      k.oval(
        "bumper-front",
        [0.12, 0.15, 0.2],
        [side * 0.62, -0.04, 2.82],
        k.steel,
      );
    }
    const whitewall = cream();
    for (const part of PARTS) {
      if (!part.id.startsWith("wheel-")) continue;
      const ring = new T.TorusGeometry(0.749, 0.077, 16, 84);
      ring.rotateY(Math.PI / 2);
      k.mesh(
        part.id,
        ring,
        [
          part.pos[0] + Math.sign(part.pos[0]) * 0.322,
          part.pos[1],
          part.pos[2],
        ],
        whitewall,
      );
    }
  },
);

const orbitalRover = vehicle(
  "orbital-rover",
  "Orbital Rover",
  "White planetary rover with solar panels, exposed shocks, and a dish antenna.",
  [0xd9dedc, 0xee7c3d, 0x81949b, 0.85, 10],
  (k) => {
    const solar = finish(0x28517f, 0.26, 0.47);
    shell(
      k,
      [
        [0.62, -0.09, 0.85, 1.13, 1.2],
        [1.89, -0.22, 0.65, 1.21, 1.12],
        [2.57, -0.15, 0.3, 0.94, 0.96],
      ],
      [
        [-2.59, -0.14, 0.57, 1.15, 1.2],
        [-0.75, -0.17, 0.61, 1.15, 1.24],
      ],
    );
    cabin(k, {
      front: 1.82,
      back: -0.78,
      height: 1.62,
      width: 1.04,
      slant: 0.67,
    });
    sideStripe(k, 0.33, 2.15);
    fenders(k, k.accent, true);
    bumpers(k, k.steel);
    for (const side of sides) {
      k.panel("bed", [0.86, 0.079, 1.17], [side * 0.5, 0.65, -1.82], solar);
      for (let i = 0; i < 6; i++)
        k.bar(
          "bed",
          [side * 0.5 - 0.39, 0.697, -1.31 - i * 0.188],
          [side * 0.5 + 0.39, 0.697, -1.31 - i * 0.188],
          0.018,
          k.steel,
        );
      k.shock(
        "chassis-front",
        [side * 1.13, 0.57, 1.65],
        [side * 1.51, -0.71, 1.65],
        k.accent,
      );
    }
    k.bar("bed", [0, 0.61, -1.87], [0, 1.5, -1.87], 0.064, k.steel);
    const dish = new T.LatheGeometry(
      [
        [0, 0],
        [0.13, 0.02],
        [0.31, 0.085],
        [0.48, 0.21],
        [0.48, 0.25],
        [0.31, 0.13],
        [0.13, 0.065],
        [0, 0.045],
      ].map(([r, y]) => new T.Vector2(r, y)),
      80,
    );
    k.mesh("bed", dish, [0, 1.46, -1.87], k.steel).rotation.x = 0.51;
    k.bar("bed", [0, 1.5, -1.87], [0, 1.83, -1.69], 0.041, k.dark);
  },
);

const runeDrifter = vehicle(
  "rune-drifter",
  "Rune Drifter",
  "Violet fantasy roadster with curled horns and glowing roof crystals.",
  [0x49345e, 0xa98249, 0x81674f, 0.85, 8],
  (k) => {
    const brass = gold();
    const crystal = glow(0x4bddbf);
    shell(
      k,
      [
        [0.74, -0.19, 0.73, 1.22, 1.07],
        [2.42, -0.17, 0.35, 0.99, 0.77],
      ],
      [
        [-2.61, -0.1, 0.5, 1.07, 1.16],
        [-1.08, -0.15, 0.66, 1.24, 1.12],
      ],
    );
    cabin(
      k,
      { front: 0.91, back: -1.4, height: 1.47, width: 1.01, slant: 0.39 },
      brass,
    );
    fenders(k, k.paint, true);
    bumpers(k, k.dark);
    k.panel("roof", [1.19, 0.14, 0.78], [0, 1.58, -0.31], brass);
    for (const [x, height, tilt] of [
      [-0.35, 0.63, 0.29],
      [0, 0.94, -0.04],
      [0.36, 0.69, -0.27],
    ]) {
      const gem = new T.OctahedronGeometry(0.29);
      gem.scale(0.72, height * 2.18, 0.76);
      k.mesh("roof", gem, [x, 1.64 + height * 0.4, -0.31], crystal).rotation.z =
        tilt;
    }
    for (const side of sides) {
      k.tube(
        "bumper-front",
        [
          [side * 0.92, -0.06, 2.72],
          [side * 1.28, 0.14, 2.82],
          [side * 1.31, 0.52, 2.77],
          [side * 1.12, 0.69, 2.67],
        ],
        0.09,
        brass,
      );
      k.profile(
        door(side),
        [
          [-1.29, 0.1],
          [0.95, 0.3],
          [-0.48, 0.42],
        ],
        0.07,
        side * 1.235,
        brass,
      );
    }
  },
);

const toonTaxi = vehicle(
  "toon-taxi",
  "Toon Taxi",
  "Lemon-yellow cartoon taxi with a wraparound canopy and checker trim.",
  [0xf3c922, 0xf6f0d4, 0x7b8692, 0.74, 10],
  (k) => {
    shell(
      k,
      [
        [0.68, -0.16, 0.55, 1.16, 1.19],
        [2.51, -0.16, 0.4, 0.99, 1.11],
      ],
      [
        [-2.56, -0.14, 0.46, 0.99, 1.03],
        [-0.91, -0.13, 0.61, 1.11, 1.14],
      ],
    );
    k.oval("hood", [1.18, 0.52, 1.05], [0, 0.33, 1.44]);
    k.oval("bed", [1.19, 0.55, 0.96], [0, 0.38, -1.56]);
    bubble(k, [0, 0.68, -0.23], [1.09, 0.81, 1.37]);
    k.oval("roof", [0.92, 0.12, 0.95], [0, 1.39, -0.31]);
    k.panel("roof", [0.76, 0.24, 0.38], [0, 1.58, -0.31], k.accent, 0.11);
    fenders(k);
    bumpers(k, k.dark, false);
    k.panel(
      "bumper-front",
      [0.72, 0.22, 0.087],
      [0, 0.21, 2.735],
      k.dark,
      0.07,
    );
    for (const side of sides) {
      k.lamp("bumper-front", [side * 0.81, 0.38, 2.54], 0.23);
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < 9; col++)
          k.panel(
            door(side),
            [0.038, 0.12, 0.17],
            [side * 1.229, 0.17 + row * 0.12, -0.92 + col * 0.17],
            (row + col) % 2 ? k.accent : k.dark,
            0.006,
          );
    }
  },
);

const bigTopBuggy = vehicle(
  "big-top-buggy",
  "Big Top Buggy",
  "Circus buggy with a red clown nose and striped fabric canopy.",
  [0x7052aa, 0xe43647, 0xddae43, 0.84, 8],
  (k) => {
    const ivory = cream();
    shell(
      k,
      [
        [0.69, -0.13, 0.62, 1.14, 1.17],
        [2.48, -0.12, 0.34, 0.92, 1.02],
      ],
      [
        [-2.55, -0.17, 0.43, 1.04, 1.15],
        [-1.05, -0.15, 0.51, 1.16, 1.17],
      ],
    );
    openSeat(k, 0.39);
    const wedges = 12;
    for (let i = 0; i < wedges; i++) {
      const panel = new ParametricGeometry(
        (u, v, point) => {
          const angle = ((i + u) / wedges) * Math.PI * 2;
          const r = 0.004 + v * 0.996;
          const scallop = 0.105 * Math.sin(u * Math.PI) * r ** 9;
          point.set(
            Math.cos(angle) * r * 1.13,
            2.12 - 0.4 * r ** 1.64 - scallop,
            -0.39 + Math.sin(angle) * r * 1.03,
          );
        },
        10,
        18,
      );
      k.mesh("roof", panel, [0, 0, 0], i % 2 ? k.accent : ivory);
    }
    for (const side of sides) {
      for (const z of [0.31, -1.07])
        k.bar(
          "roof",
          [side * 0.84, 0.47, z],
          [side * 0.68, 1.88, z],
          0.039,
          k.dark,
        );
      k.arch("chassis-front", side, 1.65, k.accent);
      k.arch(
        "chassis-rear",
        side,
        -1.65,
        finish(side > 0 ? 0x4abfa6 : 0xf3b33e),
      );
      for (const [x, color] of [
        [1.66, 0xf6c748],
        [1.81, 0x5fc7a9],
      ])
        k.tube(
          "chassis-front",
          Array.from({ length: 37 }, (_, i): XYZ => {
            const angle = 0.15 + (i / 36) * (Math.PI - 0.3);
            return [
              side * x,
              -0.59 + Math.sin(angle) * 1.346,
              1.65 + Math.cos(angle) * 1.346,
            ];
          }),
          0.042,
          finish(color),
          48,
        );
    }
    bumpers(k, k.steel, false);
    k.oval("bumper-front", [0.29, 0.29, 0.31], [0, 0.42, 2.68], k.red);
    const lights = [k.amber, glow(0x51bce4), glow(0x74de72), k.amber];
    for (const [i, x] of [-0.99, -0.59, 0.59, 0.99].entries())
      k.lamp("bumper-front", [x, 0.32, 2.6], 0.137, lights[i]);
  },
);

const sugarRush = vehicle(
  "sugar-rush",
  "Sugar Rush",
  "Pink-and-mint candy racer with a spiral lollipop and striped crash bars.",
  [0xef579a, 0x74dcbc, 0xeedacc, 0.76, 10],
  (k) => {
    const ivory = cream();
    shell(
      k,
      [
        [0.65, -0.14, 0.68, 1.17, 1.16],
        [2.59, -0.14, 0.47, 1, 1.1],
      ],
      [
        [-2.55, -0.18, 0.47, 1.1, 1.08],
        [-0.99, -0.14, 0.66, 1.17, 1.19],
      ],
    );
    bubble(k, [0, 0.65, -0.27], [1.08, 0.76, 1.29]);
    k.panel("roof", [0.84, 0.13, 0.36], [0, 1.34, -0.52], k.paint);
    k.bar("roof", [0, 1.38, -0.52], [0, 2.08, -0.52], 0.047, ivory);
    disk(k, "roof", [0, 2.15, -0.52], 0.36, k.accent);
    const swirl = Array.from({ length: 65 }, (_, i): XYZ => {
      const angle = (i / 64) * Math.PI * 5.3;
      const radius = 0.022 + (i / 64) * 0.282;
      return [
        radius * Math.cos(angle),
        2.15 + radius * Math.sin(angle),
        -0.455,
      ];
    });
    k.tube("roof", swirl, 0.024, k.paint, 100);
    fenders(k, k.accent);
    bumpers(k, ivory);
    for (const side of sides) {
      k.tube(
        "bumper-front",
        [
          [side * 0.43, -0.09, 2.83],
          [side * 0.46, 0.42, 2.81],
          [side * 0.57, 0.52, 2.8],
          [side * 0.68, 0.43, 2.8],
        ],
        0.07,
        ivory,
      );
      for (let i = 0; i < 4; i++)
        k.bar(
          "bumper-front",
          [side * 0.448, -0.022 + i * 0.107, 2.825],
          [side * 0.45, 0.016 + i * 0.107, 2.824],
          0.076,
          k.red,
        );
      for (let i = 0; i < 6; i++)
        k.oval(
          door(side),
          [0.055, 0.086, 0.085],
          [side * 1.224, 0.22, -1.02 + i * 0.35],
          i % 2 ? ivory : k.accent,
        );
    }
  },
);

const timberScout = vehicle(
  "timber-scout",
  "Timber Scout",
  "Moss-green forestry pickup with wood cladding and a strapped log load.",
  [0x596647, 0xd27d3a, 0x626968, 0.91, 8],
  (k) => {
    const wood = finish(0x875837, 0.88, 0);
    const cut = finish(0xc99b62, 0.88, 0);
    shell(
      k,
      [
        [0.86, -0.15, 0.67, 1.17, 1.16],
        [2.56, -0.2, 0.51, 1.13, 1.14],
      ],
      [
        [-2.62, -0.18, 0.35, 1.12, 1.18],
        [-0.84, -0.14, 0.4, 1.21, 1.24],
      ],
    );
    cabin(k, {
      front: 1.04,
      back: -0.91,
      height: 1.71,
      width: 1.1,
      slant: 0.26,
    });
    fenders(k, k.dark);
    bumpers(k, k.dark);
    for (const side of sides) {
      for (let i = 0; i < 3; i++)
        k.panel(
          door(side),
          [0.082, 0.125, 1.98],
          [side * 1.23, -0.052 + i * 0.132, -0.26],
          wood,
          0.018,
        );
      k.mesh(
        "bumper-front",
        new T.TorusGeometry(0.12, 0.042, 14, 48),
        [side * 0.69, -0.21, 2.83],
        k.accent,
      );
    }
    for (const x of [-0.59, 0, 0.59]) {
      k.bar("bed", [x, 0.64, -2.65], [x, 0.64, -0.98], 0.272, wood);
      disk(k, "bed", [x, 0.64, -2.65], 0.258, cut);
      for (const r of [0.09, 0.16, 0.21])
        k.mesh(
          "bed",
          new T.TorusGeometry(r, 0.009, 8, 40),
          [x, 0.64, -2.699],
          wood,
        );
    }
    for (const z of [-2.28, -1.29])
      k.tube(
        "bed",
        [
          [-0.88, 0.42, z],
          [-0.75, 0.84, z],
          [0, 0.91, z],
          [0.75, 0.84, z],
          [0.88, 0.42, z],
        ],
        0.041,
        k.dark,
      );
  },
);

const jackORacer = vehicle(
  "jack-o-racer",
  "Jack-o-Racer",
  "Pumpkin-bodied Halloween coupe with glowing eyes and a jagged grin.",
  [0xd96620, 0x657844, 0x57534b, 0.87, 8],
  (k) => {
    const light = glow(0xffb42d);
    shell(
      k,
      [
        [0.68, -0.14, 0.7, 1.17, 1.13],
        [2.51, -0.14, 0.48, 0.94, 1.05],
      ],
      [
        [-2.61, -0.17, 0.43, 1.06, 1.1],
        [-0.94, -0.15, 0.59, 1.2, 1.17],
      ],
    );
    bubble(k, [0, 0.73, -0.31], [1.04, 0.83, 1.32]);
    k.oval("roof", [0.94, 0.18, 0.98], [0, 1.48, -0.34]);
    k.tube(
      "roof",
      [
        [0, 1.61, -0.31],
        [-0.025, 1.78, -0.32],
        [0.16, 1.92, -0.34],
        [0.19, 2.03, -0.44],
      ],
      0.095,
      k.accent,
    );
    for (const x of [-0.75, -0.38, 0, 0.38, 0.75]) {
      const edge = Math.abs(x);
      k.oval(
        "hood",
        [0.37, 0.59 - edge * 0.23, 0.96 - edge * 0.28],
        [x, 0.41, 1.56],
      );
    }
    fenders(k, k.dark);
    bumpers(k, k.dark, false);
    k.panel("bumper-front", [1.45, 0.82, 0.112], [0, 0.49, 2.57], k.dark, 0.23);
    for (const side of sides)
      facePlate(
        k,
        "bumper-front",
        [
          [side * 0.11, 0.58],
          [side * 0.34, 0.85],
          [side * 0.56, 0.58],
        ],
        2.634,
        light,
      );
    facePlate(
      k,
      "bumper-front",
      [
        [-0.56, 0.48],
        [-0.31, 0.37],
        [-0.19, 0.48],
        [-0.06, 0.35],
        [0.13, 0.46],
        [0.27, 0.37],
        [0.56, 0.48],
        [0.42, 0.25],
        [0.1, 0.21],
        [-0.3, 0.24],
      ],
      2.634,
      light,
    );
  },
);

const sleighRunner = vehicle(
  "sleigh-runner",
  "Sleigh Runner",
  "Christmas sleigh with brass scrollwork and a bed full of wrapped gifts.",
  [0xa82331, 0xcdab56, 0x9d7e4a, 0.83, 8],
  (k) => {
    const brass = gold();
    const green = finish(0x326342, 0.75, 0.12);
    shell(
      k,
      [
        [0.69, -0.11, 0.65, 1.13, 1.11],
        [1.65, -0.17, 0.52, 1.11, 1.17],
        [2.59, -0.15, 0.87, 1, 0.82],
      ],
      [
        [-2.59, -0.14, 0.65, 1.03, 1.08],
        [-1.07, -0.11, 0.41, 1.13, 1.2],
      ],
    );
    openSeat(k, 0, -0.35, green);
    k.panel(
      "roof",
      [1.5, 0.71, 0.15],
      [0, 0.83, -0.87],
      k.paint,
      0.065,
    ).rotation.x = -0.21;
    k.bar("roof", [-0.73, 1.16, -0.97], [0.73, 1.16, -0.97], 0.052, brass);
    fenders(k);
    bumpers(k, brass);
    for (const side of sides)
      k.tube(
        door(side),
        [
          [side * 1.33, -0.29, -1.42],
          [side * 1.34, -0.28, 0.96],
          [side * 1.34, -0.05, 1.62],
          [side * 1.32, 0.38, 1.74],
          [side * 1.31, 0.48, 1.5],
        ],
        0.052,
        brass,
        60,
      );
    crate(k, [-0.56, 0.67, -1.79], [0.61, 0.54, 0.71], green, brass);
    crate(
      k,
      [0.48, 0.68, -1.93],
      [0.69, 0.55, 0.59],
      finish(0xe3cfa2),
      k.paint,
    );
    crate(k, [0.25, 1.04, -1.83], [0.42, 0.32, 0.45], finish(0x4a8c94), brass);
  },
);

const harborSkiff = vehicle(
  "harbor-skiff",
  "Harbor Skiff",
  "Road-going blue skiff with a pointed bow, wheelhouse, and side lifebuoys.",
  [0x32658e, 0xffefd1, 0x77898e, 0.78, 8],
  (k) => {
    shell(
      k,
      [
        [0.78, -0.23, 0.72, 0.9, 1.22],
        [1.83, -0.23, 0.74, 0.65, 0.95],
        [2.66, -0.05, 0.66, 0.18, 0.27],
      ],
      [
        [-2.62, -0.12, 0.47, 0.86, 1.12],
        [-1.07, -0.18, 0.5, 0.95, 1.24],
      ],
    );
    cabin(
      k,
      { front: 0.93, back: -1.04, height: 1.56, width: 0.99, slant: 0.29 },
      k.accent,
    );
    sideStripe(k, 0.47, 2.23);
    fenders(k, k.dark);
    bumpers(k, k.dark);
    for (const side of sides) {
      k.tube(
        "hood",
        [
          [side * 1.21, 0.71, 0.77],
          [side * 0.95, 0.74, 1.78],
          [side * 0.28, 0.68, 2.62],
        ],
        0.054,
        k.accent,
      );
      const ring = new T.TorusGeometry(0.211, 0.066, 18, 64);
      k.mesh(door(side), ring, [side * 1.295, 0.27, -0.42], k.red).rotation.y =
        Math.PI / 2;
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5])
        k.oval(
          door(side),
          [0.072, 0.072, 0.073],
          [
            side * 1.304,
            0.27 + Math.sin(angle) * 0.211,
            -0.42 + Math.cos(angle) * 0.211,
          ],
          k.accent,
        );
    }
    k.bar("bed", [-1.06, 0.62, -2.56], [1.06, 0.62, -2.56], 0.048, k.accent);
    k.bar("bed", [0.57, 0.46, -2.32], [0.57, 0.64, -2.32], 0.056, k.dark);
    k.bar("bed", [0.57, 0.64, -2.32], [0.57, 0.64, -1.84], 0.043, k.steel);
  },
);

const foundryHauler = vehicle(
  "foundry-hauler",
  "Foundry Hauler",
  "Industrial hauler with radiator fins, hazard stripes, and exposed hydraulics.",
  [0xe2a336, 0x5c6160, 0x6c6553, 0.91, 6],
  (k) => {
    shell(
      k,
      [
        [0.66, -0.22, 0.69, 1.19, 1.21],
        [2.54, -0.25, 0.64, 1.2, 1.19],
      ],
      [
        [-2.63, -0.21, 0.24, 1.21, 1.23],
        [-0.97, -0.17, 0.26, 1.23, 1.25],
      ],
    );
    cabin(
      k,
      { front: 1.28, back: -0.93, height: 1.88, width: 1.06, slant: 0.21 },
      k.accent,
    );
    fenders(k, k.dark, true);
    bumpers(k, k.accent);
    k.panel("hood", [1.16, 0.49, 0.115], [0, 0.4, 2.578], k.dark, 0.05);
    for (let i = 0; i < 11; i++)
      k.panel(
        "hood",
        [0.97, 0.023, 0.032],
        [0, 0.213 + i * 0.036, 2.644],
        k.steel,
        0.007,
      );
    for (const x of [-0.8, -0.41, 0, 0.41, 0.8])
      k.panel(
        "bumper-front",
        [0.112, 0.16, 0.031],
        [x, -0.105, 2.807],
        k.paint,
        0.008,
      ).rotation.z = -0.57;
    for (const side of sides) {
      k.bar(
        "bed",
        [side * 0.61, 0.31, -2.49],
        [side * 0.61, 0.84, -1.43],
        0.117,
        k.dark,
      );
      k.bar(
        "bed",
        [side * 0.61, 0.72, -1.67],
        [side * 0.61, 0.99, -1.14],
        0.062,
        k.steel,
      );
      k.panel(
        door(side),
        [0.31, 0.12, 0.8],
        [side * 1.265, -0.21, 0.1],
        k.steel,
      );
      for (let i = 0; i < 5; i++)
        k.bar(
          door(side),
          [side * 1.19, -0.145, -0.22 + i * 0.151],
          [side * 1.41, -0.145, -0.22 + i * 0.151],
          0.019,
          k.dark,
        );
    }
  },
);

const cinderCrawler = vehicle(
  "cinder-crawler",
  "Cinder Crawler",
  "Angular basalt crawler with bright magma seams and twin exhausts.",
  [0x383435, 0xfa6522, 0x544e4c, 0.94, 8],
  (k) => {
    const magma = glow(0xff5c1a);
    shell(
      k,
      [
        [0.77, -0.19, 0.75, 1.22, 1.08],
        [1.57, -0.22, 0.56, 1.29, 1.13],
        [2.59, -0.17, 0.31, 1.01, 0.86],
      ],
      [
        [-2.59, -0.16, 0.37, 1.08, 1.16],
        [-1.06, -0.18, 0.65, 1.24, 1.11],
      ],
    );
    cabin(k, {
      front: 1.03,
      back: -1.53,
      height: 1.46,
      width: 1.01,
      slant: 0.54,
    });
    fenders(k, k.dark, true);
    bumpers(k, k.dark, false);
    k.panel("bumper-front", [1.57, 0.073, 0.07], [0, 0.2, 2.72], magma);
    for (const side of sides) {
      k.tube(
        "hood",
        [
          [side * 0.18, 0.33, 2.54],
          [side * 0.31, 0.49, 1.91],
          [side * 0.19, 0.59, 1.51],
          [side * 0.53, 0.69, 1.13],
          [side * 0.64, 0.75, 0.86],
        ],
        0.027,
        magma,
        58,
      );
      k.tube(
        door(side),
        [
          [side * 1.237, 0.06, -1.18],
          [side * 1.237, 0.14, -0.63],
          [side * 1.237, 0.077, -0.2],
          [side * 1.237, 0.28, 0.84],
        ],
        0.03,
        magma,
        52,
      );
      k.tube(
        "bed",
        [
          [side * 0.74, 0.49, -1.22],
          [side * 0.88, 0.72, -1.72],
          [side * 0.87, 1.15, -2.12],
        ],
        0.1,
        k.steel,
      );
      k.oval("bed", [0.13, 0.04, 0.128], [side * 0.87, 1.155, -2.12], magma);
    }
  },
);

const haywireTractor = vehicle(
  "haywire-tractor",
  "Haywire Tractor",
  "Vintage green tractor with a narrow bonnet, upright exhaust, and cream hubs.",
  [0x568244, 0xf0ce79, 0xe3be63, 0.88, 6],
  (k) => {
    shell(
      k,
      [
        [0.52, -0.11, 0.86, 0.69, 0.67],
        [2.51, -0.13, 0.72, 0.62, 0.61],
      ],
      [
        [-2.49, -0.14, 0.37, 0.94, 0.97],
        [-1.03, -0.13, 0.39, 0.94, 0.99],
      ],
      k.dark,
    );
    k.oval("hood", [0.67, 0.26, 1.04], [0, 0.69, 1.53]);
    openSeat(k, 0, -0.61);
    canopy(k, -0.56, 1.56, 1.16, 1.7, k.accent);
    for (const side of sides) k.arch("chassis-rear", side, -1.65, k.paint);
    bumpers(k, k.dark, false);
    k.panel("hood", [1.14, 0.69, 0.125], [0, 0.34, 2.54], k.dark, 0.13);
    for (let i = -5; i <= 5; i++)
      k.bar(
        "hood",
        [i * 0.082, 0.08, 2.625],
        [i * 0.082, 0.61, 2.625],
        0.02,
        k.steel,
      );
    stack(k, "hood", 0.38, 1.06, 1.73, k.dark);
    for (const side of sides) {
      k.lamp("hood", [side * 0.65, 0.47, 2.46], 0.147, k.amber);
      k.panel(
        door(side),
        [0.29, 0.097, 0.7],
        [side * 1.27, -0.22, -0.35],
        k.steel,
      );
      k.shock(
        "chassis-front",
        [side * 0.81, 0.38, 1.65],
        [side * 1.45, -0.64, 1.65],
        k.accent,
      );
    }
  },
);

const gildedArrow = vehicle(
  "gilded-arrow",
  "Gilded Arrow",
  "Art Deco streamliner with a brass grille, stepped trim, and gold-edged spats.",
  [0x323b44, 0xcda354, 0x998364, 0.76, 10],
  (k) => {
    const brass = gold();
    shell(
      k,
      [
        [0.81, -0.13, 0.64, 1.19, 1.09],
        [1.9, -0.13, 0.58, 1.07, 1.01],
        [2.6, -0.13, 0.4, 0.65, 0.65],
      ],
      [
        [-2.68, -0.15, 0.33, 0.93, 0.96],
        [-1.84, -0.11, 0.58, 1.22, 1.14],
        [-0.89, -0.12, 0.65, 1.18, 1.14],
      ],
    );
    k.oval("hood", [0.86, 0.31, 1.04], [0, 0.39, 1.56]);
    bubble(k, [0, 0.64, -0.19], [1.03, 0.71, 1.49]);
    k.oval("roof", [0.92, 0.13, 1.04], [0, 1.24, -0.53], k.paint);
    fenders(k, k.paint);
    bumpers(k, brass, false);
    k.panel("hood", [0.72, 0.67, 0.115], [0, 0.36, 2.63], k.dark, 0.13);
    for (let i = -4; i <= 4; i++)
      k.bar(
        "hood",
        [i * 0.065, 0.088, 2.708],
        [i * 0.065, 0.61, 2.708],
        0.015,
        brass,
      );
    for (const side of sides) {
      k.lamp("hood", [side * 0.71, 0.43, 2.38], 0.155);
      for (const [part, axle] of [
        ["chassis-front", 1.65],
        ["chassis-rear", -1.65],
      ] as const) {
        const arch = Array.from({ length: 35 }, (_, i): [number, number] => {
          const angle = 0.19 + (i / 34) * (Math.PI - 0.38);
          return [
            axle + Math.cos(angle) * 1.27,
            -0.64 + Math.sin(angle) * 1.27,
          ];
        });
        k.profile(
          part,
          [...arch, [axle - 1.22, -0.69], [axle + 1.22, -0.69]],
          0.115,
          side * 2.03,
          k.paint,
          0.056,
        );
        k.tube(
          part,
          arch.map(
            ([z, y]): XYZ => [
              side * 2.109,
              y - 0.025,
              z * 0.985 + axle * 0.015,
            ],
          ),
          0.032,
          brass,
          54,
        );
        k.bar(
          part,
          [side * 2.102, -0.64, axle - 1.15],
          [side * 2.102, -0.64, axle + 1.15],
          0.024,
          brass,
        );
      }
      k.profile(
        "bed",
        [
          [-2.64, 0.28],
          [-1.13, 0.52],
          [-2.58, 0.83],
        ],
        0.12,
        side * 1.03,
        brass,
        0.046,
      );
      for (let i = 0; i < 3; i++)
        k.panel(
          door(side),
          [0.064, 0.047, 2.15 - i * 0.25],
          [side * 1.238, 0.03 + i * 0.11, -0.14],
          brass,
          0.015,
        );
    }
  },
);

const runwayRacer = vehicle(
  "runway-racer",
  "Runway Racer",
  "Aviation-inspired racer with a red nose, bubble canopy, and riveted winglets.",
  [0xb5c3c9, 0xcb392e, 0x75858a, 0.77, 10],
  (k) => {
    shell(
      k,
      [
        [0.68, -0.2, 0.66, 1.17, 1.02],
        [1.81, -0.2, 0.49, 0.9, 0.83],
        [2.57, -0.16, 0.22, 0.55, 0.47],
      ],
      [
        [-2.66, -0.17, 0.23, 0.83, 0.8],
        [-1.07, -0.2, 0.63, 1.16, 1.1],
      ],
    );
    k.oval("hood", [0.96, 0.5, 1.74], [0, 0.27, 0.64]);
    k.oval("hood", [0.73, 0.43, 0.78], [0, 0.26, 2.03], k.accent);
    bubble(k, [0, 0.65, -0.12], [0.99, 0.69, 1.32]);
    fenders(k, k.paint);
    bumpers(k, k.steel);
    k.panel("bed", [2.24, 0.085, 0.39], [0, 0.92, -2.37], k.accent);
    k.profile(
      "bed",
      [
        [-2.67, 0.39],
        [-1.96, 0.44],
        [-2.42, 1.49],
        [-2.64, 1.51],
      ],
      0.112,
      0,
      k.accent,
      0.04,
    );
    for (const side of sides) {
      k.profile(
        "bed",
        [
          [-2.62, 0.32],
          [-2.12, 0.34],
          [-2.27, 0.96],
          [-2.61, 1.03],
        ],
        0.105,
        side * 0.64,
        k.steel,
      );
      k.panel(
        door(side),
        [0.59, 0.091, 1.43],
        [side * 1.36, 0.18, -0.13],
        k.steel,
        0.042,
      ).rotation.y = side * 0.21;
      k.panel(
        door(side),
        [0.143, 0.094, 0.92],
        [side * 1.62, 0.18, -0.23],
        k.accent,
        0.033,
      ).rotation.y = side * 0.21;
      for (let i = 0; i < 9; i++)
        k.bar(
          door(side),
          [side * 1.208, 0.35, -1.12 + i * 0.23],
          [side * 1.246, 0.35, -1.12 + i * 0.23],
          0.018,
          k.steel,
        );
    }
  },
);

export const THEMED_VEHICLES = [
  canopyRunner,
  duneRaider,
  frostPatrol,
  prismRacer,
  sunChariot,
  rocketCoupe,
  orbitalRover,
  runeDrifter,
  toonTaxi,
  bigTopBuggy,
  sugarRush,
  timberScout,
  jackORacer,
  sleighRunner,
  harborSkiff,
  foundryHauler,
  cinderCrawler,
  haywireTractor,
  gildedArrow,
  runwayRacer,
] as const;
