import { expect, it } from "vitest";
import * as T from "three";
import {
  WET_ENV,
  WET_ROUGHNESS,
  applyWetGloss,
  type Wettable,
} from "../src/course-view";

function wettable(roughness = 0.95, env = 1): Wettable {
  const mat = new T.MeshStandardMaterial({ roughness, color: 0xc3c4c5 });
  mat.envMapIntensity = env;
  return { mat, roughness, env, color: 0xc3c4c5 };
}

it("glosses wet surfaces and reports the count", () => {
  expect(WET_ROUGHNESS).toBeLessThan(0.3);
  expect(WET_ENV).toBeGreaterThan(1);
  const surfaces = [wettable(), wettable(0.6, 0.8)];
  expect(applyWetGloss(surfaces, true)).toBe(2);
  for (const w of surfaces) {
    expect(w.mat.roughness).toBe(WET_ROUGHNESS);
    expect(w.mat.envMapIntensity).toBe(WET_ENV);
    expect(w.mat.color.getHex()).toBeLessThan(w.color);
  }
});

it("restores day values when dry", () => {
  const surfaces = [wettable(0.95, 1), wettable(0.6, 0.8)];
  applyWetGloss(surfaces, true);
  expect(applyWetGloss(surfaces, false)).toBe(0);
  expect(surfaces[0].mat.roughness).toBe(0.95);
  expect(surfaces[0].mat.envMapIntensity).toBe(1);
  expect(surfaces[1].mat.roughness).toBe(0.6);
  expect(surfaces[1].mat.envMapIntensity).toBe(0.8);
  expect(surfaces[0].mat.color.getHex()).toBe(0xc3c4c5);
});
