import * as T from "three";

/** Shadowed headlights illuminate surfaces without unoccluded decorative cones. */
export function buildHeadlightRig(): T.Group {
  const rig = new T.Group();
  rig.name = "headlight-rig";
  for (const side of [-1, 1]) {
    const spot = new T.SpotLight(0xffeecf, 3500, 95, 0.38, 0.6, 1.5);
    spot.position.set(side * 0.92, 0.1, 0.95);
    spot.target.position.set(side * 0.3, -0.5, 14);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.camera.near = 0.15;
    spot.shadow.camera.far = 95;
    spot.shadow.bias = -0.0001;
    spot.shadow.normalBias = 0.03;
    rig.add(spot, spot.target);
    const bulb = new T.Mesh(
      new T.SphereGeometry(0.16, 16, 12),
      new T.MeshStandardMaterial({
        color: 0xfff6da,
        emissive: 0xfff3c4,
        emissiveIntensity: 3,
      }),
    );
    bulb.name = "headlight-bulb";
    bulb.position.set(side * 0.92, 0.1, 0.95);
    rig.add(bulb);
  }
  return rig;
}

/** World bounds of bodywork meshes, skipping light-beam rigs that dwarf them. */
export function bodyBounds(root: T.Object3D, rig?: T.Object3D | null): T.Box3 {
  const bounds = new T.Box3();
  const skip = new Set<T.Object3D>();
  rig?.traverse((o) => skip.add(o));
  root.traverse((o) => {
    if (o instanceof T.Mesh && !skip.has(o)) bounds.expandByObject(o);
  });
  return bounds;
}

/** Mystic caves keep headlights dim so the glow decor reads. */
export const MYSTIC_HEADLIGHT_DIM = 0.35;
/** Scale spot intensity and bulb emissive by dim (0.1-1). */
export function setHeadlightDim(rig: T.Group, dim: number) {
  rig.traverse((o) => {
    if (o instanceof T.SpotLight) o.intensity = 3500 * dim;
    else if (o instanceof T.Mesh && o.name === "headlight-bulb")
      (o.material as T.MeshStandardMaterial).emissiveIntensity = 3 * dim;
  });
}
/** Toggle every light and bulb in the rig together. */
export function setHeadlightRig(rig: T.Group, on: boolean) {
  rig.traverse((o) => {
    if (
      o instanceof T.SpotLight ||
      (o instanceof T.Mesh &&
        o.name === "headlight-bulb")
    )
      o.visible = on;
  });
}
