import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  COURSE_PREFAB_KINDS,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { BUMPER_ARENA_XL } from "../src/fairground";

beforeAll(initPhysics);

function fixture(prefabs: CustomPrefab[]) {
  const level = blankLevel("Bumper XL Fixture");
  level.prefabs = prefabs;
  level.spawn = { x: 0, y: 2.1, z: 70, yaw: 0 };
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.setTuning({ gravity: 1, bumperSpeed: 1 });
  sim.startTrack("custom:bumper-xl-fixture");
  return sim;
}

it("registers the double-length bumper arena", () => {
  for (const list of [PREFAB_KINDS, COURSE_PREFAB_KINDS])
    expect(list).toContain("bumper-arena-xl");
  expect(BUMPER_ARENA_XL).toEqual({ halfWidth: 32, halfDepth: 50 });
});

it("spawns six regular-size cars across the long floor", () => {
  const sim = fixture([{ id: "xl", kind: "bumper-arena-xl", x: 0, z: 0 }]);
  try {
    expect(sim.fairground.bumpers).toHaveLength(6);
    for (const car of sim.fairground.bumpers) {
      const half = car.collider.halfExtents();
      expect(half.x).toBeCloseTo(1.6, 5);
      expect(half.y).toBeCloseTo(1.15, 5);
      expect(half.z).toBeCloseTo(2.2, 5);
    }
    const xs = sim.fairground.bumpers.map((car) => car.body.translation().x);
    const zs = sim.fairground.bumpers.map((car) => car.body.translation().z);
    expect(Math.max(...xs.map(Math.abs))).toBeGreaterThan(10);
    expect(Math.max(...zs.map(Math.abs))).toBeGreaterThan(20);
  } finally {
    sim.dispose();
  }
});

it("opens a large south gate while the neighboring wall blocks", () => {
  const sim = fixture([{ id: "xl", kind: "bumper-arena-xl", x: 0, z: 0 }]);
  try {
    const driveSouth = (x: number) => {
      sim.body.setTranslation({ x, y: 2.1, z: 70 }, true);
      sim.body.setRotation({ x: 0, y: 1, z: 0, w: 0 }, true);
      sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      for (let i = 0; i < 240; i++) sim.step({ throttle: 1 });
      return sim.body.translation().z;
    };
    expect(driveSouth(0)).toBeLessThan(40);
    expect(driveSouth(25)).toBeGreaterThan(50);
  } finally {
    sim.dispose();
  }
});
