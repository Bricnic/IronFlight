import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  CHRISTMAS_PREFAB_KINDS,
  DUNGEON_PREFAB_KINDS,
  isChristmasDecor,
  placeInLevel,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { DUNGEON_STRIKE, dungeonHazards } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";
import { buildChristmasDecor } from "../src/christmas-view";

beforeAll(initPhysics);

const KINDS = [...CHRISTMAS_PREFAB_KINDS];

function fixture(prefabs: CustomPrefab[], spawn = { x: 0, y: 2.1, z: -20, yaw: 0 }) {
  const level = blankLevel("Christmas Fixture");
  level.prefabs = prefabs;
  level.spawn = spawn;
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:christmas-fixture");
  return sim;
}

it("registers six christmas decor prefabs as non-lethal dungeon scenery", () => {
  expect(KINDS).toHaveLength(6);
  for (const kind of KINDS) {
    for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS, CHRISTMAS_PREFAB_KINDS])
      expect(list).toContain(kind);
    expect(isChristmasDecor(kind)).toBe(true);
    expect(
      (DUNGEON_STRIKE as Record<string, unknown>)[kind],
      `${kind} must never strike`,
    ).toBeUndefined();
  }
  expect(isChristmasDecor("cage")).toBe(false);
});

it("validates christmas prefabs with yaw and places them from the palette", () => {
  const level = validateCustomLevel({
    ...blankLevel("Christmas Parking"),
    prefabs: KINDS.map((kind, i) => ({
      id: `christmas-${i}`,
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
  const placed = placeInLevel(blankLevel("Christmas Placement"), {
    type: "prefab",
    kind: "christmas-tree",
    x: 5,
    z: 5,
  });
  expect(placed.prefabs).toHaveLength(1);
  expect(placed.prefabs[0].kind).toBe("christmas-tree");
});

it("builds six detailed static models headlessly", () => {
  for (const kind of KINDS) {
    const raw = new T.Group();
    buildChristmasDecor(raw, kind);
    let parts = 0;
    raw.traverse((o) => {
      if (o instanceof T.Mesh) parts++;
    });
    expect(parts, `${kind} parts`).toBeGreaterThanOrEqual(10);
    const model = buildDungeonModel({ id: `test-${kind}`, kind, x: 0, z: 0, phase: 0 });
    expect(model.pivots, `${kind} pivots`).toHaveLength(0);
    expect(model.triangles, `${kind} triangles`).toBeGreaterThan(100);
    let labels = 0;
    model.root.traverse((o) => {
      if (o instanceof T.Sprite) labels++;
    });
    expect(labels, `${kind} labels`).toBe(0);
  }
});

it("spawns solid colliders that never deal damage", () => {
  const sim = fixture(
    KINDS.map((kind, i) => ({ id: `christmas-${i}`, kind, x: i * 30, z: 60 })),
  );
  try {
    const mechanisms = sim.dungeon.mechanisms.filter((m) => isChristmasDecor(m.h.kind));
    expect(mechanisms).toHaveLength(6);
    for (const m of mechanisms) {
      const want = m.h.kind === "christmas-light-arch" ? 2 : 1;
      expect(m.colliders.length, m.h.kind).toBe(want);
    }
    for (let i = 0; i < 120; i++) sim.step({ throttle: 0 });
    expect(
      sim.damageEvents.filter((e) => isChristmasDecor(e.source)),
    ).toHaveLength(0);
    expect(sim.dungeon.mechanisms.every((m) => m.contacts === 0)).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("blocks the car at the gift wall but lets it pass under the arch", () => {
  const wall = fixture([{ id: "wall", kind: "christmas-gift-wall", x: 0, z: 30 }]);
  try {
    for (let i = 0; i < 600; i++) wall.step({ throttle: 1 });
    expect(wall.body.translation().z).toBeLessThan(30);
    expect(wall.status).toBe("driving");
    expect(wall.damageEvents.filter((e) => e.source === "christmas-gift-wall")).toHaveLength(0);
  } finally {
    wall.dispose();
  }
  const arch = fixture([{ id: "arch", kind: "christmas-light-arch", x: 0, z: 0 }]);
  try {
    for (let i = 0; i < 600; i++) arch.step({ throttle: 1 });
    expect(arch.body.translation().z).toBeGreaterThan(10);
    expect(arch.status).toBe("driving");
    expect(arch.damageEvents.filter((e) => e.source === "christmas-light-arch")).toHaveLength(0);
  } finally {
    arch.dispose();
  }
});
