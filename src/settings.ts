import { DEFAULT_WEATHER, parseWeatherFlags, type WeatherFlags } from "./weather";
export type VideoQuality = "low" | "medium" | "high";
export interface QualitySpec {
  /** Pixel-ratio cap (also capped by devicePixelRatio at apply time). */
  pixelRatio: number;
  shadows: boolean;
  /** Camera far plane: low shortens the draw distance. */
  far: number;
  /** Multiplier on the per-mood fog near/far. */
  fogScale: number;
}
export const QUALITY: Record<VideoQuality, QualitySpec> = {
  high: { pixelRatio: 1.5, shadows: true, far: 650, fogScale: 1 },
  medium: { pixelRatio: 1, shadows: true, far: 500, fogScale: 0.8 },
  low: { pixelRatio: 0.75, shadows: false, far: 350, fogScale: 0.6 },
};
/**
 * Rendering spec auto-applied inside an immersive-vr session and reverted on
 * exit. It starts from the low tier (no shadows, short draw distance) since
 * stereo roughly doubles fragment cost on headset GPUs; tune from on-device
 * measurement, never from desktop fps. Not a user-selectable tier.
 */
export const XR_QUALITY: QualitySpec = {
  pixelRatio: 0.75,
  shadows: false,
  far: 350,
  fogScale: 0.6,
};
/** Driving input source; Start/look sticks only poll in controller mode. */
export type InputDevice = "keyboard" | "controller";
export interface GameSettings {
  showObjectHelp: boolean;
  video: VideoQuality;
  night: boolean;
  rain: boolean;
  /** Re-roll night/rain at the start of every level and retry. */
  randomizeAtmosphere: boolean;
  input: InputDevice;
}
const SETTINGS_KEY = "iron-flight-settings-v1";
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
function isTier(value: unknown): value is VideoQuality {
  return value === "low" || value === "medium" || value === "high";
}
function isInput(value: unknown): value is InputDevice {
  return value === "keyboard" || value === "controller";
}
/** Stored settings, defaulting to (and repairing toward) high quality. */
export function loadSettings(
  storage: SettingsStorage = globalThis.localStorage,
): GameSettings {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      const video = (parsed as { video?: unknown } | null)?.video;
      if (isTier(video)) {
        const input = (parsed as { input?: unknown } | null)?.input;
        return {
          video,
          showObjectHelp: (parsed as { showObjectHelp?: unknown } | null)?.showObjectHelp === true,
          ...parseWeatherFlags(parsed),
          randomizeAtmosphere:
            (parsed as { randomizeAtmosphere?: unknown } | null)
              ?.randomizeAtmosphere === true,
          input: isInput(input) ? input : "keyboard",
        };
      }
    }
  } catch {
    // Corrupt JSON falls through to the default.
  }
  return { video: "high", ...DEFAULT_WEATHER, randomizeAtmosphere: false, showObjectHelp: false, input: "keyboard" };
}
export function saveSettings(
  video: VideoQuality,
  weather: WeatherFlags = DEFAULT_WEATHER,
  randomizeAtmosphere = false,
  storage: SettingsStorage = globalThis.localStorage,
  showObjectHelp = loadSettings(storage).showObjectHelp,
  input: InputDevice = loadSettings(storage).input,
): GameSettings {
  const settings = { video, ...weather, randomizeAtmosphere, showObjectHelp, input };
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}
export function saveInput(input: InputDevice, storage: SettingsStorage = globalThis.localStorage) {
  const settings = loadSettings(storage);
  return saveSettings(settings.video, { night: settings.night, rain: settings.rain }, settings.randomizeAtmosphere, storage, settings.showObjectHelp, input);
}
export function saveObjectHelp(show: boolean, storage: SettingsStorage = globalThis.localStorage) {
  const settings = loadSettings(storage);
  return saveSettings(settings.video, { night: settings.night, rain: settings.rain }, settings.randomizeAtmosphere, storage, show);
}
