import { expect, it } from "vitest";
import {
  EditorStore,
  shouldSyncFromSession,
} from "../src/editor-state";
it("opens a named blank level, clean", () => {
  const store = new EditorStore("Sprint");
  expect(store.level.name).toBe("Sprint");
  expect(store.level.checkpoints.length).toBeGreaterThanOrEqual(1);
  expect(store.level.solids.length).toBeGreaterThanOrEqual(1);
  expect(store.dirty).toBe(false);
  expect(store.selection).toBeNull();
});
it("adds solids with per-kind defaults and unique ids", () => {
  const store = new EditorStore("Box");
  const a = store.addSolid("barrier");
  const b = store.addSolid("barrier");
  expect(a.id).not.toBe(b.id);
  expect(a).toMatchObject({ kind: "barrier", w: 6, h: 1.6, d: 5 });
  expect(b.x).not.toBe(a.x);
  expect(store.selection).toEqual({ kind: "solid", id: b.id });
  expect(store.dirty).toBe(true);
  const ground = store.addSolid("ground");
  expect(ground).toMatchObject({ y: -0.6, w: 200, h: 1.2, d: 200 });
  const ramp = store.addSolid("ramp");
  expect(ramp.angle).toBeCloseTo(-0.124, 3);
});
it("updates and deletes the selection", () => {
  const store = new EditorStore("Edit");
  const solid = store.addSolid("container");
  store.updateSelected({ x: 10, texture: "rock_06" });
  expect(
    store.level.solids.find((s) => s.id === solid.id),
  ).toMatchObject({ x: 10, texture: "rock_06" });
  store.deleteSelected();
  expect(store.level.solids.find((s) => s.id === solid.id)).toBeUndefined();
  expect(store.selection).toBeNull();
  expect(() => store.deleteSelected()).not.toThrow();
  expect(() => store.updateSelected({ x: 1 })).not.toThrow();
});
it("duplicates solids with a fresh id and offset", () => {
  const store = new EditorStore("Dup");
  const solid = store.addSolid("barrier");
  store.updateSelected({ x: 4, z: 6 });
  const copy = store.duplicateSelected();
  expect(copy && "id" in copy && copy.id).not.toBe(solid.id);
  expect(copy).toMatchObject({ kind: "barrier", x: 6, z: 6 });
  expect(store.selection).toEqual({
    kind: "solid",
    id: (copy as { id: string }).id,
  });
});
it("manages prefabs and checkpoints", () => {
  const store = new EditorStore("Props");
  const prefab = store.addPrefab("snowman", 5, 7);
  expect(prefab).toMatchObject({ kind: "snowman", x: 5, z: 7 });
  const cp = store.addCheckpoint(9, 11);
  expect(cp).toMatchObject({ x: 9, z: 11 });
  expect(store.level.checkpoints.length).toBe(2);
  store.select({ kind: "checkpoint", index: 1 });
  store.updateSelected({ z: 12 });
  expect(store.level.checkpoints[1].z).toBe(12);
  store.deleteSelected();
  expect(store.level.checkpoints.length).toBe(1);
  store.select({ kind: "prefab", id: prefab.id });
  const copy = store.duplicateSelected();
  expect(copy && "id" in copy && copy.id).not.toBe(prefab.id);
});
it("edits the spawn point", () => {
  const store = new EditorStore("Spawn");
  store.select({ kind: "spawn" });
  store.updateSelected({ x: 3, yaw: Math.PI });
  expect(store.level.spawn).toMatchObject({ x: 3, yaw: Math.PI });
  expect(store.duplicateSelected()).toBeUndefined();
  expect(() => store.deleteSelected()).not.toThrow();
  expect(store.level.spawn.x).toBe(3);
});
it("tracks dirtiness across edits and saves", () => {
  const store = new EditorStore("Dirty");
  store.updateName("Renamed");
  expect(store.level.name).toBe("Renamed");
  expect(store.dirty).toBe(true);
  store.markSaved();
  expect(store.dirty).toBe(false);
  store.select({ kind: "spawn" });
  expect(store.dirty).toBe(false);
});
it("manages arena targets and clears limits", () => {
  const store = new EditorStore("Arena");
  expect(store.addTarget(4, 5)).toMatchObject({ x: 4, z: 5 });
  expect(store.level.collectibles).toHaveLength(1);
  store.deleteSelected();
  expect(store.level.collectibles).toHaveLength(0);
  store.updateLevel({ mode: "arena", limit: 120 });
  const target = store.addTarget(4, 5);
  expect(target).toMatchObject({ x: 4, z: 5 });
  expect(store.level.collectibles).toHaveLength(1);
  store.updateLevel({ limit: Number.NaN });
  expect(store.level.limit).toBeUndefined();
  store.select({ kind: "target", index: 0 });
  const copy = store.duplicateSelected();
  expect(store.level.collectibles).toHaveLength(2);
  expect(copy).toMatchObject({ x: 6 });
  store.deleteSelected();
  expect(store.level.collectibles).toHaveLength(1);
});
it("renames to blank safely and replaces state on open", () => {
  const store = new EditorStore("A");
  store.addSolid("barrier");
  store.openBlank("B");
  expect(store.level.name).toBe("B");
  expect(store.level.prefabs).toEqual([]);
  expect(store.dirty).toBe(false);
});
it("syncs the store from a live session only when safe", () => {
  expect(shouldSyncFromSession(false, "A", "A")).toBe(true);
  expect(shouldSyncFromSession(true, "A", "A")).toBe(false);
  expect(shouldSyncFromSession(false, "A", "B")).toBe(false);
  expect(shouldSyncFromSession(false, "A", undefined)).toBe(false);
});
it("adds and edits rings, and targets in race mode", () => {
  const store = new EditorStore("Rings");
  const ring = store.addRing(4, 6);
  expect(ring).toMatchObject({ x: 4, z: 6, y: 4, radius: 6, goal: false });
  expect(store.selection).toEqual({ kind: "ring", index: 0 });
  store.updateSelected({ radius: 8, goal: true });
  expect(store.level.rings![0]).toMatchObject({ radius: 8, goal: true });
  const target = store.addTarget(1, 2);
  expect(target).toMatchObject({ x: 1, z: 2 });
  expect(store.level.collectibles).toHaveLength(1);
  store.select({ kind: "ring", index: 0 });
  const copy = store.duplicateSelected();
  expect(copy).toMatchObject({ x: 6 });
  expect(store.level.rings).toHaveLength(2);
  store.deleteSelected();
  expect(store.level.rings).toHaveLength(1);
});
it("toggles textured preview without dirtying the level", () => {
  const store = new EditorStore("Preview");
  expect(store.preview).toBe(false);
  let notified = 0;
  store.onChange(() => notified++);
  store.setPreview(true);
  expect(store.preview).toBe(true);
  expect(notified).toBe(1);
  expect(store.dirty).toBe(false);
  store.setPreview(false);
  expect(store.preview).toBe(false);
  expect(store.dirty).toBe(false);
});
it("switches viewport tools without dirtying the level", () => {
  const store = new EditorStore("Tools");
  expect(store.tool).toBe("select");
  let notified = 0;
  store.onChange(() => notified++);
  store.setTool("pan");
  expect(store.tool).toBe("pan");
  expect(notified).toBe(1);
  expect(store.dirty).toBe(false);
  store.setTool("eyedropper");
  store.setTool("rotator");
  expect(store.tool).toBe("rotator");
  expect(store.dirty).toBe(false);
});
