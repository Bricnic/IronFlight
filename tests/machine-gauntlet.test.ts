import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { SCREW_POSITIONS, VOLCANO_PERIOD, screwWave } from "../src/gauntlet-timing";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";

const id = "custom:machine-gauntlet";
beforeAll(async () => {
  await initPhysics();
  registerCustomTrack(officialFileTracks.find((track) => track.id === id)!);
});
function race() {
  const sim = new Simulation();
  sim.startTrack(id);
  return sim;
}

it("drives past the machines, jumps the crater, and curves around the slime", () => {
  const sim = race();
  const volcano = sim.dungeon.gauntlet.machines.get("volcano")!.h;
  const route = [
    [0, -132, 10, 5], [24.5, -99, 9, 6], [24.5, -47, 14, 7],
    [0, -11, 12, 7], [0, 95, 25, 9], [0, 117, 18, 7],
    [-17, 150, 17, 8], [-16, 176, 18, 8], [4, 208, 16, 7],
    [0, 233, 12, 8], [-3, 251, 11, 7], [-17, 268, 11, 7],
    [-34, 282, 11, 7], [-44, 302, 12, 8], [-46, 345, 18, 0],
  ];
  let next = 0;
  let waiting = false;
  let jumped = false;
  try {
    for (let i = 0; i < 85 / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      const velocity = sim.body.linvel();
      const speed = Math.hypot(velocity.x, velocity.z);
      const [wx, wz, , reach] = route[next];
      if (Math.hypot(wx - p.x, wz - p.z) < reach) {
        if (next === 3) waiting = true;
        else next++;
      }
      if (waiting) {
        const phase = (sim.time + volcano.phase) % VOLCANO_PERIOD;
        if (speed > 0.55 || phase < 3.1 || phase > 3.35) {
          sim.step({ brake: 1 });
          continue;
        }
        waiting = false;
        next++;
      }
      if (Math.abs(p.z - volcano.z) < 1 && Math.abs(p.x - volcano.x) < 6 && p.y > 19)
        jumped = true;
      const [x, z, targetSpeed] = route[next];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const aim = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(aim), Math.cos(aim));
      const cap = Math.abs(error) > 0.58 ? Math.min(7, targetSpeed) : targetSpeed;
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 2.5)),
        throttle: speed < cap ? 1 : 0,
        brake: speed > cap + 0.65 ? 0.65 : 0,
      });
    }
    expect(sim.trackRun!.status, `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(jumped).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("launches the car backward and upward on a rising screw", () => {
  const sim = race();
  try {
    const { h } = sim.dungeon.gauntlet.machines.get("blue-screws")!;
    const { x, z } = SCREW_POSITIONS[screwWave(0, h.phase).shots[0].index];
    sim.body.setTranslation({ x: h.x + x, y: 11, z: h.z + z }, true);
    sim.run(0.37, { brake: 1 });
    expect(sim.damageEvents.some((e) => e.source === "screw-field")).toBe(true);
    expect(sim.body.linvel().z).toBeLessThan(-20);
    expect(sim.body.linvel().y).toBeGreaterThan(12);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("wrecks a truck in the erupting plume, but leaves the same space safe between eruptions", () => {
  const sim = race();
  try {
    sim.body.setTranslation({ x: 0, y: 23, z: 48 }, true);
    sim.run(0.12);
    expect(sim.status).toBe("driving");
    sim.startTrack(id);
    sim.run(4.98);
    sim.body.setTranslation({ x: 0, y: 23, z: 48 }, true);
    sim.run(0.2);
    expect(sim.status).toBe("wrecked");
    expect(sim.damageEvents.at(-1)?.source).toBe("volcano");
  } finally {
    sim.dispose();
  }
});

it("drops lethal spikes at both side openings and leaves the center safe", () => {
  const sim = race();
  try {
    for (const x of [-18, 0, 18]) {
      sim.startTrack(id);
      sim.body.setTranslation({ x, y: 11, z: 108 }, true);
      sim.run(0.4);
      expect(sim.status).toBe(x === 0 ? "driving" : "wrecked");
    }
  } finally {
    sim.dispose();
  }
});

it("turns at long range, advances nearby, and drills in 100 ms pulses", () => {
  const sim = race();
  try {
    const state = sim.dungeon.gauntlet.machines.get("blue-drill")!.state;
    if (state.kind !== "drill-tank") throw Error("Missing drill tank");
    const start = state.body.translation();
    sim.body.setTranslation({ x: start.x, y: 11, z: start.z + 45 }, true);
    sim.run(1.8);
    expect(state.body.translation().z).toBeCloseTo(start.z);
    expect(Math.cos(state.yaw)).toBeCloseTo(1);
    sim.body.setTranslation({ x: start.x, y: 11, z: start.z + 16 }, true);
    sim.run(0.6);
    expect(state.body.translation().z).toBeGreaterThan(start.z + 1);
    for (let i = 0; i < 120; i++) {
      const p = state.body.translation();
      sim.body.setTranslation({ x: p.x + Math.sin(state.yaw) * 9, y: 11, z: p.z + Math.cos(state.yaw) * 9 }, true);
      sim.step({ brake: 1 });
      if (i === 10) expect(sim.snapshot(false).integrity).toBeCloseTo(1);
      if (i === 11) expect(sim.snapshot(false).integrity).toBeCloseTo(0.95);
    }
    expect(sim.snapshot(false).integrity).toBeCloseTo(0.5);
    expect(sim.damageEvents.filter((e) => e.source === "drill-tank-part")).toHaveLength(5);
  } finally {
    sim.dispose();
  }
});

it("crushes for 90%, drops five parts, and releases a survivor after one second", () => {
  const sim = race();
  try {
    sim.body.setTranslation({ x: -9, y: 11, z: 199 }, true);
    sim.run(0.32);
    expect(sim.dungeon.gauntlet.holding).toBe(true);
    expect(sim.snapshot(false).integrity).toBeCloseTo(0.1);
    expect(sim.damageEvents.filter((e) => e.source === "crusher-claw-part")).toHaveLength(5);
    const z = sim.body.translation().z;
    sim.run(0.82, { throttle: 1 });
    expect(sim.body.translation().z).toBeCloseTo(z, 1);
    expect(sim.dungeon.gauntlet.holding).toBe(true);
    sim.run(0.2, { throttle: 1 });
    expect(sim.dungeon.gauntlet.holding).toBe(false);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
});
