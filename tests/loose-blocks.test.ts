import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import { buildLooseBlockModel } from "../src/loose-blocks-view";
import {
  LOOSE_BLOCK_DAMAGE,
  LOOSE_BLOCK_MASS,
  LOOSE_BLOCK_SIZE,
  looseBlockHazards,
} from "../src/loose-blocks";
import {
  LOOSE_BLOCK_PREFAB_KINDS,
  PREFAB_KINDS,
  validateCustomLevel,
  toTrack,
  registerCustomTrack,
  type CustomLevel,
} from "../src/custom-level";

beforeAll(initPhysics);

beforeEach(() => {
  const ctx = {
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
  };
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ctx,
    }),
    createElementNS: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      src: "",
    }),
  });
});

const minimal = (): CustomLevel => ({
  name: "Block Lab",
  mode: "race",
  spawn: { x: 0, y: 2.1, z: -100, yaw: 0 },
  checkpoints: [
    { x: 0, z: 0 },
    { x: 0, z: 100 },
  ],
  solids: [
    {
      id: "ground",
      kind: "ground",
      x: 0,
      y: -0.6,
      z: 0,
      w: 200,
      h: 1.2,
      d: 400,
      color: 0x6d817c,
    },
  ],
  medals: { gold: 60, silver: 90, bronze: 120 },
  limit: 240,
  prefabs: [],
});

const withBlocks = (): CustomLevel => {
  const level = minimal();
  level.prefabs.push(
    { id: "block-1", kind: "loose-blocks", x: 0, y: 0, z: 4 },
    { id: "block-2", kind: "loose-blocks", x: 0, y: LOOSE_BLOCK_SIZE, z: 4 },
  );
  return level;
};

function lab() {
  const track = toTrack(validateCustomLevel(withBlocks()));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

it("registers loose-blocks as a rotation-free prefab kind", () => {
  expect(LOOSE_BLOCK_PREFAB_KINDS).toContain("loose-blocks");
  expect(PREFAB_KINDS).toContain("loose-blocks");
  expect(() => validateCustomLevel(withBlocks())).not.toThrow();
  const yawed = withBlocks();
  yawed.prefabs[0].yaw = 0.5;
  expect(() => validateCustomLevel(yawed)).toThrow();
});

it("stacks foam-light cubes that settle without damage", () => {
  const sim = lab();
  try {
    expect(sim.looseBlocks.blocks).toHaveLength(2);
    expect(sim.looseBlocks.blocks[0].body.mass()).toBeCloseTo(
      LOOSE_BLOCK_MASS,
    );
    sim.body.setTranslation({ x: 0, y: 2.1, z: -40 }, true);
    sim.run(2, { brake: 1 });
    expect(sim.damageEvents).toEqual([]);
    const [low, high] = sim.looseBlocks.blocks.map((b) =>
      b.body.translation(),
    );
    expect(low.y).toBeCloseTo(LOOSE_BLOCK_SIZE / 2, 0);
    expect(high.y).toBeCloseTo(LOOSE_BLOCK_SIZE * 1.5, 0);
    expect(sim.looseBlocks.snapshot()).toHaveLength(2);
  } finally {
    sim.dispose();
  }
});

it("knocks blocks aside harmlessly when driven into", () => {
  const sim = lab();
  try {
    sim.body.setTranslation({ x: 0, y: 2.1, z: -8 }, true);
    const before = { ...sim.looseBlocks.blocks[1].body.translation() };
    for (let i = 0; i < 240; i++) sim.step({ throttle: 1 });
    const after = sim.looseBlocks.blocks[1].body.translation();
    const moved = Math.hypot(after.x - before.x, after.z - before.z);
    expect(moved).toBeGreaterThan(1.5);
    expect(sim.status).toBe("driving");
    expect(sim.damageEvents).toEqual([]);
    expect(looseBlockHazards(sim.courseTrack)).toHaveLength(2);
  } finally {
    sim.dispose();
  }
});

it("deals minor damage when a block falls onto the truck", () => {
  const sim = lab();
  try {
    sim.body.setTranslation({ x: 0, y: 2.1, z: 0 }, true);
    sim.looseBlocks.moveBlock("block-2", 10, 0, 10);
    sim.looseBlocks.moveBlock("block-1", 0, 6, 0);
    sim.run(1.5, { brake: 1 });
    const hit = sim.damageEvents.find((e) => e.source === "loose-blocks");
    expect(hit).toBeDefined();
    const def = sim.partDefs.find((p) => p.id === hit!.part)!;
    expect(sim.parts.get(hit!.part)!.health).toBeCloseTo(
      def.hp * (1 - LOOSE_BLOCK_DAMAGE),
      1,
    );
    expect(LOOSE_BLOCK_DAMAGE).toBe(0.1);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("builds a letter-faced cube model headlessly", () => {
  const model = buildLooseBlockModel({ id: "block-7", kind: "loose-blocks", x: 0, z: 0 });
  expect(model.triangles).toBeGreaterThan(0);
  let boxes = 0;
  let letters = 0;
  model.root.traverse((o) => {
    if (o instanceof T.Mesh && o.geometry instanceof T.BoxGeometry) {
      boxes++;
      const mat = o.material as T.MeshStandardMaterial;
      if (mat.map instanceof T.CanvasTexture) letters++;
    }
  });
  expect(boxes).toBe(1);
  expect(letters).toBe(1);
});
