import { expect, it } from "vitest";
import * as T from "three";
import {
  applyNightGlow,
  buildLampPost,
  GATE_NIGHT_GLOW,
  makeGlowTexture,
} from "../src/course-view";

it("tags the lamp bar for a night emissive boost", () => {
  const lamp = buildLampPost();
  const bar = lamp.children.find(
    (o) => o instanceof T.Mesh && o.position.y === 13,
  ) as T.Mesh;
  const mat = bar.material as T.MeshStandardMaterial;
  expect(mat.userData.nightGlow).toEqual({ day: 2, night: 4 });
});

it("hangs a hidden additive glow sprite on the lamp bar", () => {
  const lamp = buildLampPost();
  const glow = lamp.getObjectByName("lamp-glow") as T.Sprite;
  expect(glow.visible).toBe(false);
  const mat = glow.material as T.SpriteMaterial;
  expect(mat.blending).toBe(T.AdditiveBlending);
  expect(mat.map).toBe(makeGlowTexture());
});

it("drives gate tags to the shared night emissive", () => {
  expect(GATE_NIGHT_GLOW).toBeGreaterThanOrEqual(3);
  const group = new T.Group();
  const gate = new T.Mesh(
    new T.BoxGeometry(1, 1, 1),
    new T.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0 }),
  );
  (gate.material as T.MeshStandardMaterial).userData.nightGlow = {
    day: 0,
    night: GATE_NIGHT_GLOW,
  };
  group.add(gate);
  expect(applyNightGlow(group, true)).toBe(1);
  expect((gate.material as T.MeshStandardMaterial).emissiveIntensity).toBe(
    GATE_NIGHT_GLOW,
  );
});

it("builds a headless-safe radial glow texture", () => {
  const texture = makeGlowTexture();
  expect(texture.image.width).toBe(64);
  expect(texture.image.height).toBe(64);
  expect(makeGlowTexture()).toBe(texture);
});

it("applies night intensities only to tagged materials", () => {
  const group = new T.Group();
  const tagged = new T.Mesh(
    new T.BoxGeometry(1, 1, 1),
    new T.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0 }),
  );
  (tagged.material as T.MeshStandardMaterial).userData.nightGlow = {
    day: 0,
    night: 2.2,
  };
  const plain = new T.Mesh(
    new T.BoxGeometry(1, 1, 1),
    new T.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0.5 }),
  );
  const lamp = buildLampPost();
  group.add(tagged, plain, lamp);
  expect(applyNightGlow(group, true)).toBe(2);
  expect(
    (tagged.material as T.MeshStandardMaterial).emissiveIntensity,
  ).toBe(2.2);
  expect((plain.material as T.MeshStandardMaterial).emissiveIntensity).toBe(
    0.5,
  );
  expect(
    (lamp.getObjectByName("lamp-glow") as T.Sprite).visible,
  ).toBe(true);
  expect(applyNightGlow(group, false)).toBe(0);
  expect(
    (tagged.material as T.MeshStandardMaterial).emissiveIntensity,
  ).toBe(0);
  expect(
    (lamp.getObjectByName("lamp-glow") as T.Sprite).visible,
  ).toBe(false);
});
