import { readFile, writeFile } from "node:fs/promises";
// Detect + clip coplanar top-face slab overlaps (z-fighting) in level JSON.
// Footprint-aware: compares rendered shapes (footprint polygon or box rect),
// clips footprints with half-plane cuts and plain boxes with edge moves.
// Only flags pairs whose materials differ: identical faces shimmer invisibly.
// Usage:
//   node scripts/level-zfight.mjs scan <level.json> [--json]
//   node scripts/level-zfight.mjs clip <level.json> [--apply] [--json]
const EPS_TOP = 0.005; // coplanar within 5mm
const MIN_AREA = 0.01; // ignore dust
const MIN_SLAB_AREA = 0.5;
const MAX_SHRINK = 0.25; // per clip, per slab
const EDGE_TOL = 0.01;
const rot = (p, yaw) => ({ x: p.x * Math.cos(yaw) + p.z * Math.sin(yaw), z: -p.x * Math.sin(yaw) + p.z * Math.cos(yaw) }); // three.js rotation.y, matching src/euler.ts
const twiceArea = (pts) => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p.x * q.z - p.z * q.x; }, 0);
// Port of solid-clip.ts clipFootprint: keep the normal-facing side.
function clipHalf(poly, point, normal) {
  const dist = (p) => (p.x - point.x) * normal.x + (p.z - point.z) * normal.z;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = dist(a), db = dist(b);
    if (da >= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return out;
}
// Drop near-duplicate and collinear vertices (clip crossings can repeat corners).
function cleanPoly(poly) {
  const pts = [];
  for (const p of poly) {
    const q = pts[pts.length - 1];
    if (!q || Math.hypot(p.x - q.x, p.z - q.z) > 1e-9) pts.push(p);
  }
  if (pts.length > 1) {
    const f = pts[0], l = pts[pts.length - 1];
    if (Math.hypot(f.x - l.x, f.z - l.z) <= 1e-9) pts.pop();
  }
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i + pts.length - 1) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
    const cross = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    const scale = Math.hypot(b.x - a.x, b.z - a.z) * Math.hypot(c.x - b.x, c.z - b.z);
    if (Math.abs(cross) > 1e-9 * scale) out.push(b);
  }
  return out.length >= 3 ? out : pts.length >= 3 ? pts : out;
}
// True inward edge normal (winding-free via the centroid sign, exact for any convex cutter).
function inwardNormal(a, b, cx, cz) {
  let nx = a.z - b.z, nz = b.x - a.x;
  if ((cx - a.x) * nx + (cz - a.z) * nz < 0) { nx = -nx; nz = -nz; }
  return { x: nx, z: nz };
}
// Convex intersection of subject with cutter (both convex, any winding).
function clipByPoly(poly, cutter) {
  const cx = cutter.reduce((a, p) => a + p.x, 0) / cutter.length;
  const cz = cutter.reduce((a, p) => a + p.z, 0) / cutter.length;
  let sub = poly;
  for (let i = 0; i < cutter.length; i++) {
    const a = cutter[i], b = cutter[(i + 1) % cutter.length];
    sub = clipHalf(sub, a, inwardNormal(a, b, cx, cz));
    if (sub.length < 3) return [];
  }
  return cleanPoly(sub);
}
// Convex intersection area via exact half-plane clips.
function intersectArea(poly, cutter) {
  const sub = clipByPoly(poly, cutter);
  return sub.length < 3 ? 0 : Math.abs(twiceArea(sub)) / 2;
}
function overlapCenter(poly, cutter) {
  const sub = clipByPoly(poly, cutter);
  if (sub.length < 3) return null;
  const b = bbox(sub);
  return { x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 };
}
function worldPoly(s) {
  if ((s.angle ?? 0) !== 0 || (s.roll ?? 0) !== 0) return null; // tilted top
  const yaw = s.yaw ?? 0;
  const local = s.footprint ?? [
    { x: -s.w / 2, z: -s.d / 2 }, { x: s.w / 2, z: -s.d / 2 },
    { x: s.w / 2, z: s.d / 2 }, { x: -s.w / 2, z: s.d / 2 },
  ];
  return local.map((p) => { const r = rot(p, yaw); return { x: r.x + s.x, z: r.z + s.z }; });
}
const material = (s) => `${s.color ?? "?"}|${s.texture ?? ""}`;
export function scanLevel(level) {
  const solids = level.solids.map((s) => ({ ...s, _top: s.y + s.h / 2, _poly: worldPoly(s) }));
  const flat = solids.filter((s) => s._poly && s._poly.length >= 3);
  const suspects = [];
  for (let a = 0; a < flat.length; a++) {
    for (let b = a + 1; b < flat.length; b++) {
      const A = flat[a], B = flat[b];
      if (Math.abs(A._top - B._top) > EPS_TOP) continue;
      if (material(A) === material(B)) continue;
      const area = intersectArea(A._poly, B._poly);
      if (area < MIN_AREA) continue;
      const c = overlapCenter(A._poly, B._poly) ?? { x: 0, z: 0 };
      suspects.push({
        a: A.id, b: B.id, top: +A._top.toFixed(3), area: +area.toFixed(2),
        x: +c.x.toFixed(2), z: +c.z.toFixed(2),
      });
    }
  }
  return { suspects, skipped: solids.length - flat.length };
}
const fmt = (n) => String(Math.round(n * 10000) / 10000);
function bbox(poly) {
  const xs = poly.map((p) => p.x), zs = poly.map((p) => p.z);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}
// Plan a butt-joint clip for one pair. Returns {edits} or {manual}.
export function planPair(level, q) {
  const A = level.solids.find((s) => s.id === q.a), B = level.solids.find((s) => s.id === q.b);
  const pa = worldPoly(A), pb = worldPoly(B);
  if (!pa || !pb) return { manual: true };
  // Overlap bbox from exact convex intersection.
  const sub = clipByPoly(pa, pb);
  if (sub.length < 3) return { manual: true };
  const ob = bbox(sub);
  const ox = ob.x1 - ob.x0, oz = ob.z1 - ob.z0;
  const ba = bbox(pa), bb = bbox(pb);
  const areaA = Math.abs(twiceArea(pa)) / 2, areaB = Math.abs(twiceArea(pb)) / 2;
  const fa = q.area / areaA, fb = q.area / areaB;
  void fa; void fb;
  // Try both axes: corner kisses butt along the axis where edges actually meet.
  for (const axis of ox <= oz ? ["x", "z"] : ["z", "x"]) {
  const lo = axis === "x" ? ob.x0 : ob.z0, hi = axis === "x" ? ob.x1 : ob.z1;
  const touchesMax = (bbx) => Math.abs((axis === "x" ? bbx.x1 : bbx.z1) - hi) < EDGE_TOL;
  const touchesMin = (bbx) => Math.abs((axis === "x" ? bbx.x0 : bbx.z0) - lo) < EDGE_TOL;
  const trySolo = (S, P, O, sb, sbO) => {
    // Overlap must touch exactly one S edge; butt target is O's facing edge.
    const sMax = axis === "x" ? sb.x1 : sb.z1, sMin = axis === "x" ? sb.x0 : sb.z0;
    const oMin = axis === "x" ? sbO.x0 : sbO.z0;
    if (Math.abs(sMax - hi) < EDGE_TOL && Math.abs(lo - oMin) < EDGE_TOL) {
      const np = clipHalf(P, axis === "x" ? { x: oMin, z: 0 } : { x: 0, z: oMin }, axis === "x" ? { x: -1, z: 0 } : { x: 0, z: -1 });
      return acceptSolo(S, P, np);
    }
    if (Math.abs(sMin - lo) < EDGE_TOL && Math.abs(hi - (axis === "x" ? sbO.x1 : sbO.z1)) < EDGE_TOL) {
      const edge = axis === "x" ? sbO.x1 : sbO.z1;
      const np = clipHalf(P, axis === "x" ? { x: edge, z: 0 } : { x: 0, z: edge }, axis === "x" ? { x: 1, z: 0 } : { x: 0, z: 1 });
      return acceptSolo(S, P, np);
    }
    return null;
  };
  const acceptSolo = (S, P, np) => {
    np = cleanPoly(np);
    if (np.length < 3) return null;
    const na = Math.abs(twiceArea(np)) / 2, oa = Math.abs(twiceArea(P)) / 2;
    const shrink = (oa - na) / oa;
    if (na < MIN_SLAB_AREA || shrink > MAX_SHRINK) return null;
    return { id: S.id, poly: np, shrink };
  };
  // Prefer one-sided butt joints (least geometry change); symmetric is fallback.
  const solo = [trySolo(A, pa, B, ba, bb), trySolo(B, pb, A, bb, ba)]
    .filter(Boolean).sort((p, q) => p.shrink - q.shrink)[0];
  if (solo) return { edits: [{ id: solo.id, poly: solo.poly }], axis };
  // Symmetric: both to the midline.
  const mid = (lo + hi) / 2;
  const mkSide = (S, P, sb, wantMax) => {
    const ok = wantMax ? touchesMax(sb) : touchesMin(sb);
    if (!ok) return null;
    const np = clipHalf(P,
      axis === "x" ? { x: mid, z: 0 } : { x: 0, z: mid },
      wantMax ? (axis === "x" ? { x: -1, z: 0 } : { x: 0, z: -1 }) : (axis === "x" ? { x: 1, z: 0 } : { x: 0, z: 1 }));
    return acceptSolo(S, P, np);
  };
  if (process.env.ZFIGHT_DEBUG) console.error("DBG", q.a, q.b, "ob", JSON.stringify(ob), "axis", axis, "fa", fa.toFixed(4), "fb", fb.toFixed(4), "mid", mid);
  const eA = mkSide(A, pa, ba, true) ?? mkSide(A, pa, ba, false);
  const eB = mkSide(B, pb, bb, true) ?? mkSide(B, pb, bb, false);
  if (process.env.ZFIGHT_DEBUG) console.error("DBG eA", !!eA, "eB", !!eB);
  if (eA && eB) return { edits: [eA, eB], axis };
  } // end axis loop
  return { manual: true };
}
function localPoly(s, world) {
  const yaw = s.yaw ?? 0;
  return world.map((p) => rot({ x: p.x - s.x, z: p.z - s.z }, -yaw));
}
// Surgical text edits: replace footprint arrays or box numbers in place,
// preserving the file's formatting and line endings.
export function applyTextEdits(raw, level, edits) {
  const NL = raw.includes("\r\n") ? "\r\n" : "\n";
  const solidsAt = raw.indexOf('"solids"');
  let out = raw;
  const findBlock = (id) => {
    const m = new RegExp(`"id"\\s*:\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g");
    let hit = null, mm;
    while ((mm = m.exec(out)) !== null) {
      if (mm.index < solidsAt) continue;
      hit = mm.index;
      break;
    }
    if (hit === null) throw new Error("block not found: " + id);
    const next = out.indexOf('"id"', hit + 4);
    return { start: hit, end: next < 0 ? out.length : next };
  };
  for (const e of edits) {
    const s = level.solids.find((x) => x.id === e.id);
    const { start, end } = findBlock(e.id);
    const block = out.slice(start, end);
    let next;
    if (s.footprint) {
      const local = localPoly(s, e.poly);
      const arr = "[" + local.map((p) => `{"x":${fmt(p.x)},"z":${fmt(p.z)}}`).join(",") + "]";
      const fpRe = /"footprint"\s*:\s*\[[^\]]*\]/;
      if (!fpRe.test(block)) throw new Error("footprint not found: " + e.id);
      next = block.replace(fpRe, `"footprint":${arr}`);
    } else {
      // Plain axis-aligned box: move the clipped edge (bbox of the new poly).
      const bb = bbox(e.poly);
      const yaw = s.yaw ?? 0;
      if (Math.abs(yaw) > 0.001) {
        // Yawed box becomes footprint-defined; keep w/d as metadata.
        const local = localPoly(s, e.poly);
        const arr = "[" + local.map((p) => `{"x":${fmt(p.x)},"z":${fmt(p.z)}}`).join(",") + "]";
        const anchor = new RegExp(`"d"\\s*:\\s*-?[\\d.eE+-]+`);
        if (!anchor.test(block)) throw new Error("box anchor not found: " + e.id);
        next = block.replace(anchor, (m) => `${m},"footprint":${arr}`);
      } else {
        next = block;
        const put = (key, val) => {
          const re = new RegExp(`"${key}"\\s*:\\s*(-?[\\d.eE+-]+)`);
          if (!re.test(next)) throw new Error(`${key} not found: ${e.id}`);
          next = next.replace(re, `"${key}":${fmt(val)}`);
        };
        // Derive center/size along the clipped axis from the bbox; keep the other.
        const [cx, w] = [(bb.x0 + bb.x1) / 2, bb.x1 - bb.x0];
        const [cz, d] = [(bb.z0 + bb.z1) / 2, bb.z1 - bb.z0];
        if (Math.abs(cx - s.x) > 0.0005 || Math.abs(w - s.w) > 0.0005) { put("x", cx); put("w", w); }
        if (Math.abs(cz - s.z) > 0.0005 || Math.abs(d - s.d) > 0.0005) { put("z", cz); put("d", d); }
      }
    }
    out = out.slice(0, start) + next + out.slice(end);
  }
  return out;
}
export async function main(argv) {
const [cmd, file, ...rest] = argv;
const asJson = rest.includes("--json");
if (!cmd || !file || !["scan", "clip"].includes(cmd)) {
  console.error("Usage: node scripts/level-zfight.mjs scan|clip <level.json> [--apply] [--json]");
  process.exit(2);
}
const raw0 = await readFile(file, "utf8");
const level = JSON.parse(raw0);
const { suspects, skipped } = scanLevel(level);
if (cmd === "scan") {
  if (asJson) console.log(JSON.stringify({ file, suspects, skipped }));
  else {
    console.log(`${file}: ${suspects.length} suspect pair(s), ${skipped} tilted skipped`);
    for (const q of suspects) console.log(`  ${q.a} x ${q.b} top=${q.top} area=${q.area} at=(${q.x},${q.z})`);
  }
  process.exit(0);
}
// clip: iterate plan+apply+rescan until clean or stuck (max 3 passes).
const apply = rest.includes("--apply");
let cur = level, curRaw = raw0, allEdits = [], manual = [];
for (let pass = 0; pass < 3; pass++) {
  const { suspects: ss } = scanLevel(cur);
  if (!ss.length) break;
  const plans = ss.map((q) => ({ pair: `${q.a} x ${q.b}`, ...planPair(cur, q) }));
  const edits = [];
  for (const p of plans) {
    if (p.edits) edits.push(...p.edits);
    else manual.push(p.pair);
  }
  if (!edits.length) break;
  // Merge per slab: intersect all half-plane cuts (apply sequentially to the poly).
  const bySlab = new Map();
  for (const e of edits) {
    if (!bySlab.has(e.id)) bySlab.set(e.id, []);
    bySlab.get(e.id).push(e.poly);
  }
  const merged = [];
  for (const [id, polys] of bySlab) {
    const s = cur.solids.find((x) => x.id === id);
    let poly = worldPoly(s);
    for (const want of polys) {
      poly = clipByPoly(poly, want);
      if (poly.length < 3) break;
    }
    if (poly.length >= 3 && Math.abs(twiceArea(poly)) / 2 >= MIN_SLAB_AREA) merged.push({ id, poly });
  }
  curRaw = applyTextEdits(curRaw, cur, merged);
  cur = JSON.parse(curRaw);
  allEdits.push(...merged.map((e) => e.id));
  manual = [];
}
const again = scanLevel(cur);
if (apply) {
  await writeFile(file, curRaw);
  if (asJson) console.log(JSON.stringify({ file, clipped: [...new Set(allEdits)], remaining: again.suspects }));
  else {
    for (const id of [...new Set(allEdits)]) console.log(`  CLIPPED ${id}`);
    for (const q of again.suspects) console.log(`  MANUAL ${q.a} x ${q.b} (needs a human)`);
    console.log(`rescan: ${again.suspects.length} remaining`);
  }
} else if (asJson) console.log(JSON.stringify({ file, plans: allEdits, wouldRemain: again.suspects }));
else {
  console.log(`dry run: ${[...new Set(allEdits)].join(", ") || "nothing"} would be clipped; ${again.suspects.length} would remain`);
  for (const q of again.suspects) console.log(`  MANUAL ${q.a} x ${q.b} (needs a human)`);
  console.log("pass --apply to write");
}
}
if (process.argv[1]?.endsWith("level-zfight.mjs")) await main(process.argv.slice(2));
