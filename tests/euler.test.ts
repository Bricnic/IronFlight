import { expect, it } from "vitest";
import * as T from "three";
import { solidQuaternion, trackballEuler } from "../src/euler";

it("builds YXZ quaternions from yaw/pitch/roll", () => {
  const yaw = solidQuaternion({ yaw: Math.PI / 2 });
  const spun = new T.Vector3(0, 0, 1).applyQuaternion(yaw);
  expect(spun.x).toBeCloseTo(1, 5);
  expect(spun.z).toBeCloseTo(0, 5);
  const pitch = solidQuaternion({ angle: Math.PI / 2 });
  const tipped = new T.Vector3(0, 1, 0).applyQuaternion(pitch);
  expect(tipped.z).toBeCloseTo(1, 5);
  const roll = solidQuaternion({ roll: Math.PI / 2 });
  const rolled = new T.Vector3(0, 1, 0).applyQuaternion(roll);
  expect(rolled.x).toBeCloseTo(-1, 5);
  const combo = solidQuaternion({
    yaw: Math.PI / 2,
    angle: Math.PI / 2,
    roll: 0,
  });
  const out = new T.Vector3(0, 0, 1).applyQuaternion(combo);
  expect(out.y).toBeCloseTo(-1, 5);
});
it("leaves orientation fixed without drag", () => {
  expect(
    trackballEuler(
      { yaw: 0.5, pitch: 0.2, roll: -0.1 },
      0,
      0,
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    ),
  ).toMatchObject({ yaw: 0.5, pitch: 0.2, roll: -0.1 });
});
it("turns horizontal drags into yaw with a level camera", () => {
  const out = trackballEuler(
    { yaw: 0, pitch: 0, roll: 0 },
    100,
    0,
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
  );
  expect(out.yaw).toBeCloseTo(1, 5);
  expect(out.pitch).toBeCloseTo(0, 5);
  expect(out.roll).toBeCloseTo(0, 5);
});
it("turns vertical drags into pitch", () => {
  const out = trackballEuler(
    { yaw: 0, pitch: 0, roll: 0 },
    0,
    100,
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
  );
  expect(out.yaw).toBeCloseTo(0, 5);
  expect(out.pitch).toBeCloseTo(-1, 5);
  expect(out.roll).toBeCloseTo(0, 5);
});
it("keeps diagonal drags finite and moving on all axes", () => {
  const out = trackballEuler(
    { yaw: 0.3, pitch: -0.1, roll: 0.2 },
    70,
    -50,
    { x: 0.9, y: 0, z: -0.44 },
    { x: 0.2, y: 0.95, z: 0.24 },
  );
  expect(Number.isFinite(out.yaw + out.pitch + out.roll)).toBe(true);
  expect(Math.abs(out.yaw - 0.3)).toBeGreaterThan(0.1);
  expect(Math.abs(out.pitch + 0.1)).toBeGreaterThan(0.05);
});
