import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { Texture, TextureLoader } from "three";
import { readFileSync } from "node:fs";
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
  BIRTHDAY_CAKES,
  birthdayCakeTops,
  DUNGEON_STRIKE,
  dungeonHazards,
} from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";

beforeAll(initPhysics);

// Hazard labels and sponge textures draw on a canvas; stub the DOM like
// tests/dungeon.test.ts, and stub texture loads like background-view.test.ts.
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
  vi.spyOn(TextureLoader.prototype, "load").mockReturnValue(new Texture());
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

it("registers both cake centerpieces as non-lethal dungeon decor", () => {
  for (const kind of ["birthday-cake-grand", "birthday-cake-table"]) {
    expect(PREFAB_KINDS).toContain(kind);
    expect(DUNGEON_PREFAB_KINDS).toContain(kind);
    expect(BIRTHDAY_PREFAB_KINDS).toContain(kind);
    expect((DUNGEON_STRIKE as Record<string, unknown>)[kind]).toBeUndefined();
  }
});

it("locks cake tier radii and top heights to the historic box tiers", () => {
  // Birthday Cake Circuit tiers: 140/100/60 wide boxes with tops 10/20/30.
  expect(BIRTHDAY_CAKES["birthday-cake-grand"].tiers).toEqual([
    { r: 70, h: 10 },
    { r: 50, h: 10 },
    { r: 30, h: 10 },
  ]);
  expect(birthdayCakeTops("birthday-cake-grand")).toEqual([10, 20, 30]);
  // Birthday Table Loop cakes: 100x60 / 60x36 boxes with tops 8/16.
  expect(BIRTHDAY_CAKES["birthday-cake-table"].tiers).toEqual([
    { r: 50, h: 8 },
    { r: 30, h: 8 },
  ]);
  expect(birthdayCakeTops("birthday-cake-table")).toEqual([8, 16]);
});

it("builds high-poly shared models with flat tops at the locked heights", () => {
  for (const kind of ["birthday-cake-grand", "birthday-cake-table"] as const) {
    const model = buildDungeonModel({ id: kind, kind, x: 0, z: 0, phase: 0 });
    expect(model.triangles).toBeGreaterThan(5000);
  }
});

it("stacks one static cylinder collider per tier plus the cherry stem", () => {
  const sim = fixture("Cake Colliders", [
    { id: "grand", kind: "birthday-cake-grand", x: 0, z: 0 },
    { id: "table", kind: "birthday-cake-table", x: 300, z: 0 },
  ]);
  try {
    expect(sim.dungeon.mechanisms).toHaveLength(2);
    for (const m of sim.dungeon.mechanisms) {
      const spec = BIRTHDAY_CAKES[m.h.kind as keyof typeof BIRTHDAY_CAKES];
      expect(m.colliders).toHaveLength(spec.tiers.length + 1);
      let base = 0;
      for (const [i, tier] of spec.tiers.entries()) {
        const t = m.colliders[i].translation();
        expect(t.x).toBeCloseTo(m.h.x, 6);
        expect(t.z).toBeCloseTo(m.h.z, 6);
        // Cylinder center: collider top lands exactly on the tier top.
        expect(t.y).toBeCloseTo(base + tier.h / 2, 6);
        base += tier.h;
      }
      const stem = m.colliders[spec.tiers.length].translation();
      expect(stem.y).toBeCloseTo(base + spec.stemH / 2, 6);
    }
  } finally {
    sim.dispose();
  }
});

it("places cakes with standard fields only and serves them as hazards", () => {
  const level = validateCustomLevel({
    ...blankLevel("Cake Parking"),
    prefabs: [
      { id: "g", kind: "birthday-cake-grand", x: 0, z: 0, y: 2, yaw: 0.5 },
      { id: "t", kind: "birthday-cake-table", x: 10, z: 10 },
    ],
  });
  expect(dungeonHazards(toTrack(level)).map((h) => h.kind)).toEqual([
    "birthday-cake-grand",
    "birthday-cake-table",
  ]);
});

for (const [file, kind, tops] of [
  ["Birthday Cake Circuit.json", "birthday-cake-grand", [10, 20, 30]],
  ["Birthday Table Loop.json", "birthday-cake-table", [8, 16]],
] as const) {
  it(`${file} loads with its cake centerpiece and tier tops ${tops.join("/")}`, () => {
    const level = validateCustomLevel(
      JSON.parse(readFileSync(`levels/official/${file}`, "utf8")),
    );
    // The mud-rock box tiers are gone, replaced by one cake prefab.
    expect(
      level.solids.filter((s) => /^(tier|cake)-\d$/.test(s.id)),
    ).toHaveLength(0);
    const cakes = level.prefabs.filter((p) => p.kind === kind);
    expect(cakes).toHaveLength(1);
    expect(cakes[0].x).toBe(0);
    expect(cakes[0].z).toBe(0);
    const track = toTrack(level);
    registerCustomTrack(track);
    const sim = new Simulation();
    sim.startTrack(track.id);
    try {
      const mech = sim.dungeon.mechanisms.find((m) => m.h.kind === kind);
      expect(mech, `${kind} mechanism`).toBeDefined();
      expect(mech!.colliders).toHaveLength(tops.length + 1);
      sim.run(1);
      expect(sim.snapshot().status).toBe("driving");
    } finally {
      sim.dispose();
    }
  });
}
