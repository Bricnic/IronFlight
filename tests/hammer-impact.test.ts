import { beforeAll, expect, it } from "vitest";
import { initPhysics, Simulation } from "../src/simulation";
import { HAZARDS } from "../src/hazards";
beforeAll(initPhysics);
const hammer = HAZARDS.find((h) => h.id === "hard-hammer")!;
it("a real spike impact tears off parts and launches the truck and debris", () => {
  const s = new Simulation("hard");
  s.setTuning({ hammerSpeed: 1 });
  const start = { x: hammer.x + 4.7, y: hammer.y + 0.5, z: hammer.z };
  s.body.setTranslation(start, true);
  s.run(0.1);
  expect(s.snapshot().hammerImpacts.length).toBe(1);
  expect(s.snapshot().velocity.y).toBeGreaterThan(12);
  expect(s.snapshot().integrity).toBeLessThan(0.8);
  expect([...s.parts.values()].some((p) => !!p.body)).toBe(true);
  expect(
    [...s.parts.values()]
      .filter((p) => p.body)
      .some((p) => p.body!.linvel().y > 8),
  ).toBe(true);
  s.run(0.6);
  expect(s.body.translation().y - start.y).toBeGreaterThan(5);
  expect(s.snapshot().hammerImpacts.length).toBe(1);
  expect(Number.isFinite(s.snapshot().speed)).toBe(true);
  s.dispose();
});
it("a near miss inside the old damage volume does not damage or launch the truck", () => {
  const s = new Simulation("hard");
  s.setTuning({ hammerSpeed: 1 });
  s.body.setTranslation(
    { x: hammer.x + 6.7, y: hammer.y + 1.7, z: hammer.z + 1.9 },
    true,
  );
  s.step();
  expect(
    s.snapshot().damageEvents.filter((e) => e.source === "hammer"),
  ).toHaveLength(0);
  expect(s.snapshot().hammerImpacts).toHaveLength(0);
  s.dispose();
});
it("rotor tangential motion changes the horizontal launch direction", () => {
  const s = new Simulation("hard");
  s.setTuning({ hammerSpeed: 1 });
  s.run(Math.PI / (2 * 2.55));
  s.body.setTranslation(
    { x: hammer.x - 0.5, y: hammer.y + 4.7, z: hammer.z },
    true,
  );
  s.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  s.run(0.1);
  expect(s.snapshot().hammerImpacts.length).toBe(1);
  expect(s.snapshot().velocity.x).toBeLessThan(-10);
  expect(s.snapshot().hammerImpacts[0].deltaVelocity[0]).toBeLessThan(-15);
  s.dispose();
});
