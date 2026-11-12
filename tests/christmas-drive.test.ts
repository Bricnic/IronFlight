import { beforeAll, expect, it, vi } from "vitest";
import { Quaternion, Vector3 } from "three";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { DUNGEON_STRIKE } from "../src/dungeon-hazards";
import { officialFileTracks } from "../src/official-levels";
import { initPhysics, Simulation } from "../src/simulation";
import type { CustomTrackId } from "../src/tracks";

beforeAll(initPhysics);

// Ghost full-route drivability proof for the christmas geometry: damage is
// stubbed and ice luck forced fair, so these prove climbs, jumps, tubes and
// gates work end to end. Lethal balance is covered per-kind in
// christmas-lethal.test.ts. Set ZZ_LOG=1 for per-10s route telemetry.
const UP = new Vector3(0, 1, 0);
const LETHAL_KINDS = new Set([
  "christmas-nutcracker", "christmas-ice-vice", "christmas-toy-chomper", "christmas-yeti-jaws",
  "christmas-ornament-slammer", "christmas-sleigh-crusher", "christmas-icicle-shears", "christmas-tinsel-snapper",
]);

function ghostDrive(id: CustomTrackId, route: [number, number, number, number][], gates: number) {
  const track = officialFileTracks.find((t) => t.id === id)!;
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(id);
  vi.spyOn(sim, "damage").mockImplementation(() => {});
  sim.fragileIce.rng = () => 0.99;
  const lethals = track.custom!.prefabs.filter((p) => LETHAL_KINDS.has(p.kind));
  let next = 0;
  let stuck = 0, reversing = 0;
  try {
    for (let i = 0; i < 320 / DT && sim.trackRun!.status === "running"; i++) {
      const p = sim.body.translation();
      if (process.env.ZZ_LOG && i % 1200 === 0) {
        const s = sim.snapshot(false);
        console.log(`${id} t=${sim.time.toFixed(0)}s wp=${next} pos=(${p.x.toFixed(0)},${p.y.toFixed(0)},${p.z.toFixed(0)}) cp=${sim.trackRun!.checkpoint} pipe=${sim.guidedPipe.snapshot()?.id ?? "-"} up=${s.upDot.toFixed(2)} status=${sim.status}`);
      }
      const velocity = sim.body.linvel();
      const speed = Math.hypot(velocity.x, velocity.z);
      const [wx, wz, , reach] = route[next];
      if (Math.hypot(wx - p.x, wz - p.z) < reach && next < route.length - 1) next++;
      const [x, z, targetSpeed] = route[next];
      const q = sim.body.rotation();
      const forwardX = 2 * (q.x * q.z + q.w * q.y);
      const forwardZ = 1 - 2 * (q.x ** 2 + q.y ** 2);
      const desired = Math.atan2(x - p.x, z - p.z) - Math.atan2(forwardX, forwardZ);
      const error = Math.atan2(Math.sin(desired), Math.cos(desired));
      const cap0 = Math.abs(error) > 0.55 ? Math.min(6, targetSpeed) : targetSpeed;
      // Crawl snap-trap zones at 8: strikes still land (damage is stubbed) but
      // the downward slams plant the truck instead of rolling it.
      const nearLethal = lethals.some((l) => {
        const r = DUNGEON_STRIKE[l.kind as keyof typeof DUNGEON_STRIKE].radius;
        return Math.hypot(l.x - p.x, l.z - p.z) < r + 30;
      });
      const cap = nearLethal ? Math.min(cap0, 8) : cap0;
      // Reverse out like a human when beached: 3s at a standstill triggers 1s of backing up.
      const dist = Math.hypot(x - p.x, z - p.z);
      if (reversing > 0) reversing--;
      else if (dist > reach + 2 && speed < 0.8) { if (++stuck > 360) { reversing = 120; stuck = 0; } }
      else stuck = 0;
      sim.step(reversing > 0
        ? { steer: Math.max(-1, Math.min(1, -error * 2.5)), throttle: -0.8, brake: 0 }
        : {
            steer: Math.max(-1, Math.min(1, error * 2.5)),
            throttle: speed < cap ? 1 : 0,
            brake: speed > cap + 0.65 ? 1 : 0,
          });
    }
    expect(sim.trackRun!.status, `${id} waypoint ${next}/${route.length} at ${JSON.stringify(sim.body.translation())}`).toBe("completed");
    expect(sim.trackRun!.checkpoint).toBe(gates);
    return sim.trackRun!.elapsed;
  } finally {
    sim.dispose();
    vi.restoreAllMocks();
  }
}

it("ghost-drives Tinsel Town to completion", () => {
  ghostDrive("custom:tinsel-town", [
    [-240, -60, 20, 10], [-170, -60, 22, 10], [-90, -60, 15, 10], [-30, -60, 15, 8],
    [30, -20, 18, 10], [90, -20, 22, 10], [150, -20, 15, 10], [210, 30, 15, 10],
    [260, 65, 18, 10], [300, 100, 15, 8],
  ], 4);
}, 120000);

it("ghost-drives Mistletoe Mile to completion", () => {
  ghostDrive("custom:mistletoe-mile", [
    [-260, -72, 20, 12], [-170, -37, 22, 12], [-80, -2, 22, 12], [-20, 20, 12, 10],
    [-20, 70, 18, 10], [-20, 120, 12, 8], [20, 120, 18, 8], [60, 120, 15, 6],
    [150, 156, 20, 15], [240, 156, 22, 12], [330, 156, 18, 10],
  ], 5);
}, 120000);

it("ghost-drives Nutcracker Run to completion", () => {
  ghostDrive("custom:nutcracker-run", [
    [-330, -140, 20, 12], [-255, -140, 22, 10], [-160, -140, 6, 6], [-160, -110, 8, 8], [-160, -70, 15, 10],
    [-160, 0, 8, 8], [-160, 40, 8, 8], [-160, 65, 6, 6], [-145, 80, 6, 6], [-100, 80, 12, 10],
    [-55, 80, 6, 6], [-40, 65, 6, 6], [-40, 20, 8, 8], [-40, -5, 6, 6], [-40, -40, 6, 6], [-20, -40, 6, 6], [20, -40, 25, 8],
    [60, -40, 25, 10], [120, -40, 6, 8], [120, -15, 8, 8], [120, 20, 12, 8], [120, 70, 8, 8], [120, 100, 8, 8],
  ], 5);
}, 120000);

it("ghost-drives Sleigh Bell Sprint to completion", () => {
  ghostDrive("custom:sleigh-bell-sprint", [
    [-320, -160, 20, 12], [-245, -160, 22, 10], [-150, -160, 6, 6], [-150, -115, 8, 8], [-150, -70, 15, 10],
    [-150, 20, 8, 8], [-90, 20, 15, 8], [-30, 20, 15, 8], [30, 20, 8, 8],
    [30, 65, 20, 8], [30, 110, 25, 8], [30, 160, 25, 10], [30, 200, 8, 8],
    [130, 230, 20, 12], [230, 260, 15, 8],
  ], 5);
}, 120000);

it("ghost-drives North Pole Summit to completion", () => {
  ghostDrive("custom:north-pole-summit", [
    [-360, -170, 20, 12], [-265, -170, 22, 10], [-150, -170, 12, 8], [-114, -128, 15, 8],
    [-78, -86, 15, 8], [-52, -56, 25, 8], [-30, -30, 20, 10], [-30, 60, 18, 10],
    [-30, 120, 8, 8], [-30, 150, 6, 8], [0, 150, 8, 8], [40, 150, 10, 8], [110, 150, 10, 6], [200, 186, 20, 15],
    [305, 186, 22, 12], [410, 186, 18, 10],
  ], 5);
}, 120000);

function rideTube(id: CustomTrackId, tubeId: string, from: { x: number; y: number; z: number }, yaw: number, exit: { x: number; z: number }) {
  const track = officialFileTracks.find((t) => t.id === id)!;
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(id);
  try {
    sim.body.setTranslation(from, true);
    sim.body.setRotation(new Quaternion().setFromAxisAngle(UP, yaw), true);
    let sawRide = false, afterRide = -1;
    for (let i = 0; i < 25 / DT; i++) {
      sim.step({ throttle: 1, steer: 0, brake: 0 });
      if (sim.guidedPipe.snapshot()?.id === tubeId) {
        sawRide = true;
        afterRide = 0;
      } else if (afterRide >= 0 && ++afterRide > 60) break;
    }
    expect(sawRide, `${id} ${tubeId} engages the ride`).toBe(true);
    const p = sim.body.translation();
    expect(Math.hypot(p.x - exit.x, p.z - exit.z), `${id} exits near ${JSON.stringify(exit)}`).toBeLessThan(50);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
}

it("rides the Mistletoe Mile tube from approach to runout", () => {
  rideTube("custom:mistletoe-mile", "mm-tube", { x: 45, y: 12.4, z: 120 }, Math.PI / 2, { x: 150, z: 156 });
});

it("rides the North Pole Summit tube from approach to runout", () => {
  rideTube("custom:north-pole-summit", "np-tube", { x: 85, y: 13, z: 150 }, Math.PI / 2, { x: 200, z: 186 });
});

function clearJump(
  id: CustomTrackId, from: { x: number; y: number; z: number }, yaw: number,
  dir: { x: number; z: number }, lip: { x: number; z: number }, gapEnd: { x: number; z: number },
) {
  const track = officialFileTracks.find((t) => t.id === id)!;
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(id);
  try {
    sim.body.setTranslation(from, true);
    sim.body.setRotation(new Quaternion().setFromAxisAngle(UP, yaw), true);
    sim.body.setLinvel({ x: dir.x * 25, y: 0, z: dir.z * 25 }, true);
    for (let i = 0; i < 5 / DT; i++) sim.step({ throttle: 1, steer: 0, brake: 0 });
    const p = sim.body.translation();
    const along = (p.x - lip.x) * dir.x + (p.z - lip.z) * dir.z;
    const gap = (gapEnd.x - lip.x) * dir.x + (gapEnd.z - lip.z) * dir.z;
    expect(along, `${id} clears the jump`).toBeGreaterThan(gap + 15);
    expect(p.y).toBeGreaterThan(-1);
    expect(sim.status).toBe("driving");
  } finally {
    sim.dispose();
  }
}

it("clears the Nutcracker Run jump at speed", () => {
  clearJump("custom:nutcracker-run", { x: 10, y: 2.1, z: -40 }, Math.PI / 2,
    { x: 1, z: 0 }, { x: 40, z: -40 }, { x: 54, z: -40 });
});

it("clears the Sleigh Bell Sprint jump at speed", () => {
  clearJump("custom:sleigh-bell-sprint", { x: 30, y: 2.1, z: 100 }, 0,
    { x: 0, z: 1 }, { x: 30, z: 130 }, { x: 30, z: 144 });
});

it("clears the North Pole Summit jump at speed", () => {
  const len = Math.hypot(120, 140);
  clearJump("custom:north-pole-summit", { x: -75.2, y: 2.1, z: -82.7 }, Math.atan2(120, 140),
    { x: 120 / len, z: 140 / len }, { x: -52.4, z: -56.1 }, { x: -43.3, z: -47.7 });
});
