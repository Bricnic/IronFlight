import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";
import { driveAmberToCompletion } from "./amber-drive";

const id = "custom:amber-undertow";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});

it("guides the car through the tube and the causeway, then hands back the road for the finish", () => {
  driveAmberToCompletion();
});

it("drops a truck through the turquoise tile's open center into the lava", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: -36, y: 12, z: -94 }, true);
    sim.run(2);
    expect(sim.trackRun!.status).toBe("failed");
    expect(sim.damageEvents.some((event) => event.source === "lava")).toBe(true);
  } finally {
    sim.dispose();
  }
});
