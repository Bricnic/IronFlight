/** Black basalt rocks drifting on bulk lava lakes: rise, float and bob, sink. */

export interface LavaLake {
  x: number;
  z: number;
  w: number;
  d: number;
  surfaceY: number;
}

/** Rocks seed near this point so they stay visible around the action. */
export interface RockFocus {
  x: number;
  z: number;
  radius: number;
}

/** Footprint of a structure protruding above the lava; rocks seed clear of it. */
export interface RockCover {
  x: number;
  z: number;
  w: number;
  d: number;
}

export type RockState = "rising" | "floating" | "sinking";

export interface LavaRock {
  id: number;
  lake: number;
  x: number;
  z: number;
  /** Vertical offset relative to the lake surface. */
  y: number;
  phase: number;
  scale: number;
  spin: number;
  angle: number;
  state: RockState;
  stateT: number;
}

export const MAX_LAVA_ROCKS = 20;
export const ROCK_SPAWN_RADIUS = 150;
/** World-space drift mirroring the bulk shader's (0.009, 0.006) UV flow. */
export const LAVA_FLOW = { x: 0.8321, z: 0.5547 };
export const ROCK_DRIFT_SPEED = 2;
export const ROCK_BOB_AMP = 0.5;
export const ROCK_BOB_FREQ = 0.9;
const RISE_SECONDS = 2.5;
const SINK_SECONDS = 2;
const RISE_DEPTH = 3;
const SINK_DEPTH = 4;
const ROCK_MARGIN = 2;
const SPAWN_INSET = 6;
const SPAWN_ATTEMPTS = 24;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

function covered(x: number, z: number, covers: RockCover[]) {
  return covers.some(
    (c) => Math.abs(x - c.x) <= c.w / 2 && Math.abs(z - c.z) <= c.d / 2,
  );
}

function nextId(rocks: LavaRock[]) {
  return rocks.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

function spawnRock(
  id: number,
  lakes: LavaLake[],
  rand: () => number,
  state: RockState,
  focus: RockFocus | null,
  covers: RockCover[],
): LavaRock {
  const lake = Math.floor(rand() * lakes.length) % lakes.length;
  const l = lakes[lake];
  const hx = Math.max(1, l.w / 2 - SPAWN_INSET);
  const hz = Math.max(1, l.d / 2 - SPAWN_INSET);
  const fx = focus ? clamp(focus.x, l.x - hx, l.x + hx) : l.x;
  const fz = focus ? clamp(focus.z, l.z - hz, l.z + hz) : l.z;
  const sx = focus ? Math.min(focus.radius, hx) : hx;
  const sz = focus ? Math.min(focus.radius, hz) : hz;
  let x = fx;
  let z = fz;
  for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt++) {
    x = clamp(fx + (rand() * 2 - 1) * sx, l.x - hx, l.x + hx);
    z = clamp(fz + (rand() * 2 - 1) * sz, l.z - hz, l.z + hz);
    if (!covered(x, z, covers)) break;
  }
  return {
    id,
    lake,
    x,
    z,
    y: state === "rising" ? -RISE_DEPTH : 0,
    phase: rand() * Math.PI * 2,
    scale: 2.5 + rand() * 2.5,
    spin: (rand() - 0.5) * 0.6,
    angle: rand() * Math.PI * 2,
    state,
    stateT: 0,
  };
}

/** Fill a settled field of floating rocks, capped at MAX_LAVA_ROCKS. */
export function createRockField(
  lakes: LavaLake[],
  rand: () => number = Math.random,
  focus: RockFocus | null = null,
  covers: RockCover[] = [],
): LavaRock[] {
  const field: LavaRock[] = [];
  if (lakes.length === 0) return field;
  for (let i = 0; i < MAX_LAVA_ROCKS; i++)
    field.push(spawnRock(i + 1, lakes, rand, "floating", focus, covers));
  return field;
}

function pastEdge(rock: LavaRock, lake: LavaLake) {
  return (
    Math.abs(rock.x - lake.x) > lake.w / 2 + ROCK_MARGIN ||
    Math.abs(rock.z - lake.z) > lake.d / 2 + ROCK_MARGIN
  );
}

/** Advance the field; sunken rocks are replaced by risers elsewhere. */
export function updateRockField(
  rocks: LavaRock[],
  lakes: LavaLake[],
  dt: number,
  time: number,
  rand: () => number = Math.random,
  focus: RockFocus | null = null,
  covers: RockCover[] = [],
): LavaRock[] {
  const next: LavaRock[] = [];
  for (const rock of rocks) {
    const lake = lakes[rock.lake] ?? lakes[0];
    if (!lake) continue;
    const stateT = rock.stateT + dt;
    if (rock.state === "rising") {
      const y = -RISE_DEPTH * Math.max(0, 1 - stateT / RISE_SECONDS);
      if (stateT >= RISE_SECONDS)
        next.push({ ...rock, y: 0, state: "floating", stateT: 0 });
      else next.push({ ...rock, y, stateT });
    } else if (rock.state === "sinking") {
      if (stateT < SINK_SECONDS)
        next.push({ ...rock, y: -SINK_DEPTH * (stateT / SINK_SECONDS), stateT });
    } else {
      const x = rock.x + LAVA_FLOW.x * ROCK_DRIFT_SPEED * dt;
      const z = rock.z + LAVA_FLOW.z * ROCK_DRIFT_SPEED * dt;
      const moved = { ...rock, x, z, angle: rock.angle + rock.spin * dt };
      if (pastEdge(moved, lake))
        next.push({ ...moved, state: "sinking", stateT: 0 });
      else
        next.push({
          ...moved,
          y: Math.sin(time * ROCK_BOB_FREQ + rock.phase) * ROCK_BOB_AMP,
          stateT,
        });
    }
  }
  if (lakes.length > 0) {
    let id = nextId(next);
    while (next.length < MAX_LAVA_ROCKS)
      next.push(spawnRock(id++, lakes, rand, "rising", focus, covers));
  }
  return next;
}
