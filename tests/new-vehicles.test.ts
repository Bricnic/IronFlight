import { expect, it } from "vitest";
import * as T from "three";
import { PARTS, deformGeometry } from "../src/damage";
import { getVehicle, validateVehicles } from "../src/vehicles";
import { createHovercraft, hovercraftStats } from "../src/hovercraft";
import { createSnowGroomer, groomerStats } from "../src/snow-groomer";
import { createHotRod, hotRodStats } from "../src/hot-rod";
import { createTowTruck, towTruckStats } from "../src/tow-truck";
import { createTruck, truckStats } from "../src/truck";
import { CONCEPT_VEHICLES } from "../src/concept-vehicles";
import { THEMED_VEHICLES } from "../src/themed-vehicles";
import { GENERATED_VEHICLES } from "../src/generated-vehicles";
import briefs from "../visual-plan/refs/gemini/themed/briefs.json";
import generatedBriefs from "../visual-plan/refs/gemini/generated/briefs.json";

const NEW_CARS = [
  { id: "hovercraft", build: createHovercraft, stats: hovercraftStats },
  { id: "snow-groomer", build: createSnowGroomer, stats: groomerStats },
  { id: "hot-rod", build: createHotRod, stats: hotRodStats },
  { id: "tow-truck", build: createTowTruck, stats: towTruckStats },
  ...CONCEPT_VEHICLES.map(({ id, build }) => ({ id, build, stats: truckStats })),
  ...THEMED_VEHICLES.map(({ id, build }) => ({ id, build, stats: truckStats })),
  ...GENERATED_VEHICLES.map(({ id, build }) => ({ id, build, stats: truckStats })),
] as const;
const KIT_CARS = [...CONCEPT_VEHICLES, ...THEMED_VEHICLES, ...GENERATED_VEHICLES];
const TRUCK_BASELINE = truckStats(createTruck());

for (const car of NEW_CARS) {
  it(`new-car ${car.id} catalogs on the shared part slots`, () => {
    const def = getVehicle(car.id);
    expect(def.parts.map((p) => p.id)).toEqual(PARTS.map((p) => p.id));
    expect(def.suspension).toHaveLength(4);
    for (const [i, part] of def.parts.entries())
      expect(part.hp).toBe(PARTS[i].hp);
  });

  it(`new-car ${car.id} covers every part with a deformable first child`, () => {
    const group = car.build();
    for (const def of PARTS) {
      const g = group.getObjectByName(def.id);
      expect(g, `${car.id}:${def.id}`).toBeTruthy();
      const first = g!.children[0] as T.Mesh;
      expect(first.isMesh, `${car.id}:${def.id}`).toBe(true);
      expect(
        (first.geometry as T.BufferGeometry).isBufferGeometry,
        `${car.id}:${def.id}`,
      ).toBe(true);
    }
  });

  it(`new-car ${car.id} dent displaces hood vertices`, () => {
    const group = car.build();
    const hood = group.getObjectByName("hood")!.children[0] as T.Mesh;
    const attr = hood.geometry.attributes.position as T.BufferAttribute;
    const before = attr.array.slice();
    hood.geometry.computeBoundingSphere();
    const center = hood.geometry.boundingSphere!.center;
    deformGeometry(hood.geometry as T.BufferGeometry, center, 1, 3);
    const after = (hood.geometry.attributes.position as T.BufferAttribute)
      .array;
    let moved = 0;
    for (let i = 0; i < before.length; i++)
      if (Math.abs(before[i] - after[i]) > 1e-9) moved++;
    expect(moved, car.id).toBeGreaterThan(0);
  });

  it(`new-car ${car.id} carries high-poly detail near truck density`, () => {
    const stats = car.stats(car.build());
    expect(stats.triangles, `${car.id} triangles`).toBeGreaterThan(40000);
    expect(stats.meshes, `${car.id} meshes`).toBeGreaterThan(60);
    expect(
      stats.triangles,
      `${car.id} vs truck`,
    ).toBeGreaterThan(TRUCK_BASELINE.triangles * 0.4);
  });
}

for (const { id, build } of KIT_CARS) {
  it(`new-car ${id} uses detailed geometry and four treaded wheel assemblies`, () => {
    const { triangles, treadBlocks } = truckStats(build());
    expect(triangles, id).toBeGreaterThanOrEqual(90_000);
    expect(treadBlocks, id).toBeGreaterThanOrEqual(384);
  });
}

it("validates the whole vehicle registry without errors", () => {
  expect(() => validateVehicles()).not.toThrow();
});

it("the garage includes one vehicle for each of the twenty themed concepts", () => {
  const ids = THEMED_VEHICLES.map((vehicle) => vehicle.id);
  expect(ids).toEqual(briefs.map((concept) => concept.id));
  expect(new Set(ids).size).toBe(20);
});

it("the garage matches the generated-vehicle ledger entry for entry", () => {
  const ids = GENERATED_VEHICLES.map((vehicle: { id: string }) => vehicle.id);
  expect(ids).toEqual(
    generatedBriefs.map((concept: { id: string }) => concept.id),
  );
  expect(new Set(ids).size).toBe(ids.length);
});

it("tow truck runs four wheels with no tag axle", () => {
  const group = createTowTruck();
  expect(group.getObjectByName("tag-axle-l")).toBeFalsy();
  expect(group.getObjectByName("tag-axle-r")).toBeFalsy();
  let tires = 0;
  group.traverse((o) => {
    if (o instanceof T.Mesh && o.geometry instanceof T.TorusGeometry) {
      if (Math.abs(o.geometry.parameters.radius - 0.72) < 1e-6) tires++;
    }
  });
  expect(tires).toBe(4);
});

it("groomer door glass sits proud of the door face", () => {
  const group = createSnowGroomer();
  group.updateMatrixWorld(true);
  for (const [id, side] of [
    ["door-left", 1],
    ["door-right", -1],
  ] as const) {
    const door = group.getObjectByName(id)!;
    const base = door.getObjectByName("door-base") as T.Mesh;
    const pane = door.getObjectByName("door-glass") as T.Mesh;
    const bb = new T.Box3().setFromObject(base);
    const gb = new T.Box3().setFromObject(pane);
    if (side === 1) expect(gb.max.x).toBeGreaterThan(bb.max.x + 0.005);
    else expect(gb.min.x).toBeLessThan(bb.min.x - 0.005);
  }
});

it("hovercraft wheel groups carry no visible rolling stock", () => {
  const group = createHovercraft();
  group.updateMatrixWorld(true);
  for (const id of ["wheel-fl", "wheel-fr", "wheel-rl", "wheel-rr"]) {
    const wheel = group.getObjectByName(id)!;
    expect(wheel.children.length).toBeGreaterThan(0);
    for (const child of wheel.children) {
      const size = new T.Box3()
        .setFromObject(child)
        .getSize(new T.Vector3())
        .length();
      expect(size, `${id} filler diagonal`).toBeLessThan(0.5);
    }
  }
});
