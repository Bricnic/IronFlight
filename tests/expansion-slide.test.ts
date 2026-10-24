import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { getTrack } from "../src/tracks";
import {
  SlideSystems,
  slideDefs,
  inFlow,
  type FlowBox,
} from "../src/slide";
import {
  buildTrampolineMesh,
  trampolineStats,
  buildRingMesh,
  ringStats,
} from "../src/course-view";
beforeAll(initPhysics);
const slide = () => getTrack("sky-slide");
const flowBox = (): FlowBox => ({
  x: 0,
  z: 150,
  yaw: 0,
  w: 16,
  len: 400,
  dirx: 0,
  dirz: 1,
});
it("defines flow zones along the slide and a trampoline under the ring", () => {
  const defs = slideDefs(slide());
  expect(defs.flows.length).toBeGreaterThanOrEqual(5);
  for (const f of defs.flows) {
    expect(Number.isFinite(f.x + f.z + f.yaw + f.w + f.len)).toBe(true);
    expect(Math.hypot(f.dirx, f.dirz)).toBeCloseTo(1, 9);
  }
  expect(defs.trampolines).toHaveLength(1);
  const ring = slide().ring!;
  expect(defs.trampolines[0].x).toBe(ring.x);
  expect(defs.trampolines[0].z).toBe(ring.z);
  expect(slideDefs(getTrack("harbor-sprint"))).toEqual({
    flows: [],
    trampolines: [],
  });
  expect(slideDefs()).toEqual({ flows: [], trampolines: [] });
});
it("flow boxes rotate with the slide", () => {
  const box: FlowBox = { x: 0, z: 0, yaw: Math.PI / 2, w: 10, len: 30, dirx: 1, dirz: 0 };
  expect(inFlow(box, 12, 0)).toBe(true);
  expect(inFlow(box, 0, 12)).toBe(false);
  expect(inFlow(box, 20, 0)).toBe(false);
});
it("running water forces an idle truck down the slide", () => {
  const sim = new Simulation();
  sim.slide = new SlideSystems(sim, { flows: [flowBox()], trampolines: [] });
  sim.run(3);
  const snap = sim.snapshot(false);
  expect(snap.position.z).toBeGreaterThan(10);
  expect(snap.speed).toBeGreaterThan(5);
  expect(snap.slide.flowing).toBe(true);
  sim.dispose();
});
it("water drag caps the coasting speed", () => {
  const sim = new Simulation();
  sim.slide = new SlideSystems(sim, { flows: [flowBox()], trampolines: [] });
  sim.run(8);
  const speed = sim.snapshot(false).speed;
  expect(speed).toBeGreaterThan(10);
  expect(speed).toBeLessThan(20);
  sim.dispose();
});
it("strafe slides sideways without yaw while drive mode turns", () => {
  const strafe = new Simulation();
  strafe.courseTrack = slide();
  strafe.run(3, { throttle: 1, steer: 1 });
  const s = strafe.snapshot(false);
  expect(s.position.x).toBeGreaterThan(5);
  expect(s.forward[2]).toBeGreaterThan(0.95);
  expect(Math.abs(s.forward[0])).toBeLessThan(0.05);
  strafe.dispose();
  const drive = new Simulation();
  drive.run(6, { throttle: 1, steer: 1 });
  expect(drive.snapshot(false).forward[0]).toBeGreaterThan(0.2);
  drive.dispose();
});
it("trampolines bounce the truck very high without damage", () => {
  const sim = new Simulation();
  sim.slide = new SlideSystems(sim, {
    flows: [],
    trampolines: [{ x: 0, y: 0, z: 20 }],
  });
  sim.body.setTranslation({ x: 0, y: 2.1, z: 20 }, true);
  sim.run(0.5);
  expect(sim.bounced).toBe(true);
  expect(sim.snapshot().velocity.y).toBeGreaterThan(20);
  expect(sim.snapshot(false).integrity).toBe(1);
  expect(sim.status).toBe("driving");
  sim.dispose();
});
it("fallen trucks re-bounce after the cooldown", () => {
  const sim = new Simulation();
  sim.slide = new SlideSystems(sim, {
    flows: [],
    trampolines: [{ x: 0, y: 0, z: 20 }],
  });
  sim.body.setTranslation({ x: 0, y: 2.1, z: 20 }, true);
  let peak = 0;
  for (let i = 0; i < 5 * 120; i++) {
    sim.step({});
    peak = Math.max(peak, sim.body.translation().y);
  }
  expect(peak).toBeGreaterThan(20);
  expect(sim.slide.snapshot().trampolines[0].bounces).toBe(2);
  sim.dispose();
});
it("slide snapshots expose flow state and trampoline counts", () => {
  const sim = new Simulation();
  expect(sim.snapshot(false).slide).toMatchObject({
    flowing: false,
    flows: 0,
    trampolines: [],
  });
  expect(sim.bounced).toBe(false);
  sim.dispose();
});
it("trampoline and ring meshes match their physical sizes", () => {
  const tramp = trampolineStats(buildTrampolineMesh());
  expect(tramp.meshes).toBeGreaterThanOrEqual(3);
  expect(tramp.triangles).toBeGreaterThan(300);
  const ring = ringStats(buildRingMesh(6));
  expect(ring.meshes).toBeGreaterThanOrEqual(2);
  expect(ring.triangles).toBeGreaterThan(500);
  expect(ring.radius).toBe(6);
});
