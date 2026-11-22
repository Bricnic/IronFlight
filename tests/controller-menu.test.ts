import { expect, it } from "vitest";
import { ControllerMenuInput, nextMenuIndex } from "../src/controller-menu";
import type { PadState } from "../src/gamepad";

const pad = (x = 0, y = 0, buttons: number[] = []): PadState => ({ axes: [x, y], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })) });
it("emits one reset for each Y press, including gameplay, without repeating while held", () => {
  const input = new ControllerMenuInput();
  expect(input.sample(pad(0, 0, [3]), null, 0).reset).toBe(true);
  expect(input.sample(pad(0, 0, [3]), "pause", 100).reset).toBe(false);
  input.sample(pad(), "pause", 200);
  expect(input.sample(pad(0, 0, [3]), "pause", 300).reset).toBe(true);
});
it("navigates with either stick axis or the d-pad, ignoring stick drift", () => {
  for (const [p, direction] of [[pad(1), "right"], [pad(-1), "left"], [pad(0, 1), "down"], [pad(0, -1), "up"], [pad(0, 0, [15]), "right"], [pad(0, 0, [12]), "up"]] as const) {
    expect(new ControllerMenuInput().sample(p, "menu", 0).direction).toBe(direction);
  }
  expect(new ControllerMenuInput().sample(pad(0.2, -0.2), "menu", 0).direction).toBeNull();
});
it("repeats held navigation after a delay and resets when released", () => {
  const input = new ControllerMenuInput();
  expect(input.sample(pad(0, 1), "menu", 0).direction).toBe("down");
  expect(input.sample(pad(0, 1), "menu", 200).direction).toBeNull();
  expect(input.sample(pad(0, 1), "menu", 400).direction).toBe("down");
  expect(input.sample(pad(0, 1), "menu", 410).direction).toBeNull();
  input.sample(pad(), "menu", 420);
  expect(input.sample(pad(0, 1), "menu", 430).direction).toBe("down");
});
it("does not reactivate held A across screens or when entering a menu from driving", () => {
  const input = new ControllerMenuInput();
  expect(input.sample(pad(0, 0, [0]), null, 0).confirm).toBe(false);
  expect(input.sample(pad(0, 0, [0]), "menu", 10).confirm).toBe(false);
  input.sample(pad(), "menu", 20);
  expect(input.sample(pad(0, 0, [0]), "menu", 30).confirm).toBe(true);
  expect(input.sample(pad(0, 0, [0]), "other", 40).confirm).toBe(false);
  expect(input.sample(pad(0, 0, [1]), "other", 50).back).toBe(true);
});
it("moves across grid rows and columns and stays within the menu", () => {
  const boxes = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }];
  expect(nextMenuIndex(boxes, 0, "right")).toBe(1);
  expect(nextMenuIndex(boxes, 0, "down")).toBe(2);
  expect(nextMenuIndex(boxes, 3, "up")).toBe(1);
  expect(nextMenuIndex(boxes, 0, "left")).toBe(0);
});
