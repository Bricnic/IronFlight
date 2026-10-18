import { it, expect } from "vitest";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import { ChaseCamera } from "../src/camera";
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
