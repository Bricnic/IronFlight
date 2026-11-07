import { expect, it } from "vitest";
import original from "../levels/official/Fairground.json";
import clone from "../levels/Fairground-Clone.json";
import type { CustomSolid } from "../src/custom-level";

const overlap = (a: CustomSolid, b: CustomSolid) =>
  Math.max(
    0,
    Math.min(a.x + a.w / 2, b.x + b.w / 2) -
      Math.max(a.x - a.w / 2, b.x - b.w / 2),
  ) *
  Math.max(
    0,
    Math.min(a.z + a.d / 2, b.z + b.d / 2) -
      Math.max(a.z - a.d / 2, b.z - b.d / 2),
  );
it("retains the foundation around every lava hole without overlapping ground pieces", () => {
  const lava = original.solids.filter(
    (s) => s.kind === "lava",
  ) as CustomSolid[];
  const ground = original.solids.filter((s) =>
    s.id.startsWith("fairground-foundation-cut-"),
  ) as CustomSolid[];
  expect(ground).toHaveLength(15);
  expect(ground.reduce((area, s) => area + s.w * s.d, 0)).toBe(
    560 * 560 - lava.reduce((a, p) => a + p.w * p.d, 0),
  );
  for (const s of ground) {
    expect(s).toMatchObject({
      kind: "ground",
      y: -0.65,
      h: 1.3,
      color: 0xb8be91,
      texture: "grass_ground",
      locked: true,
    });
    expect(s.w).toBeGreaterThan(0);
    expect(s.d).toBeGreaterThan(0);
    for (const pit of lava) expect(overlap(s, pit)).toBe(0);
  }
  for (let i = 0; i < ground.length; i++)
    for (let j = i + 1; j < ground.length; j++)
      expect(overlap(ground[i], ground[j])).toBe(0);
});
it("cuts all covering plaza layers too and applies identical repairs to the clone", () => {
  const lava = original.solids.filter(
    (s) => s.kind === "lava",
  ) as CustomSolid[];
  for (let i = 0; i < 6; i++) {
    const pieces = original.solids.filter((s) =>
      s.id.startsWith(`ride-plaza-${i}-cut-`),
    ) as CustomSolid[];
    expect(pieces).toHaveLength(4);
    expect(pieces.reduce((a, s) => a + s.w * s.d, 0)).toBe(64 * 64 - 12 * 8);
  }
  for (const floor of original.solids.filter(
    (s) => ["ground", "road"].includes(s.kind) && s.y + s.h / 2 <= 0.2,
  ))
    for (const pit of lava) expect(overlap(floor as CustomSolid, pit)).toBe(0);
  expect({ ...clone, name: original.name }).toEqual(original);
});
