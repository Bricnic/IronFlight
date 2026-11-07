import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
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
    [-62, 50, 7], [-56, 30, 9], [-56, -37, 7], [-33, -42, 9],
    [61, -42, 8], [67, -57, 10], [67, -112, 25], [67, -126, 7],
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
  ["pterosaur", -4.5, 17, -37.5],
  ["spinosaurus", 70.5, 11, -44.7],
] as const) {
  it(`${kind} bites a nearby vehicle once per lunge and stays anchored`, () => {
    const sim = new Simulation();
    try {
      sim.startTrack(id);
      const hazard = sim.dungeon.mechanisms.find((m) => m.h.kind === kind)!;
      const origin = { ...hazard.h };
      sim.body.setTranslation({ x, y, z }, true);
      sim.run(1.2, { brake: 1 });
      expect(hazard.h).toEqual(origin);
      expect(hazard.contacts).toBe(1);
      expect(sim.damageEvents.filter((event) => event.source === kind)).toHaveLength(1);
    } finally {
      sim.dispose();
    }
  });
}
