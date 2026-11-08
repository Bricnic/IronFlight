import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";
import { driveEmberfallToCompletion } from "./emberfall-drive";

const id = "custom:emberfall-causeway";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});

it("drives from the tower through the slime jump to the raptor finish", () => {
  driveEmberfallToCompletion();
});
