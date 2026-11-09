import { beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import {
  DUNGEON_PREFAB_KINDS,
  PREFAB_KINDS,
} from "../src/custom-level";
import { DUNGEON_STRIKE } from "../src/dungeon-hazards";
import { buildDungeonModel } from "../src/dungeon-view";

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

it("registers the bag clip as a lethal timed trap", () => {
  for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS])
    expect(list).toContain("clip");
  expect(DUNGEON_STRIKE.clip.radius).toBeGreaterThanOrEqual(6);
  expect(DUNGEON_STRIKE.clip.slam).toBeGreaterThan(0);
});

it("builds a flat-closing metal clip model headlessly", () => {
  const model = buildDungeonModel({
    id: "test-clip",
    kind: "clip",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.pivots).toHaveLength(1);
  expect(model.triangles).toBeGreaterThan(100);
  let meshes = 0;
  let labels = 0;
  model.root.traverse((o) => {
    if (o instanceof T.Mesh) meshes++;
    if (o instanceof T.Sprite) labels++;
  });
  expect(meshes).toBeGreaterThanOrEqual(3);
  expect(labels).toBe(1);
  // Closed flat: the jaw pivot rests low enough to drive over.
  expect(model.pivots[0].position.y).toBeLessThan(2);
});
