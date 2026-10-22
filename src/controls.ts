import type { Input } from "./simulation";
/** +Z forward, +X driver left. Blend the direction change below 20 displayed MPH. */
export function drivingInput(keys: Set<string>, signedSpeed: number): Input {
  const direction =
    Number(keys.has("w") || keys.has("arrowup")) -
    Number(keys.has("s") || keys.has("arrowdown"));
  const handbrake = Number(keys.has(" "));
  const opposingSpeed = Math.max(0, -direction * signedSpeed);
  const t = Math.min(1, opposingSpeed / (20 / 3.6));
  const blend = t * t * (3 - 2 * t);
  return {
    throttle: handbrake || blend === 1 ? 0 : direction * (1 - blend),
    brake: handbrake ? 0 : direction ? blend : 0,
    handbrake,
    steer:
      Number(keys.has("a") || keys.has("arrowleft")) -
      Number(keys.has("d") || keys.has("arrowright")),
  };
}
