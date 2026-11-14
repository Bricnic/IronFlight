import { describe, expect, it } from "vitest";
import {
  planBatch,
  parseArgs,
  validIdea,
} from "../scripts/generate-vehicles.mjs";

describe("vehicle-gen batch planning", () => {
  it("adds a full batch of NEW ideas when the queue is caught up", () => {
    expect(planBatch(["a", "b"], new Set(["a", "b"]), 10)).toEqual({
      add: 10,
      finish: [],
      builds: 10,
    });
  });

  it("adds a full batch when the queue is empty (first run)", () => {
    expect(planBatch([], new Set(), 3)).toEqual({
      add: 3,
      finish: [],
      builds: 3,
    });
  });

  it("finishes unfinished ideas and adds none (resume)", () => {
    expect(planBatch(["a", "b", "c"], new Set(["a"]), 10)).toEqual({
      add: 0,
      finish: ["b", "c"],
      builds: 2,
    });
  });

  it("keeps queue order for unfinished ideas", () => {
    const plan = planBatch(["x", "y", "z"], new Set(["y"]), 5);
    expect(plan.finish).toEqual(["x", "z"]);
    expect(plan.add).toBe(0);
  });

  it("honors the count bounds", () => {
    expect(planBatch([], new Set(), 1).add).toBe(1);
    expect(planBatch([], new Set(), 50).add).toBe(50);
  });
});

describe("vehicle-gen args", () => {
  it("defaults to a full run with config defaults", () => {
    const args = parseArgs([]);
    expect(args.dryRun).toBe(false);
    expect(args.count).toBeNull();
    expect(args.only).toBeNull();
    expect(args.push).toBe(true);
    expect(args.config).toMatch(/vehicle-gen\.json$/);
  });

  it("parses --dry-run, --no-push, --only and --config", () => {
    expect(parseArgs(["--dry-run"]).dryRun).toBe(true);
    expect(parseArgs(["--no-push"]).push).toBe(false);
    expect(parseArgs(["--only", "jet-sled"]).only).toBe("jet-sled");
    expect(parseArgs(["--config", "custom.json"]).config).toMatch(
      /custom\.json$/,
    );
  });

  it("parses a valid --count", () => {
    expect(parseArgs(["--count", "10"]).count).toBe(10);
  });

  it.each([["0"], ["51"], ["abc"]])("rejects --count %s", (value) => {
    expect(() => parseArgs(["--count", value])).toThrow();
  });

  it("rejects a bad --only id", () => {
    expect(() => parseArgs(["--only", "Not_Valid!"])).toThrow();
  });

  it("rejects unknown args", () => {
    expect(() => parseArgs(["--bogus"])).toThrow();
  });
});

describe("vehicle-gen idea validation", () => {
  const good = {
    id: "jet-sled",
    name: "Jet Sled",
    blurb: "A rocket sled for the derby.",
    category: "wild",
    theme: "rocket",
    palette: [0x8a93a6, 0xd8402a, 0x222222, 1.1, 5],
    brief: "Chunky derby build with four wheels.",
    art: "visual-plan/refs/gemini/generated/jet-sled.jpg",
  };

  it("accepts a complete idea", () => {
    expect(validIdea(good)).toBe(true);
  });

  it("rejects ideas with bad ids or shapes", () => {
    expect(validIdea({ ...good, id: "Jet_Sled" })).toBe(false);
    expect(validIdea({ ...good, brief: undefined })).toBe(false);
    expect(validIdea({ ...good, palette: "nope" })).toBe(false);
    expect(validIdea(null)).toBe(false);
  });
});
