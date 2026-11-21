import { expect, it } from "vitest";
import * as T from "three";
import {
  MYSTIC_LIGHT_COUNT,
  assignMysticLights,
  buildMysticLightPool,
} from "../src/mystic-lights";

const source = (id: string, x: number, z: number, color = 0x4ff5e0, y = 0, phase = 0) => ({
  id,
  x,
  z,
  y,
  phase,
  color,
});
const focus = (x: number, z: number) => new T.Vector3(x, 0, z);

it("builds a shadowless pool that starts dark", () => {
  expect(MYSTIC_LIGHT_COUNT).toBe(8);
  const pool = buildMysticLightPool();
  expect(pool).toHaveLength(MYSTIC_LIGHT_COUNT);
  for (const light of pool) {
    expect(light).toBeInstanceOf(T.PointLight);
    expect(light.castShadow).toBe(false);
    expect(light.distance).toBeGreaterThanOrEqual(20);
    expect(light.visible).toBe(false);
  }
});

it("lights the nearest sources in their own colors at night, dark by day", () => {
  const pool = buildMysticLightPool();
  const sources = [
    source("far", 100, 0, 0xffd23b),
    source("near-1", 5, 0, 0x4ff5e0),
    source("near-2", 0, 6, 0xff6fe0),
  ];
  expect(assignMysticLights(pool, sources, focus(0, 0), false, 1)).toBe(0);
  expect(pool.every((l) => !l.visible)).toBe(true);
  expect(assignMysticLights(pool, sources, focus(0, 0), true, 1)).toBe(3);
  const lit = pool.filter((l) => l.visible);
  expect(lit).toHaveLength(3);
  expect(new Set(lit.map((l) => l.color.getHex()))).toEqual(new Set([0x4ff5e0, 0xff6fe0, 0xffd23b]));
  for (const light of lit) expect(light.intensity).toBeGreaterThan(0);
  expect(pool.filter((l) => !l.visible)).toHaveLength(MYSTIC_LIGHT_COUNT - 3);
});

it("caps the pool at the nearest sources and shimmers with time", () => {
  const pool = buildMysticLightPool();
  const sources = Array.from({ length: 12 }, (_, i) =>
    source(`s${i}`, (i + 1) * 10, 0, 0x4ff5e0, 0, i),
  );
  expect(assignMysticLights(pool, sources, focus(0, 0), true, 1)).toBe(MYSTIC_LIGHT_COUNT);
  const xs = pool
    .filter((l) => l.visible)
    .map((l) => l.position.x)
    .sort((a, b) => a - b);
  expect(xs).toEqual([10, 20, 30, 40, 50, 60, 70, 80]);
  const first = pool.map((l) => l.intensity);
  assignMysticLights(pool, sources, focus(0, 0), true, 1.37);
  expect(pool.map((l) => l.intensity)).not.toEqual(first);
});
