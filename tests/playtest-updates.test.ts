import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics, wheelPositions } from "../src/simulation";
import { PARTS } from "../src/damage";
import { drivingInput } from "../src/controls";
import { Quaternion, Vector3 } from "three";
import { dragonHeat } from "../src/loop";
import { createTruck } from "../src/truck";
beforeAll(initPhysics);
it("left identities agree with A steering, wheels, and the cabin", () => {
  for (const p of PARTS)
    if (/left|wheel-[fr]l/.test(p.id)) expect(p.pos[0]).toBeGreaterThan(0);
  for (let i = 0; i < 4; i++)
    expect(wheelPositions[i].x).toBe(PARTS[i + 2].pos[0]);
  const truck = createTruck();
  expect(
    truck.getObjectByName("steering-wheel-left")!.position.x,
  ).toBeGreaterThan(0);
  expect(truck.getObjectByName("driver-seat")).toBeDefined();
});
it("direction changes blend before zero symmetrically and arrows match WASD", () => {
  for (const [key, arrow, sign] of [
    ["w", "arrowup", 1],
    ["s", "arrowdown", -1],
  ] as const) {
    const at = drivingInput(new Set([key]), -sign * 3);
    expect(at.throttle! * sign).toBeGreaterThan(0);
    expect(at.brake).toBeGreaterThan(0);
    expect(at).toEqual(drivingInput(new Set([arrow]), -sign * 3));
    const s = new Simulation();
    s.run(0.5);
    s.body.setLinvel({ x: 0, y: 0, z: -sign * 5 }, true);
    for (let i = 0; i < 240; i++)
      s.step(drivingInput(new Set([key]), s.snapshot().signedSpeed));
    expect(s.snapshot().signedSpeed * sign).toBeGreaterThan(4);
    s.dispose();
  }
});
it("brake and handbrake sliders increase deceleration without reversing", () => {
  const speeds = [];
  for (const input of [{ brake: 1 }, { handbrake: 1 }]) {
    const s = new Simulation();
    s.setTuning({ brakePower: 1, handbrakePower: 1.5 });
    s.run(1, { throttle: 1 });
    s.run(0.4, input);
    speeds.push(s.snapshot().speed);
    s.dispose();
  }
  expect(speeds[1]).toBeLessThan(speeds[0]);
});
it("angle limits support 5 through 90 degrees", () => {
  const s = new Simulation();
  for (const angle of [5, 90]) {
    s.setTuning({ maxSteeringAngle: angle });
    s.run(2, { steer: 1 });
    expect(s.steeringAngle).toBeCloseTo((angle * Math.PI) / 180);
  }
  s.dispose();
});
it("dragon warning and cooldown ease through half heat", () => {
  expect(dragonHeat(7)).toBe(0);
  expect(dragonHeat(7.5)).toBeCloseTo(0.5);
  expect(dragonHeat(7.999)).toBeCloseTo(1);
  expect(dragonHeat(2)).toBe(1);
  expect(dragonHeat(3.5)).toBeCloseTo(0.5);
  expect(dragonHeat(4)).toBe(0);
});
for (const [name, angle, fraction, target] of [
  ["roof", Math.PI, 0.7, "roof"],
  ["left", -Math.PI / 2, 0.25, "door-left"],
  ["right", Math.PI / 2, 0.25, "door-right"],
] as const)
  it(`${name} landing causes contact-based damage`, () => {
    const s = new Simulation();
    s.body.setTranslation({ x: 0, y: 5, z: 0 }, true);
    s.body.setRotation(
      new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angle),
      true,
    );
    s.body.setLinvel({ x: 0, y: -5, z: 0 }, true);
    s.run(0.8);
    expect(s.parts.get(target)!.health).toBe(0);
    expect(
      s
        .snapshot()
        .damageEvents.some(
          (e) =>
            e.source === (name === "roof" ? "roof-landing" : "side-landing"),
        ),
    ).toBe(true);
    expect(s.snapshot().integrity).toBeLessThanOrEqual(1 - fraction + 0.001);
    if (name !== "roof")
      expect(
        s.parts.get(name === "left" ? "wheel-fl" : "wheel-fr")!.health,
      ).toBe(0);
    s.dispose();
  });
it("power steering records curved tire tracks", () => {
  const s = new Simulation();
  s.setTuning({ maxSteeringAngle: 45 });
  s.run(0.6, { throttle: 1 });
  s.run(4, { throttle: 0.4, steer: 0.8 });
  expect(s.skidStrokes.some((s) => s.points.length > 20)).toBe(true);
  s.dispose();
});

it("dragon damage slider scales exposure and hammer speed preserves arcade impulse", () => {
  const values = [];
  for (const multiplier of [1, 3]) {
    const s = new Simulation("easy");
    s.setTuning({ dragonDamage: multiplier });
    s.body.setTranslation({ x: -24, y: 2, z: 213 }, true);
    s.run(0.2);
    values.push(1 - s.snapshot().integrity);
    s.dispose();
  }
  expect(values[1] / values[0]).toBeCloseTo(3, 1);
  const s = new Simulation("hard");
  s.setTuning({ hammerSpeed: 4 });
  s.run(0.2);
  expect(s.hammerPhase).toBeCloseTo(2.55 * 4 * 0.2);
  s.dispose();
});
it("nose-first landings damage the body and tires-first landings avoid roof/side penalties", () => {
  const s = new Simulation();
  s.body.setTranslation({ x: 0, y: 7, z: 0 }, true);
  s.body.setRotation(
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2),
    true,
  );
  s.body.setLinvel({ x: 0, y: -8, z: 0 }, true);
  s.run(1);
  expect(
    s.snapshot().damageEvents.some((e) => e.source === "body-landing"),
  ).toBe(true);
  expect(s.snapshot().integrity).toBeLessThan(0.76);
  s.dispose();
  const upright = new Simulation();
  upright.body.setTranslation({ x: 0, y: 6, z: 0 }, true);
  upright.run(1);
  expect(
    upright.snapshot().damageEvents.some((e) => e.source.endsWith("-landing")),
  ).toBe(false);
  upright.dispose();
});
