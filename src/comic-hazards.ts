import type { Track } from "./tracks";
export type ComicKind =
  | "book"
  | "teeth"
  | "computer"
  | "flippers"
  | "hydrant"
  | "burner"
  | "water"
  | "potion";
export type ComicHazard = {
  id: string;
  kind: ComicKind;
  x: number;
  z: number;
  phase: number;
};
/** Alternating road-edge threats leave a readable ordinary-driving bypass. */
export function comicHazards(track: Track): ComicHazard[] {
  const layouts: Partial<Record<Track["id"], [ComicKind, number, number][]>> = {
    "harbor-sprint": [
      ["book", 12, -65],
      ["hydrant", -9, 15],
      ["water", 38, 110],
      ["flippers", -3, 218],
      ["potion", 40, 260],
    ],
    "foundry-run": [
      ["burner", -13, 25],
      ["teeth", 28, 78],
      ["computer", -2, 155],
      ["hydrant", -27, 225],
      ["potion", 14, 265],
    ],
    "skyline-circuit": [
      ["computer", 47, -56],
      ["flippers", 91, 27],
      ["hydrant", -8, 91],
      ["book", -90, 8],
      ["burner", -80, -48],
    ],
    "scrapyard-sweep": [
      ["teeth", 40, -49],
      ["book", 60, 36],
      ["flippers", -51, 48],
      ["hydrant", -60, -32],
      ["potion", -3, 30],
    ],
    "inferno-vault": [
      ["computer", 60, -47],
      ["burner", 72, 55],
      ["book", -59, 65],
      ["water", -78, -65],
      ["potion", 18, 83],
    ],
  };
  return (layouts[track.id] ?? []).map(([kind, x, z], i) => ({
    id: `${track.id}-${kind}-${i}`,
    kind,
    x,
    z,
    phase: 0,
  }));
}
/** Open dwell, eased snap, closed dwell, eased reopening. Six-second warning cycle. */
export function jawAngle(time: number) {
  const t = ((time % 6) + 6) % 6;
  const smooth = (v: number) => {
    v = Math.max(0, Math.min(1, v));
    return v * v * (3 - 2 * v);
  };
  if (t < 2) return 1.12;
  if (t < 2.8) return 1.12 * (1 - smooth((t - 2) / 0.8));
  if (t < 3.6) return 0;
  if (t < 4.6) return 1.12 * smooth(t - 3.6);
  return 1.12;
}
export const waterMode = (mph: number, skimming: boolean) =>
  (skimming ? mph >= 180 : mph > 200) ? "skimming" : "sinking";
export const POTIONS = ["nitro", "fog", "tall", "wide"] as const;
export type Potion = (typeof POTIONS)[number];
export const potionScale = (effect?: Potion) =>
  effect === "tall"
    ? [0.55, 1.85, 0.8]
    : effect === "wide"
      ? [1.8, 0.5, 1.25]
      : [1, 1, 1];

export function mechanismAngle(h: ComicHazard, time: number, triggered = -100) {
  if (h.kind !== "flippers") return jawAngle(time + h.phase);
  const elapsed = time - triggered;
  const ease = (t: number) => {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  };
  if (elapsed < 0) return 1.12;
  if (elapsed < 0.25) return 1.12 * (1 - ease(elapsed / 0.25));
  if (elapsed < 2) return 0;
  return 1.12 * ease(elapsed - 2);
}

/** These dimensions are consumed by both the collider builder and the artist. */
export const BURNER_RAMP = {
  w: 12,
  h: 0.4,
  d: 10,
  x: 0,
  y: 0.9,
  z: -18,
  angle: -0.35,
} as const;
const burnerSupportHeight = BURNER_RAMP.y + Math.tan(-BURNER_RAMP.angle) * 3.5;
export const BURNER_SUPPORTS = [-1, 1].map((side) => ({
  x: side * 5.5,
  y: burnerSupportHeight / 2,
  z: BURNER_RAMP.z + 3.5,
  w: 0.6,
  h: burnerSupportHeight,
  d: 1,
}));
export const BURNER_DRUM = {
  radius: 1.1,
  height: 1.7,
  y: 0.85,
  x: [-4, 0, 4],
} as const;
