import { beforeAll, test, expect } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { POTIONS } from "../src/comic-hazards";
beforeAll(initPhysics);
for (const [i, effect] of POTIONS.entries())
  test(`potion ${effect} contact lasts five seconds then resets`, () => {
    const s = new Simulation();
    s.startTrack("harbor-sprint");
    const h = s.comic.mechanisms.find((m) => m.h.kind === "potion")!.h;
    s.body.setTranslation({ x: h.x + (i - 1.5) * 4.4, y: 2, z: h.z }, true);
    s.run(0.1);
    expect(s.comic.effect).toBe(effect);
    expect(s.comic.effectUntil - s.time).toBeGreaterThan(4.8);
    s.body.setTranslation({ x: 120, y: 2, z: 350 }, true);
    s.run(5.1);
    expect(s.comic.effect).toBeUndefined();
    s.dispose();
  });
test("mixing active potions destroys the car", () => {
  const s = new Simulation();
  s.startTrack("harbor-sprint");
  const h = s.comic.mechanisms.find((m) => m.h.kind === "potion")!.h;
  for (const i of [0, 1]) {
    s.body.setTranslation({ x: h.x + (i - 1.5) * 4.4, y: 2, z: h.z }, true);
    s.run(0.1);
  }
  expect(s.status).toBe("wrecked");
  s.dispose();
});
test("water boosts, skims and slows a fast truck; a slow truck actually sinks", () => {
  const s = new Simulation();
  s.startTrack("harbor-sprint");
  const h = s.comic.mechanisms.find((m) => m.h.kind === "water")!;
  s.body.setTranslation({ x: h.h.x, y: 2.1, z: h.h.z - 30 }, true);
  s.body.setLinvel({ x: 0, y: 0, z: 25 }, true);
  let peak = 0,
    skim = false;
  for (let i = 0; i < 150; i++) {
    s.step({ throttle: 1 });
    peak = Math.max(peak, s.snapshot(false).speed * 3.6);
    skim ||= h.skimming;
  }
  expect(peak).toBeGreaterThan(200);
  expect(skim).toBe(true);
  expect(s.status).not.toBe("wrecked");
  s.reset("harbor-sprint");
  const slow = s.comic.mechanisms.find((m) => m.h.kind === "water")!;
  s.body.setTranslation({ x: slow.h.x, y: 2.1, z: slow.h.z }, true);
  s.run(3);
  expect(s.body.translation().y).toBeLessThan(0);
  expect(s.status).toBe("wrecked");
  s.dispose();
});

test("nitro increases actual speed and scaled wheels match suspension geometry", () => {
  const speeds: number[] = [];
  for (const boosted of [false, true]) {
    const s = new Simulation();
    s.startTrack("harbor-sprint");
    if (boosted) {
      const h = s.comic.mechanisms.find((m) => m.h.kind === "potion")!.h;
      s.body.setTranslation({ x: h.x - 6.6, y: 2, z: h.z }, true);
      s.run(0.1);
      expect(s.comic.effect).toBe("nitro");
    }
    s.body.setTranslation({ x: 120, y: 2.1, z: -200 }, true);
    s.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    s.run(4.6, { throttle: 1 });
    speeds.push(s.snapshot(false).speed);
    s.dispose();
  }
  expect(speeds[1]).toBeGreaterThan(speeds[0] * 1.6);
  const s = new Simulation();
  s.startTrack("harbor-sprint");
  const h = s.comic.mechanisms.find((m) => m.h.kind === "potion")!.h;
  s.body.setTranslation({ x: h.x + 2.2, y: 2, z: h.z }, true);
  s.run(0.1);
  expect(s.comic.effect).toBe("tall");
  expect(s.vehicle.wheelRadius(0)).toBeCloseTo(1.05 * 1.85);
  s.dispose();
});
test("sufficient ordinary road speed jumps the entire burning section", () => {
  const s = new Simulation();
  s.startTrack("foundry-run");
  const h = s.comic.mechanisms.find((m) => m.h.kind === "burner")!;
  s.body.setTranslation({ x: h.h.x, y: 2.1, z: h.h.z - 40 }, true);
  s.body.setLinvel({ x: 0, y: 0, z: 32 }, true);
  let peak = 0;
  for (let i = 0; i < 240; i++) {
    s.step({ throttle: 1 });
    peak = Math.max(peak, s.body.translation().y);
  }
  expect(peak).toBeGreaterThan(6);
  expect(s.body.translation().z).toBeGreaterThan(h.h.z + 8);
  expect(h.contacts).toBe(0);
  expect(s.status).not.toBe("wrecked");
  s.dispose();
});
