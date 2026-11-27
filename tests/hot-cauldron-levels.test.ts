import { beforeAll, expect, it } from "vitest";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics } from "../src/simulation";
import { driveHotCauldronLevelToCompletion } from "./hot-cauldron-drive";

beforeAll(initPhysics);

const HOT_IDS = [
  "custom:figure-eight-inferno",
  "custom:double-serpent",
  "custom:spiral-ascent",
  "custom:caldera-rim",
  "custom:ember-falls",
] as const;

for (const id of HOT_IDS) {
  // Full physics drives (spiral: 130+ sim-seconds); generous timeout so full-suite CPU contention can't flake them.
  it(`drives ${id} to completion and banks its gold star`, { timeout: 120_000 }, () => {
    const track = officialFileTracks.find((t) => t.id === id)!;
    expect(track, `${id} registered`).toBeDefined();
    expect(track.goldStars?.length ?? 0, `${id} has a gold star`).toBe(1);
    expect(track.checkpoints.length, `${id} has checkpoints`).toBeGreaterThanOrEqual(3);
    const { elapsed, stars } = driveHotCauldronLevelToCompletion(id);
    expect(stars, `${id} banks its star`).toContain(track.goldStars![0].id);
    expect(elapsed, `${id} finishes`).toBeLessThan(240);
  });
}
