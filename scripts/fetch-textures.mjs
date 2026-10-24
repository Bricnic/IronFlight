import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../public/textures/", import.meta.url);
await mkdir(root, { recursive: true });
let prior = { assets: [] };
try {
  prior = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));
} catch {
  // Fresh cache: every asset downloads below.
}
const priorById = new Map(prior.assets.map((a) => [a.id, a]));
const manifest = { provider: "Poly Haven", assets: [] };
for (const id of [
  "asphalt_02",
  "grass_ground",
  "green_metal_rust",
  "rock_06",
  "concrete_floor_02",
  "concrete_layers_02",
  "cracked_red_ground",
  "dark_rock_02",
  "coast_sand_rocks_02",
  "brown_mud_leaves_01",
  "monastery_stone_floor",
  "blue_plaster_wall",
]) {
  const cached = priorById.get(id);
  const roles = ["diffuse", "normal", "roughness"];
  let disk = {};
  try {
    for (const role of roles)
      disk[role] = await readFile(new URL(`${id}_${role}.jpg`, root));
  } catch {
    disk = {};
  }
  if (cached && Object.keys(disk).length === 3) {
    // All maps cached: keep the recorded entry after verifying hashes, so API
    // drift for old assets can never break a re-run.
    const asset = { ...cached, maps: {} };
    for (const role of roles) {
      const sha256 = createHash("sha256").update(disk[role]).digest("hex");
      if (sha256 !== cached.maps[role].sha256)
        throw Error(`${id} ${role} changed on disk`);
      asset.maps[role] = {
        ...cached.maps[role],
        sha256,
        bytes: disk[role].length,
      };
    }
    manifest.assets.push(asset);
    console.log(`Kept ${id}`);
    continue;
  }
  const response = await fetch(`https://api.polyhaven.com/files/${id}`);
  if (!response.ok) throw Error(`${id}: ${response.status}`);
  const files = await response.json();
  const asset = {
    id,
    source: `https://polyhaven.com/a/${id}`,
    license: "CC0",
    maps: {},
  };
  for (const [role, keys] of [
    ["diffuse", ["Diffuse"]],
    ["normal", ["nor_gl"]],
    ["roughness", ["Rough", "arm"]],
  ]) {
    const key = keys.find((k) => files[k]?.["1k"]?.jpg);
    if (!key) throw Error(`Missing ${id} ${keys.join("/")}`);
    const map = files[key]["1k"].jpg;
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
