import { validateTuning, type Tuning } from "./tuning-schema";
import defaults from "./tuning-defaults.json";
export const DEFAULT_TUNING = { ...defaults };
export { tuningRange, validateTuning } from "./tuning-schema";
export type { Tuning } from "./tuning-schema";
export function replaceDefaults(values: Tuning) {
  const next = validateTuning(values);
  if (Object.keys(next).length !== Object.keys(DEFAULT_TUNING).length)
    throw new RangeError("A complete tuning config is required");
  Object.assign(DEFAULT_TUNING, next);
  return { ...DEFAULT_TUNING };
}
