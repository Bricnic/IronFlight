import * as T from "three";

/** Twin headlight rig: spotlights, volumetric-look cones and bulbs. */
export function buildHeadlightRig(): T.Group {
  const rig = new T.Group();
  rig.name = "headlight-rig";
  for (const side of [-1, 1]) {
    const spot = new T.SpotLight(0xffeecf, 3500, 95, 0.38, 0.6, 1.5);
    spot.position.set(side * 0.92, 0.1, 0.95);
    spot.target.position.set(side * 0.3, -0.5, 14);
    spot.castShadow = false;
    rig.add(spot, spot.target);
    const cone = new T.Mesh(
      new T.ConeGeometry(4.2, 24, 24, 1, true),
      new T.MeshBasicMaterial({
        color: 0xffedb8,
        transparent: true,
        opacity: 0.06,
        blending: T.AdditiveBlending,
        depthWrite: false,
        fog: false,
        side: T.DoubleSide,
      }),
    );
    cone.name = "headlight-cone";
    cone.raycast = () => {};
    cone.rotation.x = -Math.PI / 2;
    cone.position.set(side * 0.92, 0.1, 0.95 + 12);
    rig.add(cone);
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

/** Toggle every light, cone and bulb in the rig together. */
export function setHeadlightRig(rig: T.Group, on: boolean) {
  rig.traverse((o) => {
    if (
      o instanceof T.SpotLight ||
      (o instanceof T.Mesh &&
        (o.name === "headlight-cone" || o.name === "headlight-bulb"))
    )
      o.visible = on;
  });
}
