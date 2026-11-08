// Piano keys flash a rainbow color the instant the car touches them, then
// fade back to white. Key voices run C to B across one octave.
/** Rainbow voice per white key, C to B. */
export const PIANO_COLORS = [
  0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x9400d3,
] as const;
export const PIANO_KEY_COUNT = PIANO_COLORS.length;
/** Seconds for a struck key to fade back to white. */
export const PIANO_FADE_SECONDS = 4;
/** Hex color of a key struck at pressedAt, seen at now. */
export function pianoKeyColorAt(
  key: number,
  pressedAt: number,
  now: number,
): number {
  const base = PIANO_COLORS[((key % PIANO_KEY_COUNT) + PIANO_KEY_COUNT) % PIANO_KEY_COUNT];
  const t = Math.min(
    1,
    Math.max(0, (now - pressedAt) / PIANO_FADE_SECONDS),
  );
  if (t <= 0) return base;
  if (t >= 1) return 0xffffff;
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return (
    (mix((base >> 16) & 255) << 16) | (mix((base >> 8) & 255) << 8) | mix(base & 255)
  );
}
