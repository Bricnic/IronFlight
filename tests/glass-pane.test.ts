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
} from "../src/loose-blocks";
import { buildLooseBlockModel } from "../src/loose-blocks-view";

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
    const top = sim.looseBlocks.blocks[5].body;
    const startY = top.translation().y;
    sim.body.setTranslation({ x: 0, y: 2.1, z: -20 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 30 }, true);
    sim.run(3);
    expect(startY - top.translation().y).toBeGreaterThan(1);
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
