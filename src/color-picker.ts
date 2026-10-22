import type { Tuning } from "./tuning";
export type TruckColorKey = "primaryColor" | "secondaryColor";
type HSV = { h: number; s: number; v: number };
export const colorHex = (value: number) =>
  `#${value.toString(16).padStart(6, "0")}`;
export function hsvColor({ h, s, v }: HSV) {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * v * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return (channel(5) << 16) | (channel(3) << 8) | channel(1);
}
export function colorHSV(color: number): HSV {
  const r = ((color >> 16) & 255) / 255,
    g = ((color >> 8) & 255) / 255,
    b = (color & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h =
    d === 0
      ? 0
      : max === r
        ? ((g - b) / d) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: max ? d / max : 0, v: max };
}

/** Hue/saturation wheel plus brightness and exact hex entry; pointer and keyboard input. */
export function createTruckColorPickers(
  host: HTMLElement,
  onChange: (value: Partial<Tuning>) => void,
) {
  const panels = new Map<TruckColorKey, { sync(value: number): void }>();
  for (const [key, title] of [
    ["primaryColor", "Primary color"],
    ["secondaryColor", "Secondary color"],
  ] as const) {
    const panel = document.createElement("fieldset");
    panel.className = "truck-color-picker";
    panel.innerHTML = `<legend>${title}</legend><canvas width="144" height="144" tabindex="0" role="slider" aria-label="${title} wheel" aria-valuemin="0" aria-valuemax="359" title="Drag to choose hue and saturation. Left/right change hue; up/down change saturation."></canvas><label for="brightness-${key}">Brightness</label><input id="brightness-${key}" type="range" min="0" max="100" step="1" aria-label="${title} brightness"><label for="color-${key}" class="sr-only">${title} hex</label><input id="color-${key}" type="text" maxlength="7" pattern="#[0-9a-fA-F]{6}" spellcheck="false" aria-label="${title} hex">`;
    host.append(panel);
    const wheel = panel.querySelector("canvas")!,
      ctx = wheel.getContext("2d")!;
    const brightness = panel.querySelector<HTMLInputElement>(
      'input[type="range"]',
    )!;
    const hex = panel.querySelector<HTMLInputElement>('input[type="text"]')!;
    let hsv: HSV = { h: 0, s: 0, v: 1 },
      selected = -1;
    const draw = () => {
      const image = ctx.createImageData(144, 144);
      for (let y = 0; y < 144; y++)
        for (let x = 0; x < 144; x++) {
          const dx = x - 72,
            dy = y - 72,
            saturation = Math.hypot(dx, dy) / 68;
          if (saturation > 1) continue;
          const color = hsvColor({
            h: ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360,
            s: saturation,
            v: hsv.v,
          });
          const i = (y * 144 + x) * 4;
          image.data[i] = color >> 16;
          image.data[i + 1] = (color >> 8) & 255;
          image.data[i + 2] = color & 255;
          image.data[i + 3] = Math.min(255, (1 - saturation) * 68 * 255);
        }
      ctx.putImageData(image, 0, 0);
      const a = (hsv.h * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(
        72 + Math.cos(a) * hsv.s * 68,
        72 + Math.sin(a) * hsv.s * 68,
        4,
        0,
        Math.PI * 2,
      );
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#17212a";
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "white";
      ctx.stroke();
      wheel.setAttribute("aria-valuenow", String(Math.round(hsv.h) % 360));
      wheel.setAttribute(
        "aria-valuetext",
        `${colorHex(selected)}, saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`,
      );
      hex.value = colorHex(selected);
      hex.style.borderColor = hex.value;
      brightness.value = String(Math.round(hsv.v * 100));
    };
    const commit = () => {
      selected = hsvColor(hsv);
      draw();
      onChange({ [key]: selected });
    };
    const pick = (event: PointerEvent) => {
      const rect = wheel.getBoundingClientRect();
      const dx = ((event.clientX - rect.left) * 144) / rect.width - 72,
        dy = ((event.clientY - rect.top) * 144) / rect.height - 72;
      hsv.h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      hsv.s = Math.min(1, Math.hypot(dx, dy) / 68);
      commit();
    };
    wheel.onpointerdown = (event) => {
      event.preventDefault();
      wheel.focus();
      wheel.setPointerCapture(event.pointerId);
      pick(event);
    };
    wheel.onpointermove = (event) => {
      if (wheel.hasPointerCapture(event.pointerId)) pick(event);
    };
    wheel.onpointerup = (event) => {
      if (wheel.hasPointerCapture(event.pointerId))
        wheel.releasePointerCapture(event.pointerId);
    };
    wheel.onkeydown = (event) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "ArrowLeft" || event.key === "ArrowRight")
        hsv.h = (hsv.h + (event.key === "ArrowRight" ? 3 : 357)) % 360;
      else
        hsv.s = Math.max(
          0,
          Math.min(1, hsv.s + (event.key === "ArrowUp" ? 0.03 : -0.03)),
        );
      commit();
    };
    brightness.oninput = () => {
      hsv.v = Number(brightness.value) / 100;
      commit();
    };
    hex.oninput = () => {
      if (!/^#[0-9a-f]{6}$/i.test(hex.value)) return;
      selected = parseInt(hex.value.slice(1), 16);
      hsv = colorHSV(selected);
      draw();
      onChange({ [key]: selected });
    };
    hex.onblur = () => {
      hex.value = colorHex(selected);
    };
    panels.set(key, {
      sync(value) {
        if (value !== selected) {
          selected = value;
          hsv = colorHSV(value);
          draw();
        }
      },
    });
  }
  return (values: Pick<Tuning, TruckColorKey>) => {
    for (const [key, panel] of panels) panel.sync(values[key]);
  };
}
