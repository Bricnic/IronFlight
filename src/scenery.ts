import { ROUTES } from "./routes";
import { HAZARDS } from "./hazards";
export type ScenerySolid = {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  kind: "basin" | "support";
};
/** Floor fits INSIDE the rim: overlapping outer faces cause camera-dependent z-fighting.
 * Foundations rest on the arena floor (-8.7); rims enclose the lava on all sides. */
export function basinSolids(): ScenerySolid[] {
  return ROUTES.flatMap((r) => {
    const z = (r.gapEnd + 12) / 2,
      d = r.gapEnd - 12;
    return [
      {
        id: `basin-${r.id}-floor`,
        x: r.x,
        y: -8.4,
        z,
        w: 13,
        h: 0.6,
        d,
        kind: "basin" as const,
      },
      ...[-1, 1].map((side) => ({
        id: `basin-${r.id}-wall-${side}`,
        x: r.x + side * 7,
        y: -7.1,
        z,
        w: 1,
        h: 3.2,
        d: d + 2,
        kind: "basin" as const,
      })),
      ...[-1, 1].map((side) => ({
        id: `basin-${r.id}-end-${side}`,
        x: r.x,
        y: -7.1,
        z: z + side * (d / 2 + 0.5),
        w: 13,
        h: 3.2,
        d: 1,
        kind: "basin" as const,
      })),
    ];
  });
}
/** Fire gantries and spike platforms stand on the basin foundation, not in empty air. */
export function hazardSupports(): ScenerySolid[] {
  return HAZARDS.flatMap((h) => {
    const pieces: ScenerySolid[] = [];
    if (h.kind === "fire") {
      const top = h.y - 1.325,
        bottom = -8.1;
      for (const side of [-1, 1])
        pieces.push({
          id: `${h.id}-pylon-${side}`,
          x: h.x + side * 5.4,
          y: (top + bottom) / 2,
          z: h.z,
          w: 0.45,
          h: top - bottom,
          d: 0.65,
          kind: "support",
        });
    }
    if (h.kind === "spikes") {
      pieces.push({
        id: `${h.id}-platform`,
        x: h.x,
        y: h.y - 1.4,
        z: h.z,
        w: 12,
        h: 0.4,
        d: 3.8,
        kind: "support",
      });
      for (const side of [-1, 1])
        for (const end of [-1, 1])
          pieces.push({
            id: `${h.id}-leg-${side}-${end}`,
            x: h.x + side * 5.4,
            y: -6.6,
            z: h.z + end * 1.3,
            w: 0.4,
            h: 3,
            d: 0.4,
            kind: "support",
          });
    }
    return pieces;
  });
}

