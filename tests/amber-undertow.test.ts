import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";

const id = "custom:amber-undertow";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});

it("guides the car through the tube and the causeway, then hands back the road for the finish", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    for (let i = 0; i < 4 / DT && !sim.guidedPipe.snapshot(); i++) sim.step({ throttle: 1 });
    expect(sim.guidedPipe.snapshot()?.section).toBe("tube");
    expect(sim.body.isKinematic()).toBe(true);
    let causeway = false;
    for (let i = 0; i < 10 / DT && sim.guidedPipe.snapshot(); i++) {
      causeway ||= sim.guidedPipe.snapshot()?.section === "causeway";
      // Inputs opposing the path must have no effect during either guided section.
      sim.step({ steer: 1, throttle: -1, brake: 1 });
    }
    expect(causeway).toBe(true);
    expect(sim.guidedPipe.snapshot()).toBeNull();
    expect(sim.body.isDynamic()).toBe(true);
    expect(sim.body.translation().x).toBeCloseTo(-36, 1);
    expect(sim.body.translation().z).toBeGreaterThanOrEqual(-18.01);
    expect(sim.body.linvel().z).toBeGreaterThan(10);
    expect(sim.snapshot(false).integrity).toBe(1);

    const route = [
      [-36, 77, 18, 7], [-32, 97, 11, 6], [-13, 117, 11, 7], [1, 130, 9, 6],
      [18, 146, 9, 8], [66, 146, 23, 7], [93, 146, 15, 0],
    ];
    let next = 0;
    let clearedSlime = false;
    for (let i = 0; i < 55 / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      const [wx, wz, , reach] = route[next];
      if (Math.hypot(wx - p.x, wz - p.z) < reach) next++;
      if (p.x > 50 && p.x < 55 && Math.abs(p.z - 146) < 10 && p.y > 13)
        clearedSlime = true;
      const [x, z, speed] = route[next];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const aim = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(aim), Math.cos(aim));
      const v = sim.body.linvel();
      const pace = Math.hypot(v.x, v.z);
      const cap = Math.abs(error) > 0.58 ? Math.min(6, speed) : speed;
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: pace < cap ? 1 : 0,
        brake: pace > cap + 0.65 ? 0.65 : 0,
      });
    }
    expect(sim.trackRun!.status, `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(clearedSlime).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("drops a truck through the turquoise tile's open center into the lava", () => {
  const sim = new Simulation();
  try {
    sim.startTrack(id);
    sim.body.setTranslation({ x: -36, y: 12, z: -94 }, true);
    sim.run(2);
    expect(sim.trackRun!.status).toBe("failed");
    expect(sim.damageEvents.some((event) => event.source === "lava")).toBe(true);
  } finally {
    sim.dispose();
  }
});
