import type { Point } from "./tracks";

/** Keep the part of a footprint on the normal-facing side of a vertical cut. */
export function clipFootprint(
  footprint: readonly Point[],
  point: Point,
  normal: Point,
): Point[] {
  const distance = (p: Point) =>
    (p.x - point.x) * normal.x + (p.z - point.z) * normal.z;
  const clipped: Point[] = [];
  for (const [i, a] of footprint.entries()) {
    const b = footprint[(i + 1) % footprint.length];
    const da = distance(a);
    const db = distance(b);
    if (da >= 0) clipped.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      clipped.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return clipped;
}

function twiceArea(points: readonly Point[]) {
  return points.reduce((area, a, i) => {
    const b = points[(i + 1) % points.length];
    return area + a.x * b.z - a.z * b.x;
  }, 0);
}

/** Subtract a counterclockwise convex cutter, keeping disjoint convex pieces. */
export function subtractFootprint(
  footprint: Point[],
  cutter: readonly Point[],
): Point[][] {
  const pieces: Point[][] = [];
  let remaining = footprint;
  for (const [i, a] of cutter.entries()) {
    const b = cutter[(i + 1) % cutter.length];
    const normal = { x: a.z - b.z, z: b.x - a.x };
    const outside = clipFootprint(remaining, a, { x: -normal.x, z: -normal.z });
    remaining = clipFootprint(remaining, a, normal);
    // Without an interior intersection, there is no reason to split the stock.
    if (Math.abs(twiceArea(remaining)) < 1e-8) return [footprint];
    if (Math.abs(twiceArea(outside)) >= 1e-8) pieces.push(outside);
  }
  return pieces;
}

/** A prism needs a simple, strictly convex outline in either winding. */
export function isConvexFootprint(points: readonly Point[]) {
  const winding = Math.sign(twiceArea(points));
  return (
    points.length >= 3 &&
    winding !== 0 &&
    points.every((a, i) => {
      const next = (i + 1) % points.length;
      const b = points[next];
      return points.every(
        (p, j) =>
          j === i ||
          j === next ||
          winding * ((b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x)) > 0,
      );
    })
  );
}
