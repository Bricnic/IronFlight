import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { getTrack } from "../src/tracks";
import { courseDriver } from "./course-driver";
import { courseProps, courseSolids } from "../src/course";
beforeAll(initPhysics);
it("Scrapyard Sweep has a populated arena with twelve reachable tokens", () => {
  const t = getTrack("scrapyard-sweep");
  expect(
    courseSolids(t).filter((s) => s.kind === "container").length,
  ).toBeGreaterThan(5);
  expect(courseProps(t).length).toBeGreaterThan(3);
  expect(t.collectibles).toHaveLength(12);
});
it("collects all scrap with at least 30 seconds left on its two-minute timer", () => {
  const t = getTrack("scrapyard-sweep"),
    s = new Simulation();
  s.startTrack(t.id);
  for (let i = 0; i < 120 * 120 && s.trackRun?.status === "running"; i++)
    s.step(courseDriver(s.snapshot(false), t));
  expect(
    s.trackRun?.status,
    JSON.stringify({ run: s.trackRun?.snapshot(), p: s.body.translation() }),
  ).toBe("completed");
  expect(s.trackRun?.collected.size).toBe(12);
  expect(s.trackRun!.elapsed).toBeLessThanOrEqual(90);
  expect(s.snapshot().integrity).toBeGreaterThan(0.5);
  s.dispose();
});
