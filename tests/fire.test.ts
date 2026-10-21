import { createTruck } from "../src/truck";
import { TruckFireView } from "../src/truck-fire";
import { Vector3, Mesh, MeshStandardMaterial, MeshBasicMaterial } from "three";
import { beforeAll, it, expect } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { PARTS } from "../src/damage";
import { DT } from "../src/clock";
beforeAll(initPhysics);
function burn(s: Simulation, fraction: number) {
  for (const p of PARTS) s.fireDamage(p.id, p.hp * fraction);
}
it("only actual flame damage counts; overkill is not counted twice", () => {
  const s = new Simulation();
  s.damage("hood", 60);
  expect(s.scorch).toBe(0);
  s.fireDamage("hood", 1000);
  expect(s.fireDamageTaken).toBeCloseTo(
    30 / PARTS.reduce((n, p) => n + p.hp, 0),
  );
  const soot = s.scorch;
  s.fireDamage("hood", 1000);
  expect(s.scorch).toBe(soot);
  s.dispose();
});
it("exactly fifty percent does not ignite; crossing it does", () => {
  const s = new Simulation();
  burn(s, 0.5);
  s.run(0.5);
  expect(s.smoking).toBe(false);
  expect(s.smolderRemaining).toBe(0);
  s.fireDamage("hood", 0.1);
  s.step();
  expect(s.smoking).toBe(true);
  expect(s.smolderRemaining).toBe(0.25);
  s.dispose();
});
it("collision damage cannot combine with lesser fire damage to ignite", () => {
  const s = new Simulation();
  for (const p of PARTS) s.damage(p.id, p.hp * 0.55);
  burn(s, 0.1);
  s.run(1);
  expect(s.snapshot().integrity).toBeCloseTo(0.35);
  expect(s.smoking).toBe(false);
  expect(s.scorch).toBeCloseTo(0.1);
  s.dispose();
});
it("smolder removes five original integrity points per second for exactly five seconds", () => {
  const s = new Simulation();
  burn(s, 0.55);
  s.step();
  const start = s.snapshot().integrity;
  for (let second = 1; second <= 5; second++) {
    s.run(1);
    expect(s.snapshot().integrity).toBeCloseTo(start - second * 0.05, 6);
    expect(s.smolderDamageTaken).toBeCloseTo(second * 0.05, 6);
    expect(s.smoking).toBe(second < 5);
  }
  expect(s.scorch).toBeCloseTo(0.8);
  const end = s.snapshot().integrity;
  s.run(3);
  expect(s.snapshot().integrity).toBeCloseTo(end, 6);
  expect(s.scorch).toBeCloseTo(0.8);
  s.dispose();
});
it("the capped smolder cannot restart from further fire damage", () => {
  const s = new Simulation();
  burn(s, 0.55);
  s.step();
  s.run(5);
  burn(s, 0.05);
  const end = s.snapshot().integrity;
  s.run(6);
  expect(s.smolderDamageTaken).toBeCloseTo(0.25);
  expect(s.snapshot().integrity).toBeCloseTo(end);
  expect(s.smoking).toBe(false);
  s.dispose();
});
it("real flame bars and dragons record fire exposure and soot", () => {
  for (const z of [18, 213]) {
    const s = new Simulation("easy");
    s.body.setTranslation({ x: -24, y: 2, z }, true);
    s.run(0.2);
    expect(s.inFlames).toBe(true);
    expect(s.smoking).toBe(true);
    expect(s.fireDamageTaken).toBeGreaterThan(0);
    s.dispose();
  }
});
it("a fully burned wreck stops smoking, remains black, and rebuilding clears fire state", () => {
  const s = new Simulation();
  burn(s, 2);
  expect(s.scorch).toBeCloseTo(1);
  s.step();
  s.run(5 + DT);
  expect(s.smoking).toBe(false);
  expect(s.scorch).toBeCloseTo(1);
  s.reset();
  expect(s.scorch).toBe(0);
  expect(s.smolderDamageTaken).toBe(0);
  expect(s.smoking).toBe(false);
  s.dispose();
});

it("charred materials stay dark after smoke ends and a fully burned exterior turns black", () => {
  const s = new Simulation(),
    truck = createTruck(),
    view = new TruckFireView();
  view.reset(truck);
  burn(s, 0.55);
  s.step();
  view.update(s, new Vector3());
  expect(view.inspect().smokeVisible).toBe(true);
  s.run(6);
  view.update(s, new Vector3());
  expect(view.inspect().scorch).toBeCloseTo(0.8);
  expect(view.inspect().smokeVisible).toBe(false);
  burn(s, 2);
  view.update(s, new Vector3());
  truck.traverse((o) => {
    if (o instanceof Mesh)
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m instanceof MeshStandardMaterial || m instanceof MeshBasicMaterial)
          for (const channel of m.color.toArray())
            expect(channel).toBeCloseTo(0, 12);
  });
  view.smoke.geometry.dispose();
  view.smoke.material.dispose();
  s.dispose();
});
