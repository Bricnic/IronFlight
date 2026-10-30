import { expect, it } from "vitest";
import { EditorStore } from "../src/editor-state";

it("undoes and redoes solid add/update/delete", () => {
  const store = new EditorStore("undo-basic");
  expect(store.canUndo).toBe(false);
  expect(store.canRedo).toBe(false);
  const solid = store.addSolid("barrier");
  expect(store.level.solids).toHaveLength(3);
  expect(store.canUndo).toBe(true);
  store.updateSelected({ x: 42 });
  expect(store.selectedItem()).toMatchObject({
    kind: "solid",
    item: { x: 42 },
  });
  expect(store.undo()).toBe(true);
  expect(store.selectedItem()).toMatchObject({
    kind: "solid",
    item: { id: solid.id },
  });
  expect(
    (store.selectedItem() as { item: { x: number } }).item.x,
  ).not.toBe(42);
  expect(store.undo()).toBe(true);
  expect(store.level.solids).toHaveLength(2);
  expect(store.undo()).toBe(false);
  expect(store.redo()).toBe(true);
  expect(store.level.solids).toHaveLength(3);
  expect(store.redo()).toBe(true);
  expect(store.selectedItem()).toMatchObject({
    kind: "solid",
    item: { x: 42 },
  });
  expect(store.redo()).toBe(false);
});

it("clears redo on a new edit", () => {
  const store = new EditorStore("undo-branch");
  store.addSolid("barrier");
  store.addSolid("ramp");
  expect(store.undo()).toBe(true);
  expect(store.canRedo).toBe(true);
  store.addPrefab("barrel");
  expect(store.canRedo).toBe(false);
  expect(store.redo()).toBe(false);
});

it("keeps a rolling buffer of the latest 100 changes", () => {
  const store = new EditorStore("undo-cap");
  for (let i = 1; i <= 101; i++) store.updateName(`n${i}`);
  expect(store.level.name).toBe("n101");
  for (let i = 0; i < 100; i++) expect(store.undo()).toBe(true);
  // The oldest change (blank -> n1) was evicted, so undo stops at n1.
  expect(store.level.name).toBe("n1");
  expect(store.undo()).toBe(false);
  for (let i = 0; i < 100; i++) expect(store.redo()).toBe(true);
  expect(store.level.name).toBe("n101");
  expect(store.redo()).toBe(false);
});

it("undo keeps the level dirty and restores selection", () => {
  const store = new EditorStore("undo-dirty");
  const solid = store.addSolid("barrier");
  store.markSaved();
  expect(store.dirty).toBe(false);
  store.updateSelected({ x: 7 });
  store.select(null);
  expect(store.undo()).toBe(true);
  expect(store.dirty).toBe(true);
  expect(store.selection).toEqual({ kind: "solid", id: solid.id });
});

it("opening a level clears history; selection-only moves are not changes", () => {
  const store = new EditorStore("undo-open");
  store.addSolid("barrier");
  store.select(null);
  store.setTool("pan");
  store.setPreview(true);
  expect(store.canUndo).toBe(true);
  store.openLevel(store.level);
  expect(store.canUndo).toBe(false);
  expect(store.canRedo).toBe(false);
  store.openBlank("fresh");
  expect(store.canUndo).toBe(false);
});
