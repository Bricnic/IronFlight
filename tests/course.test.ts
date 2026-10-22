import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { courseSolids, courseAvailable } from "../src/course";
import { getTrack } from "../src/tracks";
import { courseDriver } from "./course-driver";
beforeAll(initPhysics);
it("Harbor Sprint has shared ground, road and collidable cargo geometry", () => {
  const solids = courseSolids(getTrack("harbor-sprint"));
  expect(courseAvailable("harbor-sprint")).toBe(true);
  expect(solids.some((s) => s.kind === "ground")).toBe(true);
  expect(solids.filter((s) => s.kind === "container").length).toBeGreaterThan(
    3,
  );
});
it("physically drives Harbor Sprint from spawn through every gate to the finish", () => {
  const s = new Simulation();
  s.startTrack("harbor-sprint");
  for (let i = 0; i < 120 * 100 && s.trackRun?.status === "running"; i++)
    s.step(courseDriver(s.snapshot(), getTrack("harbor-sprint")));
  expect(
    s.trackRun?.status,
    JSON.stringify({ run: s.trackRun?.snapshot(), p: s.body.translation() }),
  ).toBe("completed");
  expect(s.trackRun?.checkpoint).toBe(
    getTrack("harbor-sprint").checkpoints.length,
  );
  expect(s.snapshot().integrity).toBeGreaterThan(0.8);
  s.dispose();
});
