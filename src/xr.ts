import type { WebGLRenderer } from "three";
import type { Input } from "./simulation";
import { PAD_DEADZONE, type PadState } from "./gamepad";

/**
 * WebXR session + controller glue for Quest-class headsets.
 * All DOM/XR access is guarded so importing this module is safe in
 * headless/unit-test environments where navigator.xr is undefined.
 */

/** xr-standard button indices (Quest Touch layout). */
export const XR_BUTTON = {
  trigger: 0,
  squeeze: 1,
  thumbstick: 3,
  primary: 4,
  secondary: 5,
} as const;

/** xr-standard thumbstick axes. */
export const XR_AXIS = { stickX: 2, stickY: 3 } as const;

interface NavigatorXR {
  xr?: {
    isSessionSupported(mode: string): Promise<boolean>;
    requestSession(mode: string, init?: Record<string, unknown>): Promise<unknown>;
  };
}

function xrNamespace(): NavigatorXR["xr"] | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & NavigatorXR).xr;
}

/** True when the browser can open an immersive-vr session. */
export async function isXRSupported(): Promise<boolean> {
  try {
    const xr = xrNamespace();
    if (!xr) return false;
    return await xr.isSessionSupported("immersive-vr");
  } catch {
    return false;
  }
}

/**
 * Open an immersive-vr session on the renderer. Must be called from a user
 * gesture. Resolves once three.js owns the session; rejects when WebXR is
 * missing, denied, or already presenting.
 */
export async function startVRSession(renderer: WebGLRenderer): Promise<void> {
  const xr = xrNamespace();
  if (!xr) throw new Error("WebXR is not available in this browser");
  const session = await xr.requestSession("immersive-vr", {
    optionalFeatures: ["local-floor"],
  });
  await renderer.xr.setSession(session as XRSession);
}

/** Current XR input sources split by handedness, as PadStates. */
export function xrControllers(renderer: WebGLRenderer): {
  left: PadState | null;
  right: PadState | null;
} {
  const out = { left: null as PadState | null, right: null as PadState | null };
  const session = renderer.xr.getSession() as unknown as {
    inputSources?: readonly {
      handedness?: string;
      gamepad?: {
        axes: readonly number[];
        buttons: readonly { pressed: boolean; value: number }[];
      } | null;
    }[];
  } | null;
  if (!session?.inputSources) return out;
  for (const source of session.inputSources) {
    const pad = source.gamepad;
    if (!pad) continue;
    const state: PadState = {
      axes: [...pad.axes],
      buttons: pad.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
    };
    if (source.handedness === "left") out.left = state;
    else if (source.handedness === "right") out.right = state;
    else if (!out.right) out.right = state;
  }
  return out;
}

function axis(pad: PadState | null, index: number): number {
  const v = pad?.axes[index] ?? 0;
  return Math.abs(v) < PAD_DEADZONE ? 0 : v;
}

function buttonValue(pad: PadState | null, index: number): number {
  return pad?.buttons[index]?.value ?? 0;
}

function buttonPressed(pad: PadState | null, index: number): boolean {
  return pad?.buttons[index]?.pressed === true;
}

/**
 * Driving input from Touch controllers. Left stick steers (right stick is a
 * fallback), right trigger throttles, left trigger brakes, either grip
 * trigger reverses, A (either primary face button) is the handbrake (flap
 * while flying), and the right stick orients flight. B (either secondary
 * face button) is Start: it requests pause, edge-detected by the caller.
 */
export function xrDrivingInput(
  left: PadState | null,
  right: PadState | null,
  wings = false,
): Input & { pausePressed: boolean } {
  // Sign parity with the gamepad path (src/gamepad.ts): stick deflection is
  // negated so that pushing left steers/orients left, like the A key.
  const steerX = axis(left, XR_AXIS.stickX) || axis(right, XR_AXIS.stickX);
  const steer = Math.max(-1, Math.min(1, -steerX)) || 0;
  const reverse = Math.max(
    buttonValue(left, XR_BUTTON.squeeze),
    buttonValue(right, XR_BUTTON.squeeze),
  );
  const handbrake =
    buttonPressed(left, XR_BUTTON.primary) ||
    buttonPressed(right, XR_BUTTON.primary)
      ? 1
      : 0;
  const airYaw =
    Math.max(-1, Math.min(1, -axis(right, XR_AXIS.stickX))) || 0;
  const airPitch =
    Math.max(-1, Math.min(1, -axis(right, XR_AXIS.stickY))) || 0;
  const cut = handbrake && !wings;
  return {
    throttle: cut
      ? 0
      : Math.max(
          -1,
          Math.min(1, buttonValue(right, XR_BUTTON.trigger) - reverse),
        ) || 0,
    brake: cut
      ? 0
      : Math.max(0, Math.min(1, buttonValue(left, XR_BUTTON.trigger))),
    handbrake,
    steer,
    airYaw,
    airPitch,
    pausePressed:
      buttonPressed(left, XR_BUTTON.secondary) ||
      buttonPressed(right, XR_BUTTON.secondary),
  };
}

const blankButtons = () =>
  Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));

/**
 * Translate Touch state into a standard-mapping pad for menu navigation:
 * left stick (right fallback) moves, A/X confirms, B/Y goes back, either
 * thumbstick click resets. All zeros without controllers.
 */
export function xrMenuPad(
  left: PadState | null,
  right: PadState | null,
): PadState {
  const buttons = blankButtons();
  const press = (index: number, down: boolean) => {
    buttons[index] = { pressed: down, value: down ? 1 : 0 };
  };
  press(
    0,
    buttonPressed(left, XR_BUTTON.primary) ||
      buttonPressed(right, XR_BUTTON.primary),
  );
  press(
    1,
    buttonPressed(left, XR_BUTTON.secondary) ||
      buttonPressed(right, XR_BUTTON.secondary),
  );
  press(
    3,
    buttonPressed(left, XR_BUTTON.thumbstick) ||
      buttonPressed(right, XR_BUTTON.thumbstick),
  );
  return {
    axes: [
      axis(left, XR_AXIS.stickX) || axis(right, XR_AXIS.stickX),
      axis(left, XR_AXIS.stickY) || axis(right, XR_AXIS.stickY),
      0,
      0,
    ],
    buttons,
  };
}

/**
 * Merge two pads: axes blend like combined driving input (opposing
 * deflections partially cancel), any button press counts.
 */
export function mergePadStates(a: PadState | null, b: PadState | null): PadState | null {
  if (!a) return b;
  if (!b) return a;
  const len = Math.max(a.axes.length, b.axes.length);
  const axes: number[] = [];
  for (let i = 0; i < len; i++) {
    const x = a.axes[i] ?? 0;
    const y = b.axes[i] ?? 0;
    axes.push(Math.max(0, x, y) + Math.min(0, x, y));
  }
  const blen = Math.max(a.buttons.length, b.buttons.length);
  const buttons = [];
  for (let i = 0; i < blen; i++) {
    const x = a.buttons[i] ?? { pressed: false, value: 0 };
    const y = b.buttons[i] ?? { pressed: false, value: 0 };
    buttons.push({
      pressed: x.pressed || y.pressed,
      value: Math.max(x.value, y.value),
    });
  }
  return { axes, buttons };
}
