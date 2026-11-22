import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as T from "three";
import { initPhysics, Simulation } from "../src/simulation";
import { blankLevel, toTrack, registerCustomTrack, type CustomLevel } from "../src/custom-level";
import { FragileIceView } from "../src/fragile-ice-view";

beforeAll(initPhysics);
function fixture(lava = true, scale = 1) {
  const level = blankLevel("Rickety debris");
  level.spawn = { x: -40, y: 2, z: -40, yaw: 0 };
  level.solids = [{ id: "floor", kind: "ground", x: 0, y: -5, z: 0, w: 200, h: 1, d: 200, color: 0x555555 }];
  if (lava) level.solids.push({ id: "lava", kind: "lava", x: 0, y: 0, z: 0, w: 40, h: 1, d: 40, color: 0xff5500, yaw: 0.6 });
  level.prefabs = [{ id: "plank", kind: "rickety-plank", x: 0, y: 8, z: 0, yaw: 0.7, resizeScale: scale }];
  const track = toTrack(level); registerCustomTrack(track);
  const sim = new Simulation(); sim.startTrack(track.id);
  const source = scale === 1 ? sim.fragileIce : sim.resizedPrefabs[0].sim.fragileIce;
  source.tiles[0].armed = true; source.tiles[0].armedAt = -1;
  sim.step({}); expect(source.tiles[0].shattered).toBe(true);
  return { sim, source };
}
it("plank shards accelerate downward under gravity and vanish on lava contact", () => {
  const { sim, source } = fixture();
  try {
    const shards = source.tiles[0].debris!;
    expect(shards).toHaveLength(6);
    const y0 = shards[0].position.y;
    sim.run(0.2); const y1 = shards[0].position.y;
    sim.run(0.2); const y2 = shards[0].position.y;
    expect(y1).toBeLessThan(y0); expect(y2 - y1).toBeLessThan(y1 - y0);
    sim.run(2); expect(shards.every(s => !s.active)).toBe(true);
  } finally { sim.dispose(); }
});
it("rendered shard instances follow the falling debris and remain hidden after lava", () => {
  const { sim, source } = fixture(); const view = new FragileIceView();
  try {
    const matrix = new T.Matrix4(), before = new T.Vector3(), after = new T.Vector3();
    view.update(source, sim.time); view.plankShards!.getMatrixAt(0, matrix); before.setFromMatrixPosition(matrix);
    expect(matrix.determinant()).not.toBe(0);
    sim.run(0.3); view.update(source, sim.time); view.plankShards!.getMatrixAt(0, matrix); after.setFromMatrixPosition(matrix);
    expect(after.y).toBeLessThan(before.y);
    sim.run(2); view.update(source, sim.time); view.plankShards!.getMatrixAt(0, matrix); expect(matrix.determinant()).toBe(0);
    const rebuilt = new FragileIceView(); rebuilt.update(source, sim.time); rebuilt.plankShards!.getMatrixAt(0, matrix); expect(matrix.determinant()).toBe(0);
  } finally { sim.dispose(); }
});
it("debris keeps falling after the truck is wrecked and can settle on solid ground", () => {
  const { sim, source } = fixture(false);
  try {
    const shard = source.tiles[0].debris![0];
    sim.damage("chassis-front", 10000); sim.run(2);
    expect(shard.position.y).toBeLessThan(0); expect(shard.active).toBe(true);
    const y = shard.position.y; sim.run(0.5); expect(shard.position.y).toBeCloseTo(y);
  } finally { sim.dispose(); }
});
it("resized plank debris also disappears on actual world lava", () => {
  const { sim, source } = fixture(true, 2);
  try { sim.run(3); expect(source.tiles[0].debris!.every(s => !s.active)).toBe(true); } finally { sim.dispose(); }
});
it("detects fast shards crossing a thin lava surface between simulation steps", () => {
  const { sim, source } = fixture(false);
  try {
    sim.addCustomSolid({ id: "thin-lava", kind: "lava", x: 0, y: 0, z: 0, w: 20, h: 0.02, d: 20, yaw: 0.6, color: 0xff5500 });
    for (const shard of source.tiles[0].debris!) { shard.position.y = 3; shard.velocity.set(0, -500, 0); }
    sim.step({}); expect(source.tiles[0].debris!.every(s => !s.active)).toBe(true);
  } finally { sim.dispose(); }
});
it("resized and ordinary shards have the same world gravitational acceleration", () => {
  const a = fixture(false), b = fixture(false, 2);
  try {
    const position = (test: typeof a) => {
      const p = test.source.tiles[0].debris![0].position;
      return test.sim.resizedPrefabs.length ? test.sim.resizedPrefabs[0].space.toWorld(p).y : p.y;
    };
    const sample = (test: typeof a) => { const y0 = position(test); test.sim.run(0.1); const y1 = position(test); test.sim.run(0.1); return position(test) - 2 * y1 + y0; };
    expect(sample(a)).toBeCloseTo(sample(b), 5);
  } finally { a.sim.dispose(); b.sim.dispose(); }
});
it("removes the resized Firefly Grotto bridge shards at the rift's lava", () => {
  const level = JSON.parse(readFileSync("levels/official/spooky-places/Firefly Grotto.json", "utf8")) as CustomLevel;
  const plank = level.prefabs.filter(p => p.kind === "rickety-plank").sort((a, b) => Math.abs(a.x - 105) - Math.abs(b.x - 105))[0];
  level.prefabs = [plank];
  const track = toTrack(level); registerCustomTrack(track);
  const sim = new Simulation(); sim.startTrack(track.id);
  try {
    const source = plank.resizeScale && plank.resizeScale !== 1 ? sim.resizedPrefabs[0].sim.fragileIce : sim.fragileIce;
    source.tiles[0].armed = true; source.tiles[0].armedAt = -1; sim.step({});
    expect(source.tiles[0].debris).toHaveLength(6);
    sim.run(4); expect(source.tiles[0].debris!.every(s => !s.active)).toBe(true);
  } finally { sim.dispose(); }
});
