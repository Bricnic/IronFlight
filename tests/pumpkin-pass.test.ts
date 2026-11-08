import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";
import { drivePumpkinToCompletion } from "./pumpkin-drive";

const id = "custom:pumpkin-pass";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});

const levelJson = () =>
  JSON.parse(
    readFileSync("levels/official/Pumpkin Pass.json", "utf8"),
  ) as {
    solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number }[];
    checkpoints: { name: string }[];
    limit: number;
    medals: { gold: number; silver: number; bronze: number };
    backgroundTemplate: string;
    rings: { goal?: boolean }[];
    prefabs: { kind: string }[];
  };

it("lines the path with trash and guards the sides with hazards", () => {
  const level = levelJson();
  const kinds = level.prefabs.map((p) => p.kind);
  const count = (kind: string) => kinds.filter((k) => k === kind).length;
  expect(count("trash")).toBeGreaterThanOrEqual(50);
  expect(count("book")).toBeGreaterThanOrEqual(6);
  expect(count("computer")).toBeGreaterThanOrEqual(6);
  expect(count("clippers")).toBeGreaterThanOrEqual(4);
  expect(count("scissors")).toBeGreaterThanOrEqual(4);
  expect(count("axe")).toBeGreaterThanOrEqual(3);
});

it("runs two checkpoints plus a goal ring under a four-minute limit", () => {
  const level = levelJson();
  expect(level.limit).toBe(240);
  expect(level.medals.bronze).toBeLessThan(240);
  expect(level.checkpoints).toHaveLength(3);
  expect(level.rings.filter((r) => r.goal)).toHaveLength(1);
  const ids = level.solids.map((s) => s.id);
  expect(ids).toContain("slime-pit");
  expect(ids).toContain("k1-kicker");
  expect(ids).toContain("l1-landing");
  expect(level.backgroundTemplate).toBe("haunted-night");
});

it("drives straight, bend, slide, slime jump and loop turn in under four minutes", () => {
  drivePumpkinToCompletion();
});

it("kills a truck that lands in the slime pit", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 50.5, y: 27, z: 75.8 }, true);
    sim.run(2);
    expect(sim.trackRun!.status).toBe("failed");
    expect(sim.damageEvents.some((event) => event.source === "slime")).toBe(
      true,
    );
  } finally {
    sim.dispose();
  }
});

it("snaps a truck parked in the trackside shears", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 13, y: 31, z: -61 }, true);
    sim.run(6);
    expect(sim.trackRun!.status).toBe("failed");
  } finally {
    sim.dispose();
  }
});

it("keeps background shape bases on the lava from anywhere on the route", () => {
  const level = JSON.parse(
    readFileSync("levels/official/Pumpkin Pass.json", "utf8"),
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
    // The ring follows the camera, so the lava must reach it from every
    // route point; ground-ring bases sit on the surface, never floating
    // over the void and never buried.
    expect(lava.x - lava.w / 2).toBeLessThanOrEqual(route.minX - ring.radius);
    expect(lava.x + lava.w / 2).toBeGreaterThanOrEqual(route.maxX + ring.radius);
    expect(lava.z - lava.d / 2).toBeLessThanOrEqual(route.minZ - ring.radius);
    expect(lava.z + lava.d / 2).toBeGreaterThanOrEqual(route.maxZ + ring.radius);
    expect(ring.y ?? 0).toBeLessThanOrEqual(lavaTop + 0.5);
    expect(ring.y ?? 0).toBeGreaterThanOrEqual(lavaTop - 6);
  }
});
