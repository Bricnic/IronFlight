import type { CustomSolid } from "./custom-level";

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
  if ((s.yaw ?? 0) !== 0 || (s.angle ?? 0) !== 0 || (s.roll ?? 0) !== 0)
    return "rotated solid";
  if (s.kind !== "ground" && s.kind !== "road")
    return "only ground/road boxes are supported";
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
  for (const s of solids) {
    if (!targets.includes(s.id)) {
      result.solids.push(s);
      continue;
    }
    const issue = clipUnsupported(s);
    if (issue) {
      result.issues.push(`${s.name ?? s.id}: ${issue}`);
      result.solids.push(s);
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
