import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TEXTURE_IDS } from "../src/custom-level";
type Manifest = {
  assets: {
    id: string;
    maps: Record<string, { file: string; sha256: string; bytes: number }>;
  }[];
};
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest: Manifest = JSON.parse(
  readFileSync(join(root, "public/textures/manifest.json"), "utf8"),
);
it("manifest covers every editor texture id", () => {
  const ids = new Set(manifest.assets.map((a) => a.id));
  for (const id of TEXTURE_IDS) expect(ids.has(id), id).toBe(true);
});
it("every manifest map exists with matching bytes and hash", () => {
  for (const asset of manifest.assets) {
    expect(Object.keys(asset.maps).sort()).toEqual([
      "diffuse",
      "normal",
      "roughness",
    ]);
    for (const map of Object.values(asset.maps)) {
      const disk = join(root, "public", map.file);
      expect(existsSync(disk), disk).toBe(true);
      const buf = readFileSync(disk);
      expect(buf.length, disk).toBe(map.bytes);
      expect(createHash("sha256").update(buf).digest("hex"), disk).toBe(
        map.sha256,
      );
    }
  }
});
