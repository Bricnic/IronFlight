export const DEFAULT_TUNING = {
  acceleration: 1,
  topSpeed: 1,
  boostPower: 1,
  friction: 1,
  steeringRate: 1,
};
export type Tuning = typeof DEFAULT_TUNING;
export function validateTuning(values: Partial<Tuning>): Partial<Tuning> {
  const result: Partial<Tuning> = {};
  for (const key of Object.keys(values) as (keyof Tuning)[]) {
    const value = values[key]!;
    if (
      !(key in DEFAULT_TUNING) ||
      !Number.isFinite(value) ||
      value < 1 ||
      value > 10
    )
      throw new RangeError("Tuning must be between 1x and 10x");
    result[key] = Math.round(value * 10) / 10;
  }
  return result;
}
