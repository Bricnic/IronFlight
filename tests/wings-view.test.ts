import { expect, it } from "vitest";
import {
  buildWings,
  buildWingsPickup,
  poseWings,
  wingsStats,
} from "../src/wings-view";

it("builds dense paired wings with flappable pivots", () => {
  const wings = buildWings(1);
  expect(wings.getObjectByName("wingL")).toBeDefined();
  expect(wings.getObjectByName("wingR")).toBeDefined();
  expect(wingsStats(wings).triangles).toBeGreaterThan(5000);
  const left = wings.getObjectByName("wingL")!;
  poseWings(wings, 0, "fold");
  const folded = left.rotation.z;
  poseWings(wings, 0.3, "flap");
  expect(left.rotation.z).not.toBeCloseTo(folded, 5);
  poseWings(wings, 1, "glide");
  expect(left.rotation.z).toBeCloseTo(-0.12 - Math.sin(2.2) * 0.05, 5);
});

it("builds a glowing wings pickup with a ring", () => {
  const pickup = buildWingsPickup(2);
  expect(pickup.getObjectByName("dream-wings")).toBeDefined();
  expect(wingsStats(pickup).triangles).toBeGreaterThan(5000);
  expect(pickup.scale.x).toBe(2);
});
