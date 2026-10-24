import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { getTrack } from "../src/tracks";
import { courseAvailable, courseSolids } from "../src/course";
import { axeDefs } from "../src/axes";
import { courseDriver } from "./course-driver";
beforeAll(initPhysics);
it("canyon catalog finalizes eight elevated gates", () => {
  const track = getTrack("canyon-plunge");
  expect(courseAvailable("canyon-plunge")).toBe(true);
  expect(track.checkpoints).toHaveLength(8);
  expect(track.checkpoints[0].y).toBeGreaterThan(50);
  expect(track.checkpoints[track.checkpoints.length - 1].y).toBeLessThan(10);
  expect(track.spawn.y).toBeGreaterThan(80);
  const kinds = new Set(courseSolids(track).map((s) => s.kind));
  expect(kinds.has("ramp")).toBe(true);
  expect(kinds.has("ground")).toBe(true);
  const axeZ = new Set(axeDefs(track).map((d) => d.z));
  const gantryZ = new Set(
    courseSolids(track)
      .filter((s) => s.id.startsWith("axe-beam"))
      .map((s) => s.z),
  );
  expect(gantryZ).toEqual(axeZ);
});
it("a full ramp-to-finish drive clears the canyon within the medal window", () => {
  const track = getTrack("canyon-plunge");
  const s = new Simulation();
  s.startTrack(track.id);
  let flew = false;
  for (
    let i = 0;
    i < 120 * track.limit! && s.trackRun?.status === "running";
    i++
  ) {
    s.step(courseDriver(s.snapshot(false), track));
    if (i % 12 === 0) {
      const p = s.snapshot(false).position;
      if (p.z > 845 && p.z < 867 && p.y > 5) flew = true;
    }
  }
  expect(
    s.trackRun?.status,
    JSON.stringify({ run: s.trackRun?.snapshot(), p: s.body.translation() }),
  ).toBe("completed");
  expect(s.trackRun?.elapsed).toBeGreaterThanOrEqual(120);
  expect(s.trackRun?.elapsed).toBeLessThanOrEqual(track.feasibility!);
  expect(s.snapshot(false).integrity).toBeGreaterThan(0);
  expect(flew).toBe(true);
  s.dispose();
});
it("falling short of the far rim wrecks in the gorge", () => {
  const s = new Simulation();
  s.startTrack("canyon-plunge");
  s.body.setTranslation({ x: 0, y: 17, z: 852 }, true);
  s.body.setLinvel({ x: 0, y: 0, z: 6 }, true);
  s.run(6);
  expect(s.trackRun?.status).toBe("failed");
  expect(s.trackRun?.reason).toBe("wrecked");
  s.dispose();
});
