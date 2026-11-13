import { expect, it } from "vitest";
import * as T from "three";
import { createTruck } from "../src/truck";

function rearWindow(): T.Mesh {
  const found = createTruck().getObjectByName("rear-window");
  expect(found).toBeDefined();
  return found as T.Mesh;
}

it("rear window is transparent glass, not an opaque white panel", () => {
  const mat = rearWindow().material as T.MeshPhysicalMaterial;
  expect(mat.transparent).toBe(true);
  expect(mat.opacity).toBeLessThan(0.5);
  expect(mat.color.getHex()).not.toBe(0xffffff);
});

it("windshield shares the same glass material family", () => {
  const found = createTruck().getObjectByName("windshield");
  expect(found).toBeDefined();
  const mat = (found as T.Mesh).material as T.MeshPhysicalMaterial;
  expect(mat.transparent).toBe(true);
  expect(mat.opacity).toBeLessThan(0.5);
});
