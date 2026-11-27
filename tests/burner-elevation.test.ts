import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  registerCustomTrack,
  toTrack,
  type CustomLevel,
} from "../src/custom-level";
import { BURNER_RAMP, BURNER_DRUM } from "../src/comic-hazards";
import R from "@dimforge/rapier3d-compat";

beforeAll(initPhysics);

function level(height: number, yaw = 0, resizeScale = 1): CustomLevel {
  return {
    name: "Elevated burner regression",
    mode: "race",
    spawn: { x: 0, y: height + 2.2, z: 10, yaw: 0 },
    checkpoints: [{ x: 0, z: 180 }],
    solids: [
      {
        id: "road",
        kind: "road",
        x: 0,
        y: 1.25,
        z: 20,
        w: 24,
        h: 1.3,
        d: 140,
        color: 0x303b49,
      },
    ],
    prefabs: [
      {
        id: "burner",
        kind: "burner",
        x: 0,
        z: 50,
        y: height,
        yaw,
        resizeScale,
      },
    ],
    medals: { gold: 30, silver: 45, bronze: 60 },
  };
}

it.each([
  [0, 0, 1],
  [2.3187232668009727, 0, 1],
  [6, Math.PI / 2, 2],
])(
  "aligns burner ramp and drums at elevation %s, yaw %s and size %s",
  (height, yaw, scale) => {
    const track = toTrack(level(height, yaw, scale));
    registerCustomTrack(track);
    const sim = new Simulation();
    try {
      sim.startTrack(track.id as never);
      const comic = scale === 1 ? sim.comic : sim.resizedPrefabs[0].sim.comic;
      const mechanism = comic.mechanisms.find((m) => m.h.id === "burner")!;
      const ramp = sim.world.getCollider(mechanism.ramp!.handle);
      expect(ramp.translation().y).toBeCloseTo(
        height + BURNER_RAMP.y * scale,
        4,
      );
      const drums = mechanism.colliders.filter(
        (c) => c.shape.type === R.ShapeType.Cylinder,
      );
      expect(drums).toHaveLength(3);
      for (const drum of drums)
        expect(sim.world.getCollider(drum.handle).translation().y).toBeCloseTo(
          height + BURNER_DRUM.y * scale,
          4,
        );
    } finally {
      sim.dispose();
    }
  },
);

it("drives off the raised road and climbs the second Fire jumps burner ramp", () => {
  const height = 2.3187232668009727;
  const track = toTrack(level(height));
  registerCustomTrack(track);
  const sim = new Simulation();
  try {
    sim.startTrack(track.id as never);
    for (let i = 0; i < 120; i++) sim.step({});
    let peak = 0;
    for (let i = 0; i < 600 && sim.body.translation().z < 40; i++) {
      sim.step({ throttle: 1 });
      peak = Math.max(peak, sim.body.translation().y);
    }
    expect(sim.body.translation().z).toBeGreaterThanOrEqual(40);
    expect(peak).toBeGreaterThan(5.5);
  } finally {
    sim.dispose();
  }
});
