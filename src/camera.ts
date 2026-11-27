import { Quaternion, Vector3, type Object3D } from "three";
export class ChaseCamera {
  yaw = 0;
  pitch = Math.atan2(5.5, 14);
  distance = 15.04;
  private height = 0;
  private sinkBlend = 0;
  private heading = 0;
  private vehiclePitch = 0;
  private initialized = false;
  constructor(readonly camera: Object3D) {}
  reset() {
    this.initialized = false;
    this.sinkBlend = 0;
    this.vehiclePitch = 0;
    this.yaw = 0;
    this.pitch = Math.atan2(5.5, 14);
    this.distance = 15.04;
  }
  drag(dx: number, dy: number) {
    this.yaw -= dx * 0.004;
    this.pitch = Math.max(-0.12, Math.min(1.05, this.pitch + dy * 0.004));
  }
  zoom(deltaPixels: number) {
    if (!Number.isFinite(deltaPixels)) return;
    this.distance = Math.max(
      6,
      Math.min(45, this.distance * Math.exp(deltaPixels * 0.001)),
    );
  }
  update(
    position: Vector3,
    rotation: Quaternion,
    dt: number,
    snap = false,
    sinking = false,
    roll = 0,
  ) {
    const forward = new Vector3(0, 0, 1).applyQuaternion(rotation);
    const horizontal = Math.hypot(forward.x, forward.z);
    // Near vertical, the projected heading is undefined; keep the last heading.
    const heading =
      horizontal > 1e-5 ? Math.atan2(forward.x, forward.z) : this.heading;
    const vehiclePitch = Math.atan2(forward.y, horizontal);
    if (snap || !this.initialized) {
      this.height = position.y;
      this.heading = heading;
      this.vehiclePitch = vehiclePitch;
      this.initialized = true;
    } else {
      this.height +=
        (position.y - this.height) * (1 - Math.exp(-8 * Math.max(0, dt)));
      const delta = Math.atan2(
        Math.sin(heading - this.heading),
        Math.cos(heading - this.heading),
      );
      this.heading += delta * (1 - Math.exp(-10 * Math.max(0, dt)));
      this.vehiclePitch +=
        (vehiclePitch - this.vehiclePitch) *
        (1 - Math.exp(-8 * Math.max(0, dt)));
    }
    const anchor = new Vector3(position.x, this.height, position.z),
      angle = this.heading + this.yaw,
      distance = this.distance;
    // Pitch the follow offset and look-ahead together, without inheriting roll.
    const pitchRotation = new Quaternion().setFromAxisAngle(
      new Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading)),
      -this.vehiclePitch,
    );
    this.camera.position
      .copy(anchor)
      .add(
        new Vector3(
          -Math.sin(angle) * Math.cos(this.pitch) * distance,
          Math.sin(this.pitch) * distance,
          -Math.cos(angle) * Math.cos(this.pitch) * distance,
        ).applyQuaternion(pitchRotation),
      );
    this.sinkBlend +=
      ((sinking ? 1 : 0) - this.sinkBlend) *
      (1 - Math.exp(-5 * Math.max(dt, snap ? 1 : 0)));
    if (sinking) {
      this.camera.position.lerp(
        new Vector3(position.x, Math.max(12, position.y + 18), position.z - 7),
        this.sinkBlend,
      );
      this.camera.position.y = Math.max(8, this.camera.position.y);
    }
    this.camera.lookAt(
      (sinking ? position : anchor)
        .clone()
        .add(
          new Vector3(
            Math.sin(this.heading) * 5,
            0.8,
            Math.cos(this.heading) * 5,
          ).applyQuaternion(pitchRotation),
        ),
    );
    // Mystic venom rolls the world upside down while poisoned.
    if (roll) this.camera.rotateZ(roll);
    this.camera.updateMatrixWorld();
  }
}
