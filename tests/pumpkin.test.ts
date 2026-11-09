import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  PREFAB_KINDS,
  PROP_PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";

beforeAll(initPhysics);

function fixture(prefabs: CustomPrefab[]) {
  const level = blankLevel("Pumpkin Fixture");
  level.prefabs = prefabs;
  level.spawn = { x: 0, y: 2.1, z: -40, yaw: 0 };
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  sim.startTrack("custom:pumpkin-fixture");
  return sim;
}

it("registers the pumpkin as a smashable prop", () => {
  for (const list of [PREFAB_KINDS, PROP_PREFAB_KINDS])
    expect(list).toContain("pumpkin");
});

it("rolls the pumpkin when the truck rams it", () => {
  const sim = fixture([{ id: "punk", kind: "pumpkin", x: 0, z: 0 }]);
  try {
    expect(sim.props.props).toHaveLength(1);
    sim.body.setTranslation({ x: 0, y: 2.1, z: -12 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 20 }, true);
    sim.run(1);
    const moved = sim.props.props[0].body.translation();
    expect(Math.hypot(moved.x - 0, moved.z - 0)).toBeGreaterThan(2);
  } finally {
    sim.dispose();
  }
});
