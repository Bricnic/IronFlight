import { expect, it } from "vitest";
import { EditorStore } from "../src/editor-state";

it("coalesces a drag gesture into a single undo step", () => {
  const store = new EditorStore("gesture-one-step");
  const solid = store.addSolid("barrier");
  const startX = solid.x;
  store.beginGesture();
  for (let i = 1; i <= 20; i++) store.updateSelected({ x: startX + i });
  store.endGesture();
  expect(store.selectedItem()).toMatchObject({
    kind: "solid",
    item: { x: startX + 20 },
  });
  expect(store.undo()).toBe(true);
  expect(store.selectedItem()).toMatchObject({
    kind: "solid",
    item: { id: solid.id, x: startX },
  });
  // One undo covered the whole gesture: the next undo removes the solid.
  expect(store.undo()).toBe(true);
  expect(store.level.solids).toHaveLength(2);
  expect(store.redo()).toBe(true);
  expect(store.redo()).toBe(true);
  expect(store.selectedItem()).toMatchObject({
    kind: "solid",
    item: { x: startX + 20 },
  });
  expect(store.redo()).toBe(false);
});

it("a gesture with no changes pushes no history", () => {
  const store = new EditorStore("gesture-empty");
  store.addSolid("barrier");
  store.beginGesture();
  store.select(null);
  store.endGesture();
  expect(store.undo()).toBe(true);
  expect(store.level.solids).toHaveLength(2);
  expect(store.undo()).toBe(false);
});

it("nested gestures are safe and endGesture is idempotent", () => {
  const store = new EditorStore("gesture-nested");
  const solid = store.addSolid("barrier");
  const startX = solid.x;
  store.endGesture();
  store.beginGesture();
  store.beginGesture();
  store.updateSelected({ x: 99 });
  store.endGesture();
  store.endGesture();
  store.updateSelected({ x: 100 });
  expect(store.undo()).toBe(true);
  expect(store.selectedItem()).toMatchObject({
    kind: "solid",
    item: { id: solid.id, x: 99 },
  });
  expect(store.undo()).toBe(true);
  expect(store.selectedItem()).toMatchObject({
    kind: "solid",
    item: { id: solid.id, x: startX },
  });
});

it("a gesture after undo branches redo history", () => {
  const store = new EditorStore("gesture-branch");
  store.addSolid("barrier");
  store.addSolid("ramp");
  expect(store.undo()).toBe(true);
  expect(store.canRedo).toBe(true);
  store.beginGesture();
  store.updateSelected({ x: 5 });
  store.endGesture();
  expect(store.canRedo).toBe(false);
});

it("opening a level clears an open gesture", () => {
  const store = new EditorStore("gesture-open");
  const solid = store.addSolid("barrier");
  store.beginGesture();
  store.updateSelected({ x: 5 });
  store.openLevel(store.level);
  expect(store.canUndo).toBe(false);
  expect(store.canRedo).toBe(false);
  store.endGesture();
  store.select({ kind: "solid", id: solid.id });
  store.updateSelected({ x: 6 });
  expect(store.undo()).toBe(true);
});
