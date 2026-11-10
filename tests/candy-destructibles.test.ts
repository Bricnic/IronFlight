import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  PREFAB_KINDS,
  PROP_PREFAB_KINDS,
  placeInLevel,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { courseProps } from "../src/course";
import {
  buildCandyAppleMesh,
  buildChocolateCrateMesh,
  buildCottonCandyCartMesh,
  buildGumdropBoulderMesh,
  buildPeppermintBarrelMesh,
  gravestoneStats,
} from "../src/prop-view";

beforeAll(initPhysics);

const KINDS = [
  "candy-apple",
  "gumdrop-boulder",
  "peppermint-barrel",
  "chocolate-crate",
  "cotton-candy-cart",
] as const;
const BUILDERS: Record<string, () => T.Group> = {
  "candy-apple": buildCandyAppleMesh,
  "gumdrop-boulder": buildGumdropBoulderMesh,
  "peppermint-barrel": buildPeppermintBarrelMesh,
  "chocolate-crate": buildChocolateCrateMesh,
  "cotton-candy-cart": buildCottonCandyCartMesh,
};

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

it("registers five candy-land destructibles as smashable props", () => {
  expect(KINDS).toHaveLength(5);
  for (const kind of KINDS)
    for (const list of [PREFAB_KINDS, PROP_PREFAB_KINDS])
      expect(list).toContain(kind);
  const level = validateCustomLevel({
    ...blankLevel("Candy Destructible Parking"),
    prefabs: KINDS.map((kind, i) => ({
      id: `candy-${i}`,
      kind,
      x: i * 10,
      z: 0,
      y: 0,
      yaw: 0.5,
      angle: 0.1,
      roll: -0.1,
    })),
  });
  expect(level.prefabs).toHaveLength(5);
  expect(courseProps(toTrack(level)).map((p) => p.kind).sort()).toEqual(
    [...KINDS].sort(),
  );
  const placed = placeInLevel(blankLevel("Candy Destructible Placement"), {
    type: "prefab",
    kind: "chocolate-crate",
    x: 5,
    z: 5,
  });
  expect(placed.prefabs).toHaveLength(1);
  expect(placed.prefabs[0].kind).toBe("chocolate-crate");
});

it("builds five detailed models headlessly", () => {
  for (const kind of KINDS) {
    const stats = gravestoneStats(BUILDERS[kind]());
    expect(stats.meshes, `${kind} meshes`).toBeGreaterThanOrEqual(10);
    expect(stats.triangles, `${kind} triangles`).toBeGreaterThan(100);
    let sprites = 0;
    BUILDERS[kind]().traverse((o) => {
      if (o instanceof T.Sprite) sprites++;
    });
    expect(sprites, `${kind} sprites`).toBe(0);
  }
  const sim = fixture(
    KINDS.map((kind, i) => ({ id: `candy-${i}`, kind, x: i * 10, z: 20 })),
    "Candy Destructible Models",
  );
  try {
    expect(sim.props.props).toHaveLength(5);
    for (const p of sim.props.props)
      expect(p.colliders.length, p.definition.kind).toBe(1);
    let meshes = 0;
    for (const kind of KINDS)
      BUILDERS[kind]().traverse((o) => {
        if (o instanceof T.Mesh) meshes++;
      });
    expect(meshes).toBeGreaterThanOrEqual(50);
  } finally {
    sim.dispose();
  }
});

it("rolls the candy-apple and gumdrop-boulder when rammed", () => {
  for (const kind of ["candy-apple", "gumdrop-boulder"] as const) {
    const sim = fixture(
      [{ id: "roller", kind, x: 0, z: 0 }],
      `Candy Roller ${kind}`,
    );
    try {
      expect(sim.props.props).toHaveLength(1);
      sim.body.setTranslation({ x: 0, y: 2.1, z: -12 }, true);
      sim.body.setLinvel({ x: 0, y: 0, z: 20 }, true);
      sim.run(1);
      const moved = sim.props.props[0].body.translation();
      expect(
        Math.hypot(moved.x - 0, moved.z - 0),
        kind,
      ).toBeGreaterThan(2);
      expect(sim.props.props[0].broken).toBe(false);
    } finally {
      sim.dispose();
    }
  }
});

it("breaks the chocolate-crate into rubble and reports it once", () => {
  const sim = fixture(
    [{ id: "crate", kind: "chocolate-crate", x: 0, z: 20 }],
    "Candy Crate Break",
  );
  try {
    const p = strike(sim, "crate", 10);
    expect(p.broken).toBe(true);
    expect(p.pieces).toHaveLength(4);
    expect(p.pieces.every((piece) => piece.body.isDynamic())).toBe(true);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
  const report = fixture(
    [{ id: "crate-2", kind: "chocolate-crate", x: 0, z: 20 }],
    "Candy Crate Report",
  );
  try {
    report.body.setTranslation({ x: 0, y: 2.1, z: 20 - 1.5 }, true);
    report.props.update(
      report.body,
      report.parts,
      report.wheelPositions(),
      new T.Vector3(0, 0, 15),
      report.time,
    );
    expect(report.props.takeDestroyed()).toEqual(["crate-2"]);
    expect(report.props.takeDestroyed()).toEqual([]);
  } finally {
    report.dispose();
  }
});

it("spills candy litter from the cotton-candy-cart on impact", () => {
  const sim = fixture(
    [{ id: "cart", kind: "cotton-candy-cart", x: 0, z: 20 }],
    "Candy Cart Spill",
  );
  try {
    const p = strike(sim, "cart", 6);
    expect(p.spilled).toBe(true);
    expect(p.pieces).toHaveLength(13);
    expect(p.pieces.every((piece) => piece.body.isDynamic())).toBe(true);
    sim.run(0.3);
    expect(
      p.pieces.some(
        (piece) => Math.abs(piece.body.translation().x - p.definition.x) > 0.5,
      ),
    ).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("ignites the peppermint-barrel at 90 or above like the barrel", () => {
  for (const [speed, burning, label] of [
    [4, false, "slow"],
    [24.9, false, "under"],
    [25, true, "over"],
  ] as const) {
    const sim = fixture(
      [{ id: "mint", kind: "peppermint-barrel", x: 0, z: 20 }],
      `Candy Mint Burn ${label}`,
    );
    try {
      const p = strike(sim, "mint", speed);
      expect(p.burningUntil > sim.time, `speed ${speed}`).toBe(burning);
      expect(p.body.angvel().x).not.toBe(0);
    } finally {
      sim.dispose();
    }
  }
});
