import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";
import { driveSlimeSurgeToCompletion } from "./slime-surge-drive";

const id = "custom:slime-surge";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});
function race() {
  const sim = new Simulation();
  sim.startTrack(id);
  return sim;
}

type Solid = { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number; color: number; angle?: number };
const levelJson = () =>
  JSON.parse(readFileSync("levels/official/Slime Surge.json", "utf8")) as {
    solids: Solid[];
    prefabs: { id: string; kind: string; x: number; y?: number; z: number }[];
    checkpoints: { x: number; z: number }[];
    spawn: { x: number; z: number };
    medals: { gold: number; silver: number; bronze: number };
    limit: number;
    backgroundTemplate: string;
  };

it("drives walls, crater, tube, window, book and finish jump in under four minutes", () => {
  const elapsed = driveSlimeSurgeToCompletion();
  expect(elapsed).toBeLessThan(240);
});

it("keeps medal targets and the limit inside four minutes", () => {
  const level = levelJson();
  expect(level.limit).toBe(240);
  expect(level.medals.gold).toBeLessThan(level.medals.silver);
  expect(level.medals.silver).toBeLessThan(level.medals.bronze);
  expect(level.medals.bronze).toBeLessThanOrEqual(240);
});

it("melts a truck that falls into the slime floor", () => {
  const sim = race();
  try {
    sim.body.setTranslation({ x: 60, y: 10, z: -60 }, true);
    sim.run(3);
    expect(sim.trackRun!.status).toBe("failed");
    expect(sim.damageEvents.some((event) => event.source === "slime")).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("covers the background shape ring with slime from anywhere on the route", () => {
  const level = levelJson();
  const template = JSON.parse(
    readFileSync(`levels/backgrounds/${level.backgroundTemplate}.json`, "utf8"),
  ) as { shapes: { radius: number; y?: number }[] };
  const lake = level.solids.find((s) => s.kind === "slime")!;
  const lakeTop = lake.y + lake.h / 2;
  const points = [level.spawn, ...level.checkpoints];
  const route = {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minZ: Math.min(...points.map((p) => p.z)),
    maxZ: Math.max(...points.map((p) => p.z)),
  };
  for (const ring of template.shapes) {
    expect(lake.x - lake.w / 2).toBeLessThanOrEqual(route.minX - ring.radius);
    expect(lake.x + lake.w / 2).toBeGreaterThanOrEqual(route.maxX + ring.radius);
    expect(lake.z - lake.d / 2).toBeLessThanOrEqual(route.minZ - ring.radius);
    expect(lake.z + lake.d / 2).toBeGreaterThanOrEqual(route.maxZ + ring.radius);
    expect(Math.abs((ring.y ?? 0) - lakeTop)).toBeLessThan(1);
  }
});

it("leaves room to drive around the chomp book", () => {
  const level = levelJson();
  const book = level.prefabs.find((p) => p.kind === "book")!;
  const deck = level.solids.find((s) => s.id === "book-deck")!;
  expect(deck.w).toBeGreaterThanOrEqual(48);
  expect(Math.abs(book.x - deck.x) + 22).toBeLessThanOrEqual(deck.w / 2);
});

it("ends the striped road with a jump onto the red finish platform", () => {
  const level = levelJson();
  const stripes = level.solids.filter((s) => /^bw-[0-9]/.test(s.id));
  expect(stripes).toHaveLength(6);
  const ramp = level.solids.find((s) => s.id === "ramp-finish")!;
  expect(ramp.angle).toBeLessThan(0);
  const platform = level.solids.find((s) => s.id === "finish-platform")!;
  expect(platform.color).toBe(0xc22a1c);
  expect(platform.z - platform.d / 2).toBeGreaterThan(ramp.z + ramp.d / 2);
  const finish = level.checkpoints[level.checkpoints.length - 1];
  expect(Math.abs(finish.x - platform.x)).toBeLessThan(platform.w / 2);
  expect(Math.abs(finish.z - platform.z)).toBeLessThan(platform.d / 2);
});
