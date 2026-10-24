import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { getTrack } from "../src/tracks";
import {
  AxeArray,
  axeDefs,
  axeAngle,
  axeAngularVelocity,
  AXE_AMPLITUDE,
  AXE_PERIOD,
} from "../src/axes";
import { buildAxeMesh, axeStats } from "../src/course-view";
beforeAll(initPhysics);
const canyon = () => getTrack("canyon-plunge");
const rigged = () => {
  const sim = new Simulation();
  sim.axes = new AxeArray(sim, canyon());
  return sim;
};
it("hangs six phased axes over the canyon and nowhere else", () => {
  const defs = axeDefs(canyon());
  expect(defs).toHaveLength(6);
  expect(new Set(defs.map((d) => d.id)).size).toBe(6);
  expect(new Set(defs.map((d) => d.phase)).size).toBe(6);
  for (const d of defs)
    expect(Number.isFinite(d.x + d.y + d.z + d.phase)).toBe(true);
  expect(axeDefs(getTrack("harbor-sprint"))).toEqual([]);
  expect(axeDefs()).toEqual([]);
});
it("pendulum angle and velocity follow amplitude, period and phase", () => {
  expect(axeAngle(0, 0)).toBeCloseTo(0, 9);
  expect(axeAngle(AXE_PERIOD / 4, 0)).toBeCloseTo(AXE_AMPLITUDE, 9);
  expect(axeAngle(AXE_PERIOD, 0)).toBeCloseTo(axeAngle(0, 0), 9);
  expect(axeAngle(0, Math.PI)).toBeCloseTo(axeAngle(AXE_PERIOD / 2, 0), 9);
  const omega = (2 * Math.PI) / AXE_PERIOD;
  expect(axeAngularVelocity(0, 0)).toBeCloseTo(AXE_AMPLITUDE * omega, 9);
  expect(axeAngularVelocity(AXE_PERIOD / 4, 0)).toBeCloseTo(0, 9);
});
it("a real blade impact launches the truck and registers one strike", () => {
  const sim = rigged();
  const target = sim.axes.snapshot().axes[0];
  sim.body.setTranslation({ x: target.x + 2.0, y: 2.1, z: target.z }, true);
  sim.run(0.1);
  expect(sim.snapshot().axeImpacts.length).toBe(1);
  expect(sim.snapshot().velocity.y).toBeGreaterThan(12);
  expect(sim.snapshot().integrity).toBeLessThan(0.9);
  sim.run(0.6);
  expect(sim.snapshot().axeImpacts.length).toBe(1);
  expect(
    sim.damageEvents.filter((e) => e.source === "axe").length,
  ).toBeGreaterThan(0);
  sim.dispose();
});
it("launch direction follows the swing phase", () => {
  const strike = (settle: number, side: number) => {
    const sim = rigged();
    const target = sim.axes.snapshot().axes[0];
    sim.body.setTranslation({ x: 150, y: 2.1, z: 150 }, true);
    sim.run(settle);
    sim.body.setTranslation(
      { x: target.x + side * 2.0, y: 2.1, z: target.z },
      true,
    );
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    sim.run(0.1);
    const impact = sim.snapshot().axeImpacts[0];
    sim.dispose();
    return impact.deltaVelocity[0];
  };
  expect(strike(0, 1)).toBeGreaterThan(5);
  expect(strike(AXE_PERIOD / 2, -1)).toBeLessThan(-5);
});
it("a near miss beside the blade neither strikes nor damages", () => {
  const sim = rigged();
  const target = sim.axes.snapshot().axes[0];
  sim.body.setTranslation({ x: target.x + 6, y: 2.1, z: target.z }, true);
  sim.step({});
  expect(sim.snapshot().axeImpacts).toHaveLength(0);
  expect(sim.damageEvents.filter((e) => e.source === "axe")).toHaveLength(0);
  expect(sim.snapshot(false).integrity).toBe(1);
  sim.dispose();
});
it("axe snapshots expose finite swing angles for the view", () => {
  const sim = new Simulation();
  expect(sim.snapshot(false).axes.axes).toHaveLength(0);
  sim.axes = new AxeArray(sim, canyon());
  sim.step({});
  const snap = sim.axes.snapshot();
  expect(snap.axes).toHaveLength(6);
  for (const a of snap.axes) {
    expect(Number.isFinite(a.angle)).toBe(true);
    expect(Math.abs(a.angle)).toBeLessThanOrEqual(AXE_AMPLITUDE + 1e-9);
  }
  sim.dispose();
});
it("axe meshes are high-poly steel blades on long handles", () => {
  const group = buildAxeMesh();
  const stats = axeStats(group);
  expect(stats.meshes).toBeGreaterThanOrEqual(3);
  expect(stats.triangles).toBeGreaterThan(300);
  expect(stats.metallic).toBeGreaterThanOrEqual(1);
});
