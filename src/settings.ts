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
export interface GameSettings {
  video: VideoQuality;
}
const SETTINGS_KEY = "iron-flight-settings-v1";
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
function isTier(value: unknown): value is VideoQuality {
  return value === "low" || value === "medium" || value === "high";
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
      if (isTier(video)) return { video };
    }
  } catch {
    // Corrupt JSON falls through to the default.
  }
  return { video: "high" };
}
export function saveSettings(
  video: VideoQuality,
  storage: SettingsStorage = globalThis.localStorage,
): GameSettings {
  const settings = { video };
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}
