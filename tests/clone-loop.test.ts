import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { loopDriver } from "./loop-driver";
import {
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";

beforeAll(initPhysics);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

it("clone triple loop completes the loop-de-loop headlessly", () => {
  const level = validateCustomLevel(
    JSON.parse(
      readFileSync(
        join(root, "public/showcase/clone-triple-loop.json"),
        "utf8",
      ),
    ),
  );
  const track = toTrack(level);
  registerCustomTrack(track);
  const s = new Simulation();
  s.startTrack(track.id);
  for (let i = 0; i < 7200 && s.trackRun?.status === "running"; i++)
    s.step(loopDriver(s.snapshot(), -24));
  expect(
    s.trackRun?.status,
    JSON.stringify({
      run: s.trackRun?.snapshot(),
      p: s.body.translation(),
      apex: s.loopApex,
      loopDone: s.loopCompleted,
      boost: s.boostTicks,
    }),
  ).toBe("completed");
  expect(s.loopApex).toBe(true);
  expect(s.loopCompleted).toBe(true);
  expect(s.trackRun?.checkpoint).toBe(3);
  expect(s.snapshot().integrity).toBeGreaterThan(0);
  s.dispose();
});
