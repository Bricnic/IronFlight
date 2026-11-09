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

it("rides the roof so per-frame part posing carries the slice", () => {
  const truck = getVehicle("watermelon-car").build();
  const roof = truck.getObjectByName("roof")!;
  // The view leaves the truck group at the origin and poses each part in
  // world space every frame, so a slice on the truck root would sit at the
  // spawn origin forever. It must hang off the roof part instead.
  expect(
    truck.children.find((c) => c.name === "melon-slice"),
    "slice on truck root",
  ).toBeUndefined();
  const slice = roof.getObjectByName("melon-slice")!;
  expect(slice, "slice on roof").toBeDefined();
  expect(slice.position.toArray()).toEqual([0, 0.55, 0]);
  truck.updateMatrixWorld(true);
  const world = new T.Vector3();
  slice.getWorldPosition(world);
  expect(world.toArray().map((v) => Number(v.toFixed(2)))).toEqual([
    0, 2.35, -0.05,
  ]);
});

it("keeps rind paint outside the tuning color slots", () => {
  const orange = new T.MeshStandardMaterial({ color: 0xe65921 });
  const truck = getVehicle("watermelon-car").build({ paint: orange });
  const hood = truck.getObjectByName("hood")!;
  const paint = (hood.children[0] as T.Mesh)
    .material as T.MeshStandardMaterial;
  expect(paint.color.getHex()).toBe(0x2e8b3a);
  expect(paint.userData.truckColorSlot).toBeUndefined();
});

it("survives the fire view's tuning recolor pass", async () => {
  const { TruckFireView } = await import("../src/truck-fire");
  const truck = getVehicle("watermelon-car").build();
  const fire = new TruckFireView();
  fire.reset(truck);
  const fakeSim = {
    tuning: { primaryColor: 0xe65921, secondaryColor: 0x6b7f87 },
    scorch: 0,
    parts: new Map(),
    smoking: false,
    time: 0,
    inFlames: false,
    smokeStrength: 0,
  };
  fire.update(fakeSim as never, new T.Vector3());
  const hood = truck.getObjectByName("hood")!;
  const paint = (hood.children[0] as T.Mesh)
    .material as T.MeshStandardMaterial;
  expect(paint.color.getHex()).toBe(0x2e8b3a);
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
