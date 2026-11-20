import { expect, it } from "vitest";
import { EditorStore } from "../src/editor-state";
import { validateCustomLevel } from "../src/custom-level";

function pair() {
  const s = new EditorStore("Groups");
  const a = s.addSolid("tile", 0, 0);
  const b = s.addPrefab("fragile-ice", 20, 30);
  s.select({ kind: "solid", id: a.id });
  s.select({ kind: "prefab", id: b.id }, true);
  return { s, a, b };
}
it("groups mixed selections, persists, moves and locks the whole group with undo", () => {
  const { s, a, b } = pair();
  const group = s.groupSelected("Ice platform");
  expect(group).toBe("Ice platform");
  expect(a.group).toBe(group); expect(b.group).toBe(group);
  s.select({ kind: "solid", id: a.id });
  const oldX = a.x;
  s.beginGesture(); s.updateSelected({ x: oldX + 4 }); s.updateSelected({ z: 8 }); s.endGesture();
  expect(b).toMatchObject({ x: 24, z: 38 });
  s.undo(); expect(s.level.prefabs[0]).toMatchObject({ x: 20, z: 30 });
  s.redo();
  const restored = validateCustomLevel(JSON.parse(JSON.stringify(s.level)));
  expect(restored.prefabs[0].group).toBe(group);
  s.setLocked({ kind: "prefab", id: b.id }, true);
  expect(s.level.solids.find(p => p.id === a.id)!.locked).toBe(true);
  expect(s.selection).toBeNull();
  s.select({ kind: "solid", id: a.id }); expect(s.selection).toBeNull();
  s.setLocked({ kind: "prefab", id: b.id }, false);
  s.select({ kind: "solid", id: a.id }); s.ungroupSelected();
  expect(s.level.prefabs[0].group).toBeUndefined();
  s.undo(); expect(s.level.prefabs[0].group).toBe(group);
});
it("copies a deep snapshot, pastes fresh groups and ids, and deletes/undoes a whole group", () => {
  const { s, a, b } = pair();
  a.footprint = [{ x: -1, z: -1 }, { x: 1, z: -1 }, { x: 0, z: 1 }];
  s.groupSelected("Patch"); s.copySelected();
  a.color = 123;
  const before = structuredClone(s.level);
  s.paste();
  const copy = s.selectedItem()!.item;
  expect(copy.group).not.toBe("Patch");
  expect(s.selectedEntries()).toHaveLength(2);
  const pastedTile = s.level.solids.at(-1)!;
  expect(pastedTile.id).not.toBe(a.id);
  expect(pastedTile.color).not.toBe(123);
  expect(pastedTile.footprint).not.toBe(a.footprint);
  s.undo(); expect(s.level).toEqual(before); s.redo();
  s.deleteSelected(); expect(s.level.prefabs).toHaveLength(1);
  s.undo(); expect(s.level.prefabs).toHaveLength(2);
  s.paste(); expect(new Set(s.level.prefabs.map(p => p.id)).size).toBe(3);
  expect(new Set(s.level.prefabs.map(p => p.group)).size).toBe(3);
  expect(b.id).toBe(s.level.prefabs[0].id);
});
it("ungrouped multi-selections move together; copying survives a new level", () => {
  const { s, a, b } = pair();
  s.updateSelected({ x: b.x + 5 }); expect(a.x).toBeGreaterThan(5);
  s.copySelected(); s.openBlank("Destination"); s.paste();
  expect(s.level.prefabs).toHaveLength(1);
  expect(s.selectedEntries()).toHaveLength(2);
  expect(s.level.name).toBe("Destination");
});
it("rejects invalid group metadata", () => {
  const { s } = pair();
  s.level.prefabs[0].group = " ";
  expect(() => validateCustomLevel(s.level)).toThrow(/group/);
});
it("rotates a group around the dragged member while preserving relative geometry", () => {
  const { s, a, b } = pair();
  s.groupSelected("Rotating patch"); s.select({ kind: "solid", id: a.id });
  const old = { x: b.x - a.x, z: b.z - a.z };
  s.updateSelected({ yaw: Math.PI / 2 });
  expect(b.x - a.x).toBeCloseTo(old.z);
  expect(b.z - a.z).toBeCloseTo(-old.x);
  expect(b.yaw).toBeCloseTo(Math.PI / 2);
  s.undo(); expect(s.level.prefabs[0].x).toBe(20);
});
it("copies and pastes grouped checkpoints, targets and rings with independent indices", () => {
  const s = new EditorStore("Markers");
  s.addTarget(); s.addRing();
  s.select({ kind: "checkpoint", index: 0 });
  s.select({ kind: "target", index: 0 }, true);
  s.select({ kind: "ring", index: 0 }, true);
  s.groupSelected("Markers"); s.copySelected(); s.paste();
  expect(s.level.checkpoints).toHaveLength(2);
  expect(s.level.collectibles).toHaveLength(2);
  expect(s.level.rings).toHaveLength(2);
  const group = s.level.rings![1].group;
  expect(group).not.toBe("Markers");
  expect(s.level.checkpoints[1].group).toBe(group);
  expect(s.level.collectibles![1].group).toBe(group);
  s.deleteSelected();
  expect(s.level.checkpoints).toHaveLength(1);
  validateCustomLevel(s.level);
});
it("does not merge groups accidentally when a renamed group contains whitespace", () => {
  const { s } = pair(); s.groupSelected("Patch");
  const extra = s.addSolid("tile"); extra.group = "Other";
  s.select({ kind: "solid", id: extra.id });
  expect(() => s.renameGroup(" Patch ")).toThrow(/already exists/);
  expect(extra.group).toBe("Other");
});
it("clipped pieces keep their uncut group members selected and move together", () => {
  const s = new EditorStore("Group clipping");
  const a = s.addSolid("tile");
  const b = s.addSolid("tile", 100, 100);
  s.select({ kind: "solid", id: a.id }); s.select({ kind: "solid", id: b.id }, true); s.groupSelected("Tiles");
  s.startClip(); s.setClipCutters([{ minX: a.x - 2, maxX: a.x + 2, minZ: -2, maxZ: 2 }]);
  expect(s.applyClip()).toBe(true);
  expect(s.selectedEntries()).toHaveLength(5);
  const oldX = b.x;
  s.updateSelected({ x: s.selectedItem()!.item.x + 2 });
  expect(b.x).toBe(oldX + 2);
});
it("starts clipping the solids in a mixed group when its prefab is primary", () => {
  const { s, a } = pair(); s.groupSelected("Mixed");
  s.startClip();
  expect(s.clip?.targets).toEqual([a.id]);
});
