import * as T from "three";

const configured = new WeakSet<T.Mesh>();
/** Solid surface materials cast and receive shadows; flames, labels and halos do not. */
export function configureShadowSurfaces(root: T.Object3D) {
  root.traverse(o => {
    if (!(o instanceof T.Mesh) || configured.has(o) || o.parent?.userData.ignoreBounds) return;
    configured.add(o);
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    if (materials.some(m => m instanceof T.MeshStandardMaterial)) o.castShadow = o.receiveShadow = true;
  });
}
