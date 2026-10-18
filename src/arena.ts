import { ROUTES, type Solid } from "./routes";
export type ArenaSolid = Omit<Solid, "kind"> & {
  id: string;
  kind: "grass" | "grandstand" | "lava" | "pole";
  row?: number;
};
/** Render and physics consume these exact same dimensions. */
export function arenaSolids(): ArenaSolid[] {
  return [
    {
      id: "arena-floor",
      kind: "grass",
      x: 0,
      y: -9.2,
      z: 25,
      w: 340,
      h: 1,
      d: 400,
    },
    {
      id: "runup-field",
      kind: "grass",
      x: 0,
      y: -0.22,
      z: -62.5,
      w: 300,
      h: 0.2,
      d: 125,
    },
    {
      id: "landing-field",
      kind: "grass",
      x: 0,
      y: -0.22,
      z: 110,
      w: 300,
      h: 0.2,
      d: 150,
    },
    ...ROUTES.map((r) => ({
      id: `lava-${r.id}`,
      kind: "lava" as const,
      x: r.x,
      y: -6,
      z: (r.gapEnd + 12) / 2,
      w: 13,
      h: 0.15,
      d: r.gapEnd - 12,
    })),
    ...[-1, 1].flatMap((side) =>
      Array.from({ length: 7 }, (_, row) => ({
        id: `stand-${side}-${row}`,
        kind: "grandstand" as const,
        row,
        x: side * (65 + row * 3),
        y: row * 1.6 - 1,
        z: 10,
        w: 5,
        h: 1.2,
        d: 240,
      })),
    ),
    ...[-57, 57].flatMap((x) =>
      [-90, 0, 95].map((z) => ({
        id: `pole-${x}-${z}`,
        kind: "pole" as const,
        x,
        y: 11,
        z,
        w: 0.3,
        h: 25,
        d: 0.3,
      })),
    ),
  ];
}
