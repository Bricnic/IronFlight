import * as T from "three";
import { mulberry32 } from "./backgrounds";

/** Wind-slanted rain streaks around the camera; layout is a pure function of time. */
export const RAIN_STREAK_COUNT = 900;
export const RAIN_STREAK_HEIGHT = 80;
const RAIN_STREAK_RADIUS = 70;
const RAIN_FALL_SPEED = 42;
const RAIN_SLANT = 1.4;
const RAIN_LENGTH = 2.4;

export function buildRainStreaks(count: number): T.LineSegments {
  const rand = mulberry32(0x7a17);
  const base = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    base[i * 3] = (rand() * 2 - 1) * RAIN_STREAK_RADIUS;
    base[i * 3 + 1] = rand() * RAIN_STREAK_HEIGHT;
    base[i * 3 + 2] = (rand() * 2 - 1) * RAIN_STREAK_RADIUS;
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute(
    "position",
    new T.BufferAttribute(new Float32Array(count * 6), 3),
  );
  const material = new T.LineBasicMaterial({
    color: 0x9fc0d8,
    transparent: true,
    opacity: 0.35,
    fog: false,
    depthWrite: false,
  });
  const rain = new T.LineSegments(geometry, material);
  rain.name = "background-rain";
  rain.userData.base = base;
  rain.raycast = () => {};
  rain.frustumCulled = false;
  layoutRainStreaks(rain, 0);
  return rain;
}

/** Drop every streak and wrap it back to the top; deterministic per timestamp. */
export function layoutRainStreaks(rain: T.LineSegments, time: number) {
  const base = rain.userData.base as Float32Array;
  const pos = rain.geometry.getAttribute("position") as T.BufferAttribute;
  const count = base.length / 3;
  for (let i = 0; i < count; i++) {
    const x = base[i * 3];
    const z = base[i * 3 + 2];
    let y = (base[i * 3 + 1] - time * RAIN_FALL_SPEED) % RAIN_STREAK_HEIGHT;
    if (y < 0) y += RAIN_STREAK_HEIGHT;
    pos.setXYZ(i * 2, x, y, z);
    pos.setXYZ(i * 2 + 1, x + RAIN_SLANT, Math.min(y + RAIN_LENGTH, RAIN_STREAK_HEIGHT), z);
  }
  pos.needsUpdate = true;
}
