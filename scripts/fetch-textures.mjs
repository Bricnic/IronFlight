import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../public/textures/", import.meta.url);
await mkdir(root, { recursive: true });
const manifest = { provider: "Poly Haven", assets: [] };
for (const id of [
  "asphalt_02",
  "grass_ground",
  "green_metal_rust",
  "rock_06",
  "concrete_floor_02",
  "concrete_layers_02",
]) {
  const response = await fetch(`https://api.polyhaven.com/files/${id}`);
  if (!response.ok) throw Error(`${id}: ${response.status}`);
  const files = await response.json();
  const asset = {
    id,
    source: `https://polyhaven.com/a/${id}`,
    license: "CC0",
    maps: {},
  };
  for (const [role, key] of [
    ["diffuse", "Diffuse"],
    ["normal", "nor_gl"],
    ["roughness", "Rough"],
  ]) {
    const map = files[key]?.["1k"]?.jpg;
    if (!map) throw Error(`Missing ${id} ${key}`);
    const filename = `${id}_${role}.jpg`,
      path = new URL(filename, root);
    let bytes;
    try {
      bytes = await readFile(path);
    } catch {
      const download = await fetch(map.url);
      if (!download.ok) throw Error(`Download ${map.url}: ${download.status}`);
      bytes = Buffer.from(await download.arrayBuffer());
      await writeFile(path, bytes);
    }
    asset.maps[role] = {
      file: `/textures/${filename}`,
      url: map.url,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    };
  }
  manifest.assets.push(asset);
  console.log(`Cached ${id}`);
}
await writeFile(
  new URL("manifest.json", root),
  JSON.stringify(manifest, null, 2) + "\n",
);
