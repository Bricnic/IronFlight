import { beforeAll, expect, it, vi } from "vitest";
import {
  PerspectiveCamera,
  Quaternion,
  Vector3,
  Mesh,
  MeshPhysicalMaterial,
  TextureLoader,
  Texture,
} from "three";
import { Simulation, initPhysics } from "../src/simulation";
import { ChaseCamera } from "../src/camera";
import { comicHazards } from "../src/comic-hazards";
import { courseProps, courseSolids } from "../src/course";
import { getTrack } from "../src/tracks";
import { Destructibles } from "../src/destructibles";
import { LoopView } from "../src/loop-view";
beforeAll(initPhysics);

it("loop arcs use translucent plastic while the approaches stay opaque", () => {
  const load = vi
    .spyOn(TextureLoader.prototype, "load")
    .mockReturnValue(new Texture());
  const view = new LoopView();
  load.mockRestore();
  const arcs = view.getObjectByName("transparent-plastic-loops") as Mesh;
  const plastic = arcs.material as MeshPhysicalMaterial;
  expect(plastic.isMeshPhysicalMaterial).toBe(true);
  expect(plastic.opacity).toBeLessThan(0.4);
  expect(plastic.depthWrite).toBe(false);
  expect(
    (view.getObjectByName("physical-loop-track") as Mesh).material,
  ).toHaveProperty("transparent", false);
});

it("a sinking player stays visible from above the stage", () => {
  const camera = new PerspectiveCamera();
  const chase = new ChaseCamera(camera);
  chase.update(new Vector3(10, 2, 30), new Quaternion(), 1 / 60, true);
  for (let i = 0; i < 180; i++)
    chase.update(
      new Vector3(10, -i / 30, 30),
      new Quaternion(),
      1 / 60,
      false,
      true,
    );
  expect(camera.position.y).toBeGreaterThanOrEqual(8);
  expect(camera.getWorldDirection(new Vector3()).y).toBeLessThan(-0.8);
  expect(camera.position.x).toBeCloseTo(10);
});

it("Canyon has several truck lengths of supported space behind spawn and ten ramp-height hydrants", () => {
  const track = getTrack("canyon-plunge");
  const ramp = courseSolids(track).find((s) => s.id === "plunge-ramp")!;
  expect(ramp.z - (Math.cos(ramp.angle!) * ramp.d) / 2).toBeLessThan(
    track.spawn.z - 25,
  );
  const hydrants = comicHazards(track);
  expect(hydrants).toHaveLength(10);
  expect(new Set(hydrants.map((h) => h.x)).size).toBe(3);
  for (let i = 0; i < hydrants.length; i++) {
    const h = hydrants[i];
    expect(h.kind).toBe("hydrant");
    expect(h.z).toBeGreaterThan(-100 + i * 94.5);
    expect(h.z).toBeLessThan(-100 + (i + 1) * 94.5);
    expect(h.y).toBeCloseTo(80 - ((h.z + 100) * 64) / 945 + 0.25);
  }
  const sim = new Simulation();
  sim.startTrack(track.id);
  sim.body.setTranslation({ x: 0, y: 85, z: -122 }, true);
  sim.run(1);
  expect(sim.body.translation().y).toBeGreaterThan(82);
  sim.setTuning({ topSpeed: 2, canyonTopSpeed: 3 });
  expect(sim.effectiveTopSpeed).toBe(6);
  sim.startTrack("harbor-sprint");
  expect(sim.effectiveTopSpeed).toBe(2);
  sim.dispose();
});

it.each([1, 2.5, 10])(
  "water provides %sx the 100 MPH base and steering returns on the finish pad",
  (multiplier) => {
    const sim = new Simulation();
    sim.startTrack("sky-slide");
    sim.setTuning({ slideWaterSpeed: multiplier });
    sim.step({ steer: 1 });
    expect(
      Math.abs(sim.snapshot(false).speed * 3.6 - multiplier * 100),
    ).toBeLessThan(1);
    expect(sim.steeringAngle).toBe(0);
    sim.body.setTranslation({ x: 15, y: 2.1, z: 2390 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 5 }, true);
    sim.run(0.5, { throttle: 1, steer: 1 });
    expect(sim.slide.flowing).toBe(false);
    expect(sim.steeringAngle).toBeGreaterThan(0.1);
    sim.dispose();
  },
);

it("twenty snowmen explode into debris, detach a random panel, and push the truck sideways once", () => {
  const defs = courseProps(getTrack("sky-slide"));
  expect(defs).toHaveLength(20);
  expect(defs.every((d) => d.kind === "snowman")).toBe(true);
  const sim = new Simulation("lab");
  sim.props = new Destructibles(sim.world, true, [
    { id: "test-snowman", kind: "snowman", x: 0, z: 12, ground: 0 },
  ]);
  sim.run(1.2, { throttle: 1 });
  expect(sim.props.props[0].broken).toBe(true);
  expect(sim.props.props[0].pieces).toHaveLength(12);
  expect(sim.damageEvents.filter((e) => e.source === "snowman")).toHaveLength(
    1,
  );
  expect([...sim.parts.values()].filter((p) => p.body)).toHaveLength(1);
  expect(sim.body.translation().x).toBeGreaterThan(0);
  for (let i = 0; i < 7; i++) sim.breakRandomPart("snowman");
  expect([...sim.parts.values()].filter((p) => p.body)).toHaveLength(8);
  sim.dispose();
});

it("ghosts accelerate as stones fall and detach a random panel per 20% of actual ghost damage", () => {
  const sim = new Simulation();
  sim.startTrack("haunted-hollow");
  const initial = sim.ghosts.speed;
  for (const p of sim.props.props.slice(0, 6)) p.broken = true;
  expect(sim.ghosts.speed).toBeGreaterThan(initial);
  expect(sim.ghosts.speed * 3.6).toBeLessThan(50);
  for (const p of sim.props.props) p.broken = true;
  expect(sim.ghosts.speed * 3.6).toBeCloseTo(50);
  const breaks = vi.spyOn(sim, "breakRandomPart");
  sim.ghosts.ghosts[0].overlapping = true;
  while (sim.ghosts.damageDealt < 0.19) sim.ghosts.attack();
  expect(breaks).not.toHaveBeenCalled();
  while (sim.ghosts.damageDealt < 0.2 - 1e-6) sim.ghosts.attack();
  expect(breaks).toHaveBeenCalledTimes(1);
  while (sim.ghosts.damageDealt < 0.4 - 1e-6) sim.ghosts.attack();
  expect(breaks).toHaveBeenCalledTimes(2);
  expect([...sim.parts.values()].filter((p) => p.body)).toHaveLength(2);
  sim.dispose();
});

it("a truck destroyed in lava keeps a finite empty root while its detached chassis sinks", () => {
  const sim = new Simulation();
  sim.startTrack("inferno-vault");
  sim.body.setTranslation({ x: -25, y: -3.8, z: 20 }, true);
  sim.run(2);
  const state = sim.snapshot(false);
  expect(state.parts["chassis-front"].lava).not.toBeNull();
  expect(state.parts["chassis-front"].position!.y).toBeLessThan(-4);
  for (const v of [
    ...Object.values(state.position),
    ...Object.values(state.velocity),
  ])
    expect(Number.isFinite(v)).toBe(true);
  sim.dispose();
});
