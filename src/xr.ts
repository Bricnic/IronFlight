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
 * fallback), right trigger throttles, left trigger brakes, left squeeze is
 * the handbrake (flap while flying), and the right stick orients flight.
 * Thumbstick click on either controller requests pause (edge-detected by
 * the caller, like the gamepad Start button).
 */
export function xrDrivingInput(
  left: PadState | null,
  right: PadState | null,
): Input & { pausePressed: boolean } {
  const steerX = axis(left, XR_AXIS.stickX) || axis(right, XR_AXIS.stickX);
  const steer = Math.max(-1, Math.min(1, steerX));
  const handbrake = buttonPressed(left, XR_BUTTON.squeeze) ? 1 : 0;
  const airYaw = Math.max(-1, Math.min(1, axis(right, XR_AXIS.stickX)));
  const airPitch = Math.max(-1, Math.min(1, -axis(right, XR_AXIS.stickY)));
  return {
    throttle: handbrake ? 0 : Math.max(0, Math.min(1, buttonValue(right, XR_BUTTON.trigger))),
    brake: handbrake ? 0 : Math.max(0, Math.min(1, buttonValue(left, XR_BUTTON.trigger))),
    handbrake,
    steer,
    airYaw,
    airPitch,
    pausePressed:
      buttonPressed(left, XR_BUTTON.thumbstick) ||
      buttonPressed(right, XR_BUTTON.thumbstick),
  };
}
