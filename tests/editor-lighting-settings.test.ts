import { expect, it } from "vitest";
import { blankLevel, validateCustomLevel } from "../src/custom-level";
import { isPermanentNight, levelWeather } from "../src/weather";
import { EditorStore } from "../src/editor-state";
import * as T from "three";
import { buildEditorLocalLights } from "../src/editor-lighting";

it("persists false as well as true lighting settings and rejects invalid values", () => {
  for (const value of [false, true]) {
    const level = { ...blankLevel("Lighting"), forceNight: value, previewGameLighting: value };
    expect(validateCustomLevel(level)).toMatchObject({ forceNight: value, previewGameLighting: value });
  }
  expect(() => validateCustomLevel({ ...blankLevel("Lighting"), forceNight: "yes" })).toThrow("forceNight must be a boolean");
});
it("can inspect a locked selection without unlocking or allowing edits, and can undo lighting changes", () => {
  const store = new EditorStore("Controls");
  const pick = { kind: "solid", id: "ground" } as const;
  store.setLocked(pick, true);
  store.select(pick, false, true);
  expect(store.selection).toEqual(pick);
  const x = store.level.solids[0].x;
  store.updateSelected({ x: 123 });
  expect(store.level.solids[0].x).toBe(x);
  expect(store.level.solids[0].locked).toBe(true);
  store.updateLevel({ forceNight: false, previewGameLighting: true });
  expect(store.level).toMatchObject({ forceNight: false, previewGameLighting: true });
  store.undo(); expect(store.level.forceNight).toBeUndefined();
  store.redo(); expect(store.level.previewGameLighting).toBe(true);
});
it("allows levels to override mystic permanent night while respecting weather settings", () => {
  const day = { night: false, rain: false };
  expect(isPermanentNight("mystic-cave", false)).toBe(false);
  expect(isPermanentNight("pastoral-hills", true)).toBe(true);
  expect(isPermanentNight("mystic-cave")).toBe(true);
  expect(levelWeather(day, false, day, "mystic-cave", false)).toEqual(day);
  expect(levelWeather(day, false, day, undefined, true).night).toBe(true);
  expect(levelWeather({ night: true, rain: true }, false, day, "mystic-cave", false)).toEqual({ night: true, rain: true });
});
it("includes static candle and mystic gameplay lights only at night", () => {
  const level = blankLevel("Lights");
  level.prefabs = [{ id: "candle", kind: "candle", x: 0, z: 0 }, { id: "mushroom", kind: "glow-mushroom", x: 5, z: 0 }];
  const night = buildEditorLocalLights(level, new T.Vector3(), true);
  const active = night.children.filter(o => o.visible) as T.PointLight[];
  expect(active).toHaveLength(2); expect(active.map(o => o.color.getHex())).toContain(0x4ff5e0);
  expect(buildEditorLocalLights(level, new T.Vector3(), false).children.some(o => o.visible)).toBe(false);
});
