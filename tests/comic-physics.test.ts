import { beforeAll, test, expect } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { TRACKS } from "../src/tracks";
import { Quaternion } from "three";
beforeAll(initPhysics);
for (const track of TRACKS.filter((t) => !t.legacy))
  test(`${track.name}: complete normal driving route survives new threats`, async () => {
    const { courseDriver } = await import("./course-driver");
    const s = new Simulation();
    s.startTrack(track.id);
    for (
      let i = 0;
      i < 120 * track.medals.bronze && s.trackRun?.status === "running";
      i++
    )
      s.step(courseDriver(s.snapshot(false), track));
    expect(s.trackRun?.status, JSON.stringify(s.snapshot(false))).toBe(
      "completed",
    );
    if (track.limit)
      expect(s.trackRun?.elapsed).toBeLessThanOrEqual(track.feasibility!);
    s.dispose();
  });
for (const kind of [
  "book",
  "teeth",
  "computer",
  "flippers",
  "burner",
  "hydrant",
  "water",
] as const)
  test(`${kind} physical direct encounter destroys truck`, () => {
    const s = new Simulation();
    const id =
      kind === "teeth" || kind === "burner" || kind === "computer"
        ? "foundry-run"
        : "harbor-sprint";
    s.startTrack(id);
    const h = s.comic.mechanisms.find((m) => m.h.kind === kind)!;
    expect(h).toBeTruthy();
    s.body.setTranslation({ x: h.h.x, y: 2.1, z: h.h.z }, true);
    s.body.setRotation(new Quaternion(), true);
    if (kind === "hydrant") s.body.setLinvel({ x: 0, y: 0, z: 30 }, true);
    s.run(6, {});
    expect(h.contacts).toBeGreaterThan(0);
    expect(s.status, JSON.stringify(s.comic.snapshot())).toBe("wrecked");
    s.dispose();
  });

test("initial jaw collider pose matches the visible open book, then closes destructively", () => {
  const s = new Simulation();
  s.startTrack("harbor-sprint");
  const m = s.comic.mechanisms.find((m) => m.h.kind === "book")!;
  expect(m.bodies[0].rotation().x).toBeCloseTo(Math.sin(1.12 / 2));
  s.body.setTranslation({ x: m.h.x, y: 2.1, z: m.h.z }, true);
  s.run(0.5);
  expect(s.status).toBe("driving");
  s.run(3);
  expect(s.status).toBe("wrecked");
  s.dispose();
});
