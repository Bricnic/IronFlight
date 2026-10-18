import { beforeAll, it, expect } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { FixedClock } from "../src/clock";
beforeAll(initPhysics);
it("caps accumulated dents so repeated hits cannot fold a panel inside out", () => {
  const s = new Simulation();
  for (let i = 0; i < 10; i++) s.damage("chassis-front", 20);
  expect(
    s.parts.get("chassis-front")!.dents.reduce((sum, d) => sum + d.strength, 0),
  ).toBeLessThanOrEqual(0.65);
  s.dispose();
});
it("a missing wheel cannot regain brake force on later ticks", () => {
  const s = new Simulation();
  s.damage("wheel-fl", 1000);
  s.step({ brake: 1 });
  expect(s.vehicle.wheelBrake(0)).toBe(0);
  s.dispose();
});
it("positive steering input turns left", () => {
  const s = new Simulation();
  s.run(2, { throttle: 1 });
  s.run(1, { throttle: 1, steer: 0.4 });
  expect(s.snapshot().position.x).toBeLessThan(0);
  s.dispose();
});
it("regular and accelerated clocks produce identical complete driving outcomes", () => {
  const a = new Simulation("hard"),
    b = new Simulation("hard"),
    ca = new FixedClock(),
    cb = new FixedClock();
  for (let i = 0; i < 720; i++)
    ca.advance(1 / 60, 1, () => a.step({ throttle: 1 }));
  for (let i = 0; i < 45; i++)
    cb.advance(1 / 60, 16, () => b.step({ throttle: 1 }));
  expect(a.snapshot()).toEqual(b.snapshot());
  a.dispose();
  b.dispose();
});
