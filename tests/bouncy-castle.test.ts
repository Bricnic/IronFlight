import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  BIRTHDAY_PREFAB_KINDS,
  DUNGEON_PREFAB_KINDS,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import {
  BOUNCY_CASTLE,
  DUNGEON_STRIKE,
  dungeonHazards,
} from "../src/dungeon-hazards";
import { BOUNCE_SPEED } from "../src/slide";
import { buildDungeonModel } from "../src/dungeon-view";

beforeAll(initPhysics);

beforeEach(() => {
  const ctx = {
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    measureText: () => ({ width: 10 }),
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

function fixture(name: string, prefabs: CustomPrefab[]) {
  const level = blankLevel(name);
  level.prefabs = prefabs;
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

it("registers the bouncy castle with a model and no strike entry", () => {
  expect(PREFAB_KINDS).toContain("bouncy-castle");
  expect(DUNGEON_PREFAB_KINDS).toContain("bouncy-castle");
  expect(BIRTHDAY_PREFAB_KINDS).toContain("bouncy-castle");
  expect(
    (DUNGEON_STRIKE as Record<string, unknown>)["bouncy-castle"],
  ).toBeUndefined();
  const model = buildDungeonModel({
    id: "bouncy-castle",
    kind: "bouncy-castle" as never,
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.triangles).toBeGreaterThan(0);
  // Standard fields only, with scale stretching the pad.
  const level = validateCustomLevel({
    ...blankLevel("Bouncy Parking"),
    prefabs: [{ id: "b", kind: "bouncy-castle", x: 0, z: 0, y: 1, yaw: 0.5, scale: 4 }],
  });
  expect(dungeonHazards(toTrack(level)).map((h) => h.kind)).toEqual([
    "bouncy-castle",
  ]);
  expect(dungeonHazards(toTrack(level))[0].scale).toBe(4);
});

it("bounces exactly like a trampoline and shakes one part loose", () => {
  expect(BOUNCY_CASTLE.bounce).toBe(BOUNCE_SPEED);
  const sim = fixture("Bouncy Ride", [
    { id: "b", kind: "bouncy-castle", x: 0, z: 40 },
  ]);
  try {
    const mech = () =>
      sim.dungeon.mechanisms.find((m) => m.h.kind === "bouncy-castle")!;
    // Ease onto the pad from just above it: no landing impact to confound
    // the kill count.
    sim.body.setTranslation({ x: 0, y: 5, z: 40 }, true);
    sim.body.setLinvel({ x: 0, y: -1, z: 0 }, true);
    for (let i = 0; i < 240 && mech().bouncy!.bounces < 1; i++)
      sim.step({ brake: 1 });
    expect(mech().bouncy!.bounces).toBe(1);
    expect(sim.bounced).toBe(true);
    expect(sim.body.linvel().y).toBeCloseTo(BOUNCE_SPEED, 0);
    // Exactly one part destroyed by this bounce, and nothing else.
    const breaks = sim.damageEvents.filter(
      (e) => e.source === "bouncy-castle",
    );
    expect(breaks).toHaveLength(1);
    expect(sim.parts.get(breaks[0].part)!.health).toBe(0);
    expect([...sim.parts.values()].filter((p) => p.health <= 0)).toHaveLength(1);
    expect(
      sim.snapshot().dungeon.hazards.find((h) => h.kind === "bouncy-castle")!
        .bounces,
    ).toBe(1);
  } finally {
    sim.dispose();
  }
});

it("holds the 1s cooldown: no double bounce, no double break", () => {
  const sim = fixture("Bouncy Cooldown", [
    { id: "b", kind: "bouncy-castle", x: 0, z: 40 },
  ]);
  try {
    const mech = () =>
      sim.dungeon.mechanisms.find((m) => m.h.kind === "bouncy-castle")!;
    const broken = () =>
      sim.damageEvents.filter((e) => e.source === "bouncy-castle").length;
    sim.body.setTranslation({ x: 0, y: 3, z: 40 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    // Parked inside the sensor with upward velocity: armed gate shut.
    sim.body.setLinvel({ x: 0, y: 10, z: 0 }, true);
    for (let i = 0; i < 30; i++) sim.step({ brake: 1 });
    expect(mech().bouncy!.bounces).toBe(0);
    expect(broken()).toBe(0);
    // Falling in bounces once; the launch carries the car out of the gate.
    sim.body.setLinvel({ x: 0, y: -2, z: 0 }, true);
    for (let i = 0; i < 60 && mech().bouncy!.bounces < 1; i++)
      sim.step({ brake: 1 });
    expect(mech().bouncy!.bounces).toBe(1);
    expect(broken()).toBe(1);
  } finally {
    sim.dispose();
  }
});

it("a clean bounce climbs back to plank height with margin", () => {
  const sim = fixture("Bouncy Climb", [
    { id: "b", kind: "bouncy-castle", x: 0, z: 40 },
  ]);
  try {
    const mech = () =>
      sim.dungeon.mechanisms.find((m) => m.h.kind === "bouncy-castle")!;
    sim.body.setTranslation({ x: 0, y: 3, z: 40 }, true);
    sim.body.setLinvel({ x: 0, y: -2, z: 0 }, true);
    for (let i = 0; i < 120 && mech().bouncy!.bounces < 1; i++)
      sim.step({ brake: 1 });
    expect(mech().bouncy!.bounces).toBe(1);
    // Ride the launch to its apex: planks sit at 14, the apex must clear 20.
    let apex = 0;
    for (let i = 0; i < 600; i++) {
      sim.step({ brake: 1 });
      apex = Math.max(apex, sim.body.translation().y);
      if (sim.body.linvel().y < 0 && sim.body.translation().y < apex - 1)
        break;
    }
    expect(apex).toBeGreaterThan(20);
  } finally {
    sim.dispose();
  }
});
