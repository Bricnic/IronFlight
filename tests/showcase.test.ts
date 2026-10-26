import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getTrack } from "../src/tracks";
import { courseSolids, courseProps } from "../src/course";
import { comicHazards } from "../src/comic-hazards";
import {
  validateCustomLevel,
  type CustomLevel,
} from "../src/custom-level";
import { writeShowcaseClones, SHOWCASE_DIR } from "../src/showcase";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function clone(name: string): CustomLevel {
  return validateCustomLevel(
    JSON.parse(readFileSync(join(root, "public/showcase", name), "utf8")),
  );
}
it("ships a high-fidelity harbor-sprint clone", () => {
  writeShowcaseClones(join(root, "public"));
  const file = join(root, "public/showcase/clone-harbor-sprint.json");
  expect(existsSync(file)).toBe(true);
  const level = clone("clone-harbor-sprint.json");
  const track = getTrack("harbor-sprint");
  expect(level.mode).toBe("race");
  expect(level.spawn).toEqual(track.spawn);
  expect(level.medals).toEqual(track.medals);
  expect(level.checkpoints).toHaveLength(track.checkpoints.length);
  expect(level.solids).toHaveLength(courseSolids(track).length);
  for (const [i, s] of courseSolids(track).entries())
    expect(level.solids[i]).toMatchObject({
      id: s.id,
      kind: s.kind,
      x: s.x,
      y: s.y,
      z: s.z,
    });
  expect(level.prefabs.map((p) => p.kind).sort()).toEqual(
    [
      ...courseProps(track).map((p) => p.kind),
      ...comicHazards(track).map((h) => h.kind),
    ].sort(),
  );
  expect(SHOWCASE_DIR).toBe("showcase");
});
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
