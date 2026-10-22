import { beforeAll, it, expect } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { Quaternion, Vector3 } from "three";
beforeAll(initPhysics);
it("supports the truck on grass outside the road and allows off-roading", () => {
  const s = new Simulation("easy");
  s.body.setTranslation({ x: -45, y: 2.1, z: -65 }, true);
  s.run(3, { throttle: 1 });
  expect(s.snapshot().position.y).toBeGreaterThan(1);
  expect(s.snapshot().position.z).toBeGreaterThan(-50);
  expect(s.snapshot().status).not.toBe("wrecked");
  expect(s.snapshot().surfaces).toContain("grass");
  s.dispose();
});
it("grandstand steps are solid obstacles when driven into from grass", () => {
  const s = new Simulation("hard");
  s.body.setTranslation({ x: 48, y: 2.1, z: -65 }, true);
  s.body.setRotation(
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
    true,
  );
  s.run(4, { throttle: 1 });
  const p = s.snapshot().position;
  expect(s.snapshot().surfaces).toContain("grandstand");
  expect(p.x).toBeLessThan(87);
  expect(p.y).toBeGreaterThan(0);
  s.dispose();
});
it("lava has a physical surface and still destroys the truck", () => {
  const s = new Simulation("easy");
  s.body.setTranslation({ x: -24, y: -3, z: 20 }, true);
  s.run(3);
  expect(
    (s.parts.get("chassis-front")!.body ?? s.body).translation().y,
  ).toBeGreaterThan(-8);
  expect(s.snapshot().damageEvents.some((e) => e.source === "lava")).toBe(true);
  s.dispose();
});
