export const IDEAL_PACE_HI: number;
export interface IdealPoint {
  x: number;
  z: number;
}
export interface IdealLevel {
  mode: string;
  spawn: IdealPoint;
  checkpoints?: IdealPoint[];
  collectibles?: IdealPoint[];
  demolish?: IdealPoint[];
}
export function idealLineLength(level: IdealLevel): number;
export function idealLineSeconds(level: IdealLevel): number;
