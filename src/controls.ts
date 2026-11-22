import type { Input } from "./simulation";
/** Either source can drive each axis; matching input uses the stronger value. */
export function combineDrivingInput(controller: Input, keyboard: Input): Input {
  const either = (a: number, b: number) => Math.max(0, a, b) + Math.min(0, a, b);
  const handbrake = Math.max(controller.handbrake ?? 0, keyboard.handbrake ?? 0);
  return {
    throttle: handbrake ? 0 : either(controller.throttle ?? 0, keyboard.throttle ?? 0),
    brake: handbrake ? 0 : Math.max(controller.brake ?? 0, keyboard.brake ?? 0),
    handbrake,
    steer: either(controller.steer ?? 0, keyboard.steer ?? 0),
  };
}
/** Brake against travel, then apply the requested analog forward/reverse drive. */
export function directionalDrive(direction: number, signedSpeed: number): Pick<Input, "throttle" | "brake"> {
  const opposingSpeed = Math.max(0, -Math.sign(direction) * signedSpeed);
  const t = Math.min(1, opposingSpeed / (20 / 3.6));
  const blend = t * t * (3 - 2 * t);
  return { throttle: blend === 1 ? 0 : direction * (1 - blend), brake: Math.abs(direction) * blend };
}
/** +Z forward, +X driver left. Blend the direction change below 20 displayed MPH. */
export function drivingInput(keys: Set<string>, signedSpeed: number): Input {
  const direction =
    Number(keys.has("w") || keys.has("arrowup")) -
    Number(keys.has("s") || keys.has("arrowdown"));
  const handbrake = Number(keys.has(" "));
  const drive = directionalDrive(direction, signedSpeed);
  return {
    throttle: handbrake ? 0 : drive.throttle,
    brake: handbrake ? 0 : drive.brake,
    handbrake,
    steer:
      Number(keys.has("a") || keys.has("arrowleft")) -
      Number(keys.has("d") || keys.has("arrowright")),
  };
}
