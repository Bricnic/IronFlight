import { PerspectiveCamera, Quaternion, Vector3 } from "three";
export class ChaseCamera {
  yaw = 0;
  pitch = Math.atan2(5.5, 14);
  private height = 0;
  private heading = 0;
  private initialized = false;
  constructor(readonly camera: PerspectiveCamera) {}
  reset() {
    this.initialized = false;
    this.yaw = 0;
    this.pitch = Math.atan2(5.5, 14);
  }
  drag(dx: number, dy: number) {
    this.yaw -= dx * 0.004;
    this.pitch = Math.max(-0.12, Math.min(1.05, this.pitch + dy * 0.004));
  }
  update(position: Vector3, rotation: Quaternion, dt: number, snap = false) {
    const forward = new Vector3(0, 0, 1).applyQuaternion(rotation),
      heading = Math.atan2(forward.x, forward.z);
    if (snap || !this.initialized) {
      this.height = position.y;
      this.heading = heading;
      this.initialized = true;
    } else {
      this.height +=
        (position.y - this.height) * (1 - Math.exp(-8 * Math.max(0, dt)));
      const delta = Math.atan2(
        Math.sin(heading - this.heading),
        Math.cos(heading - this.heading),
      );
      this.heading += delta * (1 - Math.exp(-10 * Math.max(0, dt)));
    }
    const anchor = new Vector3(position.x, this.height, position.z),
      angle = this.heading + this.yaw,
      distance = 15.04;
    this.camera.position
      .copy(anchor)
      .add(
        new Vector3(
          -Math.sin(angle) * Math.cos(this.pitch) * distance,
          Math.sin(this.pitch) * distance,
          -Math.cos(angle) * Math.cos(this.pitch) * distance,
        ),
      );
    this.camera.lookAt(
      anchor
        .clone()
        .add(
          new Vector3(
            Math.sin(this.heading) * 5,
            0.8,
            Math.cos(this.heading) * 5,
          ),
        ),
    );
    this.camera.updateMatrixWorld();
  }
}
