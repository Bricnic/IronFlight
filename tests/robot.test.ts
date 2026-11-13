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
  ROBOT_LASER_ARC,
  ROBOT_LASER_DPS,
  ROBOT_LASER_HALF_ANGLE,
  ROBOT_LASER_PERIOD,
  ROBOT_LASER_RANGE,
  ROBOT_LASER_TICK,
  robotLaserAngle,
  robotLaserFiring,
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

it("sweeps the laser periodically across a symmetric arc", () => {
  expect(ROBOT_LASER_RANGE).toBeGreaterThan(10);
  expect(ROBOT_LASER_HALF_ANGLE).toBeGreaterThan(0);
  expect(ROBOT_LASER_DPS).toBeCloseTo(0.3, 5);
  expect(ROBOT_LASER_TICK).toBeCloseTo(0.1, 5);
  let min = Infinity;
  let max = -Infinity;
  for (let t = 0; t < ROBOT_LASER_PERIOD; t += 0.05) {
    const a = robotLaserAngle(t);
    min = Math.min(min, a);
    max = Math.max(max, a);
    expect(robotLaserAngle(t + ROBOT_LASER_PERIOD)).toBeCloseTo(a, 5);
  }
  expect(min).toBeCloseTo(-ROBOT_LASER_ARC, 1);
  expect(max).toBeCloseTo(ROBOT_LASER_ARC, 1);
  const firing = [0, 1, 2, 3, 4].map((t) => robotLaserFiring(t));
  expect(firing).toContain(true);
  expect(firing).toContain(false);
});

function laserProbeTrack() {
  registerCustomTrack(
    toTrack(
      validateCustomLevel({
        id: "custom:robot-laser-probe",
        name: "Robot Laser Probe",
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
}

it("burns an exposed truck but spares the blind spot", () => {
  laserProbeTrack();
  const sim = new Simulation();
  try {
    sim.startTrack("custom:robot-laser-probe");
    const full = sim.parts.get("chassis-front")!.health;
    sim.body.setTranslation({ x: 0, y: 2, z: 10 }, true);
    sim.run(8);
    const exposed = sim.parts.get("chassis-front")!.health;
    expect(exposed).toBeLessThan(full);
    expect(exposed).toBeGreaterThan(full * 0.7);
    expect(
      sim.damageEvents.some((event) => event.source === "robot"),
    ).toBe(true);
  } finally {
    sim.dispose();
  }
  const blind = new Simulation();
  try {
    blind.startTrack("custom:robot-laser-probe");
    const full = blind.parts.get("chassis-front")!.health;
    blind.body.setTranslation({ x: 0, y: 2, z: -10 }, true);
    blind.run(8);
    expect(blind.parts.get("chassis-front")!.health).toBe(full);
    expect(
      blind.damageEvents.some((event) => event.source === "robot"),
    ).toBe(false);
  } finally {
    blind.dispose();
  }
});

it("mounts a beam pivot on the robot head", () => {
  const model = buildDungeonModel({
    id: "test-robot-laser",
    kind: "robot",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.pivots).toHaveLength(2);
  expect(model.laser).toBeDefined();
  let beams = 0;
  model.laser!.traverse((o) => {
    if (o instanceof T.Mesh) beams++;
  });
  expect(beams).toBeGreaterThanOrEqual(1);
});
