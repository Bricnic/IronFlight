import { it, expect } from "vitest";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import { ChaseCamera } from "../src/camera";

it.each([-0.4, 0.4])(
  "follows vehicle pitch %s with a matching camera offset and look-ahead",
  (incline) => {
    const anchor = new Vector3(4, 12, 7);
    const yaw = 0.7;
    const heading = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      yaw,
    );
    const vehicleRotation = heading
      .clone()
      .multiply(
        new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -incline),
      );
    const pitchRotation = new Quaternion().setFromAxisAngle(
      new Vector3(Math.cos(yaw), 0, -Math.sin(yaw)),
      -incline,
    );
    const flat = new PerspectiveCamera(),
      pitched = new PerspectiveCamera();
    const flatRig = new ChaseCamera(flat),
      pitchedRig = new ChaseCamera(pitched);
    flatRig.drag(40, 10);
    pitchedRig.drag(40, 10);
    flatRig.update(anchor, heading, 0, true);
    pitchedRig.update(anchor, vehicleRotation, 0, true);
    const expected = flat.position
      .clone()
      .sub(anchor)
      .applyQuaternion(pitchRotation)
      .add(anchor);
    expect(pitched.position.distanceTo(expected)).toBeLessThan(1e-8);
    expect(
      pitched
        .getWorldDirection(new Vector3())
        .distanceTo(
          flat.getWorldDirection(new Vector3()).applyQuaternion(pitchRotation),
        ),
    ).toBeLessThan(1e-8);
    expect(pitchedRig.pitch).toBe(flatRig.pitch);
  },
);

it("smooths pitch changes independently of frame rate and ignores vehicle roll", () => {
  const anchor = new Vector3(0, 12, 0);
  const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.5);
  const follow = (fps: number, rotation = tilt) => {
    const camera = new PerspectiveCamera(),
      rig = new ChaseCamera(camera);
    rig.update(anchor, new Quaternion(), 0, true);
    const start = camera.position.clone();
    rig.update(anchor, rotation, 1 / fps);
    expect(camera.position.distanceTo(start)).toBeGreaterThan(0);
    const snapped = new PerspectiveCamera();
    new ChaseCamera(snapped).update(anchor, rotation, 0, true);
    expect(camera.position.distanceTo(start)).toBeLessThan(
      snapped.position.distanceTo(start),
    );
    for (let i = 1; i < fps; i++) rig.update(anchor, rotation, 1 / fps);
    return camera;
  };
  const slow = follow(30),
    fast = follow(120);
  expect(slow.position.distanceTo(fast.position)).toBeLessThan(1e-8);
  const rolled = follow(
    30,
    tilt
      .clone()
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.8)),
  );
  expect(rolled.position.distanceTo(slow.position)).toBeLessThan(1e-8);
  expect(
    rolled
      .getWorldDirection(new Vector3())
      .distanceTo(slow.getWorldDirection(new Vector3())),
  ).toBeLessThan(1e-8);
});

it("keeps vertical orientations finite and resets the pitch follow state", () => {
  const camera = new PerspectiveCamera(),
    rig = new ChaseCamera(camera);
  const anchor = new Vector3(0, 20, 0);
  rig.update(
    anchor,
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
    0,
    true,
  );
  expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
  expect(camera.quaternion.toArray().every(Number.isFinite)).toBe(true);
  rig.reset();
  rig.update(anchor, new Quaternion(), 0, true);
  const reference = new PerspectiveCamera();
  new ChaseCamera(reference).update(anchor, new Quaternion(), 0, true);
  expect(camera.position.distanceTo(reference.position)).toBeLessThan(1e-8);
});
it("wheel zoom changes camera distance, preserves orbit, and clamps safely", () => {
  const c = new PerspectiveCamera(),
    rig = new ChaseCamera(c);
  const anchor = new Vector3(4, 2, 7);
  rig.drag(100, 40);
  const orbit = { yaw: rig.yaw, pitch: rig.pitch };
  rig.zoom(-240);
  rig.update(anchor, new Quaternion(), 0, true);
  expect(c.position.distanceTo(anchor)).toBeLessThan(15.04);
  const near = rig.distance;
  rig.zoom(240);
  rig.update(anchor, new Quaternion(), 0);
  expect(rig.distance).toBeGreaterThan(near);
  expect(rig.yaw).toBe(orbit.yaw);
  expect(rig.pitch).toBe(orbit.pitch);
  rig.zoom(-1e6);
  expect(rig.distance).toBe(6);
  rig.zoom(1e6);
  expect(rig.distance).toBe(45);
  rig.zoom(NaN);
  expect(rig.distance).toBe(45);
  rig.reset();
  expect(rig.distance).toBe(15.04);
});
it("starts directly behind the truck and supports bounded mouse orbit", () => {
  const c = new PerspectiveCamera(),
    rig = new ChaseCamera(c);
  rig.update(new Vector3(4, 2, 7), new Quaternion(), 0, true);
  expect(c.position.x).toBeCloseTo(4);
  expect(c.position.z).toBeLessThan(7);
  rig.drag(100, 10000);
  rig.update(new Vector3(4, 2, 7), new Quaternion(), 0.016);
  expect(Math.abs(c.position.x - 4)).toBeGreaterThan(1);
  expect(rig.pitch).toBeLessThan(1.1);
});
it("camera has no forward/backward jolts under irregular frame timing", () => {
  const c = new PerspectiveCamera(55, 1, 0.1, 650),
    rig = new ChaseCamera(c);
  let time = 0,
    previous = -Infinity,
    last = 0;
  for (let i = 0; i < 700; i++) {
    const dt = [1 / 30, 1 / 120, 1 / 60][i % 3];
    time += dt;
    const z = 20 * time;
    rig.update(
      new Vector3(0, 2 + 4 * Math.sin(Math.min(time, Math.PI)), z),
      new Quaternion(),
      dt,
    );
    expect(c.position.z).toBeGreaterThanOrEqual(previous);
    previous = c.position.z;
    const p = new Vector3(57, 11, 180).project(c);
    if (p.z < 1 && Math.abs(p.x) < 1) {
      expect(Math.abs(p.x)).toBeGreaterThanOrEqual(last - 0.002);
      last = Math.abs(p.x);
    }
  }
});
