import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  isStuntDream,
  placeInLevel,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  STUNT_DREAM_PREFAB_KINDS,
  type CustomPrefab,
} from "../src/custom-level";
import { DUNGEON_STRIKE, dungeonHazards } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";
import { buildStuntDream, poseStuntDream } from "../src/stunt-dream-view";

beforeAll(initPhysics);

const KINDS = [...STUNT_DREAM_PREFAB_KINDS];

function fixture(prefabs: CustomPrefab[], spawn = { x: 0, y: 2.1, z: -20, yaw: 0 }) {
  const level = blankLevel("Stunt Fixture");
  level.prefabs = prefabs;
  level.spawn = spawn;
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:stunt-fixture");
  return sim;
}

it("registers five stunt-dream decor prefabs as non-lethal dungeon scenery", () => {
  expect(KINDS).toHaveLength(5);
  for (const kind of KINDS) {
    for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS, STUNT_DREAM_PREFAB_KINDS])
      expect(list).toContain(kind);
    expect(isStuntDream(kind)).toBe(true);
    expect(
      (DUNGEON_STRIKE as Record<string, unknown>)[kind],
      `${kind} must never strike`,
    ).toBeUndefined();
  }
  expect(isStuntDream("cage")).toBe(false);
  expect(isStuntDream("cupcake")).toBe(false);
});

it("validates stunt prefabs with yaw and places them from the palette", () => {
  const level = validateCustomLevel({
    ...blankLevel("Stunt Parking"),
    prefabs: KINDS.map((kind, i) => ({
      id: `stunt-${i}`,
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
  const placed = placeInLevel(blankLevel("Stunt Placement"), {
    type: "prefab",
    kind: "ticket-booth",
    x: 5,
    z: 5,
  });
  expect(placed.prefabs).toHaveLength(1);
  expect(placed.prefabs[0].kind).toBe("ticket-booth");
});

it("builds five detailed models with animated pivots where needed", () => {
  for (const kind of KINDS) {
    const raw = new T.Group();
    const pivots = buildStuntDream(raw, kind);
    let parts = 0;
    raw.traverse((o) => {
      if (o instanceof T.Mesh) parts++;
    });
    expect(parts, `${kind} parts`).toBeGreaterThanOrEqual(8);
    const model = buildDungeonModel({ id: `test-${kind}`, kind, x: 0, z: 0, phase: 0 });
    const wantPivots =
      kind === "marquee-star" ? 2 : kind === "drop-tower" || kind === "ticket-booth" ? 0 : 1;
    expect(model.pivots, `${kind} pivots`).toHaveLength(wantPivots);
    expect(model.triangles, `${kind} triangles`).toBeGreaterThan(800);
    let labels = 0;
    model.root.traverse((o) => {
      if (o instanceof T.Sprite) labels++;
    });
    expect(labels, `${kind} labels`).toBe(0);
    expect(pivots).toHaveLength(wantPivots);
  }
  const midway = new T.Group();
  const wheel = buildStuntDream(midway, "ferris-wheel");
  poseStuntDream("ferris-wheel", wheel, 0);
  const rest = wheel[0].rotation.z;
  const hangers = wheel[0].userData.hangers as T.Group[];
  const option = hangers[0].position.x;
  poseStuntDream("ferris-wheel", wheel, 0.4);
  expect(wheel[0].rotation.z).not.toBeCloseTo(rest, 5);
  expect(hangers[0].position.x).not.toBeCloseTo(option, 5);
  expect(hangers[0].rotation.z).toBeCloseTo(0, 5);
  const thrill = new T.Group();
  const flames = buildStuntDream(thrill, "ring-of-fire");
  const lamp = () =>
    (flames[0].children[0] as T.Mesh).material as T.MeshStandardMaterial;
  poseStuntDream("ring-of-fire", flames, 0);
  const lit = lamp().emissiveIntensity;
  poseStuntDream("ring-of-fire", flames, 0.4);
  expect(lamp().emissiveIntensity).not.toBeCloseTo(lit, 5);
  const gate = new T.Group();
  const bulbs = buildStuntDream(gate, "marquee-star");
  const glow = (g: T.Group) =>
    (g.children[0] as T.Mesh).material as T.MeshStandardMaterial;
  poseStuntDream("marquee-star", bulbs, 0);
  const dim = glow(bulbs[1]).emissiveIntensity;
  poseStuntDream("marquee-star", bulbs, 0.5);
  expect(glow(bulbs[1]).emissiveIntensity).not.toBeCloseTo(dim, 5);
  poseStuntDream("drop-tower", [], 3);
});

it("spawns solid colliders that never deal damage", () => {
  const sim = fixture(
    KINDS.map((kind, i) => ({ id: `stunt-${i}`, kind, x: i * 30, z: 60 })),
  );
  try {
    const mechanisms = sim.dungeon.mechanisms.filter((m) => isStuntDream(m.h.kind));
    expect(mechanisms).toHaveLength(5);
    for (const m of mechanisms) {
      const want = m.h.kind === "ring-of-fire" || m.h.kind === "marquee-star" ? 2 : 1;
      expect(m.colliders.length, m.h.kind).toBe(want);
    }
    for (let i = 0; i < 120; i++) sim.step({ throttle: 0 });
    expect(
      sim.damageEvents.filter((e) => isStuntDream(e.source)),
    ).toHaveLength(0);
    expect(sim.dungeon.mechanisms.every((m) => m.contacts === 0)).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("blocks the car at the tower but lets it pass through the ring", () => {
  const wall = fixture([{ id: "drop", kind: "drop-tower", x: 0, z: 30 }]);
  try {
    for (let i = 0; i < 600; i++) wall.step({ throttle: 1 });
    expect(wall.body.translation().z).toBeLessThan(30);
    expect(wall.status).toBe("driving");
    expect(wall.damageEvents.filter((e) => e.source === "drop-tower")).toHaveLength(0);
  } finally {
    wall.dispose();
  }
  const gate = fixture([{ id: "gate", kind: "ring-of-fire", x: 0, z: 0 }]);
  try {
    for (let i = 0; i < 600; i++) gate.step({ throttle: 1 });
    expect(gate.body.translation().z).toBeGreaterThan(10);
    expect(gate.status).toBe("driving");
    expect(gate.damageEvents.filter((e) => e.source === "ring-of-fire")).toHaveLength(0);
  } finally {
    gate.dispose();
  }
});
