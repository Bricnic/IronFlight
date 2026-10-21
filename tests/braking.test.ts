import { beforeAll, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { Simulation, initPhysics } from "../src/simulation";
import { PARTS } from "../src/damage";
import { DT } from "../src/clock";
import { Quaternion, Vector3 } from "three";

beforeAll(initPhysics);
const results: object[] = [];
for (const velocity of [40, 55, -40])
  for (const handbrake of [false, true])
    it(`stops from ${velocity * 3.6} MPH with maximum ${handbrake ? "handbrake" : "brakes"} without flipping`, () => {
      const s = new Simulation("lab");
      s.run(1);
      s.setTuning({ brakePower: 10, handbrakePower: 10 });
      s.body.setLinvel({ x: 0, y: 0, z: velocity }, true);
      const start = s.snapshot();
      let minUp = 1,
        stopTime = 0,
        stopDistance = 0;
      for (let i = 0; i < 480; i++) {
        s.step(handbrake ? { handbrake: 1 } : { brake: 1 });
        const state = s.snapshot();
        minUp = Math.min(minUp, state.upDot);
        if (!stopTime && state.speed < 0.5) {
          stopTime = (i + 1) * DT;
          stopDistance = Math.abs(state.position.z - start.position.z);
        }
        expect(state.signedSpeed * Math.sign(velocity)).toBeGreaterThan(-0.05);
      }
      expect(stopTime).toBeGreaterThan(0);
      expect(stopTime).toBeLessThan(1.6);
      expect(stopDistance).toBeLessThan(42);
      expect(minUp).toBeGreaterThan(0.97);
      expect(s.snapshot().integrity).toBe(start.integrity);
      expect(s.snapshot().speed).toBeLessThan(0.05);
      results.push({
        mph: velocity * 3.6,
        handbrake,
        stopTime,
        stopDistance,
        minUp,
      });
      mkdirSync("artifacts", { recursive: true });
      writeFileSync(
        "artifacts/braking-results.json",
        JSON.stringify(results, null, 2),
      );
      s.dispose();
    });

it("drives and brakes both axles equally in forward and reverse", () => {
  const s = new Simulation("lab");
  s.run(1);
  for (const throttle of [1, -1]) {
    s.step({ throttle });
    const forces = [0, 1, 2, 3].map((i) => s.vehicle.wheelEngineForce(i)!);
    expect(forces.every((force) => force * throttle > 0)).toBe(true);
    expect(new Set(forces).size).toBe(1);
  }
  s.setTuning({ brakePower: 10 });
  s.step({ brake: 1 });
  expect([0, 1, 2, 3].map((i) => s.vehicle.wheelBrake(i))).toEqual([
    30, 30, 30, 30,
  ]);
  // Losing the front tires must not remove propulsion from the rear axle.
  s.damage("wheel-fl", 10000);
  s.damage("wheel-fr", 10000);
  s.step({ throttle: 1 });
  for (const i of [0, 1]) expect(s.vehicle.wheelEngineForce(i)).toBe(0);
  for (const i of [2, 3])
    expect(s.vehicle.wheelEngineForce(i)).toBeGreaterThan(0);
  s.step({ brake: 1 });
  for (const i of [0, 1]) expect(s.vehicle.wheelBrake(i)).toBe(0);
  s.dispose();
});

it("hard braking with a steering correction stays upright", () => {
  const s = new Simulation("lab");
  s.run(1);
  s.setTuning({ brakePower: 10 });
  s.body.setLinvel({ x: 0, y: 0, z: 40 }, true);
  for (let i = 0; i < 240; i++) {
    s.step({ brake: 1, steer: 0.15 });
    expect(s.snapshot().upDot).toBeGreaterThan(0.95);
  }
  expect(s.snapshot().speed).toBeLessThan(0.05);
  s.dispose();
});

it("braking stability does not freeze airborne pitch or roll", () => {
  const s = new Simulation("lab");
  s.body.setTranslation({ x: 0, y: 30, z: 0 }, true);
  s.body.setRotation(
    new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.5),
    true,
  );
  s.body.setAngvel({ x: 2, y: 0, z: 1 }, true);
  s.setTuning({ brakePower: 10, handbrakePower: 10 });
  s.run(0.25, { handbrake: 1 });
  expect(s.snapshot().wheelContacts).toBe(0);
  expect(s.body.angvel().x).toBeGreaterThan(1);
  expect(Math.abs(s.body.rotation().x)).toBeGreaterThan(0.1);
  expect(PARTS.every((p) => s.parts.get(p.id)!.health === p.hp)).toBe(true);
  s.dispose();
});

it("maximum brakes stay stable on grass beside the road", () => {
  const s = new Simulation("easy");
  s.body.setTranslation({ x: 15, y: 2, z: -100 }, true);
  s.run(1);
  s.setTuning({ brakePower: 10 });
  s.body.setLinvel({ x: 0, y: 0, z: 40 }, true);
  const integrity = s.snapshot().integrity;
  for (let i = 0; i < 240; i++) {
    s.step({ brake: 1 });
    expect(s.snapshot().upDot).toBeGreaterThan(0.97);
  }
  expect(s.snapshot().speed).toBeLessThan(0.05);
  expect(s.snapshot().integrity).toBe(integrity);
  s.dispose();
});
