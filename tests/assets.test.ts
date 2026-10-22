import { it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createTruck, truckStats } from "../src/truck";
import { PARTS } from "../src/damage";
it("hero truck has named detachable parts, dense geometry and tire treads", () => {
  const truck = createTruck();
  const stats = truckStats(truck);
  expect(stats.triangles).toBeGreaterThanOrEqual(60000);
  expect(stats.triangles).toBeLessThan(125000);
  for (const p of PARTS) expect(truck.getObjectByName(p.id)).toBeDefined();
  expect(stats.treadBlocks).toBeGreaterThanOrEqual(160);
  expect(truck.getObjectByName("roll-cage")).toBeDefined();
});
it("local Poly Haven material maps match their recorded hashes", () => {
  const manifest = JSON.parse(
    readFileSync("public/textures/manifest.json", "utf8"),
  );
  expect(manifest.assets.map((a: { id: string }) => a.id)).toEqual([
    "asphalt_02",
    "grass_ground",
    "green_metal_rust",
    "rock_06",
    "concrete_floor_02",
    "concrete_layers_02",
  ]);
  for (const asset of manifest.assets) {
    expect(asset.license).toBe("CC0");
    expect(asset.source).toMatch(/^https:\/\/polyhaven.com\/a\//);
    expect(Object.keys(asset.maps)).toEqual(["diffuse", "normal", "roughness"]);
    for (const map of Object.values(asset.maps) as {
      file: string;
      sha256: string;
    }[]) {
      expect(existsSync(`public${map.file}`)).toBe(true);
      expect(
        createHash("sha256")
          .update(readFileSync(`public${map.file}`))
          .digest("hex"),
      ).toBe(map.sha256);
    }
  }
});
