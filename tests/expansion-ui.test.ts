import { expect, it } from "vitest";
import { getTrack } from "../src/tracks";
import {
  modeLabel,
  objectiveCopy,
  progressCopy,
  progressFraction,
  timeoutCopy,
} from "../src/run-copy";
const run = (trackId: string, over: Record<string, unknown> = {}) => ({
  trackId,
  variant: "default",
  status: "running",
  reason: null,
  elapsed: 0,
  checkpoint: 0,
  checkpointCount: getTrack(trackId).checkpoints.length,
  collected: [] as string[],
  collectibleCount: getTrack(trackId).collectibles.length,
  destroyed: [] as string[],
  demolishCount: getTrack(trackId).demolish?.length ?? 0,
  bounced: false,
  ringDone: false,
  remaining: getTrack(trackId).limit ?? null,
  medal: null,
  ...over,
});
it("labels every mode on the menu cards", () => {
  expect(modeLabel(getTrack("scrapyard-sweep"))).toBe("120s COLLECTION");
  expect(modeLabel(getTrack("haunted-hollow"))).toBe("DEMOLITION");
  expect(modeLabel(getTrack("sky-slide"))).toBe("SLIDE RUN");
  expect(modeLabel(getTrack("canyon-plunge"))).toBe("CHECKPOINT RACE");
  expect(modeLabel(getTrack("harbor-sprint"))).toBe("CHECKPOINT RACE");
  expect(modeLabel(getTrack("triple-loop"))).toBe("STUNT RACE");
});
it("tells each mode its objective", () => {
  expect(objectiveCopy(getTrack("scrapyard-sweep"))).toContain("token");
  expect(objectiveCopy(getTrack("haunted-hollow"))).toContain("gravestone");
  expect(objectiveCopy(getTrack("haunted-hollow"))).toContain("ghost");
  expect(objectiveCopy(getTrack("sky-slide"))).toContain("strafe");
  expect(objectiveCopy(getTrack("canyon-plunge"))).toContain("checkpoint");
});
it("reports demolition and ring progress without NaN bars", () => {
  const hollow = getTrack("haunted-hollow");
  expect(progressCopy(hollow, run("haunted-hollow") as never)).toBe(
    "0 / 12 smashed",
  );
  expect(
    progressCopy(
      hollow,
      run("haunted-hollow", { destroyed: ["stone-1", "stone-2"] }) as never,
    ),
  ).toBe("2 / 12 smashed");
  expect(progressFraction(hollow, run("haunted-hollow") as never)).toBe(0);
  expect(
    progressFraction(
      hollow,
      run("haunted-hollow", { destroyed: ["stone-1", "stone-2"] }) as never,
    ),
  ).toBeCloseTo(2 / 12, 9);
  const slide = getTrack("sky-slide");
  expect(progressCopy(slide, run("sky-slide") as never)).toContain(
    "bounce, then ring",
  );
  expect(
    progressCopy(slide, run("sky-slide", { bounced: true }) as never),
  ).toContain("thread the golden ring");
  expect(
    progressCopy(
      slide,
      run("sky-slide", { bounced: true, ringDone: true }) as never,
    ),
  ).toContain("ring threaded");
  expect(progressCopy(slide, run("sky-slide") as never)).toContain(
    "Checkpoint 0 / 6",
  );
});
it("keeps existing race and arena progress intact", () => {
  const harbor = getTrack("harbor-sprint");
  expect(
    progressCopy(harbor, run("harbor-sprint", { checkpoint: 2 }) as never),
  ).toContain("Checkpoint 2 /");
  expect(
    progressFraction(harbor, run("harbor-sprint", { checkpoint: 2 }) as never),
  ).toBeGreaterThan(0);
  const scrap = getTrack("scrapyard-sweep");
  expect(
    progressCopy(
      scrap,
      run("scrapyard-sweep", {
        collected: ["pickup-1"],
        remaining: 99.2,
      }) as never,
    ),
  ).toBe("1 / 12 collected · 100s remaining");
});
it("blames timeouts on the right route", () => {
  expect(timeoutCopy(getTrack("scrapyard-sweep"))).toContain(
    "collection route",
  );
  expect(timeoutCopy(getTrack("harbor-sprint"))).toContain("racing line");
  expect(timeoutCopy(getTrack("canyon-plunge"))).toContain("racing line");
  expect(timeoutCopy(getTrack("haunted-hollow"))).toContain("smashing route");
  for (const t of [
    "scrapyard-sweep",
    "harbor-sprint",
    "canyon-plunge",
    "haunted-hollow",
    "sky-slide",
  ])
    expect(timeoutCopy(getTrack(t))).toContain("Time ran out");
});
