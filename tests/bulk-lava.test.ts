import { expect, it } from "vitest";
import { isBulkLava } from "../src/course-view";
import { bulkLavaMaterial } from "../src/materials";

it("treats only lake-scale lava as bulk", () => {
  expect(isBulkLava({ kind: "lava", w: 1300, d: 1400 })).toBe(true);
  expect(isBulkLava({ kind: "lava", w: 101, d: 101 })).toBe(true);
  expect(isBulkLava({ kind: "lava", w: 100, d: 100 })).toBe(false);
  expect(isBulkLava({ kind: "lava", w: 360, d: 30 })).toBe(false);
  expect(isBulkLava({ kind: "lava", w: 18, d: 22 })).toBe(false);
  expect(isBulkLava({ kind: "slime", w: 960, d: 1420 })).toBe(false);
});

it("drifts bulk lava slowly with glowing cracks", () => {
  const material = bulkLavaMaterial();
  expect(material.userData.time).toBeDefined();
  expect(material.userData.time.value).toBe(0);
  expect(material.map).toBeNull();
  const shader = {
    uniforms: {} as Record<string, { value: unknown }>,
    vertexShader: "#include <uv_vertex>",
    fragmentShader: "#include <color_fragment>\n#include <emissivemap_fragment>",
  };
  material.onBeforeCompile!(shader as never, {} as never);
  expect(shader.uniforms.lavaTime).toBe(material.userData.time);
  expect(shader.fragmentShader).toContain("uniform float lavaTime;");
  expect(shader.fragmentShader).toMatch(
    /lavaTime\s*\*\s*vec2\(\s*0\.009\s*,\s*0\.006\s*\)/,
  );
  expect(shader.fragmentShader).toContain("totalEmissiveRadiance");
  expect(shader.fragmentShader).toContain("shimmer");
  expect(shader.fragmentShader).toMatch(
    /p\s*\+=\s*shimmer[\s\S]*lavaTime\s*\*\s*1\.4/,
  );
});
