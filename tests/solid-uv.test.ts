import { expect, it } from "vitest";
import * as T from "three";
import { scaleSolidUVs, solidNeedsUVScaling } from "../src/solid-uv";
/** Top faces map world x/z; ground tiles stay continuous via the solid offset. */
it("scales top-face UVs by world position every 3m", () => {
  const road = new T.BoxGeometry(6, 2, 10);
  scaleSolidUVs(road, { kind: "road", x: 4, z: 8 });
  const uv = road.attributes.uv as T.BufferAttribute;
  const pos = road.attributes.position as T.BufferAttribute;
  const normals = road.attributes.normal as T.BufferAttribute;
  let checked = 0;
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(normals.getY(i)) <= 0.5) continue;
    expect(uv.getX(i)).toBeCloseTo(pos.getX(i) / 3, 6);
    expect(uv.getY(i)).toBeCloseTo(pos.getZ(i) / 3, 6);
    checked++;
  }
  expect(checked).toBeGreaterThan(0);
  const ground = new T.BoxGeometry(6, 2, 10);
  scaleSolidUVs(ground, { kind: "ground", x: 4, z: 8 });
  const guv = ground.attributes.uv as T.BufferAttribute;
  const gpos = ground.attributes.position as T.BufferAttribute;
  const gnormals = ground.attributes.normal as T.BufferAttribute;
  let gchecked = 0;
  for (let i = 0; i < gpos.count; i++) {
    if (Math.abs(gnormals.getY(i)) <= 0.5) continue;
    expect(guv.getX(i)).toBeCloseTo((gpos.getX(i) + 4) / 3, 6);
    expect(guv.getY(i)).toBeCloseTo((gpos.getZ(i) + 8) / 3, 6);
    gchecked++;
  }
  expect(gchecked).toBeGreaterThan(0);
});
/** Side faces shear x+z against height so walls tile without stretching. */
it("scales side-face UVs from x+z and height", () => {
  const geometry = new T.BoxGeometry(6, 2, 10);
  scaleSolidUVs(geometry, { kind: "barrier", x: 30, z: -5 });
  const uv = geometry.attributes.uv as T.BufferAttribute;
  const pos = geometry.attributes.position as T.BufferAttribute;
  const normals = geometry.attributes.normal as T.BufferAttribute;
  let checked = 0;
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(normals.getY(i)) > 0.5) continue;
    expect(uv.getX(i)).toBeCloseTo(
      (pos.getX(i) + pos.getZ(i)) / 3,
      6,
    );
    expect(uv.getY(i)).toBeCloseTo(pos.getY(i) / 3, 6);
    checked++;
  }
  expect(checked).toBeGreaterThan(0);
  expect(uv.version).toBeGreaterThan(0);
});

/** Lava tiles like other surfaces instead of stretching 0-1 UVs over the lake. */
it("scales UVs for lava, textured and ground-like kinds only", () => {
  const s = (kind: string, texture?: string) => ({ kind, texture });
  expect(solidNeedsUVScaling(s("lava"), false, false)).toBe(true);
  expect(solidNeedsUVScaling(s("slime"), false, false)).toBe(true);
  expect(solidNeedsUVScaling(s("road"), false, false)).toBe(true);
  expect(solidNeedsUVScaling(s("barrier", "brick_01"), false, false)).toBe(true);
  expect(solidNeedsUVScaling(s("barrier"), false, false)).toBe(false);
  expect(solidNeedsUVScaling(s("barrier"), true, false)).toBe(true);
});

/** Lava tiles at 9m to match the lava material convention (view.box tile=9). */
it("scales lava UVs every 9m", () => {
  const geometry = new T.BoxGeometry(18, 2, 18);
  scaleSolidUVs(geometry, { kind: "lava", x: 0, z: 0 }, false, 9);
  const uv = geometry.attributes.uv as T.BufferAttribute;
  const pos = geometry.attributes.position as T.BufferAttribute;
  const normals = geometry.attributes.normal as T.BufferAttribute;
  let checked = 0;
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(normals.getY(i)) <= 0.5) continue;
    expect(uv.getX(i)).toBeCloseTo(pos.getX(i) / 9, 6);
    expect(uv.getY(i)).toBeCloseTo(pos.getZ(i) / 9, 6);
    checked++;
  }
  expect(checked).toBeGreaterThan(0);
});

/** Slime tiles at 33m so its 0-1-tuned pattern keeps ~3m cells. */
it("scales slime UVs every 33m", () => {
  const geometry = new T.BoxGeometry(66, 2, 66);
  scaleSolidUVs(geometry, { kind: "slime", x: 0, z: 0 }, false, 33);
  const uv = geometry.attributes.uv as T.BufferAttribute;
  const normals = geometry.attributes.normal as T.BufferAttribute;
  let umax = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(normals.getY(i)) <= 0.5) continue;
    umax = Math.max(umax, uv.getX(i));
  }
  expect(umax).toBeCloseTo(1, 6);
});
