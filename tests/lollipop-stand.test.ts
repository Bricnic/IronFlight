import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  CANDY_PREFAB_KINDS,
  PREFAB_KINDS,
  PROP_PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { courseProps } from "../src/course";
import { dungeonHazards } from "../src/dungeon-hazards";
import { buildLollipopStandMesh, gravestoneStats } from "../src/prop-view";

beforeAll(initPhysics);

function fixture(prefabs: CustomPrefab[], name: string) {
  const level = blankLevel(name);
  level.prefabs = prefabs;
  level.spawn = { x: 0, y: 2.1, z: -20, yaw: 0 };
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

/** Arena strike: teleport the truck onto the prop at speed for one step. */
function strike(sim: Simulation, id: string, speed: number) {
  const p = sim.props.props.find((p) => p.definition.id === id)!;
  const pos = p.body.translation();
  sim.body.setTranslation(
    { x: pos.x - 1.65, y: 1.94, z: pos.z - 2.7 },
    true,
  );
  sim.body.setLinvel({ x: 0, y: 0, z: speed }, true);
  sim.step({ throttle: 0.001 });
  return p;
}

it("registers lollipop-stand as a smashable prop, not static decor", () => {
  expect(PREFAB_KINDS).toContain("lollipop-stand");
  expect(PROP_PREFAB_KINDS).toContain("lollipop-stand");
  expect(CANDY_PREFAB_KINDS).not.toContain("lollipop-stand");
  const level = validateCustomLevel({
    ...blankLevel("Lollipop Parking"),
    prefabs: [
      { id: "pop", kind: "lollipop-stand", x: 0, z: 0, y: 0, yaw: 0.5, angle: 0.1, roll: -0.1 },
    ],
  });
  expect(level.prefabs).toHaveLength(1);
  const track = toTrack(level);
  expect(courseProps(track).map((p) => p.kind)).toEqual(["lollipop-stand"]);
  expect(dungeonHazards(track).map((h) => h.kind)).not.toContain("lollipop-stand");
});

it("builds a detailed lollipop model headlessly", () => {
  const stats = gravestoneStats(buildLollipopStandMesh());
  expect(stats.meshes).toBeGreaterThanOrEqual(10);
  expect(stats.triangles).toBeGreaterThan(100);
  let sprites = 0;
  buildLollipopStandMesh().traverse((o) => {
    if (o instanceof T.Sprite) sprites++;
  });
  expect(sprites).toBe(0);
  const sim = fixture(
    [{ id: "pop", kind: "lollipop-stand", x: 0, z: 20 }],
    "Lollipop Model",
  );
  try {
    expect(sim.props.props).toHaveLength(1);
    expect(sim.props.props[0].colliders.length).toBeGreaterThanOrEqual(2);
    expect(sim.dungeon.mechanisms.filter((m) => (m.h.kind as string) === "lollipop-stand")).toHaveLength(0);
  } finally {
    sim.dispose();
  }
});

it("detaches from its base like a sign and scales with hit speed", () => {
  const speeds: number[] = [];
  for (const speed of [4, 28]) {
    const sim = fixture(
      [{ id: "pop", kind: "lollipop-stand", x: 0, z: 20 }],
      `Lollipop Break ${speed}`,
    );
    try {
      const before = sim.props.props[0];
      expect(before.joint).toBeDefined();
      expect(before.broken).toBe(false);
      const p = strike(sim, "pop", speed);
      expect(p.broken).toBe(true);
      expect(p.joint).toBeUndefined();
      expect(p.body.linvel().z).toBeGreaterThan(1);
      speeds.push(p.body.linvel().z);
      expect(sim.status).toBe("driving");
    } finally {
      sim.dispose();
    }
  }
  expect(speeds[1]).toBeGreaterThan(speeds[0] * 2);
});
