import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import {
  DUNGEON_PREFAB_KINDS,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import {
  ROBOT_STOMP_DAMAGE,
  ROBOT_STOMP_RADIUS,
} from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";
import { Simulation, initPhysics } from "../src/simulation";

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

it("registers the robot as a dungeon hazard", () => {
  for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS])
    expect(list).toContain("robot");
  expect(ROBOT_STOMP_RADIUS).toBeGreaterThanOrEqual(5);
  expect(ROBOT_STOMP_DAMAGE).toBeGreaterThan(0);
  expect(ROBOT_STOMP_DAMAGE).toBeLessThan(50);
});

it("builds an animated robot model headlessly", () => {
  const model = buildDungeonModel({
    id: "test-robot",
    kind: "robot",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.pivots).toHaveLength(2);
  expect(model.triangles).toBeGreaterThan(100);
  let labels = 0;
  model.root.traverse((o) => {
    if (o instanceof T.Sprite) labels++;
  });
  expect(labels).toBe(1);
});

it("stomps moderately without wrecking the truck", () => {
  registerCustomTrack(
    toTrack(
      validateCustomLevel({
      id: "custom:robot-probe",
      name: "Robot Probe",
      mode: "arena",
      backgroundTemplate: "pastoral-hills",
      spawn: { x: 0, y: 2, z: 0, yaw: 0 },
      checkpoints: [],
      collectibles: [{ id: "c1", x: 20, y: 2, z: 20, radius: 2 }],
      solids: [
        { id: "g", kind: "ground", x: 0, y: -0.65, z: 0, w: 60, h: 1.3, d: 60, color: 12107409 },
      ],
      prefabs: [{ id: "rob", kind: "robot", x: 0, y: 0, z: 0 }],
      medals: { gold: 10, silver: 20, bronze: 30 },
      limit: 60,
      }),
    ),
  );
  const sim = new Simulation();
  try {
    sim.startTrack("custom:robot-probe");
    const full = sim.parts.get("chassis-front")!.health;
    sim.body.setTranslation({ x: 0, y: 2, z: 0 }, true);
    sim.run(4);
    const health = sim.parts.get("chassis-front")!.health;
    expect(full - health).toBeGreaterThan(0);
    expect(full - health).toBeLessThan(full);
    expect(sim.status).toBe("driving");
    expect(
      sim.damageEvents.some((event) => event.source === "robot"),
    ).toBe(true);
  } finally {
    sim.dispose();
  }
});
