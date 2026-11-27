import { expect, it } from "vitest";
import {
  EditorStore,
  shouldSyncFromSession,
  type EditorSelection,
} from "../src/editor-state";
import { validateCustomLevel } from "../src/custom-level";

it("names every object type, persists names and supports rename undo/redo", () => {
  const store = new EditorStore("Named objects");
  const p = store.addPrefab("sign"); store.addTarget(); store.addRing();
  const selections: EditorSelection[] = [
    { kind: "solid", id: "ground" }, { kind: "prefab", id: p.id },
    { kind: "checkpoint", index: 0 }, { kind: "target", index: 0 },
    { kind: "ring", index: 0 }, { kind: "spawn" },
  ];
  selections.forEach((selection, i) => { store.select(selection); store.renameSelected(`  Object ${i}  `); });
  const restored = new EditorStore("Restored");
  restored.openLevel(validateCustomLevel(JSON.parse(JSON.stringify(store.level))));
  selections.forEach((selection, i) => expect(restored.selectedItem(selection)?.item.name).toBe(`Object ${i}`));
  restored.select({ kind: "solid", id: "ground" });
  restored.renameSelected("Zebra ground"); restored.undo();
  expect(restored.selectedItem()?.item.name).toBe("Object 0");
  restored.redo(); expect(restored.selectedItem()?.item.name).toBe("Zebra ground");
  restored.renameSelected(" "); expect(restored.selectedItem()?.item.name).toBeUndefined();
  expect(() => restored.renameSelected("x".repeat(81))).toThrow(/80/);
  expect(() => validateCustomLevel({ ...store.level, spawn: { ...store.level.spawn, name: 7 } })).toThrow(/name must/);
});

it("persists locks for every object kind and unlocks selection with undo/redo", () => {
  const store = new EditorStore("Locked Objects");
  const prefab = store.addPrefab("axe");
  store.addTarget();
  store.addRing();
  const selections: EditorSelection[] = [
    { kind: "solid", id: "ground" },
    { kind: "prefab", id: prefab.id },
    { kind: "checkpoint", index: 0 },
    { kind: "target", index: 0 },
    { kind: "ring", index: 0 },
    { kind: "spawn" },
  ];
  for (const selection of selections) {
    store.select(selection);
    store.setLocked(selection, true);
    expect(store.selection).toBeNull();
    store.select(selection);
    expect(store.selection).toBeNull();
  }
  const restored = new EditorStore("Restored");
  restored.openLevel(validateCustomLevel(JSON.parse(JSON.stringify(store.level))));
  for (const selection of selections) {
    expect(restored.selectedItem(selection)?.item.locked).toBe(true);
    restored.select(selection);
    expect(restored.selection).toBeNull();
    restored.setLocked(selection, false);
    restored.select(selection);
    expect(restored.selection).toEqual(selection);
    expect(restored.selectedItem()?.item.locked).toBe(false);
    restored.undo();
    expect(restored.selectedItem(selection)?.item.locked).toBe(true);
    expect(restored.selection).toBeNull();
    restored.redo();
    restored.select(selection);
    expect(restored.selection).toEqual(selection);
    restored.select(null);
  }
});

it("rejects invalid lock metadata and keeps older unlocked levels compatible", () => {
  const store = new EditorStore("Old Level");
  const old = validateCustomLevel(store.level);
  expect(old.solids[0].locked).toBeUndefined();
  store.select({ kind: "solid", id: "ground" });
  expect(store.selection).toEqual({ kind: "solid", id: "ground" });
  expect(() => validateCustomLevel({
    ...old, spawn: { ...old.spawn, locked: "yes" },
  })).toThrow(/locked must be a boolean/);
});
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
it("materializes painted roads snapped to the ground and clipped in one undo step", () => {
  const store = new EditorStore("Paint");
  const before = store.level.solids.length;
  const { pieces, issues } = store.materializeRoads([
    { x: 0, z: -20, yaw: 0, w: 10, d: 30 },
    { x: 0, z: 0, yaw: 0, w: 10, d: 30 },
  ]);
  expect(issues).toBe(0);
  expect(pieces).toBeGreaterThan(0);
  expect(store.level.solids.length).toBeGreaterThan(before);
  const fresh = store.level.solids.slice(before);
  for (const s of fresh) {
    expect(s.kind).toBe("road");
    expect(s.w).toBeLessThanOrEqual(10);
    expect(s.y).toBeCloseTo(0.045, 3);
  }
  // Footprints no longer overlap each other.
  for (let i = 0; i < fresh.length; i++)
    for (let j = i + 1; j < fresh.length; j++) {
      const a = fresh[i], b = fresh[j];
      const overlap =
        Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
      if (overlap > 0.05) {
        const zOverlap =
          Math.min(a.z + a.d / 2, b.z + b.d / 2) - Math.max(a.z - a.d / 2, b.z - b.d / 2);
        expect(zOverlap).toBeLessThanOrEqual(0.05);
      }
    }
  store.undo();
  expect(store.level.solids.length).toBe(before);
  expect(store.materializeRoads([])).toEqual({ pieces: 0, issues: 0 });
});
it("creates solids and prefabs at an explicit 3D location in one undoable operation", () => {
  const store = new EditorStore("View placement");
  const position = { x: 123, y: 27, z: -81 };
  const solid = store.addSolid("barrier", position);
  expect(solid).toMatchObject({ ...position, w: 6, h: 1.6, d: 5 });
  expect(store.addSolid("barrier", position)).toMatchObject(position);
  store.undo(); expect(store.level.solids.some(s => s.id === solid.id)).toBe(true);
  store.undo(); expect(store.level.solids.some(s => s.id === solid.id)).toBe(false);
  store.redo(); expect(store.level.solids.find(s => s.id === solid.id)).toMatchObject(position);
  const overRoad = { x: 10, y: 27, z: -8 };
  const prefab = store.addPrefab("birthday-candle", overRoad);
  expect(prefab).toMatchObject({ x: 10, z: -8, y: 0.03, resizeScale: 3 });
  store.undo(); expect(store.level.prefabs.some(p => p.id === prefab.id)).toBe(false);
  store.redo(); expect(store.level.prefabs.find(p => p.id === prefab.id)).toMatchObject({ x: 10, z: -8, y: 0.03 });
  const fairy = store.addPrefab("cave-fairy", overRoad);
  expect(fairy.y).toBeCloseTo(3.03, 5);
  expect(store.addPrefab("barrel", position).y).toBeCloseTo(27.8, 5);
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
  // Auto-numbering: the new checkpoint is #1; the old one shifts to #2.
  expect(store.level.checkpoints[0]).toBe(cp);
  expect(store.selection).toEqual({ kind: "checkpoint", index: 0 });
  // New checkpoints leave yaw undefined (automatic) until set explicitly.
  expect(store.level.checkpoints[0].yaw).toBeUndefined();
  const stacked = new EditorStore("Stacked");
  expect(stacked.addCheckpoint(0, 40).yaw).toBeUndefined();
  store.select({ kind: "checkpoint", index: 0 });
  store.updateSelected({ z: 12 });
  expect(store.level.checkpoints[0].z).toBe(12);
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
  expect(target).toMatchObject({ x: 1, y: 1.7, z: 2 });
  store.updateSelected({ y: 5 });
  expect(store.level.collectibles![0].y).toBe(5);
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
