import { expect, it } from "vitest";
import { courseSolids, courseAvailable } from "../src/course";
import { getTrack, type Point } from "../src/tracks";
it("Foundry Run has shared ground, road and collidable cargo geometry", () => {
  const solids = courseSolids(getTrack("foundry-run"));
  expect(courseAvailable("foundry-run")).toBe(true);
  expect(solids.some((s) => s.kind === "ground")).toBe(true);
  expect(solids.filter((s) => s.kind === "container").length).toBeGreaterThan(
    3,
  );
});
it("Skyline Circuit fills each road join and keeps all asphalt footprints disjoint", () => {
  const track = getTrack("skyline-circuit");
  const roads = courseSolids(track).filter((s) => s.kind === "road");
  const footprints = roads.map((s) =>
    s.footprint!.map((p) => ({ x: p.x + s.x, z: p.z + s.z })),
  );
  const direction = (a: Point, b: Point) => {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    return { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
  };
  for (let i = 1; i < track.path.length - 1; i++) {
    const join = track.path[i];
    const incoming = direction(track.path[i - 1], join);
    const outgoing = direction(join, track.path[i + 1]);
    const nx = incoming.x + outgoing.x;
    const nz = incoming.z + outgoing.z;
    const scale = 12 / (incoming.x * nx + incoming.z * nz);
    for (const side of [-1, 1]) {
      const x = join.x + side * nz * scale;
      const z = join.z - side * nx * scale;
      for (const polygon of [footprints[i - 1], footprints[i]])
        expect(polygon.some((p) => Math.hypot(p.x - x, p.z - z) < 1e-8)).toBe(
          true,
        );
    }
  }
  const separates = (a: Point[], b: Point[]) =>
    a.some((start, i) => {
      const end = a[(i + 1) % a.length];
      return b.every(
        (p) =>
          (end.x - start.x) * (p.z - start.z) -
            (end.z - start.z) * (p.x - start.x) <=
          1e-8,
      );
    });
  for (const [i, a] of footprints.entries())
    for (const [offset, b] of footprints.slice(i + 1).entries())
      expect(
        separates(a, b) || separates(b, a),
        `${roads[i].id} and ${roads[i + offset + 1].id} should only share edges`,
      ).toBe(true);
});

