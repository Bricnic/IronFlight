import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Simulation, initPhysics } from "../src/simulation";
import { driveRingChaseToCompletion } from "./ring-chase-drive";

beforeAll(initPhysics);

const id = "custom:ring-chase";
const file = "levels/official/Ring Chase.json";

type Level = {
  name: string;
  backgroundTemplate: string;
  mode: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  collectibles: { x: number; y: number; z: number }[];
  solids: { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number }[];
  prefabs: { id: string; kind: string; x: number; z: number }[];
  medals: { gold: number; silver: number; bronze: number };
  limit: number;
};

function load(): Level {
  return JSON.parse(readFileSync(file, "utf8"));
}

it("stages the sketch arena: rings, carousel, bumpers, jaws, ghosts", () => {
  const level = load();
  expect(level.mode).toBe("arena");
  expect(level.backgroundTemplate).toBe("fairground-park");
  expect(level.limit).toBe(240);
  expect(level.collectibles).toHaveLength(18);
  const kinds = level.prefabs.map((p) => p.kind);
  for (const kind of ["carousel", "bumper-arena", "book", "ghost"])
    expect(kinds).toContain(kind);
  expect(kinds.filter((k) => k === "donut")).toHaveLength(2);
  expect(kinds.filter((k) => k === "ghost").length).toBeGreaterThanOrEqual(3);
  const lava = level.solids.filter((s) => s.kind === "lava");
  expect(lava.length).toBeGreaterThanOrEqual(4);
});

it("keeps rings clear of jaw plates and ride footprints", () => {
  const level = load();
  const jaws = level.prefabs.filter((p) =>
    ["book", "donut"].includes(p.kind),
  );
  for (const ring of level.collectibles)
    for (const jaw of jaws)
      expect(Math.hypot(ring.x - jaw.x, ring.z - jaw.z)).toBeGreaterThan(10);
  const carousel = level.prefabs.find((p) => p.kind === "carousel")!;
  for (const ring of level.collectibles)
    expect(Math.hypot(ring.x - carousel.x, ring.z - carousel.z)).toBeGreaterThan(34);
  const bumper = level.prefabs.find((p) => p.kind === "bumper-arena")!;
  for (const ring of level.collectibles) {
    const dx = Math.max(Math.abs(ring.x - bumper.x) - 32, 0);
    const dz = Math.max(Math.abs(ring.z - bumper.z) - 25, 0);
    expect(Math.hypot(dx, dz)).toBeGreaterThan(8);
  }
});

it("collects all 18 rings in under four minutes", () => {
  const elapsed = driveRingChaseToCompletion();
  expect(elapsed).toBeLessThan(240);
});

it("melts a truck parked in a donut", () => {
  const level = load();
  const donut = level.prefabs.find((p) => p.kind === "donut")!;
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: donut.x, y: 3, z: donut.z }, true);
    sim.run(4);
    expect(sim.trackRun!.status).toBe("failed");
    expect(
      sim.damageEvents.some((event) => event.source === "donut"),
    ).toBe(true);
  } finally {
    sim.dispose();
  }
});
