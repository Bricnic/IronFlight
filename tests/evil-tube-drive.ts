import { expect } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { VOLCANO_PERIOD } from "../src/gauntlet-timing";
import { officialFileTracks } from "../src/official-levels";
import { Simulation } from "../src/simulation";

const id = "custom:evil-tube-run";

/** [x, z, targetSpeed, reach] waypoints from the sketch's pink path. */
const route = [
  [-60, -120, 14, 6], [-66, -95, 10, 5], [-66, -70, 12, 5],
  [-60, -30, 12, 6], [-45, -18, 10, 5], [-28, -14, 12, 5],
  [-10, -10, 12, 5], [20, 8, 12, 6], [60, 11, 12, 5],
  [100, -14, 12, 6], [125, -16, 22, 5], [185, -16, 22, 6],
  [225, -16, 14, 5],
  [345, 10, 10, 6], [340, -10, 10, 6], [338, -30, 10, 6],
  [336, -55, 8, 5], [336, -85, 8, 5], [338, -105, 8, 5],
  [338, -135, 10, 5], [338, -160, 10, 5],
  [374, -268, 6, 4], [374, -342, 22, 7], [374, -374, 12, 0],
];
const TRANSIT_MOUTH = 12;
const SHOOTER_MOUTH = 20;
const VOLCANO_WAIT = 21;

function driveStep(sim: Simulation, x: number, z: number, targetSpeed: number) {
  const p = sim.body.translation();
  const velocity = sim.body.linvel();
  const speed = Math.hypot(velocity.x, velocity.z);
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

function runWaypoints(
  sim: Simulation, from: number, to: number, budgetSec: number,
  onTick?: (p: { x: number; y: number; z: number }) => void,
): number {
  let next = from;
  for (let i = 0; i < budgetSec / DT && sim.trackRun!.status === "running" && next <= to; i++) {
    const p = sim.body.translation();
    const [wx, wz, , reach] = route[next];
    if (Math.hypot(wx - p.x, wz - p.z) < reach) {
      next++;
      continue;
    }
    const [x, z, targetSpeed] = route[next];
    driveStep(sim, x, z, targetSpeed);
    onTick?.(p);
  }
  return next;
}

function rideTube(sim: Simulation, label: string) {
  for (let i = 0; i < 6 / DT && !sim.guidedPipe.snapshot(); i++) sim.step({ throttle: 1 });
  expect(sim.guidedPipe.snapshot()?.section, label).toBe("tube");
  expect(sim.body.isKinematic()).toBe(true);
  let causeway = false;
  for (let i = 0; i < 14 / DT && sim.guidedPipe.snapshot(); i++) {
    causeway ||= sim.guidedPipe.snapshot()?.section === "causeway";
    sim.step({});
  }
  expect(causeway, label).toBe(true);
  expect(sim.guidedPipe.snapshot(), label).toBeNull();
  expect(sim.body.isDynamic()).toBe(true);
  expect(sim.snapshot(false).integrity, label).toBe(1);
}

/** Drive the sketch route: book bypass, screws, lava jump, transit plus shooter tubes, crater jump. Returns elapsed sim seconds. */
export function driveEvilTubeToCompletion(vehicleId?: string): number {
  registerCustomTrack(officialFileTracks.find((t) => t.id === id)!);
  let elapsed = 0;
  const sim = new Simulation();
  if (vehicleId !== undefined) sim.setVehicle(vehicleId);
  let jumpedPit = false;
  let jumpedCrater = false;
  try {
    sim.startTrack(id);
    const volcano = sim.dungeon.gauntlet.machines.get("north-crater")!.h;
    let next = runWaypoints(sim, 0, TRANSIT_MOUTH, 150, (p) => {
      if (Math.abs(p.x - 161.58) < 4 && Math.abs(p.z + 16) < 8 && p.y > 25) jumpedPit = true;
    });
    expect(next, "transit tube approach").toBeGreaterThan(TRANSIT_MOUTH);
    rideTube(sim, "transit-tube");
    const transitExit = sim.body.translation();
    expect(transitExit.x).toBeCloseTo(321.4, 0);
    expect(transitExit.z).toBeCloseTo(20, 0);
    expect(sim.body.linvel().x).toBeGreaterThan(10);

    next = runWaypoints(sim, TRANSIT_MOUTH + 1, SHOOTER_MOUTH, 150);
    expect(next, "shooter tube approach").toBeGreaterThan(SHOOTER_MOUTH);
    rideTube(sim, "shooter-tube");
    const shooterExit = sim.body.translation();
    expect(shooterExit.x).toBeCloseTo(374, 0);
    expect(shooterExit.z).toBeCloseTo(-260, 0);
    expect(sim.body.linvel().z).toBeLessThan(-10);

    next = runWaypoints(sim, SHOOTER_MOUTH + 1, VOLCANO_WAIT, 40);
    expect(next, "volcano wait").toBeGreaterThan(VOLCANO_WAIT);
    let settled = false;
    for (let i = 0; i < 40 / DT && sim.trackRun!.status === "running"; i++) {
      const velocity = sim.body.linvel();
      const speed = Math.hypot(velocity.x, velocity.z);
      const phase = (sim.time + volcano.phase) % VOLCANO_PERIOD;
      if (speed > 0.55 || phase < 3.1 || phase > 3.35) {
        sim.step({ brake: 1 });
        continue;
      }
      settled = true;
      break;
    }
    expect(settled, "volcano window").toBe(true);
    next = runWaypoints(sim, VOLCANO_WAIT + 1, route.length - 1, 60, (p) => {
      if (Math.abs(p.z + 317.9) < 2 && Math.abs(p.x - 374) < 6 && p.y > 9) jumpedCrater = true;
    });
    expect(sim.trackRun!.status, `Waypoint ${next}, position ${JSON.stringify(sim.body.translation())}, events ${JSON.stringify(sim.damageEvents.slice(-3))}`).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(3);
    expect(jumpedPit).toBe(true);
    expect(jumpedCrater).toBe(true);
    elapsed = sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
  }
  return elapsed;
}
