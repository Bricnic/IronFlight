import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  isToyboxDream,
  placeInLevel,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  TOYBOX_DREAM_PREFAB_KINDS,
  type CustomPrefab,
} from "../src/custom-level";
import { DUNGEON_STRIKE, dungeonHazards } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";
import { buildToyboxDream, poseToyboxDream } from "../src/toybox-dream-view";

beforeAll(initPhysics);

const KINDS = [...TOYBOX_DREAM_PREFAB_KINDS];

function fixture(prefabs: CustomPrefab[], spawn = { x: 0, y: 2.1, z: -20, yaw: 0 }) {
  const level = blankLevel("Toybox Fixture");
  level.prefabs = prefabs;
  level.spawn = spawn;
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:toybox-fixture");
  return sim;
}

it("registers five toy-dream decor prefabs as non-lethal dungeon scenery", () => {
  expect(KINDS).toHaveLength(6);
  for (const kind of KINDS) {
    for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS, TOYBOX_DREAM_PREFAB_KINDS])
      expect(list).toContain(kind);
    expect(isToyboxDream(kind)).toBe(true);
    expect(
      (DUNGEON_STRIKE as Record<string, unknown>)[kind],
      `${kind} must never strike`,
    ).toBeUndefined();
  }
  expect(isToyboxDream("cage")).toBe(false);
  expect(isToyboxDream("cupcake")).toBe(false);
});

it("validates toybox prefabs with yaw and places them from the palette", () => {
  const level = validateCustomLevel({
    ...blankLevel("Toybox Parking"),
    prefabs: KINDS.map((kind, i) => ({
      id: `toy-${i}`,
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
  const placed = placeInLevel(blankLevel("Toybox Placement"), {
    type: "prefab",
    kind: "rubber-duck",
    x: 5,
    z: 5,
  });
  expect(placed.prefabs).toHaveLength(1);
  expect(placed.prefabs[0].kind).toBe("rubber-duck");
});

it("builds six detailed models with animated pivots where needed", () => {
  for (const kind of KINDS) {
    const raw = new T.Group();
    const pivots = buildToyboxDream(raw, kind);
    let parts = 0;
    raw.traverse((o) => {
      if (o instanceof T.Mesh) parts++;
    });
    expect(parts, `${kind} parts`).toBeGreaterThanOrEqual(8);
    const model = buildDungeonModel({ id: `test-${kind}`, kind, x: 0, z: 0, phase: 0 });
    const wantPivots =
      kind === "brick-arch" || kind === "domino" || kind === "toy-train" ? 0 : 1;
    expect(model.pivots, `${kind} pivots`).toHaveLength(wantPivots);
    expect(model.triangles, `${kind} triangles`).toBeGreaterThan(800);
    let labels = 0;
    model.root.traverse((o) => {
      if (o instanceof T.Sprite) labels++;
    });
    expect(labels, `${kind} labels`).toBe(0);
    expect(pivots).toHaveLength(wantPivots);
  }
  const tub = new T.Group();
  const duck = buildToyboxDream(tub, "rubber-duck");
  poseToyboxDream("rubber-duck", duck, 0);
  const rest = duck[0].rotation.z;
  poseToyboxDream("rubber-duck", duck, 0.4);
  expect(duck[0].rotation.z).not.toBeCloseTo(rest, 5);
  const table = new T.Group();
  const die = buildToyboxDream(table, "toy-die");
  poseToyboxDream("toy-die", die, 0);
  const spin = die[0].rotation.y;
  poseToyboxDream("toy-die", die, 0.7);
  expect(die[0].rotation.y).not.toBeCloseTo(spin, 5);
  const shelf = new T.Group();
  const bear = buildToyboxDream(shelf, "gummy-bear");
  poseToyboxDream("gummy-bear", bear, 0);
  const waist = bear[0].scale.x;
  poseToyboxDream("gummy-bear", bear, 0.7);
  expect(bear[0].scale.x).not.toBeCloseTo(waist, 5);
  poseToyboxDream("domino", [], 3);
});

it("spawns solid colliders that never deal damage", () => {
  const sim = fixture(
    KINDS.map((kind, i) => ({ id: `toy-${i}`, kind, x: i * 30, z: 60 })),
  );
  try {
    const mechanisms = sim.dungeon.mechanisms.filter((m) => isToyboxDream(m.h.kind));
    expect(mechanisms).toHaveLength(6);
    for (const m of mechanisms) {
      const want = m.h.kind === "brick-arch" ? 2 : 1;
      expect(m.colliders.length, m.h.kind).toBe(want);
    }
    for (let i = 0; i < 120; i++) sim.step({ throttle: 0 });
    expect(
      sim.damageEvents.filter((e) => isToyboxDream(e.source)),
    ).toHaveLength(0);
    expect(sim.dungeon.mechanisms.every((m) => m.contacts === 0)).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("blocks the car at the duck but lets it pass under the arch", () => {
  const wall = fixture([{ id: "tub", kind: "rubber-duck", x: 0, z: 30 }]);
  try {
    for (let i = 0; i < 600; i++) wall.step({ throttle: 1 });
    expect(wall.body.translation().z).toBeLessThan(30);
    expect(wall.status).toBe("driving");
    expect(wall.damageEvents.filter((e) => e.source === "rubber-duck")).toHaveLength(0);
  } finally {
    wall.dispose();
  }
  const gate = fixture([{ id: "gate", kind: "brick-arch", x: 0, z: 0 }]);
  try {
    for (let i = 0; i < 600; i++) gate.step({ throttle: 1 });
    expect(gate.body.translation().z).toBeGreaterThan(10);
    expect(gate.status).toBe("driving");
    expect(gate.damageEvents.filter((e) => e.source === "brick-arch")).toHaveLength(0);
  } finally {
    gate.dispose();
  }
});
