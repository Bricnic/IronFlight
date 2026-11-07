import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import * as T from "three";
import { Simulation, initPhysics } from "../src/simulation";
import {
  dungeonHazards,
  snapOpenness,
  snapStriking,
  SNAP_CYCLE,
  SNAP_STRIKE_START,
  DUNGEON_STRIKE,
  type DungeonKind,
} from "../src/dungeon-hazards";
import {
  buildDungeonModel,
  buildSkeletonMesh,
  buildSkullMesh,
  DungeonView,
} from "../src/dungeon-view";
import { buildTreasureChest, chestStats } from "../src/course-view";
import { objectiveCopy } from "../src/run-copy";
import { validateTracks } from "../src/tracks";
import original from "../levels/official/Dungeon.json";
import clone from "../levels/Clone Dungeon.json";
import {
  PREFAB_KINDS,
  DUNGEON_PREFAB_KINDS,
  PROP_PREFAB_KINDS,
  COLLECTIBLE_KINDS,
  toTrack,
  validateCustomLevel,
  registerCustomTrack,
  type CustomLevel,
  type CustomPrefab,
} from "../src/custom-level";
import { courseProps, courseSolids } from "../src/course";

beforeAll(initPhysics);

const minimal = (prefabs: CustomPrefab[] = []): CustomLevel => ({
  name: "Dungeon Data",
  mode: "race",
  spawn: { x: 0, y: 2.1, z: -100, yaw: 0 },
  checkpoints: [{ x: 0, z: 100 }],
  solids: [
    {
      id: "ground",
      kind: "ground",
      x: 0,
      y: -0.6,
      z: 0,
      w: 200,
      h: 1.2,
      d: 400,
      color: 0x6d817c,
    },
  ],
  prefabs,
  medals: { gold: 30, silver: 45, bronze: 60 },
});

it("knows every dungeon prefab kind the palette needs", () => {
  for (const kind of [
    "hands",
    "scissors",
    "clippers",
    "cage",
    "jail-cell",
    "candle",
    "skull",
  ])
    expect(PREFAB_KINDS).toContain(kind);
  for (const kind of [
    "hands",
    "scissors",
    "clippers",
    "cage",
    "jail-cell",
    "candle",
  ])
    expect(DUNGEON_PREFAB_KINDS).toContain(kind);
  expect(PROP_PREFAB_KINDS).toContain("skull");
});

it("validates ring and chest collectible kinds and rejects unknown ones", () => {
  const level = validateCustomLevel({
    ...minimal(),
    name: "Chest Arena",
    mode: "arena",
    checkpoints: [],
    collectibles: [
      { x: 10, z: 10 },
      { x: -10, z: -10, kind: "chest" },
      { x: 0, z: 20, kind: "ring" },
    ],
    limit: 120,
  });
  expect(level.collectibles).toHaveLength(3);
  expect(() =>
    validateCustomLevel({
      ...minimal(),
      name: "Bogus Arena",
      mode: "arena",
      checkpoints: [],
      collectibles: [{ x: 0, z: 0, kind: "crown" }],
      limit: 120,
    }),
  ).toThrow(/collectible/);
  expect(COLLECTIBLE_KINDS).toEqual(["ring", "chest"]);
});

it("maps chest collectibles onto tracks with a ring default", () => {
  const track = toTrack(
    validateCustomLevel({
      ...minimal(),
      name: "Chest Map",
      mode: "arena",
      checkpoints: [],
      collectibles: [
        { x: 10, z: 10 },
        { x: -10, z: -10, kind: "chest" },
      ],
      limit: 120,
    }),
  );
  expect(track.collectibles).toHaveLength(2);
  expect(track.collectibles[0].kind).toBe("ring");
  expect(track.collectibles[1].kind).toBe("chest");
  expect(track.collectibles[1].radius).toBe(3.5);
});

it("dungeon hazards and decor accept yaw but not pitch or roll", () => {
  for (const kind of [
    "hands",
    "scissors",
    "clippers",
    "cage",
    "jail-cell",
    "candle",
  ]) {
    expect(
      () =>
        validateCustomLevel(
          minimal([{ id: "p-1", kind, x: 0, z: 0, yaw: Math.PI / 2 }]),
        ),
      kind,
    ).not.toThrow();
    expect(() =>
      validateCustomLevel(
        minimal([{ id: "p-1", kind, x: 0, z: 0, angle: 0.1 }]),
      ),
    ).toThrow(/pitch/);
    expect(() =>
      validateCustomLevel(
        minimal([{ id: "p-1", kind, x: 0, z: 0, roll: 0.1 }]),
      ),
    ).toThrow(/roll/);
  }
});

it("maps the underground flag onto tracks", () => {
  expect(toTrack(validateCustomLevel(minimal())).underground).toBeUndefined();
  const track = toTrack(
    validateCustomLevel({ ...minimal(), underground: true }),
  );
  expect(track.underground).toBe(true);
  expect(() =>
    validateCustomLevel({ ...minimal(), underground: "yes" }),
  ).toThrow(/underground/);
});

it("candle flames flicker over time", () => {
  const sim = dungeonFixture([{ id: "candle-1", kind: "candle", x: 0, z: 0 }]);
  try {
    const view = new DungeonView();
    view.update(sim);
    expect(
      view.inspect().find((m) => m.id === "candle-1")?.animated,
    ).toBe(true);
    const flames = () => {
      const out: T.Group[] = [];
      view.traverse((o) => {
        if (o instanceof T.Group && o.userData.base !== undefined)
          out.push(o);
      });
      return out;
    };
    expect(flames()).toHaveLength(3);
    const before = flames().map((f) => f.scale.x);
    sim.run(0.5);
    view.update(sim);
    expect(flames().map((f) => f.scale.x)).not.toEqual(before);
  } finally {
    sim.dispose();
  }
});

it("serves skull props and jail-cell bars for customs", () => {
  const track = toTrack(
    validateCustomLevel(
      minimal([
        { id: "skull-1", kind: "skull", x: 5, z: 5, yaw: 1 },
        { id: "cell-1", kind: "jail-cell", x: -30, z: 40 },
      ]),
    ),
  );
  registerCustomTrack(track);
  expect(courseProps(track).map((p) => p.kind)).toEqual(["skull"]);
  expect(courseProps(track)[0]).toMatchObject({ id: "skull-1", yaw: 1 });
  // Four barred walls enclose the cell; the skeleton inside is decor-only.
  const bars = courseSolids(track).filter((s) =>
    s.id.startsWith("cell-1-bar"),
  );
  expect(bars.length).toBeGreaterThanOrEqual(12);
  expect(new Set(bars.map((s) => s.kind))).toEqual(new Set(["barrier"]));
});

it("serves dungeon hazards with staggered phases and yaw", () => {
  const track = toTrack(
    validateCustomLevel(
      minimal([
        { id: "hands-1", kind: "hands", x: 0, z: 0 },
        { id: "scissors-1", kind: "scissors", x: 10, z: 0, yaw: 1 },
        { id: "clippers-1", kind: "clippers", x: 20, z: 0 },
      ]),
    ),
  );
  const defs = dungeonHazards(track);
  expect(defs.map((d) => d.kind)).toEqual([
    "hands",
    "scissors",
    "clippers",
  ]);
  expect(defs[1]).toMatchObject({ yaw: 1 });
  expect(new Set(defs.map((d) => d.phase)).size).toBe(3);
  expect(dungeonHazards(undefined)).toEqual([]);
});

it("snap cycle opens, slams violently and strikes only while shut", () => {
  expect(SNAP_CYCLE).toBe(3.2);
  expect(snapOpenness(0)).toBeGreaterThan(0.99);
  expect(snapOpenness(2.2)).toBeLessThan(0.01);
  for (let t = 0; t < SNAP_CYCLE; t += 0.05) {
    const o = snapOpenness(t);
    expect(o).toBeGreaterThanOrEqual(0);
    expect(o).toBeLessThanOrEqual(1);
    // The 0.2 s slam is steep by design; reopening stays gradual.
    expect(Math.abs(snapOpenness(t + 0.05) - o)).toBeLessThan(0.55);
  }
  expect(snapStriking(0)).toBe(false);
  expect(snapStriking(1)).toBe(false);
  expect(snapStriking(1.8)).toBe(true);
  expect(snapStriking(2.2)).toBe(true);
  expect(snapStriking(2.7)).toBe(false);
});

function dungeonFixture(prefabs: CustomPrefab[]) {
  const track = toTrack(validateCustomLevel(minimal(prefabs)));
  registerCustomTrack(track);
  const sim = new Simulation();
  sim.startTrack(track.id);
  return sim;
}

for (const kind of ["hands", "scissors", "clippers"] as DungeonKind[]) {
  it(`${kind} snap is instantly lethal to a truck in the zone`, () => {
    const sim = dungeonFixture([{ id: `${kind}-1`, kind, x: 0, z: 0 }]);
    try {
      expect(sim.dungeon.mechanisms).toHaveLength(1);
      // Parked beside the trap, inside the strike zone, through two slams.
      sim.body.setTranslation({ x: 4, y: 2.1, z: 4 }, true);
      sim.run(2 * SNAP_CYCLE + 1);
      const hits = sim.damageEvents.filter((e) => e.source === kind);
      expect(hits.length).toBeGreaterThanOrEqual(2);
      expect(hits.length).toBeLessThanOrEqual(3);
      expect(sim.snapshot().status).toBe("wrecked");
      expect(sim.trackRun?.status).toBe("failed");
      // One shut trap wrecks the truck, like the chomp books.
      expect(sim.parts.get("chassis-front")!.health).toBeLessThanOrEqual(0);
    } finally {
      sim.dispose();
    }
  });
}

for (const kind of ["hands", "scissors", "clippers"] as DungeonKind[]) {
  it(`${kind} snaps eventually wreck a parked truck`, () => {
    const sim = dungeonFixture([{ id: `${kind}-1`, kind, x: 0, z: 0 }]);
    try {
      // Parked beside the trap, inside the strike zone.
      sim.body.setTranslation({ x: 4, y: 2.1, z: 4 }, true);
      // One slam cycle always contains a strike window.
      sim.run(SNAP_CYCLE + 1);
      expect(sim.snapshot().status).toBe("wrecked");
      expect(sim.trackRun?.status).toBe("failed");
      expect(sim.parts.get("chassis-front")!.health).toBeLessThanOrEqual(0);
      expect(
        sim.damageEvents.filter((e) => e.source === kind).length,
      ).toBeGreaterThanOrEqual(1);
    } finally {
      sim.dispose();
    }
  });
}

it("hands and scissors let the truck drive straight through", () => {
  // No altar, no cutting block: a dead-center drive passes the footprint
  // as long as it crosses inside the open window.
  for (const kind of ["hands", "scissors"] as DungeonKind[]) {
    const sim = dungeonFixture([{ id: `${kind}-1`, kind, x: 0, z: 0 }]);
    try {
      sim.body.setTranslation({ x: 12, y: 2.1, z: 0 }, true);
      // Face due west toward the trap (identity faces +z).
      sim.body.setRotation(
        { x: 0, y: -Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
        true,
      );
      // Start the cross the moment a strike window ends.
      const phase = sim.dungeon.mechanisms[0].h.phase;
      let sawStrike = false;
      for (let i = 0; i < 120 * 8; i++) {
        sim.step({ throttle: 0, steer: 0, brake: 1 });
        if (snapStriking(sim.time + phase)) sawStrike = true;
        else if (sawStrike) break;
      }
      expect(sawStrike).toBe(true);
      for (let i = 0; i < 120 * 3; i++)
        sim.step({ throttle: 1, steer: 0, brake: 0 });
      const p = sim.body.translation();
      expect(p.x).toBeLessThan(-4);
      expect(sim.snapshot().status).not.toBe("wrecked");
      expect(
        sim.dungeon.mechanisms[0]?.colliders.length ?? 0,
      ).toBe(0);
    } finally {
      sim.dispose();
    }
  }
  // Clipper crusher back: the mouth stays open but the back is a wall,
  // and the jaws kill a truck parked against it.
  const sim = dungeonFixture([{ id: "clippers-1", kind: "clippers", x: 0, z: 0 }]);
  try {
    sim.body.setTranslation({ x: 0, y: 2.1, z: -14 }, true);
    for (let i = 0; i < 120 * 4; i++)
      sim.step({ throttle: 1, steer: 0, brake: 0 });
    expect(sim.body.translation().z).toBeLessThan(-6);
    // The open mouth is instant death.
    sim.body.setTranslation({ x: 0, y: 2.1, z: 6 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    sim.run(SNAP_CYCLE + 1);
    expect(sim.snapshot().status).toBe("wrecked");
    expect(
      sim.dungeon.mechanisms[0]?.colliders.length ?? 0,
    ).toBeGreaterThan(0);
  } finally {
    sim.dispose();
  }
});

it("snap misses far trucks and trucks on the other story", () => {
  const sim = dungeonFixture([
    { id: "hands-1", kind: "hands", x: 0, z: 0 },
  ]);
  try {
    sim.body.setTranslation({ x: 40, y: 2.1, z: 0 }, true);
    sim.run(SNAP_CYCLE + 1);
    expect(
      sim.damageEvents.filter((e) => e.source === "hands"),
    ).toHaveLength(0);
    // Directly above the ground-floor hazard, on the upper deck.
    sim.body.setTranslation({ x: 0, y: 8, z: 0 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    sim.run(1);
    const before = sim.damageEvents.length;
    // Hold it aloft through a strike: levitating past still counts as a miss.
    for (let i = 0; i < 60 * (SNAP_CYCLE + 1); i++) {
      if (i % 30 === 0) {
        sim.body.setTranslation({ x: 0, y: 8, z: 0 }, true);
        sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      sim.step({});
    }
    expect(
      sim.damageEvents.slice(before).filter((e) => e.source === "hands"),
    ).toHaveLength(0);
  } finally {
    sim.dispose();
  }
});

it("cages are solid furniture the truck bumps into", () => {
  const sim = dungeonFixture([{ id: "cage-1", kind: "cage", x: 0, z: -20 }]);
  try {
    expect(
      sim.dungeon.mechanisms.find((m) => m.h.id === "cage-1")?.colliders
        .length,
    ).toBeGreaterThan(0);
    for (let i = 0; i < 60 * 6; i++) sim.step({ throttle: 1 });
    expect(sim.body.translation().z).toBeLessThan(-19);
  } finally {
    sim.dispose();
  }
});

let drawn: string[];
beforeEach(() => {
  drawn = [];
  const ctx = {
    fillRect: () => {},
    strokeRect: () => {},
    fillText: (text: string) => {
      drawn.push(String(text));
    },
  };
  const img = () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
    src: "",
  });
  vi.stubGlobal("document", {
    createElement: (tag: string) =>
      tag === "img"
        ? img()
        : { width: 0, height: 0, getContext: () => ctx },
    createElementNS: () => img(),
  });
});

const DUNGEON_MIN_TRIANGLES: Record<DungeonKind, number> = {
  hands: 30000,
  scissors: 6000,
  clippers: 4000,
  cage: 4000,
  "jail-cell": 2500,
  candle: 800,
};

for (const kind of Object.keys(DUNGEON_MIN_TRIANGLES) as DungeonKind[]) {
  it(`${kind} model is dense, grounded and moderately sized`, () => {
    const model = buildDungeonModel({
      id: `test-${kind}`,
      kind,
      x: 0,
      z: 0,
      phase: 0,
    });
    expect(model.triangles).toBeGreaterThan(DUNGEON_MIN_TRIANGLES[kind]);
    const box = new T.Box3();
    for (const child of model.root.children) {
      box.expandByObject(child);
    }
    const size = box.getSize(new T.Vector3());
    // Nothing buried, nothing floating away (hands lunge from the sides).
    expect(box.min.y).toBeGreaterThan(-0.5);
    expect(box.min.y).toBeLessThan(6);
    expect(size.x).toBeLessThan(30);
    expect(size.z).toBeLessThan(30);
    expect(size.y).toBeLessThan(25);
  });
}

it("traps carry animated pivots and upright labels above the model", () => {
  const titles: Record<string, string> = {
    hands: "STONE CLAP",
    scissors: "GIANT SNIP",
    clippers: "CRUSH CLIP",
  };
  for (const kind of ["hands", "scissors", "clippers"] as DungeonKind[]) {
    const model = buildDungeonModel({
      id: `label-${kind}`,
      kind,
      x: 0,
      z: 0,
      phase: 0,
    });
    expect(model.pivots.length).toBe(2);
    const sprites = model.root.children.filter(
      (c): c is T.Sprite => c instanceof T.Sprite,
    );
    expect(sprites).toHaveLength(1);
    const [label] = sprites;
    expect(Math.hypot(label.position.x, label.position.z)).toBeLessThan(3);
    const solid = new T.Group();
    for (const c of model.root.children)
      if (!(c instanceof T.Sprite)) solid.add(c.clone());
    const top = new T.Box3().setFromObject(solid).max.y;
    expect(label.position.y - top).toBeGreaterThan(0.4);
    expect(label.position.y - top).toBeLessThan(3);
    expect(label.scale.x / label.scale.y).toBeCloseTo(4, 1);
    expect(drawn).toContain(titles[kind]);
  }
});

it("cages and cells imprison a skeleton", () => {
  for (const kind of ["cage", "jail-cell"] as DungeonKind[]) {
    const model = buildDungeonModel({
      id: `bones-${kind}`,
      kind,
      x: 0,
      z: 0,
      phase: 0,
    });
    // Consolidation merges meshes, so detect the prisoner by bone material.
    let bone = 0;
    model.root.traverse((o) => {
      if (
        o instanceof T.Mesh &&
        o.material instanceof T.MeshStandardMaterial &&
        o.material.color.getHex() === 0xd8c9a8
      )
        bone++;
    });
    expect(bone).toBeGreaterThan(0);
  }
  const skull = buildSkullMesh(1);
  const box = new T.Box3().setFromObject(skull);
  const size = box.getSize(new T.Vector3());
  expect(size.x).toBeGreaterThan(0.6);
  expect(size.x).toBeLessThan(1.2);
  const skeleton = buildSkeletonMesh(1);
  const height = new T.Box3()
    .setFromObject(skeleton)
    .getSize(new T.Vector3()).y;
  expect(height).toBeGreaterThan(2.2);
  expect(height).toBeLessThan(3.2);
});

it("treasure chests are dense lidded boxes with gold locks", () => {
  const chest = buildTreasureChest();
  const stats = chestStats(chest);
  expect(stats.meshes).toBeGreaterThan(10);
  expect(stats.triangles).toBeGreaterThan(800);
  const box = new T.Box3().setFromObject(chest);
  const size = box.getSize(new T.Vector3());
  expect(size.x).toBeGreaterThan(1.8);
  expect(size.x).toBeLessThan(2.6);
  let gold = 0;
  chest.traverse((o) => {
    if (
      o instanceof T.Mesh &&
      o.material instanceof T.MeshStandardMaterial &&
      o.material.metalness >= 0.8 &&
      o.material.color.getHex() === 0xd8a920
    )
      gold++;
  });
  expect(gold).toBeGreaterThan(0);
});

it("ships identical official and clone dungeons with 15 chests and a five-minute timer", () => {
  const level = validateCustomLevel(original);
  expect(level.mode).toBe("arena");
  expect(level.collectibles).toHaveLength(15);
  expect(
    level.collectibles!.every((c) => c.kind === "chest"),
  ).toBe(true);
  expect(level.limit).toBe(300);
  expect(level.medals).toEqual({ gold: 150, silver: 200, bronze: 260 });
  expect({ ...clone, name: original.name }).toEqual(original);
  for (const kind of [
    "hands",
    "scissors",
    "clippers",
    "cage",
    "jail-cell",
    "candle",
    "skull",
    "hammer",
    "axe",
    "teeth",
    "burner",
  ])
    expect(
      original.prefabs.some((p) => p.kind === kind),
      kind,
    ).toBe(true);
  // Stadium lamps left with the sky: candles light the cavern instead.
  expect(original.prefabs.some((p) => p.kind === "lamp")).toBe(false);
  expect(original.prefabs.filter((p) => p.kind === "candle")).toHaveLength(27);
  expect(level.underground).toBe(true);
  for (const id of ["ceil-s0", "deck-ceil", "upwall-top", "dcol-160-150"])
    expect(
      original.solids.some((s) => s.id === id),
      id,
    ).toBe(true);
  expect(original.solids.filter((s) => s.kind === "lava")).toHaveLength(3);
  const track = toTrack(level);
  expect(validateTracks([track])).toEqual([]);
  expect(track.collectibles.every((c) => c.kind === "chest")).toBe(true);
  expect(objectiveCopy(track)).toContain("treasure chest");
  registerCustomTrack(track);
});

it("dungeon solids never overlap in volume (ramps join at angles)", () => {
  const track = toTrack(validateCustomLevel(original));
  registerCustomTrack(track);
  const solids = courseSolids(track);
  // 2D corners of an XZ rect under three.js YXZ yaw.
  const corners = (s: { x: number; z: number; w: number; d: number; yaw?: number }) => {
    const yaw = s.yaw ?? 0,
      c = Math.cos(yaw),
      si = Math.sin(yaw);
    return (
      [
        [-s.w / 2, -s.d / 2],
        [s.w / 2, -s.d / 2],
        [s.w / 2, s.d / 2],
        [-s.w / 2, s.d / 2],
      ] as const
    ).map(([dx, dz]) => ({
      x: s.x + dx * c + dz * si,
      z: s.z - dx * si + dz * c,
    }));
  };
  const overlap = (
    a: { x: number; y: number; z: number; w: number; h: number; d: number; yaw?: number },
    b: { x: number; y: number; z: number; w: number; h: number; d: number; yaw?: number },
  ) => {
    // Separating axes of both rects on unit normals; penetration under eps
    // on any axis (touching or separated) is not overlap.
    const ca = corners(a),
      cb = corners(b);
    let penetration = Infinity;
    for (const [p, q] of [
      [ca[0], ca[1]],
      [ca[1], ca[2]],
      [cb[0], cb[1]],
      [cb[1], cb[2]],
    ]) {
      const len = Math.hypot(q.x - p.x, q.z - p.z) || 1,
        nx = -(q.z - p.z) / len,
        nz = (q.x - p.x) / len;
      const pa = ca.map((p) => p.x * nx + p.z * nz),
        pb = cb.map((p) => p.x * nx + p.z * nz);
      penetration = Math.min(
        penetration,
        Math.min(Math.max(...pa), Math.max(...pb)) -
          Math.max(Math.min(...pa), Math.min(...pb)),
      );
    }
    if (penetration < 1e-6) return 0;
    return Math.max(
      0,
      Math.min(a.y + a.h / 2, b.y + b.h / 2) -
        Math.max(a.y - a.h / 2, b.y - b.h / 2),
    );
  };
  // Lamp heads, axe beams and hydrant nozzles embed in their mounts by
  // design (shared prefab geometry, predates the dungeon); only pairs from
  // the same prefab are exempt.
  const internalOf = (id: string) => /^(lamp|axe|hydrant)-\d+-/.exec(id)?.[0];
  // Axe gantry uprights pierce the cavern roof and read as supports; the
  // +0.05 prefab lift keeps every face non-coplanar, so nothing z-fights.
  const ceilingPiercing = (a: { id: string }, b: { id: string }) =>
    (/^ceil-/.test(a.id) && /^axe-\d+-/.test(b.id)) ||
    (/^axe-\d+-/.test(a.id) && /^ceil-/.test(b.id));
  for (let i = 0; i < solids.length; i++)
    for (let j = i + 1; j < solids.length; j++) {
      const a = solids[i],
        b = solids[j];
      // Angled ramp joints are precedented (canyon/foundry/sky-slide).
      if (a.kind === "ramp" || b.kind === "ramp") continue;
      if (internalOf(a.id) && internalOf(a.id) === internalOf(b.id)) continue;
      if (ceilingPiercing(a, b)) continue;
      expect(
        overlap(a, b),
        `${a.id} overlaps ${b.id}`,
      ).toBeLessThanOrEqual(1e-6);
    }
});

it("dungeon lava sits in true holes several metres below ground", () => {
  const track = toTrack(validateCustomLevel(original));
  registerCustomTrack(track);
  const solids = courseSolids(track);
  for (const lava of solids.filter((s) => s.kind === "lava")) {
    expect(lava.y + lava.h / 2).toBeLessThan(-3);
    for (const s of solids) {
      // Floor slabs only: the undercroft pit sits beneath the upper deck.
      if (s.kind !== "ground" || s.y > 1) continue;
      const x = Math.max(
        0,
        Math.min(lava.x + lava.w / 2, s.x + s.w / 2) -
          Math.max(lava.x - lava.w / 2, s.x - s.w / 2),
      );
      const z = Math.max(
        0,
        Math.min(lava.z + lava.d / 2, s.z + s.d / 2) -
          Math.max(lava.z - lava.d / 2, s.z - s.d / 2),
      );
      expect(x * z, `${s.id} covers ${lava.id}`).toBe(0);
    }
  }
  const sim = new Simulation();
  try {
    sim.startTrack(track.id);
    sim.body.setTranslation({ x: -120, y: 2.1, z: -150 }, true);
    sim.run(0.4);
    expect(sim.body.translation().y).toBeLessThan(1);
    expect(sim.snapshot(false).parts["chassis-front"].lava).toBeNull();
    sim.run(1.5);
    expect(sim.snapshot(false).parts["chassis-front"].lava).not.toBeNull();
  } finally {
    sim.dispose();
  }
});

it("west ramp climbs from the ground floor to the deck", () => {
  const track = toTrack(validateCustomLevel(original));
  registerCustomTrack(track);
  const sim = new Simulation();
  try {
    sim.startTrack(track.id);
    sim.body.setTranslation({ x: -170, y: 2.1, z: 80 }, true);
    // Face due north up the ramp centreline.
    const e = new T.Euler(0, 0, 0, "YXZ");
    sim.body.setRotation(
      { x: e.x, y: e.y, z: e.z, w: 1 },
      true,
    );
    for (let i = 0; i < 120 * 12; i++)
      sim.step({ throttle: 1, steer: 0, brake: 0 });
    const p = sim.body.translation();
    expect(p.z).toBeGreaterThan(140);
    expect(p.y).toBeGreaterThan(5);
  } finally {
    sim.dispose();
  }
});

/** Serpentine route: south bays, maze gaps, undercroft, ramps, deck sweep. */
const DUNGEON_ROUTE: { x: number; z: number; chest?: number }[] = [
  { x: 60, z: -160, chest: 0 },
  { x: -100, z: -140, chest: 1 },
  { x: 150, z: -80, chest: 2 },
  { x: 150, z: 0, chest: 3 },
  { x: 100, z: 40, chest: 4 },
  { x: 40, z: 5 },
  { x: -100, z: 40, chest: 5 },
  { x: -140, z: 45 },
  { x: -160, z: 80 },
  { x: -150, z: 100, chest: 6 },
  { x: -120, z: 170, chest: 7 },
  { x: 0, z: 185, chest: 8 },
  { x: 60, z: 150, chest: 9 },
  { x: -100, z: 120 },
  { x: -140, z: 105 },
  { x: -170, z: 60 },
  { x: -170, z: 80 },
  { x: -170, z: 100 },
  { x: -170, z: 120 },
  { x: -170, z: 145 },
  { x: -140, z: 160, chest: 10 },
  { x: -60, z: 160, chest: 11 },
  { x: 0, z: 180 },
  { x: 0, z: 190, chest: 12 },
  { x: 80, z: 195, chest: 13 },
  { x: 140, z: 190, chest: 14 },
];


it("completes all 15 chests within the five-minute limit", () => {
  const track = toTrack(validateCustomLevel(original));
  registerCustomTrack(track);
  const sim = new Simulation();
  try {
    sim.startTrack(track.id);
    let leg = 0,
      blockedFor = 0,
      reverseUntil = -1,
      legSince = 0;
    for (
      let i = 0;
      i < 120 * 300 && sim.trackRun?.status === "running";
      i++
    ) {
      const s = sim.snapshot(false);
      if (process.env.PROOF_TRACE && i % 30 === 0 && leg >= 2 && leg <= 4) {
        let best = "";
        for (const m of sim.dungeon.mechanisms) {
          const strike = DUNGEON_STRIKE[m.h.kind as keyof typeof DUNGEON_STRIKE];
          if (!strike) continue;
          const gap = Math.hypot(m.h.x - s.position.x, m.h.z - s.position.z);
          if (gap > strike.radius + 40) continue;
          const pos = (((s.time + m.h.phase) % SNAP_CYCLE) + SNAP_CYCLE) % SNAP_CYCLE;
          best += ` ${m.h.id}:gap${gap.toFixed(1)}/pos${pos.toFixed(2)}`;
        }
        console.log(`tr t=${s.time.toFixed(1)} leg=${leg} x=${s.position.x.toFixed(1)} z=${s.position.z.toFixed(1)} v=${s.signedSpeed.toFixed(1)}${best}`);
      }
      const wp = DUNGEON_ROUTE[Math.min(leg, DUNGEON_ROUTE.length - 1)];
      const id = `pickup-${(wp.chest ?? 0) + 1}`;
      const reached =
        wp.chest === undefined
          ? Math.hypot(wp.x - s.position.x, wp.z - s.position.z) < 12
          : (s.run?.collected.includes(id) ?? false);
      if (reached && leg < DUNGEON_ROUTE.length - 1) {
        leg++;
        legSince = s.time;
        if (process.env.PROOF_TRACE) console.log(`leg ${leg} t=${s.time.toFixed(1)}`);
      }
      const gate = DUNGEON_ROUTE[leg];
      // Never cut under the deck beside the ramp: re-approach from the base.
      const recovery =
        gate.z > 85 &&
        gate.z < 145 &&
        Math.abs(gate.x) > 150 &&
        s.position.z > 80 &&
        s.position.z < 140 &&
        s.position.y < 4 &&
        (s.position.x < -182 || s.position.x > -158);
      // Drive beyond transit gates like courseDriver: aim past the gate
      // toward the next leg so hairpins carve through instead of orbiting
      // the pin. Chest legs aim at the pickup so collection always triggers.
      const transitGate = gate.chest === undefined;
      let t = recovery ? { x: -170, z: 85 } : gate;
      if (!recovery && transitGate && leg < DUNGEON_ROUTE.length - 1) {
        const nx = DUNGEON_ROUTE[leg + 1];
        const gx = nx.x - gate.x,
          gz = nx.z - gate.z,
          gl = Math.hypot(gx, gz) || 1;
        if (Math.hypot(gate.x - s.position.x, gate.z - s.position.z) < 22)
          t = { x: gate.x + (gx / gl) * 12, z: gate.z + (gz / gl) * 12 };
      }
      const desired = Math.atan2(t.x - s.position.x, t.z - s.position.z),
        heading = Math.atan2(s.forward[0], s.forward[2]);
      const error = Math.atan2(
        Math.sin(desired - heading),
        Math.cos(desired - heading),
      );
      // Lethal traps: timed crossings only. Near any zone the current
      // leg threads, creep to the edge, hold for the open window, dash.
      let hold = 0;
      let cap = 99;
      {
        const from = leg === 0 ? { x: 0, z: -195 } : DUNGEON_ROUTE[leg - 1];
        const sx = gate.x - from.x, sz = gate.z - from.z;
        const segLen2 = sx * sx + sz * sz || 1;
        const ttruck = Math.max(0, Math.min(1, ((s.position.x - from.x) * sx + (s.position.z - from.z) * sz) / segLen2));
        for (const m of sim.dungeon.mechanisms) {
          const strike = DUNGEON_STRIKE[m.h.kind as keyof typeof DUNGEON_STRIKE];
          if (!strike) continue;
          if (Math.abs(s.position.y - ((m.h.y ?? 0) + 1.5)) > 4) continue;
          const tt = Math.max(0, Math.min(1, ((m.h.x - from.x) * sx + (m.h.z - from.z) * sz) / segLen2));
          const near = Math.hypot(m.h.x - (from.x + tt * sx), m.h.z - (from.z + tt * sz));
          if (near > strike.radius + 22) continue;
          const gap = Math.hypot(m.h.x - s.position.x, m.h.z - s.position.z);
          if (gap <= strike.radius || gap > strike.radius + 32) continue;
          if (ttruck > tt + 0.05) continue;
          const pos = ((s.time + m.h.phase) % SNAP_CYCLE + SNAP_CYCLE) % SNAP_CYCLE;
          const strikingNow = snapStriking(s.time + m.h.phase);
          const remaining = strikingNow ? 0 : (SNAP_STRIKE_START - pos + SNAP_CYCLE) % SNAP_CYCLE;
          if (near > strike.radius + 2) {
            cap = Math.min(cap, 10);
            if (gap <= strike.radius + 6 && remaining < 1.5) hold = 3;
            continue;
          }
          cap = Math.min(cap, 4.5);
          const clr = Math.min(near, strike.radius);
          const chord = 2 * Math.sqrt(Math.max(0, strike.radius * strike.radius - clr * clr));
          const needed = (Math.max(0, gap - strike.radius) + chord + 3) / 11 + 0.5;
          if (remaining < needed)
            hold = Math.max(hold, gap <= strike.radius + 4 ? 3 : gap <= strike.radius + 14 ? 4 : 2);
        }
      }
      if (hold === 3) {
        sim.step({ throttle: 0, steer: 0, brake: 1 });
        blockedFor = 0;
        continue;
      }
      if (hold === 2) {
        sim.step({
          throttle: s.signedSpeed < 4 ? 0.4 : 0,
          steer: Math.max(-1, Math.min(1, error * 3)),
          brake: s.signedSpeed > 5 ? 1 : 0,
        });
        blockedFor = 0;
        continue;
      }
      if (hold === 4) {
        sim.step({
          throttle: s.signedSpeed < 2 ? 0.3 : 0,
          steer: Math.max(-1, Math.min(1, error * 3)),
          brake: s.signedSpeed > 2.5 ? 0.8 : 0,
        });
        blockedFor = 0;
        continue;
      }
      // Slow early for sharp turns after chest gates (avoid wide exit arcs).
      let turnCap = 99;
      if (leg + 1 < DUNGEON_ROUTE.length) {
        const pv = leg === 0 ? { x: 0, z: -195 } : DUNGEON_ROUTE[leg - 1];
        const nx = DUNGEON_ROUTE[leg + 1];
        const ax = gate.x - pv.x, az = gate.z - pv.z;
        const bx = nx.x - gate.x, bz = nx.z - gate.z;
        const cos = (ax * bx + az * bz) / (Math.hypot(ax, az) * Math.hypot(bx, bz) || 1);
        if (cos < 0.5 && Math.hypot(gate.x - s.position.x, gate.z - s.position.z) < 45) turnCap = 5;
      }
      if (s.signedSpeed > Math.min(cap, turnCap)) {
        sim.step({
          throttle: 0,
          steer: Math.max(-1, Math.min(1, error * 3)),
          brake: 1,
        });
        blockedFor = 0;
        continue;
      }
      // A human reverses out of dead ends; so does this proof.
      blockedFor = s.speed < 0.6 ? blockedFor + 1 / 120 : 0;
      if (blockedFor > 1.2) {
        reverseUntil = s.time + 1.3;
        blockedFor = 0;
      }
      if (s.time < reverseUntil) {
        sim.step({
          throttle: -0.7,
          steer: Math.max(-1, Math.min(1, -error * 3)),
          brake: 0,
        });
        continue;
      }
      const nearRamp = gate.z > 60 && gate.z < 150 && Math.abs(gate.x) > 150;
      const climb = gate.z > 90 && gate.z < 145 && Math.abs(gate.x) > 160;
      const onDeck = s.position.y > 4;
      // Transit gates need a tight line: a human lifts off near the gate and
      // crawls if a hairpin starts to circle.
      const transit = gate.chest === undefined;
      const distGate = Math.hypot(gate.x - s.position.x, gate.z - s.position.z);
      let speed = climb
        ? 12
        : nearRamp || onDeck
          ? 8
          : Math.abs(error) > 0.6
            ? 6
            : Math.abs(error) > 0.25
              ? 10
              : 15;
      if (transit && distGate < 14) speed = Math.min(speed, 5);
      if (transit && distGate < 30 && s.time - legSince > 8)
        speed = Math.min(speed, 3);
      sim.step({
        steer: Math.max(-1, Math.min(1, error * 3)),
        throttle: s.signedSpeed < speed ? 1 : 0,
        brake: s.signedSpeed > speed + 1 ? 0.35 : 0,
      });
    }
    expect(
      sim.trackRun?.status,
      JSON.stringify({ run: sim.trackRun?.snapshot(), p: sim.body.translation(), leg }),
    ).toBe("completed");
    expect(sim.trackRun?.collected.size).toBe(15);
    expect(sim.trackRun!.elapsed).toBeLessThanOrEqual(225);
    expect(sim.snapshot(false).integrity).toBeGreaterThan(0.3);
  } finally {
    sim.dispose();
  }
});

it("ground trap strike zones graze the driven route", () => {
  const track = toTrack(validateCustomLevel(original));
  const traps = track.custom!.prefabs.filter(
    (p) =>
      (["hands", "scissors", "clippers"] as string[]).includes(p.kind) &&
      (p.y ?? 0) < 4,
  );
  const pts = [{ x: 0, z: -195 }, ...DUNGEON_ROUTE];
  let grazes = 0;
  for (const t of traps) {
    const r = DUNGEON_STRIKE[t.kind as keyof typeof DUNGEON_STRIKE].radius;
    let near = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1].x - pts[i].x,
        dz = pts[i + 1].z - pts[i].z,
        tt = Math.max(
          0,
          Math.min(
            1,
            ((t.x - pts[i].x) * dx + (t.z - pts[i].z) * dz) /
              (dx * dx + dz * dz),
          ),
        );
      near = Math.min(
        near,
        Math.hypot(t.x - (pts[i].x + tt * dx), t.z - (pts[i].z + tt * dz)),
      );
    }
    if (near < r) grazes++;
  }
  expect(grazes).toBeGreaterThanOrEqual(2);
});

it("live-added dungeon hazards register, move and remove", () => {
  const sim = dungeonFixture([]);
  try {
    expect(sim.dungeon.mechanisms).toHaveLength(0);
    sim.dungeon.addHazard({
      id: "hands-9",
      kind: "hands",
      x: 30,
      z: 0,
      phase: 0,
    });
    expect(sim.dungeon.mechanisms).toHaveLength(1);
    sim.dungeon.moveHazard("hands-9", 40, 0, 5);
    expect(sim.dungeon.mechanisms[0].h).toMatchObject({ x: 40, z: 5 });
    sim.body.setTranslation({ x: 40, y: 2.1, z: 5 }, true);
    sim.run(SNAP_CYCLE + 1);
    expect(
      sim.damageEvents.some((e) => e.source === "hands"),
    ).toBe(true);
    sim.dungeon.removeHazard("hands-9");
    expect(sim.dungeon.mechanisms).toHaveLength(0);
  } finally {
    sim.dispose();
  }
});
