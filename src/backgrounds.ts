import { TEXTURE_IDS } from "./custom-level";
import type { WeatherFlags } from "./weather";

export const SHAPE_KINDS = [
  "hill",
  "mountain",
  "snow-peak",
  "mesa",
  "tree",
  "dead-tree",
  "skyscraper",
  "container-stack",
  "crane",
  "smokestack",
  "tent",
  "toy-block",
  "rock-wall",
  "moon",
] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];

export interface BackgroundShapeRing {
  kind: ShapeKind;
  texture?: string;
  count: number;
  radius: number;
  y?: number;
  size: [number, number];
  seed?: number;
  color?: number;
  arc?: [number, number];
}

export interface BackgroundClouds {
  count: number;
  y: [number, number];
  radius: [number, number];
  color: number;
  opacity: number;
  drift: number;
  seed?: number;
}

export interface BackgroundTemplate {
  name: string;
  sky: { top: number; horizon: number };
  fog: { color: number; near: number; far: number };
  sun: { color: number; intensity: number };
  hemi: { sky: number; ground: number; intensity: number };
  env: number;
  underground?: boolean;
  shapes: BackgroundShapeRing[];
  clouds?: BackgroundClouds;
}

export const DEFAULT_BACKGROUND_TEMPLATE = "pastoral-hills";

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;
const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);
const colorInt = (n: unknown) =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 0xffffff;
const pair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && finite(v[0]) && finite(v[1]);

function check(errors: string[], ok: unknown, message: string) {
  if (!ok) errors.push(message);
}

/** Strict validation; throws one Error listing every problem. */
export function validateBackgroundTemplate(input: unknown): BackgroundTemplate {
  const errors: string[] = [];
  const t = input as BackgroundTemplate;
  check(errors, !!t && typeof t === "object", "template must be an object");
  check(
    errors,
    typeof t?.name === "string" && NAME_PATTERN.test(t.name),
    "name must be 1-64 chars of letters, numbers, spaces, - or _",
  );
  check(errors, colorInt(t?.sky?.top), "sky.top must be an integer color");
  check(errors, colorInt(t?.sky?.horizon), "sky.horizon must be an integer color");
  check(errors, colorInt(t?.fog?.color), "fog.color must be an integer color");
  check(
    errors,
    finite(t?.fog?.near) && finite(t?.fog?.far) && t.fog.near > 0 && t.fog.near < t.fog.far,
    "fog needs 0 < near < far",
  );
  check(errors, colorInt(t?.sun?.color), "sun.color must be an integer color");
  check(
    errors,
    finite(t?.sun?.intensity) && t.sun.intensity >= 0,
    "sun.intensity must be finite and >= 0",
  );
  check(errors, colorInt(t?.hemi?.sky), "hemi.sky must be an integer color");
  check(errors, colorInt(t?.hemi?.ground), "hemi.ground must be an integer color");
  check(
    errors,
    finite(t?.hemi?.intensity) && t.hemi.intensity >= 0,
    "hemi.intensity must be finite and >= 0",
  );
  check(
    errors,
    finite(t?.env) && t.env >= 0 && t.env <= 2,
    "env must be between 0 and 2",
  );
  check(
    errors,
    t?.underground === undefined || typeof t.underground === "boolean",
    "underground must be a boolean",
  );
  const shapes = Array.isArray(t?.shapes) ? t.shapes : [];
  check(errors, Array.isArray(t?.shapes), "shapes must be an array");
  for (const [i, s] of shapes.entries()) {
    check(
      errors,
      (SHAPE_KINDS as readonly string[]).includes(s?.kind),
      `shape ${i} has an unknown kind`,
    );
    check(
      errors,
      s?.texture === undefined ||
        (TEXTURE_IDS as readonly string[]).includes(s.texture),
      `shape ${i} has an unknown texture`,
    );
    check(
      errors,
      Number.isInteger(s?.count) && s.count >= 1,
      `shape ${i} needs a positive integer count`,
    );
    check(errors, finite(s?.radius) && s.radius > 0, `shape ${i} needs a positive radius`);
    check(errors, s?.y === undefined || finite(s.y), `shape ${i} needs a finite y`);
    check(
      errors,
      pair(s?.size) && s.size[0] > 0 && s.size[0] <= s.size[1],
      `shape ${i} needs a positive size range`,
    );
    check(errors, s?.seed === undefined || finite(s.seed), `shape ${i} needs a finite seed`);
    check(
      errors,
      s?.color === undefined || colorInt(s.color),
      `shape ${i} needs an integer color`,
    );
    check(
      errors,
      s?.arc === undefined || pair(s.arc),
      `shape ${i} needs a finite arc pair`,
    );
  }
  const clouds = t?.clouds;
  if (clouds !== undefined) {
    check(
      errors,
      Number.isInteger(clouds?.count) && clouds.count >= 0,
      "clouds need a non-negative integer count",
    );
    check(
      errors,
      pair(clouds?.y) && clouds.y[0] <= clouds.y[1],
      "clouds need a y range",
    );
    check(
      errors,
      pair(clouds?.radius) && clouds.radius[0] > 0 && clouds.radius[0] <= clouds.radius[1],
      "clouds need a positive radius range",
    );
    check(errors, colorInt(clouds?.color), "clouds need an integer color");
    check(
      errors,
      finite(clouds?.opacity) && clouds.opacity >= 0 && clouds.opacity <= 1,
      "clouds need opacity between 0 and 1",
    );
    check(
      errors,
      finite(clouds?.drift) && clouds.drift >= 0,
      "clouds need a drift >= 0",
    );
    check(
      errors,
      clouds?.seed === undefined || finite(clouds.seed),
      "clouds need a finite seed",
    );
  }
  if (errors.length)
    throw new Error(`Invalid background template: ${errors.join("; ")}`);
  return {
    name: t.name,
    sky: { ...t.sky },
    fog: { ...t.fog },
    sun: { ...t.sun },
    hemi: { ...t.hemi },
    env: t.env,
    ...(t.underground === undefined ? {} : { underground: t.underground }),
    shapes: shapes.map((s) => ({
      kind: s.kind,
      ...(s.texture === undefined ? {} : { texture: s.texture }),
      count: s.count,
      radius: s.radius,
      ...(s.y === undefined ? {} : { y: s.y }),
      size: [s.size[0], s.size[1]] as [number, number],
      ...(s.seed === undefined ? {} : { seed: s.seed }),
      ...(s.color === undefined ? {} : { color: s.color }),
      ...(s.arc === undefined ? {} : { arc: [s.arc[0], s.arc[1]] as [number, number] }),
    })),
    ...(clouds === undefined
      ? {}
      : {
          clouds: {
            count: clouds.count,
            y: [clouds.y[0], clouds.y[1]] as [number, number],
            radius: [clouds.radius[0], clouds.radius[1]] as [number, number],
            color: clouds.color,
            opacity: clouds.opacity,
            drift: clouds.drift,
            ...(clouds.seed === undefined ? {} : { seed: clouds.seed }),
          },
        }),
  };
}

const definitions = import.meta.glob<unknown>("../levels/backgrounds/*.json", {
  eager: true,
  import: "default",
});

const registry = new Map<string, BackgroundTemplate>();
for (const definition of Object.values(definitions)) {
  const template = validateBackgroundTemplate(definition);
  registry.set(template.name, template);
}

/** Sorted names of every bundled background template. */
export function listBackgroundTemplates(): string[] {
  return [...registry.keys()].sort();
}

/** Resolve a template by name, falling back to the default meadow. */
export function getBackgroundTemplate(name: string | undefined): BackgroundTemplate {
  if (name !== undefined) {
    const found = registry.get(name);
    if (found) return found;
  }
  const fallback = registry.get(DEFAULT_BACKGROUND_TEMPLATE);
  if (!fallback)
    throw new Error(`Missing default background: ${DEFAULT_BACKGROUND_TEMPLATE}`);
  return fallback;
}

const HEURISTIC_RULES: [RegExp, string][] = [
  [/city|skyline|urban|metro/, "city-skyline"],
  [/canyon|desert|mesa/, "desert-mesas"],
  [/haunt|ghost|grave|hollow/, "haunted-night"],
  [/ember/, "ember-dusk"],
  [/volcano|lava|inferno|magma/, "volcanic-fields"],
  [/sky|snow|alpine|slide|cloud/, "alpine-peaks"],
  [/fair|carousel|circus/, "fairground-park"],
  [/foundry|factory|forge|industrial/, "foundry-district"],
  [/dungeon|cave|cavern|crypt/, "cavern-dark"],
  [/dino|jurassic|raptor|jungle/, "toybox-volcano"],
  [/farm|meadow|pastoral|loop|stunt/, "pastoral-hills"],
  [/scrap|junk|wreck/, "scrapyard-flats"],
];

/** Deterministic background pick for a level without an explicit template. */
export function backgroundForLevel(level: {
  name: string;
  mode: string;
  underground?: boolean;
}): string {
  if (level.underground) return "cavern-dark";
  const name = level.name.toLowerCase();
  for (const [pattern, template] of HEURISTIC_RULES)
    if (pattern.test(name)) return template;
  if (level.mode === "arena") return "scrapyard-flats";
  if (level.mode === "demolition") return "haunted-night";
  return DEFAULT_BACKGROUND_TEMPLATE;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RingSlot {
  x: number;
  z: number;
  angle: number;
  scale: number;
}

/** Fixed night rig; per-channel minima keep dark templates from brightening. */
export const NIGHT_RIG = {
  skyTop: 0x0d1c36,
  skyHorizon: 0x274a73,
  fog: 0x14263f,
  sun: { color: 0x8fb4e8, intensity: 0.35 },
  hemi: { sky: 0x24344d, ground: 0x05070c, intensity: 0.3 },
  env: 0.08,
} as const;
export interface ResolvedMood {
  sky: { top: number; horizon: number };
  fog: { color: number; near: number; far: number };
  sun: { color: number; intensity: number };
  hemi: { sky: number; ground: number; intensity: number };
  env: number;
};
function minHex(day: number, night: number) {
  const r = Math.min((day >> 16) & 0xff, (night >> 16) & 0xff);
  const g = Math.min((day >> 8) & 0xff, (night >> 8) & 0xff);
  const b = Math.min(day & 0xff, night & 0xff);
  return (r << 16) | (g << 8) | b;
}
/** Overcast multipliers for rain; applied before the night minima so storms stack. */
export const RAIN_RIG = {
  sky: 0.62,
  fog: 0.62,
  sun: 0.5,
  hemi: 0.75,
  env: 1.25,
} as const;
function scaleHex(hex: number, f: number) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}
/** Effective lighting rig: template channels by day, overcast in rain, darkened minima at night. */
export function resolveMood(template: BackgroundTemplate, weather: WeatherFlags): ResolvedMood {
  const base = weather.rain
    ? {
        sky: { top: scaleHex(template.sky.top, RAIN_RIG.sky), horizon: scaleHex(template.sky.horizon, RAIN_RIG.sky) },
        fog: { ...template.fog, color: scaleHex(template.fog.color, RAIN_RIG.fog) },
        sun: { ...template.sun, intensity: template.sun.intensity * RAIN_RIG.sun },
        hemi: { ...template.hemi, intensity: template.hemi.intensity * RAIN_RIG.hemi },
        env: template.env * RAIN_RIG.env,
      }
    : {
        sky: { ...template.sky },
        fog: { ...template.fog },
        sun: { ...template.sun },
        hemi: { ...template.hemi },
        env: template.env,
      };
  if (!weather.night) return base;
  return {
    sky: {
      top: minHex(base.sky.top, NIGHT_RIG.skyTop),
      horizon: minHex(base.sky.horizon, NIGHT_RIG.skyHorizon),
    },
    fog: {
      color: minHex(base.fog.color, NIGHT_RIG.fog),
      near: base.fog.near,
      far: base.fog.far,
    },
    sun: { color: NIGHT_RIG.sun.color, intensity: Math.min(base.sun.intensity, NIGHT_RIG.sun.intensity) },
    hemi: {
      sky: NIGHT_RIG.hemi.sky,
      ground: NIGHT_RIG.hemi.ground,
      intensity: Math.min(base.hemi.intensity, NIGHT_RIG.hemi.intensity),
    },
    env: Math.min(base.env, NIGHT_RIG.env),
  };
}
/** Deterministic ring slots for one shape ring; pure and headless-safe. */
export function layoutRing(count: number, radius: number, seed: number): RingSlot[] {
  if (!(count >= 1)) return [];
  const rand = mulberry32(seed);
  const step = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_, i) => {
    const angle = i * step + (rand() - 0.5) * step * 0.8;
    const r = radius * (0.92 + rand() * 0.16);
    return {
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      angle,
      scale: 0.85 + rand() * 0.3,
    };
  });
}
