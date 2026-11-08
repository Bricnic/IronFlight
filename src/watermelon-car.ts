import * as T from "three";
import { createTruck, type TruckMaterials } from "./truck";

/** Watermelon show truck: rind-green hero paint with a trophy slice on the roof. */
export function createWatermelonCar(_materials: TruckMaterials = {}) {
  const paint = new T.MeshStandardMaterial({
    color: 0x2e8b3a,
    metalness: 0.4,
    roughness: 0.35,
  });
  const truck = createTruck({ paint });
  const slice = new T.Group();
  slice.name = "melon-slice";
  slice.position.set(0, 2.35, -0.05);
  const rind = new T.Mesh(
    new T.CylinderGeometry(1.15, 1.15, 2.0, 20, 1, false, 0, Math.PI),
    new T.MeshStandardMaterial({ color: 0x1f6b2a, roughness: 0.5 }),
  );
  rind.rotation.z = Math.PI / 2;
  rind.rotation.y = Math.PI / 2;
  rind.castShadow = true;
  slice.add(rind);
  const flesh = new T.Mesh(
    new T.CylinderGeometry(0.95, 0.95, 2.02, 20, 1, false, 0, Math.PI),
    new T.MeshStandardMaterial({ color: 0xe63b52, roughness: 0.55 }),
  );
  flesh.rotation.z = Math.PI / 2;
  flesh.rotation.y = Math.PI / 2;
  flesh.position.y = 0.06;
  flesh.castShadow = true;
  flesh.userData.melon = "flesh";
  slice.add(flesh);
  const seed = new T.MeshStandardMaterial({ color: 0x1a1214, roughness: 0.4 });
  for (let i = 0; i < 5; i++) {
    const dot = new T.Mesh(new T.SphereGeometry(0.09, 8, 6), seed);
    dot.position.set(-0.8 + i * 0.4, 0.1, 0.75 - (i % 2) * 0.3);
    slice.add(dot);
  }
  truck.add(slice);
  return truck;
}
