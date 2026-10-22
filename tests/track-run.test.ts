import { expect, it } from "vitest";
import { TrackRun, medalFor } from "../src/track-run";
import { getTrack, gates, type Track } from "../src/tracks";
const race: Track = {
  ...getTrack("harbor-sprint"),
  checkpoints: gates(
    [
      { x: 0, z: 0 },
      { x: 0, z: 10 },
      { x: 0, z: 20 },
    ],
    12,
  ),
};
const p = (z: number, x = 0, y = 2) => ({ x, y, z });
it("requires swept ordered checkpoints and a directional finish", () => {
  const run = new TrackRun(race);
  run.step(1, p(19), p(21), 1);
  expect(run.status).toBe("running");
  run.step(1, p(21), p(9), 1);
  expect(run.checkpoint).toBe(0);
  run.step(1, p(9, 20), p(11, 20), 1);
  expect(run.checkpoint).toBe(0);
  run.step(1, p(9, 0, 20), p(11, 0, 20), 1);
  expect(run.checkpoint).toBe(0);
  run.step(1, p(0), p(21), 1);
  expect(run.status).toBe("completed");
  expect(run.checkpoint).toBe(2);
  const time = run.elapsed;
  run.step(10, p(21), p(50), 1);
  expect(run.elapsed).toBe(time);
});
it("collects each token once using swept proximity and succeeds at the deadline", () => {
  const track = {
    ...getTrack("scrapyard-sweep"),
    limit: 2,
    collectibles: [
      { id: "a", x: 0, z: 10, y: 2, radius: 2 },
      { id: "b", x: 0, z: 20, y: 2, radius: 2 },
    ],
  };
  const run = new TrackRun(track);
  run.step(1, p(0), p(12), 1);
  expect(run.collected.size).toBe(1);
  run.step(0.5, p(12), p(9), 1);
  expect(run.collected.size).toBe(1);
  run.step(0.5, p(9), p(22), 1);
  expect(run.status).toBe("completed");
});
it("fails on timeout or wreck and cannot award a late completion", () => {
  const a = new TrackRun({ ...getTrack("scrapyard-sweep"), limit: 1 });
  a.step(1, p(0), p(0), 1);
  expect(a.reason).toBe("timeout");
  a.step(1, p(0), p(50), 1);
  expect(a.status).toBe("failed");
  const b = new TrackRun(race);
  b.step(1, p(0), p(21), 0);
  expect(b.reason).toBe("wrecked");
});
it("the preserved stunt race requires actual jump and loop flags", () => {
  const run = new TrackRun(getTrack("triple-loop"));
  run.step(1, { x: -24, y: 2, z: 0 }, { x: -24, y: 2, z: 90 }, 1);
  expect(run.checkpoint).toBe(0);
  run.step(1, { x: -24, y: 2, z: 0 }, { x: -24, y: 2, z: 200 }, 1, {
    landed: true,
  });
  expect(run.checkpoint).toBe(2);
  run.step(1, { x: -12, y: 2, z: 380 }, { x: -12, y: 2, z: 400 }, 1, {
    landed: true,
  });
  expect(run.status).toBe("running");
  run.step(1, { x: -12, y: 2, z: 380 }, { x: -12, y: 2, z: 400 }, 1, {
    landed: true,
    loopCompleted: true,
  });
  expect(run.status).toBe("completed");
});
it("medals include exact thresholds and reject invalid times", () => {
  const t = race.medals;
  expect(medalFor(t.gold, t)).toBe("gold");
  expect(medalFor(t.gold + 0.001, t)).toBe("silver");
  expect(medalFor(t.silver + 0.001, t)).toBe("bronze");
  expect(medalFor(t.bronze + 1, t)).toBeNull();
  expect(medalFor(-1, t)).toBeNull();
  expect(medalFor(NaN, t)).toBeNull();
});
