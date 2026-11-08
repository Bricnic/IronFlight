import { expect, it } from "vitest";
import * as T from "three";
import {
  CANDLE_LIGHT_COUNT,
  assignCandleLights,
  buildCandleLightPool,
} from "../src/candle-lights";

const candle = (id: string, x: number, z: number, y = 0, phase = 0) => ({
  id,
  x,
  z,
  y,
  phase,
});
const focus = (x: number, z: number) => new T.Vector3(x, 0, z);

it("builds a shadowless warm pool that starts dark", () => {
  expect(CANDLE_LIGHT_COUNT).toBe(8);
  const pool = buildCandleLightPool();
  expect(pool).toHaveLength(CANDLE_LIGHT_COUNT);
  for (const light of pool) {
    expect(light).toBeInstanceOf(T.PointLight);
    expect(light.castShadow).toBe(false);
    expect(light.distance).toBeGreaterThanOrEqual(20);
    expect(light.visible).toBe(false);
  }
});

it("lights the nearest candles at night and kills every light by day", () => {
  const pool = buildCandleLightPool();
  const candles = [
    candle("far", 100, 0),
    candle("near-1", 5, 0),
    candle("near-2", 0, 6),
  ];
  expect(assignCandleLights(pool, candles, focus(0, 0), false, 1)).toBe(0);
  expect(pool.every((l) => !l.visible)).toBe(true);
  expect(assignCandleLights(pool, candles, focus(0, 0), true, 1)).toBe(3);
  const lit = pool.filter((l) => l.visible);
  expect(lit).toHaveLength(3);
  const positions = lit.map((l) => [l.position.x, l.position.z].join(","));
  expect(positions).toContain("5,0");
  expect(positions).toContain("0,6");
  expect(positions).toContain("100,0");
  for (const light of lit) {
    expect(light.position.y).toBe(2.5);
    expect(light.intensity).toBeGreaterThan(0);
  }
  expect(pool.filter((l) => !l.visible)).toHaveLength(
    CANDLE_LIGHT_COUNT - 3,
  );
});

it("caps the pool at the nearest candles and flickers with time", () => {
  const pool = buildCandleLightPool();
  const candles = Array.from({ length: 12 }, (_, i) =>
    candle(`c${i}`, (i + 1) * 10, 0, 0, i),
  );
  expect(assignCandleLights(pool, candles, focus(0, 0), true, 1)).toBe(
    CANDLE_LIGHT_COUNT,
  );
  const xs = pool
    .filter((l) => l.visible)
    .map((l) => l.position.x)
    .sort((a, b) => a - b);
  expect(xs).toEqual([10, 20, 30, 40, 50, 60, 70, 80]);
  const first = pool.map((l) => l.intensity);
  assignCandleLights(pool, candles, focus(0, 0), true, 1.37);
  const second = pool.map((l) => l.intensity);
  expect(second).not.toEqual(first);
});
