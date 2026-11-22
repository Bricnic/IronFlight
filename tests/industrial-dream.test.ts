import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  isIndustrialDream,
  placeInLevel,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  INDUSTRIAL_DREAM_PREFAB_KINDS,
  type CustomPrefab,
} from "../src/custom-level";
import { DUNGEON_STRIKE, dungeonHazards } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";
import { buildIndustrialDream, poseIndustrialDream } from "../src/industrial-dream-view";

beforeAll(initPhysics);

const KINDS = [...INDUSTRIAL_DREAM_PREFAB_KINDS];

function fixture(prefabs: CustomPrefab[], spawn = { x: 0, y: 2.1, z: -20, yaw: 0 }) {
  const level = blankLevel("Industrial Fixture");
  level.prefabs = prefabs;
  level.spawn = spawn;
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:industrial-fixture");
  return sim;
}

it("registers five ind-dream decor prefabs as non-lethal dungeon scenery", () => {
  expect(KINDS).toHaveLength(6);
  for (const kind of KINDS) {
    for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS, INDUSTRIAL_DREAM_PREFAB_KINDS])
      expect(list).toContain(kind);
    expect(isIndustrialDream(kind)).toBe(true);
    expect(
      (DUNGEON_STRIKE as Record<string, unknown>)[kind],
      `${kind} must never strike`,
    ).toBeUndefined();
  }
  expect(isIndustrialDream("cage")).toBe(false);
  expect(isIndustrialDream("cupcake")).toBe(false);
});

it("validates industrial prefabs with yaw and places them from the palette", () => {
  const level = validateCustomLevel({
    ...blankLevel("Industrial Parking"),
    prefabs: KINDS.map((kind, i) => ({
      id: `ind-${i}`,
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
  const placed = placeInLevel(blankLevel("Industrial Placement"), {
    type: "prefab",
    kind: "smokestack",
    x: 5,
    z: 5,
  });
  expect(placed.prefabs).toHaveLength(1);
  expect(placed.prefabs[0].kind).toBe("smokestack");
});

it("builds six detailed models with animated pivots where needed", () => {
  for (const kind of KINDS) {
    const raw = new T.Group();
    const pivots = buildIndustrialDream(raw, kind);
    let parts = 0;
    raw.traverse((o) => {
      if (o instanceof T.Mesh) parts++;
    });
    expect(parts, `${kind} parts`).toBeGreaterThanOrEqual(8);
    const model = buildDungeonModel({ id: `test-${kind}`, kind, x: 0, z: 0, phase: 0 });
    const wantPivots =
      kind === "power-pylon" || kind === "scrap-pile" || kind === "pipe-arch" ? 0 : 1;
    expect(model.pivots, `${kind} pivots`).toHaveLength(wantPivots);
    expect(model.triangles, `${kind} triangles`).toBeGreaterThan(800);
    let labels = 0;
    model.root.traverse((o) => {
      if (o instanceof T.Sprite) labels++;
    });
    expect(labels, `${kind} labels`).toBe(0);
    expect(pivots).toHaveLength(wantPivots);
  }
  const yard = new T.Group();
  const stack = buildIndustrialDream(yard, "smokestack");
  poseIndustrialDream("smokestack", stack, 0);
  const puffs = stack[0].userData.puffs as T.Group[];
  const height = puffs[0].position.y;
  poseIndustrialDream("smokestack", stack, 0.4);
  expect(puffs[0].position.y).not.toBeCloseTo(height, 5);
  const shop = new T.Group();
  const gears = buildIndustrialDream(shop, "gear-works");
  poseIndustrialDream("gear-works", gears, 0);
  const a = gears[0].userData.a as T.Group;
  const rest = a.rotation.z;
  poseIndustrialDream("gear-works", gears, 0.4);
  expect(a.rotation.z).not.toBeCloseTo(rest, 5);
  const vat = new T.Group();
  const tank = buildIndustrialDream(vat, "slime-tank");
  poseIndustrialDream("slime-tank", tank, 0);
  const bubbles = tank[0].userData.bubbles as T.Group[];
  const level = bubbles[0].position.y;
  poseIndustrialDream("slime-tank", tank, 0.7);
  expect(bubbles[0].position.y).not.toBeCloseTo(level, 5);
  poseIndustrialDream("scrap-pile", [], 3);
});

it("spawns solid colliders that never deal damage", () => {
  const sim = fixture(
    KINDS.map((kind, i) => ({ id: `ind-${i}`, kind, x: i * 30, z: 60 })),
  );
  try {
    const mechanisms = sim.dungeon.mechanisms.filter((m) => isIndustrialDream(m.h.kind));
    expect(mechanisms).toHaveLength(6);
    for (const m of mechanisms) {
      const want = m.h.kind === "pipe-arch" ? 2 : 1;
      expect(m.colliders.length, m.h.kind).toBe(want);
    }
    for (let i = 0; i < 120; i++) sim.step({ throttle: 0 });
    expect(
      sim.damageEvents.filter((e) => isIndustrialDream(e.source)),
    ).toHaveLength(0);
    expect(sim.dungeon.mechanisms.every((m) => m.contacts === 0)).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("blocks the car at the tank but lets it pass under the pipe", () => {
  const wall = fixture([{ id: "vat", kind: "slime-tank", x: 0, z: 30 }]);
  try {
    for (let i = 0; i < 600; i++) wall.step({ throttle: 1 });
    expect(wall.body.translation().z).toBeLessThan(30);
    expect(wall.status).toBe("driving");
    expect(wall.damageEvents.filter((e) => e.source === "slime-tank")).toHaveLength(0);
  } finally {
    wall.dispose();
  }
  const gate = fixture([{ id: "gate", kind: "pipe-arch", x: 0, z: 0 }]);
  try {
    for (let i = 0; i < 600; i++) gate.step({ throttle: 1 });
    expect(gate.body.translation().z).toBeGreaterThan(10);
    expect(gate.status).toBe("driving");
    expect(gate.damageEvents.filter((e) => e.source === "pipe-arch")).toHaveLength(0);
  } finally {
    gate.dispose();
  }
});
