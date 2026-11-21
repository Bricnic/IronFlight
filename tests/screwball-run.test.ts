import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initPhysics } from "../src/simulation";
import { getBackgroundTemplate } from "../src/backgrounds";
import { officialFileTracks } from "../src/official-levels";
import { idealLineSeconds } from "../scripts/ideal-line.mjs";
import {
  SCREWBALL_ROUTE,
  driveScrewballToCompletion,
} from "./screwball-drive";

beforeAll(initPhysics);

const file = "levels/official/toybox-adventures/Screwball Run.json";

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

it("stages the run: tube, snowball, teeter-totter, mailbox, twin screws", () => {
  const level = load();
  expect(level.name).toBe("Screwball Run");
  expect(level.mode).toBe("race");
  expect(level.backgroundTemplate).toBe("toybox-volcano");
  expect(getBackgroundTemplate(level.backgroundTemplate).name).toBe("toybox-volcano");
  expect(level.limit).toBe(240);
  expect(level.checkpoints.map((c) => c.name)).toEqual([
    "Snow Gate",
    "Teeter Exit",
    "Screw Pass",
    "Finish",
  ]);
  const kinds = level.prefabs.map((p) => p.kind);
  for (const kind of ["speed-tube", "snowball", "teeter-totter", "mailbox", "screw-field"])
    expect(kinds, `prefab ${kind}`).toContain(kind);
  expect(level.prefabs.filter((p) => p.kind === "screw-field")).toHaveLength(2);
  expect(level.medals.gold).toBeGreaterThan(0);
  expect(level.medals.silver).toBeGreaterThan(level.medals.gold);
  expect(level.medals.bronze).toBeGreaterThan(level.medals.silver);
  expect(level.medals.bronze).toBeLessThanOrEqual(level.limit);
  const track = officialFileTracks.find((t) => t.id === "custom:screwball-run")!;
  expect(track).toBeDefined();
  expect(track.thumbnail).toBe("/tracks/screwball-run.png");
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
  for (let i = 1; i < SCREWBALL_ROUTE.length; i++) {
    const [ax, az] = SCREWBALL_ROUTE[i - 1];
    const [bx, bz] = SCREWBALL_ROUTE[i];
    // The teeter-totter deck bridges its pit; no road slab there.
    if (Math.min(az, bz) < 317 && Math.max(az, bz) > 283) continue;
    for (let t = 0; t <= 1; t += 0.1) {
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      expect(covered(x, z), `route near (${x.toFixed(1)},${z.toFixed(1)})`).toBe(true);
    }
  }
});

it("rides the tube, smashes the snowball and finishes", () => {
  const elapsed = driveScrewballToCompletion();
  expect(elapsed).toBeLessThan(240);
}, 180000);
