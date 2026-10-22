import { beforeAll, expect, it } from "vitest";
import { initPhysics, Simulation } from "../src/simulation";
import { PARTS } from "../src/damage";
import { arenaSolids } from "../src/arena";
import { basinSolids } from "../src/scenery";
import { DT } from "../src/clock";
import { TruckFireView } from "../src/truck-fire";
import { createTruck } from "../src/truck";
import * as T from "three";
beforeAll(initPhysics);

for (const id of ["roof", "door-left", "wheel-fl", "chassis-rear", "hood"])
  it(`${id} sinks monotonically and is fully submerged two seconds after contact`, () => {
    const sim = new Simulation("easy");
    const pool = arenaSolids().find((p) => p.id === "lava-easy")!;
    const surface = pool.y + pool.h / 2;
    const def = PARTS.find((p) => p.id === id)!;
    sim.damage(id, 10000);
    const part = sim.parts.get(id)!;
    const angle = id === "hood" ? Math.PI / 3 : 0;
    const halfHeight =
      (Math.abs(Math.sin(angle)) * def.size[0] +
        Math.abs(Math.cos(angle)) * def.size[1]) /
      2;
    part.body!.setRotation(
      new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), angle),
      true,
    );
    part.body!.setTranslation(
      { x: pool.x, y: surface + halfHeight + 0.2, z: pool.z },
      true,
    );
    part.body!.setLinvel({ x: 0, y: -4, z: 0 }, true);
    for (let i = 0; i < 60 && !part.lava; i++) sim.step();
    expect(part.lava).toBeDefined();
    expect(part.lava!.progress).toBeLessThan(0.02);
    expect(part.body!.isKinematic()).toBe(true);
    let previousY = part.body!.translation().y;
    for (let i = 0; i < 238; i++) {
      sim.step();
      expect(part.body!.translation().y).toBeLessThanOrEqual(
        previousY + 0.00001,
      );
      previousY = part.body!.translation().y;
    }
    expect(part.lava!.progress).toBeCloseTo(0.99, 1);
    expect(part.lava!.scorch).toBe(1);
    sim.run(3 * DT);
    expect(part.lava!.progress).toBe(1);
    expect(part.body!.translation().y + halfHeight).toBeLessThan(surface);
    expect(sim.parts.get("door-right")!.lava).toBeUndefined();
    sim.reset();
    expect([...sim.parts.values()].every((p) => !p.lava)).toBe(true);
    sim.dispose();
  });

it("lava is a sensor and basin floors do not overlap their walls", () => {
  const sim = new Simulation("easy");
  const pool = arenaSolids().find((p) => p.id === "lava-easy")!;
  const colliders: boolean[] = [];
  sim.world.forEachCollider((c) => {
    if (Math.abs(c.translation().y - pool.y) < 0.0001)
      colliders.push(c.isSensor());
  });
  expect(colliders).toContain(true);
  for (const floor of basinSolids().filter((p) => p.id.endsWith("floor")))
    for (const wall of basinSolids().filter(
      (p) =>
        p.id.startsWith(floor.id.replace("-floor", "")) &&
        !p.id.endsWith("floor"),
    )) {
      const overlap = (axis: "x" | "y" | "z", dimension: "w" | "h" | "d") =>
        Math.max(
          0,
          Math.min(
            floor[axis] + floor[dimension] / 2,
            wall[axis] + wall[dimension] / 2,
          ) -
            Math.max(
              floor[axis] - floor[dimension] / 2,
              wall[axis] - wall[dimension] / 2,
            ),
        );
      expect(
        overlap("x", "w") * overlap("y", "h") * overlap("z", "d"),
      ).toBeLessThan(1e-8);
    }
  sim.dispose();
});

it("lava chars only the affected part, including materials formerly shared across doors", () => {
  const sim = new Simulation("easy");
  const truck = createTruck({
    paint: new T.MeshPhysicalMaterial({ color: 0xe65921 }),
    metal: new T.MeshStandardMaterial({ color: 0x888888 }),
  });
  const fire = new TruckFireView();
  fire.reset(truck);
  const color = (id: string) => {
    let result: T.Color | undefined;
    truck.getObjectByName(id)!.traverse((o) => {
      if (
        !result &&
        o instanceof T.Mesh &&
        o.material instanceof T.MeshStandardMaterial
      )
        result = o.material.color.clone();
    });
    return result!;
  };
  const untouched = color("door-right");
  const initial = color("door-left");
  sim.parts.get("door-left")!.lava = {
    entered: 0,
    progress: 0.5,
    surface: -5.925,
    startY: -5,
    endY: -7,
    scorch: 0.7,
  };
  fire.update(sim, new T.Vector3());
  expect(color("door-left").r).toBeLessThan(initial.r * 0.2);
  expect(color("door-right").equals(untouched)).toBe(true);
  sim.dispose();
});
it("the roof cage starts immersion before the thin roof collider and fully submerges", () => {
  const sim = new Simulation("easy");
  const truck = createTruck();
  const roof = truck.getObjectByName("roof")!;
  const def = PARTS.find((p) => p.id === "roof")!;
  truck.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(roof);
  const origin = new T.Vector3(...def.pos);
  const min = bounds.min.sub(origin),
    max = bounds.max.sub(origin);
  expect(min.y).toBeLessThan(-1);
  sim.partBounds.set("roof", { min, max });
  sim.damage("roof", 10000);
  const state = sim.parts.get("roof")!;
  const surface = -5.925;
  state.body!.setTranslation(
    { x: -24, y: surface - min.y - 0.01, z: 20 },
    true,
  );
  sim.step();
  expect(state.lava).toBeDefined();
  // The roof panel itself is still well above the lava when the cage enters it.
  expect(state.body!.translation().y - def.size[1] / 2).toBeGreaterThan(
    surface + 0.5,
  );
  sim.run(2);
  expect(state.body!.translation().y + max.y).toBeLessThan(surface);
  sim.dispose();
});
