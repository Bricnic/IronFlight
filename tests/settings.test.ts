import { expect, it } from "vitest";
import {
  QUALITY,
  loadSettings,
  saveInput,
  saveSettings,
  saveObjectHelp,
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
it("defaults object help off for fresh, older and malformed preferences", () => {
  const storage = memoryStorage();
  expect(loadSettings(storage).showObjectHelp).toBe(false);
  for (const value of [undefined, "true", 1, false]) {
    storage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "high", showObjectHelp: value }));
    expect(loadSettings(storage).showObjectHelp).toBe(false);
  }
});
it("remembers object help when other settings change", () => {
  const storage = memoryStorage();
  saveObjectHelp(true, storage);
  expect(loadSettings(storage).showObjectHelp).toBe(true);
  saveSettings("low", { night: true, rain: true }, true, storage);
  expect(loadSettings(storage)).toMatchObject({ showObjectHelp: true, video: "low", night: true, rain: true, randomizeAtmosphere: true });
  saveObjectHelp(false, storage);
  expect(loadSettings(storage)).toMatchObject({ showObjectHelp: false, video: "low", night: true, rain: true, randomizeAtmosphere: true });
});

it("defaults to high video quality", () => {
  expect(loadSettings(memoryStorage())).toEqual({ video: "high", ...DEFAULT_WEATHER, randomizeAtmosphere: false, showObjectHelp: false, input: "keyboard" });
});

it("round-trips the video tier through storage", () => {
  const storage = memoryStorage();
  for (const tier of ["low", "medium", "high"] as VideoQuality[]) {
    expect(saveSettings(tier, { night: true, rain: false }, false, storage)).toEqual({ video: tier, night: true, rain: false, randomizeAtmosphere: false, showObjectHelp: false, input: "keyboard" });
    expect(loadSettings(storage)).toEqual({ video: tier, night: true, rain: false, randomizeAtmosphere: false, showObjectHelp: false, input: "keyboard" });
  }
});

it("round-trips the randomize atmosphere flag through storage", () => {
  const storage = memoryStorage();
  expect(saveSettings("high", { night: false, rain: false }, true, storage)).toEqual({ video: "high", night: false, rain: false, randomizeAtmosphere: true, showObjectHelp: false, input: "keyboard" });
  expect(loadSettings(storage)).toEqual({ video: "high", night: false, rain: false, randomizeAtmosphere: true, showObjectHelp: false, input: "keyboard" });
});

it("repairs missing or invalid stored tiers to high", () => {
  const storage = memoryStorage();
  storage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "ultra" }));
  expect(loadSettings(storage)).toEqual({ video: "high", ...DEFAULT_WEATHER, randomizeAtmosphere: false, showObjectHelp: false, input: "keyboard" });
  storage.setItem("iron-flight-settings-v1", "{broken");
  expect(loadSettings(storage)).toEqual({ video: "high", ...DEFAULT_WEATHER, randomizeAtmosphere: false, showObjectHelp: false, input: "keyboard" });
  storage.setItem("iron-flight-settings-v1", JSON.stringify({}));
  expect(loadSettings(storage)).toEqual({ video: "high", ...DEFAULT_WEATHER, randomizeAtmosphere: false, showObjectHelp: false, input: "keyboard" });
});

it("repairs a non-boolean randomize flag to off", () => {
  const storage = memoryStorage();
  storage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "high", randomizeAtmosphere: "yes" }));
  expect(loadSettings(storage)).toEqual({ video: "high", ...DEFAULT_WEATHER, randomizeAtmosphere: false, showObjectHelp: false, input: "keyboard" });
});

it("round-trips the input device and preserves it across other saves", () => {
  const storage = memoryStorage();
  expect(loadSettings(storage).input).toBe("keyboard");
  expect(saveInput("controller", storage).input).toBe("controller");
  expect(loadSettings(storage).input).toBe("controller");
  saveSettings("low", { night: true, rain: false }, false, storage);
  expect(loadSettings(storage).input).toBe("controller");
  saveObjectHelp(true, storage);
  expect(loadSettings(storage).input).toBe("controller");
  expect(saveInput("keyboard", storage).input).toBe("keyboard");
  expect(loadSettings(storage).input).toBe("keyboard");
});

it("repairs missing or invalid stored input to keyboard", () => {
  const storage = memoryStorage();
  storage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "high" }));
  expect(loadSettings(storage).input).toBe("keyboard");
  storage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "high", input: "gamepad" }));
  expect(loadSettings(storage).input).toBe("keyboard");
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
