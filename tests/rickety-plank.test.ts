import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  FRAGILE_ICE_PREFAB_KINDS,
  PREFAB_KINDS,
  blankLevel,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { fragileIceHazards } from "../src/fragile-ice";
import { FragileIceView } from "../src/fragile-ice-view";

beforeAll(initPhysics);

const plank = (id: string, x: number, z: number, y = 0): CustomPrefab => ({ id, kind: "rickety-plank", x, z, y });

function fixture(prefabs: CustomPrefab[]) {
  const level = blankLevel("Rickety Fixture");
  level.prefabs = prefabs;
  level.spawn = { x: 0, y: 2.1, z: -20, yaw: 0 };
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:rickety-fixture");
  return sim;
}

it("registers rickety-plank as a fragile kind", () => {
  expect(FRAGILE_ICE_PREFAB_KINDS).toContain("rickety-plank");
  expect(PREFAB_KINDS).toContain("rickety-plank");
  const level = blankLevel("Rickety Parking");
  level.prefabs = [plank("plank-1", 30, 0)];
  expect(() => validateCustomLevel(level)).not.toThrow();
  const sim = fixture([plank("plank-1", 30, 0)]);
  try {
    expect(fragileIceHazards(sim.courseTrack)).toHaveLength(1);
    expect(sim.fragileIce.tiles).toHaveLength(1);
    expect(sim.fragileIce.snapshot()[0].kind).toBe("rickety-plank");
  } finally {
    sim.dispose();
  }
});

it("collapses 0.6s after first touch, with no ice-water sinking", () => {
  const sim = fixture([plank("plank-1", 30, 0)]);
  try {
    sim.body.setTranslation({ x: 30, y: 2.1, z: 0 }, true);
    sim.run(0.3);
    expect(sim.fragileIce.tiles[0].shattered).toBe(false);
    sim.run(0.6);
    const tile = sim.fragileIce.tiles[0];
    expect(tile.shattered).toBe(true);
    expect(tile.sheet).toBeNull();
    expect(sim.damageEvents.some((e) => e.source === "rickety-plank")).toBe(true);
    expect(sim.fragileIce.sinking).toBe(0);
  } finally {
    sim.dispose();
  }
});

it("collapses behind a truck crossing at speed", () => {
  const sim = fixture([plank("plank-1", 30, 0), plank("plank-2", 30, 5), plank("plank-3", 30, 10)]);
  try {
    // Hop across faster than the groan delay, like a truck at speed.
    for (const z of [0, 5, 10]) {
      sim.body.setTranslation({ x: 30, y: 2.1, z }, true);
      sim.run(0.3);
    }
    sim.body.setTranslation({ x: 30, y: 2.1, z: 16 }, true);
    sim.run(1);
    expect(sim.fragileIce.tiles.every((t) => t.shattered)).toBe(true);
    expect(sim.snapshot().status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("renders mixed ice and plank fields", () => {
  const level = blankLevel("Rickety View");
  level.prefabs = [
    { id: "ice-1", kind: "fragile-ice", x: 30, z: 0 },
    plank("plank-1", 35, 0),
  ];
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:rickety-view");
  try {
    const view = new FragileIceView();
    view.update(sim.fragileIce, 0);
    expect(view.tileCount).toBe(2);
    expect(view.sheets).toBeDefined();
    expect(view.plankSheets).toBeDefined();
  } finally {
    sim.dispose();
  }
});
