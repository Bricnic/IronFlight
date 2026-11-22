import { expect, it } from "vitest";
import * as T from "three";
import { XR_QUALITY } from "../src/settings";
import {
  XR_AXIS,
  XR_BUTTON,
  isXRSupported,
  mergePadStates,
  xrDrivingInput,
  xrMenuPad,
} from "../src/xr";
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
  // Raw stick deflection negates like the gamepad path: pushing right (+X)
  // steers/orients right (negative), pushing the stick up pitches up.
  const left = pad({ axes: [0, 0, 0.6, 0] });
  const right = pad({
    axes: [0, 0, 0.2, -0.4],
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.trigger ? pressed(0.8) : b,
    ),
  });
  const input = xrDrivingInput(left, right);
  expect(input.steer).toBeCloseTo(-0.6, 5);
  expect(input.throttle).toBeCloseTo(0.8, 5);
  expect(input.brake).toBe(0);
  expect(input.handbrake).toBe(0);
  expect(input.airYaw).toBeCloseTo(-0.2, 5);
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
  expect(xrDrivingInput(idle(), right).steer).toBeCloseTo(0.7, 5);
  expect(XR_AXIS.stickX).toBe(2);
});

it("reverses on either grip trigger", () => {
  for (const side of ["left", "right"] as const) {
    const grip = pad({
      buttons: pad().buttons.map((b, i) =>
        i === XR_BUTTON.squeeze ? pressed(1) : b,
      ),
    });
    const input = xrDrivingInput(
      side === "left" ? grip : idle(),
      side === "right" ? grip : idle(),
    );
    expect(input.throttle).toBeCloseTo(-1, 5);
    expect(input.handbrake).toBe(0);
    expect(input.pausePressed).toBe(false);
  }
  // Full grip cancels a full throttle trigger.
  const right = pad({
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.trigger || i === XR_BUTTON.squeeze ? pressed(1) : b,
    ),
  });
  expect(xrDrivingInput(idle(), right).throttle).toBe(0);
});

it("treats A as handbrake and zeroes the pedals", () => {
  const right = pad({
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.primary ||
      i === XR_BUTTON.trigger ||
      i === XR_BUTTON.squeeze
        ? pressed(1)
        : b,
    ),
  });
  const input = xrDrivingInput(idle(), right);
  expect(input.handbrake).toBe(1);
  expect(input.throttle).toBe(0);
  expect(input.brake).toBe(0);
});

it("keeps throttle under A while flying with wings", () => {
  const right = pad({
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.primary || i === XR_BUTTON.trigger ? pressed(1) : b,
    ),
  });
  const input = xrDrivingInput(idle(), right, true);
  expect(input.handbrake).toBe(1);
  expect(input.throttle).toBeCloseTo(1, 5);
});

it("requests pause on B, not on thumbstick click", () => {
  for (const side of ["left", "right"] as const) {
    const b = pad({
      buttons: pad().buttons.map((x, i) =>
        i === XR_BUTTON.secondary ? pressed(1) : x,
      ),
    });
    const input = xrDrivingInput(
      side === "left" ? b : idle(),
      side === "right" ? b : idle(),
    );
    expect(input.pausePressed).toBe(true);
  }
  const clicked = pad({
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.thumbstick ? pressed(1) : b,
    ),
  });
  expect(xrDrivingInput(clicked, idle()).pausePressed).toBe(false);
});

it("clamps stick and trigger extremes into range", () => {
  const wild = pad({
    axes: [0, 0, 4, -4],
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.trigger ? { pressed: true, value: 9 } : b,
    ),
  });
  const input = xrDrivingInput(wild, wild);
  expect(input.steer).toBe(-1);
  expect(input.throttle).toBe(1);
  expect(input.airYaw).toBe(-1);
  expect(input.airPitch).toBe(1);
});

it("faces a recentered headset at the car after the rig half-turn", () => {
  // Mirrors the render path: the chase follow lookAt's the rig at the car
  // (+Z forward), then the rig yaws half a turn so headset-forward (-Z)
  // points at the car instead of away from it.
  const rig = new T.Group();
  rig.position.set(0, 0, -15);
  rig.lookAt(new T.Vector3(0, 0, 0));
  rig.rotateY(Math.PI);
  rig.updateMatrixWorld(true);
  const headsetForward = new T.Vector3(0, 0, -1).applyQuaternion(
    rig.quaternion,
  );
  expect(headsetForward.z).toBeGreaterThan(0.99);
  expect(rig.position.toArray()).toEqual([0, 0, -15]);
});

it("translates Touch input into standard menu controls", () => {
  const left = pad({ axes: [0, 0, -0.8, 0] });
  const right = pad({
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.primary ? pressed(1) : b,
    ),
  });
  const translated = xrMenuPad(left, right);
  expect(translated.axes[0]).toBeCloseTo(-0.8, 5);
  expect(translated.buttons[0].pressed).toBe(true);
  expect(translated.buttons[1].pressed).toBe(false);
  const back = pad({
    buttons: pad().buttons.map((b, i) =>
      i === XR_BUTTON.secondary ? pressed(1) : b,
    ),
  });
  expect(xrMenuPad(back, idle()).buttons[1].pressed).toBe(true);
  const empty = xrMenuPad(null, null);
  expect(empty.axes).toEqual([0, 0, 0, 0]);
  expect(empty.buttons.every((b) => !b.pressed)).toBe(true);
});

it("merges physical and Touch pads with OR semantics", () => {
  expect(mergePadStates(null, null)).toBeNull();
  const physical = pad({ axes: [0.9, 0, 0, 0] });
  expect(mergePadStates(physical, null)).toBe(physical);
  const touch = xrMenuPad(
    pad({ axes: [0, 0, -0.4, 0] }),
    idle(),
  );
  const merged = mergePadStates(physical, touch)!;
  expect(merged.axes[0]).toBeCloseTo(0.5, 5);
  const merged2 = mergePadStates(idle(), touch)!;
  expect(merged2.axes[0]).toBeCloseTo(-0.4, 5);
  expect(merged2.buttons[0].pressed).toBe(false);
});

it("ships a conservative immersive-vr render spec", () => {
  expect(XR_QUALITY.shadows).toBe(false);
  expect(XR_QUALITY.pixelRatio).toBeLessThanOrEqual(0.75);
  expect(XR_QUALITY.far).toBeLessThanOrEqual(350);
});
