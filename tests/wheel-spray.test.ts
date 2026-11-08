import { expect, it } from "vitest";
import * as T from "three";
import {
  SPRAY_PUFFS,
  buildWheelSpray,
  updateWheelSpray,
} from "../src/wheel-spray";
import { makeGlowTexture } from "../src/course-view";

function puffs(spray: T.Group) {
  return spray.children.filter(
    (o): o is T.Sprite => o instanceof T.Sprite,
  );
}

it("builds soft mist puffs behind the rear wheels", () => {
  const spray = buildWheelSpray();
  const all = puffs(spray);
  expect(all).toHaveLength(SPRAY_PUFFS);
  for (const p of all) {
    expect((p.material as T.SpriteMaterial).map).toBe(makeGlowTexture());
    expect(p.material.transparent).toBe(true);
  }
  expect(spray.visible).toBe(false);
});

it("shows spray only when raining and rolling", () => {
  const spray = buildWheelSpray();
  updateWheelSpray(spray, 1.0, 0, false);
  expect(spray.visible).toBe(false);
  updateWheelSpray(spray, 1.0, 20, false);
  expect(spray.visible).toBe(false);
  updateWheelSpray(spray, 1.0, 2, true);
  expect(spray.visible).toBe(false);
  updateWheelSpray(spray, 1.0, 20, true);
  expect(spray.visible).toBe(true);
  const lit = puffs(spray).filter(
    (p) => (p.material as T.SpriteMaterial).opacity > 0,
  );
  expect(lit.length).toBeGreaterThan(0);
});

it("cycles puffs deterministically with time", () => {
  const spray = buildWheelSpray();
  updateWheelSpray(spray, 1.0, 20, true);
  const a = puffs(spray).map((p) => p.position.y);
  updateWheelSpray(spray, 1.0, 20, true);
  expect(puffs(spray).map((p) => p.position.y)).toEqual(a);
  updateWheelSpray(spray, 1.35, 20, true);
  expect(puffs(spray).map((p) => p.position.y)).not.toEqual(a);
});
