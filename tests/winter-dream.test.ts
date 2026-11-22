import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  isWinterDream,
  placeInLevel,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  WINTER_DREAM_PREFAB_KINDS,
  type CustomPrefab,
} from "../src/custom-level";
import { DUNGEON_STRIKE, dungeonHazards } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";
import { buildWinterDream, poseWinterDream } from "../src/winter-dream-view";

beforeAll(initPhysics);

const KINDS = [...WINTER_DREAM_PREFAB_KINDS];

function fixture(prefabs: CustomPrefab[], spawn = { x: 0, y: 2.1, z: -20, yaw: 0 }) {
  const level = blankLevel("Winter Fixture");
  level.prefabs = prefabs;
  level.spawn = spawn;
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:winter-fixture");
  return sim;
}

it("registers six winter-dream decor prefabs as non-lethal dungeon scenery", () => {
  expect(KINDS).toHaveLength(6);
  for (const kind of KINDS) {
    for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS, WINTER_DREAM_PREFAB_KINDS])
      expect(list).toContain(kind);
    expect(isWinterDream(kind)).toBe(true);
    expect(
      (DUNGEON_STRIKE as Record<string, unknown>)[kind],
      `${kind} must never strike`,
    ).toBeUndefined();
  }
  expect(isWinterDream("cage")).toBe(false);
  expect(isWinterDream("cupcake")).toBe(false);
});

it("validates winter prefabs with yaw and places them from the palette", () => {
  const level = validateCustomLevel({
    ...blankLevel("Winter Parking"),
    prefabs: KINDS.map((kind, i) => ({
      id: `winter-${i}`,
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
  const placed = placeInLevel(blankLevel("Winter Placement"), {
    type: "prefab",
    kind: "gingerbread-house",
    x: 5,
    z: 5,
  });
  expect(placed.prefabs).toHaveLength(1);
  expect(placed.prefabs[0].kind).toBe("gingerbread-house");
});

it("builds six detailed models with animated pivots where needed", () => {
  for (const kind of KINDS) {
    const raw = new T.Group();
    const pivots = buildWinterDream(raw, kind);
    let parts = 0;
    raw.traverse((o) => {
      if (o instanceof T.Mesh) parts++;
    });
    expect(parts, `${kind} parts`).toBeGreaterThanOrEqual(8);
    const model = buildDungeonModel({ id: `test-${kind}`, kind, x: 0, z: 0, phase: 0 });
    const wantPivots =
      kind === "peppermint-buoy" || kind === "ski-lift-tower" ? 1 : 0;
    expect(model.pivots, `${kind} pivots`).toHaveLength(wantPivots);
    expect(model.triangles, `${kind} triangles`).toBeGreaterThan(800);
    let labels = 0;
    model.root.traverse((o) => {
      if (o instanceof T.Sprite) labels++;
    });
    expect(labels, `${kind} labels`).toBe(0);
    expect(pivots).toHaveLength(wantPivots);
  }
  const buoy = new T.Group();
  const floats = buildWinterDream(buoy, "peppermint-buoy");
  poseWinterDream("peppermint-buoy", floats, 0);
  const rest = floats[0].position.y;
  poseWinterDream("peppermint-buoy", floats, 0.9);
  expect(floats[0].position.y).not.toBeCloseTo(rest, 5);
  const tower = new T.Group();
  const cabins = buildWinterDream(tower, "ski-lift-tower");
  poseWinterDream("ski-lift-tower", cabins, 0);
  const level = cabins[0].rotation.x;
  poseWinterDream("ski-lift-tower", cabins, 1.3);
  expect(cabins[0].rotation.x).not.toBeCloseTo(level, 5);
  poseWinterDream("sled", [], 3);
});

it("spawns solid colliders that never deal damage", () => {
  const sim = fixture(
    KINDS.map((kind, i) => ({ id: `winter-${i}`, kind, x: i * 30, z: 60 })),
  );
  try {
    const mechanisms = sim.dungeon.mechanisms.filter((m) => isWinterDream(m.h.kind));
    expect(mechanisms).toHaveLength(6);
    for (const m of mechanisms) {
      expect(m.colliders.length, m.h.kind).toBe(1);
    }
    for (let i = 0; i < 120; i++) sim.step({ throttle: 0 });
    expect(
      sim.damageEvents.filter((e) => isWinterDream(e.source)),
    ).toHaveLength(0);
    expect(sim.dungeon.mechanisms.every((m) => m.contacts === 0)).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("blocks the car at the castle but lets it pass the buoy gap", () => {
  const wall = fixture([{ id: "keep", kind: "gingerbread-castle", x: 0, z: 30 }]);
  try {
    for (let i = 0; i < 600; i++) wall.step({ throttle: 1 });
    expect(wall.body.translation().z).toBeLessThan(30);
    expect(wall.status).toBe("driving");
    expect(wall.damageEvents.filter((e) => e.source === "gingerbread-castle")).toHaveLength(0);
  } finally {
    wall.dispose();
  }
  const pond = fixture([
    { id: "port", kind: "peppermint-buoy", x: -8, z: 0 },
    { id: "starboard", kind: "peppermint-buoy", x: 8, z: 0 },
  ]);
  try {
    for (let i = 0; i < 600; i++) pond.step({ throttle: 1 });
    expect(pond.body.translation().z).toBeGreaterThan(10);
    expect(pond.status).toBe("driving");
    expect(pond.damageEvents.filter((e) => e.source === "peppermint-buoy")).toHaveLength(0);
  } finally {
    pond.dispose();
  }
});
