import { expect, it } from "vitest";
import { confettiDelta } from "../src/confetti";
it("uses real time after completion while keeping ordinary pauses tied to simulation time", () => {
  expect(confettiDelta(0, 0.016, true)).toBe(0.016);
  expect(confettiDelta(0, 0.016, false)).toBe(0);
  expect(confettiDelta(0.02, undefined, true)).toBe(0.02);
  expect(confettiDelta(1, 1, true)).toBe(0.05);
});
