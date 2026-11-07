import { expect, it } from "vitest";
import {
  PROGRESS_FONT_BASE_PX,
  PROGRESS_FONT_DEFAULT,
  PROGRESS_FONT_MAX,
  PROGRESS_FONT_MIN,
  PROGRESS_FONT_STEP,
  applyProgressFont,
  clampProgressFontValue,
  loadProgressFont,
  progressFontPx,
  saveProgressFont,
} from "../src/progress-font";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

it("exposes the 1..10 debug slider scale with default 1.3", () => {
  expect(PROGRESS_FONT_BASE_PX).toBe(13);
  expect(PROGRESS_FONT_MIN).toBe(1);
  expect(PROGRESS_FONT_MAX).toBe(10);
  expect(PROGRESS_FONT_STEP).toBe(0.1);
  expect(PROGRESS_FONT_DEFAULT).toBe(1.3);
});

it("maps 1.3 to 16.9px, 1.3x the original size", () => {
  expect(progressFontPx(1.3)).toBe(16.9);
  expect(progressFontPx(1.3)).toBeCloseTo(PROGRESS_FONT_BASE_PX * 1.3, 9);
});

it("maps 1 to the original size and 10 to the 10x ceiling", () => {
  expect(progressFontPx(1)).toBe(13);
  expect(progressFontPx(10)).toBe(130);
});

it("scales linearly in 0.1 steps", () => {
  expect(progressFontPx(1.4)).toBeCloseTo(18.2, 9);
  expect(progressFontPx(2)).toBe(26);
  expect(progressFontPx(5)).toBe(65);
  for (let v = 1; v < 10; v = Math.round((v + 0.1) * 10) / 10)
    expect(progressFontPx(Math.round((v + 0.1) * 10) / 10)).toBeGreaterThan(
      progressFontPx(v),
    );
});

it("clamps out-of-range and invalid values", () => {
  expect(clampProgressFontValue(0)).toBe(1);
  expect(clampProgressFontValue(99)).toBe(10);
  expect(clampProgressFontValue(Number.NaN)).toBe(1.3);
  expect(clampProgressFontValue("bogus")).toBe(1.3);
  expect(progressFontPx(0)).toBe(13);
  expect(progressFontPx(99)).toBe(130);
});

it("persists the slider value and repairs bad storage", () => {
  const storage = memoryStorage();
  expect(loadProgressFont(storage)).toBe(1.3);
  expect(saveProgressFont(2.5, storage)).toBeCloseTo(2.5, 9);
  expect(loadProgressFont(storage)).toBeCloseTo(2.5, 9);
  expect(saveProgressFont(99, storage)).toBe(10);
  expect(loadProgressFont(storage)).toBe(10);
  storage.setItem("iron-flight-progress-font-v2", "{broken");
  expect(loadProgressFont(storage)).toBe(1.3);
});

it("applies the pixel size to the counter element", () => {
  const el = { style: {} } as unknown as HTMLElement;
  applyProgressFont(el, 1.3);
  expect(el.style.fontSize).toBe("16.9px");
  applyProgressFont(el, 1);
  expect(el.style.fontSize).toBe("13px");
  applyProgressFont(el, 10);
  expect(el.style.fontSize).toBe("130px");
});
