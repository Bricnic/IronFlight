import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initPhysics } from "../src/simulation";
import { getBackgroundTemplate } from "../src/backgrounds";
import { officialFileTracks } from "../src/official-levels";
import { idealLineSeconds } from "../scripts/ideal-line.mjs";
import { driveTabletopBrawlToCompletion } from "./tabletop-brawl-drive";

beforeAll(initPhysics);

const file = "levels/official/Tabletop Brawl.json";

type Level = {
  name: string;
  backgroundTemplate: string;
  mode: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  collectibles: { x: number; y: number; z: number; kind?: string }[];
  solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number }[];
  prefabs: { id: string; kind: string; x: number; z: number }[];
  medals: { gold: number; silver: number; bronze: number };
  limit: number;
};

function load(): Level {
  return JSON.parse(readFileSync(file, "utf8"));
}

it("stages the tabletop arena: 8 scattered rings and copious toy prefabs", () => {
  const level = load();
  expect(level.name).toBe("Tabletop Brawl");
  expect(level.mode).toBe("arena");
  expect(level.backgroundTemplate).toBe("fairground-park");
  expect(getBackgroundTemplate(level.backgroundTemplate).name).toBe("fairground-park");
  expect(level.limit).toBe(240);
  expect(level.collectibles).toHaveLength(8);
  for (const c of level.collectibles) {
    expect(c.kind ?? "ring").toBe("ring");
    expect(c.y).toBeCloseTo(1.7, 1);
  }
  const kinds = level.prefabs.map((p) => p.kind);
  for (const kind of [
    "loop", "raptor", "potion", "cacti-patch", "burner", "ghost",
    "book", "donut", "hydrant", "carousel", "boost-pad", "lamp",
    "barrel", "trash", "sign", "skull", "pumpkin", "loose-blocks",
  ])
    expect(kinds, `prefab ${kind}`).toContain(kind);
  expect(level.prefabs.filter((p) => p.kind === "loop")).toHaveLength(2);
  expect(level.prefabs.filter((p) => p.kind === "ghost")).toHaveLength(2);
  expect(level.prefabs.filter((p) => p.kind === "lamp")).toHaveLength(4);
  expect(level.medals.gold).toBeGreaterThan(0);
  expect(level.medals.silver).toBeGreaterThan(level.medals.gold);
  expect(level.medals.bronze).toBeGreaterThan(level.medals.silver);
  expect(level.medals.bronze).toBeLessThanOrEqual(level.limit);
  const track = officialFileTracks.find((t) => t.id === "custom:tabletop-brawl")!;
  expect(track).toBeDefined();
  expect(track.thumbnail).toBe("/tracks/tabletop-brawl.png");
});

it("keeps every ring clear of the snapping jaws", () => {
  const level = load();
  const jaws = level.prefabs.filter((p) => ["book", "donut"].includes(p.kind));
  expect(jaws.length).toBeGreaterThan(0);
  for (const ring of level.collectibles)
    for (const jaw of jaws)
      expect(
        Math.hypot(ring.x - jaw.x, ring.z - jaw.z),
        `ring (${ring.x},${ring.z}) vs ${jaw.id}`,
      ).toBeGreaterThanOrEqual(10);
});

it("needs at least 30 seconds on the ideal line, and gold stays achievable", () => {
  const level = load();
  const ideal = idealLineSeconds(level);
  expect(ideal, `ideal ${ideal.toFixed(1)}s`).toBeGreaterThanOrEqual(30);
  expect(ideal, "gold achievable").toBeLessThanOrEqual(level.medals.gold);
});

it("collects all 8 rings within the limit", () => {
  const elapsed = driveTabletopBrawlToCompletion();
  expect(elapsed).toBeLessThan(240);
});
