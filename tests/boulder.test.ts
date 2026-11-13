import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  DUNGEON_PREFAB_KINDS,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import { BOULDER, DUNGEON_STRIKE, dungeonHazards } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";

beforeAll(initPhysics);

let drawn: string[];
beforeEach(() => {
  drawn = [];
  const ctx = {
    fillRect: () => {},
    strokeRect: () => {},
    fillText: (text: string) => {
      drawn.push(String(text));
    },
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

function fixture(name: string, yaw = 0) {
  const level = blankLevel(name);
  level.prefabs = [{ id: "rock", kind: "boulder", x: 0, z: 60, yaw }];
  level.spawn = { x: 0, y: 2.1, z: 30, yaw: 0 };
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

it("registers the boulder as a contact-lethal dungeon prefab", () => {
  for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS])
    expect(list).toContain("boulder");
  expect(
    (DUNGEON_STRIKE as Record<string, unknown>)["boulder"],
  ).toBeUndefined();
  expect(BOULDER).toEqual({ radius: 2, trigger: 16, speed: 18 });
  const level = validateCustomLevel({
    ...blankLevel("Boulder Parking"),
    prefabs: [{ id: "bd", kind: "boulder", x: 0, z: 0, y: 0, yaw: 1.2 }],
  });
  expect(dungeonHazards(toTrack(level)).map((h) => h.kind)).toEqual(["boulder"]);
});

it("rests untriggered far away on a dynamic ball", () => {
  const sim = fixture("Boulder Rest");
  try {
    const m = sim.dungeon.mechanisms.find((m) => m.h.kind === "boulder")!;
    expect(m.body).toBeTruthy();
    expect(m.body!.isDynamic()).toBe(true);
    expect(m.colliders).toHaveLength(1);
    expect(m.triggered).toBe(false);
    const before = { ...m.body!.translation() };
    sim.run(1, {});
    expect(m.triggered).toBe(false);
    const after = m.body!.translation();
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.5);
  } finally {
    sim.dispose();
  }
});

it("rolls along its yaw heading when the car comes close", () => {
  const sim = fixture("Boulder Roll");
  try {
    const m = sim.dungeon.mechanisms.find((m) => m.h.kind === "boulder")!;
    sim.body.setTranslation({ x: 0, y: 2.1, z: 50 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    sim.step({});
    expect(m.triggered).toBe(true);
    const v = m.body!.linvel();
    expect(Math.hypot(v.x, v.z)).toBeGreaterThan(15);
    expect(v.z).toBeGreaterThan(15);
    expect(Math.abs(v.x)).toBeLessThan(1);
  } finally {
    sim.dispose();
  }
});

it("wrecks a truck it catches and reports the hit", () => {
  const sim = fixture("Boulder Kill");
  try {
    const m = sim.dungeon.mechanisms.find((m) => m.h.kind === "boulder")!;
    sim.body.setTranslation({ x: 0, y: 2.1, z: 70 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    sim.run(3, { brake: 1 });
    expect(m.triggered).toBe(true);
    expect(m.contacts).toBeGreaterThan(0);
    expect(
      sim.damageEvents.filter((e) => e.source === "boulder"),
    ).not.toHaveLength(0);
    expect(sim.status).toBe("wrecked");
  } finally {
    sim.dispose();
  }
});

it("builds a labelled rock ball headlessly", () => {
  const model = buildDungeonModel({
    id: "test-boulder",
    kind: "boulder",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.triangles).toBeGreaterThan(200);
  const sprites = model.root.children.filter(
    (c): c is T.Sprite => c instanceof T.Sprite,
  );
  expect(sprites).toHaveLength(1);
  expect(drawn).toContain("BOULDER DASH");
});
