import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { getTrack } from "../src/tracks";
import { courseAvailable, courseSolids } from "../src/course";
import { courseDriver } from "./course-driver";
beforeAll(initPhysics);
it("hollow spreads twelve stones across a fenced arena", () => {
  const track = getTrack("haunted-hollow");
  expect(courseAvailable("haunted-hollow")).toBe(true);
  expect(track.demolish).toHaveLength(12);
  const xs = track.demolish!.map((p) => p.x),
    zs = track.demolish!.map((p) => p.z);
  expect(Math.min(...xs)).toBeLessThan(-100);
  expect(Math.max(...xs)).toBeGreaterThan(100);
  const spawn = track.spawn;
  for (const p of track.demolish!) {
    expect(Math.hypot(p.x - spawn.x, p.z - spawn.z)).toBeGreaterThan(20);
    expect(Math.abs(p.x)).toBeLessThan(165);
    expect(p.z).toBeGreaterThan(-110);
    expect(p.z).toBeLessThan(130);
  }
  const kinds = new Set(courseSolids(track).map((s) => s.kind));
  expect(kinds.has("ground")).toBe(true);
  expect(kinds.has("barrier")).toBe(true);
});
it("a full destruction tour clears every stone within the medal window", () => {
  const track = getTrack("haunted-hollow");
  const s = new Simulation();
  s.startTrack(track.id);
  for (
    let i = 0;
    i < 120 * track.limit! && s.trackRun?.status === "running";
    i++
  )
    s.step(courseDriver(s.snapshot(false), track));
  expect(
    s.trackRun?.status,
    JSON.stringify({ run: s.trackRun?.snapshot(), p: s.body.translation() }),
  ).toBe("completed");
  expect(s.trackRun?.elapsed).toBeGreaterThanOrEqual(120);
  expect(s.trackRun?.elapsed).toBeLessThanOrEqual(track.feasibility!);
  expect(s.snapshot(false).integrity).toBeGreaterThan(0);
  s.dispose();
});
it("parking under the ghosts on the real course wrecks the truck", () => {
  const s = new Simulation();
  s.startTrack("haunted-hollow");
  s.run(60);
  expect(s.trackRun?.status).toBe("failed");
  expect(s.trackRun?.reason).toBe("wrecked");
  expect(
    s.damageEvents.some((e) => e.source === "ghost"),
  ).toBe(true);
  s.dispose();
});
