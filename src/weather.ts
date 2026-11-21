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
/** Background templates stuck in permanent night (mystic caves). */
export const PERMANENT_NIGHT_TEMPLATES = ["mystic-cave"];
/** True when the track's background never sees daylight. */
export function isPermanentNight(backgroundTemplate?: string, forceNight?: boolean) {
  if (forceNight !== undefined) return forceNight;
  return (
    backgroundTemplate !== undefined &&
    PERMANENT_NIGHT_TEMPLATES.includes(backgroundTemplate)
  );
}
/**
 * Weather for an incoming level: stored flags (or a fresh roll when
 * randomizing), with permanent night enforced for mystic tracks. Leaving a
 * mystic track restores whatever Settings currently specifies.
 */
export function levelWeather(
  stored: WeatherFlags,
  randomize: boolean,
  roll: WeatherFlags,
  backgroundTemplate?: string,
  forceNight?: boolean,
): WeatherFlags {
  const next = randomize ? { ...roll } : { night: stored.night, rain: stored.rain };
  if (isPermanentNight(backgroundTemplate, forceNight)) next.night = true;
  return next;
}
