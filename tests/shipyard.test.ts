import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { dungeonHazards, SHIP } from "../src/dungeon-hazards";
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

function fixture(
  name: string,
  prefabs: CustomPrefab[],
  checkpoints = [{ x: 0, z: 40 }],
) {
  const level = blankLevel(name);
  level.prefabs = prefabs;
  level.checkpoints = checkpoints;
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

it("registers the shipyard prefabs with their options", () => {
  for (const kind of ["pelican", "anchor", "ship"]) {
    expect(PREFAB_KINDS).toContain(kind);
    expect(DUNGEON_PREFAB_KINDS).toContain(kind);
  }
  const spots = [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
    { x: 0, z: 10 },
  ];
  const level = validateCustomLevel({
    ...blankLevel("Shipyard Options"),
    prefabs: [
      { id: "p", kind: "pelican", x: 0, z: 0, spots, seed: 7 },
      { id: "a", kind: "anchor", x: 0, z: 0, yaw: 1 },
      { id: "s", kind: "ship", x: 0, z: 0, trigger: 2 },
    ],
  });
  const kinds = dungeonHazards(toTrack(level)).map((h) => h.kind);
  expect(kinds).toEqual(["pelican", "anchor", "ship"]);
  expect(() =>
    validateCustomLevel({
      ...blankLevel("Bad Spots"),
      prefabs: [{ id: "p", kind: "pelican", x: 0, z: 0, spots: [{ x: 0, z: 0 }] }],
    }),
  ).toThrow(/spots/);
  expect(() =>
    validateCustomLevel({
      ...blankLevel("Bad Trigger"),
      prefabs: [{ id: "s", kind: "ship", x: 0, z: 0, trigger: 0 }],
    }),
  ).toThrow(/trigger/);
});

it("builds a model for every shipyard kind", () => {
  for (const kind of ["pelican", "anchor", "ship"] as const) {
    const model = buildDungeonModel({
      id: kind,
      kind,
      x: 0,
      z: 0,
      phase: 0,
    });
    expect(model.triangles, kind).toBeGreaterThan(0);
  }
});

it("picks the same three spots for the same seed", () => {
  const gates = [
    { x: 0, z: 40 },
    { x: 30, z: 60 },
    { x: -30, z: 80 },
    { x: 0, z: 100 },
  ];
  const sims = [1, 2].map((n) =>
    fixture(`Pelican Seed ${n}`, [{ id: "p", kind: "pelican", x: 0, z: 0, seed: 42 }], gates),
  );
  try {
    const spots = sims.map(
      (sim) => sim.dungeon.mechanisms.find((m) => m.h.kind === "pelican")!.pelican!.spots,
    );
    expect(spots[0]).toEqual(spots[1]);
    expect(spots[0]).toHaveLength(3);
    for (const s of spots[0])
      expect(gates.some((g) => g.x === s.x && g.z === s.z)).toBe(true);
  } finally {
    sims.forEach((sim) => sim.dispose());
  }
});

it("guards each perch 3 s then flies the rotation", () => {
  const spots = [
    { x: -30, z: 0 },
    { x: 30, z: 0 },
    { x: 0, z: 40 },
  ];
  const sim = fixture("Pelican Rotation", [
    { id: "p", kind: "pelican", x: 0, z: 0, spots, seed: 1 },
  ]);
  try {
    const pel = () => sim.dungeon.mechanisms.find((m) => m.h.kind === "pelican")!.pelican!;
    expect(pel().phase).toBe("guard");
    const first = pel().index;
    // Still guarding just before 3 s, airborne just after.
    for (let i = 0; i < Math.round(2.9 * 120); i++) sim.step({ brake: 1 });
    expect(pel().phase).toBe("guard");
    expect(pel().pos.y).toBe(0);
    for (let i = 0; i < Math.round(0.5 * 120); i++) sim.step({ brake: 1 });
    expect(pel().phase).not.toBe("guard");
    expect(pel().pos.y).toBeGreaterThan(0);
    // Lands on the next perch and guards again.
    for (let i = 0; i < 1200 && pel().phase !== "guard"; i++) sim.step({ brake: 1 });
    expect(pel().phase).toBe("guard");
    expect(pel().index).toBe((first + 1) % 3);
    const spot = spots[pel().index];
    expect(pel().pos.x).toBeCloseTo(spot.x, 3);
    expect(pel().pos.z).toBeCloseTo(spot.z, 3);
  } finally {
    sim.dispose();
  }
});

it("bills a truck in range while perched, never while flying", () => {
  const spots = [
    { x: -30, z: 0 },
    { x: 30, z: 0 },
    { x: 0, z: 40 },
  ];
  const sim = fixture("Pelican Bite", [
    { id: "p", kind: "pelican", x: 0, z: 0, spots, seed: 1, yaw: 0 },
  ]);
  try {
    const mech = () => sim.dungeon.mechanisms.find((m) => m.h.kind === "pelican")!;
    const pel = () => mech().pelican!;
    const spot = spots[pel().index];
    // One car length ahead of the bill: inside aggro range, facing the truck.
    sim.body.setTranslation({ x: spot.x, y: 2, z: spot.z + 4 }, true);
    for (let i = 0; i < 600 && sim.status === "driving"; i++) sim.step({ brake: 1 });
    expect(mech().contacts).toBeGreaterThanOrEqual(1);
    expect(sim.status).toBe("wrecked");
    expect(sim.damageEvents.some((e) => e.source === "pelican")).toBe(true);
  } finally {
    sim.dispose();
  }
  const fly = fixture("Pelican Flyby", [
    { id: "p", kind: "pelican", x: 0, z: 0, spots, seed: 1, yaw: 0 },
  ]);
  try {
    const mech = () => fly.dungeon.mechanisms.find((m) => m.h.kind === "pelican")!;
    const pel = () => mech().pelican!;
    // Park under the flight path: no bite may start while airborne.
    const from = spots[pel().index];
    const to = spots[(pel().index + 1) % 3];
    fly.body.setTranslation(
      { x: (from.x + to.x) / 2, y: 2, z: (from.z + to.z) / 2 },
      true,
    );
    let sawFlight = false;
    for (let i = 0; i < 2400 && fly.status === "driving"; i++) {
      fly.step({ brake: 1 });
      if (pel().phase !== "guard") {
        sawFlight = true;
        expect(pel().bite).toBeUndefined();
      } else if (sawFlight) break;
    }
    expect(sawFlight).toBe(true);
    expect(mech().contacts).toBe(0);
  } finally {
    fly.dispose();
  }
});

it("hooks chain touches and winches full-throttle trucks into the drink", () => {
  const sim = fixture("Anchor Dunk", [
    { id: "w", kind: "water", x: 40, z: 0 },
    { id: "a", kind: "anchor", x: 0, z: 0, yaw: Math.PI / 2 },
  ]);
  try {
    const mech = () => sim.dungeon.mechanisms.find((m) => m.h.kind === "anchor")!;
    // Park on the ground chain halfway to the road, facing away from the water.
    sim.body.setTranslation({ x: 6, y: 2, z: 0 }, true);
    sim.body.setRotation({ x: 0, y: Math.sin(-Math.PI / 4), z: 0, w: Math.cos(-Math.PI / 4) }, true);
    for (let i = 0; i < 240 && !mech().anchor!.fired; i++) sim.step({ brake: 1 });
    expect(mech().anchor!.fired).toBe(true);
    expect(sim.damageEvents.some((e) => e.source === "anchor")).toBe(true);
    // Floor it away from the water: the winch still dunks the truck.
    const startX = sim.body.translation().x;
    for (let i = 0; i < 2400 && sim.status === "driving"; i++)
      sim.step({ throttle: 1 });
    expect(sim.body.translation().x).toBeGreaterThan(startX + 10);
    expect(sim.status).toBe("wrecked");
  } finally {
    sim.dispose();
  }
});

it("sails the ship on its trigger and holds at the end of the channel", () => {
  const sim = fixture(
    "Ship Departure",
    [{ id: "s", kind: "ship", x: 100, z: 40, yaw: Math.PI / 2, trigger: 2 }],
    [
      { x: 0, z: 40 },
      { x: 50, z: 40 },
      { x: 150, z: 40 },
    ],
  );
  try {
    const mech = () => sim.dungeon.mechanisms.find((m) => m.h.kind === "ship")!;
    const sx = () => mech().body!.translation().x;
    expect(sx()).toBeCloseTo(100, 3);
    for (let i = 0; i < 120; i++) sim.step({});
    expect(sx()).toBeCloseTo(100, 3);
    sim.trackRun!.checkpoint = 2;
    for (let i = 0; i < 600; i++) sim.step({});
    const sailed = sx() - 100;
    expect(sailed).toBeGreaterThan(10);
    expect(sailed).toBeLessThanOrEqual(SHIP.distance + 0.01);
    for (let i = 0; i < 3000; i++) sim.step({});
    expect(sx() - 100).toBeCloseTo(SHIP.distance, 1);
  } finally {
    sim.dispose();
  }
});

it("carries a truck parked on deck out to sea", () => {
  const sim = fixture("Ship Riders", [
    { id: "s", kind: "ship", x: 100, z: 40, yaw: Math.PI / 2, trigger: 1 },
  ]);
  try {
    // Park mid-deck in the starboard lane.
    sim.body.setTranslation({ x: 102, y: SHIP.deckY + 2, z: 40 }, true);
    for (let i = 0; i < 120; i++) sim.step({ brake: 1 });
    const deckY = sim.body.translation().y;
    expect(deckY).toBeGreaterThan(SHIP.deckY);
    expect(deckY).toBeLessThan(SHIP.deckY + 3);
    sim.trackRun!.checkpoint = 1;
    for (let i = 0; i < 1200; i++) sim.step({ brake: 1 });
    const car = sim.body.translation();
    const ship = sim.dungeon.mechanisms.find((m) => m.h.kind === "ship")!.body!.translation();
    // Still aboard, sailing with the ship (sub-2 slip over the voyage).
    expect(car.y).toBeGreaterThan(SHIP.deckY);
    expect(Math.abs(car.x - 102 - (ship.x - 100))).toBeLessThan(2);
  } finally {
    sim.dispose();
  }
});

it("exposes perch, rope and departure state in snapshots", () => {
  const sim = fixture("Shipyard Snapshot", [
    { id: "p", kind: "pelican", x: 0, z: 0, seed: 3 },
    { id: "a", kind: "anchor", x: 20, z: 0 },
    { id: "s", kind: "ship", x: 100, z: 40, trigger: 1 },
  ]);
  try {
    const hazards = sim.snapshot().dungeon.hazards;
    const pelican = hazards.find((h) => h.kind === "pelican")!;
    expect(pelican.perch).toBeGreaterThanOrEqual(0);
    expect(pelican.flying).toBe(false);
    expect(hazards.find((h) => h.kind === "anchor")!.fired).toBe(false);
    expect(hazards.find((h) => h.kind === "ship")!.departed).toBe(false);
  } finally {
    sim.dispose();
  }
});
