import { expect, it } from "vitest";
import { Group, Sprite } from "three";
import { markObjectHelp, setObjectHelpVisibility, objectHelpStats } from "../src/object-help";
it("hides help by default and toggles only tagged labels, preserving other signs and effects", () => {
  const root = new Group(), label = markObjectHelp(new Sprite()), sign = new Sprite();
  root.add(label, sign);
  expect(label.visible).toBe(false); expect(sign.visible).toBe(true);
  setObjectHelpVisibility(root, true);
  expect(objectHelpStats(root)).toEqual({ total: 1, visible: 1 });
  setObjectHelpVisibility(root, false);
  expect(objectHelpStats(root)).toEqual({ total: 1, visible: 0 }); expect(sign.visible).toBe(true);
});
