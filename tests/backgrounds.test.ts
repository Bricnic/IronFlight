import { expect, it } from "vitest";
import {
  DEFAULT_BACKGROUND_TEMPLATE,
  SHAPE_KINDS,
  backgroundForLevel,
  getBackgroundTemplate,
  layoutRing,
  listBackgroundTemplates,
  validateBackgroundTemplate,
} from "../src/backgrounds";

const template = (over: Record<string, unknown> = {}) => ({
  name: "test-meadow",
  sky: { top: 0x2f6fd0, horizon: 0xcfe3ef },
  fog: { color: 0xcfe3ef, near: 140, far: 600 },
  sun: { color: 0xffe3af, intensity: 3.5 },
  hemi: { sky: 0xe5f0ff, ground: 0x514733, intensity: 2 },
  env: 0.7,
  shapes: [
    {
      kind: "hill",
      texture: "grass_ground",
      count: 8,
      radius: 300,
      size: [40, 90],
    },
  ],
  clouds: {
    count: 10,
    y: [90, 150],
    radius: [240, 480],
    color: 0xffffff,
    opacity: 0.9,
    drift: 1.5,
  },
  ...over,
});

it("accepts a complete template and round-trips it", () => {
  expect(validateBackgroundTemplate(template())).toEqual(template());
});

it("accepts minimal shapes without texture, y, seed, color or arc", () => {
  const t = validateBackgroundTemplate(
    template({ shapes: [{ kind: "moon", count: 1, radius: 500, size: [18, 18] }] }),
  );
  expect(t.shapes).toHaveLength(1);
});

it("accepts templates without clouds", () => {
  const { clouds: _dropped, ...rest } = template();
  expect(validateBackgroundTemplate(rest).clouds).toBeUndefined();
});

it.each([
  ["name", { name: "" }],
  ["sky.top", template({ sky: { top: -1, horizon: 0 } })],
  ["sky.horizon", template({ sky: { top: 0, horizon: 0x1000000 } })],
  ["fog range", template({ fog: { color: 0, near: 600, far: 140 } })],
  ["fog color", template({ fog: { color: -5, near: 1, far: 2 } })],
  ["sun intensity", template({ sun: { color: 0, intensity: -1 } })],
  ["hemi intensity", template({ hemi: { sky: 0, ground: 0, intensity: NaN } })],
  ["env", template({ env: 3 })],
  ["underground", template({ underground: "yes" })],
  ["shape kind", template({ shapes: [{ kind: "ufo", count: 1, radius: 1, size: [1, 1] }] })],
  ["shape texture", template({ shapes: [{ kind: "hill", texture: "nope", count: 1, radius: 1, size: [1, 1] }] })],
  ["shape count", template({ shapes: [{ kind: "hill", count: 0, radius: 1, size: [1, 1] }] })],
  ["shape radius", template({ shapes: [{ kind: "hill", count: 1, radius: -2, size: [1, 1] }] })],
  ["shape size", template({ shapes: [{ kind: "hill", count: 1, radius: 1, size: [9, 2] }] })],
  ["cloud opacity", template({ clouds: { count: 1, y: [1, 2], radius: [1, 2], color: 0, opacity: 2, drift: 0 } })],
  ["cloud drift", template({ clouds: { count: 1, y: [1, 2], radius: [1, 2], color: 0, opacity: 0.5, drift: -1 } })],
  ["cloud y", template({ clouds: { count: 1, y: [5, 1], radius: [1, 2], color: 0, opacity: 0.5, drift: 0 } })],
])("rejects invalid templates (%s)", (_label, input) => {
  expect(() => validateBackgroundTemplate(input)).toThrow();
});

it("exposes the documented shape kinds", () => {
  expect([...SHAPE_KINDS].sort()).toEqual(
    [
      "hill",
      "mountain",
      "snow-peak",
      "mesa",
      "tree",
      "dead-tree",
      "skyscraper",
      "container-stack",
      "crane",
      "smokestack",
      "tent",
      "toy-block",
      "rock-wall",
      "moon",
    ].sort(),
  );
});

it("falls back to the default template for unknown names", () => {
  expect(DEFAULT_BACKGROUND_TEMPLATE).toBe("pastoral-hills");
  expect(getBackgroundTemplate(undefined).name).toBe("pastoral-hills");
  expect(getBackgroundTemplate("no-such-template").name).toBe("pastoral-hills");
});

it("ships a valid template for every planned landscape", () => {
  const names = listBackgroundTemplates();
  for (const name of [
    "pastoral-hills",
    "harbor-docks",
    "foundry-district",
    "city-skyline",
    "scrapyard-flats",
    "volcanic-fields",
    "desert-mesas",
    "haunted-night",
    "alpine-peaks",
    "fairground-park",
    "cavern-dark",
    "toybox-volcano",
    "ember-dusk",
  ])
    expect(names, name).toContain(name);
  for (const name of names)
    expect(() => getBackgroundTemplate(name), name).not.toThrow();
});

it("lays out deterministic ring slots inside the radius band", () => {
  const a = layoutRing(12, 300, 7);
  expect(a).toHaveLength(12);
  expect(layoutRing(12, 300, 7)).toEqual(a);
  expect(layoutRing(12, 300, 8)).not.toEqual(a);
  expect(layoutRing(0, 300, 7)).toEqual([]);
  for (const slot of a) {
    expect(Number.isFinite(slot.x + slot.z)).toBe(true);
    const r = Math.hypot(slot.x, slot.z);
    expect(r).toBeGreaterThanOrEqual(300 * 0.9);
    expect(r).toBeLessThanOrEqual(300 * 1.1);
    expect(slot.scale).toBeGreaterThan(0);
  }
  expect(new Set(a.map((s) => s.angle)).size).toBe(12);
});

it("picks backgrounds from level character", () => {
  expect(
    backgroundForLevel({ name: "Deep Delve", mode: "race", underground: true }),
  ).toBe("cavern-dark");
  expect(backgroundForLevel({ name: "Harbor Dash", mode: "race" })).toBe(
    "harbor-docks",
  );
  expect(backgroundForLevel({ name: "Neon City GP", mode: "race" })).toBe(
    "city-skyline",
  );
  expect(backgroundForLevel({ name: "Canyon Run", mode: "race" })).toBe(
    "desert-mesas",
  );
  expect(backgroundForLevel({ name: "Ghost Graveyard", mode: "race" })).toBe(
    "haunted-night",
  );
  expect(backgroundForLevel({ name: "Volcano Rush", mode: "race" })).toBe(
    "volcanic-fields",
  );
  expect(backgroundForLevel({ name: "Ember Trial", mode: "race" })).toBe(
    "ember-dusk",
  );
  expect(backgroundForLevel({ name: "Sky High", mode: "race" })).toBe(
    "alpine-peaks",
  );
  expect(backgroundForLevel({ name: "Fair Fun", mode: "race" })).toBe(
    "fairground-park",
  );
  expect(backgroundForLevel({ name: "Foundry Floor", mode: "race" })).toBe(
    "foundry-district",
  );
  expect(backgroundForLevel({ name: "Cave Quest", mode: "race" })).toBe(
    "cavern-dark",
  );
  expect(backgroundForLevel({ name: "Raptor Race", mode: "race" })).toBe(
    "toybox-volcano",
  );
  expect(backgroundForLevel({ name: "Junk Yard", mode: "race" })).toBe(
    "scrapyard-flats",
  );
  expect(backgroundForLevel({ name: "Meadow Cruise", mode: "race" })).toBe(
    "pastoral-hills",
  );
});

it("falls back by mode when the name matches nothing", () => {
  expect(backgroundForLevel({ name: "Zzxq", mode: "arena" })).toBe(
    "scrapyard-flats",
  );
  expect(backgroundForLevel({ name: "Zzxq", mode: "demolition" })).toBe(
    "haunted-night",
  );
  expect(backgroundForLevel({ name: "Zzxq", mode: "race" })).toBe(
    "pastoral-hills",
  );
});

it("renders cavern-dark against pure black sky and fog", () => {
  const t = getBackgroundTemplate("cavern-dark");
  expect(t.sky.top).toBe(0);
  expect(t.sky.horizon).toBe(0);
  expect(t.fog.color).toBe(0);
});
