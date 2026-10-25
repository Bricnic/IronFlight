import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import { PARTS, deformGeometry } from "../src/damage";
import {
  getVehicle,
  validateVehicles,
  lightBarState,
} from "../src/vehicles";
import { createCopCar, copCarStats } from "../src/cop-car";
import { createTruck, truckStats } from "../src/truck";
import { getTrack } from "../src/tracks";
import { courseDriver } from "./course-driver";
beforeAll(initPhysics);
it("catalogs the cop car on the shared part slots with police lights", () => {
  const car = getVehicle("cop-car");
  expect(car.name).toContain("Cop");
  expect(car.parts.map((p) => p.id)).toEqual(PARTS.map((p) => p.id));
  expect(car.suspension).toHaveLength(4);
  for (const [i, def] of car.parts.entries()) expect(def.hp).toBe(PARTS[i].hp);
  expect(car.lights).toBe("police");
  expect(() => validateVehicles()).not.toThrow();
});
it("covers every part with a deformable first child", () => {
  const car = createCopCar();
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
it("carries a red/blue light bar with emissive domes", () => {
  const car = createCopCar();
  for (const [name, color] of [
    ["lightbar-a", 0xff2222],
    ["lightbar-b", 0x2255ff],
  ] as const) {
    const dome = car.getObjectByName(name) as T.Mesh;
    expect(dome?.isMesh, name).toBe(true);
    const mat = dome.material as T.MeshStandardMaterial;
    expect(mat.emissive.getHex(), name).toBe(color);
  }
});
it("a dent displaces cop-car door vertices", () => {
  const car = createCopCar();
  const door = car.getObjectByName("door-left")!.children[0] as T.Mesh;
  const attr = door.geometry.attributes.position as T.BufferAttribute;
  const before = attr.array.slice();
  deformGeometry(door.geometry as T.BufferGeometry, new T.Vector3(0, 0, 0), 1);
  const after = (door.geometry.attributes.position as T.BufferAttribute).array;
  let moved = 0;
  for (let i = 0; i < before.length; i++)
    if (Math.abs(before[i] - after[i]) > 1e-9) moved++;
  expect(moved).toBeGreaterThan(0);
});
it("matches or beats truck triangle detail", () => {
  const car = copCarStats(createCopCar());
  const truck = truckStats(createTruck());
  expect(car.triangles).toBeGreaterThanOrEqual(truck.triangles);
});
it("flashes the bar only above 90 game mph", () => {
  expect(lightBarState(20, 0)).toEqual({ a: 0.15, b: 0.15 });
  expect(lightBarState(25, 0)).toEqual({ a: 0.15, b: 0.15 });
  expect(lightBarState(25.01, 0).a).toBeGreaterThan(1);
  expect(lightBarState(25.01, 0).b).toBeLessThan(1);
  expect(lightBarState(25.01, 1 / 6).a).toBeLessThan(1);
  expect(lightBarState(25.01, 1 / 6).b).toBeGreaterThan(1);
  expect(lightBarState(31, 10).a).not.toBe(lightBarState(31, 10 + 1 / 6).a);
});
it("headlessly completes Harbor Sprint in the cop car", () => {
  const s = new Simulation();
  s.setVehicle("cop-car");
  expect(s.snapshot(false).vehicleId).toBe("cop-car");
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
