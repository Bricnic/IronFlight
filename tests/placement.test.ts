import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  blankLevel,
  validateCustomLevel,
  toTrack,
  registerCustomTrack,
  placeInLevel,
  appendCheckpoint,
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
