import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { PARTS } from "../src/damage";
import { VEHICLES, getVehicle } from "../src/vehicles";
beforeAll(initPhysics);
it("catalogs the monster truck on the shared part slots", () => {
  expect(VEHICLES.length).toBeGreaterThanOrEqual(1);
  const truck = getVehicle("monster-truck");
  expect(truck.name).toContain("Monster");
  expect(truck.parts.map((p) => p.id)).toEqual(PARTS.map((p) => p.id));
  for (const [i, def] of truck.parts.entries()) {
    expect(def.size).toEqual(PARTS[i].size);
    expect(def.hp).toBe(PARTS[i].hp);
  }
  expect(() => getVehicle("no-such-vehicle")).toThrow(RangeError);
});
it("simulations default to the monster truck and report it", () => {
  const s = new Simulation("lab");
  expect(s.vehicleId).toBe("monster-truck");
  expect(s.snapshot(false).vehicleId).toBe("monster-truck");
  expect(s.partDefs.map((p) => p.id)).toEqual(PARTS.map((p) => p.id));
  s.dispose();
});
it("switching vehicles rebuilds parts and health from the new defs", () => {
  const s = new Simulation("lab");
  s.setVehicle("monster-truck");
  expect(s.vehicleId).toBe("monster-truck");
  expect(s.snapshot(false).vehicleId).toBe("monster-truck");
  expect(s.snapshot(false).integrity).toBe(1);
  s.damage("hood", 25);
  expect(s.snapshot(false).integrity).toBeLessThan(1);
  expect(() => s.setVehicle("no-such-vehicle")).toThrow(RangeError);
  s.dispose();
});
