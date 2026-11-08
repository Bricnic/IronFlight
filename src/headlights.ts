import * as T from "three";

/** Twin headlight rig: spotlights, volumetric-look cones and bulbs. */
export function buildHeadlightRig(): T.Group {
  const rig = new T.Group();
  rig.name = "headlight-rig";
  for (const side of [-1, 1]) {
    const spot = new T.SpotLight(0xffeecf, 250, 70, 0.42, 0.6, 1.5);
    spot.position.set(side * 0.92, 0.1, 0.95);
    spot.target.position.set(side * 0.3, -0.5, 14);
    spot.castShadow = false;
    rig.add(spot, spot.target);
    const cone = new T.Mesh(
      new T.ConeGeometry(3.2, 14, 24, 1, true),
      new T.MeshBasicMaterial({
        color: 0xffedb8,
        transparent: true,
        opacity: 0.12,
        blending: T.AdditiveBlending,
        depthWrite: false,
        fog: false,
        side: T.DoubleSide,
      }),
    );
    cone.name = "headlight-cone";
    cone.rotation.x = -Math.PI / 2;
    cone.position.set(side * 0.92, 0.1, 0.95 + 7);
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
