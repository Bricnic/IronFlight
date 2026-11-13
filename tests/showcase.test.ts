import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getTrack } from "../src/tracks";
import {
  validateCustomLevel,
  type CustomLevel,
} from "../src/custom-level";
import { writeShowcaseClones } from "../src/showcase";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function clone(name: string): CustomLevel {
  return validateCustomLevel(
    JSON.parse(readFileSync(join(root, "public/showcase", name), "utf8")),
  );
}
it("ships a high-fidelity triple-loop clone", () => {
  writeShowcaseClones(join(root, "public"));
  const file = join(root, "public/showcase/clone-triple-loop.json");
  expect(existsSync(file)).toBe(true);
  const level = clone("clone-triple-loop.json");
  const track = getTrack("triple-loop");
  expect(level.mode).toBe("race");
  expect(level.spawn).toEqual(track.spawn);
  expect(level.medals).toEqual(track.medals);
  expect(level.checkpoints).toHaveLength(track.checkpoints.length);
  expect(level.prefabs.filter((p) => p.kind === "loop")).toHaveLength(1);
  expect(level.prefabs.filter((p) => p.kind === "dragon")).toHaveLength(4);
  expect(level.prefabs.filter((p) => p.kind === "lamp")).toHaveLength(6);
  expect(level.prefabs.filter((p) => p.kind === "grandstand")).toHaveLength(2);
  expect(level.solids.filter((s) => s.kind === "lava")).toHaveLength(1);
  expect(
    level.solids.find((s) => s.id === "arena-floor"),
  ).toMatchObject({ kind: "ground", texture: "grass_ground" });
  expect(
    level.solids.filter((s) => s.kind === "road" || s.kind === "ramp").length,
  ).toBeGreaterThanOrEqual(5);
});
