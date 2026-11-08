import { expect, it } from "vitest";
import * as T from "three";
import {
  RAIN_STREAK_COUNT,
  RAIN_STREAK_HEIGHT,
  buildRainStreaks,
  layoutRainStreaks,
} from "../src/rain-streaks";

it("builds fog-free diagonal streak segments", () => {
  const rain = buildRainStreaks(RAIN_STREAK_COUNT);
  expect(rain).toBeInstanceOf(T.LineSegments);
  const pos = rain.geometry.getAttribute("position");
  expect(pos.count).toBe(RAIN_STREAK_COUNT * 2);
  const mat = rain.material as T.LineBasicMaterial;
  expect(mat.fog).toBe(false);
  expect(mat.transparent).toBe(true);
  expect(rain.frustumCulled).toBe(false);
  // Segment tops lean with the wind so streaks read as diagonal.
  const dx = pos.getX(1) - pos.getX(0);
  const dy = pos.getY(1) - pos.getY(0);
  expect(Math.abs(dx)).toBeGreaterThan(0.1);
  expect(dy).toBeGreaterThan(0);
});

it("lays streaks out as a pure function of time", () => {
  const rain = buildRainStreaks(64);
  layoutRainStreaks(rain, 1.0);
  const a = rain.geometry.getAttribute("position").array.slice();
  layoutRainStreaks(rain, 1.0);
  expect(rain.geometry.getAttribute("position").array).toEqual(a);
  layoutRainStreaks(rain, 2.0);
  const b = rain.geometry.getAttribute("position").array;
  expect(b).not.toEqual(a);
  for (let i = 0; i < b.length; i += 3) {
    expect(b[i + 1]).toBeGreaterThanOrEqual(0);
    expect(b[i + 1]).toBeLessThanOrEqual(RAIN_STREAK_HEIGHT);
  }
});

it("falls downward over time", () => {
  const rain = buildRainStreaks(64);
  layoutRainStreaks(rain, 1.0);
  const y0 = rain.geometry.getAttribute("position").getY(0);
  layoutRainStreaks(rain, 1.05);
  const y1 = rain.geometry.getAttribute("position").getY(0);
  expect(y1).toBeLessThan(y0);
});
