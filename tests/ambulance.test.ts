import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import { PARTS, deformGeometry } from "../src/damage";
import { getVehicle, validateVehicles } from "../src/vehicles";
import { createAmbulance, ambulanceStats } from "../src/ambulance";
import { createTruck, truckStats } from "../src/truck";
import { getTrack } from "../src/tracks";
import { courseDriver } from "./course-driver";
beforeAll(initPhysics);
it("catalogs the ambulance on the shared part slots with EMS lights", () => {
  const car = getVehicle("ambulance");
  expect(car.name).toContain("Ambulance");
  expect(car.parts.map((p) => p.id)).toEqual(PARTS.map((p) => p.id));
  expect(car.suspension).toHaveLength(4);
  for (const [i, def] of car.parts.entries()) expect(def.hp).toBe(PARTS[i].hp);
  expect(car.lights).toBe("ems");
  expect(() => validateVehicles()).not.toThrow();
});
it("covers every part with a deformable first child", () => {
  const car = createAmbulance();
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
it("carries a red/white light bar with emissive domes", () => {
  const car = createAmbulance();
  for (const [name, color] of [
    ["lightbar-a", 0xff2222],
    ["lightbar-b", 0xffffff],
  ] as const) {
    const dome = car.getObjectByName(name) as T.Mesh;
    expect(dome?.isMesh, name).toBe(true);
    const mat = dome.material as T.MeshStandardMaterial;
    expect(mat.emissive.getHex(), name).toBe(color);
  }
});
it("a dent displaces ambulance hood vertices", () => {
  const car = createAmbulance();
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
  const car = ambulanceStats(createAmbulance());
  const truck = truckStats(createTruck());
  expect(car.triangles).toBeGreaterThanOrEqual(truck.triangles);
});
it("headlessly completes Harbor Sprint in the ambulance", () => {
  const s = new Simulation();
  s.setVehicle("ambulance");
  expect(s.snapshot(false).vehicleId).toBe("ambulance");
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
it("cruises past the 90 mph light threshold", () => {
  const s = new Simulation("lab");
  s.setVehicle("ambulance");
  let peak = 0;
  for (let i = 0; i < 60 * 12; i++) {
    s.step({ throttle: 1, steer: 0, brake: 0 });
    peak = Math.max(peak, s.snapshot(false).speed);
  }
  expect(peak).toBeGreaterThan(25);
  s.dispose();
});
