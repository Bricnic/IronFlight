import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { buildDungeonModel } from "../src/dungeon-view";
import { poseDinosaur } from "../src/dinosaur-view";
import { dinosaurAimPitch } from "../src/dinosaur-view";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";

const id = "custom:jurassic-junction";
const track = officialFileTracks.find((t) => t.id === id)!;
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(track);
});

it("drives from the starting tile to the raised finish, clearing the slime", () => {
  const sim = new Simulation();
  sim.startTrack(id);
  // Centerline waypoints through the bends. The driver only uses normal controls.
  const route = [
    [-62, 50, 7], [-56, 30, 9], [-56, -37, 7], [-33, -45, 9],
    [61, -45, 8], [67, -57, 10], [67, -112, 25], [67, -126, 7],
    [49, -130, 9], [-19, -130, 7], [-23, -150, 9], [-23, -225, 18],
  ];
  let next = 0;
  let overSlime = false;
  try {
    for (let i = 0; i < 80 / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      const reach = next === 3 ? 10 : next === 5 || next === 8 || next === 10 ? 8 : 5;
      if (next < route.length - 1 && Math.hypot(route[next][0] - p.x, route[next][1] - p.z) < reach)
        next++;
      if (p.z < -89 && p.z > -91 && Math.abs(p.x - 67) < 11 && p.y > 11)
        overSlime = true;
      const [x, z, maxSpeed] = route[next];
      const heading = sim.body.rotation();
      const forwardX = 2 * (heading.x * heading.z + heading.w * heading.y);
      const forwardZ = 1 - 2 * (heading.x ** 2 + heading.y ** 2);
      const desired = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(desired), Math.cos(desired));
      const velocity = sim.body.linvel();
      const speed = Math.hypot(velocity.x, velocity.z);
      const cap = Math.min(maxSpeed, Math.abs(error) > 0.55 ? 6 : Infinity);
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: speed < cap ? 1 : 0,
        brake: speed > cap + 0.6 ? 0.6 : 0,
      });
    }
    expect(sim.trackRun!.status, `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}`).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(overSlime).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("slime wrecks a vehicle that drops into the gap", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: 67, y: 10, z: -90 }, true);
    sim.run(1.3);
    expect(sim.trackRun!.status).toBe("failed");
    expect(sim.damageEvents.some((event) => event.source === "slime")).toBe(true);
  } finally {
    sim.dispose();
  }
});

for (const [kind, x, y, z] of [
  ["raptor", -52, 11, 52],
  ["pterosaur", -4.5, 17, -39.5],
  ["spinosaurus", 68.5, 11, -44.7],
] as const) {
  it(`${kind} bites a nearby vehicle once per lunge and stays anchored`, () => {
    const sim = new Simulation();
    try {
      sim.startTrack(id);
      const hazard = sim.dungeon.mechanisms.find((m) => m.h.kind === kind)!;
      expect(hazard.h.scale, "Jurassic dinosaurs run at double size").toBe(2);
      const origin = { ...hazard.h };
      sim.body.setTranslation({ x, y, z }, true);
      sim.run(1.2, { brake: 1 });
      expect(hazard.h).toEqual(origin);
      expect(hazard.contacts).toBe(1);
      // Oversized bite: exactly 3 parts torn off, one event each.
      const bites = sim.damageEvents.filter((event) => event.source === kind);
      expect(bites).toHaveLength(3);
      // The 3 ripped parts detach; a ripped chassis-rear also sheds its children.
      const detached = new Set(
        sim.partDefs.filter((d) => sim.parts.get(d.id)!.health === 0).map((d) => d.id),
      );
      expect(detached.size).toBeGreaterThanOrEqual(3);
      for (const b of bites) expect(detached.has(b.part)).toBe(true);
      expect(sim.status).toBe("driving");
      for (const d of sim.partDefs) {
        const st = sim.parts.get(d.id)!;
        if (st.health <= 0) continue;
        expect(st.health).toBeLessThanOrEqual(d.hp * 0.6 + 1e-6);
        expect(st.health).toBeGreaterThan(d.hp * 0.5);
      }
    } finally {
      sim.dispose();
    }
  });
}

it("rear bite tears off 3 parts and splashes 40% without wrecking", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    // Jaw lands 2m behind the car center: the rip takes rear parts, sparing the chassis.
    sim.body.setTranslation({ x: -55.4, y: 10, z: 49.8 }, true);
    sim.run(1.2, { brake: 1 });
    const hazard = sim.dungeon.mechanisms.find((m) => m.h.kind === "raptor")!;
    expect(hazard.contacts).toBe(1);
    const bites = sim.damageEvents.filter((event) => event.source === "raptor");
    expect(bites).toHaveLength(3);
    const detached = new Set(
      sim.partDefs.filter((d) => sim.parts.get(d.id)!.health === 0).map((d) => d.id),
    );
    expect(detached.size).toBeGreaterThanOrEqual(3);
    for (const b of bites) expect(detached.has(b.part)).toBe(true);
    expect(sim.parts.get("chassis-front")!.health).toBeGreaterThan(0);
    expect(sim.status).toBe("driving");
    for (const d of sim.partDefs) {
      const st = sim.parts.get(d.id)!;
      if (st.health <= 0) continue;
      expect(st.health).toBeLessThanOrEqual(d.hp * 0.6 + 1e-6);
      expect(st.health).toBeGreaterThan(d.hp * 0.5);
    }
  } finally {
    sim.dispose();
  }
});

it("pterosaur bites from double reach", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    // 9.5m out: inside the 2x mouth (|12.4 - 9.5| < 6.2), outside 1x (|6.2 - 9.5| > 3.1).
    sim.body.setTranslation({ x: -4.5, y: 22, z: -41 }, true);
    sim.run(1.2, { brake: 1 });
    const hazard = sim.dungeon.mechanisms.find((m) => m.h.kind === "pterosaur")!;
    expect(hazard.contacts).toBe(1);
    expect(sim.damageEvents.filter((event) => event.source === "pterosaur")).toHaveLength(3);
  } finally {
    sim.dispose();
  }
});

it("aim pitch tracks the head-to-target drop and clamps", () => {
  expect(dinosaurAimPitch(7, 1, 8)).toBeCloseTo(Math.atan2(6, 8), 6);
  expect(dinosaurAimPitch(1, 7, 8)).toBe(0);
  expect(dinosaurAimPitch(7, 1, 0)).toBe(1.0);
});

it("striking raptor pitches its head down at the truck, then recovers", () => {
  const model = buildDungeonModel({ id: "aim-raptor", kind: "raptor", x: 0, z: 0, phase: 0, scale: 2 });
  const dino = model.dinosaur!;
  const headAt = () => {
    model.root.updateMatrixWorld(true);
    return dino.head.getWorldPosition(new T.Vector3());
  };
  const aimError = (target: T.Vector3) => {
    model.root.updateMatrixWorld(true);
    const forward = new T.Vector3(0, 0, 1).applyQuaternion(dino.head.getWorldQuaternion(new T.Quaternion()));
    const want = target.clone().sub(dino.head.getWorldPosition(new T.Vector3())).normalize();
    return forward.angleTo(want);
  };
  poseDinosaur(dino, 0, 0);
  const rest = headAt();
  // Truck parked 8m out and 6m below the perched head: aim ~37 degrees down.
  const truck = new T.Vector3(0, rest.y - 6, rest.z + 8);
  expect(aimError(truck)).toBeGreaterThan(0.5);
  poseDinosaur(dino, 0.5, 0, 0.64);
  const strike = headAt();
  expect(rest.y - strike.y).toBeGreaterThan(2);
  expect(aimError(truck)).toBeLessThan(0.35);
  // Envelope decayed: fully back to the rest pose.
  poseDinosaur(dino, 2, 0, 0.64);
  expect(headAt().distanceTo(rest)).toBeLessThan(1e-6);
  expect(aimError(truck)).toBeGreaterThan(0.5);
});

it("oversized raptor model renders at double size", () => {
  const one = buildDungeonModel({ id: "size-1", kind: "raptor", x: 0, z: 0, phase: 0 });
  const two = buildDungeonModel({ id: "size-2", kind: "raptor", x: 0, z: 0, phase: 0, scale: 2 });
  expect(two.root.scale.x).toBe(2);
  const sizeOf = (root: T.Group) => {
    root.updateMatrixWorld(true);
    const box = new T.Box3();
    for (const child of root.children) box.expandByObject(child);
    return box.getSize(new T.Vector3());
  };
  const a = sizeOf(one.root), b = sizeOf(two.root);
  expect(b.x / a.x).toBeCloseTo(2, 1);
  expect(b.y / a.y).toBeCloseTo(2, 1);
  expect(b.z / a.z).toBeCloseTo(2, 1);
});
