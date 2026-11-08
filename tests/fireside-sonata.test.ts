import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";

const id = "custom:fireside-sonata";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});

const levelJson = () =>
  JSON.parse(
    readFileSync("levels/official/Fireside Sonata.json", "utf8"),
  ) as {
    solids: { id: string; w: number; d: number; pianoKey?: number }[];
    limit: number;
    rings: { goal?: boolean }[];
    prefabs: { kind: string }[];
  };

it("gives the white table a 150-unit diameter", () => {
  const table = levelJson().solids.find((s) => s.id === "table-top")!;
  expect(table.w).toBe(150);
  expect(table.d).toBe(150);
});

it("runs the piano octave and a goal ring under an eight-minute limit", () => {
  const level = levelJson();
  expect(level.limit).toBe(480);
  const kinds = level.prefabs.map((p) => p.kind);
  expect(kinds.filter((k) => k === "scissors")).toHaveLength(2);
  expect(kinds.filter((k) => k === "hydrant")).toHaveLength(1);
  const keys = level.solids
    .filter((s) => s.pianoKey !== undefined)
    .map((s) => s.pianoKey);
  expect(keys).toEqual([0, 1, 2, 3, 4, 5, 6]);
  expect(level.rings.filter((r) => r.goal)).toHaveLength(1);
});

it("drives fireplace, table, chair bridge and piano to the ring in under eight minutes", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    const route = [
      [0, -170, 14, 8], [0, -120, 16, 10], [0, -75, 12, 8],
      [12, -45, 8, 6], [12, -22, 7, 5],
      [-6, 4, 6, 5],
      [0, 15, 8, 6],
      [28, 18, 10, 5], [44, 24, 9, 5],
      [64, 22, 9, 5],
      [85, 26, 9, 6], [100, 32, 8, 6], [112, 40, 8, 6],
      [126, 51, 5, 6], [140, 61, 5, 6],
      [156, 71, 7, 6], [170, 80, 7, 6], [183, 93, 7, 6],
      [192, 100, 7, 5],
      [200, 108, 8, 5], [200, 125, 10, 6], [200, 145, 10, 6],
      [200, 165, 10, 6], [200, 192, 10, 0],
    ];
    let next = 0;
    for (
      let i = 0;
      i < 240 / DT && sim.trackRun!.status === "running";
      i++
    ) {
      const p = sim.body.translation();
      const [wx, wz, , reach] = route[next];
      if (Math.hypot(wx - p.x, wz - p.z) < reach) next++;
      const [x, z, speed] = route[next];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const aim =
        Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(aim), Math.cos(aim));
      const v = sim.body.linvel();
      const pace = Math.hypot(v.x, v.z);
      const cap = Math.abs(error) > 0.58 ? Math.min(6, speed) : speed;
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: pace < cap ? 1 : 0,
        brake: pace > cap + 0.65 ? 0.65 : 0,
      });
    }
    expect(
      sim.trackRun!.status,
      `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`,
    ).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(sim.trackRun!.ringsDone).toContain(0);
    expect(sim.trackRun!.elapsed).toBeLessThan(480);
    expect(sim.pianoPresses().map((p) => p.key).sort()).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  } finally {
    sim.dispose();
  }
}, 60000);

it("fails a truck that falls into the lava", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 100, y: 10, z: -100 }, true);
    sim.run(3);
    expect(sim.trackRun!.status).toBe("failed");
    expect(sim.damageEvents.some((event) => event.source === "lava")).toBe(
      true,
    );
  } finally {
    sim.dispose();
  }
});
it("snaps a truck parked in the table shears", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 30, y: 32, z: 34 }, true);
    sim.run(6);
    expect(sim.trackRun!.status).toBe("failed");
  } finally {
    sim.dispose();
  }
});

it("launches a truck that touches the table hydrant", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 52, y: 32, z: 38 }, true);
    sim.run(2);
    expect(sim.damageEvents.some((event) => event.source === "hydrant")).toBe(
      true,
    );
  } finally {
    sim.dispose();
  }
});
it("keeps background shape bases on the lava from anywhere on the route", () => {
  const level = JSON.parse(
    readFileSync("levels/official/Fireside Sonata.json", "utf8"),
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
  for (const ring of template.shapes) {
    // The ring follows the camera, so the lava must reach it from every
    // route point; bases sit on the surface instead of floating over void.
    expect(lava.x - lava.w / 2).toBeLessThanOrEqual(route.minX - ring.radius);
    expect(lava.x + lava.w / 2).toBeGreaterThanOrEqual(route.maxX + ring.radius);
    expect(lava.z - lava.d / 2).toBeLessThanOrEqual(route.minZ - ring.radius);
    expect(lava.z + lava.d / 2).toBeGreaterThanOrEqual(route.maxZ + ring.radius);
    expect(Math.abs((ring.y ?? 0) - lavaTop)).toBeLessThan(1);
  }
});
