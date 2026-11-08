import { beforeAll, expect, it } from "vitest";
import { Vector3 } from "three";
import {
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import { buildDungeonModel } from "../src/dungeon-view";
import { dungeonHazards } from "../src/dungeon-hazards";
import {
  WINDOW_GATE_BLOCK_HALF_ANGLE,
  WINDOW_GATE_COOLDOWN,
  WINDOW_GATE_PERIOD,
  windowGateAngle,
  windowGateBlocked,
} from "../src/gauntlet-timing";
import { windowGateDeltaVelocity } from "../src/gauntlet-physics";
import { hammerStrike } from "../src/hammer-impact";
import { initPhysics, Simulation } from "../src/simulation";

const level = validateCustomLevel({
  name: "Window Gate Probe",
  mode: "race",
  spawn: { x: 0, y: 2.1, z: -20, yaw: 0 },
  checkpoints: [{ x: 0, z: 60 }],
  solids: [
    { id: "deck", kind: "tile", x: 0, y: -0.6, z: 10, w: 30, h: 1.2, d: 100, color: 0x137e91 },
  ],
  prefabs: [{ id: "gate-1", kind: "window-gate", x: 0, y: 0, z: 10 }],
  medals: { gold: 30, silver: 45, bronze: 60 },
});
const id = toTrack(level).id;
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(toTrack(level));
});

it("accepts window-gate prefabs with yaw", () => {
  const withYaw = validateCustomLevel({
    ...level,
    prefabs: [{ id: "gate-2", kind: "window-gate", x: 5, y: 0, z: 20, yaw: 1.2 }],
  });
  expect(withYaw.prefabs[0].yaw).toBe(1.2);
  expect(dungeonHazards(toTrack(withYaw)).map((h) => h.kind)).toEqual([
    "window-gate",
  ]);
});

it("rotates slowly with the sash flat twice per revolution", () => {
  expect(WINDOW_GATE_PERIOD).toBe(10);
  expect(WINDOW_GATE_BLOCK_HALF_ANGLE).toBeCloseTo(0.8, 5);
  expect(windowGateAngle(0)).toBe(0);
  expect(windowGateAngle(2.5)).toBeCloseTo(Math.PI / 2, 9);
  expect(windowGateAngle(5)).toBeCloseTo(Math.PI, 9);
  expect(windowGateBlocked(0)).toBe(true);
  expect(windowGateBlocked(2.5)).toBe(false);
  expect(windowGateBlocked(5)).toBe(true);
  expect(windowGateBlocked(7.5)).toBe(false);
  let blocked = 0;
  for (let t = 0; t < WINDOW_GATE_PERIOD; t += 0.05)
    if (windowGateBlocked(t)) blocked++;
  expect(blocked / 200).toBeCloseTo(0.51, 1);
});

it("scales the hammer knockback to exactly 25%", () => {
  const radius = new Vector3(1.5, -4, 0);
  const normal = new Vector3(0, 0, -1);
  const incoming = new Vector3(0, 0, 9);
  expect(windowGateDeltaVelocity(radius, normal, incoming).toArray()).toEqual(
    hammerStrike(radius, normal, incoming).deltaVelocity.multiplyScalar(0.25).toArray(),
  );
});

it("knocks a mistimed crossing back, taking 15% and one part", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    expect(sim.dungeon.mechanisms.find((m) => m.h.id === "gate-1")!.colliders).toHaveLength(4);
    const before = sim.body.linvel();
    sim.body.setTranslation({ x: 0, y: 1.2, z: 10 }, true);
    sim.run(0.1);
    expect(sim.damageEvents.filter((e) => e.source === "window-gate")).toHaveLength(1);
    expect(sim.snapshot(false).integrity).toBeCloseTo(0.85);
    expect(sim.damageEvents.filter((e) => e.source === "window-gate-part")).toHaveLength(1);
    expect(sim.status).toBe("driving");
    const after = sim.body.linvel();
    const kick = Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z);
    expect(kick).toBeGreaterThan(2);
    expect(sim.dungeon.gauntlet.machines.get("gate-1")!.contacts).toBe(1);
  } finally {
    sim.dispose();
  }
});

it("lets an open-phase crossing through untouched", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 0, y: 1.2, z: -30 }, true);
    sim.run(2.5);
    sim.body.setTranslation({ x: 0, y: 1.2, z: 10 }, true);
    sim.run(0.2);
    expect(sim.damageEvents.some((e) => e.source === "window-gate")).toBe(false);
    expect(sim.snapshot(false).integrity).toBe(1);
  } finally {
    sim.dispose();
  }
});

it("strikes at most once per cooldown while blocked", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    expect(WINDOW_GATE_COOLDOWN).toBe(1.5);
    sim.body.setTranslation({ x: 0, y: 1.2, z: 10 }, true);
    sim.run(0.1);
    for (let i = 0; i < 10; i++) {
      sim.body.setTranslation({ x: 0, y: 1.2, z: 10 }, true);
      sim.run(0.1);
    }
    expect(sim.damageEvents.filter((e) => e.source === "window-gate")).toHaveLength(1);
    sim.body.setTranslation({ x: 0, y: 1.2, z: -30 }, true);
    sim.run(8.8 - sim.time);
    sim.body.setTranslation({ x: 0, y: 1.2, z: 10 }, true);
    sim.run(0.1);
    expect(sim.damageEvents.filter((e) => e.source === "window-gate")).toHaveLength(2);
  } finally {
    sim.dispose();
  }
});

it("spins the white blade in sync with the physics angle", () => {
  const track = toTrack(level);
  const model = buildDungeonModel(dungeonHazards(track)[0]);
  const blade = model.root.getObjectByName("window-blade")!;
  expect(blade).toBeDefined();
  model.machine!(0);
  expect(blade.rotation.y).toBeCloseTo(windowGateAngle(0), 9);
  model.machine!(2.5);
  expect(blade.rotation.y).toBeCloseTo(windowGateAngle(2.5), 9);
});
