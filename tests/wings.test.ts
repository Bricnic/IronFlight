import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import { TrackRun } from "../src/track-run";
import { getTrack } from "../src/tracks";

beforeAll(initPhysics);

function wingsTrack() {
  const level = blankLevel("Wings Probe");
  level.prefabs.push({ id: "wings-1", kind: "wings", x: 0, y: 2, z: 0 });
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  return track;
}

function flyingSim() {
  const track = wingsTrack();
  const sim = new Simulation();
  sim.startTrack(track.id);
  // Park the truck on the wings to collect them.
  sim.body.setTranslation({ x: 0, y: 2, z: 0 }, true);
  for (let i = 0; i < 5 && !sim.trackRun?.wings; i++) sim.step({});
  expect(sim.trackRun?.wings).toBe(true);
  return sim;
}

it("maps wings prefabs onto the track like gold stars", () => {
  const track = wingsTrack();
  expect(track.wings).toHaveLength(1);
  expect(track.wings![0]).toMatchObject({ id: "wings-1", x: 0, y: 2, z: 0 });
  expect(getTrack(track.id).wings).toHaveLength(1);
});

it("collects wings by proximity and stamps the collect time", () => {
  const track = wingsTrack();
  const run = new TrackRun(track);
  run.step(0.5, { x: 0, y: 2, z: -40 }, { x: 0, y: 2, z: -39 }, 100);
  expect(run.wings).toBe(false);
  expect(run.snapshot().wings).toBe(false);
  run.step(0.5, { x: 0, y: 2, z: -4 }, { x: 0, y: 2, z: 0 }, 100);
  expect(run.wings).toBe(true);
  expect(run.snapshot().wings).toBe(true);
  expect(run.wingsAt).toBeCloseTo(1, 9);
});

it("removes gravity above 20mph and uses third gravity when slow", () => {
  const sim = flyingSim();
  // Fast flight: no gravity.
  sim.body.setTranslation({ x: 0, y: 60, z: 0 }, true);
  sim.body.setLinvel({ x: 0, y: 0, z: 12 }, true);
  sim.step({});
  expect(sim.flying).toBe(true);
  expect(sim.body.gravityScale()).toBe(0);
  // Slow flight: one third gravity.
  sim.body.setLinvel({ x: 0, y: 0, z: 2 }, true);
  sim.step({});
  expect(sim.flying).toBe(true);
  expect(sim.body.gravityScale()).toBeCloseTo(1 / 3, 6);
});

it("thrusts along facing with midair throttle and restores gravity on landing", () => {
  const sim = flyingSim();
  sim.body.setTranslation({ x: 0, y: 60, z: 0 }, true);
  sim.body.setLinvel({ x: 0, y: 0, z: 12 }, true);
  sim.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
  const before = sim.body.linvel().z;
  sim.step({ throttle: 1 });
  expect(sim.body.linvel().z).toBeGreaterThan(before);
  // Landing restores normal gravity but keeps the wings.
  sim.body.setTranslation({ x: 0, y: 1, z: -30 }, true);
  sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  for (let i = 0; i < 60; i++) sim.step({});
  expect(sim.flying).toBe(false);
  expect(sim.body.gravityScale()).toBe(1);
  expect(sim.trackRun?.wings).toBe(true);
});

it("orients the car from air yaw/pitch input while flying", () => {
  const sim = flyingSim();
  sim.body.setTranslation({ x: 0, y: 60, z: 0 }, true);
  sim.body.setLinvel({ x: 0, y: 0, z: 12 }, true);
  sim.step({ airYaw: 1, airPitch: 0.5 });
  const angvel = sim.body.angvel();
  expect(Math.hypot(angvel.x, angvel.y, angvel.z)).toBeGreaterThan(0.1);
  // No air input on the ground: no forced spin.
  sim.body.setTranslation({ x: 0, y: 1, z: -30 }, true);
  sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  for (let i = 0; i < 30; i++) sim.step({ airYaw: 1, airPitch: 1 });
  expect(sim.flying).toBe(false);
});

it("Space/B jumps with wings on each press, without continuously lifting when held", () => {
  const sim = flyingSim();
  try {
    sim.run(1);
    sim.step({ handbrake: 1 });
    const launch = sim.body.linvel().y;
    expect(launch).toBeGreaterThan(10);
    sim.run(0.2, { handbrake: 1 });
    expect(sim.body.linvel().y).toBeLessThanOrEqual(launch);
    sim.step({}); sim.step({ handbrake: 1 });
    expect(sim.body.linvel().y).toBeGreaterThan(launch + 5);
    sim.reset(); sim.run(1); sim.step({ handbrake: 1 });
    expect(sim.body.linvel().y).toBeLessThan(1);
  } finally { sim.dispose(); }
});

it("usual steering smoothly turns flight velocity and stops turning on release", () => {
  const sim = flyingSim();
  try {
    sim.body.setTranslation({ x: 0, y: 60, z: 0 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 12 }, true);
    sim.step({ steer: 1 });
    expect(sim.body.angvel().y).toBeGreaterThan(0);
    expect(sim.body.angvel().y).toBeLessThan(1);
    sim.run(0.4, { steer: 1 });
    expect(sim.body.linvel().x).toBeGreaterThan(2);
    sim.run(0.5);
    expect(Math.abs(sim.body.angvel().y)).toBeLessThan(0.05);
    sim.run(0.4, { steer: -1 });
    expect(sim.body.angvel().y).toBeLessThan(-0.5);
  } finally { sim.dispose(); }
});

it("tunes jump, look and usual flight steering independently", () => {
  const sample = (jump: number, look: number, steering: number) => {
    const sim = flyingSim();
    try {
      sim.setTuning({ flightJumpStrength: jump, flightLookPower: look, flightSteerPower: steering });
      sim.body.setTranslation({ x: 0, y: 60, z: 0 }, true);
      sim.body.setLinvel({ x: 0, y: 0, z: 12 }, true);
      sim.step({ handbrake: 1, airPitch: 0.5, steer: 0.5 });
      return { y: sim.body.linvel().y, pitch: sim.body.angvel().x, yaw: sim.body.angvel().y };
    } finally { sim.dispose(); }
  };
  const base = sample(1, 1, 1), jump = sample(2, 1, 1), look = sample(1, 2, 1), steering = sample(1, 1, 2);
  expect(jump.y).toBeGreaterThan(base.y * 1.8);
  expect(Math.abs(look.pitch)).toBeGreaterThan(Math.abs(base.pitch) * 1.8);
  expect(steering.yaw).toBeGreaterThan(base.yaw * 1.8);
  expect(look.yaw).toBeCloseTo(base.yaw);
});

it("uses mouse displacement without losing larger gestures to a stick-input clamp", () => {
  const turns: number[] = [];
  for (const delta of [0.09, 0.27]) {
    const sim = flyingSim();
    try {
      sim.body.setTranslation({ x: 0, y: 60, z: 0 }, true);
      sim.body.setLinvel({ x: 0, y: 0, z: 12 }, true);
      sim.step({ airYawDelta: delta }); sim.run(0.5);
      const q = sim.body.rotation();
      turns.push(Math.atan2(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y)));
    } finally { sim.dispose(); }
  }
  expect(turns[0]).toBeGreaterThan(0.15);
  expect(turns[1]).toBeCloseTo(turns[0] * 3, 1);
});
