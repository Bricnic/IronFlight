import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { LIME_JAW_PERIOD, limeJawPose } from "../src/dungeon-hazards";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";
import { driveChompworksToCompletion } from "./chompworks-drive";

const id = "custom:chompworks";
const track = officialFileTracks.find((t) => t.id === id)!;
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(track);
});

it("can pass both themed checkpoints, time the dinosaur, and finish", () => {
  driveChompworksToCompletion();
});

it("opens slowly, then snaps shut and wrecks a vehicle between the jaws", () => {
  expect(limeJawPose(0.9).openness).toBeGreaterThan(limeJawPose(0.3).openness);
  expect(limeJawPose(1.7).openness).toBe(1);
  expect(limeJawPose(4.05).openness).toBe(1);
  expect(limeJawPose(4.22).openness).toBeCloseTo(0);
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.run(2);
    sim.body.setTranslation({ x: 126, y: 11, z: 13 }, true);
    sim.run(2);
    expect(sim.trackRun!.status).toBe("running");
    sim.run(0.3);
    expect(sim.trackRun!.status).toBe("failed");
    expect(sim.damageEvents.filter((event) => event.source === "lime-chomper")).toHaveLength(1);
  } finally {
    sim.dispose();
  }
});
