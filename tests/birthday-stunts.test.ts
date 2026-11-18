import { Quaternion, Vector3 } from "three";
import { beforeAll, expect, it } from "vitest";
import { DT } from "../src/clock";
import { registerCustomTrack } from "../src/custom-level";
import { officialFileTracks } from "../src/official-levels";
import { Simulation, initPhysics } from "../src/simulation";
import type { CustomTrackId } from "../src/tracks";

beforeAll(initPhysics);

const CIRCUIT: CustomTrackId = "custom:birthday-cake-circuit";
const TABLE: CustomTrackId = "custom:birthday-table-loop";

// Tuning knobs for the two cake-top stunt lines. The JSON edits place the
// props; these drive the scripted proofs along them.
const CIRCUIT_LINE = {
  start: { x: 130.8, z: 130.8, yaw: -2.356194490192345 },
  aim: { x: 0, z: 0 },
  entry: 8,
};
const TABLE_STEERED = {
  start: { x: -71.3, z: -186.2, yaw: 0.4027 },
  aim: { x: 8, z: 0 },
  entry: 30,
};
const TABLE_STRAIGHT = {
  start: { x: -38, z: -190, yaw: 0 },
  aim: { x: -38, z: 100 },
  entry: 30,
};

function startOn(id: CustomTrackId) {
  const track = officialFileTracks.find((t) => t.id === id);
  if (!track) throw new Error(`missing official track ${id}`);
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(id);
  return sim;
}

function place(sim: Simulation, x: number, y: number, z: number, yaw: number) {
  sim.body.setTranslation({ x, y, z }, true);
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
  sim.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
  sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  sim.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

function headingOf(sim: Simulation) {
  const q = sim.body.rotation();
  const fx = 2 * (q.x * q.z + q.w * q.y);
  const fz = 1 - 2 * (q.x * q.x + q.y * q.y);
  return Math.atan2(fx, fz);
}

function pursuitInput(
  sim: Simulation,
  tx: number,
  tz: number,
  speed: number,
) {
  const p = sim.body.translation();
  const aim = Math.atan2(tx - p.x, tz - p.z) - headingOf(sim);
  const error = Math.atan2(Math.sin(aim), Math.cos(aim));
  const v = sim.body.linvel();
  const pace = Math.hypot(v.x, v.z);
  const cap = Math.abs(error) > 0.58 ? Math.min(6, speed) : speed;
  return {
    steer: Math.max(-1, Math.min(1, error * 2.5)),
    throttle: pace < cap ? 1 : 0,
    brake: pace > cap + 0.65 ? 0.65 : 0,
  };
}

function bounceCount(sim: Simulation) {
  return sim.slide.snapshot().trampolines.reduce((n, t) => n + t.bounces, 0);
}

it("Cake Circuit trampoline chain lands on the grand cake top and banks the star", () => {
  const sim = startOn(CIRCUIT);
  try {
    place(sim, CIRCUIT_LINE.start.x, 2.1, CIRCUIT_LINE.start.z, CIRCUIT_LINE.start.yaw);
    const diag = {
      entryPace: 0,
      bounce1: "",
      bounce2: "",
      touchdown: "",
      maxPace: 0,
    };
    // Phase A: roll into tramp-1 at stunt speed, aimed through to the cake.
    let i = 0;
    for (; i < 20 / DT && bounceCount(sim) < 1; i++) {
      const v = sim.body.linvel();
      const pace = Math.hypot(v.x, v.z);
      const input = pursuitInput(sim, CIRCUIT_LINE.aim.x, CIRCUIT_LINE.aim.z, CIRCUIT_LINE.entry);
      // Precision approach: hold entry speed into the pad.
      input.throttle = pace < CIRCUIT_LINE.entry ? 1 : 0;
      input.brake = pace > CIRCUIT_LINE.entry + 0.2 ? 0.5 : 0;
      sim.step(input);
      diag.entryPace = pace;
    }
    const b1 = sim.body.translation();
    diag.bounce1 = `(${b1.x.toFixed(1)},${b1.y.toFixed(1)},${b1.z.toFixed(1)})`;
    expect(bounceCount(sim), `never bounced; ${JSON.stringify(diag)}`).toBeGreaterThanOrEqual(1);
    // Phase B: coast the triple chain, sampling each bounce point.
    const bounces: string[] = [diag.bounce1];
    let last = 1;
    let fellShort = false;
    for (i = 0; i < 14 / DT && bounceCount(sim) < 3; i++) {
      sim.step({});
      const n = bounceCount(sim);
      if (n > last) {
        last = n;
        const p = sim.body.translation();
        bounces.push(`(${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)})`);
      }
      const p = sim.body.translation();
      if (i > 120 && p.y < 9) {
        fellShort = true;
        break;
      }
    }
    diag.bounce2 = bounces.slice(1).join(" ");
    expect(fellShort, `fell to the low tiers; ${JSON.stringify(diag)}`).toBe(false);
    expect(bounceCount(sim), `chain stalled; ${JSON.stringify(diag)}`).toBeGreaterThanOrEqual(3);
    // Phase C: ride the third bounce down onto the top, then stop.
    let touchdown = "";
    for (i = 0; i < 10 / DT; i++) {
      sim.step({});
      const p = sim.body.translation();
      if (!touchdown && p.y < 32.5 && Math.hypot(p.x, p.z) < 32)
        touchdown = `(${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)})`;
      if (touchdown) break;
    }
    diag.touchdown = touchdown || "none";
    for (i = 0; i < 4 / DT; i++) sim.step({ brake: 1 });
    const p = sim.body.translation();
    const v = sim.body.linvel();
    diag.maxPace = Math.hypot(v.x, v.z);
    const r = Math.hypot(p.x, p.z);
    expect(touchdown, `never reached the top; ${JSON.stringify(diag)}`).not.toBe("");
    expect(r, `rest ${JSON.stringify(diag)} rest=(${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)})`).toBeLessThan(28);
    expect(p.y, `rest height ${JSON.stringify(diag)}`).toBeGreaterThan(29);
    expect(p.y, `rest height ${JSON.stringify(diag)}`).toBeLessThan(34);
    expect([...(sim.trackRun?.stars ?? [])], `stars ${JSON.stringify(diag)}`).toContain("gold-star-1");
  } finally {
    sim.dispose();
  }
});

function driveTableLine(
  start: { x: number; z: number; yaw: number },
  aim: { x: number; z: number },
  entry: number,
) {
  const sim = startOn(TABLE);
  const diag = {
    maxPace: 0,
    boosted: false,
    touchdown: "",
    minTopR: Infinity,
    sensorEntry: "",
    rampEntryPace: 0,
    launch: "",
    boostStart: "",
    trace: [] as string[],
  };
  try {
    place(sim, start.x, 2.1, start.z, start.yaw);
    // Approach: hold the line at entry speed until the water boost fires.
    let i = 0;
    for (; i < 12 / DT; i++) {
      sim.step(pursuitInput(sim, aim.x, aim.z, entry));
      const p = sim.body.translation();
      const v = sim.body.linvel();
      diag.maxPace = Math.max(diag.maxPace, Math.hypot(v.x, v.z));
      if (!diag.sensorEntry && p.x > -49 && p.x < -35 && p.z > -123 && p.z < -109)
        diag.sensorEntry = `(${p.x.toFixed(1)},${Math.hypot(v.x, v.z).toFixed(1)})`;
      if (!diag.rampEntryPace && p.z >= -115)
        diag.rampEntryPace = Math.hypot(v.x, v.z);
      const pace = Math.hypot(v.x, v.z);
      if (!diag.boostStart && pace > 33)
        diag.boostStart = `(${p.x.toFixed(1)},${p.z.toFixed(1)})`;
      if (i % 10 === 0 && p.z > -150 && p.z < -70)
        diag.trace.push(`${p.z.toFixed(0)}:${pace.toFixed(0)}`);
      if (diag.maxPace > 45) {
        diag.boosted = true;
        break;
      }
    }
    // Launch: keep the nose on the line up the ramp, then coast the flight.
    for (i = 0; i < 3 / DT; i++) {
      sim.step(pursuitInput(sim, aim.x, aim.z, 99));
      const p = sim.body.translation();
      const v = sim.body.linvel();
      if (i % 10 === 0)
        diag.trace.push(`${p.z.toFixed(0)}:${Math.hypot(v.x, v.z).toFixed(0)}`);
      if (p.y > 4) {
        diag.launch = `(${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}) v=(${v.x.toFixed(1)},${v.y.toFixed(1)},${v.z.toFixed(1)})`;
        break;
      }
    }
    for (i = 0; i < 8 / DT; i++) {
      sim.step({});
      const p = sim.body.translation();
      const r = Math.hypot(p.x, p.z);
      if (p.y > 15 && p.y < 21) diag.minTopR = Math.min(diag.minTopR, r);
      if (!diag.touchdown && p.y < 18.5 && r < 32)
        diag.touchdown = `(${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)})`;
      if (diag.touchdown && p.y < 17.5) break;
    }
    for (i = 0; i < 2 / DT; i++) sim.step({ brake: 1 });
    const stars = [...(sim.trackRun?.stars ?? [])];
    return { diag, stars };
  } finally {
    sim.dispose();
  }
}

it("Table Loop steered water-boost line lands on the table cake top and banks the star", () => {
  const { diag, stars } = driveTableLine(TABLE_STEERED.start, TABLE_STEERED.aim, TABLE_STEERED.entry);
  expect(diag.boosted, `boost never fired; ${JSON.stringify(diag)}`).toBe(true);
  expect(diag.touchdown, `never reached the top; ${JSON.stringify(diag)}`).not.toBe("");
  const m = diag.touchdown.match(/\(([-\d.]+),([-\d.]+),([-\d.]+)\)/)!;
  expect(Math.hypot(Number(m[1]), Number(m[3])), `touchdown ${diag.touchdown} ${JSON.stringify(diag)}`).toBeLessThan(28);
  expect(stars, `stars ${JSON.stringify(diag)}`).toContain("gold-star-1");
});

it("Table Loop straight water-boost line misses the top, proving the steering skill", () => {
  const { diag, stars } = driveTableLine(TABLE_STRAIGHT.start, TABLE_STRAIGHT.aim, TABLE_STRAIGHT.entry);
  expect(diag.boosted, `dud run, boost never fired; ${JSON.stringify(diag)}`).toBe(true);
  expect(diag.minTopR, `straight line hit the top; ${JSON.stringify(diag)}`).toBeGreaterThan(32);
  expect(diag.touchdown, `straight line touched the top; ${JSON.stringify(diag)}`).toBe("");
  expect(stars, `straight line banked the star; ${JSON.stringify(diag)}`).not.toContain("gold-star-1");
});
