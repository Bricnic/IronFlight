import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { getTrack } from "../src/tracks";
import { courseDriver } from "./course-driver";
import { TrackRun } from "../src/track-run";
beforeAll(initPhysics);
it("Skyline Circuit cannot win by recrossing its start line without sectors", () => {
  const t = getTrack("skyline-circuit"),
    r = new TrackRun(t);
  r.step(1, { x: -2, y: 2, z: -80 }, { x: 2, y: 2, z: -80 }, 1);
  expect(r.status).toBe("running");
  expect(r.checkpoint).toBe(0);
});
it("completes a physical full lap through all sixteen sectors", () => {
  const t = getTrack("skyline-circuit"),
    s = new Simulation();
  s.startTrack(t.id);
  for (let i = 0; i < 120 * 100 && s.trackRun?.status === "running"; i++)
    s.step(courseDriver(s.snapshot(false), t));
  expect(
    s.trackRun?.status,
    JSON.stringify({ run: s.trackRun?.snapshot(), p: s.body.translation() }),
  ).toBe("completed");
  expect(s.trackRun?.checkpoint).toBe(16);
  expect(s.snapshot().integrity).toBeGreaterThan(0.8);
  s.dispose();
});
