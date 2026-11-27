/** Paint-to-road conversion for the minimap draw mode. Pure geometry: strokes in,
 * yawed road rectangles out. Overlapping pieces are built for autoclip, which
 * unions them into a contiguous deck without z-fighting.
 */
export interface PaintPoint {
  x: number;
  z: number;
}
export interface PaintStroke {
  points: PaintPoint[];
  /** Road width in world units; every piece of this stroke is this wide. */
  width: number;
}
export interface PaintRoad {
  x: number;
  z: number;
  /** Radians about Y; the piece's long axis runs along (sin yaw, cos yaw). */
  yaw: number;
  w: number;
  d: number;
}

const CHAIKIN_ROUNDS = 3;
/** Piece spacing as a fraction of road width; tighter spacing, smoother union. */
const SPACING_FRACTION = 0.5;
/** Piece length covers its spacing plus this much extra width for overlap. */
const OVERLAP_FRACTION = 1.2;

function dist(a: PaintPoint, b: PaintPoint) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** One Chaikin corner-cutting pass; closed wraps around the loop. */
function chaikin(points: PaintPoint[], closed: boolean): PaintPoint[] {
  if (points.length < (closed ? 3 : 2)) return points;
  const out: PaintPoint[] = [];
  const segs = closed ? points.length : points.length - 1;
  for (let i = 0; i < segs; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    out.push(
      { x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 },
      { x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 },
    );
  }
  if (!closed) {
    out.unshift(points[0]);
    out.push(points[points.length - 1]);
  }
  return out;
}

function smooth(points: PaintPoint[], closed: boolean): PaintPoint[] {
  let path = points;
  for (let i = 0; i < CHAIKIN_ROUNDS; i++) path = chaikin(path, closed);
  return path;
}

/** Resample a polyline to even arc-length spacing, keeping the endpoints. */
function resample(path: PaintPoint[], spacing: number, closed: boolean): PaintPoint[] {
  if (path.length < 2) return path;
  const pts = closed ? [...path, path[0]] : path;
  const total = pts.slice(1).reduce((sum, p, i) => sum + dist(pts[i], p), 0);
  const count = Math.max(1, Math.round(total / spacing));
  const out: PaintPoint[] = [];
  let seg = 0;
  let segStart = 0;
  let segLen = dist(pts[0], pts[1]);
  for (let i = 0; i <= count; i++) {
    const target = (total * i) / count;
    while (seg < pts.length - 2 && segStart + segLen < target) {
      segStart += segLen;
      seg++;
      segLen = dist(pts[seg], pts[seg + 1]);
    }
    const t = segLen > 1e-9 ? (target - segStart) / segLen : 0;
    out.push({
      x: pts[seg].x + (pts[seg + 1].x - pts[seg].x) * t,
      z: pts[seg].z + (pts[seg + 1].z - pts[seg].z) * t,
    });
  }
  if (closed) out.pop();
  return out;
}

function strokeRoads(stroke: PaintStroke): PaintRoad[] {
  const raw = stroke.points.filter(
    (p, i, arr) => i === 0 || dist(p, arr[i - 1]) > 1e-6,
  );
  if (!(stroke.width > 0) || !raw.length) return [];
  // A single dab still drops one square piece of road.
  if (raw.length === 1)
    return [{ x: raw[0].x, z: raw[0].z, yaw: 0, w: stroke.width, d: stroke.width }];
  // A stroke that ends where it began is a loop: wrap the smoothing and drop
  // the duplicated joint so the union has no seam or gap.
  const closed = raw.length > 2 && dist(raw[0], raw[raw.length - 1]) < stroke.width;
  const path = smooth(closed ? raw.slice(0, -1) : raw, closed);
  if (path.length < 2) return [];
  const spacing = stroke.width * SPACING_FRACTION;
  const samples = resample(path, spacing, closed);
  const legs = closed ? samples.length : samples.length - 1;
  const roads: PaintRoad[] = [];
  for (let i = 0; i < legs; i++) {
    const a = samples[i];
    const b = samples[(i + 1) % samples.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    if (Math.hypot(dx, dz) < 1e-9) continue;
    roads.push({
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      yaw: Math.atan2(dx, dz),
      w: stroke.width,
      d: spacing + stroke.width * OVERLAP_FRACTION,
    });
  }
  return roads;
}

/** Convert painted strokes into overlapping yawed road rectangles. */
export function strokesToRoads(strokes: PaintStroke[]): PaintRoad[] {
  return strokes.flatMap(strokeRoads);
}
