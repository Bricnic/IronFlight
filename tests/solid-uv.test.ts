import { expect, it } from "vitest";
import * as T from "three";
import { scaleSolidUVs } from "../src/solid-uv";
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
