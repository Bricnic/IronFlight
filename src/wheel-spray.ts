import * as T from "three";
import { makeGlowTexture } from "./course-view";

/** Rooster-tail spray: mist puffs churned up behind the rear wheels in rain. */
export const SPRAY_PUFFS = 12;
export const SPRAY_MIN_SPEED = 6;
const SPRAY_CYCLE = 0.9;

export function buildWheelSpray(): T.Group {
  const spray = new T.Group();
  spray.name = "wheel-spray";
  spray.visible = false;
  for (let i = 0; i < SPRAY_PUFFS; i++) {
    const mat = new T.SpriteMaterial({
      map: makeGlowTexture(),
      color: 0xc9d6e2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const puff = new T.Sprite(mat);
    puff.name = "spray-puff";
    puff.userData.phase = i / SPRAY_PUFFS;
    puff.userData.side = i % 2 === 0 ? -1 : 1;
    puff.raycast = () => {};
    spray.add(puff);
  }
  return spray;
}

/** Cycle puffs upward and outward; visible only when raining and rolling. */
export function updateWheelSpray(
  spray: T.Group,
  time: number,
  speed: number,
  rain: boolean,
) {
  spray.visible = rain && speed >= SPRAY_MIN_SPEED;
  if (!spray.visible) return;
  const strength = Math.min(1, speed / 24);
  for (const o of spray.children) {
    if (!(o instanceof T.Sprite)) continue;
    const phase = (((time / SPRAY_CYCLE + (o.userData.phase as number)) % 1) + 1) % 1;
    const side = o.userData.side as number;
    o.position.set(
      side * (0.9 + phase * 1.4),
      0.4 + phase * 2.2,
      -2.2 - phase * (2.5 + strength * 2.5),
    );
    const scale = 0.8 + phase * (1.6 + strength * 1.2);
    o.scale.set(scale, scale, 1);
    (o.material as T.SpriteMaterial).opacity = (1 - phase) * 0.5 * strength;
  }
}
