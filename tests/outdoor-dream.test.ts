import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  isOutdoorDream,
  placeInLevel,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  OUTDOOR_DREAM_PREFAB_KINDS,
  type CustomPrefab,
} from "../src/custom-level";
import { DUNGEON_STRIKE, dungeonHazards } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";
import { buildOutdoorDream, poseOutdoorDream } from "../src/outdoor-dream-view";

beforeAll(initPhysics);

const KINDS = [...OUTDOOR_DREAM_PREFAB_KINDS];

function fixture(prefabs: CustomPrefab[], spawn = { x: 0, y: 2.1, z: -20, yaw: 0 }) {
  const level = blankLevel("Outdoor Fixture");
  level.prefabs = prefabs;
  level.spawn = spawn;
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:outdoor-fixture");
  return sim;
}

it("registers five out-dream decor prefabs as non-lethal dungeon scenery", () => {
  expect(KINDS).toHaveLength(6);
  for (const kind of KINDS) {
    for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS, OUTDOOR_DREAM_PREFAB_KINDS])
      expect(list).toContain(kind);
    expect(isOutdoorDream(kind)).toBe(true);
    expect(
      (DUNGEON_STRIKE as Record<string, unknown>)[kind],
      `${kind} must never strike`,
    ).toBeUndefined();
  }
  expect(isOutdoorDream("cage")).toBe(false);
  expect(isOutdoorDream("cupcake")).toBe(false);
});

it("validates outdoor prefabs with yaw and places them from the palette", () => {
  const level = validateCustomLevel({
    ...blankLevel("Outdoor Parking"),
    prefabs: KINDS.map((kind, i) => ({
      id: `out-${i}`,
      kind,
      x: i * 10,
      z: 0,
      y: 0,
      yaw: 0.5,
    })),
  });
  expect(level.prefabs).toHaveLength(6);
  expect(dungeonHazards(toTrack(level)).map((h) => h.kind).sort()).toEqual(
    [...KINDS].sort(),
  );
  const placed = placeInLevel(blankLevel("Outdoor Placement"), {
    type: "prefab",
    kind: "pine-tree",
    x: 5,
    z: 5,
  });
  expect(placed.prefabs).toHaveLength(1);
  expect(placed.prefabs[0].kind).toBe("pine-tree");
});

it("builds six detailed models with animated pivots where needed", () => {
  for (const kind of KINDS) {
    const raw = new T.Group();
    const pivots = buildOutdoorDream(raw, kind);
    let parts = 0;
    raw.traverse((o) => {
      if (o instanceof T.Mesh) parts++;
    });
    expect(parts, `${kind} parts`).toBeGreaterThanOrEqual(8);
    const model = buildDungeonModel({ id: `test-${kind}`, kind, x: 0, z: 0, phase: 0 });
    const wantPivots =
      kind === "waterfall" || kind === "compass-rock" ? 1 : 0;
    expect(model.pivots, `${kind} pivots`).toHaveLength(wantPivots);
    expect(model.triangles, `${kind} triangles`).toBeGreaterThan(800);
    let labels = 0;
    model.root.traverse((o) => {
      if (o instanceof T.Sprite) labels++;
    });
    expect(labels, `${kind} labels`).toBe(0);
    expect(pivots).toHaveLength(wantPivots);
  }
  const cliff = new T.Group();
  const falls = buildOutdoorDream(cliff, "waterfall");
  poseOutdoorDream("waterfall", falls, 0);
  const foam = falls[0].children[0];
  const size = foam.scale.x;
  poseOutdoorDream("waterfall", falls, 0.4);
  expect(foam.scale.x).not.toBeCloseTo(size, 5);
  const rim = new T.Group();
  const compass = buildOutdoorDream(rim, "compass-rock");
  poseOutdoorDream("compass-rock", compass, 0);
  const rest = compass[0].rotation.y;
  poseOutdoorDream("compass-rock", compass, 0.7);
  expect(compass[0].rotation.y).not.toBeCloseTo(rest, 5);
  poseOutdoorDream("pine-tree", [], 3);
});

it("spawns solid colliders that never deal damage", () => {
  const sim = fixture(
    KINDS.map((kind, i) => ({ id: `out-${i}`, kind, x: i * 30, z: 60 })),
  );
  try {
    const mechanisms = sim.dungeon.mechanisms.filter((m) => isOutdoorDream(m.h.kind));
    expect(mechanisms).toHaveLength(6);
    for (const m of mechanisms) {
      const want = m.h.kind === "trail-arch" ? 2 : 1;
      expect(m.colliders.length, m.h.kind).toBe(want);
    }
    for (let i = 0; i < 120; i++) sim.step({ throttle: 0 });
    expect(
      sim.damageEvents.filter((e) => isOutdoorDream(e.source)),
    ).toHaveLength(0);
    expect(sim.dungeon.mechanisms.every((m) => m.contacts === 0)).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("blocks the car at the mesa but lets it pass under the arch", () => {
  const wall = fixture([{ id: "butte", kind: "mesa-rock", x: 0, z: 30 }]);
  try {
    for (let i = 0; i < 600; i++) wall.step({ throttle: 1 });
    expect(wall.body.translation().z).toBeLessThan(30);
    expect(wall.status).toBe("driving");
    expect(wall.damageEvents.filter((e) => e.source === "mesa-rock")).toHaveLength(0);
  } finally {
    wall.dispose();
  }
  const gate = fixture([{ id: "gate", kind: "trail-arch", x: 0, z: 0 }]);
  try {
    for (let i = 0; i < 600; i++) gate.step({ throttle: 1 });
    expect(gate.body.translation().z).toBeGreaterThan(10);
    expect(gate.status).toBe("driving");
    expect(gate.damageEvents.filter((e) => e.source === "trail-arch")).toHaveLength(0);
  } finally {
    gate.dispose();
  }
});
