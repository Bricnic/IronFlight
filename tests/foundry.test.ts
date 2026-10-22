import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { courseSolids, courseHazards } from "../src/course";
import { getTrack } from "../src/tracks";
import { courseDriver } from "./course-driver";
beforeAll(initPhysics);
it("Foundry Run has a physical launch ramp and supported timed machinery", () => {
  const track = getTrack("foundry-run"),
    solids = courseSolids(track),
    hazards = courseHazards(track);
  expect(solids.some((s) => s.kind === "ramp")).toBe(true);
  expect(solids.some((s) => s.kind === "support")).toBe(true);
  expect(hazards.some((h) => h.kind === "hammer")).toBe(true);
  expect(hazards.some((h) => h.kind === "fire" && h.period)).toBe(true);
});
it("drives the entire foundry, launches over its ramp and reaches the finish alive", () => {
  const track = getTrack("foundry-run"),
    s = new Simulation();
  s.startTrack(track.id);
  let peak = 0;
  for (let i = 0; i < 120 * 100 && s.trackRun?.status === "running"; i++) {
    s.step(courseDriver(s.snapshot(false), track));
    peak = Math.max(peak, s.body.translation().y);
  }
  expect(
    s.trackRun?.status,
    JSON.stringify({ run: s.trackRun?.snapshot(), p: s.body.translation() }),
  ).toBe("completed");
  expect(peak).toBeGreaterThan(3.1);
  expect(s.snapshot().integrity).toBeGreaterThan(0.4);
  s.dispose();
});
