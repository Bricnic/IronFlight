import * as T from "three";
import { type CustomLevel } from "./custom-level";
import { PrefabLights } from "./prefab-lights";

/** The gameplay light pools at time zero; editor previews never animate them. */
export function buildEditorLocalLights(level: CustomLevel, focus: T.Vector3, models?: T.Object3D) {
  const lights = new PrefabLights(); lights.name = "editor-local-lights";
  lights.update(level.prefabs, focus, id => models?.getObjectByName(id));
  return lights;
}
