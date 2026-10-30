import { expect, it } from "vitest";
import { applyRotator, rotatorAxisForButton } from "../src/editor-viewport";

it("routes left to yaw, right to pitch, middle to roll", () => {
  expect(rotatorAxisForButton(0)).toBe("yaw");
  expect(rotatorAxisForButton(2)).toBe("pitch");
  expect(rotatorAxisForButton(1)).toBe("roll");
});

it("drives exactly one axis per drag", () => {
  const start = { yaw: 0.5, pitch: -0.25, roll: 1 };
  const yawed = applyRotator(start, "yaw", 20);
  expect(yawed.yaw).toBeCloseTo(0.5 + 20 * 0.01, 9);
  expect(yawed.pitch).toBe(-0.25);
  expect(yawed.roll).toBe(1);
  const pitched = applyRotator(start, "pitch", 20);
  expect(pitched.pitch).toBeCloseTo(-0.25 + 20 * 0.01, 9);
  expect(pitched.yaw).toBe(0.5);
  expect(pitched.roll).toBe(1);
  const rolled = applyRotator(start, "roll", -30);
  expect(rolled.roll).toBeCloseTo(1 - 30 * 0.01, 9);
  expect(rolled.yaw).toBe(0.5);
  expect(rolled.pitch).toBe(-0.25);
});
