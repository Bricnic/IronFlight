import { beforeAll, expect, it } from "vitest";
import { initPhysics, Simulation } from "../src/simulation";
import { hammerAngle } from "../src/hazards";
beforeAll(initPhysics);
it("rotates hammers 1.5x faster and gives both ends physical spikes", () => {
  expect(hammerAngle(2)).toBeCloseTo(2 * 1.7 * 1.5);
  const s = new Simulation("hard");
  for (const b of s.hazardBodies.values()) {
    expect(b.numColliders()).toBe(13);
    for (const i of [3, 4])
      expect(Math.abs(b.collider(i).translationWrtParent()!.x)).toBeGreaterThan(
        4,
      );
  }
  s.dispose();
});
