import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { getTrack } from "../src/tracks";
import { courseDriver } from "./course-driver";
import { courseHazards, courseSolids } from "../src/course";
beforeAll(initPhysics);
it("Inferno Vault has supported fire, rotating machinery and protected lava", () => {
  const t = getTrack("inferno-vault"),
    solids = courseSolids(t),
    hazards = courseHazards(t);
  expect(solids.some((s) => s.kind === "lava")).toBe(true);
  expect(solids.filter((s) => s.kind === "support").length).toBeGreaterThan(3);
  expect(hazards.some((h) => h.kind === "hammer")).toBe(true);
  expect(hazards.some((h) => h.kind === "fire")).toBe(true);
  for (const p of t.collectibles)
    expect(
      solids.some(
        (s) =>
          s.kind === "lava" &&
          Math.abs(p.x - s.x) < s.w / 2 &&
          Math.abs(p.z - s.z) < s.d / 2,
      ),
    ).toBe(false);
});
it("collects all ten cores at least 37.5 seconds before its 150-second deadline", () => {
  const t = getTrack("inferno-vault"),
    s = new Simulation();
  s.startTrack(t.id);
  for (let i = 0; i < 120 * 150 && s.trackRun?.status === "running"; i++)
    s.step(courseDriver(s.snapshot(false), t));
  expect(
    s.trackRun?.status,
    JSON.stringify({ run: s.trackRun?.snapshot(), p: s.body.translation() }),
  ).toBe("completed");
  expect(s.trackRun?.collected.size).toBe(10);
  expect(s.trackRun!.elapsed).toBeLessThanOrEqual(112.5);
  expect(s.snapshot().integrity).toBeGreaterThan(0.4);
  s.dispose();
});
