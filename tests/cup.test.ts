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

it("registers the squish cup as a striking trap", () => {
  for (const list of [PREFAB_KINDS, DUNGEON_PREFAB_KINDS])
    expect(list).toContain("cup");
  expect(DUNGEON_STRIKE.cup.radius).toBeGreaterThanOrEqual(6);
  expect(DUNGEON_STRIKE.cup.slam).toBeGreaterThan(0);
});

it("builds a slamming cup model headlessly", () => {
  const model = buildDungeonModel({
    id: "test-cup",
    kind: "cup",
    x: 0,
    z: 0,
    phase: 0,
  });
  expect(model.pivots).toHaveLength(1);
  expect(model.triangles).toBeGreaterThan(0);
  let cylinders = 0;
  model.pivots[0].traverse((o) => {
    if (o instanceof T.Mesh && o.geometry instanceof T.CylinderGeometry)
      cylinders++;
  });
  expect(cylinders).toBeGreaterThan(0);
  expect(model.pivots[0].position.y).toBeGreaterThan(4);
});
