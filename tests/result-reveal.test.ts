import { expect, test } from "vitest";
import { resultOpacity } from "../src/result-reveal";
test("wreck reveal waits two seconds then fades over three", () => {
  expect(resultOpacity(0)).toBe(0);
  expect(resultOpacity(1.99)).toBe(0);
  expect(resultOpacity(2)).toBe(0);
  expect(resultOpacity(3.5)).toBeCloseTo(0.5);
  expect(resultOpacity(5)).toBe(1);
  expect(resultOpacity(9)).toBe(1);
});
