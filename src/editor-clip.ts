import type { CustomSolid } from "./custom-level";
import { clipFootprint, subtractFootprint } from "./solid-clip";
import type { Point } from "./tracks";

export function solidFootprint(s: CustomSolid): Point[] {
  const c = Math.cos(s.yaw ?? 0), n = Math.sin(s.yaw ?? 0);
  return (s.footprint ?? [
    { x: -s.w / 2, z: -s.d / 2 }, { x: s.w / 2, z: -s.d / 2 },
    { x: s.w / 2, z: s.d / 2 }, { x: -s.w / 2, z: s.d / 2 },
  ]).map(p => ({ x: s.x + p.x * c + p.z * n, z: s.z - p.x * n + p.z * c }));
}
function cleanPolygon(poly: Point[]) {
  const unique = poly.filter((p, i) => { const q = poly[(i + poly.length - 1) % poly.length]; return Math.hypot(p.x - q.x, p.z - q.z) > CLIP_EPSILON; });
  return unique.filter((p, i) => {
    const a = unique[(i + unique.length - 1) % unique.length], b = unique[(i + 1) % unique.length];
    return Math.abs((p.x - a.x) * (b.z - p.z) - (p.z - a.z) * (b.x - p.x)) > CLIP_EPSILON;
  });
}
function polygonArea(poly: Point[]) {
  return poly.reduce((sum, a, i) => { const b = poly[(i + 1) % poly.length]; return sum + a.x * b.z - a.z * b.x; }, 0) / 2;
}
/** Ear-clipping triangulation into counterclockwise triangles for convex-only cutters. */
export function triangulate(poly: Point[]): Point[][] {
  let rest = cleanPolygon(poly);
  if (polygonArea(rest) < 0) rest = rest.reverse();
  const tris: Point[][] = [];
  const idx = rest.map((_, i) => i);
  const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  // Non-strict: a vertex on the candidate diagonal invalidates the ear.
  const inTriangle = (p: Point, a: Point, b: Point, c: Point) =>
    cross(a, b, p) >= -CLIP_EPSILON && cross(b, c, p) >= -CLIP_EPSILON && cross(c, a, p) >= -CLIP_EPSILON;
  let guard = idx.length * idx.length + 4;
  while (idx.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const a = rest[idx[(k + idx.length - 1) % idx.length]];
      const b = rest[idx[k]];
      const c = rest[idx[(k + 1) % idx.length]];
      if (cross(a, b, c) <= CLIP_EPSILON) continue;
      if (idx.some((j) => rest[j] !== a && rest[j] !== b && rest[j] !== c && inTriangle(rest[j], a, b, c))) continue;
      tris.push([a, b, c]);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) tris.push(idx.map((i) => rest[i]));
  return tris.filter((t) => Math.abs(polygonArea(t)) > CLIP_EPSILON);
}
/** Vertical ranges overlap with positive length (stacked layers never interact). */
function heightsOverlap(a: CustomSolid, b: CustomSolid) {
  return Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2) > CLIP_EPSILON;
}
function polygonPiece(s: CustomSolid, poly: Point[]): CustomSolid {
  const c = Math.cos(s.yaw ?? 0), n = Math.sin(s.yaw ?? 0);
  const local = poly.map(p => ({ x: (p.x - s.x) * c - (p.z - s.z) * n, z: (p.x - s.x) * n + (p.z - s.z) * c }));
  const xs = local.map(p => p.x), zs = local.map(p => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const x = (minX + maxX) / 2, z = (minZ + maxZ) / 2;
  return { ...s, x: s.x + x * c + z * n, z: s.z - x * n + z * c, w: maxX - minX, d: maxZ - minZ,
    footprint: local.map(p => ({ x: p.x - x, z: p.z - z })),
    uvOffsetX: (s.uvOffsetX ?? 0) + x, uvOffsetZ: (s.uvOffsetZ ?? 0) + z };
}

/** Metres: used only to discard degenerate strips, never to enlarge a cutter. */
export const CLIP_EPSILON = 1e-8;
export const CLIP_SLIVER = 0.01;
export type ClipRect = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};
export function solidRect(s: CustomSolid): ClipRect {
  if (s.footprint || s.yaw) {
    const poly = solidFootprint(s);
    return { minX: Math.min(...poly.map(p => p.x)), maxX: Math.max(...poly.map(p => p.x)), minZ: Math.min(...poly.map(p => p.z)), maxZ: Math.max(...poly.map(p => p.z)) };
  }
  return {
    minX: s.x - s.w / 2,
    maxX: s.x + s.w / 2,
    minZ: s.z - s.d / 2,
    maxZ: s.z + s.d / 2,
  };
}
export function validRect(r: ClipRect) {
  return (
    [r.minX, r.maxX, r.minZ, r.maxZ, r.maxX - r.minX, r.maxZ - r.minZ].every(
      Number.isFinite,
    ) &&
    r.maxX - r.minX > CLIP_EPSILON &&
    r.maxZ - r.minZ > CLIP_EPSILON
  );
}
export function intersectRects(a: ClipRect, b: ClipRect): ClipRect | null {
  const r = {
    minX: Math.max(a.minX, b.minX),
    maxX: Math.min(a.maxX, b.maxX),
    minZ: Math.max(a.minZ, b.minZ),
    maxZ: Math.min(a.maxZ, b.maxZ),
  };
  return validRect(r) ? r : null;
}
export function subtractRect(a: ClipRect, cutter: ClipRect): ClipRect[] {
  if (!validRect(a) || !validRect(cutter))
    throw new Error("Clip bounds must be finite with positive width and depth");
  const i = intersectRects(a, cutter);
  if (!i) return [a];
  return [
    { ...a, maxX: i.minX },
    { ...a, minX: i.maxX },
    { minX: i.minX, maxX: i.maxX, minZ: a.minZ, maxZ: i.minZ },
    { minX: i.minX, maxX: i.maxX, minZ: i.maxZ, maxZ: a.maxZ },
  ].filter(validRect);
}
export type ClipPolygon = Point[];
/**
 * Polygon-true clip: like previewClip but every target is cut by polygon
 * footprints (triangulated for the convex-only subtractor) instead of
 * bounding boxes, so yawed solids cut their real shape. Targets keep the
 * same support rules (locked/pitched/rolled/invalid are reported, not cut).
 */
export function previewClipPolygons(
  solids: CustomSolid[],
  targets: string[],
  cutters: ClipPolygon[],
): ClipResult {
  const tris = cutters.flatMap(triangulate);
  const result: ClipResult = {
    solids: [],
    retained: [],
    removed: [],
    affected: [],
    issues: [],
    slivers: 0,
  };
  if (!tris.length) {
    result.solids = [...solids];
    return result;
  }
  const taken = new Set(solids.map((s) => s.id));
  const targetSet = new Set(targets);
  for (const s of solids) {
    if (!targetSet.has(s.id)) {
      result.solids.push(s);
      continue;
    }
    const issue = clipUnsupported(s);
    if (issue) {
      result.issues.push(`${s.name ?? s.id}: ${issue}`);
      result.solids.push(s);
      continue;
    }
    let original = cleanPolygon(solidFootprint(s));
    if (polygonArea(original) < 0) original = original.reverse();
    let polygons = [original];
    let affected = false;
    for (const tri of tris) {
      const next: Point[][] = [];
      for (const poly of polygons) {
        let inside = poly;
        for (const [i, a] of tri.entries()) {
          const b = tri[(i + 1) % tri.length];
          inside = clipFootprint(inside, a, { x: a.z - b.z, z: b.x - a.x });
        }
        if (Math.abs(polygonArea(inside)) <= CLIP_EPSILON) {
          next.push(poly);
          continue;
        }
        affected = true;
        result.removed.push(polygonPiece(s, cleanPolygon(inside)));
        next.push(
          ...subtractFootprint(poly, tri)
            .map(cleanPolygon)
            .filter(
              (p) => p.length >= 3 && Math.abs(polygonArea(p)) > CLIP_EPSILON,
            ),
        );
      }
      polygons = next;
    }
    if (!affected) {
      result.solids.push(s);
      continue;
    }
    result.affected.push(s.id);
    for (const [i, poly] of polygons.entries()) {
      const base = `${s.id}-piece-${String(i + 1).padStart(2, "0")}`;
      let id = base,
        n = 2;
      while (taken.has(id)) id = `${base}-${n++}`;
      taken.add(id);
      const piece = {
        ...polygonPiece(s, poly),
        id,
        name: `${(s.name ?? s.id).slice(0, 60)} / piece ${i + 1}`,
      };
      if (Math.min(piece.w, piece.d) < CLIP_SLIVER) result.slivers++;
      result.solids.push(piece);
      result.retained.push(piece);
    }
  }
  return result;
}
/** Exact full-edge merging, within one source only (therefore identical metadata). */
function mergeRects(rects: ClipRect[]) {
  for (let a = 0; a < rects.length; a++)
    for (let b = a + 1; b < rects.length; b++) {
      const x = rects[a],
        y = rects[b];
      if (
        (x.minX === y.minX &&
          x.maxX === y.maxX &&
          (x.maxZ === y.minZ || y.maxZ === x.minZ)) ||
        (x.minZ === y.minZ &&
          x.maxZ === y.maxZ &&
          (x.maxX === y.minX || y.maxX === x.minX))
      ) {
        rects[a] = {
          minX: Math.min(x.minX, y.minX),
          maxX: Math.max(x.maxX, y.maxX),
          minZ: Math.min(x.minZ, y.minZ),
          maxZ: Math.max(x.maxZ, y.maxZ),
        };
        rects.splice(b, 1);
        return mergeRects(rects);
      }
    }
  return rects;
}
export function clipUnsupported(s: CustomSolid): string | null {
  if (
    ![
      s.x,
      s.y,
      s.z,
      s.w,
      s.h,
      s.d,
      s.yaw ?? 0,
      s.angle ?? 0,
      s.roll ?? 0,
    ].every(Number.isFinite) ||
    Math.min(s.w, s.h, s.d) <= CLIP_EPSILON
  )
    return "invalid dimensions";
  if (!validRect(solidRect(s))) return "invalid bounds";
  if ((s.angle ?? 0) !== 0 || (s.roll ?? 0) !== 0)
    return "pitched/rolled solid — use a horizontal solid for clipping";
  if (s.locked) return "locked — unlock before clipping";
  return null;
}
export type ClipResult = {
  solids: CustomSolid[];
  retained: CustomSolid[];
  removed: CustomSolid[];
  affected: string[];
  issues: string[];
  slivers: number;
};
/** Display label used for ordering, matching the object list collation. */
export function solidLabel(s: CustomSolid) {
  return s.name ?? s.id;
}
/** Alphabetical cutter order (object-list collation, id tiebreak). */
export function autoClipOrder(solids: CustomSolid[]) {
  return [...solids].sort(
    (a, b) =>
      solidLabel(a).localeCompare(solidLabel(b), undefined, {
        sensitivity: "base",
        numeric: true,
      }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
export type AutoClipResult = ClipResult & { order: string[] };
/**
 * Sequential mutual clip: each solid in alphabetical order cuts every other
 * overlapping selected solid with its true footprint, evaluated against
 * already-clipped geometry, so earlier names keep shared regions. Only
 * solids whose footprints AND heights overlap interact, so stacked layers
 * never eat each other. Unsupported targets report issues and are left
 * intact; cutters consumed by earlier steps are skipped.
 */
export function previewAutoClip(
  solids: CustomSolid[],
  ids: string[],
): AutoClipResult {
  const byId = new Map(solids.map((s) => [s.id, s]));
  const ordered = autoClipOrder(
    [...new Set(ids)]
      .map((id) => byId.get(id))
      .filter((s): s is CustomSolid => !!s),
  );
  const result: AutoClipResult = {
    solids: [...solids],
    retained: [],
    removed: [],
    affected: [],
    issues: [],
    slivers: 0,
    order: ordered.map((s) => s.id),
  };
  const lineage = new Map<string, string[]>(ordered.map((s) => [s.id, [s.id]]));
  // Conservative per-original bboxes from the initial footprints. Clipping
  // only ever shrinks pieces, so originals whose initial bboxes are disjoint
  // can never interact: skipping them is a pure speedup with identical output.
  const initBox = new Map<string, ClipRect>(ordered.map((s) => [s.id, solidRect(s)]));
  const boxesHit = (a: ClipRect, b: ClipRect) =>
    a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
  const live = (pieceIds: string[]) =>
    pieceIds.filter((id) => result.solids.some((s) => s.id === id));
  for (const cutter of ordered) {
    // Refresh the lookup: earlier steps replaced pieces.
    for (const s of result.solids) byId.set(s.id, s);
    const cutterPieces = live(lineage.get(cutter.id) ?? [])
      .map((id) => byId.get(id))
      .filter((s): s is CustomSolid => !!s);
    const cutters = cutterPieces
      .map(solidFootprint)
      .map(cleanPolygon)
      .filter((p) => p.length >= 3 && Math.abs(polygonArea(p)) > CLIP_EPSILON);
    if (!cutters.length) continue;
    const cutterBox = initBox.get(cutter.id)!;
    for (const [orig, pieceIds] of lineage) {
      if (orig === cutter.id) continue;
      if (!boxesHit(cutterBox, initBox.get(orig)!)) continue;
      const targets = live(pieceIds).filter((id) =>
        cutterPieces.some((c) => heightsOverlap(c, byId.get(id)!)),
      );
      if (!targets.length) continue;
      const step = previewClipPolygons(result.solids, targets, cutters);
      result.solids = step.solids;
      for (const s of result.solids) byId.set(s.id, s);
      // All retained pieces of this call belong to the single target original;
      // targets that passed through uncut stay live under their own ids.
      const cut = new Set(step.affected);
      lineage.set(orig, [
        ...targets.filter((id) => !cut.has(id)),
        ...step.retained.map((p) => p.id),
      ]);
      result.retained.push(...step.retained);
      result.removed.push(...step.removed);
      if (step.affected.length && !result.affected.includes(orig))
        result.affected.push(orig);
      result.issues.push(...step.issues);
      result.slivers += step.slivers;
    }
  }
  // Earlier retained pieces may have been re-cut later; keep live ones only.
  const current = new Set(result.solids.map((s) => s.id));
  result.retained = result.retained.filter((s) => current.has(s.id));
  return result;
}
export function previewClip(
  solids: CustomSolid[],
  targets: string[],
  cutters: ClipRect[],
): ClipResult {
  if (!cutters.length || cutters.some((c) => !validRect(c)))
    throw new Error("Enter finite clip bounds with positive width and depth");
  const result: ClipResult = {
    solids: [],
    retained: [],
    removed: [],
    affected: [],
    issues: [],
    slivers: 0,
  };
  const taken = new Set(solids.map((s) => s.id));
  const targetSet = new Set(targets);
  for (const s of solids) {
    if (!targetSet.has(s.id)) {
      result.solids.push(s);
      continue;
    }
    const issue = clipUnsupported(s);
    if (issue) {
      result.issues.push(`${s.name ?? s.id}: ${issue}`);
      result.solids.push(s);
      continue;
    }
    if (s.footprint || s.yaw) {
      let original = cleanPolygon(solidFootprint(s));
      if (polygonArea(original) < 0) original = original.reverse();
      let polygons = [original];
      let affected = false;
      for (const cutter of cutters) {
        const points = [{ x: cutter.minX, z: cutter.minZ }, { x: cutter.maxX, z: cutter.minZ }, { x: cutter.maxX, z: cutter.maxZ }, { x: cutter.minX, z: cutter.maxZ }];
        const next: Point[][] = [];
        for (const poly of polygons) {
          let inside = poly;
          for (const [i, a] of points.entries()) {
            const b = points[(i + 1) % points.length];
            inside = clipFootprint(inside, a, { x: a.z - b.z, z: b.x - a.x });
          }
          if (Math.abs(polygonArea(inside)) <= CLIP_EPSILON) { next.push(poly); continue; }
          affected = true;
          result.removed.push(polygonPiece(s, cleanPolygon(inside)));
          next.push(...subtractFootprint(poly, points).map(cleanPolygon).filter(p => p.length >= 3 && Math.abs(polygonArea(p)) > CLIP_EPSILON));
        }
        polygons = next;
      }
      if (!affected) { result.solids.push(s); continue; }
      result.affected.push(s.id);
      for (const [i, poly] of polygons.entries()) {
        const base = `${s.id}-piece-${String(i + 1).padStart(2, "0")}`;
        let id = base, n = 2;
        while (taken.has(id)) id = `${base}-${n++}`;
        taken.add(id);
        const piece = { ...polygonPiece(s, poly), id, name: `${(s.name ?? s.id).slice(0, 60)} / piece ${i + 1}` };
        if (Math.min(piece.w, piece.d) < CLIP_SLIVER) result.slivers++;
        result.solids.push(piece); result.retained.push(piece);
      }
      continue;
    }
    let rects = [solidRect(s)];
    for (const cutter of cutters) {
      for (const r of rects) {
        const i = intersectRects(r, cutter);
        if (i)
          result.removed.push({
            ...s,
            x: i.minX + (i.maxX - i.minX) / 2,
            z: i.minZ + (i.maxZ - i.minZ) / 2,
            w: i.maxX - i.minX,
            d: i.maxZ - i.minZ,
          });
      }
      rects = rects.flatMap((r) => subtractRect(r, cutter));
    }
    if (
      rects.length === 1 &&
      JSON.stringify(rects[0]) === JSON.stringify(solidRect(s))
    ) {
      result.solids.push(s);
      continue;
    }
    result.affected.push(s.id);
    rects = mergeRects(rects);
    rects.forEach((r, i) => {
      const suffix = String(i + 1).padStart(2, "0");
      const base = `${s.id}-piece-${suffix}`;
      let id = base,
        n = 2;
      while (taken.has(id)) id = `${base}-${n++}`;
      taken.add(id);
      const x = r.minX + (r.maxX - r.minX) / 2,
        z = r.minZ + (r.maxZ - r.minZ) / 2;
      const piece: CustomSolid = {
        ...s,
        id,
        name: `${(s.name ?? s.id).slice(0, 71 - suffix.length)} / piece ${suffix}`,
        x,
        z,
        w: r.maxX - r.minX,
        d: r.maxZ - r.minZ,
        uvOffsetX: (s.uvOffsetX ?? 0) + x - s.x,
        uvOffsetZ: (s.uvOffsetZ ?? 0) + z - s.z,
      };
      if (Math.min(piece.w, piece.d) < CLIP_SLIVER) result.slivers++;
      result.retained.push(piece);
      result.solids.push(piece);
    });
  }
  return result;
}
