import * as T from "three";

/** Capped real-light pool: mystic glow decor shares 8 colored point lights. */
export const MYSTIC_LIGHT_COUNT = 8;
export const MYSTIC_LIGHT_BASE = 26;

export interface MysticSource {
  id: string;
  x: number;
  z: number;
  y?: number;
  phase: number;
  color: number;
}

export function buildMysticLightPool(): T.PointLight[] {
  return Array.from({ length: MYSTIC_LIGHT_COUNT }, () => {
    const light = new T.PointLight(0xffffff, 0, 34, 1.8);
    light.castShadow = false;
    light.visible = false;
    return light;
  });
}

/** Light the nearest glow sources in their own colors with a soft shimmer. Returns the lit count. */
export function assignMysticLights(
  pool: T.PointLight[],
  sources: MysticSource[],
  focus: T.Vector3,
  night: boolean,
  time: number,
): number {
  if (!night) {
    for (const light of pool) light.visible = false;
    return 0;
  }
  const nearest = [...sources]
    .sort(
      (a, b) =>
        Math.hypot(a.x - focus.x, a.z - focus.z) -
        Math.hypot(b.x - focus.x, b.z - focus.z),
    )
    .slice(0, pool.length);
  pool.forEach((light, i) => {
    const source = nearest[i];
    if (!source) {
      light.visible = false;
      return;
    }
    light.visible = true;
    light.color.setHex(source.color);
    light.position.set(source.x, (source.y ?? 0) + 2, source.z);
    light.intensity =
      MYSTIC_LIGHT_BASE *
      (1 +
        0.14 * Math.sin(time * 7 + source.phase) +
        0.07 * Math.sin(time * 17 + source.phase * 1.7));
  });
  return nearest.length;
}
