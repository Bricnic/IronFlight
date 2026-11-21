import { expect, it } from "vitest";
import * as T from "three";
import { blankLevel, validateCustomLevel } from "../src/custom-level";
import { EditorStore } from "../src/editor-state";
import { buildEditorLocalLights } from "../src/editor-lighting";
import { prefabLightSettings } from "../src/prefab-lights";

it("supports mixed solid/prefab light bulk edits with undo and persistence", () => {
  const store = new EditorStore("Solid light"); const road = store.addSolid("road"), star = store.addPrefab("gold-star");
  store.select({ kind: "solid", id: road.id }); store.select({ kind: "prefab", id: star.id }, true);
  store.updateSelectionProperties({ lightLumens: 50, lightColor: 0x4ff5e0 });
  expect(road).toMatchObject({ lightLumens: 50, lightColor: 0x4ff5e0 });
  expect(star).toMatchObject({ lightLumens: 50, lightColor: 0x4ff5e0 });
  expect(validateCustomLevel(store.level).solids.find(s => s.id === road.id)).toMatchObject({ lightLumens: 50, lightColor: 0x4ff5e0 });
  store.undo(); expect(store.level.solids.find(s => s.id === road.id)?.lightLumens).toBeUndefined();
});
it("rejects invalid solid light data", () => {
  const level = blankLevel("Invalid light");
  for (const patch of [{ lightLumens: -1 }, { lightLumens: Infinity }, { lightColor: -1 }, { lightColor: 0x1000000 }])
    expect(() => validateCustomLevel({ ...level, solids: [{ ...level.solids[0], ...patch }] })).toThrow(/light/);
});
it("lights solids above their rotated top surface and defaults stars to soft yellow at 300 lumens", () => {
  expect(prefabLightSettings({ kind: "gold-star" })).toMatchObject({ lumens: 300, color: 0xffe6a3 });
  const level = blankLevel("Road light"); level.prefabs = [];
  level.solids = [{ ...level.solids[0], id: "road", kind: "road", x: 10, y: 3, z: 2, h: 2, roll: Math.PI / 2, lightLumens: 50, lightColor: 0x4ff5e0 }];
  const lights = buildEditorLocalLights(level, new T.Vector3());
  expect(lights.inspect()).toHaveLength(1);
  expect(lights.inspect()[0]).toMatchObject({ id: "road", lumens: 50, color: 0x4ff5e0 });
  expect(lights.inspect()[0].position[0]).toBeLessThan(9);
  expect(lights.inspect()[0].position[1]).toBeCloseTo(3);
});
