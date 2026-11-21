import { beforeAll, expect, it } from "vitest";
import R from "@dimforge/rapier3d-compat";
import { PrefabSpace } from "../src/prefab-space";
import { initPhysics, Simulation } from "../src/simulation";
import { PREFAB_KINDS, blankLevel, registerCustomTrack, toTrack, validateCustomLevel } from "../src/custom-level";
beforeAll(initPhysics);
it("scales checkpoint prefab crossing areas with the displayed frame", () => {
  const level = blankLevel("Resized checkpoint");
  level.prefabs = [{ id: "gate", kind: "checkpoint", x: 20, z: 100, resizeScale: 2 }];
  const gate = toTrack(level).checkpoints.at(-1)!;
  expect(gate.width).toBe(48);
  expect(gate.height).toBe(16);
});
it("keeps vehicle sizes unchanged when hazard code resets player colliders", () => {
  const sim = new Simulation();
  try {
    const space = new PrefabSpace({ id: "test", kind: "potion", x: 0, z: 0, resizeScale: 2 });
    const child = space.simulation(sim, sim.courseTrack!, {});
    const def = child.partDefs[0], original = sim.partDefs[0];
    expect(def.size[0]).toBeCloseTo(original.size[0] / 2);
    const collider = child.parts.get(def.id)!.collider!;
    collider.setHalfExtents({ x: def.size[0] / 2, y: def.size[1] / 2, z: def.size[2] / 2 });
    expect(sim.parts.get(def.id)!.collider!.halfExtents().x).toBeCloseTo(original.size[0] / 2);
    expect(child.partBounds.get(def.id)!.max.x).toBeCloseTo(sim.partBounds.get(def.id)!.max.x / 2);
  } finally { sim.dispose(); }
});
it("transforms impulses and their contact points together", () => {
  const world = new R.World({ x: 0, y: 0, z: 0 });
  const space = new PrefabSpace({ id: "test", kind: "barrel", x: 10, z: 20, resizeScale: 2 });
  try {
    const resizedWorld = space.world(world);
    const body = resizedWorld.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(12, 0, 20));
    resizedWorld.createCollider(R.ColliderDesc.cuboid(1, 1, 1).setMass(1), body);
    world.step();
    body.applyImpulseAtPoint({ x: 0, y: 0, z: 2 }, { x: 12, y: 0, z: 20 }, true);
    expect(world.getRigidBody(body.handle).linvel().z).toBeCloseTo(4);
    expect(world.getRigidBody(body.handle).angvel().y).toBeCloseTo(0);
  } finally { world.free(); }
});
it.each(PREFAB_KINDS)("constructs and advances a resized %s in the shared gameplay world", kind => {
  const level = blankLevel("Resize matrix");
  level.prefabs = [{ id: "resized", kind, x: 100, y: 0, z: 100, resizeScale: 1.75 }];
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  try {
    sim.startTrack("custom:resize-matrix"); sim.run(3.2);
    expect(sim.resizedPrefabs).toHaveLength(1);
    const s = sim.body.translation(); expect([s.x, s.y, s.z].every(Number.isFinite)).toBe(true);
  } finally { sim.dispose(); }
});
it("batches an ice field without changing authored world positions", () => {
  const level = blankLevel("Resized field");
  level.prefabs = Array.from({ length: 200 }, (_, i) => ({ id: `ice-${i}`, kind: "fragile-ice", x: 1000 + i * 8, y: 10, z: 300, resizeScale: 1.5 }));
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  try {
    sim.startTrack("custom:resized-field");
    expect(sim.resizedPrefabs).toHaveLength(1);
    const tiles = sim.resizedPrefabs[0].sim.fragileIce.tiles;
    expect(tiles).toHaveLength(200);
    const position = sim.world.getCollider(tiles[199].sheet!.handle).translation();
    expect(position.x).toBeCloseTo(level.prefabs[199].x);
    expect(position.y).toBeCloseTo(10 - 0.13 * 1.5);
    expect(position.z).toBeCloseTo(300);
  } finally { sim.dispose(); }
});
it("guides an unchanged-size vehicle through a resized pipe and out its enlarged exit", () => {
  const level = blankLevel("Resized pipe");
  level.spawn = { x: 0, y: 26.1, z: -8, yaw: 0 };
  level.solids = [{ id: "approach", kind: "tile", x: 0, y: 23, z: -20, w: 28, h: 2, d: 40, color: 0x137e91 }];
  level.checkpoints = [{ x: -72, z: 300 }];
  level.prefabs = [{ id: "pipe", kind: "guided-pipe", x: 0, y: 24, z: 0, resizeScale: 2 }];
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  try {
    sim.startTrack("custom:resized-pipe");
    const child = sim.resizedPrefabs[0];
    for (let i = 0; i < 500 && !child.sim.guidedPipe.snapshot(); i++) sim.step({ throttle: 1 });
    expect(child.sim.guidedPipe.snapshot()?.section).toBe("tube");
    expect(sim.body.isKinematic()).toBe(true);
    for (let i = 0; i < 2000 && child.sim.guidedPipe.snapshot(); i++) sim.step({});
    expect(child.sim.guidedPipe.snapshot()).toBeNull();
    expect(sim.body.isDynamic()).toBe(true);
    expect(sim.body.translation().x).toBeCloseTo(-72, 0);
    expect(sim.body.translation().z).toBeGreaterThanOrEqual(179);
  } finally { sim.dispose(); }
});
it("resized ice has enlarged physical sheets and freezing-water sensors", () => {
  const level = blankLevel("Resized ice");
  level.solids = [{ ...level.solids[0], x: -1000, y: -1000 }];
  level.prefabs = [{ id: "ice", kind: "fragile-ice", x: 10, z: 20, resizeScale: 2 }];
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  try {
    sim.startTrack("custom:resized-ice");
    const child = sim.resizedPrefabs[0];
    expect(child).toBeDefined();
    const sheet = child.sim.fragileIce.tiles[0].sheet!;
    const actual = sim.world.getCollider(sheet.handle).shape as R.Cuboid;
    expect(actual.halfExtents.x).toBeCloseTo(4.96);
    sim.world.removeCollider(sim.world.getCollider(sheet.handle), true);
    child.sim.fragileIce.tiles[0].sheet = null;
    child.sim.fragileIce.tiles[0].shattered = true;
    const body = sim.body;
    body.setTranslation({ x: 14, y: -1.8, z: 20 }, true);
    sim.run(0.5);
    expect(child.sim.fragileIce.tiles[0].sinking).toBeGreaterThan(0);
  } finally { sim.dispose(); }
});
it("resized articulated traps preserve their native geometry scale and animations", () => {
  const level = blankLevel("Resized trap"); level.solids = [{ ...level.solids[0], x: -1000, y: -1000 }];
  level.prefabs = [{ id: "jaw", kind: "book", x: 20, z: 30, resizeScale: 2, scale: 1.5 }];
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  try {
    sim.startTrack("custom:resized-trap");
    const child = sim.resizedPrefabs[0];
    const base = child.sim.comic.mechanisms[0].colliders[0];
    expect((sim.world.getCollider(base.handle).shape as R.Cuboid).halfExtents.x).toBeCloseTo(18);
    const moving = child.sim.comic.mechanisms[0].bodies[0];
    const initial = moving.rotation(); sim.run(2.5);
    expect(moving.rotation()).not.toEqual(initial);
    expect(sim.world.getRigidBody(moving.handle).translation().z).toBeCloseTo(45);
  } finally { sim.dispose(); }
});
it("resized hammer keeps its moving collision geometry", () => {
  const level = blankLevel("Resized hammer");
  level.prefabs = [{ id: "hammer", kind: "hammer", x: 20, z: 30, resizeScale: 2 }];
  registerCustomTrack(toTrack(validateCustomLevel(level)));
  const sim = new Simulation();
  try {
    sim.startTrack("custom:resized-hammer");
    expect(sim.hazardBodies.has("hammer")).toBe(true);
    const body = sim.hazardBodies.get("hammer")!;
    expect((sim.world.getCollider(body.collider(0).handle).shape as R.Cuboid).halfExtents.x).toBeCloseTo(7.2);
  } finally { sim.dispose(); }
});
