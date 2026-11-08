import { beforeAll, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import { PARTS } from "../src/damage";
import { getVehicle } from "../src/vehicles";

beforeAll(initPhysics);

it("catalogs the watermelon car on shared part slots", () => {
  const melon = getVehicle("watermelon-car");
  expect(melon.name).toContain("Watermelon");
  expect(melon.parts.map((p) => p.id)).toEqual(PARTS.map((p) => p.id));
});

it("builds a melon-sliced truck headlessly", () => {
  const melon = getVehicle("watermelon-car");
  const truck = melon.build();
  for (const part of PARTS) {
    expect(
      truck.getObjectByName(part.id),
      `part group ${part.id}`,
    ).toBeDefined();
  }
  let flesh = 0;
  truck.traverse((o) => {
    if (
      o instanceof T.Mesh &&
      o.userData.melon === "flesh" &&
      (o.material as T.MeshStandardMaterial).color.getHex() === 0xe63b52
    )
      flesh++;
  });
  expect(flesh).toBeGreaterThan(0);
});

it("switches a sim to the watermelon car", () => {
  const s = new Simulation("lab");
  s.setVehicle("watermelon-car");
  expect(s.vehicleId).toBe("watermelon-car");
  expect(s.snapshot(false).vehicleId).toBe("watermelon-car");
  s.dispose();
});

it("ships a vehicle preview screenshot", () => {
  const file = "public/vehicles/watermelon-car.png";
  expect(existsSync(file)).toBe(true);
  const bytes = readFileSync(file);
  expect([...bytes.subarray(0, 8)]).toEqual([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);
});
