import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { bumperDamage, CAROUSEL_OMEGA } from "../src/fairground";
import original from "../levels/official/Fairground.json";
import clone from "../levels/Fairground-Clone.json";
beforeAll(initPhysics);
function fixture(
  prefabs: CustomPrefab[],
  spawn = { x: 0, y: 2.1, z: -40, yaw: 0 },
) {
  const level = blankLevel("Fairground Fixture");
  level.prefabs = prefabs;
  level.spawn = spawn;
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.setTuning({ gravity: 1 });
  sim.startTrack("custom:fairground-fixture");
  return sim;
}
it("ships identical official and editable-clone layouts with 25 rings and an eight-minute timer", () => {
  expect(validateCustomLevel(original).collectibles).toHaveLength(25);
  expect(validateCustomLevel(original).limit).toBe(480);
  expect(original.medals.gold).toBe(300);
  expect({ ...clone, name: original.name }).toEqual(original);
  for (const kind of [
    "carousel",
    "bumper-arena",
    "hot-air-balloon",
    "hammer",
    "teeth",
    "burner",
    "axe",
  ])
    expect(original.prefabs.some((p) => p.kind === kind)).toBe(true);
  expect(original.solids.filter((s) => s.kind === "lava")).toHaveLength(6);
});
it("carries an unpowered vehicle around a safe carousel bay for twenty seconds", () => {
  const sim = fixture([{ id: "ride", kind: "carousel", x: 0, z: 0 }], {
    x: 0,
    y: 3.1,
    z: 17,
    yaw: Math.PI / 2,
  });
  try {
    sim.run(20);
    const state = sim.snapshot();
    expect(state.fairground.rideSeconds, JSON.stringify(state)).toBeGreaterThan(
      18,
    );
    expect(state.fairground.explosions).toBe(0);
    expect(Math.hypot(state.position.x, state.position.z)).toBeLessThan(25);
    expect(Math.hypot(state.position.x, state.position.z)).toBeGreaterThan(10);
    expect(Math.hypot(state.position.x, state.position.z - 17)).toBeGreaterThan(
      15,
    );
    expect(state.position.y).toBeGreaterThan(2);
    expect(state.integrity).toBeGreaterThan(0.9);
  } finally {
    sim.dispose();
  }
});
it("carousel speed tuning drives the physical platform and marked traps explode once", () => {
  const sim = fixture([{ id: "ride", kind: "carousel", x: 0, z: 0 }]);
  try {
    sim.setTuning({ carouselSpeed: 2 });
    sim.run(1);
    const c = sim.fairground.carousels[0];
    expect(c.angle).toBeCloseTo(CAROUSEL_OMEGA * 2, 8);
    const angle = c.angle + Math.PI / 3;
    sim.body.setTranslation(
      { x: Math.sin(angle) * 17, y: 3.1, z: Math.cos(angle) * 17 },
      true,
    );
    sim.run(0.1);
    expect(sim.fairground.explosions).toBe(1);
    expect(sim.body.linvel().y).toBeGreaterThan(20);
    expect(sim.damageEvents.some((e) => e.source === "carousel-trap")).toBe(
      true,
    );
  } finally {
    sim.dispose();
  }
});
it("calibrates mutual bumper damage by relative momentum", () => {
  expect(bumperDamage(60 * 0.44704, 3000, 3000)).toBeCloseTo(0.25);
  expect(bumperDamage(30 * 0.44704, 3000, 3000)).toBeCloseTo(0.125);
  expect(bumperDamage(0, 3000, 3000)).toBe(0);
  expect(bumperDamage(60 * 0.44704, 6000, 3000)).toBeLessThan(0.25);
});
it("bumper speed tuning scales physical patrol speed and survives reset", () => {
  const speeds: number[] = [];
  for (const multiplier of [0.5, 2]) {
    const sim = fixture([{ id: "arena", kind: "bumper-arena", x: 0, z: 0 }]);
    try {
      sim.setTuning({ bumperSpeed: multiplier });
      sim.run(0.25);
      const velocity = sim.fairground.bumpers[0].body.linvel();
      speeds.push(Math.hypot(velocity.x, velocity.z));
      sim.startTrack("custom:fairground-fixture");
      expect(sim.tuning.bumperSpeed).toBe(multiplier);
    } finally {
      sim.dispose();
    }
  }
  expect(speeds[1]).toBeGreaterThan(speeds[0] * 3);
});
it("bumper cars patrol, chase an intruder and take real mutual collision damage", () => {
  const sim = fixture([{ id: "arena", kind: "bumper-arena", x: 0, z: 0 }]);
  try {
    sim.run(0.5);
    expect(sim.fairground.bumpers.every((b) => !b.aggressive)).toBe(true);
    sim.body.setTranslation({ x: 0, y: 2.1, z: -21 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 60 * 0.44704 }, true);
    sim.run(0.45);
    expect(sim.fairground.bumpers.every((b) => b.aggressive)).toBe(true);
    expect(sim.fairground.impacts.length).toBeGreaterThan(0);
    expect(sim.fairground.bumpers.some((b) => b.health < 1)).toBe(true);
    expect(sim.snapshot().integrity).toBeLessThan(0.99);
    expect(sim.fairground.impacts[0].playerDamage).toBeGreaterThan(0.1);
  } finally {
    sim.dispose();
  }
});
it("balloons drop at 5–10 second intervals; peels expire and both airborne and ground hits skid", () => {
  const sim = fixture([
    { id: "balloon", kind: "hot-air-balloon", x: 20, y: 20, z: 20 },
  ]);
  try {
    sim.run(10);
    expect(sim.fairground.bananas.length).toBeGreaterThan(0);
    const peel = sim.fairground.bananas[0];
    expect(peel.grounded).toBe(true);
    expect(peel.expires - peel.groundedAt).toBeGreaterThanOrEqual(5);
    expect(peel.expires - peel.groundedAt).toBeLessThanOrEqual(7);
    expect(peel.expires - sim.time).toBeLessThanOrEqual(7);
    sim.body.setTranslation({ x: peel.x, y: 1.8, z: peel.z }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 8 }, true);
    sim.run(0.15);
    expect(sim.fairground.slipping).toBe(true);
    const input = sim.fairground.controls({
      throttle: 1,
      brake: 1,
      handbrake: 1,
      steer: 0,
    });
    expect(input.throttle).toBe(0);
    expect(input.brake).toBe(0);
    expect(input.handbrake).toBe(0);
    expect(Math.abs(input.steer!)).toBeGreaterThanOrEqual(0.55);
    sim.body.setTranslation({ x: -50, y: 2.1, z: -50 }, true);
    sim.run(1.1);
    expect(sim.fairground.slipping).toBe(false);
    sim.run(19);
    expect(sim.fairground.drops.length).toBeGreaterThan(2);
    for (const drop of sim.fairground.drops)
      expect(drop.interval).toBeGreaterThanOrEqual(5);
    for (const drop of sim.fairground.drops)
      expect(drop.interval).toBeLessThanOrEqual(10);
    expect(sim.fairground.bananas.some((b) => b.id === peel.id)).toBe(false);
    for (
      let i = 0;
      i < 1200 && !sim.fairground.bananas.some((b) => !b.grounded);
      i++
    )
      sim.step();
    const falling = sim.fairground.bananas.find((b) => !b.grounded);
    if (!falling)
      throw new Error(
        "Expected an airborne banana in the seeded drop sequence",
      );
    sim.body.setTranslation({ x: falling.x, y: falling.y, z: falling.z }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    sim.run(0.05);
    expect(sim.fairground.slipping).toBe(true);
  } finally {
    sim.dispose();
  }
});
