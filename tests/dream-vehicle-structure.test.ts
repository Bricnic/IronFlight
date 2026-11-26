import { describe, expect, it } from "vitest";
import * as T from "three";
import { DREAM_VEHICLES, dreamAnimate } from "../src/dream-vehicles";
import { getVehicle } from "../src/vehicles";

/** Broad-phase attachment audit. A gap here proves a floating component;
 * touching bounds still require the multi-angle visual review for curved parts.
 * Wheels retain the existing shared chassis and are excluded from bodywork checks.
 */
function unsupported(root: T.Group) {
  root.updateMatrixWorld(true);
  const meshes: T.Mesh[] = [];
  root.traverse((node) => {
    if (!(node instanceof T.Mesh)) return;
    let parent: T.Object3D | null = node;
    while (parent && !parent.name.startsWith("wheel-")) parent = parent.parent;
    if (!parent) meshes.push(node);
  });
  const boxes = meshes.map((mesh) =>
    new T.Box3().setFromObject(mesh).expandByScalar(0.012),
  );
  const attached = new Set<number>();
  meshes.forEach((mesh, i) => {
    if (
      mesh.parent?.name === "chassis-front" ||
      mesh.parent?.name === "chassis-rear"
    )
      attached.add(i);
  });
  let changed = true;
  while (changed) {
    changed = false;
    boxes.forEach((box, i) => {
      if (attached.has(i)) return;
      if ([...attached].some((j) => box.intersectsBox(boxes[j]))) {
        attached.add(i);
        changed = true;
      }
    });
  }
  return meshes
    .filter((_, i) => !attached.has(i))
    .map((mesh) => ({
      part: mesh.parent?.name,
      geometry: mesh.geometry.type,
      center: new T.Box3()
        .setFromObject(mesh)
        .getCenter(new T.Vector3())
        .toArray(),
    }));
}

describe("dream vehicle bodywork", () => {
  for (const vehicle of DREAM_VEHICLES.filter((v) => v.id !== "cake-cruiser")) {
    it(`${vehicle.id} has no isolated bodywork across its animation cycle`, () => {
      const root = vehicle.build();
      try {
        for (const time of [0, 0.37, 0.73, 1.46, 2.19, 2.92, 4.1]) {
          dreamAnimate(root, time);
          expect(unsupported(root), `unsupported at ${time}s`).toEqual([]);
        }
      } finally {
        root.traverse((o) => {
          if (o instanceof T.Mesh) o.geometry.dispose();
        });
      }
    });
  }
  it("detects a roof moved clear of the vehicle", () => {
    const root = DREAM_VEHICLES.find((v) => v.id === "windup-wonder")!.build();
    root.getObjectByName("roof")!.position.y += 10;
    expect(unsupported(root).length).toBeGreaterThan(0);
  });
  it("preserves old saved space-car selections as the new rover", () => {
    expect(getVehicle("saturn-saucer").id).toBe("meteor-prospector");
    expect(getVehicle("meteor-prospector").name).toBe("Meteor Prospector");
  });
});
