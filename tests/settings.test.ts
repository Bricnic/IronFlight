import { expect, it } from "vitest";
import {
  QUALITY,
  loadSettings,
  saveSettings,
  type VideoQuality,
} from "../src/settings";
import { DEFAULT_WEATHER } from "../src/weather";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

it("defaults to high video quality", () => {
  expect(loadSettings(memoryStorage())).toEqual({ video: "high", ...DEFAULT_WEATHER, randomizeAtmosphere: false });
});

it("round-trips the video tier through storage", () => {
  const storage = memoryStorage();
  for (const tier of ["low", "medium", "high"] as VideoQuality[]) {
    expect(saveSettings(tier, { night: true, rain: false }, false, storage)).toEqual({ video: tier, night: true, rain: false, randomizeAtmosphere: false });
    expect(loadSettings(storage)).toEqual({ video: tier, night: true, rain: false, randomizeAtmosphere: false });
  }
});

it("round-trips the randomize atmosphere flag through storage", () => {
  const storage = memoryStorage();
  expect(saveSettings("high", { night: false, rain: false }, true, storage)).toEqual({ video: "high", night: false, rain: false, randomizeAtmosphere: true });
  expect(loadSettings(storage)).toEqual({ video: "high", night: false, rain: false, randomizeAtmosphere: true });
});

it("repairs missing or invalid stored tiers to high", () => {
  const storage = memoryStorage();
  storage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "ultra" }));
  expect(loadSettings(storage)).toEqual({ video: "high", ...DEFAULT_WEATHER, randomizeAtmosphere: false });
  storage.setItem("iron-flight-settings-v1", "{broken");
  expect(loadSettings(storage)).toEqual({ video: "high", ...DEFAULT_WEATHER, randomizeAtmosphere: false });
  storage.setItem("iron-flight-settings-v1", JSON.stringify({}));
  expect(loadSettings(storage)).toEqual({ video: "high", ...DEFAULT_WEATHER, randomizeAtmosphere: false });
});

it("repairs a non-boolean randomize flag to off", () => {
  const storage = memoryStorage();
  storage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "high", randomizeAtmosphere: "yes" }));
  expect(loadSettings(storage)).toEqual({ video: "high", ...DEFAULT_WEATHER, randomizeAtmosphere: false });
});

it("low sacrifices pixel ratio, shadows, far plane and fog", () => {
  expect(QUALITY.high).toMatchObject({
    pixelRatio: 1.5,
    shadows: true,
    far: 650,
    fogScale: 1,
  });
  expect(QUALITY.low.shadows).toBe(false);
  expect(QUALITY.low.pixelRatio).toBeLessThan(QUALITY.medium.pixelRatio);
  expect(QUALITY.medium.pixelRatio).toBeLessThan(QUALITY.high.pixelRatio);
  expect(QUALITY.low.far).toBeLessThan(QUALITY.medium.far);
  expect(QUALITY.medium.far).toBeLessThan(QUALITY.high.far);
  expect(QUALITY.low.fogScale).toBeLessThan(QUALITY.high.fogScale);
});
