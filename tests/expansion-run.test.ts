import { expect, it } from "vitest";
import { TrackRun } from "../src/track-run";
import { getTrack, type Checkpoint } from "../src/tracks";
const pos = (x: number, y: number, z: number) => ({ x, y, z });
const stones = Array.from({ length: 12 }, (_, i) => `stone-${i + 1}`);
const cross = (run: TrackRun, g: Checkpoint) => {
  run.step(
    0.5,
    { x: g.x - g.nx * 5, y: g.y, z: g.z - g.nz * 5 },
    { x: g.x + g.nx * 5, y: g.y, z: g.z + g.nz * 5 },
    1,
  );
};
it("demolition completes only when every gravestone is reported destroyed", () => {
  const run = new TrackRun(getTrack("haunted-hollow"));
  run.step(1, pos(0, 2, -90), pos(0, 2, -80), 1, {
    destroyed: ["stone-1", "stone-2"],
  });
  expect(run.status).toBe("running");
  expect(run.snapshot().destroyed).toHaveLength(2);
  run.step(1, pos(0, 2, -80), pos(0, 2, -70), 1, {
    destroyed: ["stone-1"],
  });
  expect(run.snapshot().destroyed).toHaveLength(2);
  run.step(1, pos(0, 2, -70), pos(0, 2, -60), 1, {
    destroyed: stones.filter((s) => s !== "stone-1" && s !== "stone-2"),
  });
  expect(run.status).toBe("completed");
  expect(run.snapshot().medal).toBe("gold");
  const time = run.elapsed;
  run.step(5, pos(0, 2, -60), pos(0, 2, -50), 1);
  expect(run.elapsed).toBe(time);
});
it("demolition fails on timeout and freezes the failure", () => {
  const run = new TrackRun(getTrack("haunted-hollow"));
  run.step(300, pos(0, 2, -90), pos(0, 2, -90), 1);
  expect(run.status).toBe("failed");
  expect(run.reason).toBe("timeout");
  expect(run.snapshot().medal).toBeNull();
  run.step(1, pos(0, 2, -90), pos(0, 2, -80), 1, { destroyed: stones });
  expect(run.status).toBe("failed");
});
it("slide requires gates, trampoline bounce and ring touch in order", () => {
  const track = getTrack("sky-slide"),
    ring = track.ring!;
  const run = new TrackRun(track);
  for (const g of track.checkpoints) cross(run, g);
  expect(run.checkpoint).toBe(track.checkpoints.length);
  expect(run.status).toBe("running");
  run.step(0.5, pos(ring.x, ring.y - 5, ring.z), pos(ring.x, ring.y + 5, ring.z), 1);
  expect(run.status).toBe("running");
  run.step(0.5, pos(0, 2, 2330), pos(0, 2, 2340), 1, { bounced: true });
  expect(run.status).toBe("running");
  run.step(
    0.5,
    pos(ring.x + 20, ring.y, ring.z),
    pos(ring.x + 20, ring.y, ring.z + 10),
    1,
  );
  expect(run.status).toBe("running");
  run.step(0.5, pos(ring.x, ring.y - 5, ring.z), pos(ring.x, ring.y + 5, ring.z), 1);
  expect(run.status).toBe("completed");
});
it("limited races fail on timeout and falls below the course wreck", () => {
  const canyon = new TrackRun(getTrack("canyon-plunge"));
  canyon.step(300.1, pos(0, 80, -100), pos(0, 80, -90), 1);
  expect(canyon.status).toBe("failed");
  expect(canyon.reason).toBe("timeout");
  const slide = new TrackRun(getTrack("sky-slide"));
  slide.step(1, pos(0, 50, 0), pos(0, -16, 0), 1);
  expect(slide.status).toBe("failed");
  expect(slide.reason).toBe("wrecked");
});
