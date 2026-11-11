import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Prefab bases must not sit inside structural solids (container/barrier/support).
// Mounts (prefab base at/above the solid top, e.g. volcano on volcano-island) are fine.
const STRUCT = new Set(["container", "barrier", "support"]);

type Solid = {
  id: string;
  kind: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  yaw?: number;
  footprint?: { x: number; z: number }[];
};

function inside(s: Solid, x: number, z: number): boolean {
  const yaw = s.yaw ?? 0;
  const c = Math.cos(-yaw);
  const si = Math.sin(-yaw);
  const dx = x - s.x;
  const dz = z - s.z;
  const lx = dx * c - dz * si;
  const lz = dx * si + dz * c;
  if (s.footprint) {
    const p = s.footprint;
    let hit = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      if (
        (p[i].z > lz) !== (p[j].z > lz) &&
        lx < ((p[j].x - p[i].x) * (lz - p[i].z)) / (p[j].z - p[i].z) + p[i].x
      )
        hit = !hit;
    }
    return hit;
  }
  return Math.abs(lx) <= s.w / 2 && Math.abs(lz) <= s.d / 2;
}

it("keeps every official prefab base out of structural solid volumes", () => {
  const order = JSON.parse(
    readFileSync("levels/official/order.json", "utf8"),
  ) as { file: string }[];
  const embedded: string[] = [];
  for (const { file } of order) {
    const level = JSON.parse(
      readFileSync(`levels/official/${file}`, "utf8"),
    ) as {
      solids: Solid[];
      prefabs: { id: string; kind: string; x: number; z: number; y?: number }[];
    };
    const structs = level.solids.filter((s) => STRUCT.has(s.kind));
    for (const p of level.prefabs) {
      const py = p.y ?? 0;
      for (const s of structs) {
        if (!inside(s, p.x, p.z)) continue;
        const top = s.y + s.h / 2;
        const bot = s.y - s.h / 2;
        if (py > top - 0.5 || py < bot) continue;
        embedded.push(`${file}: ${p.id} in ${s.id}`);
      }
    }
  }
  expect(embedded).toEqual([]);
});
