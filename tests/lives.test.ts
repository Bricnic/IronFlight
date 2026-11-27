import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { Simulation, initPhysics } from "../src/simulation";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { TrackRun, respawnPose } from "../src/track-run";
import { getTrack, gates, type Track } from "../src/tracks";

beforeAll(initPhysics);
beforeAll(() => {
  registerCustomTrack(officialFileTracks.find((t) => t.id === "custom:jurassic-junction")!);
});

const race: Track = {
  ...getTrack("foundry-run"),
  checkpoints: gates(
    [
      { x: 0, z: 0 },
      { x: 0, z: 10 },
      { x: 0, z: 20 },
    ],
    12,
  ),
};
const p = (z: number, x = 0, y = 2) => ({ x, y, z });

it("fails the run on first wreck with the default single life", () => {
  const run = new TrackRun(race);
  expect(run.lives).toBe(1);
  expect(run.snapshot().lives).toBe(1);
  run.step(1, p(0), p(1), 0);
  expect(run.status).toBe("failed");
  expect(run.reason).toBe("wrecked");
  expect(run.respawnRequested).toBe(false);
});

it("spends a life and requests respawn instead of failing", () => {
  const run = new TrackRun(race, "default", 3);
  run.step(1, p(5), p(15), 1);
  expect(run.checkpoint).toBe(1);
  run.step(1, p(15), p(16), 0);
  expect(run.status).toBe("running");
  expect(run.reason).toBe(null);
  expect(run.lives).toBe(2);
  expect(run.respawns).toBe(1);
  expect(run.respawnRequested).toBe(true);
  // Progress survives the lost life.
  expect(run.checkpoint).toBe(1);
  expect(run.splits).toHaveLength(1);
  expect(run.snapshot().lives).toBe(2);
});

it("treats falling off the course like a wreck", () => {
  const run = new TrackRun(race, "default", 2);
  run.step(1, p(0), { x: 0, y: -16, z: 1 }, 1);
  expect(run.status).toBe("running");
  expect(run.lives).toBe(1);
  expect(run.respawnRequested).toBe(true);
});

it("fails once the last life is spent", () => {
  const run = new TrackRun(race, "default", 2);
  run.step(1, p(0), p(1), 0);
  expect(run.lives).toBe(1);
  run.respawnRequested = false; // consumed by the sim's respawn
  run.step(1, p(1), p(2), 0);
  expect(run.status).toBe("failed");
  expect(run.reason).toBe("wrecked");
  expect(run.lives).toBe(1);
});

it("still fails on timeout with lives remaining", () => {
  const run = new TrackRun({ ...race, limit: 2 }, "default", 5);
  run.step(3, p(0), p(1), 1);
  expect(run.status).toBe("failed");
  expect(run.reason).toBe("timeout");
  expect(run.lives).toBe(5);
  expect(run.respawnRequested).toBe(false);
});

it("clamps lives into 1..5", () => {
  expect(new TrackRun(race, "default", 0).lives).toBe(1);
  expect(new TrackRun(race, "default", 9).lives).toBe(5);
  expect(new TrackRun(race, "default", Number.NaN).lives).toBe(1);
});

it("respawn pose is the last crossed gate, or spawn", () => {
  expect(respawnPose(race, 0)).toEqual({
    x: race.spawn.x,
    y: race.spawn.y,
    z: race.spawn.z,
    yaw: race.spawn.yaw,
  });
  const g = race.checkpoints[0];
  expect(respawnPose(race, 1)).toEqual({
    x: g.x,
    y: g.y,
    z: g.z,
    yaw: Math.atan2(g.nx, g.nz),
  });
  const yawed = { ...race, checkpoints: [{ ...g, yaw: 1.2 }] };
  expect(respawnPose(yawed, 1).yaw).toBe(1.2);
});

const JJ = "custom:jurassic-junction";

function startedSim(lives: number) {
  const sim = new Simulation();
  sim.startTrack(JJ as never, "easy", lives);
  sim.run(0.5);
  return sim;
}

it("respawns a wrecked 3-life run at the last checkpoint with full integrity", () => {
  const sim = startedSim(3);
  try {
    const run = sim.trackRun!;
    const g = run.track.checkpoints[0];
    // Cross gate 0 with a swept step (steps snapshot previous first, so a
    // teleport alone never sweeps).
    run.step(
      DT,
      { x: g.x - g.nx * 3, y: g.y, z: g.z - g.nz * 3 },
      { x: g.x + g.nx * 3, y: g.y, z: g.z + g.nz * 3 },
      1,
    );
    expect(run.checkpoint).toBe(1);
    // Total wreck: chassis-front cascades through every part.
    sim.damage("chassis-front", 10000);
    sim.step({});
    expect(run.status).toBe("running");
    expect(run.lives).toBe(2);
    expect(run.respawnRequested).toBe(false);
    const at = sim.body.translation();
    expect(at.x).toBeCloseTo(g.x, 0);
    expect(at.y).toBeCloseTo(g.y, 0);
    expect(at.z).toBeCloseTo(g.z, 0);
    const health = [...sim.parts.values()].reduce((a, s) => a + s.health, 0);
    const full = sim.partDefs.reduce((a, d) => a + d.hp, 0);
    expect(health).toBe(full);
    expect([...sim.parts.values()].some((s) => s.body)).toBe(false);
    expect(sim.vehicle.wheelMaxSuspensionForce(0)).toBeGreaterThan(0);
    expect(run.checkpoint).toBe(1);
  } finally {
    sim.dispose();
  }
});

it("respawns a fall with no checkpoints at the spawn", () => {
  const sim = startedSim(2);
  try {
    const run = sim.trackRun!;
    sim.body.setTranslation({ x: 0, y: -20, z: 0 }, true);
    sim.step({});
    expect(run.status).toBe("running");
    expect(run.lives).toBe(1);
    const at = sim.body.translation();
    const spawn = run.track.spawn;
    expect(at.x).toBeCloseTo(spawn.x, 0);
    expect(at.z).toBeCloseTo(spawn.z, 0);
  } finally {
    sim.dispose();
  }
});

it("keeps single-life behavior: first wreck ends the run in place", () => {
  const sim = startedSim(1);
  try {
    const run = sim.trackRun!;
    sim.damage("chassis-front", 10000);
    const before = { ...sim.body.translation() };
    sim.step({});
    expect(run.status).toBe("failed");
    expect(run.reason).toBe("wrecked");
    expect(run.lives).toBe(1);
    const at = sim.body.translation();
    expect(at.x).toBeCloseTo(before.x, 0);
    expect(at.z).toBeCloseTo(before.z, 0);
  } finally {
    sim.dispose();
  }
});
