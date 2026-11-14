import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  HOLLOW_PREFAB_KINDS,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { DUNGEON_STRIKE, dungeonHazards, SPIDER } from "../src/dungeon-hazards";
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

it("registers the spider as a dungeon prefab with web constants", () => {
  for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS, HOLLOW_PREFAB_KINDS])
    expect(list).toContain("spider");
  expect((DUNGEON_STRIKE as Record<string, unknown>)["spider"]).toBeUndefined();
  expect(SPIDER.webRadius).toBe(20);
  const level = validateCustomLevel({
    ...blankLevel("Spider Parking"),
    prefabs: [{ id: "sp", kind: "spider", x: 0, z: 0 }],
  });
  expect(dungeonHazards(toTrack(level)).map((h) => h.kind)).toEqual(["spider"]);
  const model = buildDungeonModel({
    id: "sp",
    kind: "spider",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.triangles).toBeGreaterThan(0);
  expect(model.spider).toBeTruthy();
});

it("silk drag kills momentum and caps crossing speed", () => {
  const sim = fixture("Spider Drag", [{ id: "sp", kind: "spider", x: 0, z: 60 }]);
  try {
    sim.body.setTranslation({ x: 0, y: 2, z: 60 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 20 }, true);
    for (let i = 0; i < 60; i++) sim.step({});
    const v = sim.body.linvel();
    expect(Math.hypot(v.x, v.z)).toBeLessThan(SPIDER.maxSpeed);
  } finally {
    sim.dispose();
  }
});

it("runs down a stuck truck and destroys it on contact", () => {
  const sim = fixture("Spider Hunt", [{ id: "sp", kind: "spider", x: 0, z: 60 }]);
  try {
    const mech = () => sim.dungeon.mechanisms.find((m) => m.h.kind === "spider")!;
    sim.body.setTranslation({ x: 5, y: 2, z: 60 }, true);
    for (let i = 0; i < 240 && !mech().spider!.hunting; i++) sim.step({ brake: 1 });
    expect(mech().spider!.hunting).toBe(true);
    for (let i = 0; i < 1200 && sim.status === "driving"; i++) sim.step({ brake: 1 });
    expect(mech().contacts).toBeGreaterThanOrEqual(1);
    expect(sim.status).toBe("wrecked");
    expect(sim.damageEvents.some((e) => e.source === "spider")).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("ignores trucks that never touch silk and drops far hunts", () => {
  const sim = fixture("Spider Bypass", [{ id: "sp", kind: "spider", x: 0, z: 60 }]);
  try {
    const mech = () => sim.dungeon.mechanisms.find((m) => m.h.kind === "spider")!;
    // Park well outside the web: no hunt starts.
    sim.body.setTranslation({ x: 30, y: 2, z: 60 }, true);
    for (let i = 0; i < 240; i++) sim.step({ brake: 1 });
    expect(mech().spider!.hunting).toBe(false);
    expect(mech().contacts).toBe(0);
    // Start a hunt, then teleport clear past the leash: it gives up.
    sim.body.setTranslation({ x: 5, y: 2, z: 60 }, true);
    for (let i = 0; i < 240 && !mech().spider!.hunting; i++) sim.step({ brake: 1 });
    expect(mech().spider!.hunting).toBe(true);
    sim.body.setTranslation({ x: 60, y: 2, z: 60 }, true);
    for (let i = 0; i < 60; i++) sim.step({ brake: 1 });
    expect(mech().spider!.hunting).toBe(false);
  } finally {
    sim.dispose();
  }
});
