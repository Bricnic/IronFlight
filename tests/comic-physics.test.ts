import { beforeAll, test, expect } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import {
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
} from "../src/custom-level";
import { TRACKS } from "../src/tracks";
import { courseAvailable } from "../src/course";
import { Quaternion } from "three";
beforeAll(initPhysics);
for (const track of TRACKS.filter(
  (t) => !t.legacy && courseAvailable(t.id),
))
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
      kind === "water"
        ? "inferno-vault"
        : kind === "teeth" || kind === "burner" || kind === "computer"
          ? "foundry-run"
          : "skyline-circuit";
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
  s.startTrack("skyline-circuit");
  const m = s.comic.mechanisms.find((m) => m.h.kind === "book")!;
  expect(m.bodies[0].rotation().x).toBeCloseTo(Math.sin(1.12 / 2));
  s.body.setTranslation({ x: m.h.x, y: 2.1, z: m.h.z }, true);
  s.run(0.5);
  expect(s.status).toBe("driving");
  s.run(3);
  expect(s.status).toBe("wrecked");
  s.dispose();
});
test("elevated chomp book crushes a truck on its raised deck", () => {
  const level = validateCustomLevel({
    name: "Elevated Book Probe",
    mode: "race",
    spawn: { x: 0, y: 11.1, z: -30, yaw: 0 },
    checkpoints: [{ x: 0, z: 40 }],
    solids: [
      { id: "deck", kind: "tile", x: 0, y: 8.4, z: 10, w: 30, h: 1.2, d: 100, color: 0x137e91 },
    ],
    prefabs: [{ id: "book-1", kind: "book", x: 0, y: 9, z: 10 }],
    medals: { gold: 30, silver: 45, bronze: 60 },
  });
  const track = toTrack(level);
  registerCustomTrack(track);
  const s = new Simulation();
  s.startTrack(track.id);
  const m = s.comic.mechanisms.find((m) => m.h.kind === "book")!;
  expect(m.bodies[0].translation().y).toBeCloseTo(10.2);
  s.body.setTranslation({ x: 0, y: 10.2, z: 10 }, true);
  s.run(4);
  expect(m.contacts).toBeGreaterThan(0);
  expect(s.damageEvents.some((e) => e.source === "book")).toBe(true);
  expect(s.status).toBe("wrecked");
  s.dispose();
});