import { beforeAll, it, expect } from "vitest";
import { dragonFlame, dragonExposure } from "../src/loop";
import { Simulation, initPhysics } from "../src/simulation";
beforeAll(initPhysics);
it("ignition reaches the requested lengths and opacity at 50ms intervals", () => {
  for (const [time, head, opacity] of [
    [0, 0, 0],
    [0.05, 0.0625, 0.25],
    [0.1, 0.25, 0.5],
    [0.15, 0.5, 0.75],
    [0.2, 1, 1],
  ]) {
    const jet = dragonFlame(time);
    expect(jet.head).toBeCloseTo(head);
    expect(jet.opacity).toBeCloseTo(opacity);
    expect(jet.tail).toBe(0);
  }
});
it("shutoff travels away from the mouth while the leading end stays at the center", () => {
  for (const [time, tail, opacity] of [
    [3, 0, 1],
    [3.05, 0.25, 1],
    [3.1, 0.5, 0.75],
    [3.15, 0.75, 0.5],
    [3.2, 0.875, 0.25],
  ]) {
    const jet = dragonFlame(time);
    expect(jet.head).toBe(1);
    expect(jet.tail).toBeCloseTo(tail);
    expect(jet.opacity).toBeCloseTo(opacity);
  }
  expect(dragonFlame(3.25).opacity).toBe(0);
  expect(dragonFlame(7.99).opacity).toBe(0);
});
it("fronts are continuous through the cycle and restart cleanly", () => {
  for (const boundary of [0.05, 0.1, 0.15, 0.2, 3, 3.05, 3.1, 3.15, 3.2]) {
    const a = dragonFlame(boundary - 1e-7),
      b = dragonFlame(boundary + 1e-7);
    for (const key of ["head", "tail", "opacity"] as const)
      expect(Math.abs(a[key] - b[key])).toBeLessThan(0.00001);
  }
  expect(dragonFlame(8)).toEqual(dragonFlame(0));
  expect(dragonFlame(8.1).head).toBeCloseTo(dragonFlame(0.1).head);
});
it("center is safe before the leading flame arrives; the mouth clears before the center", () => {
  expect(dragonExposure(0.1, 0)).toBe(0);
  expect(dragonExposure(0.2, 0)).toBeCloseTo(1);
  expect(dragonExposure(3.1, 5.5)).toBe(0);
  expect(dragonExposure(3.1, 0)).toBeCloseTo(0.75);
  expect(dragonExposure(3.25, 0)).toBe(0);
  expect(dragonExposure(0.1, 5.5)).toBe(dragonExposure(0.1, -5.5));
});
it("actual truck fire damage waits for the visible jet and ends when its tail clears", () => {
  const s = new Simulation("easy");
  s.body.setTranslation({ x: -24, y: 2, z: 213 }, true);
  s.run(0.1);
  expect(s.fireDamageTaken).toBe(0);
  s.run(0.1);
  expect(s.fireDamageTaken).toBeGreaterThan(0);
  s.dispose();
  const tail = new Simulation("easy");
  tail.run(3.1);
  tail.body.setTranslation({ x: -24, y: 2, z: 213 }, true);
  tail.step();
  expect(tail.inFlames).toBe(true);
  tail.body.setTranslation({ x: -18.5, y: 2, z: 213 }, true);
  tail.step();
  expect(tail.inFlames).toBe(false);
  tail.run(0.2);
  tail.body.setTranslation({ x: -24, y: 2, z: 213 }, true);
  tail.step();
  expect(tail.inFlames).toBe(false);
  tail.dispose();
});
