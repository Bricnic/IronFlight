import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  applyTextEdits,
  planPair,
  scanLevel,
  type ZLevel,
  type ZSolid,
} from "../scripts/level-zfight.mjs";

const box = (id: string, x: number, z: number, w: number, d: number, color: number): ZSolid => ({
  id, x, y: 9.675, z, w, h: 1.35, d, color,
});

// Jurassic start-pad pattern: one trim bar crossing two rails.
const trimLevel = (): ZLevel => ({
  solids: [
    box("start-back", -110.5, 50, 1, 22, 16314584),
    box("start-inner", -89, 39.4, 44, 0.8, 1277585),
    box("start-outer", -89, 60.6, 44, 0.8, 11877689),
  ],
});

// Chompworks finish pattern: thin slanted strip poking into a trapezoid.
const stripLevel = (): ZLevel => ({
  solids: [
    {
      id: "toy-road-24", x: 76.053301, y: 8.4, z: 31.798491,
      w: 18.797186, h: 1.2, d: 21.600742, color: 2391737,
      footprint: [
        { x: -6.291991, z: -9.037182 }, { x: 9.398593, z: 6.653403 },
        { x: 3.994157, z: 10.800371 }, { x: -7.100759, z: -8.416592 },
      ],
    },
    {
      id: "toy-road-54", x: 92.5, y: 8.4, z: 53,
      w: 28.08079, h: 1.2, d: 22, color: 15755800,
      footprint: [
        { x: -13.5, z: 11 }, { x: -13.5, z: -11 },
        { x: 12.959605, z: -11 }, { x: 14.040395, z: 11 },
      ],
    },
  ],
});

// Mirror the CLI loop: plan, apply one edit, re-parse, repeat to a fixpoint.
function clipToFixpoint(raw: string, passes = 6): { raw: string; remaining: number } {
  let cur = raw;
  for (let i = 0; i < passes; i++) {
    const level = JSON.parse(cur) as ZLevel;
    const { suspects } = scanLevel(level);
    if (!suspects.length) return { raw: cur, remaining: 0 };
    const p = planPair(level, suspects[0]);
    if (!("edits" in p)) return { raw: cur, remaining: suspects.length };
    cur = applyTextEdits(cur, level, p.edits);
  }
  return { raw: cur, remaining: scanLevel(JSON.parse(cur) as ZLevel).suspects.length };
}

it("clips a crossing trim bar one-sided without touching the rails", () => {
  const level = trimLevel();
  expect(scanLevel(level).suspects).toHaveLength(2);
  for (const q of scanLevel(level).suspects) {
    const p = planPair(level, q);
    expect(p).toHaveProperty("edits");
    if ("edits" in p) expect(p.edits.map((e) => e.id)).toEqual(["start-back"]);
  }
  const { raw, remaining } = clipToFixpoint(JSON.stringify({ solids: level.solids }));
  expect(remaining).toBe(0);
  const fixed = JSON.parse(raw) as ZLevel;
  const back = fixed.solids.find((s) => s.id === "start-back")!;
  expect(back.z).toBeCloseTo(50, 3);
  expect(back.d).toBeCloseTo(20.4, 3);
  // Rails untouched.
  expect(fixed.solids.find((s) => s.id === "start-inner")).toEqual(level.solids[1]);
});

it("resolves a slanted strip in a trapezoid exactly, with clean footprints", () => {
  const level = stripLevel();
  const { suspects } = scanLevel(level);
  expect(suspects).toHaveLength(1);
  expect(suspects[0].area).toBeCloseTo(0.34, 1);
  const p = planPair(level, suspects[0]);
  expect(p).toHaveProperty("edits");
  const { raw, remaining } = clipToFixpoint(JSON.stringify({ solids: level.solids }));
  expect(remaining).toBe(0);
  const fixed = JSON.parse(raw) as ZLevel;
  for (const s of fixed.solids) {
    const fp = s.footprint!;
    expect(fp.length).toBeLessThanOrEqual(6);
    const keys = fp.map((v) => `${v.x},${v.z}`);
    expect(new Set(keys).size).toBe(keys.length);
  }
});

it("keeps an unchanged box center instead of throwing", () => {
  // Symmetric trim: z stays 50, only d changes. The writer must not treat the
  // identical z replacement as a missing key.
  const level = trimLevel();
  const poly = [
    { x: -111, z: 39.8 }, { x: -110, z: 39.8 },
    { x: -110, z: 60.2 }, { x: -111, z: 60.2 },
  ];
  const raw = JSON.stringify({ solids: level.solids });
  const out = applyTextEdits(raw, level, [{ id: "start-back", poly }]);
  expect(out).toContain('"z":50');
  expect(out).toContain('"d":20.4');
});

it("edits the exact id block when one id prefixes another", () => {
  const level: ZLevel = {
    solids: [
      box("toy-road-20", 10, 35, 48, 22, 2391737),
      box("toy-road-2", 10, 35, 10, 22, 15755800),
    ],
  };
  const line20 = JSON.stringify(level.solids[0]);
  const line2 = JSON.stringify(level.solids[1]);
  const raw = `{"solids":\n[${line20},\n${line2}\n]}`;
  const poly = [
    { x: 5, z: 26 }, { x: 15, z: 26 },
    { x: 15, z: 46 }, { x: 5, z: 46 },
  ];
  const out = applyTextEdits(raw, level, [{ id: "toy-road-2", poly }]);
  expect(out).toContain(line20);
  expect(out).not.toContain(line2);
  expect(out).toContain('"id":"toy-road-2","x":10,"y":9.675,"z":36');
});

it("official lineup has no coplanar top-face suspects", () => {
  const dir = new URL("../levels/official/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "order.json");
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) {
    const level = JSON.parse(readFileSync(new URL(f, dir), "utf8")) as ZLevel;
    const { suspects } = scanLevel(level);
    expect(suspects, `${f}: ${JSON.stringify(suspects)}`).toEqual([]);
  }
});
