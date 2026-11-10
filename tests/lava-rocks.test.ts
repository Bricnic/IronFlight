import { expect, it } from "vitest";
import {
  MAX_LAVA_ROCKS,
  LAVA_FLOW,
  createRockField,
  updateRockField,
  type LavaLake,
} from "../src/lava-rocks";

const LAKE: LavaLake = { x: 0, z: 0, w: 1300, d: 1400, surfaceY: 0 };
const LAKES = [LAKE];
// Deterministic rand: cycles so spawn positions vary but tests repeat.
const rand = () => 0.25;

it("fills the field up to the rock cap", () => {
  expect(createRockField([], rand)).toEqual([]);
  const field = createRockField(LAKES, rand);
  expect(field).toHaveLength(MAX_LAVA_ROCKS);
  expect(MAX_LAVA_ROCKS).toBe(20);
  for (const rock of field) {
    expect(Math.abs(rock.x - LAKE.x)).toBeLessThanOrEqual(LAKE.w / 2);
    expect(Math.abs(rock.z - LAKE.z)).toBeLessThanOrEqual(LAKE.d / 2);
  }
});

it("drifts floating rocks along the lava flow direction", () => {
  const field = createRockField(LAKES, rand);
  const before = field[0];
  expect(before.state).toBe("floating");
  const after = updateRockField(field, LAKES, 10, 10, rand);
  const moved = after.find((r) => r.id === before.id)!;
  expect(moved.x - before.x).toBeCloseTo(LAVA_FLOW.x * 10 * 2, 6);
  expect(moved.z - before.z).toBeCloseTo(LAVA_FLOW.z * 10 * 2, 6);
});

it("bobs rocks up and down while floating", () => {
  const field = createRockField(LAKES, rand);
  const id = field[0].id;
  const y0 = updateRockField(field, LAKES, 0, 0, rand).find(
    (r) => r.id === id,
  )!.y;
  const y1 = updateRockField(field, LAKES, 0, Math.PI / 0.9, rand).find(
    (r) => r.id === id,
  )!.y;
  expect(y1).toBeCloseTo(-y0, 6);
  expect(Math.abs(y0) + Math.abs(y1)).toBeGreaterThan(0);
});

it("sinks rocks past the lake edge and respawns rising replacements", () => {
  const field = createRockField(LAKES, rand);
  const edge = {
    ...field[0],
    x: LAKE.x + LAKE.w / 2 + 10,
    z: LAKE.z,
  };
  const sinking = updateRockField([edge], LAKES, 0.1, 1, rand);
  expect(sinking.find((r) => r.id === edge.id)?.state).toBe("sinking");
  // Step until the old rock finishes sinking: it is replaced by a riser.
  let current = sinking;
  for (let t = 2; t < 10 && current.some((r) => r.id === edge.id); t += 0.5)
    current = updateRockField(current, LAKES, 0.5, t, rand);
  expect(current.find((r) => r.id === edge.id)).toBeUndefined();
  expect(current.length).toBeLessThanOrEqual(MAX_LAVA_ROCKS);
  expect(current.some((r) => r.state === "rising")).toBe(true);
});

it("rises new rocks out of the lava into a floating state", () => {
  const field = createRockField(LAKES, rand);
  const riser = { ...field[0], state: "rising" as const, stateT: 0, y: -3 };
  const mid = updateRockField([riser], LAKES, 1, 1, rand).find(
    (r) => r.id === riser.id,
  )!;
  expect(mid.state).toBe("rising");
  expect(mid.y).toBeGreaterThan(-3);
  let current = updateRockField([riser], LAKES, 1, 1, rand);
  for (let t = 2; t < 8; t += 1)
    current = updateRockField(current, LAKES, 1, t, rand);
  const settled = current.find((r) => r.id === riser.id)!;
  expect(settled.state).toBe("floating");
});

it("seeds rocks near the focus point, clamped inside the lake", () => {
  const focus = { x: 100, z: -200, radius: 150 };
  const field = createRockField(LAKES, rand, focus);
  expect(field).toHaveLength(MAX_LAVA_ROCKS);
  for (const rock of field) {
    expect(Math.abs(rock.x - focus.x)).toBeLessThanOrEqual(focus.radius);
    expect(Math.abs(rock.z - focus.z)).toBeLessThanOrEqual(focus.radius);
    expect(Math.abs(rock.x - LAKE.x)).toBeLessThanOrEqual(LAKE.w / 2);
    expect(Math.abs(rock.z - LAKE.z)).toBeLessThanOrEqual(LAKE.d / 2);
  }
  // Focus far outside the lake still spawns inside it.
  const far = createRockField(LAKES, rand, { x: 5000, z: 5000, radius: 150 });
  for (const rock of far) {
    expect(Math.abs(rock.x - LAKE.x)).toBeLessThanOrEqual(LAKE.w / 2);
    expect(Math.abs(rock.z - LAKE.z)).toBeLessThanOrEqual(LAKE.d / 2);
  }
});

it("seeds rocks outside covering structures", () => {
  // First candidate lands in the cover; the retry lands clear.
  const seq = [0.0, 0.5, 0.5, 0.9, 0.9, 0.1, 0.2, 0.3, 0.4];
  let i = 0;
  const seqRand = () => seq[i++ % seq.length];
  const cover = { x: 0, z: 0, w: 100, d: 100 };
  const field = createRockField(LAKES, seqRand, { x: 0, z: 0, radius: 150 }, [cover]);
  expect(field).toHaveLength(MAX_LAVA_ROCKS);
  for (const rock of field) {
    const inside =
      Math.abs(rock.x - cover.x) <= cover.w / 2 &&
      Math.abs(rock.z - cover.z) <= cover.d / 2;
    expect(inside).toBe(false);
  }
});
