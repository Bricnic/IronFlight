import { beforeAll, expect, it } from "vitest";
import { initPhysics, Simulation } from "../src/simulation";
import { LOOP, dragonFiring, loopScenerySolids } from "../src/loop";
import { DEFAULT_TUNING } from "../src/tuning";
import { loopDriver } from "./loop-driver";
beforeAll(initPhysics);
it("dragon jets have deterministic firing and safe timing windows", () => {
  expect(dragonFiring(0)).toBe(true);
  expect(dragonFiring(3.5)).toBe(false);
  expect(dragonFiring(8)).toBe(true);
});
it("1.5 seconds of dragon fire removes about half the truck integrity", () => {
  const s = new Simulation("easy");
  s.body.setTranslation({ x: -24, y: 2, z: LOOP.dragonZ[0] }, true);
  s.run(1.5);
  expect(s.snapshot().integrity).toBeGreaterThan(0.42);
  expect(s.snapshot().integrity).toBeLessThan(0.55);
  s.dispose();
});
it("the safe interval causes no dragon damage and an off-pad truck gets no boost", () => {
  const s = new Simulation("easy");
  s.run(3.5);
  s.body.setTranslation({ x: -24, y: 2, z: LOOP.dragonZ[0] }, true);
  s.run(1);
  expect(s.snapshot().integrity).toBe(1);
  expect(s.snapshot().boostTicks).toBe(0);
  s.dispose();
});
it("the boosted truck physically passes the loop apex and returns upright", () => {
  const s = new Simulation("easy");
  s.body.setTranslation({ x: -24, y: 2, z: LOOP.boostStart - 15 }, true);
  let maxY = 0;
  for (let i = 0; i < 3600 && !s.snapshot().loopCompleted; i++) {
    s.step(loopDriver(s.snapshot(), -24));
    maxY = Math.max(maxY, s.body.translation().y);
  }
  expect(maxY).toBeGreaterThan(LOOP.radius * 1.9);
  expect(s.snapshot().boostTicks).toBeGreaterThan(10);
  expect(s.snapshot().loopApex).toBe(true);
  expect(s.snapshot().loopCompleted).toBe(true);
  expect(s.snapshot().upDot).toBeGreaterThan(0.85);
  expect(s.snapshot().integrity).toBeGreaterThan(0.8);
  s.dispose();
});
it("records a boost-power feasibility sweep using production physics", async () => {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const results = [];
  for (const power of [1, 1.5, 2, 2.5, 3, 4]) {
    const s = new Simulation("easy");
    s.setTuning({ boostPower: power });
    s.body.setTranslation({ x: -24, y: 2, z: LOOP.boostStart - 15 }, true);
    let peakSpeed = 0,
      maxY = 0,
      apexContacts = 0;
    for (let i = 0; i < 3000 && !s.loopCompleted; i++) {
      s.step(loopDriver(s.snapshot(), -24));
      const state = s.snapshot();
      peakSpeed = Math.max(peakSpeed, state.signedSpeed);
      maxY = Math.max(maxY, state.position.y);
      if (state.position.y > 85)
        apexContacts = Math.max(apexContacts, state.wheelContacts);
    }
    results.push({
      power,
      peakSpeed,
      maxY,
      apexContacts,
      completed: s.loopCompleted,
      integrity: s.snapshot().integrity,
    });
    s.dispose();
  }
  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/boost-sweep.json", JSON.stringify(results, null, 2));
  const chosen = results.find((r) => r.power === DEFAULT_TUNING.boostPower)!;
  expect(chosen.completed).toBe(true);
  expect(chosen.apexContacts).toBe(4);
  expect(chosen.peakSpeed).toBeGreaterThan(74);
  expect(results.find((r) => r.power === 1)?.completed).toBe(false);
});
it("statues have physical cores and destroyed chassis cannot boost", () => {
  const s = new Simulation("easy");
  expect(loopScenerySolids().length).toBe(48);
  s.body.setTranslation({ x: -34, y: 6, z: LOOP.dragonZ[0] }, true);
  s.run(0.7);
  expect(s.body.translation().y).toBeGreaterThan(4);
  s.body.setTranslation({ x: -24, y: 2, z: LOOP.boostStart + 10 }, true);
  s.damage("chassis-front", 10000);
  s.run(0.25);
  expect(s.boostTicks).toBe(0);
  s.dispose();
});
it("the boost pad does not accelerate a truck flying over it", () => {
  const s = new Simulation("easy");
  s.body.setTranslation({ x: -24, y: 3.8, z: LOOP.boostStart + 10 }, true);
  s.body.setLinvel({ x: 0, y: 30, z: 10 }, true);
  s.run(0.1);
  expect(s.boostTicks).toBe(0);
  s.dispose();
});
