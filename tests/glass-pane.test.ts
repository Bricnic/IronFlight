import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  LOOSE_BLOCK_PREFAB_KINDS,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import {
  GLASS_PANE_DAMAGE,
  GLASS_PANE_SIZE,
  GLASS_SHARD_COUNT,
  GLASS_SHARD_SIZE,
} from "../src/loose-blocks";
import { buildLooseBlockModel, LooseBlocksView } from "../src/loose-blocks-view";

beforeAll(initPhysics);

function fixture(prefabs: CustomPrefab[]) {
  const level = blankLevel("Glass Pane Fixture");
  level.prefabs = prefabs;
  level.spawn = { x: 0, y: 2.1, z: -40, yaw: 0 };
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:glass-pane-fixture");
  return sim;
}

it("registers the glass pane with half the loose-block damage", () => {
  for (const list of [PREFAB_KINDS, LOOSE_BLOCK_PREFAB_KINDS])
    expect(list).toContain("glass-pane");
  expect(GLASS_PANE_DAMAGE).toBe(0.05);
  expect(GLASS_PANE_SIZE).toEqual({ w: 4, h: 0.5, d: 4 });
});

it("crumples the tower when the truck rams its base", () => {
  const panes: CustomPrefab[] = [];
  for (let i = 0; i < 6; i++)
    panes.push({ id: `pane-${i}`, kind: "glass-pane", x: 0, y: i * 0.55, z: 0 });
  const sim = fixture(panes);
  try {
    expect(sim.looseBlocks.blocks).toHaveLength(6);
    const topState = sim.looseBlocks.blocks[5];
    const startY = topState.body.translation().y;
    sim.body.setTranslation({ x: 0, y: 2.1, z: -20 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 30 }, true);
    sim.run(3);
    const gone = !sim.looseBlocks.blocks.includes(topState);
    const dropped = gone
      ? Infinity
      : startY - topState.body.translation().y;
    expect(dropped).toBeGreaterThan(1);
  } finally {
    sim.dispose();
  }
});

it("chips 5% when a falling pane lands on the truck", () => {
  const sim = fixture([
    { id: "shard", kind: "glass-pane", x: 0, y: 10, z: -40 },
  ]);
  try {
    const def = sim.partDefs.find((p) => p.id === "roof")!;
    sim.body.setTranslation({ x: 0, y: 2.1, z: -40 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    for (let i = 0; i < 360; i++) {
      sim.step({});
      if (sim.damageEvents.some((event) => event.source === "glass-pane"))
        break;
    }
    expect(
      sim.damageEvents.some((event) => event.source === "glass-pane"),
    ).toBe(true);
    const health = sim.parts.get("roof")!.health;
    expect(def.hp - health).toBeCloseTo(def.hp * GLASS_PANE_DAMAGE, 5);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("builds a semi-transparent colored pane model", () => {
  const model = buildLooseBlockModel({
    id: "pane-glass",
    kind: "glass-pane",
    x: 0,
    z: 0,
  });
  const mesh = model.root.children[0] as T.Mesh;
  const geo = mesh.geometry as T.BoxGeometry;
  expect(geo.parameters.width).toBe(GLASS_PANE_SIZE.w);
  expect(geo.parameters.height).toBe(GLASS_PANE_SIZE.h);
  const mat = mesh.material as T.MeshStandardMaterial;
  expect(mat.transparent).toBe(true);
  expect(mat.opacity).toBeLessThan(1);
  expect(model.triangles).toBeGreaterThan(0);
});

it("shatters into shards on a hard floor landing", () => {
  expect(GLASS_SHARD_COUNT).toBeGreaterThanOrEqual(3);
  const sim = fixture([
    { id: "drop", kind: "glass-pane", x: 0, y: 8, z: 0 },
  ]);
  try {
    for (let i = 0; i < 600 && sim.looseBlocks.blocks.length === 1; i++)
      sim.step({});
    const shards = sim.looseBlocks.blocks.filter(
      (b) => b.h.kind === "glass-shard",
    );
    expect(sim.looseBlocks.blocks.some((b) => b.h.id === "drop")).toBe(false);
    expect(shards).toHaveLength(GLASS_SHARD_COUNT);
    sim.run(2);
    for (const shard of sim.looseBlocks.blocks)
      expect(shard.body.translation().y).toBeLessThan(1.5);
    expect(
      sim.looseBlocks.blocks.filter((b) => b.h.kind === "glass-shard"),
    ).toHaveLength(GLASS_SHARD_COUNT);
  } finally {
    sim.dispose();
  }
});

it("leaves shards harmless and whole", () => {
  const sim = fixture([]);
  try {
    sim.looseBlocks.addBlock({ id: "splinter", kind: "glass-shard", x: 0, y: 6, z: -40 });
    sim.body.setTranslation({ x: 0, y: 2.1, z: -40 }, true);
    sim.run(2);
    expect(
      sim.damageEvents.some((event) => event.source === "glass-shard"),
    ).toBe(false);
    expect(
      sim.looseBlocks.blocks.some((b) => b.h.id === "splinter"),
    ).toBe(true);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("builds a small transparent shard model", () => {
  const model = buildLooseBlockModel({
    id: "pane-0-shard-1",
    kind: "glass-shard",
    x: 0,
    z: 0,
  });
  const mesh = model.root.children[0] as T.Mesh;
  const geo = mesh.geometry as T.BoxGeometry;
  expect(geo.parameters.width).toBe(GLASS_SHARD_SIZE.w);
  expect(geo.parameters.height).toBe(GLASS_SHARD_SIZE.h);
  const mat = mesh.material as T.MeshStandardMaterial;
  expect(mat.transparent).toBe(true);
  expect(model.triangles).toBeGreaterThan(0);
});

it("swaps the pane model for shard models when it shatters", () => {
  const sim = fixture([
    { id: "drop", kind: "glass-pane", x: 0, y: 8, z: 0 },
  ]);
  try {
    const view = new LooseBlocksView();
    view.update(sim.looseBlocks);
    expect(view.children).toHaveLength(1);
    for (let i = 0; i < 600 && sim.looseBlocks.blocks.length === 1; i++) {
      sim.step({});
      view.update(sim.looseBlocks);
    }
    view.update(sim.looseBlocks);
    expect(view.children).toHaveLength(GLASS_SHARD_COUNT);
  } finally {
    sim.dispose();
  }
});
