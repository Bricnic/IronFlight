import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initPhysics, Simulation } from "../src/simulation";
import { getBackgroundTemplate } from "../src/backgrounds";
import { officialFileTracks } from "../src/official-levels";
import { registerCustomTrack } from "../src/custom-level";
import { idealLineSeconds } from "../scripts/ideal-line.mjs";
import {
  SPIDER_HOLLOW_ROUTE,
  driveSpiderHollowToCompletion,
} from "./spider-drive";

beforeAll(initPhysics);

const file = "levels/official/Spider Hollow.json";

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

it("stages the hollow: book, raptor, tube, web, forks, three pits", () => {
  const level = load();
  expect(level.name).toBe("Spider Hollow");
  expect(level.mode).toBe("race");
  expect(level.backgroundTemplate).toBe("haunted-night");
  expect(getBackgroundTemplate(level.backgroundTemplate).name).toBe("haunted-night");
  expect(level.limit).toBe(240);
  expect(level.checkpoints.map((c) => c.name)).toEqual([
    "Dino Pass",
    "Web Bypass",
    "Pit's Edge",
    "Finish",
  ]);
  const kinds = level.prefabs.map((p) => p.kind);
  for (const kind of ["book", "raptor", "spider", "spike-gates", "burning-coals"])
    expect(kinds, `prefab ${kind}`).toContain(kind);
  expect(level.prefabs.filter((p) => p.kind === "burning-coals")).toHaveLength(6);
  expect(level.solids.some((s) => s.kind === "slime")).toBe(true);
  expect(level.solids.filter((s) => s.id.startsWith("tube-"))).toHaveLength(9);
  expect(level.medals.gold).toBeGreaterThan(0);
  expect(level.medals.silver).toBeGreaterThan(level.medals.gold);
  expect(level.medals.bronze).toBeGreaterThan(level.medals.silver);
  expect(level.medals.bronze).toBeLessThanOrEqual(level.limit);
  const track = officialFileTracks.find((t) => t.id === "custom:spider-hollow")!;
  expect(track).toBeDefined();
  expect(track.thumbnail).toBe("/tracks/spider-hollow.png");
});

it("needs at least 30 seconds on the ideal line", () => {
  expect(idealLineSeconds(load())).toBeGreaterThanOrEqual(30);
});

it("keeps the whole driven route on road slabs with no gaps", () => {
  const level = load();
  const roads = level.solids.filter((s) => s.kind === "road");
  expect(roads.length).toBeGreaterThan(0);
  const covered = (x: number, z: number) =>
    roads.some((s) => {
      const yaw = s.yaw ?? 0;
      const dx = x - s.x, dz = z - s.z;
      const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
      const lz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      return Math.abs(lx) <= s.w / 2 && Math.abs(lz) <= s.d / 2;
    });
  for (let i = 1; i < SPIDER_HOLLOW_ROUTE.length; i++) {
    const [ax, az] = SPIDER_HOLLOW_ROUTE[i - 1];
    const [bx, bz] = SPIDER_HOLLOW_ROUTE[i];
    for (let t = 0; t <= 1; t += 0.1) {
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      expect(covered(x, z), `route near (${x.toFixed(1)},${z.toFixed(1)})`).toBe(true);
    }
  }
});

it("drives the hollow and finishes without touching silk", () => {
  const elapsed = driveSpiderHollowToCompletion();
  expect(elapsed).toBeLessThan(240);
}, 180000);

function plunge(x: number, y: number, z: number, seconds: number) {
  registerCustomTrack(officialFileTracks.find((t) => t.id === "custom:spider-hollow")!);
  const sim = new Simulation();
  try {
    sim.startTrack("custom:spider-hollow");
    sim.body.setTranslation({ x, y, z }, true);
    sim.run(seconds);
    return { status: sim.trackRun!.status, events: [...sim.damageEvents] };
  } finally {
    sim.dispose();
  }
}

it("spike pit slams wandering trucks", () => {
  const { status, events } = plunge(95, 2, 0, 20);
  expect(status).toBe("failed");
  expect(events.some((e) => e.source === "spike-gates")).toBe(true);
});

it("fire pit burns wandering trucks", () => {
  const { status, events } = plunge(104, -9, -54, 30);
  expect(status).toBe("failed");
  expect(events.some((e) => e.source === "burning-coals")).toBe(true);
});

it("slime pit strips wandering trucks", () => {
  const { status } = plunge(-5, 2, -60, 20);
  expect(status).toBe("failed");
});
