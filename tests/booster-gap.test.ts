import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";
import { driveBoosterToCompletion } from "./booster-drive";

const id = "custom:booster-gap";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});

const levelJson = () =>
  JSON.parse(
    readFileSync("levels/official/Booster Gap.json", "utf8"),
  ) as {
    solids: { id: string; kind: string; name: string; x: number; y: number; z: number; w: number; h: number; d: number; color: number }[];
    checkpoints: { name: string }[];
    limit: number;
    medals: { gold: number; silver: number; bronze: number };
    backgroundTemplate: string;
    rings: { goal?: boolean }[];
    prefabs: { id: string; kind: string; x: number; z: number }[];
  };

it("places a booster before a wide gap and a standing red brick at the finish", () => {
  const level = levelJson();
  const pads = level.prefabs.filter((p) => p.kind === "boost-pad");
  expect(pads).toHaveLength(1);
  const brick = level.solids.find((s) => s.id === "finish-brick")!;
  expect(brick.h).toBeGreaterThanOrEqual(8);
  expect(brick.color).toBe(12597547);
  const kicker = level.solids.find((s) => s.id === "k2-gap-kicker")!;
  const landing = level.solids.find((s) => s.id === "f1-gap-landing")!;
  expect(landing.z - landing.d / 2 - (kicker.z + kicker.d / 2)).toBeGreaterThanOrEqual(30);
  const kinds = level.prefabs.map((p) => p.kind);
  expect(kinds).toContain("lime-chomper");
  const ids = level.solids.map((s) => s.id);
  expect(ids).toContain("slime-pit");
  expect(ids).toContain("k1-slime-kicker");
});

it("runs two checkpoints plus a goal ring under a four-minute limit", () => {
  const level = levelJson();
  expect(level.limit).toBe(240);
  expect(level.medals.bronze).toBeLessThan(240);
  expect(level.checkpoints).toHaveLength(3);
  expect(level.rings.filter((r) => r.goal)).toHaveLength(1);
  expect(level.backgroundTemplate).toBe("toybox-volcano");
});

it("drives arch, slime jump, booster gap and junction to the brick in under four minutes", () => {
  driveBoosterToCompletion();
});

it("kills a truck that lands in the slime pit", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 0, y: 27, z: -28.64 }, true);
    sim.run(2);
    expect(sim.trackRun!.status).toBe("failed");
    expect(sim.damageEvents.some((event) => event.source === "slime")).toBe(
      true,
    );
  } finally {
    sim.dispose();
  }
});

it("fails a truck that falls into the gap", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 0, y: 10, z: 86 }, true);
    sim.run(3);
    expect(sim.trackRun!.status).toBe("failed");
    expect(sim.damageEvents.some((event) => event.source === "lava")).toBe(
      true,
    );
  } finally {
    sim.dispose();
  }
});

it("keeps background shape bases on the lava from anywhere on the route", () => {
  const level = JSON.parse(
    readFileSync("levels/official/Booster Gap.json", "utf8"),
  ) as {
    backgroundTemplate: string;
    spawn: { x: number; z: number };
    checkpoints: { x: number; z: number }[];
    rings: { x: number; z: number }[];
    solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number }[];
  };
  const template = JSON.parse(
    readFileSync(`levels/backgrounds/${level.backgroundTemplate}.json`, "utf8"),
  ) as { shapes: { radius: number; y?: number }[] };
  const lava = level.solids.find((s) => s.kind === "lava")!;
  const lavaTop = lava.y + lava.h / 2;
  const points = [level.spawn, ...level.checkpoints, ...level.rings];
  const route = {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minZ: Math.min(...points.map((p) => p.z)),
    maxZ: Math.max(...points.map((p) => p.z)),
  };
  for (const ring of template.shapes.filter((s) => Math.abs(s.y ?? 0) < 10)) {
    expect(lava.x - lava.w / 2).toBeLessThanOrEqual(route.minX - ring.radius);
    expect(lava.x + lava.w / 2).toBeGreaterThanOrEqual(route.maxX + ring.radius);
    expect(lava.z - lava.d / 2).toBeLessThanOrEqual(route.minZ - ring.radius);
    expect(lava.z + lava.d / 2).toBeGreaterThanOrEqual(route.maxZ + ring.radius);
    expect(ring.y ?? 0).toBeLessThanOrEqual(lavaTop + 0.5);
    expect(ring.y ?? 0).toBeGreaterThanOrEqual(lavaTop - 6);
  }
});
