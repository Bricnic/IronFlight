import * as T from "three";
/**
 * Shared solid UV convention: world-scale repeats, one tile per 3m. Top faces
 * map x/z (grounds and clipped roads add the solid offset for continuous tiles);
 * side faces shear x+z against height so walls tile without stretching.
 */
export function scaleSolidUVs(
  geometry: T.BufferGeometry,
  s: { kind: string; x: number; z: number },
  worldAligned = s.kind === "ground",
) {
  const pos = geometry.attributes.position as T.BufferAttribute;
  const normals = geometry.attributes.normal as T.BufferAttribute;
  const uv = geometry.attributes.uv as T.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const top = Math.abs(normals.getY(i)) > 0.5;
    uv.setXY(
      i,
      (top
        ? pos.getX(i) + (worldAligned ? s.x : 0)
        : pos.getX(i) + pos.getZ(i)) / 3,
      (top
        ? pos.getZ(i) + (worldAligned ? s.z : 0)
        : pos.getY(i)) / 3,
    );
  }
  uv.needsUpdate = true;
}
