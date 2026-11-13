import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import {
  FLAGPOLE_APEX_DISTANCE,
  FLAGPOLE_EXIT,
  FLAGPOLE_TUBE,
} from "../src/guided-pipe";
import { buildDungeonModel } from "../src/dungeon-view";
import { Simulation, initPhysics } from "../src/simulation";

beforeAll(initPhysics);

beforeEach(() => {
  const ctx = {
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
  };
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ctx,
    }),
    createElementNS: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      src: "",
    }),
  });
});

it("registers the flagpole ride with a vertical loop curve", () => {
  for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS])
    expect(list).toContain("flagpole");
  expect(FLAGPOLE_TUBE.getPointAt(0).y).toBeCloseTo(1.9, 1);
  expect(FLAGPOLE_TUBE.getPointAt(1).y).toBeCloseTo(1.9, 1);
  const apex = FLAGPOLE_TUBE.getPointAt(
    FLAGPOLE_APEX_DISTANCE / FLAGPOLE_TUBE.getLength(),
  );
  expect(apex.y).toBeGreaterThan(30);
  expect(FLAGPOLE_EXIT.getPointAt(1).z).toBeGreaterThan(8);
});

it("rides up the pole, knocks the flag and exits driving", () => {
  const level = blankLevel("Flagpole Fixture");
  level.prefabs = [{ id: "pole", kind: "flagpole", x: 0, z: 20 }];
  level.spawn = { x: -2.5, y: 2.1, z: 8, yaw: 0 };
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  try {
    sim.startTrack("custom:flagpole-fixture");
    let engaged = false;
    let peak = 0;
    let exitZ = 0;
    for (let i = 0; i < 720; i++) {
      sim.step({ throttle: 1 });
      if (sim.guidedPipe.snapshot()) engaged = true;
      else if (engaged && exitZ === 0) exitZ = sim.body.translation().z;
      peak = Math.max(peak, sim.body.translation().y);
    }
    expect(engaged).toBe(true);
    expect(peak).toBeGreaterThan(25);
    expect(sim.guidedPipe.knocked?.id).toBe("pole");
    expect(exitZ).toBeGreaterThan(30);
    expect(sim.body.translation().z).toBeGreaterThan(26);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("exits a yawed pole without stalling at the tube joint", () => {
  const level = blankLevel("Yaw90 Fixture");
  level.prefabs = [
    { id: "pole", kind: "flagpole", x: 0, z: 20, yaw: Math.PI / 2 },
  ];
  level.spawn = { x: -12, y: 2.1, z: 23, yaw: Math.PI / 2 };
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  try {
    sim.startTrack("custom:yaw90-fixture");
    let engaged = false;
    let exitX = 0;
    for (let i = 0; i < 900; i++) {
      sim.step({ throttle: 1 });
      if (sim.guidedPipe.snapshot()) engaged = true;
      else if (engaged && exitX === 0) exitX = sim.body.translation().x;
    }
    expect(engaged).toBe(true);
    expect(exitX).toBeGreaterThan(12);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("engages the ride on any base touch and completes the ascent", () => {
  const level = blankLevel("Base Touch Fixture");
  level.prefabs = [{ id: "pole", kind: "flagpole", x: 0, z: 20 }];
  level.spawn = { x: -2.5, y: 2.1, z: 8, yaw: 0 };
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  try {
    sim.startTrack("custom:base-touch-fixture");
    // Parked on the base, off the inlet lane and standing still: the old
    // plane-crossing trigger cannot fire here.
    sim.body.setTranslation({ x: 2, y: 2, z: 20.5 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    for (let i = 0; i < 30 && !sim.guidedPipe.snapshot(); i++) sim.step({});
    expect(sim.guidedPipe.snapshot()).not.toBeNull();
    let peak = 0;
    for (let i = 0; i < 720; i++) {
      sim.step({});
      peak = Math.max(peak, sim.body.translation().y);
    }
    expect(peak).toBeGreaterThan(25);
    expect(sim.guidedPipe.knocked?.id).toBe("pole");
    expect(sim.guidedPipe.snapshot()).toBeNull();
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("ignores trucks parked clear of the base", () => {
  const level = blankLevel("Base Clear Fixture");
  level.prefabs = [{ id: "pole", kind: "flagpole", x: 0, z: 20 }];
  level.spawn = { x: -2.5, y: 2.1, z: 8, yaw: 0 };
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  try {
    sim.startTrack("custom:base-clear-fixture");
    sim.body.setTranslation({ x: 10, y: 2, z: 20 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    for (let i = 0; i < 60; i++) sim.step({});
    expect(sim.guidedPipe.snapshot()).toBeNull();
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("builds a poled flag model headlessly", () => {
  const model = buildDungeonModel({
    id: "test-pole",
    kind: "flagpole",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.pivots).toHaveLength(1);
  expect(model.triangles).toBeGreaterThan(100);
  let labels = 0;
  model.root.traverse((o) => {
    if (o instanceof T.Sprite) labels++;
  });
  expect(labels).toBe(1);
});
