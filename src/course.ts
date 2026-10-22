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
export const courseAvailable = (id: TrackId) => id === "harbor-sprint";
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
  for (let i = 1; i < track.path.length; i++) {
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
  return solids;
}
export function courseHazards(_track: Track): Hazard[] {
  return [];
}
export function courseProps(track: Track): PropDefinition[] {
  return track.id === "harbor-sprint"
    ? [
        { id: "harbor-sign", kind: "sign", x: -19, z: -55, ground: 0 },
        { id: "harbor-trash", kind: "trash", x: 34, z: 35, ground: 0 },
      ]
    : [];
}
