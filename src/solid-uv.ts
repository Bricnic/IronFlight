import * as T from "three";
/**
 * Shared solid UV convention: world-scale repeats, one tile per 3m. Top faces
 * map world x/z (grounds add the solid offset so tiles stay continuous);
 * side faces shear x+z against height so walls tile without stretching.
 * Partition offsets retain the source box's phase on local-mapped faces.
 */
export function scaleSolidUVs(
  geometry: T.BufferGeometry,
  s: { kind: string; x: number; z: number; uvOffsetX?: number; uvOffsetZ?: number },
) {
  const pos = geometry.attributes.position as T.BufferAttribute;
  const normals = geometry.attributes.normal as T.BufferAttribute;
  const uv = geometry.attributes.uv as T.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const top = Math.abs(normals.getY(i)) > 0.5;
    uv.setXY(
      i,
      (top
        ? pos.getX(i) + (s.kind === "ground" ? s.x : s.uvOffsetX ?? 0)
        : pos.getX(i) + pos.getZ(i) + (s.uvOffsetX ?? 0) + (s.uvOffsetZ ?? 0)) / 3,
      (top
        ? pos.getZ(i) + (s.kind === "ground" ? s.z : s.uvOffsetZ ?? 0)
        : pos.getY(i)) / 3,
    );
  }
  uv.needsUpdate = true;
}
