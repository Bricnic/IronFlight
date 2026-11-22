import { readFileSync } from "node:fs";
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
  solidFootprint,
  solidRect,
  subtractRect,
  triangulate,
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
it("auto clip ignores stacked layers with disjoint heights", () => {
  const ground = { ...box, id: "ground", w: 200, d: 200, y: -0.6, h: 1.2 };
  const road = { ...box, id: "road-1", x: 0, z: 0, y: 0.015, h: 0.03, w: 24, d: 110 };
  const result = previewAutoClip([ground, road], ["ground", "road-1"]);
  expect(result.affected).toEqual([]);
  expect(result.solids).toHaveLength(2);
});
it("auto clip cuts true footprints, not bounding boxes, of yawed solids", () => {
  // A=[0,10]^2. B is a thin diagonal slab whose bbox overlaps A's corner
  // while its true footprint passes 3u clear of it.
  const a = { ...box, id: "a-id", name: "Alpha", x: 5, z: 5, w: 10, d: 10 };
  const b = {
    ...box,
    id: "b-id",
    name: "Beta",
    x: 12,
    z: 12,
    w: 12,
    d: 1,
    yaw: Math.PI / 4,
  };
  expect(intersectRects(solidRect(a), solidRect(b))).not.toBeNull();
  const result = previewAutoClip([a, b], ["a-id", "b-id"]);
  expect(result.issues).toEqual([]);
  expect(result.affected).toEqual([]);
  expect(result.solids).toHaveLength(2);
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
it("triangulation preserves area with counterclockwise ears", () => {
  const area = (poly: { x: number; z: number }[]) =>
    Math.abs(
      poly.reduce((n, p, i) => {
        const q = poly[(i + 1) % poly.length];
        return n + p.x * q.z - p.z * q.x;
      }, 0),
    ) / 2;
  // Convex quad, either winding.
  for (const quad of [
    [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
      { x: 0, z: 10 },
    ],
    [
      { x: 0, z: 10 },
      { x: 10, z: 10 },
      { x: 10, z: 0 },
      { x: 0, z: 0 },
    ],
  ]) {
    const tris = triangulate(quad);
    expect(tris).toHaveLength(2);
    expect(tris.reduce((n, t) => n + area(t), 0)).toBeCloseTo(100, 9);
    for (const t of tris) expect(area(t)).toBeGreaterThan(0);
  }
  // Concave arrow: n-2 ears, area preserved.
  const arrow = [
    { x: 0, z: 0 },
    { x: 6, z: 0 },
    { x: 6, z: 4 },
    { x: 3, z: 2 },
    { x: 0, z: 4 },
  ];
  const tris = triangulate(arrow);
  expect(tris).toHaveLength(3);
  expect(tris.reduce((n, t) => n + area(t), 0)).toBeCloseTo(area(arrow), 9);
  expect(triangulate([{ x: 0, z: 0 }])).toEqual([]);
});
it("auto clip resolves every Mystic Caverns road into one contiguous deck", () => {
  type Pt = { x: number; z: number };
  const EPS = 1e-6;
  const distToSeg = (p: Pt, a: Pt, b: Pt) => {
    const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
    const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2)) : 0;
    return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
  };
  const onBoundary = (p: Pt, poly: Pt[]) =>
    poly.some((a, i) => distToSeg(p, a, poly[(i + 1) % poly.length]) < EPS);
  const inside = (p: Pt, poly: Pt[]) => {
    if (onBoundary(p, poly)) return true;
    let crossings = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if (a.z > p.z !== b.z > p.z) {
        const x = a.x + ((p.z - a.z) / (b.z - a.z)) * (b.x - a.x);
        if (x > p.x) crossings++;
      }
    }
    return crossings % 2 === 1;
  };
  // Exact pairwise intersection area via triangle-triangle clipping, using
  // the engine's own epsilon: shared cut boundaries measure as zero.
  const triArea = (t: Pt[]) =>
    Math.abs(
      (t[1].x - t[0].x) * (t[2].z - t[0].z) - (t[1].z - t[0].z) * (t[2].x - t[0].x),
    ) / 2;
  const clipTri = (subject: Pt[], a: Pt, b: Pt, interior: Pt) => {
    let nx = a.z - b.z, nz = b.x - a.x;
    if ((interior.x - a.x) * nx + (interior.z - a.z) * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
    const out: Pt[] = [];
    for (let i = 0; i < subject.length; i++) {
      const p = subject[i], q = subject[(i + 1) % subject.length];
      const dp = (p.x - a.x) * nx + (p.z - a.z) * nz;
      const dq = (q.x - a.x) * nx + (q.z - a.z) * nz;
      if (dp >= 0) out.push(p);
      if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
        const t = dp / (dp - dq);
        out.push({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t });
      }
    }
    return out;
  };
  const intersectionArea = (p: Pt[], q: Pt[]) => {
    let total = 0;
    for (const tp of triangulate(p))
      for (const tq of triangulate(q)) {
        let inter: Pt[] = tp;
        const centroid = {
          x: (tq[0].x + tq[1].x + tq[2].x) / 3,
          z: (tq[0].z + tq[1].z + tq[2].z) / 3,
        };
        for (let i = 0; i < 3 && inter.length >= 3; i++)
          inter = clipTri(inter, tq[i], tq[(i + 1) % 3], centroid);
        if (inter.length >= 3) {
          let area = 0;
          for (let i = 0; i < inter.length; i++) {
            const a = inter[i], b = inter[(i + 1) % inter.length];
            area += a.x * b.z - a.z * b.x;
          }
          total += Math.abs(area) / 2;
        }
      }
    return total;
  };
  const level = JSON.parse(
    readFileSync("levels/official/spooky-places/Mystic Caverns.json", "utf8"),
  );
  const roads: string[] = level.solids
    .filter((s: CustomSolid) => s.kind === "road")
    .map((s: CustomSolid) => s.id);
  expect(roads.length).toBeGreaterThan(10);
  const result = previewAutoClip(level.solids, roads);
  expect(result.order).toHaveLength(roads.length);
  expect(result.issues).toEqual([]);
  expect(result.affected.length).toBeGreaterThan(0);
  const finals = result.solids.filter(
    (s: CustomSolid) =>
      roads.includes(s.id) || roads.some((id) => s.id.startsWith(`${id}-piece-`)),
  );
  const polys = finals.map((s: CustomSolid) => solidFootprint(s));
  const yOverlap = (a: CustomSolid, b: CustomSolid) =>
    Math.min(a.y + a.h / 2, b.y + b.h / 2) -
      Math.max(a.y - a.h / 2, b.y - b.h / 2) >
    1e-8;
  for (const [i, p] of polys.entries())
    for (const [j, q] of polys.slice(i + 1).entries()) {
      if (!yOverlap(finals[i], finals[i + 1 + j])) continue;
      const shared = intersectionArea(p, q);
      expect(shared, `${finals[i].id} overlaps ${finals[i + 1 + j].id}`).toBeLessThanOrEqual(
        1e-8,
      );
    }
  // Every drive-line sample covered before is still covered: no new holes.
  const path = [level.spawn, ...level.checkpoints];
  const samples: Pt[] = [];
  for (let i = 1; i < path.length; i++) {
    const steps = Math.ceil(
      Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z) / 2,
    );
    for (let k = 0; k <= steps; k++)
      samples.push({
        x: path[i - 1].x + ((path[i].x - path[i - 1].x) * k) / steps,
        z: path[i - 1].z + ((path[i].z - path[i - 1].z) * k) / steps,
      });
  }
  const before = roads.map(
    (id: string) => solidFootprint(level.solids.find((s: CustomSolid) => s.id === id)!),
  );
  let checked = 0;
  for (const s of samples) {
    if (!before.some((p) => inside(s, p))) continue;
    checked++;
    expect(polys.some((p) => inside(s, p)), `hole at ${s.x},${s.z}`).toBe(true);
  }
  expect(checked).toBeGreaterThan(100);
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
