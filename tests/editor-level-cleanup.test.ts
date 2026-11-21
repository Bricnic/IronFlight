import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { validateCustomLevel } from "../src/custom-level";
import { scanLevel } from "../scripts/level-zfight.mjs";

it("Amber Undertow has no overlapping coplanar tiles, including same-color tiles", () => {
  const level = validateCustomLevel(JSON.parse(readFileSync("levels/official/industrial-mayhem/Amber Undertow.json", "utf8")));
  // Give every tile a different scan color so identical materials cannot mask overlaps.
  const solids = level.solids.filter(s => s.kind === "tile").map((s, color) => ({ ...s, color, footprint: s.footprint?.map(p => ({ ...p })) }));
  expect(scanLevel({ solids }).suspects).toEqual([]);
  const pieces = solids.filter(s => s.id.startsWith("copper-alternative-0-piece-"));
  expect(pieces.length).toBeGreaterThan(0);
  expect(new Set(pieces.map(s => s.group))).toEqual(new Set(["Copper side passage"]));
});

it("North Pole Summit organizes each ice patch into its own persistent group", () => {
  const level = validateCustomLevel(JSON.parse(readFileSync("levels/official/winter-wonderland/North Pole Summit.json", "utf8")));
  const ice = level.prefabs.filter(p => p.kind === "fragile-ice");
  expect(ice).toHaveLength(5073);
  const patches = new Map<string, Set<string | undefined>>();
  for (const p of ice) {
    const patch = p.id.match(/^np-(?:ice|lake|auto)-[^-]+/)![0];
    if (!patches.has(patch)) patches.set(patch, new Set());
    patches.get(patch)!.add(p.group);
    expect(p.group, p.id).toBeTruthy();
  }
  expect(patches.size).toBe(53);
  for (const names of patches.values()) expect(names.size).toBe(1);
  expect(new Set(ice.map(p => p.group)).size).toBe(53);
});
