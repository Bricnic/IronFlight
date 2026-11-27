import { expect, it } from "vitest";
import { strokesToRoads } from "../src/paint-roads";

it("lays an open stroke as even yawed pieces of the painted width", () => {
  const roads = strokesToRoads([
    { width: 10, points: [{ x: 0, z: 0 }, { x: 0, z: 100 }] },
  ]);
  expect(roads.length).toBeGreaterThan(5);
  for (const r of roads) {
    expect(r.w).toBe(10);
    expect(r.d).toBeCloseTo(5 + 12, 5);
    expect(r.yaw).toBeCloseTo(0, 5);
    expect(r.x).toBeCloseTo(0, 5);
  }
  const zs = roads.map((r) => r.z).sort((a, b) => a - b);
  expect(zs[0]).toBeGreaterThanOrEqual(0);
  expect(zs[zs.length - 1]).toBeLessThanOrEqual(100);
  // Consecutive pieces overlap so the union has no gaps.
  for (let i = 1; i < roads.length; i++)
    expect(Math.hypot(roads[i].x - roads[i - 1].x, roads[i].z - roads[i - 1].z)).toBeLessThan(roads[i].d);
});

it("closes a looped stroke without a seam and yaws pieces along the curve", () => {
  const points = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return { x: Math.cos(a) * 50, z: Math.sin(a) * 50 };
  });
  points.push({ ...points[0] });
  const roads = strokesToRoads([{ width: 10, points }]);
  expect(roads.length).toBeGreaterThan(20);
  for (const r of roads) {
    expect(Math.hypot(r.x, r.z)).toBeCloseTo(50, 0);
    const tangent = Math.atan2(-r.z, r.x);
    let diff = Math.abs(r.yaw - tangent) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    // Piece axis (modulo its own flip) tracks the circle tangent.
    expect(Math.min(diff, Math.abs(diff - Math.PI))).toBeLessThan(0.35);
  }
  // The joint between last and first piece overlaps like every other joint.
  const joint = Math.hypot(roads[0].x - roads[roads.length - 1].x, roads[0].z - roads[roads.length - 1].z);
  expect(joint).toBeLessThan(roads[0].d);
});

it("rounds sharp corners instead of kinking", () => {
  const roads = strokesToRoads([
    { width: 8, points: [{ x: 0, z: 0 }, { x: 60, z: 0 }, { x: 60, z: 60 }] },
  ]);
  const yaws = roads.map((r) => r.yaw);
  for (let i = 1; i < yaws.length; i++) {
    let step = Math.abs(yaws[i] - yaws[i - 1]);
    if (step > Math.PI) step = Math.PI * 2 - step;
    expect(step).toBeLessThan(0.5);
  }
  expect(Math.max(...yaws)).toBeGreaterThan(1.2);
});

it("handles dabs, dots and empty strokes", () => {
  expect(strokesToRoads([])).toEqual([]);
  expect(strokesToRoads([{ width: 10, points: [] }])).toEqual([]);
  expect(strokesToRoads([{ width: 0, points: [{ x: 1, z: 2 }] }])).toEqual([]);
  expect(strokesToRoads([{ width: 6, points: [{ x: 3, z: 4 }] }])).toEqual([
    { x: 3, z: 4, yaw: 0, w: 6, d: 6 },
  ]);
});
