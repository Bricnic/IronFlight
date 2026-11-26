import { expect, it } from "vitest";
import { EditorStore } from "../src/editor-state";
import {
  blankLevel,
  orderCheckpoints,
  validateCustomLevel,
  type CustomCheckpoint,
  type CustomLevel,
} from "../src/custom-level";

function level(
  checkpoints: CustomCheckpoint[],
  solids: CustomLevel["solids"] = [],
): CustomLevel {
  return {
    ...blankLevel("Order"),
    spawn: { x: 0, y: 2.1, z: -40, yaw: 0 },
    checkpoints,
    solids,
  };
}

function road(id: string, x: number, z: number, w: number, d: number, yaw = 0) {
  return { id, kind: "road" as const, x, y: 0.015, z, w, h: 0.03, d, yaw, color: 1 };
}

const xs = (cs: CustomCheckpoint[]) => cs.map((c) => c.x);

it("follows the road even when an off-road checkpoint is closer", () => {
  // Road up the middle; B is closer to spawn but off the asphalt.
  const A = { x: 0, z: 50 };
  const B = { x: 15, z: 20 };
  const ordered = orderCheckpoints(
    level([B, A], [road("r", 0, 10, 20, 100)]),
  );
  expect(ordered.map((c) => c.z)).toEqual([50, 20]);
  expect(ordered[0]).toBe(A);
  expect(ordered[1]).toBe(B);
});

it("chains consecutive checkpoints along one road", () => {
  const cps = [{ x: 0, z: 90 }, { x: 0, z: 30 }, { x: 0, z: 60 }];
  const ordered = orderCheckpoints(
    level(cps, [road("r", 0, 50, 20, 140)]),
  );
  expect(ordered.map((c) => c.z)).toEqual([30, 60, 90]);
});

it("falls back to nearest-first with no roads", () => {
  const cps = [{ x: 60, z: 0 }, { x: 10, z: 0 }, { x: 30, z: 0 }];
  const ordered = orderCheckpoints(level(cps));
  expect(xs(ordered)).toEqual([10, 30, 60]);
});

it("starts the chain at the spawn, not the array head", () => {
  const cps = [{ x: 0, z: 100 }, { x: 0, z: -30 }];
  const ordered = orderCheckpoints(level(cps));
  expect(ordered.map((c) => c.z)).toEqual([-30, 100]);
});

it("pins explicit numbers and clamps out-of-range ones", () => {
  const a = { x: 0, z: 10 };
  const b = { x: 0, z: 20, order: 1 };
  const c = { x: 0, z: 30, order: 99 };
  const ordered = orderCheckpoints(level([a, b, c]));
  expect(ordered[0]).toBe(b);
  expect(ordered[2]).toBe(c);
  expect(xs(ordered)).toEqual([0, 0, 0]);
});

it("shifts later pins down on explicit collisions", () => {
  const a = { x: 0, z: 10, order: 1 };
  const b = { x: 0, z: 20, order: 1 };
  const c = { x: 0, z: 30 };
  const ordered = orderCheckpoints(level([c, a, b]));
  expect(ordered[0]).toBe(a);
  expect(ordered[1]).toBe(b);
  expect(ordered[2]).toBe(c);
});

it("always orders the finish line last", () => {
  const a = { x: 0, z: 10 };
  const b = { x: 0, z: 20, finish: true };
  const c = { x: 0, z: 30 };
  const ordered = orderCheckpoints(level([b, a, c]));
  expect(ordered[2]).toBe(b);
  expect(ordered.map((d) => d.z)).toEqual([10, 30, 20]);
});

it("normalizes multiple finish flags to the first", () => {
  const a = { x: 0, z: 10, finish: true };
  const b = { x: 0, z: 20, finish: true };
  const ordered = orderCheckpoints(level([a, b]));
  expect(ordered[1]).toBe(a);
  expect(b.finish).toBeUndefined();
});

it("keeps names and yaw untouched while reordering", () => {
  const a = { x: 0, z: 50, name: "Loop", yaw: 1 };
  const b = { x: 0, z: 10 };
  const ordered = orderCheckpoints(level([a, b]));
  expect(ordered[1]).toBe(a);
  expect(ordered[1].name).toBe("Loop");
  expect(ordered[1].yaw).toBe(1);
});

it("validates order and finish fields", () => {
  const base = blankLevel("Validate");
  expect(() =>
    validateCustomLevel({ ...base, checkpoints: [{ x: 0, z: 10, order: 2 }] }),
  ).not.toThrow();
  expect(() =>
    validateCustomLevel({ ...base, checkpoints: [{ x: 0, z: 10, finish: true }] }),
  ).not.toThrow();
  for (const order of [0, -1, 1.5, "2"]) {
    expect(() =>
      validateCustomLevel({ ...base, checkpoints: [{ x: 0, z: 10, order: order as number }] }),
    ).toThrow(/positive integer order/);
  }
  expect(() =>
    validateCustomLevel({ ...base, checkpoints: [{ x: 0, z: 10, finish: "yes" as unknown as boolean }] }),
  ).toThrow(/finish must be a boolean/);
});

it("renumbers on drag end, remaps selection, and undoes as one step", () => {
  const store = new EditorStore("Drag");
  // Blank level: spawn (0,-40), gate (0,40). Add two: newest first.
  const first = store.addCheckpoint(0, 10);
  const second = store.addCheckpoint(0, 70);
  expect(store.level.checkpoints.map((c) => c.z)).toEqual([70, 10, 40]);
  // Drag the middle gate past the far one: nearest-chain flips them.
  store.select({ kind: "checkpoint", index: 1 });
  expect(store.selection).toEqual({ kind: "checkpoint", index: 1 });
  store.beginGesture();
  const origins = store.selectionPositions();
  store.moveSelectedFrom(origins, { x: 0, z: 70 }, false);
  // Mid-drag order is untouched so the drag tracks its target.
  expect(store.level.checkpoints[1]).toBe(first);
  store.endGesture();
  expect(store.level.checkpoints.map((c) => c.z)).toEqual([40, 70, 80]);
  // Selection followed the dragged checkpoint to its new slot.
  expect(store.selection).toEqual({ kind: "checkpoint", index: 2 });
  expect(store.selectedItem()).toMatchObject({ kind: "checkpoint" });
  // One undo restores both the move and the order.
  store.undo();
  expect(store.level.checkpoints.map((c) => c.z)).toEqual([70, 10, 40]);
  expect(store.selection).toEqual({ kind: "checkpoint", index: 1 });
  store.redo();
  expect(store.level.checkpoints.map((c) => c.z)).toEqual([40, 70, 80]);
});

it("keeps the finish exclusive and clears its number", () => {
  const store = new EditorStore("Finish");
  store.addCheckpoint(0, 10);
  store.addCheckpoint(0, 20);
  store.setCheckpointFinish(0, true);
  expect(store.level.checkpoints.at(-1)!.finish).toBe(true);
  expect(store.level.checkpoints.map((c) => c.z)).toEqual([10, 40, 20]);
  store.setCheckpointFinish(1, true);
  expect(store.level.checkpoints.filter((c) => c.finish)).toHaveLength(1);
  expect(store.level.checkpoints.at(-1)!.z).toBe(40);
  // Ticking finish drops a stale explicit number.
  store.select({ kind: "checkpoint", index: 0 });
  store.updateSelected({ order: 1 });
  store.setCheckpointFinish(0, true);
  expect(store.level.checkpoints[2].order).toBeUndefined();
  expect(store.level.checkpoints[2].finish).toBe(true);
  // Unticking returns it to the auto pool without the flag.
  store.setCheckpointFinish(2, false);
  expect(store.level.checkpoints.map((c) => c.z)).toEqual([10, 20, 40]);
  expect(store.level.checkpoints.every((c) => c.finish === undefined)).toBe(true);
});

it("pins checkpoints through the number field and releases on clear", () => {
  const store = new EditorStore("Pin");
  store.addCheckpoint(0, 10);
  store.addCheckpoint(0, 20);
  // Order is [20, 10, 40]; pin the 40-gate (index 2) to slot 1.
  store.select({ kind: "checkpoint", index: 2 });
  store.updateSelected({ order: 1 });
  expect(store.level.checkpoints.map((c) => c.z)).toEqual([40, 10, 20]);
  // Clearing rejoins the auto pool (nearest-chain from spawn).
  store.select({ kind: "checkpoint", index: 0 });
  store.updateSelected({ order: undefined });
  expect(store.level.checkpoints.map((c) => c.z)).toEqual([10, 20, 40]);
});
