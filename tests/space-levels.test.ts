import { beforeAll, expect, it } from "vitest";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics } from "../src/simulation";
import { driveSpaceLevelToCompletion } from "./space-drive";

beforeAll(initPhysics);

const SPACE_IDS: `custom:${string}`[] = [
  "custom:airlock-approach",
  "custom:station-ring",
  "custom:solar-array",
  "custom:reactor-core",
  "custom:docking-bay",
  "custom:crater-field",
  "custom:meteor-storm",
];

for (const id of SPACE_IDS) {
  it(`drives ${id} to completion and banks its gold star`, () => {
    const track = officialFileTracks.find((t) => t.id === id)!;
    expect(track, `${id} registered`).toBeDefined();
    expect(track.goldStars?.length ?? 0, `${id} has a gold star`).toBe(1);
    expect(track.checkpoints.length, `${id} has checkpoints`).toBeGreaterThan(2);
    const { elapsed, stars } = driveSpaceLevelToCompletion(id);
    expect(stars, `${id} banks its star`).toContain(track.goldStars![0].id);
    expect(elapsed, `${id} finishes`).toBeLessThan(240);
  });
}
