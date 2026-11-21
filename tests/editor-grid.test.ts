import { expect, it } from "vitest";
import { EditorStore } from "../src/editor-state";
import { buildWorldGrid, DEFAULT_EDITOR_GRID } from "../src/editor-grid";
import * as T from "three";

it("defaults to five units, snaps each selected solid/prefab independently, and undoes together", () => {
  const store = new EditorStore("Grid");
  expect(store.grid.spacing).toBe(5);
  const a = store.addSolid("barrier"), b = store.addPrefab("barrel");
  Object.assign(a, { x: 6.2, y: 2.4, z: -8.1 }); Object.assign(b, { x: -6.1, y: 7.8, z: 11 });
  store.select({ kind: "solid", id: a.id }); store.select({ kind: "prefab", id: b.id }, true);
  store.snapSelectedToGrid();
  expect(a).toMatchObject({ x: 5, y: 0, z: -10 }); expect(b).toMatchObject({ x: -5, y: 10, z: 10 });
  store.undo(); expect(store.level.solids.find(s => s.id === a.id)?.x).toBe(6.2);
});
it("snaps only requested axes, validates spacing, and never moves locked objects", () => {
  const store = new EditorStore("Grid"); const a = store.addSolid("barrier");
  Object.assign(a, { x: 6.2, y: 2.4, z: -8.1 });
  store.updateGrid({ spacing: 2 }); store.snapSelectedToGrid(["x"]);
  expect(a).toMatchObject({ x: 6, y: 2.4, z: -8.1 });
  store.snapSelectedToGrid(["y", "z"]); expect(a).toMatchObject({ y: 2, z: -8 });
  for (const spacing of [0, -1, NaN, Infinity]) store.updateGrid({ spacing });
  expect(store.grid.spacing).toBe(2);
  store.setLocked({ kind: "solid", id: a.id }, true); store.select({ kind: "solid", id: a.id }, false, true);
  store.updateGrid({ spacing: 5 }); store.snapSelectedToGrid(); expect(a.x).toBe(6);
});
it("drag snapping uses original positions so Control bypass returns to smooth movement", () => {
  const store = new EditorStore("Grid"); const a = store.addSolid("barrier");
  Object.assign(a, { x: 1.3, y: 2.1, z: 3.7 }); const origin = store.selectionPositions();
  store.beginGesture(); store.moveSelectedFrom(origin, { x: 2, z: 3 }, true);
  expect(a).toMatchObject({ x: 5, y: 0, z: 5 });
  store.moveSelectedFrom(origin, { x: 2.2, z: 3.1 }, false);
  expect(a.x).toBeCloseTo(3.5); expect(a.y).toBeCloseTo(2.1); expect(a.z).toBeCloseTo(6.8);
  store.endGesture(); store.undo(); expect(store.level.solids.find(s => s.id === a.id)?.x).toBe(1.3);
});
it("renders bounded, distinct axis colors at the chosen world spacing", () => {
  const grid = buildWorldGrid({ ...DEFAULT_EDITOR_GRID, spacing: 2, y: true });
  const colors = new Set<number>(); let vertices = 0;
  for (const child of grid.children as T.LineSegments<T.BufferGeometry, T.LineBasicMaterial>[]) {
    colors.add(child.material.color.getHex());
    const positions = child.geometry.getAttribute("position"); vertices += positions.count;
    for (const value of positions.array) expect(value / 2).toBeCloseTo(Math.round(value / 2));
  }
  expect(colors.size).toBe(3); expect(vertices).toBeLessThan(1000);
});
