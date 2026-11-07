import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  PREFAB_KINDS,
  DUNGEON_PREFAB_KINDS,
  PROP_PREFAB_KINDS,
  COLLECTIBLE_KINDS,
  toTrack,
  validateCustomLevel,
  registerCustomTrack,
  type CustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { courseProps, courseSolids } from "../src/course";

beforeAll(initPhysics);

const minimal = (prefabs: CustomPrefab[] = []): CustomLevel => ({
  name: "Dungeon Data",
  mode: "race",
  spawn: { x: 0, y: 2.1, z: -100, yaw: 0 },
  checkpoints: [{ x: 0, z: 100 }],
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
    },
  ],
  prefabs,
  medals: { gold: 30, silver: 45, bronze: 60 },
});

it("knows every dungeon prefab kind the palette needs", () => {
  for (const kind of [
    "hands",
    "scissors",
    "clippers",
    "cage",
    "jail-cell",
    "skull",
  ])
    expect(PREFAB_KINDS).toContain(kind);
  for (const kind of ["hands", "scissors", "clippers", "cage", "jail-cell"])
    expect(DUNGEON_PREFAB_KINDS).toContain(kind);
  expect(PROP_PREFAB_KINDS).toContain("skull");
});

it("validates ring and chest collectible kinds and rejects unknown ones", () => {
  const level = validateCustomLevel({
    ...minimal(),
    name: "Chest Arena",
    mode: "arena",
    checkpoints: [],
    collectibles: [
      { x: 10, z: 10 },
      { x: -10, z: -10, kind: "chest" },
      { x: 0, z: 20, kind: "ring" },
    ],
    limit: 120,
  });
  expect(level.collectibles).toHaveLength(3);
  expect(() =>
    validateCustomLevel({
      ...minimal(),
      name: "Bogus Arena",
      mode: "arena",
      checkpoints: [],
      collectibles: [{ x: 0, z: 0, kind: "crown" }],
      limit: 120,
    }),
  ).toThrow(/collectible/);
  expect(COLLECTIBLE_KINDS).toEqual(["ring", "chest"]);
});

it("maps chest collectibles onto tracks with a ring default", () => {
  const track = toTrack(
    validateCustomLevel({
      ...minimal(),
      name: "Chest Map",
      mode: "arena",
      checkpoints: [],
      collectibles: [
        { x: 10, z: 10 },
        { x: -10, z: -10, kind: "chest" },
      ],
      limit: 120,
    }),
  );
  expect(track.collectibles).toHaveLength(2);
  expect(track.collectibles[0].kind).toBe("ring");
  expect(track.collectibles[1].kind).toBe("chest");
  expect(track.collectibles[1].radius).toBe(3.5);
});

it("dungeon hazards and decor accept yaw but not pitch or roll", () => {
  for (const kind of ["hands", "scissors", "clippers", "cage", "jail-cell"]) {
    expect(
      () =>
        validateCustomLevel(
          minimal([{ id: "p-1", kind, x: 0, z: 0, yaw: Math.PI / 2 }]),
        ),
      kind,
    ).not.toThrow();
    expect(() =>
      validateCustomLevel(
        minimal([{ id: "p-1", kind, x: 0, z: 0, angle: 0.1 }]),
      ),
    ).toThrow(/pitch/);
    expect(() =>
      validateCustomLevel(
        minimal([{ id: "p-1", kind, x: 0, z: 0, roll: 0.1 }]),
      ),
    ).toThrow(/roll/);
  }
});

it("serves skull props and jail-cell bars for customs", () => {
  const track = toTrack(
    validateCustomLevel(
      minimal([
        { id: "skull-1", kind: "skull", x: 5, z: 5, yaw: 1 },
        { id: "cell-1", kind: "jail-cell", x: -30, z: 40 },
      ]),
    ),
  );
  registerCustomTrack(track);
  expect(courseProps(track).map((p) => p.kind)).toEqual(["skull"]);
  expect(courseProps(track)[0]).toMatchObject({ id: "skull-1", yaw: 1 });
  // Four barred walls enclose the cell; the skeleton inside is decor-only.
  const bars = courseSolids(track).filter((s) =>
    s.id.startsWith("cell-1-bar"),
  );
  expect(bars.length).toBeGreaterThanOrEqual(12);
  expect(new Set(bars.map((s) => s.kind))).toEqual(new Set(["barrier"]));
});
