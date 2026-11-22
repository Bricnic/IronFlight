import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Simulation, initPhysics } from "../src/simulation";
import { officialFileTracks } from "../src/official-levels";
import { registerCustomTrack, validateCustomLevel } from "../src/custom-level";
import { getTrack } from "../src/tracks";
import { collectionById } from "../src/level-collections";
import { driveSweetDreamToCompletion, flySweetDreamToCherry } from "./sweet-dream-drive";

beforeAll(initPhysics);

const id = "custom:sweet-celebrations-dream";

it("registers the dream level last in Sweet Celebrations with art and hints", () => {
  const track = officialFileTracks.find((t) => t.id === id)!;
  expect(track).toBeDefined();
  expect(track.name).toBe("Sweet Celebrations Dream");
  expect(track.thumbnail).toBe("/tracks/sweet-celebrations-dream.png");
  const sweet = collectionById("sweet-celebrations");
  expect(sweet.trackIds.at(-1)).toBe(id);
  expect(sweet.dream).toBe(id);
  const raw = JSON.parse(
    readFileSync(
      "levels/official/sweet-celebrations/Sweet Celebrations Dream.json",
      "utf8",
    ),
  );
  const level = validateCustomLevel(raw);
  expect(level.checkpoints.length).toBeGreaterThanOrEqual(8);
  expect(track.wings).toHaveLength(1);
  expect(track.goldStars).toHaveLength(1);
});

it("drives to completion, collecting wings late", () => {
  const { elapsed, wingsAt } = driveSweetDreamToCompletion();
  expect(elapsed).toBeLessThan(240);
  expect(wingsAt, "wings at least 10s from the start").toBeGreaterThanOrEqual(
    10,
  );
});

it("flaps from flat ground to collect the relocated star on the cake's red cherry without a ramp", () => {
  const result = flySweetDreamToCherry();
  expect(result.stars).toContain("gold-star-1");
  expect(result.flaps).toBeGreaterThan(1);
  expect(result.position.y).toBeGreaterThan(40);
});

it("keeps every dream prefab base out of structural solid volumes", () => {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    const track = getTrack(id);
    for (const p of track.custom!.prefabs) {
      if (p.kind === "gold-star" || p.kind === "wings") continue;
      const y = p.y ?? 0;
      for (const s of track.custom!.solids) {
        const inside =
          Math.abs(p.x - s.x) < s.w / 2 &&
          Math.abs(p.z - s.z) < s.d / 2;
        if (!inside) continue;
        // Mounts at/above the top surface (with tolerance) are fine.
        const top = s.y + s.h / 2;
        const bot = s.y - s.h / 2;
        const buried = y <= top - 0.5 && y >= bot;
        expect(buried, `${p.id} embedded in ${s.id}`).toBe(false);
      }
    }
  } finally {
    sim.dispose();
  }
});
