import { expect, it } from "vitest";
import * as T from "three";
import { SKY_ENV_GROUND, buildSkyEnvScene, paintSkyGradient } from "../src/sky-env";

function pixel(tex: T.DataTexture, x: number, y: number) {
  const w = tex.image.width;
  const d = tex.image.data as Uint8Array;
  return [d[(y * w + x) * 4], d[(y * w + x) * 4 + 1], d[(y * w + x) * 4 + 2]];
}

it("paints a sky-to-ground gradient texture", () => {
  const tex = paintSkyGradient(0x3d8ad0, 0xbddfc8);
  expect(tex.image.width).toBe(64);
  expect(tex.image.height).toBe(64);
  expect(pixel(tex, 32, 0)).toEqual([0x3d, 0x8a, 0xd0]);
  const mid = pixel(tex, 32, 32);
  expect(mid[0]).toBeGreaterThan(0x3d);
  expect(mid[2]).toBeLessThan(0xd0);
  expect(pixel(tex, 32, 63)).toEqual([
    (SKY_ENV_GROUND >> 16) & 0xff,
    (SKY_ENV_GROUND >> 8) & 0xff,
    SKY_ENV_GROUND & 0xff,
  ]);
});

it("builds a backface env scene from mood colors", () => {
  const scene = buildSkyEnvScene(0x3d8ad0, 0xbddfc8);
  const dome = scene.children[0] as T.Mesh;
  expect(dome.material).toBeInstanceOf(T.MeshBasicMaterial);
  expect((dome.material as T.MeshBasicMaterial).side).toBe(T.BackSide);
  expect((dome.material as T.MeshBasicMaterial).map).toBeInstanceOf(T.DataTexture);
});
