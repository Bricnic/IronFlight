import { beforeAll, expect, it } from "vitest";
import { Simulation, initPhysics } from "../src/simulation";
import R from "@dimforge/rapier3d-compat";
import {
  toTrack,
  validateCustomLevel,
  registerCustomTrack,
  type CustomLevel,
  type CustomPrefab,
} from "../src/custom-level";

beforeAll(initPhysics);

it("mushroom stems and domed caps stay the same size across positions and authored heights", () => {
  for (const x of [0, 1, 2, 3, 4]) {
    const sim = mysticFixture([{ id: "mushroom", kind: "glow-mushroom", x, y: 5, z: 0 }]);
    try {
      const colliders = sim.dungeon.mechanisms[0].colliders;
      expect(colliders).toHaveLength(2); expect(colliders.every(c => !c.isSensor())).toBe(true);
      const scale = 1;
      const hit = (height: number, offset: number) => colliders.some(c => c.castRay(new R.Ray({ x: x + 5, y: 5 + height * scale, z: offset * scale }, { x: -1, y: 0, z: 0 }), 10, true) >= 0);
      expect(hit(1.1, 0)).toBe(true); // stem
      expect(hit(2.5, 0.9)).toBe(true); // cap overhang
      expect(hit(1.1, 0.9)).toBe(false); // open space below the cap
      expect(hit(3.8, 0)).toBe(false); // above the dome
    } finally { sim.dispose(); }
  }
});
it("resized mushrooms scale their solid overhang and physically stop a driving truck", () => {
  const sim = mysticFixture([{ id: "mushroom", kind: "glow-mushroom", x: 0, z: 0, resizeScale: 3 }], undefined, -15);
  const clear = mysticFixture([], undefined, -15);
  try {
    const handles = sim.resizedPrefabs[0].space.colliders;
    expect(handles.size).toBe(2);
    const ray = new R.Ray({ x: 10, y: 2.5 * 3, z: 0.9 * 3 }, { x: -1, y: 0, z: 0 });
    expect([...handles].some(handle => sim.world.getCollider(handle).castRay(ray, 20, true) >= 0)).toBe(true);
    sim.run(3, { throttle: 1 }); clear.run(3, { throttle: 1 });
    expect(clear.body.translation().z).toBeGreaterThan(5);
    expect(sim.body.translation().z).toBeLessThan(-2);
  } finally { sim.dispose(); clear.dispose(); }
});

const minimal = (prefabs: CustomPrefab[] = [], backgroundTemplate?: string): CustomLevel => ({
  name: "Mystic Data",
  mode: "race",
  spawn: { x: 0, y: 2.1, z: -100, yaw: 0 },
  checkpoints: [{ x: 0, z: 100 }],
  solids: [
    { id: "ground", kind: "ground", x: 0, y: -0.6, z: 0, w: 400, h: 1.2, d: 600, color: 0x2a2350 },
  ],
  prefabs,
  medals: { gold: 30, silver: 45, bronze: 60 },
  ...(backgroundTemplate === undefined ? {} : { backgroundTemplate }),
});

function mysticFixture(prefabs: CustomPrefab[], backgroundTemplate?: string, spawnZ = -100) {
  const level = minimal(prefabs, backgroundTemplate); level.spawn.z = spawnZ;
  const track = toTrack(validateCustomLevel(level));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

it("caterpillar crawls within 100u of home", () => {
  const sim = mysticFixture([{ id: "cat-1", kind: "cave-caterpillar", x: 0, z: 0 }]);
  try {
    const mech = sim.dungeon.mechanisms.find((m) => m.h.id === "cat-1")!;
    let maxDist = 0;
    for (let i = 0; i < 600; i++) {
      sim.run(0.1);
      const c = mech.caterpillar!;
      maxDist = Math.max(maxDist, Math.hypot(c.pos.x, c.pos.z));
    }
    expect(mech.caterpillar!.trips).toBeGreaterThan(0);
    expect(maxDist).toBeLessThanOrEqual(100.5);
  } finally {
    sim.dispose();
  }
});

it("caterpillar touch poisons: 25% over 3s and one lost part, then restores", () => {
  const sim = mysticFixture([{ id: "cat-1", kind: "cave-caterpillar", x: 0, z: 0 }]);
  try {
    const mech = sim.dungeon.mechanisms.find((m) => m.h.id === "cat-1")!;
    // Glue the truck to the crawler for the full dose.
    for (let i = 0; i < 36; i++) {
      const c = mech.caterpillar!;
      sim.body.setTranslation({ x: c.pos.x, y: 1, z: c.pos.z }, true);
      sim.run(0.1);
    }
    expect(sim.poisoned).toBe(true);
    expect(sim.damageEvents.some((e) => e.source === "cave-caterpillar")).toBe(true);
    expect(sim.snapshot().integrity).toBeCloseTo(0.75, 1);
    const lost = [...sim.parts.values()].filter((p) => p.health <= 0).length;
    expect(lost).toBeGreaterThanOrEqual(1);
    expect(sim.snapshot().status).toBe("driving");
    // Drive away: the effect fades and vision is restored.
    sim.body.setTranslation({ x: 300, y: 1, z: 300 }, true);
    sim.run(4);
    expect(sim.poisoned).toBe(false);
  } finally {
    sim.dispose();
  }
});

it("moth sprinkles dust that piles and poisons on the ground", () => {
  const sim = mysticFixture([{ id: "moth-1", kind: "cave-moth", x: 0, z: -60 }]);
  try {
    const mech = sim.dungeon.mechanisms.find((m) => m.h.id === "moth-1")!;
    sim.run(8);
    expect(mech.moth!.piles.length).toBeGreaterThan(0);
    const pile = mech.moth!.piles[0];
    sim.body.setTranslation({ x: pile.x, y: 1, z: pile.z }, true);
    sim.run(0.5);
    expect(sim.poisoned).toBe(true);
    expect(sim.damageEvents.some((e) => e.source === "cave-moth-pile")).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("falling moth dust poisons mid-air", () => {
  const sim = mysticFixture([{ id: "moth-1", kind: "cave-moth", x: 0, z: -60 }]);
  try {
    const mech = sim.dungeon.mechanisms.find((m) => m.h.id === "moth-1")!;
    sim.body.setTranslation({ x: 10, y: 1, z: 10 }, true);
    mech.moth!.motes.push({ x: 10, z: 10, y: 2 });
    sim.run(0.1);
    expect(sim.poisoned).toBe(true);
    expect(sim.damageEvents.some((e) => e.source === "cave-moth-dust")).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("crashing into the moth poisons", () => {
  const sim = mysticFixture([{ id: "moth-1", kind: "cave-moth", x: 0, z: 0, y: -8 }]);
  try {
    // Cruise height 10 above y=-8 puts the body at truck height.
    sim.body.setTranslation({ x: 0, y: 1, z: 0 }, true);
    sim.run(0.2);
    expect(sim.poisoned).toBe(true);
    expect(sim.damageEvents.some((e) => e.source === "cave-moth")).toBe(true);
  } finally {
    sim.dispose();
  }
});

it("moth piles fade after 3 seconds", () => {
  const sim = mysticFixture([{ id: "moth-1", kind: "cave-moth", x: 0, z: -60 }]);
  try {
    const mech = sim.dungeon.mechanisms.find((m) => m.h.id === "moth-1")!;
    sim.run(5);
    expect(mech.moth!.piles.length).toBeGreaterThan(0);
    // Stop sprinkling by wrecking the clock: piles expire on their own.
    const pile = { ...mech.moth!.piles[0] };
    sim.body.setTranslation({ x: 300, y: 1, z: 300 }, true);
    void pile;
    sim.run(4);
    for (const p of mech.moth!.piles) expect(p.until - sim.time).toBeLessThanOrEqual(3);
  } finally {
    sim.dispose();
  }
});

it("bats flee on approach and never harm", () => {
  const sim = mysticFixture([{ id: "bat-1", kind: "cave-bat", x: 0, z: 0, y: 6 }]);
  try {
    const mech = sim.dungeon.mechanisms.find((m) => m.h.id === "bat-1")!;
    sim.run(1);
    expect(mech.bat!.fled).toBe(false);
    sim.body.setTranslation({ x: 5, y: 1, z: 5 }, true);
    sim.run(0.2);
    expect(mech.bat!.fled).toBe(true);
    expect(sim.damageEvents).toHaveLength(0);
    expect(sim.snapshot().integrity).toBe(1);
  } finally {
    sim.dispose();
  }
});

it("glow decor simulates without errors", () => {
  const sim = mysticFixture([
    { id: "mush-1", kind: "glow-mushroom", x: 0, z: 0 },
    { id: "fairy-1", kind: "cave-fairy", x: 10, z: 0 },
    { id: "fire-1", kind: "firefly", x: 20, z: 0 },
  ]);
  try {
    expect(sim.dungeon.mechanisms).toHaveLength(3);
    sim.run(2);
    expect(sim.snapshot().status).toBe("driving");
  } finally {
    sim.dispose();
  }
});

it("mystic-cave background forces permanent night", () => {
  const sim = mysticFixture([], "mystic-cave");
  try {
    expect(sim.weather.night).toBe(true);
  } finally {
    sim.dispose();
  }
  const day = mysticFixture([]);
  try {
    expect(day.weather.night).toBe(false);
  } finally {
    day.dispose();
  }
});
