import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initPhysics } from "../src/simulation";
import { getBackgroundTemplate } from "../src/backgrounds";
import { officialFileTracks } from "../src/official-levels";
import { idealLineSeconds } from "../scripts/ideal-line.mjs";
import {
  SHIPYARD_ROUTE,
  driveShipyardToCompletion,
} from "./shipyard-drive";

beforeAll(initPhysics);

const file = "levels/official/Shipyard.json";

type Level = {
  name: string;
  backgroundTemplate: string;
  mode: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  checkpoints: { name: string; x: number; y: number; z: number }[];
  solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number; yaw?: number }[];
  prefabs: { id: string; kind: string; x: number; z: number }[];
  medals: { gold: number; silver: number; bronze: number };
  limit: number;
};

function load(): Level {
  return JSON.parse(readFileSync(file, "utf8"));
}

it("stages the shipyard: pelican, anchors, channel, ramp, departing ferry", () => {
  const level = load();
  expect(level.name).toBe("Shipyard");
  expect(level.mode).toBe("race");
  expect(level.backgroundTemplate).toBe("city-skyline");
  expect(getBackgroundTemplate(level.backgroundTemplate).name).toBe("city-skyline");
  expect(level.limit).toBe(240);
  expect(level.checkpoints.map((c) => c.name)).toEqual([
    "Container Gate",
    "Waterfront",
    "Dock Edge",
    "Finish",
  ]);
  const kinds = level.prefabs.map((p) => p.kind);
  for (const kind of ["pelican", "anchor", "ship", "water"])
    expect(kinds, `prefab ${kind}`).toContain(kind);
  expect(level.prefabs.filter((p) => p.kind === "anchor")).toHaveLength(2);
  expect(
    level.prefabs.filter((p) => p.kind === "water").length,
  ).toBeGreaterThanOrEqual(20);
  const ids = level.solids.map((s) => s.id);
  for (const id of ["ramp-jump", "road-dock"])
    expect(ids, `solid ${id}`).toContain(id);
  expect(level.medals.gold).toBeGreaterThan(0);
  expect(level.medals.silver).toBeGreaterThan(level.medals.gold);
  expect(level.medals.bronze).toBeGreaterThan(level.medals.silver);
  expect(level.medals.bronze).toBeLessThanOrEqual(level.limit);
  const track = officialFileTracks.find((t) => t.id === "custom:shipyard")!;
  expect(track).toBeDefined();
  expect(track.thumbnail).toBe("/tracks/shipyard.png");
});

it("needs at least 30 seconds on the ideal line", () => {
  expect(idealLineSeconds(load())).toBeGreaterThanOrEqual(30);
});

it("keeps the whole driven route on road slabs with no gaps", () => {
  const level = load();
  const roads = level.solids.filter(
    (s) => s.kind === "road" || s.kind === "ramp",
  );
  expect(roads.length).toBeGreaterThan(0);
  const covered = (x: number, z: number) =>
    roads.some((s) => {
      const yaw = s.yaw ?? 0;
      const dx = x - s.x, dz = z - s.z;
      const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
      const lz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      return Math.abs(lx) <= s.w / 2 && Math.abs(lz) <= s.d / 2;
    });
  for (let i = 1; i < SHIPYARD_ROUTE.length; i++) {
    const [ax, az] = SHIPYARD_ROUTE[i - 1];
    const [bx, bz] = SHIPYARD_ROUTE[i];
    // The ramp jump and the ferry deck are not road slabs.
    if (Math.min(ax, bx) > 100) continue;
    for (let t = 0; t <= 1; t += 0.1) {
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      expect(covered(x, z), `route near (${x.toFixed(1)},${z.toFixed(1)})`).toBe(true);
    }
  }
});

it("drives the docks, jumps the channel and finishes on the ferry", () => {
  const elapsed = driveShipyardToCompletion();
  expect(elapsed).toBeLessThan(240);
}, 180000);
