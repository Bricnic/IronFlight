import { expect, it } from "vitest";
import { formatDelta } from "../src/run-copy";

it("formats checkpoint deltas as signed tenths", () => {
  expect(formatDelta(-0.2)).toBe("-0.2");
  expect(formatDelta(3.6)).toBe("+3.6");
  expect(formatDelta(3.64)).toBe("+3.6");
  expect(formatDelta(-3.66)).toBe("-3.7");
  expect(formatDelta(0)).toBe("+0.0");
  expect(formatDelta(-0.04)).toBe("+0.0");
});
