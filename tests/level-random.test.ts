import { beforeAll, expect, it } from "vitest";
import { initPhysics } from "../src/simulation";
import { validateCustomLevel } from "../src/custom-level";
import {
  BLOCKING_ELIGIBLE,
  FLANK_MIN,
  GENERATOR_CLEARANCE,
  RANDOM_DEFAULTS,
  RANDOM_IDEAL_MIN,
  generateRandomLevel,
  nextAvailableName,
  type RandomLevelParams,
} from "../src/level-random";
import { driveGeneratedLevelToCompletion } from "./level-random-drive";

beforeAll(initPhysics);

const defaults = (): RandomLevelParams => ({
  checkpoints: RANDOM_DEFAULTS.checkpoints,
  lethals: RANDOM_DEFAULTS.lethals,
  decor: RANDOM_DEFAULTS.decor,
  blockingPercent: RANDOM_DEFAULTS.blockingPercent,
  theme: RANDOM_DEFAULTS.theme,
  width: RANDOM_DEFAULTS.width,
  length: RANDOM_DEFAULTS.length,
  name: RANDOM_DEFAULTS.name,
});

function pathOf(level: ReturnType<typeof generateRandomLevel>) {
  return [
    { x: level.spawn.x, z: level.spawn.z },
    ...level.checkpoints.map((c) => ({ x: c.x, z: c.z })),
  ];
}

function distToPath(p: { x: number; z: number }, path: { x: number; z: number }[]) {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dx = b.x - a.x, dz = b.z - a.z;
    const lenSq = dx * dx + dz * dz;
    const t = lenSq
      ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq))
      : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t)));
  }
  return best;
}

it("generates a valid race with the requested counts at defaults", () => {
  const level = generateRandomLevel(defaults(), 1);
  expect(() => validateCustomLevel(level)).not.toThrow();
  expect(level.mode).toBe("race");
  expect(level.name).toBe("New-Level-001");
  expect(level.checkpoints).toHaveLength(3);
  expect(level.checkpoints.at(-1)!.name).toBe("Finish");
  expect(level.prefabs).toHaveLength(20);
  expect(level.medals.gold).toBeGreaterThan(0);
  expect(level.medals.silver).toBeGreaterThan(level.medals.gold);
  expect(level.medals.bronze).toBeGreaterThan(level.medals.silver);
  expect(level.limit).toBeDefined();
  expect(level.medals.bronze).toBeLessThanOrEqual(level.limit!);
  const ground = level.solids.find((s) => s.id === "ground")!;
  expect(ground.w).toBe(400);
  expect(ground.d).toBe(400);
});

it("uses each theme's own background and prefab pools", () => {
  const expectations: Record<
    string,
    { bg: string; lethal: string[]; decor: string[] }
  > = {
    toys: {
      bg: "pastoral-hills",
      lethal: ["book", "teeth", "computer", "flippers", "donut"],
      decor: ["lamp", "sign", "trash", "barrel", "skull", "pumpkin"],
    },
    christmas: {
      bg: "christmas-village",
      lethal: [
        "christmas-nutcracker",
        "christmas-ice-vice",
        "christmas-toy-chomper",
        "christmas-yeti-jaws",
        "christmas-ornament-slammer",
        "christmas-sleigh-crusher",
        "christmas-icicle-shears",
        "christmas-tinsel-snapper",
      ],
      decor: [
        "christmas-tree",
        "christmas-light-arch",
        "christmas-market-stall",
        "christmas-lantern",
        "christmas-gift-wall",
        "christmas-reindeer",
        "christmas-ornament",
        "christmas-snow-boulder",
        "christmas-cracker-barrel",
        "christmas-gift-crate",
        "christmas-cocoa-cart",
      ],
    },
    ice: {
      bg: "alpine-peaks",
      lethal: [
        "christmas-ice-vice",
        "christmas-yeti-jaws",
        "christmas-icicle-shears",
        "christmas-tinsel-snapper",
      ],
      decor: [
        "christmas-lantern",
        "christmas-reindeer",
        "snowman",
        "christmas-snow-boulder",
      ],
    },
    carnival: {
      bg: "fairground-park",
      lethal: ["hammer", "dragon", "ghost"],
      decor: [
        "carousel",
        "bumper-arena",
        "loop",
        "lamp",
        "trampoline",
        "hot-air-balloon",
      ],
    },
    dungeon: {
      bg: "cavern-dark",
      lethal: ["hands", "scissors", "clippers", "cup", "clip", "robot", "lime-chomper"],
      decor: ["cage", "candle", "jail-cell", "flagpole", "gravestone", "skull"],
    },
  };
  for (const [theme, want] of Object.entries(expectations)) {
    const level = generateRandomLevel(
      { ...defaults(), theme: theme as RandomLevelParams["theme"], name: `Theme ${theme}` },
      7,
    );
    expect(level.backgroundTemplate).toBe(want.bg);
    for (const p of level.prefabs) {
      const pool = p.id.startsWith("lethal-") ? want.lethal : want.decor;
      expect(pool, `${theme}:${p.id} kind ${p.kind}`).toContain(p.kind);
    }
    // Round-robin covers small lethal pools fully.
    if (want.lethal.length <= 5)
      for (const kind of want.lethal)
        expect(
          level.prefabs.some((p) => p.kind === kind),
          `${theme} lethal ${kind}`,
        ).toBe(true);
  }
  const random = generateRandomLevel({ ...defaults(), name: "Theme random" }, 9);
  expect([
    "pastoral-hills",
    "christmas-village",
    "alpine-peaks",
    "fairground-park",
    "cavern-dark",
  ]).toContain(random.backgroundTemplate);
});

it("keeps every flanked prefab at its clearance from the path", () => {
  for (const theme of ["toys", "christmas", "ice", "carnival", "dungeon"] as const) {
    const level = generateRandomLevel(
      { ...defaults(), theme, lethals: 12, decor: 12, name: `Clear ${theme}` },
      3,
    );
    const path = pathOf(level);
    for (const p of level.prefabs) {
      const need = GENERATOR_CLEARANCE[p.kind];
      if (need === undefined || p.kind === "ghost") continue;
      const dist = distToPath(p, path);
      if (dist < 8) {
        expect(
          BLOCKING_ELIGIBLE[theme],
          `${theme}:${p.id} blocking kind ${p.kind}`,
        ).toContain(p.kind);
        continue;
      }
      const floor = p.id.startsWith("lethal-")
        ? Math.max(need, FLANK_MIN) - 0.5
        : need - 0.5;
      expect(dist, `${theme}:${p.id} (${p.kind}) clearance`).toBeGreaterThanOrEqual(
        floor,
      );
    }
  }
});

it("blocks the path with the requested percentage of lethals", () => {
  for (const [pct, seeds] of [[0, [1]], [40, [1, 2]], [100, [1]]] as const) {
    for (const seed of seeds) {
      const lethals = 10;
      const level = generateRandomLevel(
        { ...defaults(), blockingPercent: pct, lethals, name: `Block ${pct}-${seed}` },
        seed,
      );
      const path = pathOf(level);
      const blocking = level.prefabs.filter(
        (p) =>
          p.kind in GENERATOR_CLEARANCE &&
          p.kind !== "ghost" &&
          distToPath(p, path) < 8,
      );
      expect(blocking, `${pct}% seed ${seed}`).toHaveLength(
        Math.round((lethals * pct) / 100),
      );
    }
  }
});

it("rejects bad parameters and too-short courses", () => {
  expect(() => generateRandomLevel({ ...defaults(), checkpoints: 0 }, 1)).toThrow();
  expect(() => generateRandomLevel({ ...defaults(), width: 100 }, 1)).toThrow();
  expect(() =>
    generateRandomLevel(
      { ...defaults(), checkpoints: 1, width: 150, length: 150 },
      1,
    ),
  ).toThrow(/too short/);
  expect(() =>
    generateRandomLevel({ ...defaults(), lethals: 100, blockingPercent: 100 }, 1),
  ).toThrow(/Too many blocking traps/);
});

it("allocates the next free numbered name", () => {
  expect(nextAvailableName("New-Level-001", [], [])).toBe("New-Level-001");
  expect(nextAvailableName("New-Level-001", ["New-Level-001"], [])).toBe("New-Level-002");
  expect(
    nextAvailableName("New-Level-009", ["New-Level-009"], []),
  ).toBe("New-Level-010");
  expect(nextAvailableName("Arena", ["Arena"], [])).toBe("Arena-002");
  expect(nextAvailableName("Arena", ["Arena", "Arena-002"], [])).toBe("Arena-003");
  expect(nextAvailableName("Dungeon", [], ["custom:dungeon"])).toBe("Dungeon-002");
});

it("needs at least 30 seconds on the ideal line like the import gate", () => {
  for (const seed of [1, 2, 3]) {
    const level = generateRandomLevel({ ...defaults(), name: `Ideal ${seed}` }, seed);
    const path = pathOf(level);
    let poly = 0;
    for (let i = 1; i < path.length; i++)
      poly += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
    const ideal = poly / 12.7;
    expect(ideal, `seed ${seed}`).toBeGreaterThanOrEqual(RANDOM_IDEAL_MIN);
    expect(ideal, "gold achievable").toBeLessThanOrEqual(level.medals.gold);
  }
});

it("beats generated levels back to back across every theme", () => {
  const themes = ["toys", "christmas", "ice", "carnival", "dungeon", "random"] as const;
  themes.forEach((theme, i) => {
    const level = generateRandomLevel(
      { ...defaults(), theme, name: `Streak ${theme}` },
      i + 1,
    );
    const elapsed = driveGeneratedLevelToCompletion(level);
    expect(elapsed, `${theme} within limit`).toBeLessThan(level.limit!);
  });
}, 180000);

it("beats the 0% and 100% blocking extremes", () => {
  const open = generateRandomLevel(
    { ...defaults(), theme: "dungeon", blockingPercent: 0, name: "Streak open" },
    21,
  );
  expect(driveGeneratedLevelToCompletion(open)).toBeLessThan(open.limit!);
  const gauntlet = generateRandomLevel(
    { ...defaults(), theme: "toys", blockingPercent: 100, name: "Streak gauntlet" },
    22,
  );
  expect(driveGeneratedLevelToCompletion(gauntlet)).toBeLessThan(gauntlet.limit!);
}, 120000);
