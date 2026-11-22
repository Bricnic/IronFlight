import { expect, it } from "vitest";
import { drivingInput } from "../src/controls";
import {
  PAD_DEADZONE,
  connectedPadId,
  deadzone,
  padActionPressed,
  padDriving,
  padLook,
  padMenuDelta,
  padStartPressed,
  pollPad,
  toPadState,
  type PadState,
} from "../src/gamepad";

function pad(over: Partial<{ axes: number[]; buttons: { pressed: boolean; value: number }[] }> = {}): PadState {
  return {
    axes: over.axes ?? [0, 0, 0, 0],
    buttons: over.buttons ?? Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
}

function buttons(pressed: Record<number, number> = {}): { pressed: boolean; value: number }[] {
  return Array.from({ length: 17 }, (_, i) => ({
    pressed: (pressed[i] ?? 0) > 0,
    value: pressed[i] ?? 0,
  }));
}

it("returns null outside browsers and for disconnected pads", () => {
  expect(pollPad()).toBeNull();
  expect(connectedPadId()).toBeNull();
  expect(toPadState(null)).toBeNull();
  expect(toPadState(undefined)).toBeNull();
  expect(toPadState({ connected: false, axes: [], buttons: [] } as unknown as Gamepad)).toBeNull();
});

it("deadzones small deflections and rescales the rim to full range", () => {
  expect(deadzone(0)).toBe(0);
  expect(deadzone(PAD_DEADZONE - 0.01)).toBe(0);
  expect(deadzone(-(PAD_DEADZONE - 0.01))).toBe(0);
  expect(deadzone(1)).toBeCloseTo(1, 10);
  expect(deadzone(-1)).toBeCloseTo(-1, 10);
  expect(deadzone(0.5)).toBeGreaterThan(0);
  expect(deadzone(0.5)).toBeLessThan(0.5);
  expect(deadzone(NaN)).toBe(0);
});

it("steers left positive like the A key and ignores drift", () => {
  expect(padDriving(pad({ axes: [-1, 0, 0, 0] })).steer).toBeCloseTo(1, 10);
  expect(padDriving(pad({ axes: [1, 0, 0, 0] })).steer).toBeCloseTo(-1, 10);
  expect(padDriving(pad({ axes: [0.1, 0, 0, 0] })).steer).toBe(0);
  expect(padDriving(null).steer).toBe(0);
});

it("accelerates on ZR analog or A digital and reverses on ZL analog", () => {
  expect(padDriving(pad({ buttons: buttons({ 7: 0.6 }) }))).toMatchObject({ throttle: 0.6, brake: 0 });
  expect(padDriving(pad({ buttons: buttons({ 0: 1 }) }))).toMatchObject({ throttle: 1, brake: 0 });
  expect(padDriving(pad({ buttons: buttons({ 6: 0.4 }) }))).toMatchObject({ throttle: -0.4, brake: 0 });
  // ZR and A combine by max; opposing triggers cancel their shared pressure.
  expect(padDriving(pad({ buttons: buttons({ 7: 0.5, 0: 1, 6: 0.3 }) }))).toMatchObject({ throttle: 0.7, brake: 0 });
  expect(padDriving(null)).toMatchObject({ throttle: 0, brake: 0, handbrake: 0 });
  expect(padDriving(pad())).toMatchObject({ throttle: 0, brake: 0, handbrake: 0 });
});

it("brakes against motion, then blends into reverse as the truck slows", () => {
  const reverse = pad({ buttons: buttons({ 6: 0.4 }) });
  expect(padDriving(reverse, 10)).toMatchObject({ throttle: 0, brake: 0.4 });
  const slowing = padDriving(reverse, 2);
  expect(slowing.throttle).toBeLessThan(0); expect(slowing.throttle).toBeGreaterThan(-0.4);
  expect(slowing.brake).toBeGreaterThan(0); expect(slowing.brake).toBeLessThan(0.4);
  expect(padDriving(reverse, 0)).toMatchObject({ throttle: -0.4, brake: 0 });
  expect(padDriving(reverse, -10)).toMatchObject({ throttle: -0.4, brake: 0 });
  expect(padDriving(pad({ buttons: buttons({ 7: 0.6 }) }), -10)).toMatchObject({ throttle: 0, brake: 0.6 });
  expect(padDriving(pad({ buttons: buttons({ 6: 1, 7: 1 }) }), 10)).toMatchObject({ throttle: 0, brake: 0 });
});

it("matches down-arrow drive behavior at full left-trigger pressure", () => {
  const reverse = pad({ buttons: buttons({ 6: 1 }) });
  for (const speed of [-10, -2, 0, 2, 10]) {
    expect(padDriving(reverse, speed)).toEqual(drivingInput(new Set(["arrowdown"]), speed));
  }
});

it("makes B match Space, overriding acceleration and reverse while preserving steering", () => {
  for (const speed of [-10, 0, 10]) {
    for (const trigger of [6, 7]) {
      const input = pad({ axes: [-1, 0, 0, 0], buttons: buttons({ 1: 1, 0: trigger === 7 ? 1 : 0, [trigger]: 1 }) });
      expect(padDriving(input, speed)).toEqual(drivingInput(new Set([" ", "a", "w"]), speed));
    }
  }
  expect(padDriving(pad({ buttons: buttons({ 7: 1 }) }))).toMatchObject({ throttle: 1, handbrake: 0 });
});

it("reads right-stick look with a deadzone", () => {
  expect(padLook(pad({ axes: [0, 0, 1, -1] }))).toEqual({ dx: 1, dy: -1 });
  expect(padLook(pad({ axes: [0, 0, 0.1, 0.1] }))).toEqual({ dx: 0, dy: 0 });
  expect(padLook(null)).toEqual({ dx: 0, dy: 0 });
});

it("reads Start, action and d-pad menu buttons", () => {
  expect(padStartPressed(pad({ buttons: buttons({ 9: 1 }) }))).toBe(true);
  expect(padStartPressed(pad())).toBe(false);
  expect(padStartPressed(null)).toBe(false);
  expect(padActionPressed(pad({ buttons: buttons({ 0: 1 }) }))).toBe(true);
  expect(padActionPressed(pad())).toBe(false);
  expect(padMenuDelta(pad({ buttons: buttons({ 12: 1 }) }))).toBe(-1);
  expect(padMenuDelta(pad({ buttons: buttons({ 13: 1 }) }))).toBe(1);
  expect(padMenuDelta(pad())).toBe(0);
  expect(padMenuDelta(null)).toBe(0);
});
