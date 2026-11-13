import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import { DUNGEON_STRIKE, ROCKER, dungeonHazards } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";

beforeAll(initPhysics);

function fixture(name: string) {
  const level = blankLevel(name);
  level.prefabs = [{ id: "see-saw", kind: "rocker", x: 0, z: 60 }];
  level.spawn = { x: 0, y: 2.1, z: 30, yaw: 0 };
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

it("registers the rocker as non-lethal dungeon machinery", () => {
  for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS])
    expect(list).toContain("rocker");
  expect(
    (DUNGEON_STRIKE as Record<string, unknown>)["rocker"],
  ).toBeUndefined();
  expect(ROCKER).toMatchObject({ w: 14, d: 26, pivotY: 1.85 });
  const level = validateCustomLevel({
    ...blankLevel("Rocker Parking"),
    prefabs: [{ id: "rk", kind: "rocker", x: 0, z: 0, y: 0, yaw: 0.5 }],
  });
  expect(dungeonHazards(toTrack(level)).map((h) => h.kind)).toEqual(["rocker"]);
});

it("rests entry-down on a kinematic deck with rails", () => {
  const sim = fixture("Rocker Rest");
  try {
    const m = sim.dungeon.mechanisms.find((m) => m.h.kind === "rocker")!;
    expect(m.body).toBeTruthy();
    expect(m.body!.isKinematic()).toBe(true);
    expect(m.colliders).toHaveLength(3);
    expect(m.tilt).toBeCloseTo(ROCKER.restTilt, 6);
    sim.run(1, {});
    expect(m.tilt).toBeCloseTo(ROCKER.restTilt, 6);
  } finally {
    sim.dispose();
  }
});

it("tips toward whichever half the car stands on", () => {
  const sim = fixture("Rocker Tilt");
  try {
    const m = sim.dungeon.mechanisms.find((m) => m.h.kind === "rocker")!;
    sim.body.setTranslation({ x: 0, y: 3, z: 60 - 8 }, true);
    sim.run(0.5, {});
    expect(m.tilt!).toBeLessThan(0);
    sim.body.setTranslation({ x: 0, y: 3, z: 60 + 8 }, true);
    sim.run(1, {});
    expect(m.tilt!).toBeGreaterThan(0);
  } finally {
    sim.dispose();
  }
});

it("carries a driving car aboard and off the far end", () => {
  const sim = fixture("Rocker Ride");
  try {
    for (let i = 0; i < 600; i++) sim.step({ throttle: 1 });
    expect(sim.body.translation().z).toBeGreaterThan(76);
    expect(sim.status).toBe("driving");
    expect(
      sim.damageEvents.filter((e) => e.source === "rocker"),
    ).toHaveLength(0);
  } finally {
    sim.dispose();
  }
});

it("builds a static support with one tilting deck headlessly", () => {
  const model = buildDungeonModel({
    id: "test-rocker",
    kind: "rocker",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.pivots).toHaveLength(1);
  expect(model.triangles).toBeGreaterThan(200);
  let labels = 0;
  model.root.traverse((o) => {
    if (o instanceof T.Sprite) labels++;
  });
  expect(labels).toBe(0);
});
