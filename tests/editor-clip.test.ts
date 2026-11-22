import { beforeAll, expect, it } from "vitest";
import * as T from "three";
import {
  blankLevel,
  SOLID_KINDS,
  validateCustomLevel,
  toTrack,
  registerCustomTrack,
  type CustomSolid,
} from "../src/custom-level";
import {
  intersectRects,
  previewAutoClip,
  previewClip,
  solidRect,
  subtractRect,
  type ClipRect,
} from "../src/editor-clip";
import { EditorStore } from "../src/editor-state";
import { scaleSolidUVs } from "../src/solid-uv";
import { courseSolids } from "../src/course";
import { Simulation, initPhysics } from "../src/simulation";
import { editorSolidGeometry } from "../src/editor-viewport";

const box: CustomSolid = {
  id: "foundation",
  name: "Foundation",
  kind: "ground",
  x: 0,
  y: -1,
  z: 0,
  w: 20,
  h: 2,
  d: 20,
  color: 123,
  texture: "grass_ground",
  locked: false,
};
const hole = { minX: -3, maxX: 3, minZ: -2, maxZ: 2 };
const area = (r: ClipRect) => (r.maxX - r.minX) * (r.maxZ - r.minZ);
it.each(SOLID_KINDS)("clips %s boxes while preserving their kind and metadata", (kind) => {
  const result = previewClip([{ ...box, kind }], [box.id], [hole]);
  expect(result.issues).toEqual([]);
  expect(result.retained).toHaveLength(4);
  expect(result.retained.every(p => p.kind === kind && p.color === box.color)).toBe(true);
});
it("clips polygon tiles without filling in their missing corners", () => {
  const tile: CustomSolid = { ...box, kind: "tile", footprint: [{ x: -10, z: -10 }, { x: 10, z: -10 }, { x: -10, z: 10 }] };
  const result = previewClip([tile], [tile.id], [{ minX: -2, maxX: 2, minZ: -20, maxZ: 20 }]);
  expect(result.issues).toEqual([]);
  const polygonArea = (s: CustomSolid) => Math.abs(s.footprint!.reduce((n, p, i, ps) => { const q = ps[(i + 1) % ps.length]; return n + p.x * q.z - p.z * q.x; }, 0)) / 2;
  expect(result.retained.reduce((n, s) => n + polygonArea(s), 0)).toBeCloseTo(160);
  expect(result.retained.every(s => s.footprint)).toBe(true);
  validateCustomLevel({ ...blankLevel("Polygon clip"), solids: result.solids });
});
it("renders a polygon tile as its actual footprint in both editor modes", () => {
  const tile: CustomSolid = { ...box, kind: "tile", footprint: [{ x: -10, z: -10 }, { x: 10, z: -10 }, { x: -10, z: 10 }] };
  const geometry = editorSolidGeometry(tile);
  const points = geometry.getAttribute("position");
  for (let i = 0; i < points.count; i++) expect(points.getX(i) + points.getZ(i)).toBeLessThanOrEqual(0.00001);
  geometry.dispose();
});
it("clips yawed tiles in world space and preserves their orientation", () => {
  const s = { ...box, kind: "tile" as const, yaw: Math.PI / 4 };
  const result = previewClip([s], [s.id], [hole]);
  expect(result.issues).toEqual([]);
  expect(result.retained.every(p => p.yaw === s.yaw && p.footprint)).toBe(true);
  validateCustomLevel({ ...blankLevel("Yaw clip"), solids: result.solids });
});
it.each([
  [hole, 376, 4],
  [{ minX: 8, maxX: 12, minZ: -2, maxZ: 2 }, 392, 3],
  [{ minX: 8, maxX: 12, minZ: 8, maxZ: 12 }, 396, 2],
  [{ minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, 0, 0],
  [{ minX: 10, maxX: 20, minZ: -2, maxZ: 2 }, 400, 1],
  [{ minX: 12, maxX: 20, minZ: -2, maxZ: 2 }, 400, 1],
] as [ClipRect, number, number][])(
  "partitions %j with conserved area",
  (cutter, expectedArea, pieces) => {
    const rects = subtractRect(solidRect(box), cutter);
    expect(rects).toHaveLength(pieces);
    expect(rects.reduce((a, r) => a + area(r), 0)).toBe(expectedArea);
    for (const [i, r] of rects.entries()) {
      expect(intersectRects(r, cutter)).toBeNull();
      for (const other of rects.slice(i + 1))
        expect(intersectRects(r, other)).toBeNull();
    }
  },
);
it("handles repeated and overlapping cutters without duplicate removed volume or pieces", () => {
  const cutters = [hole, hole, { minX: 0, maxX: 6, minZ: 0, maxZ: 5 }];
  const result = previewClip([box], [box.id], cutters);
  expect(
    result.retained.reduce((a, s) => a + s.w * s.h * s.d, 0) +
      result.removed.reduce((a, s) => a + s.w * s.h * s.d, 0),
  ).toBe(800);
  for (const [i, s] of result.retained.entries()) {
    for (const c of cutters) expect(intersectRects(solidRect(s), c)).toBeNull();
    for (const other of result.retained.slice(i + 1))
      expect(intersectRects(solidRect(s), solidRect(other))).toBeNull();
  }
  expect(previewClip([box], [box.id], cutters)).toEqual(result);
});
it("rejects non-finite/degenerate cutters and reports slivers, locks and rotated targets", () => {
  for (const r of [
    { ...hole, minX: NaN },
    { ...hole, maxZ: Infinity },
    { ...hole, maxX: hole.minX },
  ])
    expect(() => subtractRect(solidRect(box), r)).toThrow();
  const thin = previewClip(
    [box],
    [box.id],
    [{ ...hole, minX: -9.999, maxX: 10, minZ: -10, maxZ: 10 }],
  );
  expect(thin.slivers).toBe(1);
  for (const patch of [
    { locked: true },
    { angle: 0.1 },
    { roll: 0.1 },
    { w: Infinity },
  ]) {
    const s = { ...box, ...patch };
    const result = previewClip([s], [s.id], [hole]);
    expect(result.issues).toHaveLength(1);
    expect(result.solids).toEqual([s]);
  }
});
it("preserves metadata, unique ids and texture phase across repeated cuts and JSON validation", () => {
  const source = {
    ...box,
    kind: "road" as const,
    x: 4,
    z: 5,
    uvOffsetX: 7,
    uvOffsetZ: 9,
  };
  const cut = { minX: 2, maxX: 6, minZ: 3, maxZ: 7 };
  const occupied = { ...box, id: `${source.id}-piece-01` };
  const result = previewClip([source, occupied], [source.id], [cut]);
  const level = blankLevel("Clip UV");
  level.solids = result.solids;
  const restored = validateCustomLevel(JSON.parse(JSON.stringify(level)));
  expect(new Set(restored.solids.map((s) => s.id)).size).toBe(
    restored.solids.length,
  );
  for (const piece of result.retained) {
    expect(piece).toMatchObject({
      y: source.y,
      h: source.h,
      locked: false,
      color: source.color,
      texture: source.texture,
    });
    expect(piece.name).toMatch(/^Foundation \/ piece \d+$/);
    for (const s of [source, piece]) {
      const g = new T.BoxGeometry(s.w, s.h, s.d);
      scaleSolidUVs(g, s);
      const pos = g.attributes.position,
        uv = g.attributes.uv,
        normals = g.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        const wx = pos.getX(i) + s.x,
          wz = pos.getZ(i) + s.z;
        expect(uv.getX(i)).toBeCloseTo(
          Math.abs(normals.getY(i)) > 0.5
            ? (wx - source.x + 7) / 3
            : (wx - source.x + wz - source.z + 16) / 3,
          5,
        );
      }
      g.dispose();
    }
  }
  expect(courseSolids(toTrack(restored))).toEqual(restored.solids);
});
it("stages multiple layers and applies/undoes/redoes geometry and selection atomically", () => {
  const store = new EditorStore("Clip layers");
  store.level.solids = [box, { ...box, id: "plaza", kind: "road", y: 3 }];
  store.select({ kind: "solid", id: box.id });
  store.select({ kind: "solid", id: "plaza" }, true);
  const before = structuredClone(store.level),
    selected = [...store.solidSelection];
  store.startClip();
  store.setClipCutters([hole]);
  expect(store.clipPreview()?.affected).toHaveLength(2);
  expect(store.level).toEqual(before);
  expect(store.dirty).toBe(false);
  expect(store.canUndo).toBe(false);
  store.cancelClip();
  expect(store.level).toEqual(before);
  expect(store.canUndo).toBe(false);
  store.startClip();
  store.setClipCutters([hole]);
  expect(store.applyClip()).toBe(true);
  const after = structuredClone(store.level),
    pieces = [...store.solidSelection];
  expect(pieces).toHaveLength(8);
  expect(store.dirty).toBe(true);
  store.undo();
  expect(store.level).toEqual(before);
  expect(store.solidSelection).toEqual(selected);
  expect(store.canUndo).toBe(false);
  store.redo();
  expect(store.level).toEqual(after);
  expect(store.solidSelection).toEqual(pieces);
});
const chain = (): CustomSolid[] => [
  { ...box, id: "c-id", name: "Alpha", x: 5, z: 5, w: 10, d: 10 },
  { ...box, id: "a-id", name: "Beta", x: 10, z: 5, w: 10, d: 10 },
  { ...box, id: "b-id", name: "Cello", x: 17, z: 5, w: 10, d: 10 },
];
it("auto clip evaluates alphabetically by name against updated geometry", () => {
  // A=[0,10] B=[5,15] C=[12,22] (z all [0,10]). A keeps the shared regions;
  // B cuts C with its already-clipped remainder [10,15], leaving C=[15,22].
  const result = previewAutoClip(chain(), ["c-id", "a-id", "b-id"]);
  expect(result.order).toEqual(["c-id", "a-id", "b-id"]);
  expect(result.issues).toEqual([]);
  expect(new Set(result.affected)).toEqual(new Set(["a-id", "b-id"]));
  const byId = new Map(result.solids.map((s) => [s.id, s]));
  expect(solidRect(byId.get("c-id")!)).toEqual({ minX: 0, maxX: 10, minZ: 0, maxZ: 10 });
  expect(result.solids.filter((s) => s.id.startsWith("a-id-piece-")).map(solidRect)).toEqual([
    { minX: 10, maxX: 15, minZ: 0, maxZ: 10 },
  ]);
  expect(result.solids.filter((s) => s.id.startsWith("b-id-piece-")).map(solidRect)).toEqual([
    { minX: 15, maxX: 22, minZ: 0, maxZ: 10 },
  ]);
  // Union area is conserved and no two final pieces overlap.
  expect(
    result.solids.reduce((n, s) => n + (s.w ?? 0) * (s.d ?? 0), 0),
  ).toBe(220);
  for (const [i, s] of result.solids.entries())
    for (const other of result.solids.slice(i + 1))
      expect(intersectRects(solidRect(s), solidRect(other))).toBeNull();
  validateCustomLevel({ ...blankLevel("Auto clip"), solids: result.solids });
});
it("auto clip skips cutters consumed by earlier steps", () => {
  const solids = [
    ...chain(),
    { ...box, id: "d-id", name: "Alpine", x: 3, z: 3, w: 2, d: 2 },
  ];
  const result = previewAutoClip(solids, ["c-id", "a-id", "b-id", "d-id"]);
  expect(result.order).toEqual(["c-id", "d-id", "a-id", "b-id"]);
  expect(result.solids.some((s) => s.id === "d-id")).toBe(false);
  expect(result.solids.some((s) => s.id === "c-id")).toBe(true);
});
it("auto clip sorts unnamed solids by id", () => {
  const solids = [
    { ...box, id: "b-slab", name: undefined, x: 8, z: 5, w: 10, d: 10 },
    { ...box, id: "a-slab", name: undefined, x: 2, z: 5, w: 10, d: 10 },
  ];
  expect(previewAutoClip(solids, ["b-slab", "a-slab"]).order).toEqual([
    "a-slab",
    "b-slab",
  ]);
});
it("auto clip applies shift-selections atomically with undo/redo", () => {
  const store = new EditorStore("Auto clip layers");
  store.level.solids = chain();
  store.select({ kind: "solid", id: "b-id" });
  store.select({ kind: "solid", id: "c-id" }, true);
  store.select({ kind: "solid", id: "a-id" }, true);
  const before = structuredClone(store.level);
  store.setTool("clip");
  expect(store.autoClipTargets()?.map((s) => s.id)).toEqual(["c-id", "a-id", "b-id"]);
  expect(store.applyAutoClip()).toBe(true);
  expect(store.level.solids).toHaveLength(3);
  expect(store.dirty).toBe(true);
  const pieces = [...store.solidSelection];
  expect(new Set(pieces)).toEqual(new Set(["a-id-piece-01", "b-id-piece-01"]));
  store.undo();
  expect(store.level).toEqual(before);
  expect(store.solidSelection).toEqual(["b-id", "c-id", "a-id"]);
  store.redo();
  expect(store.solidSelection).toEqual(pieces);
});
it("auto clip ignores non-solid entries in the selection", () => {
  const store = new EditorStore("Auto clip mixed");
  store.level.solids = chain().slice(0, 2);
  store.select({ kind: "solid", id: "c-id" });
  store.select({ kind: "solid", id: "a-id" }, true);
  store.select({ kind: "checkpoint", index: 0 }, true);
  store.setTool("clip");
  expect(store.autoClipTargets()?.map((s) => s.id)).toEqual(["c-id", "a-id"]);
  expect(store.applyAutoClip()).toBe(true);
  expect(store.level.checkpoints).toHaveLength(1);
});
it("auto clip refuses grouped selections, single solids and locked targets", () => {
  const store = new EditorStore("Auto clip gated");
  store.level.solids = chain().slice(0, 2);
  store.select({ kind: "solid", id: "c-id" });
  store.setTool("clip");
  expect(store.autoClipTargets()).toBeNull();
  expect(store.applyAutoClip()).toBe(false);
  store.select({ kind: "solid", id: "c-id" });
  store.select({ kind: "solid", id: "a-id" }, true);
  store.groupSelected("Group");
  store.select({ kind: "solid", id: "c-id" });
  store.setTool("clip");
  expect(store.autoClipTargets()).toBeNull();
  expect(store.applyAutoClip()).toBe(false);
  store.cancelClip();
  store.ungroupSelected();
  store.select({ kind: "solid", id: "c-id" });
  store.select({ kind: "solid", id: "a-id" }, true);
  store.level.solids.find((s) => s.id === "a-id")!.locked = true;
  store.setTool("clip");
  expect(store.autoClipPreview()?.issues).toHaveLength(1);
  expect(store.applyAutoClip()).toBe(false);
  expect(store.level.solids).toHaveLength(2);
});
it("keeps an existing cutter and clears selection after full removal", () => {
  const store = new EditorStore("Cutter");
  const lava = { ...box, id: "lava", kind: "lava" as const, w: 4, d: 4 };
  store.level.solids = [box, lava];
  store.select({ kind: "solid", id: box.id });
  store.startClip();
  store.setClipCutters([solidRect(lava)], lava.id);
  store.setClipCutters([solidRect(lava), { ...hole, minX: 6, maxX: 8 }]);
  store.setClipTarget(lava.id, true);
  expect(store.clip?.targets).not.toContain(lava.id);
  store.applyClip();
  expect(store.level.solids.find((s) => s.id === lava.id)).toEqual(lava);
  store.undo();
  store.startClip();
  store.setClipCutters([solidRect(box)]);
  store.applyClip();
  expect(store.selection).toBeNull();
  expect(store.solidSelection).toEqual([]);
});
beforeAll(initPhysics);
it.each(["lava", "slime"] as const)("clipped polygon %s only damages parts inside the retained footprint", (kind) => {
  const level = blankLevel(`Clipped ${kind}`);
  const pool: CustomSolid = { ...box, kind, w: 80, d: 80, footprint: [{ x: -40, z: -40 }, { x: 40, z: -40 }, { x: -40, z: 40 }] };
  level.solids = previewClip([pool], [pool.id], [{ minX: -5, maxX: 5, minZ: -50, maxZ: 50 }]).solids;
  const track = toTrack(validateCustomLevel(level)); registerCustomTrack(track);
  const sim = new Simulation();
  try {
    sim.startTrack(track.id);
    sim.body.setTranslation({ x: 20, y: 0.6, z: -10 }, true);
    sim.run(0.2);
    expect(sim.damageEvents.some(e => e.source === kind)).toBe(false);
    sim.body.setTranslation({ x: 20, y: 0.6, z: -30 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    sim.run(0.2);
    expect(sim.damageEvents.some(e => e.source === kind)).toBe(true);
  } finally { sim.dispose(); }
});
it("uses the saved retained boxes for physical support and leaves a through-opening", () => {
  const level = blankLevel("Clip Physics");
  level.solids = previewClip(
    [{ ...box, w: 80, d: 80 }],
    [box.id],
    [{ minX: -10, maxX: 10, minZ: -10, maxZ: 10 }],
  ).solids;
  registerCustomTrack(
    toTrack(validateCustomLevel(JSON.parse(JSON.stringify(level)))),
  );
  const sim = new Simulation();
  try {
    sim.startTrack("custom:clip-physics");
    sim.body.setTranslation({ x: 20, y: 2.1, z: 0 }, true);
    sim.run(1);
    expect(sim.snapshot().position.y).toBeGreaterThan(0);
    sim.body.setTranslation({ x: 0, y: 2.1, z: 0 }, true);
    sim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    sim.run(0.7);
    expect(sim.snapshot().position.y).toBeLessThan(0);
  } finally {
    sim.dispose();
  }
});
