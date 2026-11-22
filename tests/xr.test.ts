import { expect, it } from "vitest";
import { XR_QUALITY } from "../src/settings";
import { XR_AXIS, XR_BUTTON, isXRSupported, xrDrivingInput } from "../src/xr";
import type { PadState as GamePadState } from "../src/gamepad";

function pad(
  over: Partial<{
    axes: number[];
    buttons: { pressed: boolean; value: number }[];
  }> = {},
): GamePadState {
  return {
    axes: over.axes ?? [0, 0, 0, 0],
    buttons:
      over.buttons ??
      Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
}

function pressed(value = 1): { pressed: boolean; value: number } {
  return { pressed: true, value };
}

function idle(): GamePadState {
  return pad();
}

it("reports unsupported where navigator.xr is missing", async () => {
  expect(typeof navigator === "undefined" || !("xr" in navigator)).toBe(true);
  await expect(isXRSupported()).resolves.toBe(false);
});

it("maps Touch sticks and triggers onto driving input", () => {
  const left = pad({ axes: [0, 0, 0.6, 0] });
  const right = pad({
    axes: [0, 0, 0.2, -0.4],
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.trigger ? pressed(0.8) : b,
    ),
  });
  const input = xrDrivingInput(left, right);
  expect(input.steer).toBeCloseTo(0.6, 5);
  expect(input.throttle).toBeCloseTo(0.8, 5);
  expect(input.brake).toBe(0);
  expect(input.handbrake).toBe(0);
  expect(input.airYaw).toBeCloseTo(0.2, 5);
  expect(input.airPitch).toBeCloseTo(0.4, 5);
  expect(input.pausePressed).toBe(false);
});

it("brakes on the left trigger and idles with no controllers", () => {
  const left = pad({
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.trigger ? pressed(0.5) : b,
    ),
  });
  expect(xrDrivingInput(left, idle()).brake).toBeCloseTo(0.5, 5);
  expect(xrDrivingInput(null, null)).toMatchObject({
    throttle: 0,
    brake: 0,
    handbrake: 0,
    steer: 0,
    pausePressed: false,
  });
});

it("applies the shared deadzone and falls back to the right stick", () => {
  const drift = pad({ axes: [0, 0, 0.1, 0] });
  expect(xrDrivingInput(drift, idle()).steer).toBe(0);
  const right = pad({ axes: [0, 0, -0.7, 0] });
  expect(xrDrivingInput(idle(), right).steer).toBeCloseTo(-0.7, 5);
  expect(XR_AXIS.stickX).toBe(2);
});

it("treats left squeeze as handbrake and zeroes the pedals", () => {
  const left = pad({
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.squeeze || i === XR_BUTTON.trigger ? pressed(1) : b,
    ),
  });
  const right = pad({
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.trigger ? pressed(1) : b,
    ),
  });
  const input = xrDrivingInput(left, right);
  expect(input.handbrake).toBe(1);
  expect(input.throttle).toBe(0);
  expect(input.brake).toBe(0);
});

it("requests pause on either thumbstick click", () => {
  for (const side of ["left", "right"] as const) {
    const clicked = pad({
      buttons: pad().buttons.map((b, i) =>
        i === XR_BUTTON.thumbstick ? pressed(1) : b,
      ),
    });
    const input = xrDrivingInput(
      side === "left" ? clicked : idle(),
      side === "right" ? clicked : idle(),
    );
    expect(input.pausePressed).toBe(true);
  }
});

it("clamps stick and trigger extremes into range", () => {
  const wild = pad({
    axes: [0, 0, 4, -4],
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.trigger ? { pressed: true, value: 9 } : b,
    ),
  });
  const input = xrDrivingInput(wild, wild);
  expect(input.steer).toBe(1);
  expect(input.throttle).toBe(1);
  expect(input.airYaw).toBe(1);
  expect(input.airPitch).toBe(1);
});

it("ships a conservative immersive-vr render spec", () => {
  expect(XR_QUALITY.shadows).toBe(false);
  expect(XR_QUALITY.pixelRatio).toBeLessThanOrEqual(0.75);
  expect(XR_QUALITY.far).toBeLessThanOrEqual(350);
});
