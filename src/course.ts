import { comicHazards } from "./comic-hazards.ts";
import { slideProfileY } from "./tracks.ts";
import type { Track, TrackId } from "./tracks.ts";
import type { Hazard } from "./hazards.ts";
import type { PropDefinition, PropKind } from "./destructibles.ts";
import {
  PROP_PREFAB_KINDS,
  customTrackIds,
} from "./custom-level.ts";
export type CourseSolid = {
  id: string;
  kind:
    | "ground"
    | "road"
    | "container"
    | "barrier"
    | "ramp"
    | "support"
    | "lava";
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  yaw?: number;
  angle?: number;
  roll?: number;
  color: number;
  texture?: string;
};
export const courseAvailable = (id: string) =>
  [
    "harbor-sprint",
    "foundry-run",
    "skyline-circuit",
    "scrapyard-sweep",
    "inferno-vault",
    "canyon-plunge",
    "haunted-hollow",
    "sky-slide",
  ].includes(id) || customTrackIds().includes(id);
export function courseSolids(track: Track): CourseSolid[] {
  if (track.custom) return track.custom.solids.map((s) => ({ ...s }));
  if (!courseAvailable(track.id))
    throw new Error(`Course not implemented: ${track.id}`);
  const solids: CourseSolid[] = [
    {
      id: "ground",
      kind: "ground",
      x: 0,
      y: -0.6,
      z: 100,
      w: 500,
      h: 1.2,
      d: 850,
      color: 0x6d817c,
    },
  ];
  for (
    let i = 1;
    track.mode === "race" &&
    track.id !== "canyon-plunge" &&
    track.id !== "sky-slide" &&
    i < track.path.length;
    i++
  ) {
    const a = track.path[i - 1],
      b = track.path[i];
    solids.push({
      id: `road-${i}`,
      kind: "road",
      x: (a.x + b.x) / 2,
      y: 0.015,
      z: (a.z + b.z) / 2,
      w: 24,
      h: 0.03,
      d: Math.hypot(b.x - a.x, b.z - a.z) + 3,
      yaw: Math.atan2(b.x - a.x, b.z - a.z),
      color: 0x303e49,
    });
  }
  if (track.id === "harbor-sprint") {
    for (let i = 0; i < 9; i++)
      for (const side of [-1, 1])
        solids.push({
          id: `cargo-${side}-${i}`,
          kind: "container",
          x: side * (45 + (i % 3) * 8),
          y: 2.6,
          z: -65 + i * 45,
          w: 8,
          h: 5.2,
          d: 16,
          color: side === 1 ? 0x497fa3 : 0xac623f,
        });
    // Actual chicane structures flank the gates, leaving the center route open.
    for (const [x, z] of [
      [-16, 30],
      [25, 82],
      [-5, 155],
      [40, 220],
    ])
      solids.push({
        id: `chicane-${z}`,
        kind: "barrier",
        x,
        y: 0.8,
        z,
        w: 6,
        h: 1.6,
        d: 5,
        color: 0xe6c16a,
      });
  }
  if (track.id === "foundry-run") {
    solids[0].color = 0x665d55;
    solids.push({
      id: "launch-ramp",
      kind: "ramp",
      x: 0,
      y: 0.7,
      z: -20,
      w: 16,
      h: 0.35,
      d: 12,
      angle: -Math.atan2(1.5, 12),
      color: 0x8c6858,
    });
    for (let i = 0; i < 8; i++)
      for (const side of [-1, 1])
        solids.push({
          id: `foundry-block-${side}-${i}`,
          kind: "container",
          x: side * 44,
          y: 3,
          z: -65 + i * 48,
          w: 12,
          h: 6,
          d: 20,
          color: 0x735e50,
        });
    solids.push({
      id: "machinery-base",
      kind: "support",
      x: 24,
      y: 1.5,
      z: 90,
      w: 1,
      h: 3,
      d: 1,
      color: 0x323d3d,
    });
    for (const side of [-1, 1])
      solids.push({
        id: `fire-pylon-${side}`,
        kind: "support",
        x: side * 5.4,
        y: 0.34,
        z: 150,
        w: 0.45,
        h: 0.68,
        d: 0.65,
        color: 0x303b3b,
      });
    for (const [x, z] of [
      [-10, 60],
      [28, 112],
      [-28, 205],
    ])
      solids.push({
        id: `steel-block-${z}`,
        kind: "barrier",
        x,
        y: 1,
        z,
        w: 7,
        h: 2,
        d: 6,
        color: 0x907250,
      });
  }
  if (track.id === "skyline-circuit") {
    solids[0].color = 0x5a6970;
    for (const radius of [64, 96])
      for (let i = 0; i < 48; i++) {
        const angle = (i * Math.PI) / 24;
        solids.push({
          id: `circuit-rail-${radius}-${i}`,
          kind: "barrier",
          x: radius * Math.sin(angle),
          y: 0.7,
          z: -radius * Math.cos(angle),
          w: 1.2,
          h: 1.4,
          d: (radius * 2 * Math.PI) / 48 + 1,
          yaw: Math.PI / 2 - angle,
          color: i % 2 ? 0xd8dfe1 : track.color,
        });
      }
    for (const [x, z] of [
      [69, -8],
      [91, 8],
    ])
      solids.push({
        id: `chicane-${x}`,
        kind: "barrier",
        x,
        y: 0.6,
        z,
        w: 5,
        h: 1.2,
        d: 4,
        color: track.color,
      });
    for (let i = 0; i < 7; i++)
      for (const side of [-1, 1])
        solids.push({
          id: `tower-${side}-${i}`,
          kind: "container",
          x: side * (130 + (i % 2) * 15),
          y: 10 + i * 2,
          z: -120 + i * 40,
          w: 16,
          h: 20 + i * 4,
          d: 22,
          color: 0x758594,
        });
  }
  if (track.id === "scrapyard-sweep") {
    solids[0].color = 0x716a53;
    for (const [i, p] of [
      [65, -50],
      [65, -10],
      [65, 30],
      [-65, -50],
      [-65, 10],
      [-65, 55],
      [10, 90],
      [-30, 85],
      [15, -12],
      [-35, 80],
    ].entries())
      solids.push({
        id: `scrap-stack-${i}`,
        kind: "container",
        x: p[0],
        y: 1.8,
        z: p[1],
        w: 7,
        h: 3.6,
        d: 8,
        color: i % 2 ? 0x857041 : 0x5d7053,
      });
    for (const side of [-1, 1]) {
      solids.push({
        id: `fence-x-${side}`,
        kind: "barrier",
        x: side * 90,
        y: 1,
        z: 0,
        w: 1,
        h: 2,
        d: 222,
        color: 0x655d4b,
      });
      solids.push({
        id: `fence-z-${side}`,
        kind: "barrier",
        x: 0,
        y: 1,
        z: side * 110,
        w: 180,
        h: 2,
        d: 1,
        color: 0x655d4b,
      });
    }
  }
  if (track.id === "inferno-vault") {
    solids[0].color = 0x5e5856;
    for (const x of [-25, 25]) {
      solids.push({
        id: `vault-lava-${x}`,
        kind: "lava",
        x,
        y: -4.8,
        z: 20,
        w: 16,
        h: 1.2,
        d: 20,
        color: 0xff6a20,
      });
      solids.push({
        id: `vault-floor-${x}`,
        kind: "support",
        x,
        y: -5.6,
        z: 20,
        w: 16,
        h: 0.4,
        d: 20,
        color: 0x77716c,
      });
      for (const side of [-1, 1]) {
        solids.push({
          id: `vault-wall-x-${x}-${side}`,
          kind: "support",
          x: x + side * 8.5,
          y: -2.7,
          z: 20,
          w: 1,
          h: 5.6,
          d: 22,
          color: 0x77716c,
        });
        solids.push({
          id: `vault-wall-z-${x}-${side}`,
          kind: "support",
          x,
          y: -2.7,
          z: 20 + side * 10.5,
          w: 16,
          h: 5.6,
          d: 1,
          color: 0x77716c,
        });
      }
    }
    for (const z of [-50, 55])
      for (const side of [-1, 1])
        solids.push({
          id: `vault-pylon-${z}-${side}`,
          kind: "support",
          x: side * 5.4,
          y: 0.34,
          z,
          w: 0.45,
          h: 0.68,
          d: 0.65,
          color: 0x303b3b,
        });
    solids.push({
      id: "vault-hammer-base",
      kind: "support",
      x: -76,
      y: 1.5,
      z: 0,
      w: 1,
      h: 3,
      d: 1,
      color: 0x303b3b,
    });
    for (const side of [-1, 1])
      solids.push({
        id: `vault-boundary-${side}`,
        kind: "barrier",
        x: side * 110,
        y: 1,
        z: 10,
        w: 1,
        h: 2,
        d: 250,
        color: 0x837361,
      });
    for (let i = 0; i < 5; i++)
      solids.push({
        id: `vault-store-${i}`,
        kind: "container",
        x: 90,
        y: 2,
        z: -75 + i * 42,
        w: 10,
        h: 4,
        d: 16,
        color: 0x75664d,
      });
  }
  if (track.id === "canyon-plunge") {
    solids[0] = {
      id: "ground",
      kind: "ground",
      x: 0,
      y: -0.6,
      z: 272.5,
      w: 400,
      h: 1.2,
      d: 1145,
      color: 0x8a6f52,
    };
    solids.push({
      id: "ground-far",
      kind: "ground",
      x: 0,
      y: -0.6,
      z: 1733.5,
      w: 400,
      h: 1.2,
      d: 1733,
      color: 0x8a6f52,
    });
    // Elevated ramp: surface falls 80 -> 16 over z -100..845.
    solids.push({
      id: "plunge-ramp",
      kind: "ramp",
      x: 0,
      y: 49.016,
      z: 357.5,
      w: 20,
      h: 0.5,
      d: 977,
      angle: Math.atan2(64, 945),
      color: 0x8c6858,
    });
    for (const side of [-1, 1])
      solids.push({
        id: `ramp-rail-${side}`,
        kind: "barrier",
        x: side * 11,
        y: 50.016,
        z: 357.5,
        w: 0.6,
        h: 2,
        d: 977,
        angle: Math.atan2(64, 945),
        color: 0xe6c16a,
      });
    for (const z of [-50, 70, 190, 310, 430, 550, 670, 790]) {
      const surf = 80 - (z + 100) * (64 / 945);
      solids.push({
        id: `ramp-pier-${z}`,
        kind: "support",
        x: 0,
        y: surf / 2,
        z,
        w: 4,
        h: surf,
        d: 4,
        color: 0x5d6a72,
      });
    }
    // Launch kicker at the lip.
    solids.push({
      id: "plunge-kicker",
      kind: "ramp",
      x: 0,
      y: 17.3,
      z: 841,
      w: 16,
      h: 0.4,
      d: 10,
      angle: -0.35,
      color: 0x8c6858,
    });
    // Canyon gorge: cliff faces and floor.
    solids.push(
      {
        id: "gorge-near",
        kind: "support",
        x: 0,
        y: -2,
        z: 844,
        w: 400,
        h: 36,
        d: 2,
        color: 0x6e5138,
      },
      {
        id: "gorge-far",
        kind: "support",
        x: 0,
        y: -10,
        z: 868,
        w: 400,
        h: 20,
        d: 2,
        color: 0x6e5138,
      },
      {
        id: "gorge-floor",
        kind: "support",
        x: 0,
        y: -20.6,
        z: 856,
        w: 400,
        h: 1.2,
        d: 24,
        color: 0x2e2620,
      },
    );
    // Runout upslope, taper back to the road, and far road.
    solids.push({
      id: "plunge-runout",
      kind: "ramp",
      x: 0,
      y: 2,
      z: 893.5,
      w: 24,
      h: 0.5,
      d: 53.2,
      angle: -Math.atan2(4, 53),
      color: 0x8c6858,
    });
    solids.push({
      id: "plunge-taper",
      kind: "ramp",
      x: 0,
      y: 2,
      z: 945,
      w: 24,
      h: 0.5,
      d: 50.2,
      angle: Math.atan2(4, 50),
      color: 0x8c6858,
    });
    solids.push({
      id: "road-far",
      kind: "road",
      x: 0,
      y: 0.015,
      z: 1700,
      w: 24,
      h: 0.03,
      d: 1650,
      color: 0x303e49,
    });
    for (const side of [-1, 1])
      solids.push({
        id: `plunge-rail-${side}`,
        kind: "barrier",
        x: side * 14,
        y: 1,
        z: 1690,
        w: 1,
        h: 2,
        d: 1620,
        color: 0xe6c16a,
      });
    for (const side of [-1, 1])
      solids.push({
        id: `plunge-start-${side}`,
        kind: "barrier",
        x: side * 12,
        y: 44,
        z: -100,
        w: 2,
        h: 88,
        d: 2,
        color: 0xe08a4c,
      });
    solids.push({
      id: "plunge-start-beam",
      kind: "barrier",
      x: 0,
      y: 88.5,
      z: -100,
      w: 26,
      h: 1,
      d: 2,
      color: 0xe08a4c,
    });
    for (const side of [-1, 1])
      solids.push({
        id: `plunge-finish-${side}`,
        kind: "barrier",
        x: side * 13,
        y: 4,
        z: 2500,
        w: 2,
        h: 8,
        d: 2,
        color: 0xe8e4da,
      });
    for (const [i, z] of [950, 1050, 1400, 1600, 1800, 2000].entries()) {
      for (const side of [-1, 1])
        solids.push({
          id: `axe-post-${i}-${side}`,
          kind: "barrier",
          x: side * 15.5,
          y: 6.5,
          z,
          w: 1.5,
          h: 13,
          d: 1.5,
          color: 0x4a545c,
        });
      solids.push({
        id: `axe-beam-${i}`,
        kind: "barrier",
        x: 0,
        y: 13,
        z,
        w: 32.5,
        h: 1,
        d: 1.5,
        color: 0x4a545c,
      });
      solids.push({
        id: `axe-hanger-${i}`,
        kind: "barrier",
        x: 0,
        y: 11,
        z,
        w: 0.8,
        h: 3,
        d: 0.8,
        color: 0x4a545c,
      });
    }
  }
  if (track.id === "haunted-hollow") {
    // Perimeter fence.
    for (const [id, x, z, w, d] of [
      ["fence-n", 0, -120, 344, 2],
      ["fence-s", 0, 140, 344, 2],
      ["fence-w", -170, 10, 2, 264],
      ["fence-e", 170, 10, 2, 264],
    ] as [string, number, number, number, number][])
      solids.push({
        id,
        kind: "barrier",
        x,
        y: 1.25,
        z,
        w,
        h: 2.5,
        d,
        color: 0x3a3340,
      });
    // Mausoleum in the back corner, clear of the start and racing lines.
    solids.push(
      {
        id: "crypt-base",
        kind: "barrier",
        x: 120,
        y: 2,
        z: -105,
        w: 12,
        h: 4,
        d: 9,
        color: 0x5a5f66,
      },
      {
        id: "crypt-roof",
        kind: "barrier",
        x: 120,
        y: 4.75,
        z: -105,
        w: 13,
        h: 1.5,
        d: 10,
        color: 0x43484e,
      },
      {
        id: "crypt-door",
        kind: "barrier",
        x: 120,
        y: 1.5,
        z: -100.2,
        w: 3,
        h: 3,
        d: 0.4,
        color: 0x14161c,
      },
    );
    // Dead trees near the edges, clear of the racing lines.
    const trees: [number, number][] = [
      [-165, -60],
      [165, -60],
      [-165, 0],
      [165, 0],
      [-165, 60],
      [165, 60],
      [-40, 120],
      [40, 120],
    ];
    trees.forEach(([x, z], i) =>
      solids.push({
        id: `dead-tree-${i}`,
        kind: "support",
        x,
        y: 4,
        z,
        w: 1.2,
        h: 8,
        d: 1.2,
        color: 0x2b2620,
      }),
    );
  }
  if (track.id === "sky-slide") {
    // Finish pad only: no ground anywhere under the slide, so edge falls
    // reach the wreck plane.
    solids[0] = {
      id: "ground",
      kind: "ground",
      x: 0,
      y: -0.6,
      z: 2380,
      w: 60,
      h: 1.2,
      d: 160,
      color: 0x4a7d5b,
    };
    // Water channel: one pitched ramp per path segment, overlapping at joints.
    for (let i = 1; i < track.path.length; i++) {
      const a = track.path[i - 1],
        b = track.path[i],
        ya = slideProfileY(a.z),
        yb = slideProfileY(b.z),
        len = Math.hypot(b.x - a.x, b.z - a.z);
      solids.push({
        id: `slide-${i}`,
        kind: "ramp",
        x: (a.x + b.x) / 2,
        y: (ya + yb) / 2,
        z: (a.z + b.z) / 2,
        w: 18,
        h: 0.5,
        d: len + 12,
        yaw: Math.atan2(b.x - a.x, b.z - a.z),
        angle: Math.atan2(ya - yb, len),
        color: 0x4fb8ff,
      });
    }
    // Taper glides the channel down into the pad so the slide tip never
    // high-centers the truck.
    solids.push({
      id: "slide-taper",
      kind: "ramp",
      x: 0,
      y: 1.0,
      z: 2312,
      w: 18,
      h: 0.5,
      d: 26,
      angle: Math.atan2(1.9, 24),
      color: 0x4fb8ff,
    });
    // Support piers every 200 m, stopping a meter under the channel surface.
    for (let pier = 0; pier <= 12; pier++) {
      const z = -100 + pier * 200;
      if (z > 2250) continue;
      let x = track.path[0].x;
      for (let i = 1; i < track.path.length; i++) {
        const a = track.path[i - 1],
          b = track.path[i];
        if (z >= a.z && z <= b.z) {
          const t = (z - a.z) / (b.z - a.z);
          x = a.x + (b.x - a.x) * t;
          break;
        }
      }
      const surf = slideProfileY(z);
      solids.push({
        id: `slide-pier-${pier}`,
        kind: "support",
        x,
        y: (surf - 31) / 2,
        z,
        w: 6,
        h: surf + 29,
        d: 6,
        color: 0x5d6a72,
      });
    }
    for (const side of [-1, 1]) {
      solids.push({
        id: `slide-start-${side}`,
        kind: "barrier",
        x: side * 12,
        y: 102,
        z: -100,
        w: 2,
        h: 8,
        d: 2,
        color: 0x4fb8ff,
      });
      solids.push({
        id: `slide-finish-${side}`,
        kind: "barrier",
        x: side * 10,
        y: 4,
        z: 2360,
        w: 2,
        h: 8,
        d: 2,
        color: 0xffd34d,
      });
    }
    solids.push({
      id: "slide-start-beam",
      kind: "barrier",
      x: 0,
      y: 107,
      z: -100,
      w: 26,
      h: 1,
      d: 2,
      color: 0x4fb8ff,
    });
  }
  for (const water of comicHazards(track).filter((h) => h.kind === "water"))
    for (const direction of [-1, 1])
      solids.push({
        id: `${water.id}-approach-${direction}`,
        kind: "road",
        x: water.x,
        y: 0.015,
        z: water.z + direction * 29,
        w: 12,
        h: 0.03,
        d: 32,
        color: 0xc3c4c5,
      });
  // Subtract water-road apertures from the concrete, so failed skims really sink.
  let result = solids;
  const apertures = [
    ...comicHazards(track)
      .filter((h) => h.kind === "water")
      .map((h) => ({ x: h.x, z: h.z, w: 14, d: 26 })),
    ...solids
      .filter((s) => s.kind === "lava")
      .map((s) => ({ ...s, w: s.w + 2, d: s.d + 2 })),
  ];
  for (const water of apertures) {
    result = result.flatMap((s) => {
      if (s.kind !== "ground") return [s];
      const left = s.x - s.w / 2,
        right = s.x + s.w / 2,
        near = s.z - s.d / 2,
        far = s.z + s.d / 2;
      const a = Math.max(left, water.x - water.w / 2),
        b = Math.min(right, water.x + water.w / 2),
        c = Math.max(near, water.z - water.d / 2),
        d = Math.min(far, water.z + water.d / 2);
      if (a >= b || c >= d) return [s];
      return [
        [left, a, near, far],
        [b, right, near, far],
        [a, b, near, c],
        [a, b, d, far],
      ]
        .filter(([l, r, n, f]) => r > l && f > n)
        .map(([l, r, n, f], i) => ({
          ...s,
          id: `${s.id}${i ? `-${i}` : ""}`,
          x: (l + r) / 2,
          z: (n + f) / 2,
          w: r - l,
          d: f - n,
        }));
    });
  }
  return result;
}
export function courseHazards(track: Track): Hazard[] {
  if (track.custom)
    return track.custom.prefabs
      .filter((p) => p.kind === "hammer")
      .map((p) => ({
        id: p.id,
        route: track.id,
        kind: "hammer" as const,
        x: p.x,
        y: p.y ?? 3.5,
        z: p.z,
      }));
  if (track.id === "inferno-vault")
    return [
      {
        id: "vault-hammer",
        route: track.id,
        kind: "hammer",
        x: -76,
        y: 3.5,
        z: 0,
      },
      ...[-50, 55].map((z) => ({
        id: `vault-fire-${z}`,
        route: track.id,
        kind: "fire" as const,
        x: 0,
        y: 2,
        z,
        period: 6,
        duration: 3,
      })),
    ];
  return track.id === "foundry-run"
    ? [
        {
          id: "foundry-hammer",
          route: track.id,
          kind: "hammer",
          x: 24,
          y: 3.5,
          z: 90,
        },
        {
          id: "foundry-flame",
          route: track.id,
          kind: "fire",
          x: 0,
          y: 2,
          z: 150,
          period: 6,
          duration: 3,
        },
      ]
    : [];
}
export function courseProps(track: Track): PropDefinition[] {
  if (track.custom) {
    const stones = (track.custom.demolish ?? []).map((p, i) => ({
      id: `stone-${i + 1}`,
      kind: "gravestone" as const,
      x: p.x,
      z: p.z,
      ground: 0,
    }));
    const prefabs = track.custom.prefabs
      .filter((p) =>
        (PROP_PREFAB_KINDS as readonly string[]).includes(p.kind),
      )
      .map((p) => ({
        id: p.id,
        kind: p.kind as PropKind,
        x: p.x,
        z: p.z,
        ground: p.y ?? 0,
        ...(p.yaw === undefined ? {} : { yaw: p.yaw }),
      }));
    return [...stones, ...prefabs];
  }
  if (track.id === "sky-slide") {
    const lengths = track.path
      .slice(1)
      .map((p, i) => Math.hypot(p.x - track.path[i].x, p.z - track.path[i].z));
    const total = lengths.reduce((a, b) => a + b, 0);
    return Array.from({ length: 20 }, (_, i) => {
      let distance = (total * (i * 5 + 4.5)) / 100;
      let segment = 0;
      while (segment < lengths.length - 1 && distance > lengths[segment])
        distance -= lengths[segment++];
      const a = track.path[segment],
        b = track.path[segment + 1];
      const t = distance / lengths[segment];
      const side = [-4.5, 4.5, 0][i % 3];
      const x = a.x + (b.x - a.x) * t + (side * (b.z - a.z)) / lengths[segment];
      const z = a.z + (b.z - a.z) * t - (side * (b.x - a.x)) / lengths[segment];
      return {
        id: `slide-snowman-${i + 1}`,
        kind: "snowman" as const,
        x,
        z,
        ground: slideProfileY(z) + 0.25,
      };
    });
  }
  if (track.id === "haunted-hollow")
    return (track.demolish ?? []).map((p) => ({
      id: p.id,
      kind: "gravestone",
      x: p.x,
      z: p.z,
      ground: 0,
    }));
  if (track.id === "scrapyard-sweep")
    return [-1, 1].flatMap((side) =>
      [-60, -20, 20, 60].map((z, i) => ({
        id: `scrap-prop-${side}-${i}`,
        kind: (["sign", "trash", "barrel", "trash"] as const)[i],
        x: side * 75,
        z,
        ground: 0,
      })),
    );
  return track.id === "harbor-sprint"
    ? [
        { id: "harbor-sign", kind: "sign", x: -19, z: -55, ground: 0 },
        { id: "harbor-trash", kind: "trash", x: 34, z: 35, ground: 0 },
      ]
    : [];
}
