import type { Input } from "./simulation";
import { proController } from "./switch-pro";

/** Standard-mapping button indices used by the controller scheme. */
export const PAD_BUTTON = {
  action: 0,
  leftTrigger: 6,
  rightTrigger: 7,
  start: 9,
  dpadUp: 12,
  dpadDown: 13,
} as const;

/** Stick deflection below this reads as centered. */
export const PAD_DEADZONE = 0.15;

/** Minimal gamepad shape: real Gamepads satisfy it, tests fabricate it. */
export interface PadState {
  readonly axes: readonly number[];
  readonly buttons: readonly { pressed: boolean; value: number }[];
}

export function toPadState(pad: Gamepad | null | undefined): PadState | null {
  if (!pad || pad.connected === false) return null;
  return { axes: [...pad.axes], buttons: pad.buttons.map((b) => ({ pressed: b.pressed, value: b.value })) };
}

/** First connected gamepad, or null (also null outside browsers). */
export function pollPad(): PadState | null {
  const direct = proController.pad(); if (direct) return direct;
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  for (const pad of browserPads()) {
    const state = toPadState(pad);
    if (state) return state;
  }
  return null;
}

/** Product id of the first connected gamepad, for the settings status line. */
export function connectedPadId(): string | null {
  const direct = proController.id(); if (direct) return direct;
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  for (const pad of browserPads()) {
    if (pad && pad.connected !== false) return pad.id;
  }
  return null;
}

/** Deadzone with rescale so the rim still reaches full deflection. */
export function deadzone(value: number): number {
  const v = Number.isFinite(value) ? value : 0;
  const mag = Math.abs(v);
  if (mag < PAD_DEADZONE) return 0;
  return (Math.sign(v) * (mag - PAD_DEADZONE)) / (1 - PAD_DEADZONE);
}
function browserPads(): (Gamepad | null)[] {
  try { return [...navigator.getGamepads()]; } catch { return []; }
}

function axis(pad: PadState | null, index: number): number {
  return deadzone(pad?.axes[index] ?? 0);
}

function trigger(pad: PadState | null, index: number): number {
  const b = pad?.buttons[index];
  if (!b) return 0;
  return Math.max(0, Math.min(1, b.value));
}

/**
 * Controller driving: left stick steers (left is positive like the A key),
 * ZR accelerates analog, ZL brakes analog, A is a digital alternative
 * accelerator. No pad reads as all zeros.
 */
export function padDriving(pad: PadState | null): Input {
  const throttle = Math.max(trigger(pad, PAD_BUTTON.rightTrigger), pad?.buttons[PAD_BUTTON.action]?.pressed ? 1 : 0);
  return {
    throttle,
    brake: trigger(pad, PAD_BUTTON.leftTrigger),
    handbrake: 0,
    steer: -axis(pad, 0) || 0,
  };
}

/** Right-stick look as mouse-drag pixels per second at full deflection. */
export const PAD_LOOK_PX_PER_SEC = 500;

export function padLook(pad: PadState | null): { dx: number; dy: number } {
  return { dx: axis(pad, 2), dy: axis(pad, 3) };
}

function pressed(pad: PadState | null, index: number): boolean {
  return pad?.buttons[index]?.pressed === true;
}

export const padStartPressed = (pad: PadState | null) => pressed(pad, PAD_BUTTON.start);
export const padActionPressed = (pad: PadState | null) => pressed(pad, PAD_BUTTON.action);
export const padMenuDelta = (pad: PadState | null): -1 | 0 | 1 =>
  pressed(pad, PAD_BUTTON.dpadUp) ? -1 : pressed(pad, PAD_BUTTON.dpadDown) ? 1 : 0;
