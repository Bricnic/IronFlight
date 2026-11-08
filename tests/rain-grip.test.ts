import { beforeAll, expect, it } from "vitest";
import {
  RAIN_GRIP_SCALE,
  Simulation,
  initPhysics,
} from "../src/simulation";
import { Vector3, Quaternion } from "three";

beforeAll(initPhysics);

function peakSlip(rain: boolean) {
  const s = new Simulation();
  s.weather = { night: false, rain };
  for (let i = 0; i < 120; i++) s.step({ throttle: 1 });
  let peak = 0;
  for (let i = 0; i < 120; i++) {
    s.step({ throttle: 1, steer: 1 });
    const q = new Quaternion().copy(s.body.rotation());
    const lateral = new Vector3(1, 0, 0).applyQuaternion(q);
    lateral.y = 0;
    lateral.normalize();
    const v = s.body.linvel();
    peak = Math.max(peak, Math.abs(lateral.x * v.x + lateral.z * v.z));
  }
  const v = s.body.linvel();
  return { peak, speed: Math.hypot(v.x, v.z) };
}

it("slides wider on wet asphalt", () => {
  expect(RAIN_GRIP_SCALE).toBeLessThan(1);
  expect(RAIN_GRIP_SCALE).toBeGreaterThanOrEqual(0.3);
  const dry = peakSlip(false);
  const wet = peakSlip(true);
  expect(dry.speed).toBeGreaterThan(5);
  expect(dry.peak).toBeGreaterThan(0.5);
  expect(wet.peak).toBeGreaterThan(dry.peak * 1.2);
});
