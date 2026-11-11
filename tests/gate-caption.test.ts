import { expect, it } from "vitest";
import { TRACKS } from "../src/tracks";
import { gateCaption } from "../src/course-view";

const skyline = TRACKS.find((t) => t.id === "skyline-circuit")!;
const harbor = TRACKS.find((t) => t.id === "harbor-sprint")!;
const slide = TRACKS.find((t) => t.id === "sky-slide")!;

it("dual-labels the start/finish arch on closed circuits", () => {
  const last = skyline.checkpoints.length - 1;
  expect(
    gateCaption(skyline, skyline.checkpoints[last], last, last + 1),
  ).toBe("START · FINISH");
});

it("keeps FINISH on point-to-point final gates", () => {
  const last = harbor.checkpoints.length - 1;
  expect(gateCaption(harbor, harbor.checkpoints[last], last, last + 1)).toBe(
    "FINISH",
  );
});

it("numbers non-final gates and ring-track gates as checkpoints", () => {
  expect(gateCaption(harbor, harbor.checkpoints[0], 0, 6)).toBe("CHECKPOINT 1");
  const last = slide.checkpoints.length - 1;
  expect(gateCaption(slide, slide.checkpoints[last], last, last + 1)).toBe(
    `CHECKPOINT ${last + 1}`,
  );
});
