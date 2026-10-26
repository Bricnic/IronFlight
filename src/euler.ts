import * as T from "three";
/**
 * Yaw/pitch/roll convention shared by sim colliders and every view: three.js
 * Euler order YXZ with x = pitch (angle), y = yaw, z = roll.
 */
export function solidQuaternion(s: {
  yaw?: number;
  angle?: number;
  roll?: number;
}): T.Quaternion {
  return new T.Quaternion().setFromEuler(
    new T.Euler(s.angle ?? 0, s.yaw ?? 0, s.roll ?? 0, "YXZ"),
  );
}
/**
 * Virtual trackball: drag (dx, dy) rotates about the camera-relative axis
 * through the grab point. Returns fresh yaw/pitch/roll in YXZ order.
 */
export function trackballEuler(
  start: { yaw: number; pitch: number; roll: number },
  dx: number,
  dy: number,
  camRight: { x: number; y: number; z: number },
  camUp: { x: number; y: number; z: number },
): { yaw: number; pitch: number; roll: number } {
  const angle = Math.hypot(dx, dy) * 0.01;
  if (!(angle > 0)) return { ...start };
  const axis = new T.Vector3(
    camUp.x * dx - camRight.x * dy,
    camUp.y * dx - camRight.y * dy,
    camUp.z * dx - camRight.z * dy,
  );
  if (axis.lengthSq() < 1e-12) return { ...start };
  axis.normalize();
  const q = new T.Quaternion()
    .setFromAxisAngle(axis, angle)
    .multiply(
      new T.Quaternion().setFromEuler(
        new T.Euler(start.pitch, start.yaw, start.roll, "YXZ"),
      ),
    );
  const e = new T.Euler().setFromQuaternion(q, "YXZ");
  return { yaw: e.y, pitch: e.x, roll: e.z };
}
