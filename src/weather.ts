/** Per-run weather mutators: night lighting and rain storms. */
export interface WeatherFlags {
  night: boolean;
  rain: boolean;
}
export const DEFAULT_WEATHER: WeatherFlags = { night: false, rain: false };
/** Coerce unknown stored flags, repairing anything non-boolean to off. */
export function parseWeatherFlags(value: unknown): WeatherFlags {
  const flags = value as Partial<WeatherFlags> | null;
  return {
    night: flags?.night === true,
    rain: flags?.rain === true,
  };
}
/** Independent coin flip per flag, so all four atmospheres can come up. */
export function randomWeather(rng: () => number = Math.random): WeatherFlags {
  return { night: rng() < 0.5, rain: rng() < 0.5 };
}
