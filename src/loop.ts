import { ROUTES, type Solid } from "./routes";
export const LOOP = {
  boostStart: 150,
  boostEnd: 195,
  dragonZ: [213, 232],
  z: 290,
  radius: 45,
  segments: 240,
};
export function dragonFiring(time: number) {
  return time % 8 < 3;
}
// Mouth front: statue offset 10 minus local mouth center 3.55 and its 0.5 radius.
export const DRAGON_FLAME_LENGTH = 5.95;
/** Normalized distance from the mouth: ignition advances the head; shutoff advances the tail. */
export function dragonFlame(time: number) {
  const phase = ((time % 8) + 8) % 8;
  const sample = (seconds: number, values: number[]) => {
    const tick = Math.min(values.length - 1, Math.max(0, seconds / 0.05));
    const i = Math.min(values.length - 2, Math.floor(tick));
    return values[i] + (values[i + 1] - values[i]) * (tick - i);
  };
  if (phase < 0.2)
    return {
      head: sample(phase, [0, 0.0625, 0.25, 0.5, 1]),
      tail: 0,
      opacity: phase / 0.2,
    };
  if (phase < 3) return { head: 1, tail: 0, opacity: 1 };
  if (phase < 3.25)
    return {
      head: 1,
      tail: sample(phase - 3, [0, 0.25, 0.5, 0.75, 0.875, 1]),
      opacity: sample(phase - 3, [1, 1, 0.75, 0.5, 0.25, 0]),
    };
  return { head: 0, tail: 0, opacity: 0 };
}
/** Damage occupies the same moving interval as each visible mouth-to-center jet. */
export function dragonExposure(
  time: number,
  lateral: number,
  halfWidth = 1.25,
) {
  const flame = dragonFlame(time);
  if (flame.opacity <= 0 || flame.head <= flame.tail) return 0;
  const near = DRAGON_FLAME_LENGTH * (1 - flame.head);
  const far = DRAGON_FLAME_LENGTH * (1 - flame.tail);
  return [-1, 1].some((side) => {
    const center = lateral * side;
    return center + halfWidth > near && center - halfWidth < far;
  })
    ? flame.opacity
    : 0;
}
/** One second warning and one second cooldown; cubic easing avoids abrupt tint changes. */
export function dragonHeat(time: number) {
  const phase = ((time % 8) + 8) % 8;
  const t = phase < 3 ? 1 : phase < 4 ? 4 - phase : phase >= 7 ? phase - 7 : 0;
  return t * t * (3 - 2 * t);
}
export function loopX(x: number, theta: number) {
  return x + (12 * (theta - Math.sin(theta))) / (2 * Math.PI);
}
export function loopSolids(): Solid[] {
  return ROUTES.flatMap((r) => [
    { x: r.x, y: -0.6, z: 290, w: 14, h: 1.2, d: 310, kind: "road" as const },
    {
      x: r.x + 12,
      y: -0.6,
      z: 355,
      w: 12,
      h: 1.2,
      d: 140,
      kind: "road" as const,
    },
    ...Array.from({ length: LOOP.segments }, (_, i) => {
      const theta = ((i + 0.5) / LOOP.segments) * Math.PI * 2;
      return {
        x: loopX(r.x, theta),
        y: LOOP.radius * (1 - Math.cos(theta)) - 0.2 * Math.cos(theta),
        z: LOOP.z + (LOOP.radius + 0.2) * Math.sin(theta),
        w: 12,
        h: 0.4,
        d: 2 * LOOP.radius * Math.tan(Math.PI / LOOP.segments) + 0.035,
        angle: -theta,
        kind: "loop" as const,
      };
    }),
  ]);
}
/** Conservative solid cores for the statues and loop support columns. */
export function loopScenerySolids(): Solid[] {
  return ROUTES.flatMap((r) => [
    ...LOOP.dragonZ.flatMap((z) =>
      [-1, 1].flatMap((side) => [
        {
          x: r.x + side * 10,
          y: 0.4,
          z,
          w: 5,
          h: 0.8,
          d: 4,
          kind: "scenery" as const,
        },
        {
          x: r.x + side * 10.5,
          y: 2.2,
          z,
          w: 3,
          h: 3.2,
          d: 2.4,
          kind: "scenery" as const,
        },
        {
          x: r.x + side * 7.4,
          y: 3.35,
          z,
          w: 2.3,
          h: 1.4,
          d: 1.7,
          kind: "scenery" as const,
        },
      ]),
    ),
    ...[LOOP.z - 34, LOOP.z + 34].flatMap((z) =>
      [-1, 1].map((side) => ({
        x: r.x + side * 7,
        y: 12.5,
        z,
        w: 0.6,
        h: 25,
        d: 0.6,
        kind: "scenery" as const,
      })),
    ),
  ]);
}

/** Vertical loop ring segments around (cx, cz); the car enters along +z. */
export function loopRingSolids(cx: number, baseY: number, cz: number, radius = LOOP.radius, segments = 96) {
  return Array.from({ length: segments }, (_, i) => {
    const theta = ((i + 0.5) / segments) * Math.PI * 2;
    return {
      // Cycloid x-drift like the official ring: the exit lane sits +12 out.
      x: loopX(cx, theta),
      y: baseY + radius * (1 - Math.cos(theta)) - 0.2 * Math.cos(theta),
      z: cz + (radius + 0.2) * Math.sin(theta),
      w: 12,
      h: 0.4,
      d: 2 * radius * Math.tan(Math.PI / segments) + 0.035,
      angle: -theta,
    };
  });
}
/** Four support columns flanking the ring. */
export function loopSupportSolids(cx: number, baseY: number, cz: number) {
  return [cz - 34, cz + 34].flatMap((z) =>
    [-1, 1].map((side) => ({
      x: cx + side * 7,
      y: baseY + 12.5,
      z,
      w: 0.6,
      h: 25,
      d: 0.6,
    })),
  );
}
/** Flame exposure along one aimed jet, for custom dragon statues. */
export function dragonExposureAt(
  time: number,
  car: { x: number; y: number; z: number },
  mouth: { x: number; y: number; z: number },
  dir: { x: number; z: number },
) {
  const flame = dragonFlame(time);
  if (flame.opacity <= 0 || flame.head <= flame.tail) return 0;
  if (Math.abs(car.y - mouth.y) > 3) return 0;
  const along = (car.x - mouth.x) * dir.x + (car.z - mouth.z) * dir.z;
  const near = DRAGON_FLAME_LENGTH * (1 - flame.head);
  const far = DRAGON_FLAME_LENGTH * (1 - flame.tail);
  if (along < near || along > far) return 0;
  const lateral = Math.abs((car.x - mouth.x) * dir.z - (car.z - mouth.z) * dir.x);
  return lateral <= 2.5 ? flame.opacity : 0;
}
/** Mouth offset and jet direction for a custom dragon with the given yaw. */
export function dragonAim(yaw: number) {
  return {
    mx: -3.55 * Math.cos(yaw),
    mz: 3.55 * Math.sin(yaw),
    dx: -Math.cos(yaw),
    dz: Math.sin(yaw),
  };
}
