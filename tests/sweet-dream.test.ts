import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  isSweetDream,
  placeInLevel,
  PREFAB_KINDS,
  registerCustomTrack,
  SWEET_DREAM_PREFAB_KINDS,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { DUNGEON_STRIKE, dungeonHazards } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";
import { buildSweetDream, poseSweetDream } from "../src/sweet-dream-view";

beforeAll(initPhysics);

const KINDS = [...SWEET_DREAM_PREFAB_KINDS];

function fixture(prefabs: CustomPrefab[], spawn = { x: 0, y: 2.1, z: -20, yaw: 0 }) {
  const level = blankLevel("Sweet Fixture");
  level.prefabs = prefabs;
  level.spawn = spawn;
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:sweet-fixture");
  return sim;
}

it("registers five sweet-dream decor prefabs as non-lethal dungeon scenery", () => {
  expect(KINDS).toHaveLength(5);
  for (const kind of KINDS) {
    for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS, SWEET_DREAM_PREFAB_KINDS])
      expect(list).toContain(kind);
    expect(isSweetDream(kind)).toBe(true);
    expect(
      (DUNGEON_STRIKE as Record<string, unknown>)[kind],
      `${kind} must never strike`,
    ).toBeUndefined();
  }
  expect(isSweetDream("cage")).toBe(false);
  expect(isSweetDream("gumdrop-tree")).toBe(false);
});

it("validates sweet prefabs with yaw and places them from the palette", () => {
  const level = validateCustomLevel({
    ...blankLevel("Sweet Parking"),
    prefabs: KINDS.map((kind, i) => ({
      id: `sweet-${i}`,
      kind,
      x: i * 10,
      z: 0,
      y: 0,
      yaw: 0.5,
    })),
  });
  expect(level.prefabs).toHaveLength(5);
  expect(dungeonHazards(toTrack(level)).map((h) => h.kind).sort()).toEqual(
    [...KINDS].sort(),
  );
  const placed = placeInLevel(blankLevel("Sweet Placement"), {
    type: "prefab",
    kind: "cupcake",
    x: 5,
    z: 5,
  });
  expect(placed.prefabs).toHaveLength(1);
  expect(placed.prefabs[0].kind).toBe("cupcake");
});

it("builds five detailed models with animated pivots where needed", () => {
  for (const kind of KINDS) {
    const raw = new T.Group();
    const pivots = buildSweetDream(raw, kind);
    let parts = 0;
    raw.traverse((o) => {
      if (o instanceof T.Mesh) parts++;
    });
    expect(parts, `${kind} parts`).toBeGreaterThanOrEqual(8);
    const model = buildDungeonModel({ id: `test-${kind}`, kind, x: 0, z: 0, phase: 0 });
    const wantPivots = kind === "bunting-string" ? 12 : kind === "balloon-pole" ? 1 : 0;
    expect(model.pivots, `${kind} pivots`).toHaveLength(wantPivots);
    expect(model.triangles, `${kind} triangles`).toBeGreaterThan(500);
    let labels = 0;
    model.root.traverse((o) => {
      if (o instanceof T.Sprite) labels++;
    });
    expect(labels, `${kind} labels`).toBe(0);
    expect(pivots).toHaveLength(wantPivots);
  }
  // Poses animate without throwing and actually move the pivots.
  const bunting = new T.Group();
  const flags = buildSweetDream(bunting, "bunting-string");
  poseSweetDream("bunting-string", flags, 0);
  const rest = flags[0].rotation.y;
  poseSweetDream("bunting-string", flags, 0.7);
  expect(flags[0].rotation.y).not.toBeCloseTo(rest, 5);
  const pole = new T.Group();
  const cluster = buildSweetDream(pole, "balloon-pole");
  poseSweetDream("balloon-pole", cluster, 0);
  const level = cluster[0].rotation.x;
  poseSweetDream("balloon-pole", cluster, 1.1);
  expect(cluster[0].rotation.x).not.toBeCloseTo(level, 5);
  poseSweetDream("cupcake", [], 3);
});

it("spawns solid colliders that never deal damage", () => {
  const sim = fixture(
    KINDS.map((kind, i) => ({ id: `sweet-${i}`, kind, x: i * 30, z: 60 })),
  );
  try {
    const mechanisms = sim.dungeon.mechanisms.filter((m) => isSweetDream(m.h.kind));
    expect(mechanisms).toHaveLength(5);
    for (const m of mechanisms) {
      const want = m.h.kind === "bunting-string" ? 2 : 1;
      expect(m.colliders.length, m.h.kind).toBe(want);
    }
    for (let i = 0; i < 120; i++) sim.step({ throttle: 0 });
    expect(
      sim.damageEvents.filter((e) => isSweetDream(e.source)),
    ).toHaveLength(0);
    expect(sim.dungeon.mechanisms.every((m) => m.contacts === 0)).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("blocks the car at the gift wall but lets it pass under the bunting", () => {
  const wall = fixture([{ id: "gift", kind: "gift-box", x: 0, z: 30 }]);
  try {
    for (let i = 0; i < 600; i++) wall.step({ throttle: 1 });
    expect(wall.body.translation().z).toBeLessThan(30);
    expect(wall.status).toBe("driving");
    expect(wall.damageEvents.filter((e) => e.source === "gift-box")).toHaveLength(0);
  } finally {
    wall.dispose();
  }
  const arch = fixture([{ id: "bunt", kind: "bunting-string", x: 0, z: 0 }]);
  try {
    for (let i = 0; i < 600; i++) arch.step({ throttle: 1 });
    expect(arch.body.translation().z).toBeGreaterThan(10);
    expect(arch.status).toBe("driving");
    expect(arch.damageEvents.filter((e) => e.source === "bunting-string")).toHaveLength(0);
  } finally {
    arch.dispose();
  }
});
