import type { Track, TrackId } from "./tracks";
import type { Hazard } from "./hazards";
import type { PropDefinition } from "./destructibles";
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
  color: number;
};
export const courseAvailable = (id: TrackId) =>
  [
    "harbor-sprint",
    "foundry-run",
    "skyline-circuit",
    "scrapyard-sweep",
    "inferno-vault",
  ].includes(id);
export function courseSolids(track: Track): CourseSolid[] {
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
  for (let i = 1; track.mode === "race" && i < track.path.length; i++) {
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
        y: 0.6,
        z: 20,
        w: 16,
        h: 0.8,
        d: 20,
        color: 0xff6a20,
      });
      solids.push({
        id: `vault-floor-${x}`,
        kind: "support",
        x,
        y: 0.1,
        z: 20,
        w: 16,
        h: 0.2,
        d: 20,
        color: 0x77716c,
      });
      for (const side of [-1, 1]) {
        solids.push({
          id: `vault-wall-x-${x}-${side}`,
          kind: "support",
          x: x + side * 8.5,
          y: 0.65,
          z: 20,
          w: 1,
          h: 1.3,
          d: 22,
          color: 0x77716c,
        });
        solids.push({
          id: `vault-wall-z-${x}-${side}`,
          kind: "support",
          x,
          y: 0.65,
          z: 20 + side * 10.5,
          w: 16,
          h: 1.3,
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
  return solids;
}
export function courseHazards(track: Track): Hazard[] {
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
