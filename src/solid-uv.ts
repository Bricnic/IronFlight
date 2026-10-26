import * as T from "three";
/**
 * Shared solid UV convention: world-scale repeats, one tile per 3m. Top faces
 * map world x/z (grounds add the solid offset so tiles stay continuous);
 * side faces shear x+z against height so walls tile without stretching.
 */
export function scaleSolidUVs(
  geometry: T.BufferGeometry,
  s: { kind: string; x: number; z: number },
) {
  const pos = geometry.attributes.position as T.BufferAttribute;
  const normals = geometry.attributes.normal as T.BufferAttribute;
  const uv = geometry.attributes.uv as T.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const top = Math.abs(normals.getY(i)) > 0.5;
    uv.setXY(
      i,
      (top
        ? pos.getX(i) + (s.kind === "ground" ? s.x : 0)
        : pos.getX(i) + pos.getZ(i)) / 3,
      (top
        ? pos.getZ(i) + (s.kind === "ground" ? s.z : 0)
        : pos.getY(i)) / 3,
    );
  }
  uv.needsUpdate = true;
}
