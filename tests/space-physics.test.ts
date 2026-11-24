import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { METEOR, UFO, CONFUSION } from "../src/dungeon-hazards";
import { DT } from "../src/clock";

beforeAll(initPhysics);

function fixture(prefabs: CustomPrefab[], extra: Record<string, unknown> = {}) {
  const level = { ...blankLevel("Space Fixture"), ...extra };
  level.prefabs = prefabs;
  level.spawn = { x: 0, y: 2.1, z: -20, yaw: 0 };
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  for (let i = 0; i < 30; i++) sim.step({});
  return sim;
}

it("validates gravityScale between 0.1 and 3", () => {
  expect(validateCustomLevel({ ...blankLevel("G"), gravityScale: 0.5 }).gravityScale).toBe(0.5);
  expect(validateCustomLevel(blankLevel("G")).gravityScale).toBeUndefined();
  expect(() => validateCustomLevel({ ...blankLevel("G"), gravityScale: 0 })).toThrow(
    "gravityScale must be a finite number between 0.1 and 3",
  );
  expect(() => validateCustomLevel({ ...blankLevel("G"), gravityScale: 9 })).toThrow(
    "gravityScale must be a finite number between 0.1 and 3",
  );
});

it("applies half gravity from the level multiplier", () => {
  const sim = fixture([], { gravityScale: 0.5 });
  try {
    expect(sim.effectiveGravity().y).toBeCloseTo(-9.81 * sim.tuning.gravity * 0.5, 5);
    expect(sim.world.gravity.y).toBeCloseTo(-9.81 * sim.tuning.gravity * 0.5, 5);
  } finally {
    sim.dispose();
  }
  const normal = fixture([]);
  try {
    expect(normal.effectiveGravity().y).toBeCloseTo(-9.81 * normal.tuning.gravity, 5);
  } finally {
    normal.dispose();
  }
});

it("confuses steering for 4s without damage", () => {
  const sim = fixture([]);
  try {
    sim.applyConfusion("alien");
    expect(sim.confused).toBe(true);
    const health = (sim as unknown as { remainingHealth(): number }).remainingHealth();
    for (let i = 0; i < Math.ceil(CONFUSION.duration / DT); i++)
      sim.step({ throttle: 1, steer: 1 });
    expect(sim.confused).toBe(false);
    expect((sim as unknown as { remainingHealth(): number }).remainingHealth()).toBeCloseTo(health, 5);
    expect(sim.damageEvents.filter((e) => e.source === "alien")).toHaveLength(1);
  } finally {
    sim.dispose();
  }
});

it("inverts steering while confused", () => {
  const sim = fixture([]);
  try {
    sim.applyConfusion("alien");
    for (let i = 0; i < 30; i++) sim.step({ throttle: 0.5, steer: 1 });
    const confusedAngle = sim.steeringAngle;
    const sober = fixture([]);
    try {
      for (let i = 0; i < 30; i++) sober.step({ throttle: 0.5, steer: 1 });
      expect(Math.sign(confusedAngle)).toBe(-Math.sign(sober.steeringAngle));
    } finally {
      sober.dispose();
    }
  } finally {
    sim.dispose();
  }
});

it("asteroid touch is lethal", () => {
  const sim = fixture([{ id: "rock", kind: "asteroid", x: 0, z: 30, y: 2, yaw: Math.PI }]);
  try {
    for (let i = 0; i < 900 && sim.status === "driving"; i++)
      sim.step({ throttle: 1 });
    expect(sim.status).not.toBe("driving");
    expect(sim.damageEvents.some((e) => e.source === "asteroid")).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("meteor touch is lethal and the meteor respawns", () => {
  const sim = fixture([{ id: "fall", kind: "meteor", x: 0, z: 30 }]);
  try {
    const mech = sim.dungeon.mechanisms.find((m) => m.h.id === "fall")!;
    // Park the truck under the impact point and wait for the crash.
    sim.body.setTranslation({ x: 0, y: 2, z: 30 }, true);
    for (let i = 0; i < 600 && sim.status === "driving"; i++)
      sim.step({ throttle: 0 });
    expect(sim.damageEvents.some((e) => e.source === "meteor")).toBe(true);
    for (let i = 0; i < 300 && mech.meteor!.live; i++) sim.step({ throttle: 0 });
    expect(mech.meteor!.live).toBe(false);
    for (let i = 0; i < Math.ceil((METEOR.respawn + 1) / DT); i++)
      sim.step({ throttle: 0 });
    expect(mech.meteor!.live).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("alien touch confuses without wrecking", () => {
  const sim = fixture([{ id: "martian", kind: "alien", x: 0, z: 30 }]);
  try {
    sim.body.setTranslation({ x: 0, y: 2, z: 30 }, true);
    for (let i = 0; i < 60; i++) sim.step({ throttle: 0 });
    expect(sim.confused).toBe(true);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("ufo zap deals 40% heat and breaks two parts", () => {
  const sim = fixture([{ id: "saucer", kind: "ufo", x: 0, z: 10 }]);
  try {
    const full = (sim as unknown as { fullHealth: number }).fullHealth;
    const before = (sim as unknown as { remainingHealth(): number }).remainingHealth();
    expect(before).toBe(full);
    const mech = sim.dungeon.mechanisms.find((m) => m.h.id === "saucer")!;
    for (let i = 0; i < Math.ceil((UFO.laserPeriod + 1) / DT); i++) {
      // Hold the truck under the cruising saucer so the zap lands.
      if (i % 30 === 0)
        sim.body.setTranslation({ x: mech.ufo!.pos.x, y: 2, z: mech.ufo!.pos.z }, true);
      sim.step({ throttle: 0 });
    }
    const after = (sim as unknown as { remainingHealth(): number }).remainingHealth();
    expect((before - after) / full).toBeCloseTo(UFO.laserFraction, 2);
    expect(sim.damageEvents.filter((e) => e.source === "ufo-part")).toHaveLength(UFO.laserParts);
    expect(sim.damageEvents.some((e) => e.source === "ufo")).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("space decor is solid but harmless", () => {
  const sim = fixture([
    { id: "pillar", kind: "station-pillar", x: -20, z: 60 },
    { id: "panel", kind: "solar-panel", x: -10, z: 60 },
    { id: "dish", kind: "satellite-dish", x: 0, z: 60 },
    { id: "rock", kind: "moon-rock", x: 10, z: 60 },
    { id: "crate", kind: "space-crate", x: 20, z: 60 },
    { id: "tower", kind: "station-tower", x: -30, z: 90 },
    { id: "dome", kind: "habitat-dome", x: 30, z: 90 },
  ]);
  try {
    const mechanisms = sim.dungeon.mechanisms.filter((m) =>
      ["station-pillar", "solar-panel", "satellite-dish", "moon-rock", "space-crate", "station-tower", "habitat-dome"].includes(m.h.kind),
    );
    expect(mechanisms).toHaveLength(7);
    for (const m of mechanisms) expect(m.colliders.length).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < 120; i++) sim.step({ throttle: 0 });
    expect(sim.damageEvents).toHaveLength(0);
    expect(sim.dungeon.mechanisms.every((m) => m.contacts === 0)).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("smashes supply crates and oxygen tanks", () => {
  const sim = fixture([
    { id: "crate", kind: "supply-crate", x: 0, z: 30 },
    { id: "tank", kind: "oxygen-tank", x: 8, z: 30 },
  ]);
  try {
    expect(sim.props.props.map((p) => p.definition.id).sort()).toEqual(["crate", "tank"]);
    for (const id of ["crate", "tank"]) {
      const prop = sim.props.props.find((p) => p.definition.id === id)!;
      const pos = prop.body.translation();
      sim.body.setTranslation({ x: pos.x - 1.65, y: 1.94, z: pos.z - 2.7 }, true);
      sim.body.setLinvel({ x: 0, y: 0, z: 40 }, true);
      sim.step({ throttle: 0.001 });
      for (let i = 0; i < 30 && !prop.broken; i++) sim.step({});
      expect(prop.broken, id).toBe(true);
      expect(prop.pieces.length, id).toBeGreaterThan(0);
    }
  } finally {
    sim.dispose();
  }
});
