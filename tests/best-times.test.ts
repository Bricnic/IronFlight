import { expect, it } from "vitest";
import { BestTimes } from "../src/best-times";
import { TrackRun } from "../src/track-run";
import { getTrack } from "../src/tracks";
import { registerCustomTrack, toTrack, validateCustomLevel } from "../src/custom-level";
import fairground from "../levels/official/Fairground.json";
const result = (
  time: number,
  status: "completed" | "failed" = "completed",
  variant = "default",
) => ({
  ...new TrackRun(getTrack("foundry-run"), variant).snapshot(),
  status,
  elapsed: time,
});
function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}
it("retains gold times for the JSON-authored Fairground through reload", () => {
  const track = toTrack(validateCustomLevel(fairground)); registerCustomTrack(track);
  const storage = memory(), scores = new BestTimes(storage);
  expect(scores.record({ ...new TrackRun(track).snapshot(), status: "completed", elapsed: 164.63 })).toBe(true);
  expect(new BestTimes(storage).best(track.id)).toEqual({ time: 164.63, medal: "gold" });
});
it("keeps only faster completed times and reloads medals", () => {
  const storage = memory(),
    scores = new BestTimes(storage);
  expect(scores.record(result(85))).toBe(true);
  expect(scores.best("foundry-run")?.medal).toBe("bronze");
  expect(scores.record(result(55))).toBe(true);
  expect(scores.best("foundry-run")?.medal).toBe("silver");
  expect(scores.record(result(38))).toBe(true);
  expect(scores.best("foundry-run")?.medal).toBe("gold");
  expect(scores.record(result(40))).toBe(false);
  expect(scores.record(result(10, "failed"))).toBe(false);
  expect(new BestTimes(storage).best("foundry-run")?.time).toBe(38);
});
it("isolates Triple Loop lane records", () => {
  const scores = new BestTimes(memory());
  scores.record({ ...result(30), trackId: "triple-loop", variant: "easy" });
  scores.record({ ...result(50), trackId: "triple-loop", variant: "hard" });
  expect(scores.best("triple-loop", "easy")?.time).toBe(30);
  expect(scores.best("triple-loop", "hard")?.time).toBe(50);
  expect(scores.best("triple-loop", "medium")).toBeNull();
});
it("handles corrupt/blocked storage and refuses invalid times", () => {
  for (const storage of [
    { getItem: () => "{bad", setItem: () => {} },
    {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
    },
  ]) {
    const scores = new BestTimes(storage);
    expect(scores.best("foundry-run")).toBeNull();
    expect(() => scores.record(result(30))).not.toThrow();
    expect(scores.best("foundry-run")?.time).toBe(30);
    expect(scores.record(result(NaN))).toBe(false);
    expect(scores.record(result(-1))).toBe(false);
  }
});
