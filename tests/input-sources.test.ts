import { expect, it } from "vitest";
import { combineDrivingInput, drivingInput } from "../src/controls";
import { padDriving, type PadState } from "../src/gamepad";

const controller: PadState = { axes: [0, 0, 0, 0], buttons: [] };
const idle = drivingInput(new Set(), 0);

it("treats omitted input fields as neutral", () => {
  expect(combineDrivingInput({}, {})).toEqual(idle);
});

it("keeps keyboard driving, steering, reversing and handbrake with a connected idle controller", () => {
  for (const keys of [["w", "a"], ["arrowdown", "arrowright"], [" "]]) {
    const keyboard = drivingInput(new Set(keys), 0);
    expect(combineDrivingInput(padDriving(controller), keyboard)).toEqual(keyboard);
  }
});

it("allows steering on the keyboard while accelerating on the controller", () => {
  const pad = { throttle: 0.6, brake: 0, handbrake: 0, steer: 0 };
  expect(combineDrivingInput(pad, drivingInput(new Set(["a"]), 0))).toEqual({ ...pad, steer: 1 });
  expect(combineDrivingInput(pad, idle)).toEqual(pad);
});

it("keeps keyboard handbrake priority and does not double matching inputs", () => {
  const pad = { throttle: 1, brake: 0, handbrake: 0, steer: 1 };
  expect(combineDrivingInput(pad, pad)).toEqual(pad);
  expect(combineDrivingInput(pad, drivingInput(new Set([" "]), 0))).toEqual({ ...pad, throttle: 0, handbrake: 1 });
  expect(combineDrivingInput(pad, { throttle: -1, brake: 0, handbrake: 0, steer: -1 })).toEqual(idle);
});
