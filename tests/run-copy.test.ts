import { expect, it } from "vitest";
import { formatDelta, hudBestCopy } from "../src/run-copy";

it("formats checkpoint deltas as signed tenths", () => {
  expect(formatDelta(-0.2)).toBe("-0.2");
  expect(formatDelta(3.6)).toBe("+3.6");
  expect(formatDelta(3.64)).toBe("+3.6");
  expect(formatDelta(-3.66)).toBe("-3.7");
  expect(formatDelta(0)).toBe("+0.0");
  expect(formatDelta(-0.04)).toBe("+0.0");
});

it("formats in-game best rows with medal words and color classes", () => {
  expect(hudBestCopy({ time: 35.34, medal: "gold" })).toEqual({
    time: "35.3s",
    medal: "GOLD",
    medalClass: "gold",
  });
  expect(hudBestCopy({ time: 60, medal: "silver" }).medal).toBe("SILVER");
  expect(hudBestCopy({ time: 80, medal: null })).toEqual({
    time: "80.0s",
    medal: "COMPLETED",
    medalClass: "",
  });
  expect(hudBestCopy(null)).toEqual({
    time: "—",
    medal: "UNRANKED",
    medalClass: "",
  });
});
