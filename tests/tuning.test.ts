import { beforeAll, expect, it } from "vitest";
import { initPhysics, Simulation } from "../src/simulation";
beforeAll(initPhysics);
it("scales acceleration and top speed independently and keeps tuning on reset", () => {
  const a = new Simulation(),
    b = new Simulation();
  a.setTuning({ acceleration: 1 });
  b.setTuning({ acceleration: 2 });
  a.run(2, { throttle: 1 });
  b.run(2, { throttle: 1 });
  expect(b.snapshot().speed).toBeGreaterThan(a.snapshot().speed * 1.3);
  b.setTuning({ topSpeed: 2 });
  b.run(4, { throttle: 1 });
  expect(b.snapshot().speed).toBeGreaterThan(25);
  b.reset();
  expect(b.snapshot().tuning.topSpeed).toBe(2);
  a.dispose();
  b.dispose();
});
it("coasts down faster by default and friction tuning increases that effect", () => {
  const a = new Simulation(),
    b = new Simulation();
  b.setTuning({ friction: 10 });
  for (const s of [a, b]) {
    s.run(2, { throttle: 1 });
    s.run(1);
  }
  expect(a.snapshot().speed).toBeLessThan(15);
  expect(b.snapshot().speed).toBeLessThan(a.snapshot().speed - 1);
  a.dispose();
  b.dispose();
});
it("front tires slew gradually, recenter gradually, and respect the rate slider", () => {
  const s = new Simulation();
  s.setTuning({ steeringRate: 1, maxSteeringAngle: 20 });
  s.step({ steer: 1 });
  expect(s.snapshot().steeringAngle).toBeGreaterThan(0);
  expect(s.snapshot().steeringAngle).toBeLessThan(0.02);
  s.run(0.5, { steer: 1 });
  expect(s.snapshot().steeringAngle).toBeCloseTo(0.35);
  s.step();
  expect(s.snapshot().steeringAngle).toBeGreaterThan(0.3);
  s.reset();
  s.setTuning({ steeringRate: 3 });
  s.run(0.15, { steer: -1 });
  expect(s.snapshot().steeringAngle).toBeCloseTo(-0.35);
  s.dispose();
});
it("rejects invalid tuning and quantizes values to 0.1x", () => {
  const s = new Simulation();
  s.setTuning({ acceleration: 3.14 });
  expect(s.snapshot().tuning.acceleration).toBe(3.1);
  expect(() => s.setTuning({ topSpeed: NaN })).toThrow();
  expect(() => s.setTuning({ friction: 11 })).toThrow();
  s.dispose();
});
it("turning power scales physical turning independently of tire angle and slew", () => {
  const turns: number[] = [];
  const angles: number[] = [];
  for (const turningPower of [0.2, 1, 2]) {
    const s = new Simulation("lab");
    s.setTuning({
      turningPower,
      steeringRate: 1.9,
      maxSteeringAngle: 12,
      gravity: 1,
    });
    s.run(1);
    s.body.setLinvel({ x: 0, y: 0, z: 10 }, true);
    s.run(0.7, { throttle: 0.3, steer: 1 });
    turns.push(Math.atan2(s.snapshot().forward[0], s.snapshot().forward[2]));
    angles.push(s.steeringAngle);
    expect(s.snapshot().upDot).toBeGreaterThan(0.95);
    s.reset();
    expect(s.tuning.turningPower).toBe(turningPower);
    s.dispose();
  }
  expect(turns[0]).toBeGreaterThan(0);
  expect(turns[0]).toBeLessThan(turns[1] * 0.5);
  expect(turns[2]).toBeGreaterThan(turns[1] * 1.5);
  expect(angles[0]).toBeCloseTo(angles[1]);
  expect(angles[2]).toBeCloseTo(angles[1]);
});
