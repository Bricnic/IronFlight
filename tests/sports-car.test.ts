import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import { PARTS, deformGeometry } from "../src/damage";
import { getVehicle, validateVehicles } from "../src/vehicles";
import { createSportsCar, sportsCarStats } from "../src/sports-car";
import { createTruck, truckStats } from "../src/truck";
import { getTrack } from "../src/tracks";
import { courseDriver } from "./course-driver";
beforeAll(initPhysics);
it("catalogs the sports car on the shared part slots", () => {
  const car = getVehicle("sports-car");
  expect(car.name).toContain("Sports");
  expect(car.parts.map((p) => p.id)).toEqual(PARTS.map((p) => p.id));
  expect(car.suspension).toHaveLength(4);
  for (const [i, def] of car.parts.entries()) expect(def.hp).toBe(PARTS[i].hp);
  const roof = car.parts.find((p) => p.id === "roof")!;
  expect(roof.pos[1]).toBeLessThan(1.8);
  const wheel = car.parts.find((p) => p.id === "wheel-fl")!;
  expect(wheel.size[1]).toBeLessThan(2.1);
  expect(car.wheelRadius).toBeLessThan(1.05);
  expect(() => validateVehicles()).not.toThrow();
});
it("covers every part with a deformable first child", () => {
  const car = createSportsCar();
  for (const def of PARTS) {
    const g = car.getObjectByName(def.id);
    expect(g, def.id).toBeTruthy();
    const first = g!.children[0] as T.Mesh;
    expect(first.isMesh, def.id).toBe(true);
    expect(
      (first.geometry as T.BufferGeometry).isBufferGeometry,
      def.id,
    ).toBe(true);
  }
});
it("a dent displaces sports-car hood vertices", () => {
  const car = createSportsCar();
  const hood = car.getObjectByName("hood")!.children[0] as T.Mesh;
  const attr = hood.geometry.attributes.position as T.BufferAttribute;
  const before = attr.array.slice();
  deformGeometry(hood.geometry as T.BufferGeometry, new T.Vector3(0, 0, 0), 1);
  const after = (hood.geometry.attributes.position as T.BufferAttribute).array;
  let moved = 0;
  for (let i = 0; i < before.length; i++)
    if (Math.abs(before[i] - after[i]) > 1e-9) moved++;
  expect(moved).toBeGreaterThan(0);
});
it("matches or beats truck triangle detail", () => {
  const car = sportsCarStats(createSportsCar());
  const truck = truckStats(createTruck());
  expect(car.triangles).toBeGreaterThanOrEqual(truck.triangles);
});
it("headlessly completes Harbor Sprint in the sports car", () => {
  const s = new Simulation();
  s.setVehicle("sports-car");
  expect(s.snapshot(false).vehicleId).toBe("sports-car");
  s.startTrack("harbor-sprint");
  const track = getTrack("harbor-sprint");
  for (let i = 0; i < 120 * 100 && s.trackRun?.status === "running"; i++)
    s.step(courseDriver(s.snapshot(), track));
  expect(
    s.trackRun?.status,
    JSON.stringify({ run: s.trackRun?.snapshot(), p: s.body.translation() }),
  ).toBe("completed");
  expect(s.trackRun?.checkpoint).toBe(track.checkpoints.length);
  expect(s.snapshot().integrity).toBeGreaterThan(0);
  s.dispose();
});
