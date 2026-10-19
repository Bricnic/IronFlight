import { Vector3 } from "three";
import { HAMMER_SPEED } from "./hazards";
export type HammerImpact = {
  id: string;
  part: string;
  time: number;
  point: number[];
  deltaVelocity: number[];
  damage: number;
};
/** Arcade amplification of the rotor's tangential momentum, with a bounded lift. */
export function hammerStrike(
  radius: Vector3,
  normal: Vector3,
  incoming: Vector3,
) {
  const tangent = new Vector3(-radius.y, radius.x, 0).multiplyScalar(
    HAMMER_SPEED,
  );
  const closing = Math.max(0, tangent.clone().sub(incoming).dot(normal));
  const strength = Math.max(tangent.length(), closing);
  const deltaVelocity = tangent.multiplyScalar(1.7).addScaledVector(normal, 8);
  deltaVelocity.y = Math.max(16, deltaVelocity.y + 12);
  deltaVelocity.clampLength(0, 35);
  return { deltaVelocity, damage: Math.min(260, 110 + strength * 8) };
}
