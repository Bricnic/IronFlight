import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  validateCustomLevel,
  toTrack,
  registerCustomTrack,
  placeInLevel,
  appendCheckpoint,
  editSolidInLevel,
  deleteSolidInLevel,
  duplicateSolidInLevel,
  editPrefabInLevel,
  deletePrefabInLevel,
  duplicatePrefabInLevel,
  moveCheckpointInLevel,
  deleteCheckpointInLevel,
  duplicateCheckpointInLevel,
  moveCheckpointOnTrack,
  deleteCheckpointOnTrack,
  duplicateCheckpointOnTrack,
} from "../src/custom-level";
import { gates } from "../src/tracks";
beforeAll(initPhysics);
const sprint = () =>
  toTrack(validateCustomLevel(blankLevel("Place Land")));
it("appends checkpoint gates matching gates() math", () => {
  const track = sprint();
  const gate = appendCheckpoint(track, 10, 80);
  expect(track.checkpoints).toHaveLength(2);
  expect(track.path).toHaveLength(3);
  expect(gate).toEqual(gates(track.path)[1]);
  const again = appendCheckpoint(track, -6, 120, 3);
  expect(again.y).toBe(3);
  expect(track.checkpoints).toHaveLength(3);
  expect(again).toEqual({ ...gates(track.path)[2], y: 3 });
});
it("appends repeat placements without NaN normals", () => {
  const track = sprint();
  appendCheckpoint(track, 0, 40);
  const last = track.checkpoints.at(-1)!;
  expect(Number.isFinite(last.nx + last.nz)).toBe(true);
});
it("commits solids, prefabs and checkpoints with unique ids", () => {
  let level = blankLevel("Place");
  level = placeInLevel(level, { type: "solid", kind: "barrier", x: 1, z: 2 });
  level = placeInLevel(level, {
    type: "solid",
    kind: "barrier",
    x: 3,
    z: 4,
    texture: "rock_06",
  });
  expect(level.solids).toHaveLength(4);
  expect(new Set(level.solids.map((s) => s.id)).size).toBe(4);
  expect(level.solids.at(-1)).toMatchObject({
    kind: "barrier",
    x: 3,
    z: 4,
    texture: "rock_06",
  });
  level = placeInLevel(level, { type: "prefab", kind: "snowman", x: 5, z: 6 });
  expect(level.prefabs).toHaveLength(1);
  level = placeInLevel(level, { type: "checkpoint", x: 0, z: 80 });
  expect(level.checkpoints).toHaveLength(2);
  expect(() => validateCustomLevel(level)).not.toThrow();
  expect(() =>
    placeInLevel(level, { type: "prefab", kind: "dragon", x: 0, z: 0 }),
  ).toThrow(/prefab/);
  level = placeInLevel(level, {
    type: "solid",
    kind: "barrier",
    x: 7,
    z: 8,
    w: 24,
    h: 3,
    d: 2,
  });
  expect(level.solids.at(-1)).toMatchObject({ w: 24, h: 3, d: 2 });
  expect(() => validateCustomLevel(level)).not.toThrow();
});
it("live-added walls block the truck headlessly", () => {
  const track = sprint();
  registerCustomTrack(track);
  const s = new Simulation();
  s.startTrack(track.id);
  const placed = placeInLevel(track.custom!, {
    type: "solid",
    kind: "barrier",
    x: 0,
    z: -20,
    y: 1.5,
    w: 24,
    h: 3,
    d: 2,
  });
  s.addCustomSolid(placed.solids.at(-1)!);
  for (let i = 0; i < 60 * 8; i++) s.step({ throttle: 1 });
  expect(s.body.translation().z).toBeLessThan(-19);
  s.dispose();
});
it("live-added props join the world and break", () => {
  const track = toTrack(validateCustomLevel(blankLevel("Prop Land")));
  registerCustomTrack(track);
  const s = new Simulation();
  s.startTrack(track.id);
  const before = s.props.props.length;
  s.props.addProp({ id: "snow-9", kind: "snowman", x: 0, z: -30, ground: 0 });
  expect(s.props.props.length).toBe(before + 1);
  for (let i = 0; i < 60 * 6; i++) s.step({ throttle: 1 });
  expect(
    s.props.props.find((p) => p.definition.id === "snow-9")?.broken,
  ).toBe(true);
  s.dispose();
});
it("live-added comic hazards register mechanisms", () => {
  const track = toTrack(validateCustomLevel(blankLevel("Comic Land")));
  registerCustomTrack(track);
  const s = new Simulation();
  s.startTrack(track.id);
  const before = s.comic.mechanisms.length;
  s.comic.addHazard({ id: "book-9", kind: "book", x: 30, z: 0, phase: 0 });
  expect(s.comic.mechanisms.length).toBe(before + 1);
  const added = s.comic.mechanisms.at(-1)!;
  expect(added.colliders.length).toBeGreaterThan(0);
  for (let i = 0; i < 60; i++) s.step({});
  expect(s.comic.mechanisms.length).toBe(before + 1);
  s.dispose();
});
it("edits, deletes and duplicates solids by id", () => {
  let level = blankLevel("Edit Land");
  level = placeInLevel(level, { type: "solid", kind: "barrier", x: 1, z: 2 });
  const id = level.solids.at(-1)!.id;
  level = editSolidInLevel(level, id, { x: 10, z: 20, yaw: Math.PI / 4 });
  expect(level.solids.at(-1)).toMatchObject({ x: 10, z: 20, yaw: Math.PI / 4 });
  level = editSolidInLevel(level, id, { texture: "rock_06" });
  expect(level.solids.at(-1)!.texture).toBe("rock_06");
  expect(() => validateCustomLevel(level)).not.toThrow();
  const copy = duplicateSolidInLevel(level, id);
  expect(copy.solids).toHaveLength(level.solids.length + 1);
  expect(copy.solids.at(-1)!.x).toBeGreaterThan(10);
  expect(copy.solids.at(-1)!.id).not.toBe(id);
  expect(new Set(copy.solids.map((s) => s.id)).size).toBe(copy.solids.length);
  const cut = deleteSolidInLevel(copy, id);
  expect(cut.solids.find((s) => s.id === id)).toBeUndefined();
  expect(() => editSolidInLevel(level, "missing", { x: 0 })).toThrow(/solid/);
  expect(() => deleteSolidInLevel(level, "missing")).toThrow(/solid/);
  expect(() => duplicateSolidInLevel(level, "missing")).toThrow(/solid/);
});
it("edits, deletes and duplicates prefabs by id", () => {
  let level = blankLevel("Edit Prefabs");
  level = placeInLevel(level, { type: "prefab", kind: "snowman", x: 1, z: 2 });
  const id = level.prefabs.at(-1)!.id;
  level = editPrefabInLevel(level, id, { x: 10, z: 20 });
  expect(level.prefabs.at(-1)).toMatchObject({ x: 10, z: 20 });
  expect(() => validateCustomLevel(level)).not.toThrow();
  const copy = duplicatePrefabInLevel(level, id);
  expect(copy.prefabs).toHaveLength(level.prefabs.length + 1);
  expect(copy.prefabs.at(-1)!.x).toBeGreaterThan(10);
  expect(copy.prefabs.at(-1)!.id).not.toBe(id);
  expect(new Set(copy.prefabs.map((p) => p.id)).size).toBe(
    copy.prefabs.length,
  );
  const cut = deletePrefabInLevel(copy, id);
  expect(cut.prefabs.find((p) => p.id === id)).toBeUndefined();
  expect(() => editPrefabInLevel(level, "missing", { x: 0 })).toThrow(/prefab/);
  expect(() => deletePrefabInLevel(level, "missing")).toThrow(/prefab/);
  expect(() => duplicatePrefabInLevel(level, "missing")).toThrow(/prefab/);
});
it("moves, deletes and duplicates checkpoints by index", () => {
  let level = blankLevel("Checkpoint Land");
  level = placeInLevel(level, { type: "checkpoint", x: 0, z: 80 });
  expect(level.checkpoints).toHaveLength(2);
  level = moveCheckpointInLevel(level, 0, 10, 2, 40);
  expect(level.checkpoints[0]).toMatchObject({ x: 10, y: 2, z: 40 });
  expect(level.checkpoints[1]).toMatchObject({ x: 0, z: 80 });
  const copy = duplicateCheckpointInLevel(level, 0);
  expect(copy.checkpoints).toHaveLength(3);
  expect(copy.checkpoints[1]).toMatchObject({ x: 14, y: 2, z: 40 });
  const cut = deleteCheckpointInLevel(copy, 0);
  expect(cut.checkpoints).toHaveLength(2);
  expect(cut.checkpoints[0]).toMatchObject({ x: 14, z: 40 });
  expect(() => moveCheckpointInLevel(level, 9, 0, 0, 0)).toThrow(/checkpoint/);
  expect(() => deleteCheckpointInLevel(level, 9)).toThrow(/checkpoint/);
  expect(() => duplicateCheckpointInLevel(level, 9)).toThrow(/checkpoint/);
});
it("moves checkpoint gates and refreshes neighbor normals", () => {
  const track = toTrack(validateCustomLevel(blankLevel("Gate Land")));
  appendCheckpoint(track, 0, 80);
  moveCheckpointOnTrack(track, 0, 10, 40);
  expect(track.checkpoints.map((g) => g.id)).toEqual(["gate-1", "gate-2"]);
  expect(track.path[1]).toEqual({ x: 10, z: 40 });
  const first = track.checkpoints[0];
  expect(first.nx).toBeCloseTo(10 / Math.hypot(10, 80), 6);
  expect(first.nz).toBeCloseTo(80 / Math.hypot(10, 80), 6);
  const second = track.checkpoints[1];
  expect(second.nx).toBeCloseTo(-10 / Math.hypot(10, 40), 6);
  expect(second.nz).toBeCloseTo(40 / Math.hypot(10, 40), 6);
  moveCheckpointOnTrack(track, 1, 0, 120);
  expect(track.checkpoints[1].nx).toBeCloseTo(-10 / Math.hypot(10, 80), 6);
  expect(track.checkpoints[1].nz).toBeCloseTo(80 / Math.hypot(10, 80), 6);
  moveCheckpointOnTrack(track, 0, 0, -40);
  expect(track.checkpoints[0].nx).toBeCloseTo(10 / Math.hypot(10, 80), 6);
});
it("deletes gates keeping survivor ids and path aligned", () => {
  const track = toTrack(validateCustomLevel(blankLevel("Cut Land")));
  appendCheckpoint(track, 0, 80);
  deleteCheckpointOnTrack(track, 0);
  expect(track.checkpoints.map((g) => g.id)).toEqual(["gate-2"]);
  expect(track.path).toEqual([
    { x: 0, z: -40 },
    { x: 0, z: 80 },
  ]);
  expect(track.checkpoints[0].nx).toBeCloseTo(0, 6);
  expect(track.checkpoints[0].nz).toBeCloseTo(1, 6);
  expect(() => deleteCheckpointOnTrack(track, 5)).toThrow(/checkpoint/);
});
it("duplicates gates with fresh ids between neighbors", () => {
  const track = toTrack(validateCustomLevel(blankLevel("Copy Land")));
  appendCheckpoint(track, 0, 80);
  const gate = duplicateCheckpointOnTrack(track, 0);
  expect(gate.id).toBe("gate-3");
  expect(track.checkpoints.map((g) => g.id)).toEqual([
    "gate-1",
    "gate-3",
    "gate-2",
  ]);
  expect(track.path).toHaveLength(4);
  expect(track.checkpoints[1]).toMatchObject({ x: 4, z: 40 });
  expect(track.checkpoints[1].nx).toBeCloseTo(1, 6);
  expect(track.checkpoints[1].nz).toBeCloseTo(0, 6);
  expect(
    Number.isFinite(track.checkpoints[2].nx + track.checkpoints[2].nz),
  ).toBe(true);
  expect(() => duplicateCheckpointOnTrack(track, 5)).toThrow(/checkpoint/);
});
