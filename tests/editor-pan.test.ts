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

// North Pole Summit spawns with yaw PI/2, so the editor camera orbits at
// theta 3PI/2 (looking down +X). Screen-right is world +Z there, so a
// horizontal ground drag must move z, and a vertical drag must move x,
// keeping the world glued to the cursor.
it("x/z pan follows the camera yaw, grab-style", () => {
  const theta = (3 * Math.PI) / 2;
  const right = { x: 1, y: 2, z: 3 };
  applyPan(right, 10, 0, 0.5, "xz", theta);
  expect(right.x).toBeCloseTo(1, 9);
  expect(right.z).toBeCloseTo(3 - 10 * 0.5, 9);
  expect(right.y).toBe(2);
  const down = { x: 1, y: 2, z: 3 };
  applyPan(down, 0, 6, 0.5, "xz", theta);
  expect(down.x).toBeCloseTo(1 + 6 * 0.5, 9);
  expect(down.z).toBeCloseTo(3, 9);
  expect(down.y).toBe(2);
});

it("x/y pan follows the camera yaw, grab-style", () => {
  const theta = (3 * Math.PI) / 2;
  const target = { x: 1, y: 2, z: 3 };
  applyPan(target, 10, 6, 0.5, "xy", theta);
  expect(target.x).toBeCloseTo(1, 9);
  expect(target.z).toBeCloseTo(3 - 10 * 0.5, 9);
  expect(target.y).toBeCloseTo(2 + 6 * 0.5, 9);
});
