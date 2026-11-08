export interface ZPoint {
  x: number;
  z: number;
}
export interface ZSolid {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color?: number;
  texture?: string;
  yaw?: number;
  angle?: number;
  roll?: number;
  footprint?: ZPoint[];
}
export interface ZLevel {
  solids: ZSolid[];
}
export interface ZSuspect {
  a: string;
  b: string;
  top: number;
  area: number;
  x: number;
  z: number;
}
export interface ZEdit {
  id: string;
  poly: ZPoint[];
}
export type ZPlan = { edits: ZEdit[]; axis: string } | { manual: true };
export function scanLevel(level: ZLevel): { suspects: ZSuspect[]; skipped: number };
export function planPair(level: ZLevel, q: ZSuspect): ZPlan;
export function applyTextEdits(raw: string, level: ZLevel, edits: ZEdit[]): string;
export function main(argv: string[]): Promise<void>;
