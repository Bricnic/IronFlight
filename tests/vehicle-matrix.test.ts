import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { TRACK_IDS, getTrack } from "../src/tracks";
import { ROUTES } from "../src/routes";
import { VEHICLES } from "../src/vehicles";
import { courseDriver } from "./course-driver";
import { loopDriver } from "./loop-driver";
beforeAll(initPhysics);
const COURSE_IDS = TRACK_IDS.filter((id) => id !== "triple-loop");
expect(VEHICLES.map((v) => v.id)).toEqual([
  "monster-truck",
  "sports-car",
  "cop-car",
  "ambulance",
  "school-bus",
]);
for (const v of VEHICLES) {
  it(`headless matrix: ${v.id} completes triple-loop (easy)`, () => {
    const s = new Simulation();
    s.setVehicle(v.id);
    s.startTrack("triple-loop", "easy");
    const x = ROUTES.find((r) => r.id === "easy")!.x;
    for (let i = 0; i < 4800 && s.trackRun?.status === "running"; i++)
      s.step(loopDriver(s.snapshot(), x));
    expect(
      s.trackRun?.status,
      JSON.stringify({ run: s.trackRun?.snapshot(), p: s.body.translation() }),
    ).toBe("completed");
    expect(s.snapshot().integrity).toBeGreaterThan(0);
    s.dispose();
  });
  for (const id of COURSE_IDS) {
    it(`headless matrix: ${v.id} completes ${id}`, () => {
      const s = new Simulation();
      s.setVehicle(v.id);
      s.startTrack(id);
      const track = getTrack(id);
      for (let i = 0; i < 120 * 240 && s.trackRun?.status === "running"; i++)
        s.step(courseDriver(s.snapshot(), track));
      expect(
        s.trackRun?.status,
        JSON.stringify({
          run: s.trackRun?.snapshot(),
          p: s.body.translation(),
        }),
      ).toBe("completed");
      expect(s.snapshot().integrity).toBeGreaterThan(0);
      s.dispose();
    });
  }
}
