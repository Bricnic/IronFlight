import sourceDefaults from "../src/tuning-defaults.json";
import { writeFileSync } from "node:fs";
import { beforeAll, it, expect } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import { DEFAULT_TUNING } from "../src/tuning";
import { basinSolids, hazardSupports } from "../src/scenery";
import { arenaSolids } from "../src/arena";
import { Vector3, Quaternion } from "three";
beforeAll(initPhysics);
it("defaults come directly from the shared source config", () => {
  expect(DEFAULT_TUNING).toEqual(sourceDefaults);
});

it("larger tire angles produce tighter physical turns", () => {
  const results = [];
  for (const angle of [10, 25, 60]) {
    const s = new Simulation();
    s.setTuning({ maxSteeringAngle: angle, steeringRate: 10 });
    s.run(0.7);
    s.body.setLinvel({ x: 0, y: 0, z: 10 }, true);
    const start = new Vector3().copy(s.body.translation());
    let distance = 0;
    for (let tick = 0; tick < 84; tick++) {
      const last = new Vector3().copy(s.body.translation());
      s.step({ throttle: 0.1, steer: 1 });
      distance += last.distanceTo(s.body.translation());
    }
    const forward = new Vector3(0, 0, 1).applyQuaternion(
      new Quaternion().copy(s.body.rotation()),
    );
    results.push({
      angle,
      yaw: Math.atan2(forward.x, forward.z),
      x: s.body.translation().x - start.x,
      up: s.snapshot().upDot,
      curvature: Math.atan2(forward.x, forward.z) / distance,
      distance,
      speed: s.snapshot().speed,
    });
    s.dispose();
  }
  writeFileSync(
    "artifacts/steering-sweep.json",
    JSON.stringify(results, null, 2),
  );
  expect(results[1].yaw).toBeGreaterThan(results[0].yaw * 1.3);
  expect(results[2].curvature).toBeGreaterThan(results[1].curvature * 1.2);
  expect(results[1].x).toBeGreaterThan(results[0].x);
  expect(results.every((r) => r.up > 0.7)).toBe(true);
});
it("gravity slider changes actual airborne acceleration and survives rebuilds", () => {
  const a = new Simulation(),
    b = new Simulation();
  a.setTuning({ gravity: 1 });
  b.setTuning({ gravity: 2 });
  for (const s of [a, b]) {
    s.body.setTranslation({ x: 0, y: 80, z: 0 }, true);
    s.run(0.5);
  }
  expect(b.body.linvel().y).toBeLessThan(a.body.linvel().y * 1.9);
  b.reset();
  expect(b.world.gravity.y).toBeCloseTo(-19.62);
  a.dispose();
  b.dispose();
});
it("basins enclose the lava and every hazard support meets the foundation", () => {
  const solids = basinSolids();
  expect(solids).toHaveLength(15);
  for (const floor of solids.filter((s) => s.id.endsWith("floor")))
    expect(floor.y - floor.h / 2).toBeCloseTo(-8.7);
  for (const lava of arenaSolids().filter((s) => s.kind === "lava")) {
    expect(lava.h).toBeGreaterThan(0.5);
    expect(
      solids.some(
        (s) =>
          s.id.includes(lava.id.replace("lava-", "")) &&
          s.id.endsWith("floor") &&
          Math.abs(s.y + s.h / 2 - (lava.y - lava.h / 2)) < 0.001,
      ),
    ).toBe(true);
  }
  for (const p of hazardSupports().filter(
    (s) => s.id.includes("pylon") || s.id.includes("leg"),
  ))
    expect(p.y - p.h / 2).toBeCloseTo(-8.1);
});
function strike(kind: "sign" | "trash" | "barrel", speed: number) {
  const s = new Simulation(),
    p = s.props.props.find((p) => p.definition.kind === kind)!;
  const pos = p.body.translation();
  s.body.setTranslation({ x: pos.x - 1.65, y: 1.94, z: pos.z - 2.7 }, true);
  s.body.setLinvel({ x: 0, y: 0, z: speed }, true);
  s.step({ throttle: 0.001 });
  return { s, p };
}
it("signs detach from their base and inherit greater momentum from faster hits", () => {
  const speeds = [];
  for (const speed of [4, 28]) {
    const { s, p } = strike("sign", speed);
    expect(p.broken).toBe(true);
    expect(p.joint).toBeUndefined();
    expect(p.body.linvel().z).toBeGreaterThan(1);
    speeds.push(p.body.linvel().z);
    s.dispose();
  }
  expect(speeds[1]).toBeGreaterThan(speeds[0] * 2);
});
it("a tire can hit a low trash can and spill physical litter", () => {
  const { s, p } = strike("trash", 6);
  expect(p.spilled).toBe(true);
  expect(p.pieces).toHaveLength(13);
  expect(p.pieces.every((piece) => piece.body.isDynamic())).toBe(true);
  s.run(0.3);
  expect(
    p.pieces.some(
      (piece) => Math.abs(piece.body.translation().x - p.definition.x) > 0.5,
    ),
  ).toBe(true);
  s.dispose();
});
it("barrels topple at low speed and ignite at 90 MPH or above", () => {
  for (const [speed, burning] of [
    [4, false],
    [24.9, false],
    [25, true],
    [30, true],
  ] as const) {
    const { s, p } = strike("barrel", speed);
    expect(p.burningUntil > s.time).toBe(burning);
    expect(p.body.angvel().x).not.toBe(0);
    if (burning) expect(s.fireDamageTaken).toBeGreaterThan(0);
    s.dispose();
  }
});
it("a burning barrel does light nearby fire damage and expires", () => {
  const { s, p } = strike("barrel", 30);
  p.body.setTranslation({ x: 0, y: 0.7, z: 50 }, true);
  p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  p.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  s.body.setTranslation({ x: 0, y: 1.94, z: 50 }, true);
  s.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  const start = s.fireDamageTaken;
  s.run(1);
  expect(s.fireDamageTaken - start).toBeCloseTo(0.01, 3);
  s.run(5.2);
  expect(p.burningUntil < s.time).toBe(true);
  expect(s.inFlames).toBe(false);
  s.reset();
  expect(
    s.props.props.every((p) => !p.broken && !p.spilled && p.burningUntil === 0),
  ).toBe(true);
  s.dispose();
});
