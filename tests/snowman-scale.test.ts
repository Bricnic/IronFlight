import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  toTrack,
  registerCustomTrack,
  validateCustomLevel,
  type CustomLevel,
} from "../src/custom-level";

beforeAll(initPhysics);

const minimal = (): CustomLevel => ({
  name: "Snow Lab",
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
      color: 0xe8eef2,
    },
  ],
  medals: { gold: 60, silver: 90, bronze: 120 },
  limit: 240,
  prefabs: [{ id: "big-frosty", kind: "snowman", x: 0, y: 0, z: 10, scale: 3 }],
});

function lab() {
  const track = toTrack(validateCustomLevel(minimal()));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

it("allows scale on snowmen but still rejects it on other props", () => {
  expect(() => validateCustomLevel(minimal())).not.toThrow();
  const barrel = minimal();
  barrel.prefabs = [{ id: "b", kind: "barrel", x: 0, y: 0, z: 10, scale: 3 }];
  expect(() => validateCustomLevel(barrel)).toThrow();
  const sign = minimal();
  sign.prefabs = [{ id: "s", kind: "sign", x: 0, y: 0, z: 10, scale: 2 }];
  expect(() => validateCustomLevel(sign)).toThrow();
});

it("builds a 3x body with a 3x trigger shell", () => {
  const sim = lab();
  try {
    const prop = sim.props.props.find((p) => p.definition.id === "big-frosty")!;
    expect(prop.body.translation().y).toBeCloseTo(1.4 * 3, 1);
    // Lateral 3.0 sits inside a 3.9 shell but far outside the 1.3 base one.
    // The trigger needs closing speed, so drive past instead of parking.
    sim.body.setTranslation({ x: 3.0, y: 2.1, z: 0 }, true);
    sim.run(2, { throttle: 0.6 });
    expect(prop.broken).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("a 3x snowman breaks three parts and shoves three times as hard", () => {
  const sim = lab();
  try {
    sim.body.setTranslation({ x: 0, y: 2.1, z: 0 }, true);
    for (
      let i = 0;
      i < 240 && !sim.damageEvents.some((e) => e.source === "snowman");
      i++
    )
      sim.step({ throttle: 1 });
    for (let i = 0; i < 3; i++) sim.step({ throttle: 1 });
    const hits = sim.damageEvents.filter((e) => e.source === "snowman");
    expect(hits).toHaveLength(3);
    expect(Math.abs(sim.body.linvel().x)).toBeGreaterThan(4);
    expect(new Set(hits.map((h) => h.part)).size).toBe(3);
    expect(sim.status).toBe("driving");
    const blown = sim.props.props.find(
      (p) => p.definition.id === "big-frosty",
    )!;
    expect(blown.broken).toBe(true);
    expect(blown.pieces).toHaveLength(12);
  } finally {
    sim.dispose();
  }
});
