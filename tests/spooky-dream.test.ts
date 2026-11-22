import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  isSpookyDream,
  placeInLevel,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  SPOOKY_DREAM_PREFAB_KINDS,
  type CustomPrefab,
} from "../src/custom-level";
import { DUNGEON_STRIKE, dungeonHazards } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";
import { buildSpookyDream, poseSpookyDream } from "../src/spooky-dream-view";

beforeAll(initPhysics);

const KINDS = [...SPOOKY_DREAM_PREFAB_KINDS];

function fixture(prefabs: CustomPrefab[], spawn = { x: 0, y: 2.1, z: -20, yaw: 0 }) {
  const level = blankLevel("Spooky Fixture");
  level.prefabs = prefabs;
  level.spawn = spawn;
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:spooky-fixture");
  return sim;
}

it("registers five spooky-dream decor prefabs as non-lethal dungeon scenery", () => {
  expect(KINDS).toHaveLength(5);
  for (const kind of KINDS) {
    for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS, SPOOKY_DREAM_PREFAB_KINDS])
      expect(list).toContain(kind);
    expect(isSpookyDream(kind)).toBe(true);
    expect(
      (DUNGEON_STRIKE as Record<string, unknown>)[kind],
      `${kind} must never strike`,
    ).toBeUndefined();
  }
  expect(isSpookyDream("cage")).toBe(false);
  expect(isSpookyDream("cupcake")).toBe(false);
});

it("validates spooky prefabs with yaw and places them from the palette", () => {
  const level = validateCustomLevel({
    ...blankLevel("Spooky Parking"),
    prefabs: KINDS.map((kind, i) => ({
      id: `spooky-${i}`,
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
  const placed = placeInLevel(blankLevel("Spooky Placement"), {
    type: "prefab",
    kind: "jack-o-lantern",
    x: 5,
    z: 5,
  });
  expect(placed.prefabs).toHaveLength(1);
  expect(placed.prefabs[0].kind).toBe("jack-o-lantern");
});

it("builds five detailed models with animated pivots where needed", () => {
  for (const kind of KINDS) {
    const raw = new T.Group();
    const pivots = buildSpookyDream(raw, kind);
    let parts = 0;
    raw.traverse((o) => {
      if (o instanceof T.Mesh) parts++;
    });
    expect(parts, `${kind} parts`).toBeGreaterThanOrEqual(8);
    const model = buildDungeonModel({ id: `test-${kind}`, kind, x: 0, z: 0, phase: 0 });
    const wantPivots =
      kind === "spooky-bunting" ? 12 : kind === "dead-tree" || kind === "iron-fence" ? 0 : 1;
    expect(model.pivots, `${kind} pivots`).toHaveLength(wantPivots);
    expect(model.triangles, `${kind} triangles`).toBeGreaterThan(800);
    let labels = 0;
    model.root.traverse((o) => {
      if (o instanceof T.Sprite) labels++;
    });
    expect(labels, `${kind} labels`).toBe(0);
    expect(pivots).toHaveLength(wantPivots);
  }
  const jack = new T.Group();
  const flames = buildSpookyDream(jack, "jack-o-lantern");
  const lamp = () =>
    (flames[0].children[0] as T.Mesh).material as T.MeshStandardMaterial;
  poseSpookyDream("jack-o-lantern", flames, 0);
  const lit = lamp().emissiveIntensity;
  poseSpookyDream("jack-o-lantern", flames, 0.4);
  expect(lamp().emissiveIntensity).not.toBeCloseTo(lit, 5);
  const bunt = new T.Group();
  const flags = buildSpookyDream(bunt, "spooky-bunting");
  poseSpookyDream("spooky-bunting", flags, 0);
  const rest = flags[0].rotation.y;
  poseSpookyDream("spooky-bunting", flags, 0.7);
  expect(flags[0].rotation.y).not.toBeCloseTo(rest, 5);
  poseSpookyDream("dead-tree", [], 3);
});

it("spawns solid colliders that never deal damage", () => {
  const sim = fixture(
    KINDS.map((kind, i) => ({ id: `spooky-${i}`, kind, x: i * 30, z: 60 })),
  );
  try {
    const mechanisms = sim.dungeon.mechanisms.filter((m) => isSpookyDream(m.h.kind));
    expect(mechanisms).toHaveLength(5);
    for (const m of mechanisms) {
      const want = m.h.kind === "iron-fence" || m.h.kind === "spooky-bunting" ? 2 : 1;
      expect(m.colliders.length, m.h.kind).toBe(want);
    }
    for (let i = 0; i < 120; i++) sim.step({ throttle: 0 });
    expect(
      sim.damageEvents.filter((e) => isSpookyDream(e.source)),
    ).toHaveLength(0);
    expect(sim.dungeon.mechanisms.every((m) => m.contacts === 0)).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("blocks the car at the dead tree but lets it pass under the bunting", () => {
  const wall = fixture([{ id: "oak", kind: "dead-tree", x: 0, z: 30 }]);
  try {
    for (let i = 0; i < 600; i++) wall.step({ throttle: 1 });
    expect(wall.body.translation().z).toBeLessThan(30);
    expect(wall.status).toBe("driving");
    expect(wall.damageEvents.filter((e) => e.source === "dead-tree")).toHaveLength(0);
  } finally {
    wall.dispose();
  }
  const gate = fixture([{ id: "gate", kind: "spooky-bunting", x: 0, z: 0 }]);
  try {
    for (let i = 0; i < 600; i++) gate.step({ throttle: 1 });
    expect(gate.body.translation().z).toBeGreaterThan(10);
    expect(gate.status).toBe("driving");
    expect(gate.damageEvents.filter((e) => e.source === "spooky-bunting")).toHaveLength(0);
  } finally {
    gate.dispose();
  }
});
