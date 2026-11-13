import * as T from "three";
/**
 * Shared solid UV convention: world-scale repeats, one tile per 3m. Top faces
 * map x/z (grounds and clipped roads add the solid offset for continuous tiles);
 * side faces shear x+z against height so walls tile without stretching.
 * Partition offsets retain the source box's phase on local-mapped faces.
 */
export function scaleSolidUVs(
  geometry: T.BufferGeometry,
  s: { kind: string; x: number; z: number; uvOffsetX?: number; uvOffsetZ?: number },
  worldAligned = s.kind === "ground",
  tileSize = 3,
) {
  const pos = geometry.attributes.position as T.BufferAttribute;
  const normals = geometry.attributes.normal as T.BufferAttribute;
  const uv = geometry.attributes.uv as T.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const top = Math.abs(normals.getY(i)) > 0.5;
    uv.setXY(
      i,
      (top
        ? pos.getX(i) + (worldAligned ? s.x : s.uvOffsetX ?? 0)
        : pos.getX(i) + pos.getZ(i) + (s.uvOffsetX ?? 0) + (s.uvOffsetZ ?? 0)) / tileSize,
      (top
        ? pos.getZ(i) + (worldAligned ? s.z : s.uvOffsetZ ?? 0)
        : pos.getY(i)) / tileSize,
    );
  }
  uv.needsUpdate = true;
}

/** Kinds whose UVs must tile with world scale (lava lakes included). */
export function solidNeedsUVScaling(
  s: { kind: string; texture?: string },
  stone: boolean,
  cliff: boolean,
): boolean {
  return (
    stone ||
    cliff ||
    !!s.texture ||
    ["ground", "road", "ramp", "loop", "lava", "slime"].includes(s.kind)
  );
}
