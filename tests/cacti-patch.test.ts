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
  type CustomPrefab,
} from "../src/custom-level";
import { CACTI_PATCH, DUNGEON_STRIKE, dungeonHazards } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";

beforeAll(initPhysics);

function fixture(prefabs: CustomPrefab[], name: string) {
  const level = blankLevel(name);
  level.prefabs = prefabs;
  level.spawn = { x: 0, y: 2.1, z: 40, yaw: 0 };
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

it("registers the cacti patch as solid non-lethal dungeon scenery", () => {
  for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS])
    expect(list).toContain("cacti-patch");
  expect(
    (DUNGEON_STRIKE as Record<string, unknown>)["cacti-patch"],
  ).toBeUndefined();
  expect(CACTI_PATCH).toEqual({ w: 6, h: 2.5, d: 6 });
  const level = validateCustomLevel({
    ...blankLevel("Cacti Parking"),
    prefabs: [{ id: "cactus", kind: "cacti-patch", x: 0, z: 0, y: 0, yaw: 0.5 }],
  });
  expect(dungeonHazards(toTrack(level)).map((h) => h.kind)).toEqual([
    "cacti-patch",
  ]);
});

it("builds a detailed static model headlessly", () => {
  const model = buildDungeonModel({
    id: "test-cacti",
    kind: "cacti-patch",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.pivots).toHaveLength(0);
  expect(model.triangles).toBeGreaterThan(500);
  let labels = 0;
  model.root.traverse((o) => {
    if (o instanceof T.Sprite) labels++;
  });
  expect(labels).toBe(0);
});

it("spawns one solid collider that blocks the car without damage", () => {
  const sim = fixture(
    [{ id: "cactus", kind: "cacti-patch", x: 0, z: 60 }],
    "Cacti Block",
  );
  try {
    const mechanisms = sim.dungeon.mechanisms.filter(
      (m) => m.h.kind === "cacti-patch",
    );
    expect(mechanisms).toHaveLength(1);
    expect(mechanisms[0].colliders).toHaveLength(1);
    for (let i = 0; i < 240; i++) sim.step({ throttle: 1 });
    expect(sim.body.translation().z).toBeLessThan(56);
    expect(sim.status).toBe("driving");
    expect(
      sim.damageEvents.filter((e) => e.source === "cacti-patch"),
    ).toHaveLength(0);
  } finally {
    sim.dispose();
  }
});
