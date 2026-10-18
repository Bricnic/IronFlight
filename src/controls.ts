import type { Input } from "./simulation";
/** Positive steer is the driver's left: +X for a truck facing +Z. */
export function drivingInput(keys: Set<string>, signedSpeed: number): Input {
  const forward = keys.has("w") || keys.has("arrowup"),
    reverse = keys.has("s") || keys.has("arrowdown");
  let throttle = 0,
    brake = Number(keys.has(" "));
  if (forward && !reverse) {
    if (signedSpeed < -1) brake = 1;
    else throttle = 1;
  }
  if (reverse && !forward) {
    if (signedSpeed > 1) brake = 1;
    else throttle = -1;
  }
  if (brake) throttle = 0;
  return {
    throttle,
    brake,
    steer:
      Number(keys.has("a") || keys.has("arrowleft")) -
      Number(keys.has("d") || keys.has("arrowright")),
  };
}
