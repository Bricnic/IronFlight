import { expect, it } from "vitest";
import { EditorStore } from "../src/editor-state";
import { commonProperty, editableProperties, objectKindKey } from "../src/editor-properties";

it("selects exactly the same kind, skipping locked objects and other kinds", () => {
  const s = new EditorStore("Bulk");
  const a = s.addPrefab("birthday-candle"), b = s.addPrefab("birthday-candle"), c = s.addPrefab("candle");
  s.addPrefab("birthday-candle").locked = true;
  s.select({ kind: "prefab", id: a.id }); s.selectAllOfKind();
  expect(s.selectedEntries()).toEqual([{ kind: "prefab", id: a.id }, { kind: "prefab", id: b.id }]);
  expect(objectKindKey(s.selectedItem({ kind: "prefab", id: c.id })!)).toBe("prefab:candle");
});
it("bulk edits absolute values, leaves other properties alone, and undoes once", () => {
  const s = new EditorStore("Bulk");
  const a = s.addSolid("tile", 10, 20), b = s.addSolid("tile", 30, 40);
  const before = [a.x, b.x];
  s.select({ kind: "solid", id: a.id }); s.select({ kind: "solid", id: b.id }, true);
  s.updateSelectionProperties({ x: 7, yaw: Math.PI / 4, color: 0x123456 });
  s.updateSelectionProperties({ x: 7, yaw: Math.PI / 4, color: 0x123456 });
  expect(s.level.solids.slice(-2).map(p => [p.x, p.z, p.yaw, p.color])).toEqual([[7, 20, Math.PI / 4, 0x123456], [7, 40, Math.PI / 4, 0x123456]]);
  s.undo(); expect(s.level.solids.slice(-2).map(p => p.x)).toEqual(before);
});
it("reports shared defaults and mixed values and limits mixed selections to shared fields", () => {
  const s = new EditorStore("Bulk"); const a = s.addSolid("tile", 10), b = s.addPrefab("birthday-candle", 20);
  s.select({ kind: "solid", id: a.id }); s.select({ kind: "prefab", id: b.id }, true);
  const items = s.selectedEntries().map(e => s.selectedItem(e)!);
  expect(commonProperty(items, "yaw", s.level)).toEqual({ mixed: false, value: 0 });
  expect(commonProperty(items, "x", s.level).mixed).toBe(true);
  expect(editableProperties(items).map(p => p.key)).toEqual(["x", "y", "z", "yaw"]);
});
it("locks/unlocks the whole selection from the inspector without losing it", () => {
  const s = new EditorStore("Bulk"); const a = s.addPrefab("candle"), b = s.addPrefab("candle");
  s.select({ kind: "prefab", id: a.id }); s.select({ kind: "prefab", id: b.id }, true);
  s.setSelectionLocked(true); expect(s.selectedEntries()).toHaveLength(2);
  s.updateSelectionProperties({ x: 99 }); expect(a.x).toBe(0); expect(b.x).toBe(0);
  s.setSelectionLocked(false); s.updateSelectionProperties({ x: 99 }); expect(a.x).toBe(99); expect(b.x).toBe(99);
});
it("selects solid kinds independently and preserves group locking in a single undo", () => {
  const s = new EditorStore("Bulk");
  s.level.solids = [];
  const a = s.addSolid("tile"), b = s.addPrefab("fragile-ice"), c = s.addSolid("tile");
  a.group = b.group = "Platform";
  s.select({ kind: "solid", id: a.id }); s.selectAllOfKind();
  expect(s.selectedEntries()).toHaveLength(2);
  s.setSelectionLocked(true); expect([a.locked, b.locked, c.locked]).toEqual([true, true, true]);
  s.undo(); expect(s.level.prefabs[0].locked).toBeUndefined(); expect(s.selectedEntries()).toHaveLength(2);
  s.redo(); expect(s.selectedEntries()).toHaveLength(2);
  expect([...s.level.solids, ...s.level.prefabs].every(item => item.locked)).toBe(true);
});
it("selects every pasted object after switching from a mixed clipboard to kind selection", () => {
  const s = new EditorStore("Bulk");
  const solid = s.addSolid("tile"), prefab = s.addPrefab("birthday-candle");
  s.select({ kind: "solid", id: solid.id }); s.select({ kind: "prefab", id: prefab.id }, true); s.copySelected();
  s.selectAllOfKind(); s.paste();
  expect(s.selectedEntries()).toHaveLength(2);
  expect(new Set(s.selectedEntries().map(e => e.kind))).toEqual(new Set(["solid", "prefab"]));
});
