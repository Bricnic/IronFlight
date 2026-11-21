import type { Object3D } from "three";
import { loadSettings } from "./settings";

export function markObjectHelp<T extends Object3D>(label: T): T {
  label.userData.objectHelp = true;
  label.visible = loadSettings().showObjectHelp;
  return label;
}
export function setObjectHelpVisibility(root: Object3D, show: boolean) {
  root.traverse(object => { if (object.userData.objectHelp) object.visible = show; });
}
export function objectHelpStats(root: Object3D) {
  let total = 0, visible = 0;
  root.traverse(object => { if (object.userData.objectHelp) total++; });
  root.traverseVisible(object => { if (object.userData.objectHelp) visible++; });
  return { total, visible };
}
