import { expect, it } from "vitest";
import * as T from "three";
import { prefabLightSettings, PrefabLights } from "../src/prefab-lights";
import { blankLevel, validateCustomLevel } from "../src/custom-level";
import { buildHeadlightRig } from "../src/headlights";
import { configureShadowSurfaces } from "../src/shadow-surfaces";
import { EditorStore } from "../src/editor-state";
import { buildLampPost } from "../src/course-view";
import { buildChristmasDecor } from "../src/christmas-view";
import { buildCandyDecor } from "../src/candy-view";
import { buildSpookyDream } from "../src/spooky-dream-view";
import { buildStuntDream } from "../src/stunt-dream-view";
import { buildDungeonModel } from "../src/dungeon-view";
import { buildFairy, buildMushroom } from "../src/mystic-view";

it("defaults ordinary prefabs to off and the requested kinds to physical lumen outputs", () => {
  expect(prefabLightSettings({ kind: "barrel" })).toMatchObject({ lumens: 0 });
  for (const kind of ["firefly", "cave-fairy"]) expect(prefabLightSettings({ kind }).lumens).toBe(150);
  expect(prefabLightSettings({ kind: "glow-mushroom" })).toMatchObject({ lumens: 500, color: 0x4ff5e0 });
  expect(prefabLightSettings({ kind: "birthday-candle" })).toMatchObject({ lumens: 250, color: 0xffe6a3 });
  expect(prefabLightSettings({ kind: "glow-mushroom", lightLumens: 0, lightColor: 0x123456 })).toMatchObject({ lumens: 0, color: 0x123456 });
});
it("lights lanterns, lamps and marquee bulbs from the emitter instead of the base", () => {
  expect(prefabLightSettings({ kind: "lamp" })).toMatchObject({ lumens: 250, color: 0xfff5cd });
  expect(prefabLightSettings({ kind: "christmas-lantern" })).toMatchObject({ lumens: 200, color: 0xffc95a });
  expect(prefabLightSettings({ kind: "gumball-lamp" })).toMatchObject({ lumens: 200, color: 0xffc95a });
  expect(prefabLightSettings({ kind: "jack-o-lantern" })).toMatchObject({ lumens: 150, color: 0xff8a00 });
  expect(prefabLightSettings({ kind: "candle" })).toMatchObject({ lumens: 150, color: 0xffa64a });
  expect(prefabLightSettings({ kind: "marquee-star" })).toMatchObject({ lumens: 400, color: 0xffe27a });
  const origins: [T.Object3D, number][] = [];
  const lamp = buildLampPost(); origins.push([lamp, 13]);
  const lantern = new T.Group(); buildChristmasDecor(lantern, "christmas-lantern"); origins.push([lantern, 7.1]);
  const gumball = new T.Group(); buildCandyDecor(gumball, "gumball-lamp"); origins.push([gumball, 8.3]);
  const jack = new T.Group(); buildSpookyDream(jack, "jack-o-lantern"); origins.push([jack, 4.9]);
  origins.push([buildDungeonModel({ id: "c", kind: "candle", x: 0, z: 0, phase: 0 }).root, 2.1]);
  const marquee = new T.Group(); buildStuntDream(marquee, "marquee-star"); origins.push([marquee, 11.5]);
  const mushroom = new T.Group(); buildMushroom(mushroom); origins.push([mushroom, 2.6]);
  const fairy = new T.Group(); buildFairy(fairy); origins.push([fairy, 0.2]);
  for (const [root, y] of origins) {
    root.updateMatrixWorld(true);
    const at = root.getObjectByName("prefab-light-origin")!.getWorldPosition(new T.Vector3());
    expect(at.y).toBeCloseTo(y, 5);
  }
});
it("persists explicit light settings and rejects invalid intensities/colors", () => {
  const level = blankLevel("Lights"); level.prefabs = [{ id: "light", kind: "barrel", x: 0, z: 0, lightLumens: 250, lightColor: 0x123456 }];
  expect(validateCustomLevel(level).prefabs[0]).toMatchObject({ lightLumens: 250, lightColor: 0x123456 });
  for (const lightLumens of [-1, NaN, Infinity]) expect(() => validateCustomLevel({ ...level, prefabs: [{ ...level.prefabs[0], lightLumens }] })).toThrow(/lumens/);
  for (const lightColor of [-1, 0x1000000, 1.5]) expect(() => validateCustomLevel({ ...level, prefabs: [{ ...level.prefabs[0], lightColor }] })).toThrow(/light color/);
});
it("uses Three's lumen power and follows a transformed candle flame tip", () => {
  const p = { id: "candle", kind: "birthday-candle", x: 10, y: 4, z: 3, resizeScale: 2 };
  const anchor = new T.Group(); anchor.position.set(10, 4, 3); anchor.scale.setScalar(2); anchor.rotation.z = Math.PI / 2;
  const tip = new T.Object3D(); tip.name = "prefab-light-origin"; tip.position.y = 1.56; anchor.add(tip); anchor.updateMatrixWorld(true);
  const lights = new PrefabLights(); lights.update([p], new T.Vector3(), () => anchor);
  const light = lights.children.find(o => o.visible) as T.PointLight;
  expect(light.power).toBeCloseTo(250); expect(light.position.distanceTo(tip.getWorldPosition(new T.Vector3()))).toBeLessThan(1e-6);
  lights.update([{ ...p, lightLumens: 0 }], new T.Vector3()); expect(lights.children.some(o => o.visible)).toBe(false);
});
it("headlights cast shadows instead of using unoccluded decorative beam geometry", () => {
  const rig = buildHeadlightRig();
  const spots = rig.children.filter(o => o instanceof T.SpotLight) as T.SpotLight[];
  expect(spots).toHaveLength(2); expect(spots.every(o => o.castShadow)).toBe(true);
  expect(rig.getObjectByName("headlight-cone")).toBeUndefined();
});
it("enables shadows for physical surfaces while leaving flame/label effects alone", () => {
  const root = new T.Group();
  const solid = new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial());
  const effect = new T.Mesh(new T.PlaneGeometry(), new T.MeshBasicMaterial());
  root.add(solid, effect); configureShadowSurfaces(root);
  expect(solid.castShadow && solid.receiveShadow).toBe(true); expect(effect.castShadow).toBe(false);
});
it("bulk light changes resolve mixed defaults, undo together and reject invalid input", () => {
  const store = new EditorStore("Bulk lights");
  const a = store.addPrefab("firefly"), b = store.addPrefab("birthday-candle");
  store.select({ kind: "prefab", id: a.id }); store.select({ kind: "prefab", id: b.id }, true);
  store.updateSelectionProperties({ lightLumens: 400, lightColor: 0xaabbcc });
  expect([a, b].every(p => p.lightLumens === 400 && p.lightColor === 0xaabbcc)).toBe(true);
  store.updateSelectionProperties({ lightLumens: -5 }); expect(a.lightLumens).toBe(400);
  store.undo(); expect(store.level.prefabs.every(p => p.lightLumens === undefined)).toBe(true);
});
