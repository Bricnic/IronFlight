import { expect, it } from "vitest";
import { BestTimes } from "../src/best-times";
import { TrackRun } from "../src/track-run";
import { getTrack } from "../src/tracks";
const result = (
  time: number,
  status: "completed" | "failed" = "completed",
  variant = "default",
) => ({
  ...new TrackRun(getTrack("harbor-sprint"), variant).snapshot(),
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
it("keeps only faster completed times and reloads medals", () => {
  const storage = memory(),
    scores = new BestTimes(storage);
  expect(scores.record(result(55))).toBe(true);
  expect(scores.best("harbor-sprint")?.medal).toBe("bronze");
  expect(scores.record(result(45))).toBe(true);
  expect(scores.best("harbor-sprint")?.medal).toBe("silver");
  expect(scores.record(result(30))).toBe(true);
  expect(scores.best("harbor-sprint")?.medal).toBe("gold");
  expect(scores.record(result(40))).toBe(false);
  expect(scores.record(result(10, "failed"))).toBe(false);
  expect(new BestTimes(storage).best("harbor-sprint")?.time).toBe(30);
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
    expect(scores.best("harbor-sprint")).toBeNull();
    expect(() => scores.record(result(30))).not.toThrow();
    expect(scores.best("harbor-sprint")?.time).toBe(30);
    expect(scores.record(result(NaN))).toBe(false);
    expect(scores.record(result(-1))).toBe(false);
  }
});
