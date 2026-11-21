import { COLLECTIBLE_KINDS, PROP_PREFAB_KINDS, TEXTURE_IDS, prefabY, type CustomLevel } from "./custom-level";
import type { EditorStore } from "./editor-state";

export type SelectedObject = NonNullable<ReturnType<EditorStore["selectedItem"]>>;
export type EditorProperty = { key: string; label: string; type?: "color" | "choice" | "boolean" | "text"; options?: readonly string[] };
export function objectKindKey(object: SelectedObject) {
  return object.kind === "solid" || object.kind === "prefab" ? `${object.kind}:${object.item.kind}` : object.kind === "target" ? `target:${object.item.kind ?? "ring"}` : object.kind;
}
export function objectKindLabel(key: string) {
  const [category, kind] = key.split(":");
  return kind ? `${category === "solid" ? "Solid" : category === "prefab" ? "Prefab" : "Collectible"}: ${kind}` : category[0].toUpperCase() + category.slice(1);
}
function properties(object: SelectedObject): EditorProperty[] {
  const result: EditorProperty[] = ["x", "y", "z"].map(key => ({ key, label: key.toUpperCase() }));
  if (["solid", "prefab", "spawn", "checkpoint"].includes(object.kind)) result.push({ key: "yaw", label: "Yaw" });
  if (object.kind === "solid") result.push(...["w", "h", "d"].map(key => ({ key, label: key.toUpperCase() })));
  if (object.kind === "solid" || (object.kind === "prefab" && (PROP_PREFAB_KINDS as readonly string[]).includes(object.item.kind))) result.push({ key: "angle", label: "Pitch" }, { key: "roll", label: "Roll" });
  if (object.kind === "solid") result.push({ key: "color", label: "Color", type: "color" }, { key: "texture", label: "Texture", type: "choice", options: TEXTURE_IDS });
  if (object.kind === "prefab") result.push({ key: "resizeScale", label: "Size" });
  if (object.kind === "target") result.push({ key: "kind", label: "Type", type: "choice", options: COLLECTIBLE_KINDS });
  if (object.kind === "ring") result.push({ key: "radius", label: "Radius" }, { key: "goal", label: "Goal", type: "boolean" });
  return result;
}
/** Only properties meaningful for every selected object are offered. */
export function editableProperties(objects: SelectedObject[], mode?: CustomLevel["mode"]) {
  if (!objects.length) return [];
  const result = properties(objects[0]).filter(p => !(mode === "demolition" && p.key === "kind") && objects.every(o => properties(o).some(other => other.key === p.key)));
  if (objects.some(o => o.item.group)) result.push({ key: "group", label: "Group", type: "text" });
  return result;
}
export function propertyValue(object: SelectedObject, key: string, level: CustomLevel): unknown {
  const raw = (object.item as unknown as Record<string, unknown>)[key];
  if (raw !== undefined) return raw;
  if (["yaw", "angle", "roll"].includes(key)) return 0;
  if (key === "resizeScale") return 1;
  if (key === "goal") return false;
  if (key === "kind" && object.kind === "target") return "ring";
  if (key === "y") return object.kind === "prefab" ? prefabY(object.item) : object.kind === "checkpoint" ? 2 : object.kind === "target" ? level.mode === "demolition" ? 1.5 : 1.7 : 0;
  return raw;
}
export function commonProperty(objects: SelectedObject[], key: string, level: CustomLevel) {
  const value = objects[0] ? propertyValue(objects[0], key, level) : undefined;
  return { value, mixed: objects.some(o => !Object.is(propertyValue(o, key, level), value)) };
}
