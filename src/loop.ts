import { ROUTES, type Solid } from "./routes";
export const LOOP = {
  boostStart: 150,
  boostEnd: 195,
  dragonZ: [213, 232],
  z: 290,
  radius: 45,
  segments: 240,
};
export function dragonFiring(time: number) {
  return time % 8 < 3;
}
export function loopX(x: number, theta: number) {
  return x + (12 * (theta - Math.sin(theta))) / (2 * Math.PI);
}
export function loopSolids(): Solid[] {
  return ROUTES.flatMap((r) => [
    { x: r.x, y: -0.6, z: 290, w: 14, h: 1.2, d: 310, kind: "road" as const },
    {
      x: r.x + 12,
      y: -0.6,
      z: 355,
      w: 12,
      h: 1.2,
      d: 140,
      kind: "road" as const,
    },
    ...Array.from({ length: LOOP.segments }, (_, i) => {
      const theta = ((i + 0.5) / LOOP.segments) * Math.PI * 2;
      return {
        x: loopX(r.x, theta),
        y: LOOP.radius * (1 - Math.cos(theta)) - 0.2 * Math.cos(theta),
        z: LOOP.z + (LOOP.radius + 0.2) * Math.sin(theta),
        w: 12,
        h: 0.4,
        d: 2 * LOOP.radius * Math.tan(Math.PI / LOOP.segments) + 0.035,
        angle: -theta,
        kind: "loop" as const,
      };
    }),
  ]);
}
/** Conservative solid cores for the statues and loop support columns. */
export function loopScenerySolids(): Solid[] {
  return ROUTES.flatMap((r) => [
    ...LOOP.dragonZ.flatMap((z) =>
      [-1, 1].flatMap((side) => [
        {
          x: r.x + side * 10,
          y: 0.4,
          z,
          w: 5,
          h: 0.8,
          d: 4,
          kind: "scenery" as const,
        },
        {
          x: r.x + side * 10.5,
          y: 2.2,
          z,
          w: 3,
          h: 3.2,
          d: 2.4,
          kind: "scenery" as const,
        },
        {
          x: r.x + side * 7.4,
          y: 3.35,
          z,
          w: 2.3,
          h: 1.4,
          d: 1.7,
          kind: "scenery" as const,
        },
      ]),
    ),
    ...[LOOP.z - 34, LOOP.z + 34].flatMap((z) =>
      [-1, 1].map((side) => ({
        x: r.x + side * 7,
        y: 12.5,
        z,
        w: 0.6,
        h: 25,
        d: 0.6,
        kind: "scenery" as const,
      })),
    ),
  ]);
}
