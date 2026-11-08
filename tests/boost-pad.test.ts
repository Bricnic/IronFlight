import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { buildBoostPadMesh } from "../src/course-view";
import {
  PREFAB_KINDS,
  validateCustomLevel,
  toTrack,
  registerCustomTrack,
  type CustomLevel,
} from "../src/custom-level";

beforeAll(initPhysics);

const minimal = (): CustomLevel => ({
  name: "Boost Lab",
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

const withPad = (): CustomLevel => {
  const level = minimal();
  level.prefabs.push({ id: "pad-1", kind: "boost-pad", x: 0, y: 0, z: 0 });
  return level;
};

it("registers boost-pad as a course prefab kind without rotation", () => {
  expect(PREFAB_KINDS).toContain("boost-pad");
  expect(() => validateCustomLevel(withPad())).not.toThrow();
  const yawed = withPad();
  yawed.prefabs[0].yaw = 0.5;
  expect(() => validateCustomLevel(yawed)).toThrow();
});

it("pushes a truck driving over the pad like the Triple Loop booster", () => {
  const track = toTrack(validateCustomLevel(withPad()));
  registerCustomTrack(track);
  const s = new Simulation();
  try {
    s.startTrack(track.id);
    s.body.setTranslation({ x: 0, y: 2, z: -20 }, true);
    for (let i = 0; i < 240; i++) s.step({ throttle: 1 });
    expect(s.boostTicks).toBeGreaterThan(0);
    const v = s.body.linvel();
    expect(Math.hypot(v.x, v.z)).toBeGreaterThan(25);
    expect(s.body.translation().z).toBeGreaterThan(6);
  } finally {
    s.dispose();
  }
});

it("ignores trucks beside, past, or above the pad", () => {
  const track = toTrack(validateCustomLevel(withPad()));
  registerCustomTrack(track);
  for (const [x, y, z] of [
    [30, 2, 0],
    [0, 2, 30],
    [0, 10, 0],
  ]) {
    const s = new Simulation();
    try {
      s.startTrack(track.id);
      s.body.setTranslation({ x, y, z }, true);
      for (let i = 0; i < 60; i++) s.step({ throttle: 1 });
      expect(s.boostTicks, `at ${x},${y},${z}`).toBe(0);
    } finally {
      s.dispose();
    }
  }
});

it("builds a glowing pad with chevrons headlessly", () => {
  const pad = buildBoostPadMesh();
  expect(pad.children).toHaveLength(5);
});
