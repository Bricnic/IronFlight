/** Objective-progress counter font scaling.
 *
 * The run-progress readout at the bottom of the screen (#run-progress) was
 * originally 13px. The debug-menu slider expresses the size as a multiple
 * of that original: 1..10 in 0.1 steps, default 1.3 → 16.9px.
 */
export const PROGRESS_FONT_BASE_PX = 13;
export const PROGRESS_FONT_MIN = 1;
export const PROGRESS_FONT_MAX = 10;
export const PROGRESS_FONT_STEP = 0.1;
export const PROGRESS_FONT_DEFAULT = 1.3;

const STORAGE_KEY = "iron-flight-progress-font-v2";

export interface ProgressFontStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function storageOrNull(): ProgressFontStorage | null {
  try {
    return globalThis.localStorage as ProgressFontStorage;
  } catch {
    return null;
  }
}

/** Clamp an unknown value into the 1..10 slider range, defaulting to 1.3. */
export function clampProgressFontValue(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (typeof n !== "number" || !Number.isFinite(n))
    return PROGRESS_FONT_DEFAULT;
  return Math.min(PROGRESS_FONT_MAX, Math.max(PROGRESS_FONT_MIN, n));
}

/** Pixel size for a slider value. Rounded to 0.1px to avoid float noise. */
export function progressFontPx(value: number): number {
  return Math.round(clampProgressFontValue(value) * PROGRESS_FONT_BASE_PX * 10) / 10;
}

export function loadProgressFont(
  storage: ProgressFontStorage | null = storageOrNull(),
): number {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw != null) return clampProgressFontValue(Number(JSON.parse(raw)));
  } catch {
    // Corrupt JSON falls through to the default.
  }
  return PROGRESS_FONT_DEFAULT;
}

export function saveProgressFont(
  value: number,
  storage: ProgressFontStorage | null = storageOrNull(),
): number {
  const clamped = clampProgressFontValue(value);
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(clamped));
  } catch {
    // Private-mode writes fail silently; the live value still applies.
  }
  return clamped;
}

export function applyProgressFont(el: HTMLElement, value: number): void {
  el.style.fontSize = `${progressFontPx(value)}px`;
}
