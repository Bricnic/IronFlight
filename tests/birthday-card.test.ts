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
  BIRTHDAY_CARD,
  birthdayCardDestination,
  birthdayCardOpenness,
  birthdayCardSeed,
  birthdayCardStriking,
  birthdayCardTelegraphing,
  DUNGEON_STRIKE,
  dungeonHazards,
} from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";
import { poseBirthdayCard } from "../src/birthday-view";

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

const cardOf = (sim: Simulation) =>
  sim.dungeon.mechanisms.find((m) => m.h.kind === "birthday-card")!;
const park = (sim: Simulation, x: number, y: number, z: number) => {
  sim.body.setTranslation({ x, y, z }, true);
  sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
};

it("registers the birthday card with a model and standard-only placement", () => {
  expect(PREFAB_KINDS).toContain("birthday-card");
  expect(DUNGEON_PREFAB_KINDS).toContain("birthday-card");
  expect(BIRTHDAY_PREFAB_KINDS).toContain("birthday-card");
  expect((DUNGEON_STRIKE as Record<string, unknown>)["birthday-card"]).toBeUndefined();
  const model = buildDungeonModel({ id: "card", kind: "birthday-card" as never, x: 0, z: 0, phase: 0 });
  expect(model.triangles).toBeGreaterThan(0);
  expect(model.card?.lid).toBeDefined();
  expect(model.card?.marker.visible).toBe(false);
  const level = validateCustomLevel({
    ...blankLevel("Card Parking"),
    prefabs: [
      { id: "c", kind: "birthday-card", x: 10, z: 40 },
      { id: "d", kind: "birthday-card", x: 0, z: 0, y: 2, yaw: 1, scale: 2 },
    ],
  });
  const [plain, full] = dungeonHazards(toTrack(level));
  expect(plain.kind).toBe("birthday-card");
  expect(full.yaw).toBe(1);
  expect(full.scale).toBe(2);
});

it("mirrors the chomp-book cycle and deals deterministic disc jumps", () => {
  // Open dwell, snap, closed dwell, reopen: the comic jaw rhythm.
  expect(birthdayCardOpenness(0)).toBe(1);
  expect(birthdayCardOpenness(5)).toBe(1);
  expect(birthdayCardOpenness(3)).toBe(0);
  expect(birthdayCardOpenness(2.4)).toBeGreaterThan(0);
  expect(birthdayCardOpenness(2.4)).toBeLessThan(1);
  expect(birthdayCardStriking(2.4)).toBe(true);
  expect(birthdayCardStriking(3)).toBe(false);
  expect(birthdayCardTelegraphing(3)).toBe(true);
  expect(birthdayCardTelegraphing(2.4)).toBe(false);
  // Uniform disc within 100 of home, stable per level, varied per jump.
  const seed = birthdayCardSeed("Card Jump", "card-1");
  const spots = Array.from({ length: 50 }, (_, i) =>
    birthdayCardDestination(10, 40, seed, i),
  );
  for (const s of spots)
    expect(Math.hypot(s.x - 10, s.z - 40)).toBeLessThanOrEqual(100);
  expect(new Set(spots.map((s) => `${s.x},${s.z}`)).size).toBeGreaterThan(40);
  expect(birthdayCardDestination(10, 40, seed, 3)).toEqual(
    birthdayCardDestination(10, 40, seed, 3),
  );
  expect(birthdayCardDestination(10, 40, seed, 3)).not.toEqual(
    birthdayCardDestination(10, 40, birthdayCardSeed("Other Level", "card-1"), 3),
  );
});

it("jumps on opening through the telegraphed spots", () => {
  const sim = fixture("Card Jump", [
    { id: "card-1", kind: "birthday-card", x: 10, z: 40 },
  ]);
  try {
    const mech = cardOf(sim);
    expect(mech.h.phase).toBe(0);
    const seed = birthdayCardSeed("Card Jump", "card-1");
    const dest = [0, 1].map((i) => birthdayCardDestination(10, 40, seed, i));
    // Park clear of home and both landings so the cadence runs undisturbed.
    park(sim, 90, 2, -80);
    for (const d of [{ x: 10, z: 40 }, ...dest])
      expect(Math.hypot(90 - d.x, -80 - d.z)).toBeGreaterThan(10);
    // Closed dwell telegraphs the upcoming landing.
    for (let i = 0; i < 348; i++) sim.step({ brake: 1 });
    expect(sim.time).toBeGreaterThanOrEqual(2.8);
    expect(sim.time).toBeLessThan(3.6);
    expect(mech.card!.next).toBeDefined();
    expect(mech.card!.next!.x).toBeCloseTo(dest[0].x, 6);
    expect(mech.card!.next!.z).toBeCloseTo(dest[0].z, 6);
    expect(
      sim.snapshot().dungeon.hazards.find((h) => h.kind === "birthday-card")!.telegraphing,
    ).toBe(true);
    // Opening jumps to the telegraphed spot, then the next cycle repeats.
    for (let i = 0; i < 120 && mech.card!.jumps < 1; i++) sim.step({ brake: 1 });
    expect(mech.card!.jumps).toBe(1);
    expect(mech.card!.pos.x).toBeCloseTo(dest[0].x, 6);
    expect(mech.card!.pos.z).toBeCloseTo(dest[0].z, 6);
    expect(mech.card!.next).toBeUndefined();
    for (let i = 0; i < 1200 && mech.card!.jumps < 2; i++) sim.step({ brake: 1 });
    expect(mech.card!.jumps).toBe(2);
    expect(mech.card!.pos.x).toBeCloseTo(dest[1].x, 6);
    expect(mech.card!.pos.z).toBeCloseTo(dest[1].z, 6);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("landing squashes trucks that ignore the telegraph", () => {
  const sim = fixture("Card Landing", [
    { id: "card-1", kind: "birthday-card", x: 10, z: 40 },
  ]);
  try {
    const mech = cardOf(sim);
    const seed = birthdayCardSeed("Card Landing", "card-1");
    const dest = birthdayCardDestination(10, 40, seed, 0);
    for (let i = 0; i < 348; i++) sim.step({ brake: 1 });
    expect(mech.card!.next!.x).toBeCloseTo(dest.x, 6);
    park(sim, dest.x, 2, dest.z);
    for (let i = 0; i < 240 && sim.status === "driving"; i++) sim.step({ brake: 1 });
    expect(sim.status).toBe("wrecked");
    expect(sim.damageEvents.some((e) => e.source === "birthday-card")).toBe(true);
    expect(mech.card!.jumps).toBe(1);
  } finally {
    sim.dispose();
  }
});

it("closing lid squashes ground overlap but the open card is safe", () => {
  const sim = fixture("Card Snap", [
    { id: "card-1", kind: "birthday-card", x: 10, z: 40 },
  ]);
  try {
    park(sim, 10, 2, 40);
    for (let i = 0; i < 180; i++) sim.step({ brake: 1 });
    expect(sim.time).toBeLessThan(BIRTHDAY_CARD.shutStart);
    expect(sim.status).toBe("driving");
    for (let i = 0; i < 240 && sim.status === "driving"; i++) sim.step({ brake: 1 });
    expect(sim.status).toBe("wrecked");
    expect(sim.damageEvents.some((e) => e.source === "birthday-card")).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("boarding the closed card launches the rider skyward", () => {
  const sim = fixture("Card Launch", [
    { id: "card-1", kind: "birthday-card", x: 10, z: 40 },
  ]);
  try {
    const mech = cardOf(sim);
    for (let i = 0; i < 360; i++) sim.step({ brake: 1 });
    expect(sim.time).toBeGreaterThanOrEqual(2.8);
    expect(sim.time).toBeLessThan(3.6);
    // Drive onto the closed card and wait out the telegraph unharmed.
    park(sim, 10, 2.2, 40);
    sim.body.setLinvel({ x: 5, y: 0, z: 1 }, true);
    for (; sim.time + mech.h.phase < 3.55; ) sim.step({});
    expect(sim.status).toBe("driving");
    const before = { ...sim.body.linvel() };
    for (let i = 0; i < 60 && mech.card!.jumps < 1; i++) sim.step({});
    expect(mech.card!.jumps).toBe(1);
    const after = { ...sim.body.linvel() };
    expect(after.y).toBeGreaterThan(25);
    expect(after.x).toBeCloseTo(before.x, 0);
    expect(after.z).toBeCloseTo(before.z, 0);
    expect(sim.status).toBe("driving");
    expect(sim.damageEvents.some((e) => e.source === "birthday-card-launch")).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("card view follows jumps and flashes the telegraph ring", () => {
  const sim = fixture("Card View", [
    { id: "card-1", kind: "birthday-card", x: 10, z: 40 },
  ]);
  try {
    const mech = cardOf(sim);
    const model = buildDungeonModel(mech.h);
    park(sim, 90, 2, -80);
    poseBirthdayCard(model.card!, model.root, mech, mech.h, sim);
    expect(model.card!.lid.rotation.x).toBeCloseTo(1.12, 6);
    expect(model.card!.marker.visible).toBe(false);
    for (let i = 0; i < 348; i++) sim.step({ brake: 1 });
    poseBirthdayCard(model.card!, model.root, mech, mech.h, sim);
    expect(model.card!.lid.rotation.x).toBeCloseTo(0, 6);
    expect(model.card!.marker.visible).toBe(true);
    const next = mech.card!.next!;
    expect(model.root.position.x).toBeCloseTo(10, 6);
    expect(model.root.position.x + model.card!.marker.position.x).toBeCloseTo(next.x, 4);
    expect(model.root.position.z + model.card!.marker.position.z).toBeCloseTo(next.z, 4);
    for (let i = 0; i < 120 && mech.card!.jumps < 1; i++) sim.step({ brake: 1 });
    poseBirthdayCard(model.card!, model.root, mech, mech.h, sim);
    expect(model.root.position.x).toBeCloseTo(next.x, 6);
    expect(model.root.position.z).toBeCloseTo(next.z, 6);
    expect(model.card!.marker.visible).toBe(false);
  } finally {
    sim.dispose();
  }
});

it("trucks flying over the card at jump time are left alone", () => {
  const sim = fixture("Card Flyover", [
    { id: "card-1", kind: "birthday-card", x: 10, z: 40 },
  ]);
  try {
    const mech = cardOf(sim);
    for (let i = 0; i < 360; i++) sim.step({ brake: 1 });
    park(sim, 10, 8, 40);
    sim.body.setLinvel({ x: 0, y: 4, z: 0 }, true);
    for (let i = 0; i < 120 && mech.card!.jumps < 1; i++) sim.step({});
    expect(mech.card!.jumps).toBe(1);
    expect(sim.status).toBe("driving");
    expect(sim.damageEvents.some((e) => e.source === "birthday-card-launch")).toBe(false);
    expect(sim.body.linvel().y).toBeLessThan(BIRTHDAY_CARD.launch);
  } finally {
    sim.dispose();
  }
});
