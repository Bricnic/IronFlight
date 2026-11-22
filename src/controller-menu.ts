import type { PadState } from "./gamepad";

export type MenuDirection = "up" | "down" | "left" | "right";
function direction(pad: PadState | null): MenuDirection | null {
  for (const [index, name] of [[12, "up"], [13, "down"], [14, "left"], [15, "right"]] as const)
    if (pad?.buttons[index]?.pressed) return name;
  const x = pad?.axes[0] ?? 0, y = pad?.axes[1] ?? 0;
  if (Math.max(Math.abs(x), Math.abs(y)) < 0.55) return null;
  return Math.abs(x) > Math.abs(y) ? x < 0 ? "left" : "right" : y < 0 ? "up" : "down";
}

/** Samples every frame, including gameplay, so held A never clicks a new menu. */
export class ControllerMenuInput {
  private previous: MenuDirection | null = null;
  private repeatAt = 0;
  private confirmWas = false;
  private backWas = false;
  private context: unknown = null;
  sample(pad: PadState | null, context: unknown, now: number) {
    const held = direction(pad), confirm = !!pad?.buttons[0]?.pressed, back = !!pad?.buttons[1]?.pressed;
    const result = { direction: null as MenuDirection | null, confirm: !!context && confirm && !this.confirmWas, back: !!context && back && !this.backWas };
    if (context && held && (held !== this.previous || context !== this.context || now >= this.repeatAt)) {
      result.direction = held;
      this.repeatAt = now + (held !== this.previous || context !== this.context ? 350 : 120);
    }
    this.previous = held; this.context = context; this.confirmWas = confirm; this.backWas = back;
    return result;
  }
}

export function nextMenuIndex(points: { x: number; y: number }[], current: number, direction: MenuDirection): number {
  if (current < 0 || !points[current]) return 0;
  const horizontal = direction === "left" || direction === "right", sign = direction === "up" || direction === "left" ? -1 : 1;
  const origin = points[current]; let best = current, score = Infinity;
  points.forEach((point, index) => {
    const dx = point.x - origin.x, dy = point.y - origin.y;
    const forward = (horizontal ? dx : dy) * sign, sideways = Math.abs(horizontal ? dy : dx);
    if (forward > 1 && forward + sideways * 3 < score) { best = index; score = forward + sideways * 3; }
  });
  // A horizontal button row can also be traversed with up/down.
  if (best === current && !horizontal && points.every(p => Math.abs(p.y - origin.y) < 2))
    return Math.max(0, Math.min(points.length - 1, current + sign));
  return best;
}

export function activeControllerMenu(): HTMLElement | null {
  for (const id of ["pause-menu", "track-result", "vehicle-select", "settings-screen", "level-select"]) {
    const root = document.getElementById(id);
    if (root && !root.hidden && !root.inert && root.getClientRects().length) return root;
  }
  return null;
}
function buttons(root: HTMLElement) {
  const options = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
  if (root.id === "level-select" || root.id === "vehicle-select" || root.id === "settings-screen")
    options.push(...Array.from(document.querySelectorAll<HTMLButtonElement>("#level-select-button, #vehicle-select-button, #settings-button")));
  return options.filter(button => !button.disabled && !button.closest("[hidden], [inert]") && button.getClientRects().length > 0);
}
export function moveMenuFocus(root: HTMLElement, direction: MenuDirection) {
  const options = buttons(root); if (!options.length) return;
  const points = options.map(button => { const r = button.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const index = nextMenuIndex(points, options.indexOf(document.activeElement as HTMLButtonElement), direction);
  document.querySelector(".controller-focused")?.classList.remove("controller-focused");
  options[index].classList.add("controller-focused");
  options[index].focus({ preventScroll: true }); options[index].scrollIntoView({ block: "nearest", inline: "nearest" });
}
export function activateMenuFocus(root: HTMLElement) {
  const options = buttons(root);
  const focused = options.find(button => button === document.activeElement);
  (focused ?? options[0])?.click();
}
