import { beforeAll, it, expect } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { drivingInput } from "../src/controls";
import { Vector3, Quaternion, PerspectiveCamera } from "three";
import { ROUTES } from "../src/routes";
beforeAll(initPhysics);
it("A turns screen-left and D screen-right from behind the +Z-facing truck", () => {
  for (const [key, sign] of [
    ["a", -1],
    ["d", 1],
  ] as const) {
    const s = new Simulation();
    s.run(2, { throttle: 1 });
    const start = new Vector3().copy(s.body.translation());
    const c = new PerspectiveCamera(55, 1, 0.1, 200);
    c.position.copy(start).add(new Vector3(0, 5, -14));
    c.lookAt(start.clone().add(new Vector3(0, 0, 5)));
    c.updateMatrixWorld();
    s.run(0.8, { ...drivingInput(new Set(["w", key]), 10) });
    const projected = new Vector3().copy(s.body.translation()).project(c);
    expect(projected.x * sign).toBeGreaterThan(0.01);
    s.dispose();
  }
});
it("S brakes forward motion then drives in reverse, while Space only brakes", () => {
  expect(drivingInput(new Set(["s"]), 12)).toMatchObject({
    throttle: 0,
    brake: 1,
  });
  expect(drivingInput(new Set(["s"]), 0)).toMatchObject({
    throttle: -1,
    brake: 0,
  });
  expect(drivingInput(new Set([" "]), 0)).toMatchObject({
    throttle: 0,
    brake: 0,
    handbrake: 1,
  });
  const s = new Simulation();
  for (let i = 0; i < 600; i++)
    s.step(drivingInput(new Set(["s"]), s.snapshot().signedSpeed));
  expect(s.snapshot().signedSpeed).toBeLessThan(-2);
  s.dispose();
});
it("braking is progressive and does not pitch the truck onto its nose", () => {
  const s = new Simulation();
  s.setTuning({ brakePower: 1 });
  s.run(3, { throttle: 1 });
  const speed = s.snapshot().speed;
  s.run(0.25, { brake: 1 });
  expect(speed - s.snapshot().speed).toBeLessThan(2);
  expect(speed - s.snapshot().speed).toBeGreaterThan(0.1);
  expect(s.snapshot().upDot).toBeGreaterThan(0.9);
  s.dispose();
});
for (const route of ROUTES)
  it(`${route.id} stays upright after crossing the finish`, () => {
    const s = new Simulation(route.id);
    for (let i = 0; i < 1800 && s.status !== "finished"; i++)
      s.step({ throttle: 1 });
    expect(s.status).toBe("finished");
    let minUp = 1;
    for (let i = 0; i < 360; i++) {
      s.step({ throttle: 1 });
      const up = new Vector3(0, 1, 0).applyQuaternion(
        new Quaternion().copy(s.body.rotation()),
      ).y;
      minUp = Math.min(minUp, up);
    }
    expect(minUp).toBeGreaterThan(0.85);
    s.dispose();
  });
