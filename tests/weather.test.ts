import { beforeAll, expect, it } from "vitest";
import { loadSettings, saveSettings } from "../src/settings";
import { DEFAULT_WEATHER, type WeatherFlags } from "../src/weather";
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
    expect(saveSettings("high", weather, storage)).toEqual({
      video: "high",
      ...weather,
    });
    expect(loadSettings(storage)).toEqual({ video: "high", ...weather });
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
  });
  storage.setItem(
    "iron-flight-settings-v1",
    JSON.stringify({ video: "high" }),
  );
  expect(loadSettings(storage)).toEqual({
    video: "high",
    night: false,
    rain: false,
  });
});

it("starts simulations with clear daytime weather", () => {
  const sim = new Simulation();
  try {
    expect(sim.weather).toEqual({ night: false, rain: false });
  } finally {
    sim.dispose();
  }
});
