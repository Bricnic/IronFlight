import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import { Quaternion } from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  COMIC_PREFAB_KINDS,
  PREFAB_KINDS,
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import { buildComicModel } from "../src/comic-view";

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

function fixture(name: string) {
  const level = blankLevel(name);
  level.prefabs = [{ id: "sharks", kind: "shark-pool", x: 0, z: 60 }];
  level.spawn = { x: 0, y: 2.1, z: -20, yaw: 0 };
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

it("registers the shark pool as a comic hazard prefab", () => {
  for (const list of [PREFAB_KINDS, COMIC_PREFAB_KINDS])
    expect(list).toContain("shark-pool");
});

it("shares the water crossing geometry: basin, rails, walls, boost sensor", () => {
  const sim = fixture("Shark Pool Geometry");
  try {
    const m = sim.comic.mechanisms.find((m) => m.h.kind === "shark-pool")!;
    expect(m).toBeTruthy();
    expect(m.colliders).toHaveLength(7);
    expect(m.sensors).toHaveLength(2);
  } finally {
    sim.dispose();
  }
});

it("wrecks slow swimmers fast and reports the shark attack", () => {
  const sim = fixture("Shark Pool Sink");
  try {
    const m = sim.comic.mechanisms.find((m) => m.h.kind === "shark-pool")!;
    sim.body.setTranslation({ x: 0, y: 2.1, z: 60 }, true);
    sim.body.setRotation(new Quaternion(), true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    sim.run(3, {});
    expect(m.contacts).toBeGreaterThan(0);
    expect(
      sim.damageEvents.filter((e) => e.source === "shark-pool"),
    ).not.toHaveLength(0);
    expect(sim.status).toBe("wrecked");
  } finally {
    sim.dispose();
  }
});

it("lets a 200+ mph skimmer cross without damage", () => {
  const sim = fixture("Shark Pool Skim");
  try {
    sim.body.setTranslation({ x: 0, y: 2.1, z: 30 }, true);
    sim.body.setRotation(new Quaternion(), true);
    sim.body.setLinvel({ x: 0, y: 0, z: 60 }, true);
    sim.run(2, { throttle: 1 });
    expect(sim.body.translation().z).toBeGreaterThan(75);
    expect(
      sim.damageEvents.filter((e) => e.source === "shark-pool"),
    ).toHaveLength(0);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("builds a bloody pool with three circling fins headlessly", () => {
  const model = buildComicModel({
    id: "test-sharks",
    kind: "shark-pool",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.fins).toBeDefined();
  const fins = model.fins!.children.filter(
    (o): o is T.Mesh => o instanceof T.Mesh,
  );
  expect(fins).toHaveLength(3);
  expect(model.triangles).toBeGreaterThan(500);
  const sprites = model.root.children.filter(
    (c): c is T.Sprite => c instanceof T.Sprite,
  );
  expect(sprites).toHaveLength(1);
});
