import { expect, it } from "vitest";
import { degreesToRadians, radiansToDegrees } from "../src/editor-angles";
it.each([45, 90, 135, -45, -90, -135, 180, 360, 720])("round-trips %s degrees without wrapping away full turns", degrees => {
  expect(degreesToRadians(degrees)).toBeCloseTo(degrees * Math.PI / 180);
  expect(radiansToDegrees(degreesToRadians(degrees))).toBeCloseTo(degrees);
});
