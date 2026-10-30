import { expect, it } from "vitest";
import { applyPan, panPlaneForButton } from "../src/editor-viewport";

it("routes left button to x/z and right/middle to x/y", () => {
  expect(panPlaneForButton(0)).toBe("xz");
  expect(panPlaneForButton(1)).toBe("xy");
  expect(panPlaneForButton(2)).toBe("xy");
});

it("x/z pan moves x and z only, grab-style", () => {
  const target = { x: 1, y: 2, z: 3 };
  applyPan(target, 10, 6, 0.5, "xz");
  expect(target.x).toBeCloseTo(1 - 10 * 0.5, 9);
  expect(target.z).toBeCloseTo(3 - 6 * 0.5, 9);
  expect(target.y).toBe(2);
});

it("x/y pan moves x and y only, grab-style", () => {
  const target = { x: 1, y: 2, z: 3 };
  applyPan(target, 10, 6, 0.5, "xy");
  expect(target.x).toBeCloseTo(1 - 10 * 0.5, 9);
  expect(target.y).toBeCloseTo(2 + 6 * 0.5, 9);
  expect(target.z).toBe(3);
});
