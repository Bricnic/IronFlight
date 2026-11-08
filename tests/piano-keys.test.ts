import { beforeAll, expect, it } from "vitest";
import {
  PIANO_COLORS,
  PIANO_FADE_SECONDS,
  PIANO_KEY_COUNT,
  pianoKeyColorAt,
} from "../src/piano-keys";
import {
  registerCustomTrack,
  toTrack,
  validateCustomLevel,
  type CustomLevel,
} from "../src/custom-level";
import { initPhysics, Simulation } from "../src/simulation";

beforeAll(async () => {
  await initPhysics();
});

const mini = (): CustomLevel => ({
  name: "Piano Probe",
  mode: "race",
  spawn: { x: 0, y: 5, z: -10, yaw: 0 },
  checkpoints: [{ x: 0, z: 10 }],
  solids: [
    {
      id: "ground",
      kind: "ground",
      x: 0,
      y: -0.6,
      z: 0,
      w: 200,
      h: 1.2,
      d: 200,
      color: 0x6d817c,
    },
    {
      id: "key-c",
      kind: "tile",
      x: -4,
      y: 0.5,
      z: 0,
      w: 6,
      h: 1,
      d: 10,
      color: 0xffffff,
      pianoKey: 0,
    },
    {
      id: "key-d",
      kind: "tile",
      x: 4,
      y: 0.5,
      z: 0,
      w: 6,
      h: 1,
      d: 10,
      color: 0xffffff,
      pianoKey: 1,
    },
  ],
  prefabs: [],
  medals: { gold: 30, silver: 45, bronze: 60 },
});

it("maps seven white keys onto distinct rainbow colors", () => {
  expect(PIANO_KEY_COUNT).toBe(7);
  expect(PIANO_COLORS).toHaveLength(7);
  expect(new Set(PIANO_COLORS).size).toBe(7);
});

it("shows the full rainbow color at the strike instant", () => {
  for (let key = 0; key < PIANO_KEY_COUNT; key++)
    expect(pianoKeyColorAt(key, 12, 12)).toBe(PIANO_COLORS[key]);
});

it("fades struck keys linearly back to white", () => {
  expect(PIANO_FADE_SECONDS).toBeGreaterThan(0);
  expect(pianoKeyColorAt(0, 0, PIANO_FADE_SECONDS)).toBe(0xffffff);
  expect(pianoKeyColorAt(0, 0, PIANO_FADE_SECONDS + 30)).toBe(0xffffff);
  // Red halfway through the fade is halfway to white.
  expect(pianoKeyColorAt(0, 0, PIANO_FADE_SECONDS / 2)).toBe(0xff8080);
});

it("accepts piano keys 0-6 and rejects anything else", () => {
  const level = mini();
  expect(() => validateCustomLevel(level)).not.toThrow();
  for (const bad of [-1, 7, 1.5, Number.NaN]) {
    const broken = mini();
    (broken.solids[1] as { pianoKey: unknown }).pianoKey = bad;
    expect(() => validateCustomLevel(broken)).toThrow();
  }
});

it("carries piano keys through to the playable track", () => {
  const track = toTrack(validateCustomLevel(mini()));
  expect(
    track.custom!.solids
      .filter((s) => s.pianoKey !== undefined)
      .map((s) => [s.id, s.pianoKey]),
  ).toEqual([
    ["key-c", 0],
    ["key-d", 1],
  ]);
});

it("records a press when a wheel rests on a key, nothing elsewhere", () => {
  const track = toTrack(validateCustomLevel(mini()));
  registerCustomTrack(track);
  const sim = new Simulation();
  try {
    sim.startTrack(track.id);
    expect(sim.pianoPresses()).toEqual([]);
    sim.body.setTranslation({ x: -4, y: 4, z: 0 }, true);
    sim.run(1);
    const presses = sim.pianoPresses();
    expect(presses.map((p) => p.key)).toEqual([0]);
    expect(presses[0].at).toBeGreaterThan(0);
    expect(presses[0].at).toBeLessThanOrEqual(sim.time);
    sim.body.setTranslation({ x: 60, y: 4, z: 60 }, true);
    sim.run(1);
    expect(sim.pianoPresses().map((p) => p.key)).toEqual([0]);
  } finally {
    sim.dispose();
  }
});

it("re-pressing a key refreshes its strike time", () => {
  const track = toTrack(validateCustomLevel(mini()));
  registerCustomTrack(track);
  const sim = new Simulation();
  try {
    sim.startTrack(track.id);
    sim.body.setTranslation({ x: 4, y: 4, z: 0 }, true);
    sim.run(1);
    const first = sim.pianoPresses().find((p) => p.key === 1)!.at;
    sim.run(1);
    const second = sim.pianoPresses().find((p) => p.key === 1)!.at;
    expect(second).toBeGreaterThan(first);
  } finally {
    sim.dispose();
  }
});
