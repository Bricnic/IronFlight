import { Quaternion, Vector3 } from "three";
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
  BALLOON,
  BIRTHDAY_CANDLE,
  DUNGEON_STRIKE,
  dungeonHazards,
} from "../src/dungeon-hazards";
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

it("registers the birthday prefabs with models and no strike entries", () => {
  for (const kind of ["birthday-candle", "helium-balloon"]) {
    expect(PREFAB_KINDS).toContain(kind);
    expect(DUNGEON_PREFAB_KINDS).toContain(kind);
    expect(BIRTHDAY_PREFAB_KINDS).toContain(kind);
    expect((DUNGEON_STRIKE as Record<string, unknown>)[kind]).toBeUndefined();
    const model = buildDungeonModel({ id: kind, kind: kind as never, x: 0, z: 0, phase: 0 });
    expect(model.triangles, kind).toBeGreaterThan(0);
  }
  const level = validateCustomLevel({
    ...blankLevel("Birthday Parking"),
    prefabs: [
      { id: "c", kind: "birthday-candle", x: 0, z: 0 },
      { id: "b", kind: "helium-balloon", x: 0, z: 0 },
    ],
  });
  expect(dungeonHazards(toTrack(level)).map((h) => h.kind)).toEqual([
    "birthday-candle",
    "helium-balloon",
  ]);
});

it("birthday candle is decor standing, dragon-fire once knocked over", () => {
  const sim = fixture("Candle Burn", [
    { id: "c", kind: "birthday-candle", x: 0, z: 40 },
  ]);
  try {
    const mech = () =>
      sim.dungeon.mechanisms.find((m) => m.h.kind === "birthday-candle")!;
    // Parked against the standing candle: decor, no ignition.
    sim.body.setTranslation({ x: 0, y: 2, z: 40 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    for (let i = 0; i < 60; i++) sim.step({ brake: 1 });
    expect(mech().candle!.tipped).toBe(false);
    expect(sim.fireDamageTaken).toBe(0);
    // Knock it flat: past 45 degrees, the burning tip ignites the car.
    const tipped = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 1.35);
    mech().body!.setRotation(
      { x: tipped.x, y: tipped.y, z: tipped.z, w: tipped.w },
      true,
    );
    for (let i = 0; i < 12; i++) sim.step({ brake: 1 });
    expect(mech().candle!.tipped).toBe(true);
    // First 50 ms tick lands ~5% of max integrity through the fire path.
    expect(sim.fireDamageTaken).toBeGreaterThan(0);
    expect(sim.fireDamageTaken).toBeLessThan(0.12);
    // inFlames is only set on tick steps, so sample across one tick period.
    let flamed = false;
    for (let i = 0; i < 12; i++) {
      sim.step({ brake: 1 });
      flamed = flamed || sim.inFlames;
    }
    expect(flamed).toBe(true);
    expect(sim.damageEvents.some((e) => e.source === "birthday-candle")).toBe(true);
    // Keep burning: soot darkens through the dragon-fire scorch path, and
    // every 20% burned breaks one more part.
    for (let i = 0; i < 600; i++) sim.step({ brake: 1 });
    expect(sim.scorch).toBeGreaterThan(0.2);
    const breaks = sim.damageEvents.filter(
      (e) => e.source === "birthday-candle" && e.part !== "chassis-front",
    );
    expect(breaks.length).toBeGreaterThanOrEqual(1);
    expect(breaks.length).toBeLessThanOrEqual(
      Math.floor(sim.fireDamageTaken / BIRTHDAY_CANDLE.breakStep) + 1,
    );
    expect([...sim.parts.values()].some((p) => !!p.body)).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("helium balloon hooks a part, hauls up, pops and tumbles the car", () => {
  const sim = fixture("Balloon Ride", [
    { id: "b", kind: "helium-balloon", x: 0, z: 60 },
  ]);
  try {
    const mech = () =>
      sim.dungeon.mechanisms.find((m) => m.h.kind === "helium-balloon")!;
    sim.body.setTranslation({ x: 0, y: 2, z: 60 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    for (let i = 0; i < 120 && !mech().balloon!.hooked; i++)
      sim.step({ brake: 1 });
    expect(mech().balloon!.hooked).toBe(true);
    expect(sim.parts.has(mech().balloon!.partId)).toBe(true);
    const hookY = mech().balloon!.hookY;
    expect(hookY).toBeGreaterThan(0);
    // Full throttle cannot beat the haul: the car climbs at winch pace.
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    for (let i = 0; i < 30; i++) sim.step({ throttle: 1 });
    expect(sim.body.linvel().y).toBeGreaterThan(BALLOON.dragSpeed * 0.8);
    expect(sim.body.translation().y).toBeGreaterThan(hookY + 2);
    // Past ~25 units above the hook point the balloon pops.
    for (let i = 0; i < 600 && !mech().balloon!.popped; i++)
      sim.step({ throttle: 1 });
    expect(mech().balloon!.popped).toBe(true);
    expect(sim.body.translation().y).toBeGreaterThanOrEqual(
      hookY + BALLOON.popHeight - 2,
    );
    expect(
      sim.damageEvents.some((e) => e.source === "helium-balloon-pop"),
    ).toBe(true);
    // The pop kicks a rapid tumble with brief control loss.
    const spin = sim.body.angvel();
    expect(Math.hypot(spin.x, spin.y, spin.z)).toBeGreaterThan(8);
    expect(sim.dungeon.balloonHolding).toBe(true);
    for (let i = 0; i < 600 && sim.dungeon.balloonHolding; i++)
      sim.step({ throttle: 1, steer: 1 });
    expect(sim.dungeon.balloonHolding).toBe(false);
    expect(sim.snapshot().dungeon.hazards.find((h) => h.kind === "helium-balloon")!.popped).toBe(true);
  } finally {
    sim.dispose();
  }
});
