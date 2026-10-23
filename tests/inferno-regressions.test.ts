import { beforeAll, test, expect } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { courseHazards, courseSolids } from "../src/course";
import { getTrack } from "../src/tracks";
import { flameIntensity } from "../src/hazards";
beforeAll(initPhysics);
test("Inferno jets alone can burn a parked truck from 100 to zero integrity", () => {
  const s = new Simulation();
  s.startTrack("inferno-vault");
  const h = courseHazards(getTrack("inferno-vault")).find(
    (h) => h.kind === "fire",
  )!;
  s.body.setTranslation({ x: h.x, y: 2.1, z: h.z }, true);
  s.run(30, { brake: 1 });
  expect(s.snapshot(false).integrity).toBe(0);
  expect(s.status).toBe("wrecked");
  expect(s.fireDamageTaken + s.smolderDamageTaken).toBeCloseTo(1, 6);
  expect(s.damageEvents.some((e) => e.source === "fire")).toBe(true);
  expect(s.hammerImpacts).toHaveLength(0);
  s.dispose();
});
test("flame jets grow and shrink smoothly over half a second", () => {
  const h = courseHazards(getTrack("inferno-vault")).find(
    (h) => h.kind === "fire",
  )!;
  expect(flameIntensity(h, 0)).toBe(0);
  expect(flameIntensity(h, 0.25)).toBeCloseTo(0.5);
  expect(flameIntensity(h, 0.5)).toBe(1);
  expect(flameIntensity(h, 3)).toBe(1);
  expect(flameIntensity(h, 3.25)).toBeCloseTo(0.5);
  expect(flameIntensity(h, 3.5)).toBe(0);
});
test("smoke lingers and loses strength after leaving a flame jet", () => {
  const s = new Simulation();
  s.startTrack("inferno-vault");
  s.body.setTranslation({ x: 0, y: 2.1, z: -50 }, true);
  s.run(1);
  s.body.setTranslation({ x: 100, y: 2.1, z: -100 }, true);
  s.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  s.run(0.1);
  const first = s.snapshot(false) as any;
  expect(first.smoking).toBe(true);
  expect(first.smokeStrength).toBeGreaterThan(0.9);
  s.run(1.5);
  const middle = s.snapshot(false) as any;
  expect(middle.smokeStrength).toBeGreaterThan(0);
  expect(middle.smokeStrength).toBeLessThan(first.smokeStrength);
  s.run(2);
  expect(s.smoking).toBe(false);
  s.dispose();
});
test("Inferno pits are true holes with lava several metres below ground", () => {
  const solids = courseSolids(getTrack("inferno-vault"));
  for (const lava of solids.filter((s) => s.kind === "lava")) {
    expect(lava.y + lava.h / 2).toBeLessThan(-3);
    expect(
      solids.some(
        (s) =>
          s.kind === "ground" &&
          Math.abs(lava.x - s.x) < s.w / 2 &&
          Math.abs(lava.z - s.z) < s.d / 2,
      ),
    ).toBe(false);
  }
  const s = new Simulation();
  s.startTrack("inferno-vault");
  s.body.setTranslation({ x: -25, y: 2.1, z: 20 }, true);
  s.run(0.4);
  expect(s.body.translation().y).toBeLessThan(1);
  expect(s.snapshot(false).parts["chassis-front"].lava).toBeNull();
  s.run(1);
  expect(s.snapshot(false).parts["chassis-front"].lava).not.toBeNull();
  s.dispose();
});
