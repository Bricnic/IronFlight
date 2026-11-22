import { expect, it } from "vitest";
import { buildMinimap, projectMinimap, levelRecords } from "../src/level-hud";
import { blankLevel, registerCustomTrack, toTrack } from "../src/custom-level";
import { BestTimes } from "../src/best-times";
import { GoldStars } from "../src/gold-stars";
import { getTrack } from "../src/tracks";

function fixture() {
  const level = blankLevel("HUD fixture");
  level.spawn = { x: 0, y: 2, z: 0, yaw: 0 };
  level.checkpoints = [
    { x: 0, z: 30 },
    { x: 40, z: 30 },
  ];
  level.solids = [
    {
      id: "road",
      kind: "road",
      x: 0,
      y: 0,
      z: 15,
      w: 8,
      h: 1,
      d: 30,
      color: 0xffffff,
    },
    {
      id: "clipped",
      kind: "tile",
      x: 20,
      y: 0,
      z: 30,
      w: 8,
      h: 1,
      d: 8,
      color: 0xffffff,
      yaw: Math.PI / 2,
      footprint: [
        { x: -4, z: -4 },
        { x: 4, z: -4 },
        { x: 0, z: 4 },
      ],
    },
    {
      id: "wall",
      kind: "barrier",
      x: 200,
      y: 10,
      z: 0,
      w: 2,
      h: 20,
      d: 20,
      color: 0xffffff,
    },
  ];
  level.prefabs = [
    { id: "star", kind: "gold-star", x: 20, y: 3, z: 20 },
    { id: "wings", kind: "wings", x: 0, y: 2, z: 10 },
  ];
  level.collectibles = [{ x: 5, y: 2, z: 15 }];
  const track = toTrack(level);
  registerCustomTrack(track);
  return track;
}

it("maps road footprints and the spawn, gates, collectibles and finish", () => {
  const model = buildMinimap(fixture());
  expect(model.roads.map((r) => r.id)).toEqual(["road", "clipped"]);
  expect(model.roads[1].points).toHaveLength(3);
  expect(model.roads[1].points[0]).toMatchObject({ x: 16, z: 34 });
  expect(model.markers.map((m) => m.kind)).toEqual(
    expect.arrayContaining([
      "spawn",
      "checkpoint",
      "finish",
      "collectible",
      "star",
      "wings",
    ]),
  );
  expect(model.radius).toBeLessThan(100);
});

it("rotates the map with the player's forward orientation without changing zoom", () => {
  const map = buildMinimap(fixture()),
    at = map.center;
  const forward = { x: at.x, z: at.z + 5 },
    left = { x: at.x + 5, z: at.z };
  const center = projectMinimap(map, at, 0);
  const ahead = projectMinimap(map, forward, 0),
    side = projectMinimap(map, left, 0);
  expect(ahead.y).toBeLessThan(center.y);
  expect(ahead.x).toBeCloseTo(center.x);
  expect(side.x).toBeLessThan(center.x);
  const turned = projectMinimap(map, left, Math.PI / 2);
  expect(turned.y).toBeCloseTo(ahead.y);
  expect(turned.x).toBeCloseTo(center.x);
  expect(projectMinimap(map, forward, Math.PI / 2).x).toBeGreaterThan(center.x);
});

it("does not let a large backing ground plane shrink the road map", () => {
  const track = fixture(),
    before = buildMinimap(track);
  track.custom!.solids.unshift({
    id: "backing",
    kind: "ground",
    x: 0,
    y: -10,
    z: 0,
    w: 1000,
    h: 1,
    d: 1000,
    color: 0xffffff,
  });
  expect(buildMinimap(track).radius).toBe(before.radius);
});

it("uses Triple Loop's real ramps and loops, with the current lane's spawn", () => {
  const model = buildMinimap(getTrack("triple-loop"), "hard");
  expect(model.roads.length).toBeGreaterThan(100);
  expect(model.markers.find((m) => m.kind === "spawn")!.x).toBe(24);
});

it("uses saved bests and lifetime stars rather than current-attempt pickups", () => {
  const track = fixture();
  const scores = new BestTimes({
    getItem: () =>
      JSON.stringify({
        version: 1,
        records: { [track.id + ":default"]: { time: 12.3, splits: [] } },
      }),
    setItem() {},
  });
  const stars = new GoldStars({ getItem: () => null, setItem() {} });
  expect(levelRecords(track, "default", scores, stars)).toMatchObject({
    time: "12.3s",
    medal: "GOLD",
    stars: "Not found",
  });
  stars.collect(track.id, "star");
  expect(levelRecords(track, "default", scores, stars).stars).toBe("Found");
  expect(levelRecords(track, "hard", scores, stars).time).toBe("No time set");
  track.goldStars = [];
  expect(levelRecords(track, "default", scores, stars).stars).toBe(
    "No gold star",
  );
});
