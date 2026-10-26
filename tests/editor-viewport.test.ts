import { expect, it } from "vitest";
import { resolveViewportPick, planeHit } from "../src/editor-viewport";

const tagged = (pick: unknown, parent: unknown = null) => ({
  userData: { pick },
  parent,
});
it("resolves viewport picks by walking to tagged ancestors", () => {
  const solid = tagged({ kind: "solid", id: "barrier-3" });
  const child = { userData: {}, parent: solid };
  expect(resolveViewportPick([{ object: child }])).toEqual({
    kind: "solid",
    id: "barrier-3",
  });
  expect(
    resolveViewportPick([
      { object: tagged({ kind: "prefab", id: "snow-1" }) },
    ]),
  ).toEqual({ kind: "prefab", id: "snow-1" });
  expect(
    resolveViewportPick([
      { object: tagged({ kind: "checkpoint", index: 2 }) },
    ]),
  ).toEqual({ kind: "checkpoint", index: 2 });
  expect(
    resolveViewportPick([{ object: tagged({ kind: "target", index: 0 }) }]),
  ).toEqual({ kind: "target", index: 0 });
  expect(resolveViewportPick([{ object: tagged({ kind: "spawn" }) }])).toEqual({
    kind: "spawn",
  });
});
it("ignores untagged hits and empty rays", () => {
  expect(resolveViewportPick([])).toBe(null);
  expect(
    resolveViewportPick([{ object: { userData: {}, parent: null } }]),
  ).toBe(null);
  expect(
    resolveViewportPick([
      { object: { userData: {}, parent: null } },
      { object: tagged({ kind: "solid", id: "ground" }) },
    ]),
  ).toEqual({ kind: "solid", id: "ground" });
});
it("intersects drag rays with the grab-height plane", () => {
  expect(
    planeHit({ x: 0, y: 10, z: 0 }, { x: 0, y: -1, z: 0 }, 1.5),
  ).toMatchObject({ x: 0, z: 0 });
  expect(
    planeHit({ x: 4, y: 6, z: -8 }, { x: 0, y: -0.6, z: 0.8 }, 0),
  ).toMatchObject({ x: 4, z: 0 });
  expect(planeHit({ x: 0, y: 10, z: 0 }, { x: 1, y: 0, z: 0 }, 0)).toBe(null);
  expect(planeHit({ x: 0, y: 10, z: 0 }, { x: 0, y: 1, z: 0 }, 0)).toBe(null);
});
