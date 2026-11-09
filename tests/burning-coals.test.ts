import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import { buildBurningCoalModel } from "../src/burning-coals-view";
import {
  BURNING_COAL_BURN,
  BURNING_COAL_SIZE,
  burningCoalHazards,
} from "../src/burning-coals";
import {
  BURNING_COALS_PREFAB_KINDS,
  PREFAB_KINDS,
  validateCustomLevel,
  toTrack,
  registerCustomTrack,
  type CustomLevel,
} from "../src/custom-level";

beforeAll(initPhysics);

const minimal = (): CustomLevel => ({
  name: "Coal Lab",
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
      color: 0x3a3f44,
    },
  ],
  medals: { gold: 60, silver: 90, bronze: 120 },
  limit: 240,
  prefabs: [],
});

const withCoals = (): CustomLevel => {
  const level = minimal();
  level.prefabs.push(
    { id: "coal-1", kind: "burning-coals", x: 0, y: 0, z: 4 },
    { id: "block-1", kind: "loose-blocks", x: -3, y: 0, z: 4 },
    { id: "coal-2", kind: "burning-coals", x: -3, y: 1.5, z: 4 },
  );
  return level;
};

function lab() {
  const track = toTrack(validateCustomLevel(withCoals()));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

it("registers burning-coals as a rotation-free prefab kind", () => {
  expect(BURNING_COALS_PREFAB_KINDS).toContain("burning-coals");
  expect(PREFAB_KINDS).toContain("burning-coals");
  expect(() => validateCustomLevel(withCoals())).not.toThrow();
  const yawed = withCoals();
  yawed.prefabs[0].yaw = 0.5;
  expect(() => validateCustomLevel(yawed)).toThrow();
  expect(burningCoalHazards(lab().courseTrack)).toHaveLength(2);
});

it("burns parts on contact while the truck keeps driving", () => {
  const sim = lab();
  try {
    sim.body.setTranslation({ x: 0, y: 2.1, z: 4 }, true);
    sim.burningCoals.moveCoal("coal-1", 0, 5, 4);
    sim.run(2.5, { brake: 1 });
    const hit = sim.damageEvents.find((e) => e.source === "burning-coals");
    expect(hit).toBeDefined();
    const def = sim.partDefs.find((p) => p.id === hit!.part)!;
    const before = def.hp;
    expect(sim.parts.get(hit!.part)!.health).toBeLessThan(before);
    expect(BURNING_COAL_BURN).toBe(25);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("coals perched on blocks tumble when the stack is smashed", () => {
  const sim = lab();
  try {
    const coal = sim.burningCoals.coals.find((c) => c.h.id === "coal-2")!;
    const startY = coal.body.translation().y;
    sim.body.setTranslation({ x: -3, y: 2.1, z: -8 }, true);
    for (let i = 0; i < 240; i++) sim.step({ throttle: 1 });
    const end = coal.body.translation();
    expect(
      Math.hypot(end.x + 3, end.z - 4) > 1.5 || end.y < startY - 0.5,
    ).toBe(true);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("builds a glowing coal lump model headlessly", () => {
  const model = buildBurningCoalModel({ id: "coal-9", x: 0, z: 0 });
  expect(model.triangles).toBeGreaterThan(0);
  let coals = 0;
  model.root.traverse((o) => {
    if (!(o instanceof T.Mesh) || !(o.geometry instanceof T.BoxGeometry))
      return;
    const mat = o.material as T.MeshStandardMaterial;
    const size = o.geometry.parameters.width;
    if (Math.abs(size - BURNING_COAL_SIZE) < 1e-6 && mat.emissiveIntensity > 0)
      coals++;
  });
  expect(coals).toBe(1);
});
