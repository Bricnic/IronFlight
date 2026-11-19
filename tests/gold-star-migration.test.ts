import { expect, it } from "vitest";
import { GoldStars } from "../src/gold-stars";
import {
  isStarRelocated,
  relocatedStarKeys,
} from "../src/gold-star-migrations";

function memory(seed?: string) {
  const map = new Map<string, string>();
  if (seed !== undefined) map.set("iron-flight-gold-stars-v1", seed);
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    raw: () => map.get("iron-flight-gold-stars-v1"),
  };
}

const STAR = { id: "gold-star-1", x: 30, y: 2.1, z: -60 };

it("loads legacy string-array records as found with explicitly missing coords", () => {
  const bank = new GoldStars(
    memory(
      JSON.stringify({
        version: 1,
        banked: { "foundry-run": ["gold-star-1"] },
      }),
    ),
  );
  expect(bank.has("foundry-run", "gold-star-1")).toBe(true);
  expect(bank.coords("foundry-run", "gold-star-1")).toBeNull();
  expect(bank.stars("foundry-run")).toEqual(["gold-star-1"]);
});

it("banks coordinates on collect and persists them", () => {
  const storage = memory();
  const bank = new GoldStars(storage);
  expect(bank.collect("foundry-run", "gold-star-1", { x: 30, y: 2.1, z: -60 })).toBe(
    true,
  );
  expect(bank.coords("foundry-run", "gold-star-1")).toEqual({
    x: 30,
    y: 2.1,
    z: -60,
  });
  expect(JSON.parse(storage.raw()!)).toEqual({
    version: 1,
    banked: {
      "foundry-run": {
        "gold-star-1": { found: true, coords: { x: 30, y: 2.1, z: -60 } },
      },
    },
  });
  const reloaded = new GoldStars(storage);
  expect(reloaded.coords("foundry-run", "gold-star-1")).toEqual({
    x: 30,
    y: 2.1,
    z: -60,
  });
});

it("re-collect refreshes missing or moved coords but is not a new collect", () => {
  const bank = new GoldStars(
    memory(
      JSON.stringify({
        version: 1,
        banked: { "foundry-run": ["gold-star-1"] },
      }),
    ),
  );
  expect(
    bank.collect("foundry-run", "gold-star-1", { x: 30, y: 2.1, z: -60 }),
  ).toBe(false);
  expect(bank.coords("foundry-run", "gold-star-1")).toEqual({
    x: 30,
    y: 2.1,
    z: -60,
  });
  expect(
    bank.collect("foundry-run", "gold-star-1", { x: 1, y: 2, z: 3 }),
  ).toBe(false);
  expect(bank.coords("foundry-run", "gold-star-1")).toEqual({ x: 1, y: 2, z: 3 });
});

it("rejects invalid coords and keeps corrupt records unplayable-safe", () => {
  const bank = new GoldStars(memory());
  expect(
    bank.collect("foundry-run", "gold-star-1", { x: NaN, y: 2, z: 3 }),
  ).toBe(false);
  expect(bank.has("foundry-run", "gold-star-1")).toBe(false);
  const junk = new GoldStars(
    memory(
      JSON.stringify({
        version: 1,
        banked: {
          "foundry-run": {
            "gold-star-1": { found: true, coords: { x: 1, y: "no", z: 3 } },
            "": { found: true },
            "gold-star-2": { found: false },
          },
        },
      }),
    ),
  );
  // Invalid coords degrade to found-without-coords, like legacy records.
  expect(junk.has("foundry-run", "gold-star-1")).toBe(true);
  expect(junk.coords("foundry-run", "gold-star-1")).toBeNull();
  expect(junk.stars("foundry-run")).toEqual(["gold-star-1"]);
});

it("level-select lit check keeps legacy records valid unless relocated", () => {
  const legacy = new GoldStars(
    memory(
      JSON.stringify({
        version: 1,
        banked: { "foundry-run": ["gold-star-1"] },
      }),
    ),
  );
  // Non-relocated: found-only, legacy records stay lit.
  expect(legacy.isLit("foundry-run", STAR, false)).toBe(true);
  // Relocated: missing coords count as stale.
  expect(legacy.isLit("foundry-run", STAR, true)).toBe(false);

  const current = new GoldStars(memory());
  current.collect("foundry-run", "gold-star-1", { x: 30, y: 2.1, z: -60 });
  expect(current.isLit("foundry-run", STAR, true)).toBe(true);
  expect(current.isLit("foundry-run", STAR, false)).toBe(true);
  // Relocated: any coordinate drift unlights the star.
  expect(
    current.isLit("foundry-run", { ...STAR, x: 31 }, true),
  ).toBe(false);
  expect(
    current.isLit("foundry-run", { ...STAR, y: 2.2 }, true),
  ).toBe(false);
  expect(
    current.isLit("foundry-run", { ...STAR, z: -61 }, true),
  ).toBe(false);
  // Never collected: unlit either way.
  expect(current.isLit("foundry-run", { ...STAR, id: "gold-star-2" }, false)).toBe(
    false,
  );
  expect(current.isLit("foundry-run", { ...STAR, id: "gold-star-2" }, true)).toBe(
    false,
  );
});

it("relocation registry holds only trackId:starId -> true entries", () => {
  for (const key of relocatedStarKeys()) {
    expect(key).toContain(":");
    const starId = key.slice(key.lastIndexOf(":") + 1);
    expect(starId.length).toBeGreaterThan(0);
  }
  expect(isStarRelocated("no-such-track", "gold-star-1")).toBe(false);
});
