export const ROUTES = [
  {
    id: "easy" as const,
    name: "Ignition",
    x: -24,
    gapEnd: 27,
    finish: 72,
    color: 0x9be46b,
    difficulty: "01 / ROOKIE",
    hazards: 1,
  },
  {
    id: "medium" as const,
    name: "The Gauntlet",
    x: 0,
    gapEnd: 31,
    finish: 77,
    color: 0xffc455,
    difficulty: "02 / DAREDEVIL",
    hazards: 3,
  },
  {
    id: "hard" as const,
    name: "Death Wish",
    x: 24,
    gapEnd: 35,
    finish: 82,
    color: 0xff704e,
    difficulty: "03 / LEGEND",
    hazards: 5,
  },
];
export type Solid = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  angle?: number;
  kind: "road" | "ramp" | "landing";
};
export function routeSolids(): Solid[] {
  return ROUTES.flatMap((r) => [
    { x: r.x, y: -0.6, z: -55, w: 14, h: 1.2, d: 110, kind: "road" as const },
    {
      x: r.x,
      y: 2.25,
      z: 6,
      w: 14,
      h: 0.5,
      d: 13,
      angle: -Math.atan2(5, 12),
      kind: "ramp" as const,
    },
    {
      x: r.x,
      y: -0.6,
      z: (r.gapEnd + 135) / 2,
      w: 14,
      h: 1.2,
      d: 135 - r.gapEnd,
      kind: "landing" as const,
    },
  ]);
}
