import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { VOLCANO_PERIOD, windowGateBlocked } from "../src/gauntlet-timing";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:slime-surge";
function race(vehicleId?: string) {
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  sim.startTrack(id);
  return sim;
}

function steerTo(sim: Simulation, x: number, z: number, targetSpeed: number) {
  const p = sim.body.translation();
  const v = sim.body.linvel();
  const speed = Math.hypot(v.x, v.z);
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
  return speed;
}

/** Drive the walls, crater jump, tube, window, book and finish jump. Returns the run's elapsed sim seconds. */
export function driveSlimeSurgeToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = race(vehicleId);
  const volcano = sim.dungeon.gauntlet.machines.get("volcano-1")!.h;
  const window = sim.dungeon.gauntlet.machines.get("window-1")!.h;
  const flags = { jumped: false, rodeTube: false, rodeCauseway: false, passedWindow: false, passedBook: false, jumpedToFinish: false };
  try {
    const leg1 = [
      [0, -150, 10, 5], [0, -120, 9, 4], [0, -96, 10, 5],
      [0, -76, 9, 4], [0, -50, 12, 6], [0, -32, 12, 5],
      [0, 20, 25, 9], [0, 55, 14, 7], [0, 95, 12, 7], [0, 140, 10, 5],
      [0, 148, 8, 4],
    ];
    let next = 0;
    let waitingVolcano = false;
    for (let i = 0; i < 100 / DT && sim.trackRun!.status === "running" && next < leg1.length; i++) {
      const p = sim.body.translation();
      const [wx, wz, , reach] = leg1[next];
      if (Math.hypot(wx - p.x, wz - p.z) < reach) {
        if (next === 5) waitingVolcano = true;
        else next++;
        if (next >= leg1.length) break;
      }
      if (waitingVolcano) {
        const phase = (sim.time + volcano.phase) % VOLCANO_PERIOD;
        const speed = Math.hypot(sim.body.linvel().x, sim.body.linvel().z);
        if (speed > 0.55 || phase < 3.1 || phase > 3.35) {
          sim.step({ brake: 1 });
          continue;
        }
        waitingVolcano = false;
        next++;
      }
      if (Math.abs(p.z - volcano.z) < 1 && Math.abs(p.x - volcano.x) < 6 && p.y > 19)
        flags.jumped = true;
      const [x, z, targetSpeed] = leg1[next];
      steerTo(sim, x, z, targetSpeed);
    }
    expect(next, `leg1 stall at ${JSON.stringify(sim.body.translation())}`).toBe(leg1.length);
    for (let i = 0; i < 4 / DT && !sim.guidedPipe.snapshot(); i++) sim.step({ throttle: 1 });
    expect(sim.guidedPipe.snapshot()?.section).toBe("tube");
    for (let i = 0; i < 14 / DT && sim.guidedPipe.snapshot(); i++) {
      flags.rodeTube ||= sim.guidedPipe.snapshot()?.section === "tube";
      flags.rodeCauseway ||= sim.guidedPipe.snapshot()?.section === "causeway";
      sim.step({ steer: 1, throttle: -1, brake: 1 });
    }
    expect(sim.guidedPipe.snapshot()).toBeNull();
    expect(sim.body.translation().x).toBeCloseTo(-36, 0);
    const leg2 = [
      [-36, 245, 12, 6], [-36, 258, 8, 3], [-36, 275, 10, 5],
      [-48, 300, 10, 6], [-48, 324, 10, 6], [-36, 340, 10, 6],
      [-36, 356, 18, 5], [-36, 385, 18, 0],
    ];
    next = 0;
    let waitingWindow = false;
    for (let i = 0; i < 120 / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      const [wx, wz, , reach] = leg2[next];
      if (Math.hypot(wx - p.x, wz - p.z) < reach) {
        if (next === 1) waitingWindow = true;
        else next++;
      }
      if (waitingWindow) {
        const speed = Math.hypot(sim.body.linvel().x, sim.body.linvel().z);
        if (speed > 0.55 || windowGateBlocked(sim.time + window.phase)) {
          sim.step({ brake: 1 });
          continue;
        }
        waitingWindow = false;
        next++;
      }
      if (Math.abs(p.z - 262) < 1.6 && Math.abs(p.x + 36) < 5) flags.passedWindow = true;
      if (Math.abs(p.z - 312) < 12 && Math.abs(p.x + 36) > 9) flags.passedBook = true;
      if (p.z > 360 && p.z < 372 && p.y > 9.5) flags.jumpedToFinish = true;
      const [x, z, targetSpeed] = leg2[next];
      steerTo(sim, x, z, targetSpeed);
    }
    expect(sim.trackRun!.status, `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(flags.jumped).toBe(true);
    expect(flags.rodeTube).toBe(true);
    expect(flags.rodeCauseway).toBe(true);
    expect(flags.passedWindow).toBe(true);
    expect(flags.passedBook).toBe(true);
    expect(flags.jumpedToFinish).toBe(true);
    expect(sim.damageEvents.some((e) => e.source === "window-gate")).toBe(false);
    expect(sim.damageEvents.some((e) => e.source === "book")).toBe(false);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
