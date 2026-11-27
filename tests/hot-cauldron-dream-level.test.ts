import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Simulation, initPhysics } from "../src/simulation";
import { officialFileTracks } from "../src/official-levels";
import { registerCustomTrack, validateCustomLevel } from "../src/custom-level";
import { collectionById } from "../src/level-collections";
import { driveHotCauldronDreamToCompletion } from "./hot-cauldron-drive";

beforeAll(initPhysics);

const id = "custom:hot-cauldron-dream";

it("registers the nightmare dream last in Hot Cauldron with art and hints", () => {
  const track = officialFileTracks.find((t) => t.id === id)!;
  expect(track).toBeDefined();
  expect(track.name).toBe("Hot Cauldron Dream");
  expect(track.thumbnail).toBe("/tracks/hot-cauldron-dream.png");
  const collection = collectionById("hot-cauldron");
  expect(collection.trackIds.at(-1)).toBe(id);
  expect(collection.dream).toBe(id);
  const raw = JSON.parse(readFileSync("levels/official/hot-cauldron/Hot Cauldron Dream.json", "utf8"));
  const level = validateCustomLevel(raw);
  expect(level.checkpoints.length).toBeGreaterThanOrEqual(4);
  expect(track.wings).toHaveLength(1);
  expect(track.goldStars).toHaveLength(1);
});

it("flies the canyon to completion, collecting wings late and the star mid-flight", { timeout: 120_000 }, () => {
  const { elapsed, wingsAt, stars } = driveHotCauldronDreamToCompletion();
  expect(elapsed).toBeLessThan(240);
  expect(wingsAt, "wings at least 10s from the start").toBeGreaterThanOrEqual(10);
  const track = officialFileTracks.find((t) => t.id === id)!;
  expect(stars).toContain(track.goldStars![0].id);
});

it("keeps every dream prefab base out of structural solid volumes", () => {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    const snap = sim.snapshot();
    expect(snap.run?.status).toBe("running");
  } finally {
    sim.dispose();
  }
});
