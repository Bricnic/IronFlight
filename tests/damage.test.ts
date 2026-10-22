import { beforeAll, it, expect } from "vitest";
import { BoxGeometry, Vector3 } from "three";
import { Simulation, initPhysics } from "../src/simulation";
import { PARTS, deformGeometry } from "../src/damage";
beforeAll(initPhysics);
for (const part of PARTS)
  it(`independently destroys ${part.id} and creates a physical fragment`, () => {
    const s = new Simulation("lab");
    s.run(0.5);
    s.damage(part.id, 1000);
    const state = s.parts.get(part.id)!;
    expect(state.health).toBe(0);
    expect(state.body).toBeDefined();
    expect(state.body!.isDynamic()).toBe(true);
    expect(s.world.getRigidBody(state.body!.handle)).toBeDefined();
    const p = state.body!.translation();
    s.run(0.2);
    expect(state.body!.translation()).not.toEqual(p);
    s.damage(part.id, 1000);
    expect([...s.parts.values()].filter((p) => p.body)).toHaveLength(
      part.id === "chassis-front"
        ? PARTS.length
        : part.id === "chassis-rear"
          ? 5
          : 1,
    );
    s.reset();
    expect([...s.parts.values()].every((p) => p.health > 0 && !p.body)).toBe(
      true,
    );
    s.dispose();
  });
it("wheel removal disables suspension and traction", () => {
  const s = new Simulation();
  s.damage("wheel-fl", 1000);
  s.step({ throttle: 1 });
  expect(s.vehicle.wheelEngineForce(0)).toBe(0);
  expect(s.vehicle.wheelMaxSuspensionForce(0)).toBe(0);
  s.dispose();
});
it("severing rear chassis releases rear assembly and disables propulsion", () => {
  const s = new Simulation();
  s.damage("chassis-rear", 1000);
  s.step({ throttle: 1 });
  for (let i = 0; i < 4; i++) expect(s.vehicle.wheelEngineForce(i)).toBe(0);
  expect(s.parts.get("wheel-rl")!.body).toBeDefined();
  expect(s.parts.get("hood")!.body).toBeUndefined();
  s.dispose();
});
it("detached panels inherit vehicle velocity", () => {
  const s = new Simulation();
  s.body.setLinvel({ x: 3, y: 4, z: 12 }, true);
  s.damage("hood", 1000);
  expect(s.parts.get("hood")!.body!.linvel().z).toBeCloseTo(12);
  s.dispose();
});
it("dents are local, bounded and change actual vertices", () => {
  const g = new BoxGeometry(2, 2, 2, 12, 12, 12),
    a = g.attributes.position;
  const before = Array.from(a.array);
  deformGeometry(g, new Vector3(0, 1, 0), 0.5, 1);
  let moved = 0;
  for (let i = 0; i < a.count; i++) {
    const dist = new Vector3(
      a.getX(i) - before[i * 3],
      a.getY(i) - before[i * 3 + 1],
      a.getZ(i) - before[i * 3 + 2],
    ).length();
    if (dist > 0) moved++;
    expect(dist).toBeLessThanOrEqual(0.501);
  }
  expect(moved).toBeGreaterThan(0);
  expect(moved).toBeLessThan(a.count);
  g.dispose();
});
it("invalid and negative damage cannot heal or corrupt state", () => {
  const s = new Simulation();
  expect(() => s.damage("hood", -1)).toThrow();
  expect(() => s.damage("missing", 10)).toThrow();
  expect(() => s.damage("hood", NaN)).toThrow();
  s.dispose();
});
