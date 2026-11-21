import { expect, it } from "vitest";
import { Vector3 } from "three";
import { chooseResizeHandle, resizeBox } from "../src/editor-resize";
import { EditorStore } from "../src/editor-state";
const box = { x: 0, y: 0, z: 0, w: 10, h: 6, d: 8 };
it("scales a mixed selection with default prefab heights as one undoable gesture", () => {
  const store = new EditorStore("Resize group");
  const ghost = store.addPrefab("ghost");
  const balloon = store.addPrefab("hot-air-balloon");
  delete ghost.y; delete balloon.y;
  store.select({ kind: "prefab", id: ghost.id });
  store.select({ kind: "prefab", id: balloon.id }, true);
  store.beginGesture();
  store.scaleSelected(2, { x: 0, y: 0, z: 0 });
  store.scaleSelected(1.5, { x: 0, y: 0, z: 0 });
  store.endGesture();
  expect(store.level.prefabs.map(p => [p.y, p.resizeScale])).toEqual([[9, 3], [126, 3]]);
  store.undo();
  expect(store.level.prefabs.map(p => p.resizeScale)).toEqual([undefined, undefined]);
});
it("selects the nearest edge or corner on the clicked face", () => {
  expect(chooseResizeHandle(box, new Vector3(4.9, 3, 3.8), new Vector3(0, 1, 0))).toEqual({ x: 1, y: 0, z: 1 });
  expect(chooseResizeHandle(box, new Vector3(0, 3, -3.8), new Vector3(0, 1, 0))).toEqual({ x: 0, y: 0, z: -1 });
  expect(chooseResizeHandle(box, new Vector3(5, 0, 3.9), new Vector3(1, 0, 0))).toEqual({ x: 0, y: 0, z: 1 });
});
it("selects one nearest edge at the face center rather than inventing a distant corner", () => {
  const h = chooseResizeHandle(box, new Vector3(0, 3, 0), new Vector3(0, 1, 0));
  expect(Math.abs(h.x) + Math.abs(h.y) + Math.abs(h.z)).toBe(1);
});
it("uses physical edge distance on long narrow faces", () => {
  const narrow = { ...box, w: 100, d: 2 };
  expect(chooseResizeHandle(narrow, new Vector3(0, 3, 0), new Vector3(0, 1, 0))).toEqual({ x: 0, y: 0, z: 1 });
});
it("moves a selected edge while fixing the opposite edge and clamps before inversion", () => {
  expect(resizeBox(box, { x: 1, y: 0, z: 0 }, new Vector3(9, 0, 0))).toMatchObject({ x: 2, w: 14, y: 0, h: 6 });
  const shrunk = resizeBox(box, { x: -1, y: 0, z: 0 }, new Vector3(20, 0, 0));
  expect(shrunk.w).toBeGreaterThan(0);
  expect(shrunk.x + shrunk.w / 2).toBeCloseTo(5);
});
