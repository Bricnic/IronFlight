import * as T from "three";

/** Capped real-light pool: 27 dungeon candles share 8 flickering point lights. */
export const CANDLE_LIGHT_COUNT = 8;
export const CANDLE_LIGHT_BASE = 30;

export interface CandleSource {
  id: string;
  x: number;
  z: number;
  y?: number;
  phase: number;
}

export function buildCandleLightPool(): T.PointLight[] {
  return Array.from({ length: CANDLE_LIGHT_COUNT }, () => {
    const light = new T.PointLight(0xffa64a, 0, 30, 1.8);
    light.castShadow = false;
    light.visible = false;
    return light;
  });
}

/** Light the nearest candles at flame height with flame-synced flicker. Returns the lit count. */
export function assignCandleLights(
  pool: T.PointLight[],
  candles: CandleSource[],
  focus: T.Vector3,
  night: boolean,
  time: number,
): number {
  if (!night) {
    for (const light of pool) light.visible = false;
    return 0;
  }
  const nearest = [...candles]
    .sort(
      (a, b) =>
        Math.hypot(a.x - focus.x, a.z - focus.z) -
        Math.hypot(b.x - focus.x, b.z - focus.z),
    )
    .slice(0, pool.length);
  pool.forEach((light, i) => {
    const candle = nearest[i];
    if (!candle) {
      light.visible = false;
      return;
    }
    light.visible = true;
    light.position.set(candle.x, (candle.y ?? 0) + 2.5, candle.z);
    light.intensity =
      CANDLE_LIGHT_BASE *
      (1 +
        0.12 * Math.sin(time * 13 + candle.phase) +
        0.06 * Math.sin(time * 29 + candle.phase * 1.3));
  });
  return nearest.length;
}
