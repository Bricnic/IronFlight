import { beforeAll, expect, it } from "vitest";
import * as T from "three";
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
import {
  FRAGILE_ICE_SHATTER_CHANCE,
  FRAGILE_ICE_SIZE,
  FRAGILE_ICE_SINK_SECONDS,
  fragileIceHazards,
} from "../src/fragile-ice";
import { FragileIceView } from "../src/fragile-ice-view";

beforeAll(initPhysics);

function fixture(prefabs: CustomPrefab[], spawn = { x: 0, y: 2.1, z: -20, yaw: 0 }) {
  const level = blankLevel("Fragile Ice Fixture");
  level.prefabs = prefabs;
  level.spawn = spawn;
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:fragile-ice-fixture");
  return sim;
}

/**
 * Level with a real 2x2 ice field over one 10x10 pit, like the shipped ice
 * fields. A lone 5x5 pit cannot swallow the truck (its wheelbase straddles
 * the rim), so shipped fields are always multi-tile with one shared hole.
 */
function pitFixture() {
  const level = blankLevel("Fragile Ice Pit");
  level.prefabs = [
    tile("ice-pit-00", 30, -2.5),
    tile("ice-pit-10", 35, -2.5),
    tile("ice-pit-01", 30, 2.5),
    tile("ice-pit-11", 35, 2.5),
  ];
  level.spawn = { x: 30, y: 2.1, z: 2.5, yaw: 0 };
  const ground = level.solids.find((s) => s.id === "ground")!;
  ground.id = "ground-west";
  ground.x = -36.25;
  ground.w = 127.5;
  const pit = (id: string, x: number, z: number, w: number, d: number) => ({
    id,
    kind: "ground" as const,
    x,
    y: -0.6,
    z,
    w,
    h: 1.2,
    d,
    color: 0x6d817c,
  });
  level.solids.push(
    pit("ground-east", 68.75, 0, 62.5, 200),
    pit("ground-south", 32.5, -52.5, 10, 95),
    pit("ground-north", 32.5, 52.5, 10, 95),
  );
  // Shared basin for the 10x10 hole, mirroring the shipped lake basins.
  const basin = (id: string, x: number, z: number, w: number, d: number, y: number, h: number) =>
    level.solids.push({ id, kind: "barrier", x, y, z, w, h, d, color: 0x16323e });
  basin("pit-floor", 32.5, 0, 10, 10, -4.62, 0.6);
  basin("pit-wall-n", 32.5, 4.9, 10, 0.1, -2.65, 3.3);
  basin("pit-wall-s", 32.5, -4.9, 10, 0.1, -2.65, 3.3);
  basin("pit-wall-e", 37.4, 0, 0.1, 9.6, -2.65, 3.3);
  basin("pit-wall-w", 27.6, 0, 0.1, 9.6, -2.65, 3.3);
  // The blank road crosses the pit; drop it so the ice spans open water.
  level.solids = level.solids.filter((s) => s.id !== "road-1");
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:fragile-ice-pit");
  return sim;
}

const tile = (id: string, x: number, z: number): CustomPrefab => ({ id, kind: "fragile-ice", x, z });
// The blank level's road spans x -12..12, so ice fixtures live at x = 30,
// on open ground, with the car parked at x = 32.5 for a two-wheel straddle.
const TILE_X = 30;
const STRADDLE_X = 32.5;

it("registers fragile-ice as a rotation-free 5x5 prefab kind", () => {
  expect(FRAGILE_ICE_PREFAB_KINDS).toContain("fragile-ice");
  expect(PREFAB_KINDS).toContain("fragile-ice");
  expect(FRAGILE_ICE_SIZE).toBe(5);
  expect(FRAGILE_ICE_SHATTER_CHANCE).toBe(0.1);
  const level = blankLevel("Fragile Ice Parking");
  level.prefabs = [tile("ice-1", 10, 10)];
  expect(() => validateCustomLevel(level)).not.toThrow();
  const yawed = blankLevel("Fragile Ice Yawed");
  yawed.prefabs = [{ ...tile("ice-1", 10, 10), yaw: 0.5 }];
  expect(() => validateCustomLevel(yawed)).toThrow();
  const sim = fixture([tile("ice-1", TILE_X, 0)]);
  try {
    expect(fragileIceHazards(sim.courseTrack)).toHaveLength(1);
    expect(sim.fragileIce.tiles).toHaveLength(1);
  } finally {
    sim.dispose();
  }
});

it("shatters under two wheels on a lucky roll and stays drivable otherwise", () => {
  const sim = fixture([tile("ice-1", TILE_X, 0)]);
  try {
    let rolls = 0;
    sim.fragileIce.rng = () => {
      rolls++;
      return 0.05;
    };
    // Car centered just off the tile: the left pair rides the ice, the right pair rides dirt.
    sim.body.setTranslation({ x: STRADDLE_X, y: 2.1, z: 0 }, true);
    sim.run(2);
    const state = sim.fragileIce.tiles[0];
    expect(rolls).toBe(1);
    expect(state.shattered).toBe(true);
    expect(state.sheet).toBeNull();
    const snap = sim.fragileIce.snapshot().find((t) => t.id === "ice-1")!;
    expect(snap.shattered).toBe(true);
  } finally {
    sim.dispose();
  }
  const solid = fixture([tile("ice-1", TILE_X, 0)]);
  try {
    solid.fragileIce.rng = () => 0.5;
    solid.body.setTranslation({ x: STRADDLE_X, y: 2.1, z: 0 }, true);
    solid.run(2);
    const state = solid.fragileIce.tiles[0];
    expect(state.wheels).toBeGreaterThanOrEqual(2);
    expect(state.shattered).toBe(false);
    expect(state.sheet).not.toBeNull();
    expect(solid.status).toBe("driving");
    // The surviving sheet still carries the truck at deck height.
    expect(solid.body.translation().y).toBeGreaterThan(0.5);
  } finally {
    solid.dispose();
  }
});

it("rolls exactly at the 10% boundary and never on a single wheel", () => {
  const lucky = fixture([tile("ice-1", TILE_X, 0)]);
  try {
    lucky.fragileIce.rng = () => 0.099;
    lucky.body.setTranslation({ x: STRADDLE_X, y: 2.1, z: 0 }, true);
    lucky.run(2);
    expect(lucky.fragileIce.tiles[0].shattered).toBe(true);
  } finally {
    lucky.dispose();
  }
  const edge = fixture([tile("ice-1", TILE_X, 0)]);
  try {
    edge.fragileIce.rng = () => 0.1;
    edge.body.setTranslation({ x: STRADDLE_X, y: 2.1, z: 0 }, true);
    edge.run(2);
    expect(edge.fragileIce.tiles[0].shattered).toBe(false);
  } finally {
    edge.dispose();
  }
  // One wheel on the ice: no roll happens at all, however lucky.
  const single = fixture([tile("ice-1", TILE_X, 0)]);
  try {
    let rolls = 0;
    single.fragileIce.rng = () => {
      rolls++;
      return 0.0;
    };
    single.body.setTranslation({ x: TILE_X + 4.0, y: 2.1, z: 1.0 }, true);
    single.run(2);
    expect(single.fragileIce.tiles[0].wheels).toBeLessThanOrEqual(1);
    expect(rolls).toBe(0);
    expect(single.fragileIce.tiles[0].shattered).toBe(false);
  } finally {
    single.dispose();
  }
});

it("rolls once per visit, again on re-entry", () => {
  const sim = fixture([tile("ice-1", TILE_X, 0)]);
  try {
    let rolls = 0;
    sim.fragileIce.rng = () => {
      rolls++;
      return 0.5;
    };
    sim.body.setTranslation({ x: STRADDLE_X, y: 2.1, z: 0 }, true);
    sim.run(2);
    expect(rolls).toBe(1);
    sim.run(2);
    expect(rolls).toBe(1);
    // Drive fully off, then back on: a second visit rolls again.
    sim.body.setTranslation({ x: 20, y: 2.1, z: 0 }, true);
    sim.run(1);
    sim.body.setTranslation({ x: STRADDLE_X, y: 2.1, z: 0 }, true);
    sim.run(2);
    expect(rolls).toBe(2);
    expect(sim.fragileIce.tiles[0].shattered).toBe(false);
  } finally {
    sim.dispose();
  }
});

it("drops the truck into freezing water that sinks it like the water prefab", () => {
  const sim = pitFixture();
  try {
    sim.fragileIce.rng = () => 0.01;
    // Shatter every sheet: the truck is longer than one tile, so a lone hole
    // only hangs it up, while the full 10x10 mouth swallows it whole. Leave
    // each tile the moment it breaks so pit damage never wrecks the truck.
    for (const [x, z] of [[30, -2.5], [35, -2.5], [30, 2.5], [35, 2.5]]) {
      // Touch down from just above rest height (1.9): a short fall keeps pit
      // exposure per visit small enough that setup never wrecks the truck.
      sim.body.setTranslation({ x, y: 2.05, z }, true);
      sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      const state = sim.fragileIce.tiles.find((t) => t.h.x === x && t.h.z === z)!;
      for (let k = 0; k < 180 && !state.shattered; k++) sim.step({});
    }
    expect(sim.fragileIce.tiles.every((t) => t.shattered)).toBe(true);
    sim.body.setTranslation({ x: 32.5, y: 2.1, z: 0 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    // The dunking current pulls at 1.8 m/s, so the 2.1 m fall needs 1.2 s.
    sim.run(1.5);
    expect(sim.body.translation().y).toBeLessThan(0);
    const sinking = sim.fragileIce.tiles.reduce((n, t) => n + t.sinking, 0);
    expect(sinking).toBeGreaterThan(0);
    sim.run(FRAGILE_ICE_SINK_SECONDS + 1);
    expect(sim.snapshot().status).toBe("wrecked");
    expect(sim.damageEvents.some((e) => e.source === "fragile-ice")).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("shatters about one tile in ten across a seeded field", () => {
  // 12-unit grid: visits never touch a neighboring tile.
  const tiles = Array.from({ length: 200 }, (_, i) => tile(`ice-${i}`, TILE_X + (i % 20) * 12, Math.floor(i / 20) * 12));
  const sim = fixture(tiles);
  try {
    // Exactly 20 lucky rolls in 200 visits: the threshold, not the RNG, is under test.
    const sequence = Array.from({ length: 200 }, (_, i) => (i % 10 === 0 ? 0.05 : 0.5));
    let at = 0;
    sim.fragileIce.rng = () => sequence[at++ % sequence.length];
    for (const t of tiles) {
      sim.body.setTranslation({ x: t.x + 2.5, y: 2.1, z: t.z }, true);
      sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      // Step until the visit rolls, then leave at once so pit damage never wrecks the truck.
      const state = sim.fragileIce.tiles.find((s) => s.h.id === t.id)!;
      for (let k = 0; k < 240 && !state.armed && !state.shattered; k++) sim.step({});
      expect(state.armed || state.shattered).toBe(true);
      // Park at spawn, clear of every tile, so the next visit re-arms.
      sim.body.setTranslation({ x: 0, y: 2.1, z: -20 }, true);
      sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      sim.run(0.3);
    }
    const shattered = sim.fragileIce.tiles.filter((t) => t.shattered);
    expect(at).toBe(200);
    expect(shattered).toHaveLength(20);
  } finally {
    sim.dispose();
  }
});

it("supports live add, move and remove", () => {
  const sim = fixture([]);
  try {
    expect(sim.fragileIce.tiles).toHaveLength(0);
    sim.fragileIce.addTile({ id: "ice-live", x: 30, z: 30 });
    expect(sim.fragileIce.tiles).toHaveLength(1);
    sim.fragileIce.moveTile("ice-live", 40, 0, 40);
    expect(sim.fragileIce.tiles[0].h.x).toBe(40);
    sim.fragileIce.removeTile("ice-live");
    expect(sim.fragileIce.tiles).toHaveLength(0);
  } finally {
    sim.dispose();
  }
});

it("builds instanced sheet-plus-basin models headlessly", () => {
  const sim = fixture([tile("ice-1", TILE_X, 0), tile("ice-2", TILE_X + 10, 0)]);
  try {
    const view = new FragileIceView();
    view.update(sim.fragileIce, 0);
    expect(view.tileCount).toBe(2);
    expect(view.sheets!.count).toBe(2);
    expect(view.waters!.count).toBe(2);
    expect(view.cracks!.count).toBe(6);
    expect(view.shards!.count).toBe(12);
    expect(view.tileIndex("ice-2")).toBe(1);
    const m = new T.Matrix4();
    const shown = (mesh: T.InstancedMesh, i: number) => {
      mesh.getMatrixAt(i, m);
      return m.determinant() !== 0;
    };
    expect(shown(view.sheets!, 0)).toBe(true);
    expect(shown(view.shards!, 0)).toBe(false);
    // Shatter the first tile through the real roll flow: its sheet instance
    // collapses and its shards pop while the neighbor stays whole.
    sim.fragileIce.rng = () => 0;
    sim.body.setTranslation({ x: STRADDLE_X, y: 2.1, z: 0 }, true);
    sim.run(1.5);
    expect(sim.fragileIce.tiles[0].shattered).toBe(true);
    expect(sim.fragileIce.tiles[1].shattered).toBe(false);
    view.update(sim.fragileIce, 1.5);
    expect(shown(view.sheets!, 0)).toBe(false);
    expect(shown(view.sheets!, 1)).toBe(true);
    expect(shown(view.shards!, 0)).toBe(true);
    expect(shown(view.shards!, 6)).toBe(false);
  } finally {
    sim.dispose();
  }
});
