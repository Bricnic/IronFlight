import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { getTrack } from "../src/tracks";
import { courseAvailable, courseSolids } from "../src/course";
import { courseDriver } from "./course-driver";
beforeAll(initPhysics);
it("slide channel descends from the sky to the trampoline pad", () => {
  const track = getTrack("sky-slide");
  expect(courseAvailable("sky-slide")).toBe(true);
  const kinds = new Set(courseSolids(track).map((s) => s.kind));
  expect(kinds.has("ramp")).toBe(true);
  expect(kinds.has("ground")).toBe(true);
  expect(track.spawn.y).toBeGreaterThan(50);
  expect(track.checkpoints).toHaveLength(6);
  const ys = track.checkpoints.map((g) => g.y);
  for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
  expect(ys[0]).toBeGreaterThan(50);
  expect(ys[ys.length - 1]).toBeLessThan(10);
  for (const s of courseSolids(track)) {
    if (s.kind !== "ground") continue;
    expect(s.z).toBeGreaterThan(2200);
  }
  expect(track.ring!.y).toBeGreaterThan(15);
});
it("a strafe run rides the slide and rings out within the medal window", () => {
  const track = getTrack("sky-slide");
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
  expect(s.trackRun?.elapsed).toBeGreaterThan(20);
  expect(s.trackRun?.elapsed).toBeLessThanOrEqual(track.feasibility!);
  expect(s.snapshot(false).integrity).toBeGreaterThan(0);
  expect(s.trackRun?.bounced).toBe(true);
  expect(s.trackRun?.ringDone).toBe(true);
  s.dispose();
});
it("sliding off the edge wrecks the truck", () => {
  const s = new Simulation();
  s.startTrack("sky-slide");
  s.run(10);
  for (let i = 0; i < 30 * 120 && s.trackRun?.status === "running"; i++)
    s.step({ steer: 1 });
  expect(s.trackRun?.status).toBe("failed");
  expect(s.trackRun?.reason).toBe("wrecked");
  s.dispose();
});
it.each([1, 2.5, 10])(
  "a straight trampoline approach hits the ring at %sx water speed",
  (multiplier) => {
    const s = new Simulation();
    s.startTrack("sky-slide");
    s.setTuning({ slideWaterSpeed: multiplier });
    const speed = (multiplier * 100) / 3.6;
    s.body.setTranslation({ x: 0, y: 2.1, z: 2340 }, true);
    s.body.setLinvel({ x: 0, y: 0, z: speed }, true);
    for (let i = 0; i < 120 * 10 && !s.trackRun?.ringDone; i++) s.step({});
    expect(s.bounced).toBe(true);
    expect(s.trackRun?.ringDone, JSON.stringify(s.body.translation())).toBe(
      true,
    );
    s.dispose();
  },
);
