import { expect, it } from "vitest";
import { resolveViewportPick, resolveViewportStack, ViewportPickCycle, planeHit } from "../src/editor-viewport";

const tagged = (pick: unknown, parent: unknown = null) => ({
  userData: { pick },
  parent,
});
it("builds a unique unlocked selection stack in camera-distance order", () => {
  const front = tagged({ kind: "solid", id: "front" });
  const rear = tagged({ kind: "prefab", id: "rear" });
  const locked = { userData: { pick: { kind: "solid", id: "locked" }, locked: true }, parent: null };
  const stack = resolveViewportStack([
    { object: rear, distance: 12 }, { object: front, distance: 4 },
    { object: { userData: {}, parent: front }, distance: 5 },
    { object: locked, distance: 1 }, { object: rear, distance: 15 },
  ]);
  expect(stack.map((s) => s.selection)).toEqual([{ kind: "solid", id: "front" }, { kind: "prefab", id: "rear" }]);
});
it("cycles logical objects, wraps, and resets for camera/content/area changes", () => {
  const cycle = new ViewportPickCycle();
  const picks = [{ kind: "solid", id: "front" }, { kind: "solid", id: "back" }] as const;
  expect(cycle.next(20, 30, [...picks], "camera-1/level-1")).toEqual(picks[0]);
  expect(cycle.current(21, 30, [...picks], "camera-1/level-1")).toEqual(picks[0]);
  expect(cycle.next(21, 30, [...picks], "camera-1/level-1")).toEqual(picks[1]);
  // Selection highlights can alter mesh distances without changing the stack.
  expect(cycle.next(20, 30, [...picks].reverse(), "camera-1/level-1")).toEqual(picks[0]);
  expect(cycle.next(20, 30, [...picks], "camera-2/level-1")).toEqual(picks[0]);
  expect(cycle.next(20, 30, [...picks], "camera-2/level-2")).toEqual(picks[0]);
  expect(cycle.next(60, 30, [...picks], "camera-2/level-2")).toEqual(picks[0]);
  expect(cycle.next(60, 30, [picks[1]], "camera-2/level-2")).toEqual(picks[1]);
  cycle.reset();
  expect(cycle.current(60, 30, [picks[1]], "camera-2/level-2")).toBeNull();
  expect(cycle.next(60, 30, [], "camera-2/level-2")).toBeNull();
});
it("skips locked objects and their children when picking", () => {
  const locked = {
    userData: { pick: { kind: "solid", id: "wall" }, locked: true },
    parent: null,
  };
  const child = { userData: {}, parent: locked };
  expect(resolveViewportPick([{ object: locked }, { object: child }])).toBeNull();
  expect(resolveViewportPick([
    { object: child }, { object: tagged({ kind: "prefab", id: "axe" }) },
  ])).toEqual({ kind: "prefab", id: "axe" });
  locked.userData.locked = false;
  expect(resolveViewportPick([{ object: child }])).toEqual({ kind: "solid", id: "wall" });
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
