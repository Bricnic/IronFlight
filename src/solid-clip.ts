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
