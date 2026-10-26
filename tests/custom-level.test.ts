import { readFileSync } from "node:fs";
import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { getTrack } from "../src/tracks";
import {
  courseSolids,
  courseProps,
  courseAvailable,
  courseHazards,
} from "../src/course";
import { comicHazards } from "../src/comic-hazards";
import { slideDefs } from "../src/slide";
import { ghostDefs } from "../src/ghosts";
import {
  TEXTURE_IDS,
  PREFAB_KINDS,
  validateCustomLevel,
  toTrack,
  registerCustomTrack,
  customTrackIds,
  blankLevel,
  type CustomLevel,
} from "../src/custom-level";
import { courseDriver } from "./course-driver";
beforeAll(initPhysics);
const minimal = (): CustomLevel => ({
  name: "First Sprint",
  mode: "race",
  spawn: { x: 0, y: 2.1, z: -100, yaw: 0 },
  checkpoints: [
    { x: 0, z: 0 },
    { x: 0, z: 100 },
  ],
  solids: [
    {
      id: "ground",
      kind: "ground",
      x: 0,
      y: -0.6,
      z: 0,
      w: 200,
      h: 1.2,
      d: 400,
      color: 0x6d817c,
      texture: "grass_ground",
    },
    {
      id: "road-1",
      kind: "road",
      x: 0,
      y: 0.015,
      z: 0,
      w: 24,
      h: 0.03,
      d: 230,
      color: 0x303e49,
      texture: "asphalt_02",
    },
  ],
  prefabs: [{ id: "book-1", kind: "book", x: 12, z: -40 }],
  medals: { gold: 35, silver: 50, bronze: 75 },
});
it("texture ids match the cached Poly Haven manifest", () => {
  const manifest = JSON.parse(
    readFileSync("public/textures/manifest.json", "utf8"),
  );
  expect([...TEXTURE_IDS]).toEqual(
    manifest.assets.map((a: { id: string }) => a.id),
  );
});
it("validates a minimal race level and round-trips through JSON", () => {
  const level = validateCustomLevel(minimal());
  expect(level.name).toBe("First Sprint");
  expect(validateCustomLevel(JSON.parse(JSON.stringify(level)))).toEqual(level);
});
it("rejects malformed levels with specific errors", () => {
  expect(() => validateCustomLevel({ ...minimal(), name: "" })).toThrow(/name/);
  expect(() =>
    validateCustomLevel({ ...minimal(), name: "../escape" }),
  ).toThrow(/name/);
  expect(() =>
    validateCustomLevel({ ...minimal(), name: "x".repeat(65) }),
  ).toThrow(/name/);
  expect(() =>
    validateCustomLevel({ ...minimal(), mode: "drift" }),
  ).toThrow(/mode/);
  expect(() => validateCustomLevel({ ...minimal(), checkpoints: [] })).toThrow(
    /checkpoint/,
  );
  expect(() =>
    validateCustomLevel({
      ...minimal(),
      solids: [{ ...minimal().solids[0], texture: "nope" }],
    }),
  ).toThrow(/texture/);
  expect(() =>
    validateCustomLevel({
      ...minimal(),
      prefabs: [{ id: "x", kind: "dragon", x: 0, z: 0 }],
    }),
  ).toThrow(/prefab/);
  expect(() =>
    validateCustomLevel({
      ...minimal(),
      solids: [minimal().solids[0], minimal().solids[0]],
    }),
  ).toThrow(/duplicate/i);
  expect(() =>
    validateCustomLevel({
      ...minimal(),
      medals: { gold: 50, silver: 50, bronze: 75 },
    }),
  ).toThrow(/medal/);
  expect(() =>
    validateCustomLevel({ ...minimal(), mode: "arena", checkpoints: [] }),
  ).toThrow(/collectible/);
  expect(() =>
    validateCustomLevel({
      ...minimal(),
      mode: "arena",
      checkpoints: [],
      collectibles: [{ x: 0, z: 0 }],
    }),
  ).toThrow(/limit/);
  expect(() =>
    validateCustomLevel({ ...minimal(), mode: "demolition", checkpoints: [] }),
  ).toThrow(/demolition/);
  expect(() =>
    validateCustomLevel({
      ...minimal(),
      solids: [{ ...minimal().solids[0], w: 0 }],
    }),
  ).toThrow(/size/);
  expect(() =>
    validateCustomLevel({
      ...minimal(),
      spawn: { x: 0, y: Number.NaN, z: 0, yaw: 0 },
    }),
  ).toThrow(/spawn/);
});
it("adapts a level to a registered custom track", () => {
  const track = toTrack(validateCustomLevel(minimal()));
  expect(track.id).toBe("custom:first-sprint");
  expect(track.mode).toBe("race");
  expect(track.checkpoints).toHaveLength(2);
  expect(track.checkpoints[0].width).toBe(24);
  expect(track.spawn).toMatchObject({ x: 0, y: 2.1, z: -100, yaw: 0 });
  expect(track.thumbnail).toBe("/tracks/custom.svg");
  expect(typeof track.color).toBe("number");
  expect(track.custom?.name).toBe("First Sprint");
  registerCustomTrack(track);
  expect(customTrackIds()).toContain("custom:first-sprint");
  expect(getTrack("custom:first-sprint")).toBe(track);
  expect(courseAvailable("custom:first-sprint")).toBe(true);
  expect(() => getTrack("custom:missing")).toThrow(RangeError);
});
it("merges checkpoint prefabs into race gates", () => {
  const level = minimal();
  level.prefabs.push({ id: "cp-extra", kind: "checkpoint", x: 0, z: 200 });
  const track = toTrack(validateCustomLevel(level));
  expect(track.checkpoints).toHaveLength(3);
  expect(track.path).toHaveLength(4);
});
it("maps arena collectibles and demolition targets", () => {
  const arena = toTrack(
    validateCustomLevel({
      ...minimal(),
      name: "Tiny Arena",
      mode: "arena",
      checkpoints: [],
      collectibles: [
        { x: 10, z: 10 },
        { x: -10, z: -10 },
      ],
      limit: 120,
    }),
  );
  expect(arena.collectibles).toHaveLength(2);
  expect(arena.collectibles[0].radius).toBe(3.5);
  expect(arena.limit).toBe(120);
  expect(arena.feasibility).toBe(90);
  registerCustomTrack(arena);
  const demo = toTrack(
    validateCustomLevel({
      ...minimal(),
      name: "Tiny Demo",
      mode: "demolition",
      checkpoints: [],
      demolish: [{ x: 5, z: 5 }],
      limit: 120,
    }),
  );
  expect(demo.demolish).toHaveLength(1);
  registerCustomTrack(demo);
  expect(
    courseProps(demo).filter((p) => p.kind === "gravestone"),
  ).toHaveLength(1);
});
it("serves embedded solids, props and comic prefabs for customs", () => {
  const track = getTrack("custom:first-sprint");
  const solids = courseSolids(track);
  expect(solids.map((s) => s.id)).toEqual(["ground", "road-1"]);
  expect(solids[0].texture).toBe("grass_ground");
  expect(
    comicHazards(track).filter((h) => h.kind === "book"),
  ).toHaveLength(1);
  const snowy = toTrack(
    validateCustomLevel({
      ...minimal(),
      name: "Snow Stop",
      prefabs: [{ id: "snow-1", kind: "snowman", x: 5, z: 5 }],
    }),
  );
  registerCustomTrack(snowy);
  expect(courseProps(snowy).map((p) => p.kind)).toEqual(["snowman"]);
});
it("validates custom rings and maps them with race collectibles", () => {
  const level = minimal();
  level.collectibles = [{ x: 0, z: -50 }];
  level.rings = [
    { x: 0, y: 3, z: 50, radius: 6 },
    { x: 0, y: 3, z: 90, radius: 6, goal: true },
  ];
  const track = toTrack(validateCustomLevel(level));
  expect(track.collectibles).toHaveLength(1);
  expect(track.rings).toHaveLength(2);
  expect(track.rings![1]).toMatchObject({ goal: true, radius: 6 });
  expect(() =>
    validateCustomLevel({
      ...minimal(),
      rings: [{ x: 0, y: 3, z: 1, radius: 0 }],
    }),
  ).toThrow();
  expect(() =>
    validateCustomLevel({ ...minimal(), rings: [{ x: 0, y: 3, z: 1 }] }),
  ).toThrow();
});
it("blank levels are valid editable skeletons", () => {
  const level = validateCustomLevel(blankLevel("My Level"));
  expect(level.name).toBe("My Level");
  expect(toTrack(level).checkpoints.length).toBeGreaterThanOrEqual(1);
  expect(level.solids.length).toBeGreaterThanOrEqual(1);
});
it("headlessly completes a tiny custom race", () => {
  const track = toTrack(validateCustomLevel(minimal()));
  registerCustomTrack(track);
  const s = new Simulation();
  s.startTrack(track.id);
  for (let i = 0; i < 120 * 120 && s.trackRun?.status === "running"; i++)
    s.step(courseDriver(s.snapshot(), track));
  expect(
    s.trackRun?.status,
    JSON.stringify({ run: s.trackRun?.snapshot(), p: s.body.translation() }),
  ).toBe("completed");
  expect(s.snapshot().integrity).toBeGreaterThan(0);
  s.dispose();
});
it("knows every prefab kind the palette needs", () => {
  for (const kind of [
    "book",
    "snowman",
    "hydrant",
    "checkpoint",
    "hammer",
    "trampoline",
    "ghost",
  ])
    expect(PREFAB_KINDS).toContain(kind);
});
it("maps course prefabs to hazards, trampolines and ghosts", () => {
  const level = minimal();
  level.prefabs.push(
    { id: "ham-1", kind: "hammer", x: 5, z: 50 },
    { id: "tramp-1", kind: "trampoline", x: 0, z: 60 },
    { id: "gh-1", kind: "ghost", x: -5, z: -50 },
  );
  const track = toTrack(validateCustomLevel(level));
  expect(track.trampolines).toHaveLength(1);
  expect(track.trampolines![0]).toMatchObject({ x: 0, z: 60 });
  const hazards = courseHazards(track);
  expect(hazards).toHaveLength(1);
  expect(hazards[0]).toMatchObject({
    id: "ham-1",
    kind: "hammer",
    x: 5,
    z: 50,
  });
  expect(slideDefs(track).trampolines).toHaveLength(1);
  expect(ghostDefs(track)).toHaveLength(1);
  expect(ghostDefs(track)[0]).toMatchObject({ id: "gh-1", x: -5, z: -50 });
});
it("headless hammer strikes a parked car", () => {
  const level = minimal();
  level.name = "Hammer Park";
  level.prefabs.push({ id: "ham-1", kind: "hammer", x: 0, z: 0 });
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const s = new Simulation();
  s.startTrack(track.id);
  s.body.setTranslation({ x: 2, y: 2.1, z: 0 }, true);
  s.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  s.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  for (let i = 0; i < 240; i++) s.step({});
  expect(s.hammerImpacts.length).toBeGreaterThan(0);
  expect(s.snapshot().integrity).toBeLessThan(1);
  s.dispose();
});
it("headless trampoline bounces a parked car", () => {
  const level = minimal();
  level.name = "Tramp Park";
  level.prefabs.push({ id: "tramp-1", kind: "trampoline", x: 0, z: 20 });
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const s = new Simulation();
  s.startTrack(track.id);
  s.body.setTranslation({ x: 0, y: 2.1, z: 20 }, true);
  s.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  s.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  for (let i = 0; i < 120; i++) s.step({});
  expect(s.slide.snapshot().trampolines[0].bounces).toBeGreaterThan(0);
  expect(s.trackRun?.snapshot().bounced).toBe(true);
  s.dispose();
});
it("headless ghost chases and drains a parked car", () => {
  const level = minimal();
  level.name = "Ghost Park";
  level.prefabs.push({ id: "gh-1", kind: "ghost", x: 0, z: -90 });
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const s = new Simulation();
  s.startTrack(track.id);
  for (let i = 0; i < 400; i++) s.step({});
  const ghosts = s.ghosts.snapshot();
  expect(ghosts.ghosts).toHaveLength(1);
  expect(ghosts.ghosts[0].contacts).toBeGreaterThan(0);
  expect(s.snapshot().integrity).toBeLessThan(1);
  s.dispose();
});
