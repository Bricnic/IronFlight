export const TUNING_KEYS = [
  "acceleration",
  "topSpeed",
  "boostPower",
  "friction",
  "steeringRate",
  "turningPower",
  "brakePower",
  "maxSteeringAngle",
  "dragonDamage",
  "hammerSpeed",
  "handbrakePower",
  "shadowDarkness",
  "gravity",
  "primaryColor",
  "secondaryColor",
] as const;
export type Tuning = Record<(typeof TUNING_KEYS)[number], number>;
export function tuningRange(key: keyof Tuning) {
  if (key === "primaryColor" || key === "secondaryColor")
    return { min: 0, max: 0xffffff, step: 1 };
  return key === "maxSteeringAngle"
    ? { min: 5, max: 90, step: 1 }
    : {
        min: key === "gravity" || key === "turningPower" ? 0.1 : 1,
        max: 10,
        step: 0.1,
      };
}
export function validateTuning(values: Partial<Tuning>): Partial<Tuning> {
  const result: Partial<Tuning> = {};
  for (const key of Object.keys(values) as (keyof Tuning)[]) {
    const value = values[key]!;
    const range = tuningRange(key);
    if (
      !TUNING_KEYS.includes(key) ||
      !Number.isFinite(value) ||
      value < range.min ||
      value > range.max
    )
      throw new RangeError("Tuning outside slider range");
    result[key] = Math.round(value / range.step) * range.step;
    result[key] = Math.round(result[key]! * 10) / 10;
  }
  return result;
}
