import { beforeAll, expect, it } from "vitest";
import { loadSettings, saveSettings } from "../src/settings";
import { DEFAULT_WEATHER, levelWeather, randomWeather, type WeatherFlags } from "../src/weather";
import { Simulation, initPhysics } from "../src/simulation";

beforeAll(initPhysics);

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

it("defaults to clear daytime weather", () => {
  expect(DEFAULT_WEATHER).toEqual({ night: false, rain: false });
  expect(loadSettings(memoryStorage())).toEqual({
    video: "high",
    night: false,
    rain: false,
    randomizeAtmosphere: false,
    showObjectHelp: false,
  });
});

it("round-trips weather flags through storage", () => {
  const storage = memoryStorage();
  const flags: WeatherFlags[] = [
    { night: true, rain: false },
    { night: false, rain: true },
    { night: true, rain: true },
  ];
  for (const weather of flags) {
    expect(saveSettings("high", weather, false, storage)).toEqual({
      video: "high",
      ...weather,
      randomizeAtmosphere: false,
    showObjectHelp: false,
    });
    expect(loadSettings(storage)).toEqual({ video: "high", ...weather, randomizeAtmosphere: false, showObjectHelp: false });
  }
});

it("repairs invalid stored weather flags to off", () => {
  const storage = memoryStorage();
  storage.setItem(
    "iron-flight-settings-v1",
    JSON.stringify({ video: "low", night: "yes", rain: 1 }),
  );
  expect(loadSettings(storage)).toEqual({
    video: "low",
    night: false,
    rain: false,
    randomizeAtmosphere: false,
    showObjectHelp: false,
  });
  storage.setItem(
    "iron-flight-settings-v1",
    JSON.stringify({ video: "high" }),
  );
  expect(loadSettings(storage)).toEqual({
    video: "high",
    night: false,
    rain: false,
    randomizeAtmosphere: false,
    showObjectHelp: false,
  });
});

it("rolls each weather flag from its own coin flip", () => {
  expect(randomWeather(() => 0.1)).toEqual({ night: true, rain: true });
  expect(randomWeather(() => 0.9)).toEqual({ night: false, rain: false });
  const alternating = [0.1, 0.9];
  let calls = 0;
  expect(randomWeather(() => alternating[calls++ % alternating.length]!)).toEqual({
    night: true,
    rain: false,
  });
});

it("rolls all four atmospheres over many draws", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200 && seen.size < 4; i++)
    seen.add(JSON.stringify(randomWeather()));
  expect(seen.size).toBe(4);
});

it("starts simulations with clear daytime weather", () => {
  const sim = new Simulation();
  try {
    expect(sim.weather).toEqual({ night: false, rain: false });
  } finally {
    sim.dispose();
  }
});

it("restores stored settings when leaving a mystic track", () => {
  // Lavabridge Abyss -> triple loop (or previous to Bouncy House) with
  // daytime Settings must come back to day, keeping stored rain.
  expect(
    levelWeather({ night: false, rain: true }, false, { night: true, rain: true }, "pastoral-hills"),
  ).toEqual({ night: false, rain: true });
  expect(
    levelWeather({ night: false, rain: false }, false, { night: false, rain: false }, undefined),
  ).toEqual({ night: false, rain: false });
});

it("forces night on mystic tracks regardless of settings or rolls", () => {
  expect(
    levelWeather({ night: false, rain: false }, false, { night: false, rain: false }, "mystic-cave"),
  ).toEqual({ night: true, rain: false });
  // Even a daytime random roll stays night in the caves (rain still applies).
  expect(
    levelWeather({ night: false, rain: false }, true, { night: false, rain: true }, "mystic-cave"),
  ).toEqual({ night: true, rain: true });
});

it("honors random rolls on ordinary tracks", () => {
  expect(
    levelWeather({ night: false, rain: false }, true, { night: true, rain: true }, "pastoral-hills"),
  ).toEqual({ night: true, rain: true });
  expect(
    levelWeather({ night: true, rain: true }, true, { night: false, rain: false }, "pastoral-hills"),
  ).toEqual({ night: false, rain: false });
});
