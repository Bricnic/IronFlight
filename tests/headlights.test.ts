import { expect, it } from "vitest";
import * as T from "three";
import { buildHeadlightRig, setHeadlightRig } from "../src/headlights";

function parts(rig: T.Group) {
  const spots: T.SpotLight[] = [];
  const cones: T.Mesh[] = [];
  const bulbs: T.Mesh[] = [];
  rig.traverse((o) => {
    if (o instanceof T.SpotLight) spots.push(o);
    else if (o instanceof T.Mesh && o.name === "headlight-cone") cones.push(o);
    else if (o instanceof T.Mesh && o.name === "headlight-bulb") bulbs.push(o);
  });
  return { spots, cones, bulbs };
}

it("builds twin shadowed spotlights and bulbs without unoccluded cones", () => {
  const rig = buildHeadlightRig();
  const { spots, cones, bulbs } = parts(rig);
  expect(spots).toHaveLength(2);
  expect(cones).toHaveLength(0);
  expect(bulbs).toHaveLength(2);
  for (const spot of spots) {
    expect(spot.angle).toBeGreaterThan(0.3);
    expect(spot.distance).toBeGreaterThanOrEqual(40);
    expect(spot.castShadow).toBe(true);
  }
  for (const spot of spots) {
    expect(spot.intensity).toBeGreaterThanOrEqual(3000);
    expect(spot.distance).toBeGreaterThanOrEqual(90);
  }
  for (const bulb of bulbs) {
    const mat = bulb.material as T.MeshStandardMaterial;
    expect(mat.emissiveIntensity).toBeGreaterThan(1);
  }
});

it("toggles the whole rig with one call", () => {
  const rig = buildHeadlightRig();
  setHeadlightRig(rig, false);
  const off = parts(rig);
  expect(off.spots.every((s) => !s.visible)).toBe(true);
  expect(off.cones.every((c) => !c.visible)).toBe(true);
  expect(off.bulbs.every((b) => !b.visible)).toBe(true);
  setHeadlightRig(rig, true);
  const on = parts(rig);
  expect(on.spots.every((s) => s.visible)).toBe(true);
  expect(on.cones.every((c) => c.visible)).toBe(true);
  expect(on.bulbs.every((b) => b.visible)).toBe(true);
});
