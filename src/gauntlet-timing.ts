export const SCREW_FIELD_SIZE = 56;
export const SCREW_POSITIONS = Array.from({ length: 49 }, (_, i) => ({
  x: (i % 7 - 3) * 7,
  z: (Math.floor(i / 7) - 3) * 7,
}));
const screwPeriod = 2.45;
export const SCREW_HEIGHT = 5.8;

/** A seeded, unique set of holes per wave. Time alone reproduces the animation. */
export function screwWave(time: number, phase: number) {
  const wave = Math.floor(time / screwPeriod);
  const age = time - wave * screwPeriod;
  let seed = (Math.imul(wave + 1, 18990331) ^ Math.round(phase * 919393)) >>> 0;
  const selected = new Set<number>();
  const shots: { index: number; age: number }[] = [];
  for (let i = 0; i < 6; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    let index = (seed >>> 8) % SCREW_POSITIONS.length;
    while (selected.has(index)) index = (index + 1) % SCREW_POSITIONS.length;
    selected.add(index);
    shots.push({ index, age: age - 0.28 - 0.1 * i });
  }
  return { wave, shots };
}
export function screwLift(age: number) {
  if (age < 0) return 0;
  if (age < 0.17) return SCREW_HEIGHT * (age / 0.17) ** 0.65;
  return SCREW_HEIGHT * Math.max(0, 1 - (age - 0.17) / 1.25);
}

export const VOLCANO_PERIOD = 7.2;
export const VOLCANO_RIM = 7;
export const VOLCANO_PLUME_RADIUS = 5.4;
export function volcanoPhase(time: number) {
  const t = ((time % VOLCANO_PERIOD) + VOLCANO_PERIOD) % VOLCANO_PERIOD;
  return { warning: t >= 0.35 && t < 1.25, erupting: t >= 1.25 && t < 2.95 };
}

export const SPIKE_SIDE_X = [-18, 18] as const;
export const SPIKE_FALL = 0.18;
export function spikeHeight(age: number) {
  if (age < 0) return 10;
  if (age < SPIKE_FALL) return 10 - 9.6 * (age / SPIKE_FALL) ** 2;
  return 0.4 + 9.6 * Math.min(1, Math.max(0, (age - 0.52) / 0.48));
}

export const TANK = { aggro: 28, speed: 3.4, leash: 13, turn: 1.9 } as const;
export const WINDOW_GATE_PERIOD = 10;
export const WINDOW_GATE_BLOCK_HALF_ANGLE = 0.8;
export const WINDOW_GATE_COOLDOWN = 1.5;
/** Revolving sash angle in radians; flat across the lane (blocking) at 0 and PI. Shared by physics and views. */
export function windowGateAngle(time: number) {
  const t = (((time % WINDOW_GATE_PERIOD) + WINDOW_GATE_PERIOD) % WINDOW_GATE_PERIOD) / WINDOW_GATE_PERIOD;
  return t * Math.PI * 2;
}
/** True while the sash covers the lane; about half of each slow revolution. */
export function windowGateBlocked(time: number) {
  const a = windowGateAngle(time);
  const flat = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
  return Math.min(flat, Math.PI - flat) <= WINDOW_GATE_BLOCK_HALF_ANGLE;
}

export const CLAW_CLOSE = 0.24;
export const CLAW_HOLD = 1;
export function clawOpenness(age: number, held: boolean) {
  if (age < 0) return 1;
  if (age < CLAW_CLOSE) return 1 - (age / CLAW_CLOSE) ** 2;
  const closedUntil = CLAW_CLOSE + (held ? CLAW_HOLD : 0.22);
  return Math.min(1, Math.max(0, (age - closedUntil) / 0.24));
}
