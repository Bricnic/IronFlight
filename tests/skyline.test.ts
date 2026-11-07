import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { getTrack } from "../src/tracks";
import { courseSolids } from "../src/course";
import { courseDriver } from "./course-driver";
import { TrackRun } from "../src/track-run";
beforeAll(initPhysics);
it("paves every sector with full-width, shared miter edges", () => {
  const track = getTrack("skyline-circuit");
  const roads = courseSolids(track).filter((s) => s.kind === "road");
  const sectors = track.path.length - 1;
  expect(roads).toHaveLength(sectors);
  // A 12 m offset from each chord meets its neighbor on the radial seam.
  const miter = 12 / Math.cos(Math.PI / sectors);
  for (const [i, road] of roads.entries()) {
    const vertices = road.footprint!.map(({ x, z }) => ({
      x: x + road.x,
      z: z + road.z,
    }));
    expect(vertices).toHaveLength(4);
    for (const join of [track.path[i], track.path[(i + 1) % sectors]]) {
      const radius = Math.hypot(join.x, join.z);
      for (const side of [-1, 1]) {
        const scale = 1 + side * miter / radius;
        expect(
          vertices.some(
            ({ x, z }) =>
              Math.hypot(x - join.x * scale, z - join.z * scale) < 1e-8,
          ),
          `${road.id} should reach both corners of each seam`,
        ).toBe(true);
      }
    }
  }
});
it("Skyline Circuit cannot win by recrossing its start line without sectors", () => {
  const t = getTrack("skyline-circuit"),
    r = new TrackRun(t);
  r.step(1, { x: -2, y: 2, z: -80 }, { x: 2, y: 2, z: -80 }, 1);
  expect(r.status).toBe("running");
  expect(r.checkpoint).toBe(0);
});
it("completes a physical full lap through all sixteen sectors", () => {
  const t = getTrack("skyline-circuit"),
    s = new Simulation();
  s.startTrack(t.id);
  for (let i = 0; i < 120 * 100 && s.trackRun?.status === "running"; i++)
    s.step(courseDriver(s.snapshot(false), t));
  expect(
    s.trackRun?.status,
    JSON.stringify({ run: s.trackRun?.snapshot(), p: s.body.translation() }),
  ).toBe("completed");
  expect(s.trackRun?.checkpoint).toBe(16);
  expect(s.snapshot().integrity).toBeGreaterThan(0.8);
  s.dispose();
});
