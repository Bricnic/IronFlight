import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { getTrack } from "../src/tracks";
import { DEFAULT_TUNING } from "../src/tuning";
import {
  GhostSwarm,
  ghostDefs,
  seekNext,
  GHOST_SPEED,
  GHOST_RADIUS,
  GHOST_DRAIN,
} from "../src/ghosts";
import { buildGhostMeshes, ghostStats } from "../src/course-view";
import {
  blankLevel,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
beforeAll(initPhysics);
it("haunts the hollow with three distant ghosts and nowhere else", () => {
  const defs = ghostDefs(getTrack("haunted-hollow"));
  expect(defs).toHaveLength(3);
  expect(new Set(defs.map((d) => d.id)).size).toBe(3);
  const spawn = getTrack("haunted-hollow").spawn;
  for (const d of defs) {
    expect(Number.isFinite(d.x + d.z + d.phase)).toBe(true);
    expect(Math.hypot(d.x - spawn.x, d.z - spawn.z)).toBeGreaterThan(15);
  }
  expect(ghostDefs(getTrack("harbor-sprint"))).toEqual([]);
  expect(ghostDefs()).toEqual([]);
});
it("spawns custom ghost prefabs and nowhere else", () => {
  const level = blankLevel("Ghost Yard");
  level.prefabs.push({ id: "gh-1", kind: "ghost", x: -9, z: 12 });
  const track = toTrack(validateCustomLevel(level));
  const defs = ghostDefs(track);
  expect(defs).toHaveLength(1);
  expect(defs[0]).toMatchObject({ id: "gh-1", x: -9, z: 12 });
});
it("seek steering closes distance at a capped, escapable speed", () => {
  expect(GHOST_SPEED).toBeLessThan(25 * DEFAULT_TUNING.topSpeed);
  const next = seekNext(
    { x: 0, y: 3, z: 0 },
    { x: 30, y: 2, z: 0 },
    GHOST_SPEED,
    1,
  );
  expect(Math.hypot(next.x, next.y - 3, next.z)).toBeCloseTo(GHOST_SPEED, 6);
  const arrived = seekNext(
    { x: 29.9, y: 2, z: 0 },
    { x: 30, y: 2, z: 0 },
    GHOST_SPEED,
    1,
  );
  expect(Math.hypot(arrived.x - 30, arrived.y - 2, arrived.z)).toBeLessThan(
    1e-9,
  );
});
it("ghosts catch an idle truck and drain its integrity", () => {
  const sim = new Simulation();
  const swarm = new GhostSwarm(sim, getTrack("haunted-hollow"));
  for (let i = 0; i < 30 * 120; i++) {
    swarm.update();
    sim.step({});
    swarm.attack();
  }
  expect(swarm.snapshot().ghosts.some((g) => g.contacts > 0)).toBe(true);
  expect(sim.snapshot(false).integrity).toBeLessThan(1);
  sim.dispose();
});
it("a ghost parked on the truck eventually wrecks it", () => {
  expect(GHOST_DRAIN).toBeGreaterThan(0);
  expect(GHOST_RADIUS).toBeGreaterThan(0);
  const sim = new Simulation();
  const swarm = new GhostSwarm(sim, getTrack("haunted-hollow"));
  const g = swarm.snapshot().ghosts[0];
  sim.body.setTranslation({ x: g.x, y: 2.1, z: g.z }, true);
  for (let i = 0; i < 5 * 120; i++) {
    swarm.update();
    sim.step({});
    swarm.attack();
  }
  const integrity = sim.snapshot(false).integrity;
  expect(integrity).toBeGreaterThan(0.6);
  expect(integrity).toBeLessThan(0.9);
  for (let i = 0; i < 35 * 120; i++) {
    swarm.update();
    sim.step({});
    swarm.attack();
  }
  expect(sim.status).toBe("wrecked");
  expect(sim.damageEvents.some((e) => e.source === "ghost")).toBe(true);
  sim.dispose();
});
it("ghost snapshots expose finite positions for the view and drivers", () => {
  const sim = new Simulation();
  const swarm = new GhostSwarm(sim, getTrack("haunted-hollow"));
  swarm.update();
  sim.step({});
  swarm.attack();
  const snap = swarm.snapshot();
  expect(snap.ghosts).toHaveLength(3);
  for (const g of snap.ghosts) {
    expect(Number.isFinite(g.x + g.y + g.z)).toBe(true);
    expect(typeof g.overlapping).toBe("boolean");
  }
  expect(sim.snapshot(false).ghosts.ghosts).toHaveLength(0);
  sim.dispose();
});
it("ghost meshes are translucent sheet phantoms with visible faces", () => {
  const group = buildGhostMeshes(3);
  const stats = ghostStats(group);
  expect(stats.ghosts).toBe(3);
  expect(stats.triangles).toBeGreaterThan(500);
  expect(stats.translucent).toBeGreaterThanOrEqual(4);
  expect(stats.eyes).toBe(6);
});
