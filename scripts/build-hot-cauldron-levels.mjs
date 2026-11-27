// One-shot builder: enriches UI-painted Hot Cauldron drafts into finished
// official levels (lava, hazards, gates, spawn, medals, decor) plus the
// headless drive routes used by tests/hot-cauldron-levels.test.ts.
// Reads pristine drafts from artifacts/paint-drafts (copied from the paint
// spec's output) so re-runs never stack enrichment twice; writes finals to
// levels/official/hot-cauldron.
// Usage: node scripts/build-hot-cauldron-levels.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// The game's own clipper, bundled fresh every run (esbuild ships with vite).
const CLIP_BUNDLE = join(tmpdir(), `hc-clip-${process.pid}.mjs`);
execFileSync(
  process.execPath,
  [
    "node_modules/esbuild/bin/esbuild",
    "src/editor-clip.ts",
    "--bundle",
    "--format=esm",
    "--platform=node",
    `--outfile=${CLIP_BUNDLE}`,
    "--log-level=error",
  ],
  { stdio: "inherit" },
);
const { previewAutoClip } = await import(pathToFileURL(CLIP_BUNDLE).href);

const DRAFTS = "artifacts/paint-drafts";
const DIR = "levels/official/hot-cauldron";
const ROUTES_OUT = "tests/hot-cauldron-routes.json";

// ---------- geometry ----------
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const yawOf = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

/**
 * Drive line from paint-emission order: materialize numbers pieces road-N in
 * stroke order, so sorting fragments by their original index recovers the
 * exact path (no spatial chaining ambiguity at crossings or tight arms).
 * Returns group centroids in path order.
 */
function emissionLine(pieces) {
  const groups = new Map();
  for (const p of pieces) {
    const m = p.id.match(/^road-(\d+)/);
    const idx = m ? parseInt(m[1], 10) : 1e9;
    if (!groups.has(idx)) groups.set(idx, []);
    groups.get(idx).push(p);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, ps]) => ({
      x: ps.reduce((a, p) => a + p.x, 0) / ps.length,
      z: ps.reduce((a, p) => a + p.z, 0) / ps.length,
      y: ps.reduce((a, p) => a + p.y, 0) / ps.length,
      h: ps.reduce((a, p) => a + p.h, 0) / ps.length,
      pieces: ps,
    }));
}

function centroid(pieces) {
  return {
    x: pieces.reduce((a, p) => a + p.x, 0) / pieces.length,
    z: pieces.reduce((a, p) => a + p.z, 0) / pieces.length,
  };
}

/** Waypoints every kth ordered center with curvature-based speeds. */
function waypoints(order, every, fast = 15, reach = 8) {
  const wps = [];
  for (let i = 0; i < order.length; i += every) {
    const p = order[i];
    const a = order[Math.max(0, i - every)];
    const b = order[Math.min(order.length - 1, i + every)];
    const turn = Math.abs(angDiff(yawOf(a, p), yawOf(p, b)));
    const speed = turn > 0.55 ? 8 : turn > 0.3 ? 11 : fast;
    wps.push([p.x, p.z, speed, reach]);
  }
  const last = order[order.length - 1];
  wps.push([last.x, last.z, 8, 6]);
  return wps;
}

// ---------- level assembly ----------
const load = (name) => {
  const level = JSON.parse(readFileSync(`${DRAFTS}/${name}.json`, "utf8"));
  reunifyRoads(name, level);
  return level;
};
/**
 * Re-clip painted roads onto one flat layer. Multi-stroke paint snaps later
 * strokes onto earlier roads (+0.03), and materialize only clips within the
 * fresh stroke, so cross-stroke overlaps survive as stacked duplicates with
 * coplanar faces (z-fighting) that become unclimbable slab walls once the
 * spiral pitch separates them. Flatten + full mutual clip restores the single
 * contiguous deck the drive line assumes. Must run before any builder-added
 * road exists (run-outs share kind "road").
 */
function reunifyRoads(name, level) {
  const roads = paintedRoads(level);
  for (const r of roads) {
    if (Math.abs(r.h - 0.03) > 1e-9) console.log(`WARN ${name}: ${r.id} h=${r.h}, expected 0.03`);
    r.y = 0.015;
  }
  const t0 = Date.now();
  const res = previewAutoClip(level.solids, roads.map((r) => r.id));
  level.solids = res.solids;
  console.log(
    `${name}: reunified ${roads.length} painted roads in ${((Date.now() - t0) / 1000).toFixed(1)}s (${res.affected.length} cut, ${res.issues.length} issues, ${res.slivers} slivers)`,
  );
  for (const i of res.issues.slice(0, 5)) console.log(`  issue: ${i}`);
}
const loadFinal = (name) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8"));
const save = (name, level) =>
  writeFileSync(`${DIR}/${name}.json`, JSON.stringify(level, null, 2) + "\n");

let prefabN = 0;
const prefab = (kind, x, z, extra = {}) => ({
  id: `${kind}-${++prefabN}`,
  kind,
  x,
  z,
  ...extra,
});
let solidN = 0;
const solid = (kind, x, y, z, w, h, d, extra = {}) => ({
  id: `${kind}-x${++solidN}`,
  kind,
  x,
  y,
  z,
  w,
  h,
  d,
  ...extra,
});

/** Painted road pieces (everything but the blank straight road + ground). */
function paintedRoads(level) {
  return level.solids.filter((s) => s.kind === "road" && s.id !== "road-1");
}

function roadTop(piece) {
  return piece.y + piece.h / 2;
}

/** Common volcanic ground: cracked red earth + a vast lava field beyond. */
function volcanoBase(level) {
  level.solids = level.solids.filter((s) => s.id !== "road-1");
  const roads = paintedRoads(level);
  const rxs = roads.map((s) => s.x);
  const rzs = roads.map((s) => s.z);
  for (const s of level.solids) {
    if (s.kind === "ground") {
      s.color = 0xffffff;
      s.texture = "cracked_red_ground";
      // The painted circuit may spill past the blank slab; grow under it.
      const x0 = Math.min(s.x - s.w / 2, Math.min(...rxs) - 25);
      const x1 = Math.max(s.x + s.w / 2, Math.max(...rxs) + 25);
      const z0 = Math.min(s.z - s.d / 2, Math.min(...rzs) - 25);
      const z1 = Math.max(s.z + s.d / 2, Math.max(...rzs) + 25);
      s.x = (x0 + x1) / 2;
      s.z = (z0 + z1) / 2;
      s.w = x1 - x0;
      s.d = z1 - z0;
    }
  }
  level.solids.push(solid("lava", 0, -8.25, 0, 560, 0.5, 560, { color: 0xff5a17 }));
  level.backgroundTemplate = "volcanic-fields";
  level.forceNight = true;
  level.previewGameLighting = true;
  level.medals = { gold: 120, silver: 200, bronze: 320 };
}

/** Spawn + ordered gates + finish along a chained centerline. */
function gatesFor(level, order, fractions) {
  const first = order[0];
  const second = order[1];
  const top = roadTop(first);
  level.spawn = {
    x: first.x,
    y: top + 2.1,
    z: first.z,
    yaw: yawOf(first, second),
  };
  level.checkpoints = fractions.map((f) => {
    const p = order[Math.min(order.length - 1, Math.floor(f * order.length))];
    const q = order[Math.min(order.length - 1, Math.floor(f * order.length) + 1)];
    return { x: p.x, y: roadTop(p) + 2, z: p.z, yaw: yawOf(p, q) };
  });
}

/** Gold star riding the drive line so the completion run banks it. */
function starOnPath(level, order, frac = 0.55, side = 3) {
  const i = Math.floor(frac * order.length);
  const p = order[i];
  const q = order[Math.min(order.length - 1, i + 1)];
  const yaw = yawOf(p, q);
  const star = prefab("gold-star", p.x + Math.cos(yaw) * side, p.z - Math.sin(yaw) * side, {
    y: roadTop(p) + 2.5,
  });
  // Official convention: the single star is always gold-star-1.
  star.id = "gold-star-1";
  level.prefabs.push(star);
}

/** Fire-orange spawn gate: two jack-o-lanterns flanking the opening straight.
 * They use a non-CLEAR kind so separation never shoves them out of frame;
 * at 8u off-center they are well clear of the car. */
function spawnJackGlow(level, order) {
  const p = order[2];
  const q = order[Math.min(order.length - 1, 3)];
  const yaw = yawOf(p, q);
  for (const s of [-1, 1]) {
    level.prefabs.push(
      prefab("jack-o-lantern", p.x + Math.cos(yaw) * s * 8, p.z - Math.sin(yaw) * s * 8, {
        y: roadTop(p),
      }),
    );
  }
}

/** Teal glow mushrooms lighting the road edges, Peak Danger style. */
function mushroomLights(level, order, every, offset = 11) {
  for (let i = 0; i < order.length; i += every) {
    const p = order[i];
    const q = order[Math.min(order.length - 1, i + 1)];
    const yaw = yawOf(p, q);
    const s = i % (every * 2) === 0 ? 1 : -1;
    level.prefabs.push(
      prefab("glow-mushroom", p.x + Math.cos(yaw) * offset * s, p.z - Math.sin(yaw) * offset * s, {
        y: roadTop(p),
      }),
    );
  }
}

// ---------- L3: Figure Eight Inferno (jump the middle hole) ----------
const HOLE_R = 8;
function buildFigureEight() {
  const level = load("Figure Eight Inferno");
  volcanoBase(level);
  const roads = paintedRoads(level);
  const order = emissionLine(roads);
  const c = centroid(order);
  // Cut a pit at the crossing: carve the ground, pool lava below, drop ramps.
  const HX = 16;
  const g = level.solids.find((s) => s.kind === "ground");
  level.solids = level.solids.filter((s) => s.kind !== "ground");
  const rxs = order.map((p) => p.x);
  const rzs = order.map((p) => p.z);
  const G = {
    x0: Math.min(g.x - g.w / 2, Math.min(...rxs) - 25),
    x1: Math.max(g.x + g.w / 2, Math.max(...rxs) + 25),
    z0: Math.min(g.z - g.d / 2, Math.min(...rzs) - 25),
    z1: Math.max(g.z + g.d / 2, Math.max(...rzs) + 25),
  };
  const slab = (x0, x1, z0, z1) =>
    x1 > x0 && z1 > z0
      ? solid("ground", (x0 + x1) / 2, g.y, (z0 + z1) / 2, x1 - x0, g.h, z1 - z0, {
          color: 0xffffff,
          texture: "cracked_red_ground",
        })
      : null;
  level.solids.push(
    ...[
      slab(G.x0, G.x1, c.z + HX, G.z1),
      slab(G.x0, G.x1, G.z0, c.z - HX),
      slab(G.x0, c.x - HX, c.z - HX, c.z + HX),
      slab(c.x + HX, G.x1, c.z - HX, c.z + HX),
    ].filter(Boolean),
    solid("lava", c.x, -2.25, c.z, HX * 2 + 8, 0.5, HX * 2 + 8, { color: 0xff5a17 }),
  );
  // Delete road pieces over the pit; ramp each drive-line entry.
  level.solids = level.solids.filter((s) => s.kind !== "road" || dist2(s, c) >= HOLE_R);
  const entries = [];
  for (let i = 0; i < order.length; i++) {
    const a = order[i];
    const b = order[(i + 1) % order.length];
    if (dist2(a, c) >= HOLE_R && dist2(b, c) < HOLE_R) entries.push({ at: a, yaw: yawOf(a, b) });
  }
  for (const e of entries) {
    const dx = Math.sin(e.yaw);
    const dz = Math.cos(e.yaw);
    level.solids.push(
      solid("ramp", e.at.x - dx * 7, e.at.y + 2.8, e.at.z - dz * 7, 14, 0.4, 20, {
        yaw: e.yaw,
        angle: -0.38,
        color: 0x3a444d,
        texture: "asphalt_02",
      }),
    );
  }
  let drive = emissionLine(paintedRoads(level));
  // Start the loop far from the pit, and keep gates and star off the jumps.
  let si = 0;
  let sd = -1;
  drive.forEach((p, i) => {
    const d = dist2(p, c);
    if (d > sd) {
      sd = d;
      si = i;
    }
  });
  drive = [...drive.slice(si), ...drive.slice(0, si)];
  const clearOfHole = (f) => {
    let fr = f;
    for (let k = 0; k < 20; k++) {
      const p = drive[Math.min(drive.length - 1, Math.floor(fr * drive.length))];
      if (dist2(p, c) > HOLE_R + 12) return fr;
      fr += 0.03;
    }
    return fr;
  };
  gatesFor(level, drive, [0.3, 0.62, 0.97].map(clearOfHole));
  starOnPath(level, drive, clearOfHole(0.45));
  mushroomLights(level, drive, 14);
  spawnJackGlow(level, drive);
  level.prefabs.push(
    prefab("volcano", c.x - 42, c.z - 30, { resizeScale: 3 }),
    prefab("volcano", c.x + 44, c.z + 28, { resizeScale: 4 }),
    prefab("burner", c.x - 26, c.z + 34),
    prefab("burner", c.x + 28, c.z - 32),
  );
  save("Figure Eight Inferno", level);
  const wps = waypoints(drive, Math.max(1, Math.floor(drive.length / 14)), 15);
  // Fly the gaps: full speed across entries near the pit.
  for (const w of wps) {
    if (Math.hypot(w[0] - c.x, w[1] - c.z) < HOLE_R + 26) {
      w[2] = 24;
      w[3] = 12;
    }
  }
  return { id: "custom:figure-eight-inferno", route: wps };
}

// ---------- L4: Double Serpent (oversized lethal menagerie) ----------
function buildDoubleSerpent() {
  const level = load("Double Serpent");
  volcanoBase(level);
  const drive = emissionLine(paintedRoads(level));
  gatesFor(level, drive, [0.3, 0.6, 0.97]);
  starOnPath(level, drive, 0.5);
  mushroomLights(level, drive, 16);
  spawnJackGlow(level, drive);
  const at = (f, side, gap) => {
    const p = drive[Math.floor(f * drive.length)];
    const q = drive[Math.min(drive.length - 1, Math.floor(f * drive.length) + 1)];
    const yaw = yawOf(p, q);
    return { x: p.x + Math.cos(yaw) * side * gap, z: p.z - Math.sin(yaw) * side * gap };
  };
  // Oversized killers loom outside the track bbox (clear of every arm).
  const bxs = drive.map((p) => p.x);
  const bzs = drive.map((p) => p.z);
  const bx0 = Math.min(...bxs);
  const bx1 = Math.max(...bxs);
  const bz0 = Math.min(...bzs);
  const bz1 = Math.max(...bzs);
  const bcx = (bx0 + bx1) / 2;
  const bcz = (bz0 + bz1) / 2;
  level.prefabs.push(
    prefab("volcano", bx0 - 32, bcz, { resizeScale: 5 }),
    prefab("volcano", bx1 + 34, bcz, { resizeScale: 6 }),
    prefab("volcano", bcx, bz1 + 32, { resizeScale: 4 }),
    prefab("spike-gates", bx0 - 34, bz0 - 34, { resizeScale: 3 }),
    prefab("spike-gates", bx1 + 34, bz1 + 34, { resizeScale: 3 }),
    prefab("burner", at(0.25, 1, 18).x, at(0.25, 1, 18).z),
    prefab("burner", at(0.66, -1, 18).x, at(0.66, -1, 18).z),
  );
  // Lava pools just outside the track bbox: close enough to punish
  // mistakes, never overlapping an arm.
  for (const [px, pz] of [
    [bx0 - 25, bcz],
    [bx1 + 25, bcz],
    [bcx, bz1 + 25],
  ]) {
    level.solids.push(solid("lava", px, 0.1, pz, 24, 0.3, 24, { color: 0xff5a17 }));
  }
  save("Double Serpent", level);
  return {
    id: "custom:double-serpent",
    route: waypoints(drive, Math.max(1, Math.floor(drive.length / 30)), 10, 5),
  };
}

// ---------- L5: Spiral Ascent (climb, slide, cave, falls) ----------
function buildSpiralAscent() {
  const level = load("Spiral Ascent");
  volcanoBase(level);
  const line = emissionLine(paintedRoads(level));
  // Stroke order runs outside-in; if reversed, flip it.
  const cc = centroid(line);
  if (dist2(line[0], cc) < dist2(line[line.length - 1], cc)) line.reverse();
  // Pitch the spiral into a steady climb (same height per painted piece).
  const RISE = 44;
  const baseY = line[0].y;
  line.forEach((g, i) => {
    g.y = baseY + (RISE * i) / Math.max(1, line.length - 1);
    for (const p of g.pieces) p.y = g.y;
  });
  line.forEach((g, i) => {
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(line.length - 1, i + 1)];
    const ang = -Math.atan2(b.y - a.y, Math.max(1e-6, dist2(a, b)));
    for (const p of g.pieces) p.angle = ang;
  });
  const top = line[line.length - 1];
  const topYaw = yawOf(line[line.length - 2], top);
  // Slide: traverse outward past the rim at the top, then helix down OUTSIDE
  // the spiral so it never crosses an arm below.
  const slide = [];
  const sc = centroid(line);
  const rimR = Math.max(...line.map((p) => dist2(p, sc)));
  const outR = rimR + 18;
  // Match the spiral's winding sense so the helix continues the turn.
  let wound = 0;
  for (let i = 1; i < line.length; i++) {
    const a0 = Math.atan2(line[i - 1].x - sc.x, line[i - 1].z - sc.z);
    const a1 = Math.atan2(line[i].x - sc.x, line[i].z - sc.z);
    wound += angDiff(a1, a0);
  }
  const sense = wound >= 0 ? 1 : -1;
  {
    // Ray-circle: where the top tangent meets the helix circle.
    const dir0 = { x: Math.sin(topYaw), z: Math.cos(topYaw) };
    const ox = top.x - sc.x;
    const oz = top.z - sc.z;
    const bq = ox * dir0.x + oz * dir0.z;
    const cq = ox * ox + oz * oz - outR * outR;
    const tHit = -bq + Math.sqrt(Math.max(0, bq * bq - cq));
    const ang = Math.atan2(ox + dir0.x * tHit, oz + dir0.z * tHit);
    const sweep = sense * Math.PI * 2 * 0.55;
    const nHelix = 30;
    const P1 = { x: sc.x + Math.sin(ang) * outR, z: sc.z + Math.cos(ang) * outR };
    const a1e = ang + sweep / nHelix;
    const yawH = Math.atan2(Math.sin(a1e) - Math.sin(ang), Math.cos(a1e) - Math.cos(ang));
    // Hermite entry arc, C1 at both ends: leaves the top along topYaw and
    // arrives on the helix tangent. A straight traverse meets the circle
    // nearly radially (~80° kink); the arc bends ~8°/piece instead.
    const M0 = dir0;
    const M1 = { x: Math.sin(yawH), z: Math.cos(yawH) };
    const chord = Math.max(1e-6, dist2(top, P1));
    const L0 = chord / 3;
    const L1 = chord / 3;
    const DROP = 9.2;
    const H = (t) => {
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      return {
        x: h00 * top.x + h10 * L0 * M0.x + h01 * P1.x + h11 * L1 * M1.x,
        z: h00 * top.z + h10 * L0 * M0.z + h01 * P1.z + h11 * L1 * M1.z,
      };
    };
    // Arc-length placement: Hermite-t bunches pieces and the t=0.95 sample
    // misses the end tangent (~38° kink). Even segments keep ~8°/piece and
    // arrive on the helix tangent.
    const SAMPLES = 200;
    const pts = [];
    for (let j = 0; j <= SAMPLES; j++) pts.push(H(j / SAMPLES));
    const cum = [0];
    for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + dist2(pts[j - 1], pts[j]));
    const totalLen = cum[cum.length - 1];
    const at = (s) => {
      let j = 1;
      while (j < cum.length - 1 && cum[j] < s) j++;
      const f = (s - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]);
      return {
        x: pts[j - 1].x + (pts[j].x - pts[j - 1].x) * f,
        z: pts[j - 1].z + (pts[j].z - pts[j - 1].z) * f,
      };
    };
    const K = Math.max(8, Math.round(totalLen / 8));
    const segLen = totalLen / K;
    for (let i = 0; i < K; i++) {
      const p = at(segLen * (i + 0.5));
      const a = at(segLen * i);
      const b = at(segLen * (i + 1));
      const piece = solid("ramp", p.x, top.y - (DROP * (i + 0.5)) / K, p.z, 12, 0.5, segLen + 5, {
        yaw: Math.atan2(b.x - a.x, b.z - a.z),
        angle: Math.atan2(DROP / K, segLen),
        color: 0x3a444d,
        texture: "asphalt_02",
      });
      level.solids.push(piece);
      slide.push(piece);
    }
    const py = top.y - DROP;
    const dropPer = (py - 1.5) / nHelix;
    for (let i = 1; i <= nHelix; i++) {
      const a0 = ang + (sweep * (i - 1)) / nHelix;
      const a1 = ang + (sweep * i) / nHelix;
      const mx = sc.x + Math.sin((a0 + a1) / 2) * outR;
      const mz = sc.z + Math.cos((a0 + a1) / 2) * outR;
      const my = py - dropPer * (i - 0.5);
      const segLen = (Math.abs(sweep) / nHelix) * outR;
      const piece = solid("ramp", mx, my, mz, 12, 0.5, segLen + 4, {
        yaw: Math.atan2(
          Math.sin(a1) * outR - Math.sin(a0) * outR,
          Math.cos(a1) * outR - Math.cos(a0) * outR,
        ),
        angle: Math.atan2(dropPer, segLen),
        color: 0x3a444d,
        texture: "asphalt_02",
      });
      level.solids.push(piece);
      slide.push(piece);
    }
    // Boost pads for the rapid descent.
    for (const i of [2, 8]) {
      const p = slide[slide.length - nHelix + i * 3];
      if (p) level.prefabs.push(prefab("boost-pad", p.x, p.z, { y: p.y + 0.35 }));
    }
  }
  const landing = slide[slide.length - 1];
  const endYaw = yawOf(slide[slide.length - 2], landing);
  const lx = Math.sin(endYaw);
  const lz = Math.cos(endYaw);
  // Ground-level run-out road from the slide exit through the cave.
  const runout = [];
  for (let i = 0; i < 4; i++) {
    const px = landing.x + lx * (12 + i * 18);
    const pz = landing.z + lz * (12 + i * 18);
    const piece = solid("road", px, 0.06, pz, 12, 0.06, 22, {
      yaw: endYaw,
      color: 0x303e49,
      texture: "asphalt_02",
    });
    level.solids.push(piece);
    runout.push(piece);
  }
  // Cave tunnel over the landing run-out.
  for (let i = 1; i <= 3; i++) {
    const px = landing.x + lx * (10 + i * 14);
    const pz = landing.z + lz * (10 + i * 14);
    level.solids.push(
      solid("tile", px - lz * 9, 3, pz + lx * 9, 2, 8, 14, {
        yaw: endYaw,
        color: 0x2b2b30,
        texture: "dark_rock_02",
      }),
      solid("tile", px + lz * 9, 3, pz - lx * 9, 2, 8, 14, {
        yaw: endYaw,
        color: 0x2b2b30,
        texture: "dark_rock_02",
      }),
      solid("tile", px, 7.5, pz, 20, 1.5, 14, {
        yaw: endYaw,
        color: 0x232326,
        texture: "dark_rock_02",
      }),
    );
  }
  // Lavafall curtains flanking the cave mouth (tall, clear of the road).
  for (const along of [6, 34]) {
    for (const s of [-1, 1]) {
      level.solids.push(
        solid(
          "lava",
          landing.x + lx * along - lz * 16 * s,
          6,
          landing.z + lz * along + lx * 16 * s,
          1.4,
          12,
          6,
          { yaw: endYaw, color: 0xff6a1a },
        ),
      );
    }
  }
  for (const [along, s] of [
    [20, 1],
    [44, -1],
  ]) {
    level.prefabs.push(
      prefab("glow-mushroom", landing.x + lx * along - lz * 10 * s, landing.z + lz * along + lx * 10 * s, {
        y: 0.1,
      }),
    );
  }
  // Lava pools dotting the pit floor far below the climb.
  const pit = centroid(line);
  for (const [dx, dz] of [
    [-30, -24],
    [28, 26],
  ]) {
    level.solids.push(solid("lava", pit.x + dx, 0.1, pit.z + dz, 20, 0.3, 20, { color: 0xff5a17 }));
  }
  const finish = { x: landing.x + lx * 66, z: landing.z + lz * 66 };
  // Drive line: spiral, slide, cave run-out pieces, finish.
  const drive = [...line];
  for (const p of slide) drive.push(p);
  for (const p of runout) drive.push(p);
  drive.push({ ...runout[runout.length - 1], x: finish.x, z: finish.z });
  // Grow the pit floor under the slide + run-out (volcanoBase only saw the
  // climb): without it the helix overhangs the lava field and the finish sits
  // past the ground edge.
  {
    const g = level.solids.find((s) => s.kind === "ground");
    const xs = drive.map((p) => p.x);
    const zs = drive.map((p) => p.z);
    const x0 = Math.min(g.x - g.w / 2, Math.min(...xs) - 25);
    const x1 = Math.max(g.x + g.w / 2, Math.max(...xs) + 25);
    const z0 = Math.min(g.z - g.d / 2, Math.min(...zs) - 25);
    const z1 = Math.max(g.z + g.d / 2, Math.max(...zs) + 25);
    g.x = (x0 + x1) / 2;
    g.z = (z0 + z1) / 2;
    g.w = x1 - x0;
    g.d = z1 - z0;
  }
  gatesFor(level, drive, [0.3, 0.55, 0.78, 0.93, 0.995]);
  starOnPath(level, drive, 0.4);
  mushroomLights(level, line, 18);
  spawnJackGlow(level, line);
  // Volcanoes outside the full drive bbox (climb + slide): the slide helix
  // rings the rim, so peak-relative spots land on the slide itself.
  const dxs = drive.map((p) => p.x);
  const dzs = drive.map((p) => p.z);
  const dx0 = Math.min(...dxs);
  const dx1 = Math.max(...dxs);
  const dz0 = Math.min(...dzs);
  const dz1 = Math.max(...dzs);
  level.prefabs.push(
    prefab("volcano", dx1 + 40, (dz0 + dz1) / 2, { resizeScale: 5 }),
    prefab("volcano", (dx0 + dx1) / 2, dz1 + 40, { resizeScale: 3 }),
  );
  save("Spiral Ascent", level);
  // Dense waypoints: the inner turns are tight, and sparse chords hug the
  // road edge until a climb lip rolls the car off. Every ~4 groups keeps the
  // driver near the centerline.
  const wps = waypoints(drive, Math.max(1, Math.floor(drive.length / 48)), 11, 6);
  return { id: "custom:spiral-ascent", route: wps };
}

// ---------- L6: Caldera Rim (ring around the volcano) ----------
function buildCalderaRim() {
  const level = load("Caldera Rim");
  volcanoBase(level);
  const drive = emissionLine(paintedRoads(level));
  const c = centroid(drive);
  const rimR = drive.reduce((a, p) => a + dist2(p, c), 0) / drive.length;
  // Central volcano island in its own lava lake, clear of the rim road.
  // Square corners reach 1.41x, so keep them well inside the ring.
  const lakeHalf = Math.max(10, rimR * 0.55);
  level.solids.push(solid("lava", c.x, 0.1, c.z, lakeHalf * 2, 0.4, lakeHalf * 2, { color: 0xff5a17 }));
  level.prefabs.push(
    prefab("volcano", c.x, c.z, { y: 0.3, resizeScale: 7 }),
    prefab("burner", c.x + lakeHalf + 8, c.z - lakeHalf - 8),
    prefab("burner", c.x - lakeHalf - 8, c.z + lakeHalf - 8),
  );
  gatesFor(level, drive, [0.3, 0.62, 0.97]);
  starOnPath(level, drive, 0.5);
  mushroomLights(level, drive, 16);
  spawnJackGlow(level, drive);
  for (const f of [0.2, 0.7]) {
    const p = drive[Math.floor(f * drive.length)];
    level.prefabs.push(prefab("boost-pad", p.x, p.z, { y: roadTop(p) + 0.1 }));
  }
  save("Caldera Rim", level);
  return {
    id: "custom:caldera-rim",
    route: waypoints(drive, Math.max(1, Math.floor(drive.length / 22)), 12, 6),
  };
}

// ---------- L7: Ember Falls (out and back along the lava river) ----------
function buildEmberFalls() {
  const level = load("Ember Falls");
  volcanoBase(level);
  const drive = emissionLine(paintedRoads(level));
  // Lava river between the out and back legs, stopping short of both
  // ends and well clear of the hairpin bend. Legs may run along X or Z.
  const xs = drive.map((p) => p.x);
  const zs = drive.map((p) => p.z);
  const alongX = Math.max(...xs) - Math.min(...xs) >= Math.max(...zs) - Math.min(...zs);
  const bend = drive[Math.floor(0.5 * drive.length)];
  let river;
  if (alongX) {
    const bendAtMin = Math.abs(bend.x - Math.min(...xs)) < Math.abs(Math.max(...xs) - bend.x);
    const rx0 = bendAtMin ? bend.x + 48 : Math.min(...xs) + 12;
    const rx1 = bendAtMin ? Math.max(...xs) - 12 : bend.x - 48;
    river = {
      x: (rx0 + rx1) / 2,
      z: (Math.min(...zs) + Math.max(...zs)) / 2,
      w: Math.max(8, rx1 - rx0),
      d: Math.max(8, Math.max(...zs) - Math.min(...zs) - 24),
    };
  } else {
    const bendAtMin = Math.abs(bend.z - Math.min(...zs)) < Math.abs(Math.max(...zs) - bend.z);
    const rz0 = bendAtMin ? bend.z + 48 : Math.min(...zs) + 12;
    const rz1 = bendAtMin ? Math.max(...zs) - 12 : bend.z - 48;
    river = {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      z: (rz0 + rz1) / 2,
      w: Math.max(8, Math.max(...xs) - Math.min(...xs) - 24),
      d: Math.max(8, rz1 - rz0),
    };
  }
  level.solids.push(solid("lava", river.x, 0.1, river.z, river.w, 0.3, river.d, { color: 0xff5a17 }));
  // Burner gates: pairs flanking the road the car threads between.
  const gate = (f) => {
    const p = drive[Math.floor(f * drive.length)];
    const q = drive[Math.min(drive.length - 1, Math.floor(f * drive.length) + 1)];
    const yaw = yawOf(p, q);
    for (const s of [-1, 1])
      level.prefabs.push(prefab("burner", p.x + Math.cos(yaw) * 8.5 * s, p.z - Math.sin(yaw) * 8.5 * s));
  };
  gate(0.25);
  gate(0.7);
  gate(0.85);
  // Lavafall curtains flanking the hairpin apex.
  const hp = drive[Math.floor(0.5 * drive.length)];
  const hq = drive[Math.min(drive.length - 1, Math.floor(0.5 * drive.length) + 2)];
  const hyaw = yawOf(hp, hq);
  for (const s of [-1, 1]) {
    level.solids.push(
      solid("lava", hp.x + Math.cos(hyaw) * 18 * s, 4, hp.z - Math.sin(hyaw) * 18 * s, 1.4, 10, 5, {
        color: 0xff6a1a,
      }),
    );
  }
  gatesFor(level, drive, [0.28, 0.52, 0.76, 0.985]);
  starOnPath(level, drive, 0.75, 1);
  mushroomLights(level, drive, 18);
  level.prefabs.push(prefab("volcano", river.x - river.w / 2 - 24, river.z + 30, { resizeScale: 4 }));
  save("Ember Falls", level);
  const wps = waypoints(drive, Math.max(1, Math.floor(drive.length / 20)), 13, 6);
  const pin = drive[Math.floor(0.5 * drive.length)];
  for (const w of wps) {
    if (Math.hypot(w[0] - pin.x, w[1] - pin.z) < 30) {
      w[2] = 7;
      w[3] = 6;
    }
  }
  return { id: "custom:ember-falls", route: wps };
}

// ---------- Dream: Hot Cauldron Dream (nightmare wings gap) ----------
function buildDream() {
  const level = load("Hot Cauldron Dream");
  volcanoBase(level);
  // Hairpin apron: the turn is tighter than the car's radius, so widen the
  // road westward through the corner (extra strips merged into the deck).
  // Rails were tried here but their blunt ends speared the nose instead.
  {
    const pre = emissionLine(paintedRoads(level));
    let pgi = 0;
    let pgd = -1;
    for (let i = 0; i < pre.length - 1; i++) {
      const d = dist2(pre[i], pre[i + 1]);
      if (d > pgd) {
        pgd = d;
        pgi = i;
      }
    }
    for (let i = pgi - 6; i <= pgi; i++) {
      const p = pre[i];
      // Length from approach-side spacing (i+1 is across the gap for pgi).
      const q = i < pgi ? pre[i + 1] : pre[i - 1];
      const yaw = yawOf(i < pgi ? p : q, i < pgi ? q : p);
      const n = p.pieces[0].id.match(/^road-(\d+)/)[1];
      const s0 = p.pieces[0];
      level.solids.push({
        id: `road-${n}-wide`,
        kind: "road",
        x: p.x - Math.cos(yaw) * 8,
        y: 0.015,
        z: p.z + Math.sin(yaw) * 8,
        w: 8,
        h: 0.03,
        d: dist2(p, q) + 4,
        yaw,
        color: s0.color,
        texture: s0.texture ?? "asphalt_02",
      });
    }
    const res = previewAutoClip(
      level.solids,
      paintedRoads(level).map((r) => r.id),
    );
    level.solids = res.solids;
    console.log(
      `Hot Cauldron Dream: apron merged (${res.affected.length} cut, ${res.issues.length} issues, ${res.slivers} slivers)`,
    );
  }
  const drive = emissionLine(paintedRoads(level));
  // Find the painted gap and clamp it past any jump: wings required.
  let gi = 0;
  let gd = -1;
  for (let i = 0; i < drive.length - 1; i++) {
    const d = dist2(drive[i], drive[i + 1]);
    if (d > gd) {
      gd = d;
      gi = i;
    }
  }
  const WANT_GAP = 58;
  if (Math.abs(gd - WANT_GAP) > 4) {
    const gx = drive[gi + 1].x - drive[gi].x;
    const gz = drive[gi + 1].z - drive[gi].z;
    const gl = Math.max(1e-6, Math.hypot(gx, gz));
    const push = WANT_GAP - gd;
    for (let i = gi + 1; i < drive.length; i++) {
      const g = drive[i];
      g.x += (gx / gl) * push;
      g.z += (gz / gl) * push;
      for (const p of g.pieces) {
        p.x += (gx / gl) * push;
        p.z += (gz / gl) * push;
      }
    }
    gd = WANT_GAP;
  }
  const gapMid = {
    x: (drive[gi].x + drive[gi + 1].x) / 2,
    z: (drive[gi].z + drive[gi + 1].z) / 2,
  };
  // Carve the ground under the gap into a lava canyon.
  const g = level.solids.find((s) => s.kind === "ground");
  level.solids = level.solids.filter((s) => s.kind !== "ground");
  const dxs = drive.map((p) => p.x);
  const dzs = drive.map((p) => p.z);
  const G = {
    x0: Math.min(g.x - g.w / 2, Math.min(...dxs) - 25),
    x1: Math.max(g.x + g.w / 2, Math.max(...dxs) + 25),
    z0: Math.min(g.z - g.d / 2, Math.min(...dzs) - 25),
    z1: Math.max(g.z + g.d / 2, Math.max(...dzs) + 25),
  };
  const slab = (x0, x1, z0, z1) =>
    x1 > x0 && z1 > z0
      ? solid("ground", (x0 + x1) / 2, g.y, (z0 + z1) / 2, x1 - x0, g.h, z1 - z0, {
          color: 0xffffff,
          texture: "cracked_red_ground",
        })
      : null;
  const m = 14;
  const a = drive[gi];
  const b = drive[gi + 1];
  // Canyon carve hugs the flight middle: the east slab reaches to 3u past
  // the launch road end, so the hairpin and launch keep ground beneath them
  // (running wide = recovery, not lava), while the 40u+ middle stays
  // ground-free and the gap still requires wings.
  level.solids.push(
    ...[
      slab(G.x0, Math.min(a.x, b.x) - 8, G.z0, G.z1),
      slab(Math.max(a.x, b.x) - 3, G.x1, G.z0, G.z1),
    ].filter(Boolean),
    solid("lava", gapMid.x, -2.25, gapMid.z, Math.abs(b.x - a.x) + m * 2, 0.5, 90, { color: 0xff5a17 }),
  );
  // Wings late on the approach, star over the canyon mid-flight.
  const approach = drive.slice(0, gi + 1);
  const landing = drive.slice(gi + 1);
  const wp = approach[Math.floor(approach.length * 0.72)];
  level.prefabs.push(prefab("wings", wp.x, wp.z, { y: roadTop(wp) + 2 }));
  const dreamStar = prefab("gold-star", gapMid.x, gapMid.z, { y: 8 });
  dreamStar.id = "gold-star-1";
  level.prefabs.push(dreamStar);
  const gateAt = (part, f) => {
    const p = part[Math.min(part.length - 1, Math.floor(f * part.length))];
    const q = part[Math.min(part.length - 1, Math.floor(f * part.length) + 1)];
    return { x: p.x, y: roadTop(p) + 2, z: p.z, yaw: yawOf(p, q) };
  };
  const first = approach[0];
  const second = approach[1];
  level.spawn = { x: first.x, y: roadTop(first) + 2.1, z: first.z, yaw: yawOf(first, second) };
  level.checkpoints = [
    gateAt(approach, 0.35),
    gateAt(approach, 0.7),
    gateAt(landing, 0.3),
    gateAt(landing, 0.65),
    gateAt(landing, 0.985),
  ];
  mushroomLights(level, approach, 22, 13);
  const exs = drive.map((p) => p.x);
  const ezs = drive.map((p) => p.z);
  const ex0 = Math.min(...exs);
  const ex1 = Math.max(...exs);
  const ez0 = Math.min(...ezs);
  const ez1 = Math.max(...ezs);
  level.prefabs.push(
    prefab("volcano", ex0 - 34, ez0 - 30, { resizeScale: 6 }),
    prefab("volcano", ex1 + 36, ez1 + 28, { resizeScale: 5 }),
    prefab("volcano", (ex0 + ex1) / 2, ez1 + 32, { resizeScale: 4 }),
    prefab("spike-gates", (ex0 + ex1) / 2, ez0 - 36, { resizeScale: 3 }),
  );
  level.solids.push(
    solid("lava", ex0 - 24, 0.1, (ez0 + ez1) / 2, 22, 0.3, 22, { color: 0xff5a17 }),
    solid("lava", ex1 + 24, 0.1, (ez0 + ez1) / 2, 22, 0.3, 22, { color: 0xff5a17 }),
  );
  level.medals = { gold: 150, silver: 240, bronze: 400 };
  save("Hot Cauldron Dream", level);
  // Dense through the hairpin + launch: base sampling skips the true road
  // end (road-60..62) and cuts the hairpin across the carve. Force every
  // group from gi-8 to gi+2, crawl the turn, launch at full speed.
  const every = 4;
  const idxs = new Set();
  for (let i = 0; i < drive.length; i += every) idxs.add(i);
  for (let i = gi - 8; i <= gi + 2; i++) idxs.add(i);
  const order = [...idxs].filter((i) => i >= 0 && i < drive.length).sort((a, b) => a - b);
  const route = order.map((i) => {
    const p = drive[i];
    const a = drive[Math.max(0, i - 1)];
    const b = drive[Math.min(drive.length - 1, i + 1)];
    const turn = Math.abs(angDiff(yawOf(a, p), yawOf(p, b)));
    let speed = turn > 0.55 ? 8 : turn > 0.3 ? 11 : 13;
    if (i >= gi - 8 && i <= gi - 2) speed = Math.min(speed, 6);
    if (i === gi - 1) speed = 12;
    if (i === gi) speed = 24;
    if (i === gi + 1 || i === gi + 2) speed = 10;
    return [p.x, p.z, speed, 6];
  });
  // Flight waypoints: the launch heads ~140° away from the landing (U-turn
  // across the canyon), so the route must lead straight off the road end
  // first — otherwise the driver brakes at the edge instead of launching.
  // F1 = overshoot + U-turn top, F2 = star/gapMid, then the landing road.
  {
    const g = drive[gi];
    const h = drive[gi - 1];
    const lx = g.x - h.x;
    const lz = g.z - h.z;
    const ll = Math.max(1e-6, Math.hypot(lx, lz));
    route.splice(order.indexOf(gi) + 1, 0,
      [g.x + (lx / ll) * 20, g.z + (lz / ll) * 20, 24, 10],
      [gapMid.x, gapMid.z, 24, 8],
    );
  }
  const last = drive[drive.length - 1];
  route.push([last.x, last.z, 8, 6]);
  let flyFrom = route.length - 1;
  let fd = Infinity;
  route.forEach((w, i) => {
    const d = Math.hypot(w[0] - drive[gi].x, w[1] - drive[gi].z);
    if (d < fd) {
      fd = d;
      flyFrom = i;
    }
  });
  return { id: "custom:hot-cauldron-dream", route, flyFrom, gap: gd };
}

// ---------- run ----------
// Edge clearance from road pieces (conservative bbox extent). Spike banks
// span +/-26u in machine space, so gates stand well off the road.
const CLEAR = { volcano: 15, "spike-gates": 30, burner: 2.5, "glow-mushroom": 8 };
function edgeClear(p, pieces) {
  let best = Infinity;
  let at = pieces[0];
  for (const s of pieces) {
    const extent = Math.max(s.w, s.d) / 2;
    const d = dist2(p, s) - extent;
    if (d < best) {
      best = d;
      at = s;
    }
  }
  return { best, at };
}
/** Shove hazards away from the drive line until clear (or drop them). */
function separate(name, level, pieces) {
  level.prefabs = level.prefabs.filter((p) => {
    const base = CLEAR[p.kind];
    if (base === undefined) return true;
    const want = p.kind === "volcano" ? 3.5 * (p.resizeScale ?? 1) + 3 : base;
    for (let k = 0; k < 14; k++) {
      const { best, at } = edgeClear(p, pieces);
      if (best >= want) return true;
      const dx = p.x - at.x;
      const dz = p.z - at.z;
      const d = Math.max(1e-6, Math.hypot(dx, dz));
      p.x += (dx / d) * 7;
      p.z += (dz / d) * 7;
    }
    console.log(`WARN ${name}: dropping ${p.kind} ${p.id}, no clear spot`);
    return false;
  });
  // Small lava accents (pools, falls) slide to a clear spot, keeping the
  // best-seen position so oscillation never leaves them worse. Big slabs stay.
  for (const s of level.solids) {
    if (s.kind !== "lava" || s.y < -1 || Math.max(s.w, s.d) > 30) continue;
    const half = Math.max(s.w, s.d) / 2;
    let bx = s.x;
    let bz = s.z;
    let bclear = -Infinity;
    for (let k = 0; k < 16; k++) {
      const { best, at } = edgeClear(s, pieces);
      const clear = best - half;
      if (clear > bclear) {
        bclear = clear;
        bx = s.x;
        bz = s.z;
      }
      if (clear >= 2.5) break;
      const dx = s.x - at.x;
      const dz = s.z - at.z;
      const d = Math.max(1e-6, Math.hypot(dx, dz));
      s.x += (dx / d) * 6;
      s.z += (dz / d) * 6;
    }
    s.x = bx;
    s.z = bz;
  }
}
function audit(name, level, pieces) {
  for (const p of level.prefabs) {
    const base = CLEAR[p.kind];
    if (base === undefined) continue;
    const want = p.kind === "volcano" ? 3.5 * (p.resizeScale ?? 1) + 3 : base;
    const { best } = edgeClear(p, pieces);
    if (best < want)
      console.log(`WARN ${name}: ${p.kind} ${p.id} edge-clear ${best.toFixed(1)}u < ${want}u`);
  }
  for (const s of level.solids) {
    if (s.kind !== "lava" || s.y < -1) continue;
    // Only lava overlapping the car body zone (road top -1..+4) can hurt.
    // Axis math (lava slabs are near-axis-aligned; road extent conservative).
    let worst = Infinity;
    for (const r of pieces) {
      const top = r.y + r.h / 2;
      if (s.y - s.h / 2 > top + 4 || s.y + s.h / 2 < top - 1) continue;
      const re = Math.max(r.w, r.d) / 2;
      const ex = Math.max(0, Math.abs(s.x - r.x) - s.w / 2 - re);
      const ez = Math.max(0, Math.abs(s.z - r.z) - s.d / 2 - re);
      worst = Math.min(worst, Math.hypot(ex, ez) || -Math.min(s.w, s.d) / 2);
    }
    if (worst < 1.5)
      console.log(`WARN ${name}: lava ${s.id} edge-clear ${worst.toFixed(1)}u (may kiss the road)`);
  }
}

const builders = [
  ["Figure Eight Inferno", buildFigureEight],
  ["Double Serpent", buildDoubleSerpent],
  ["Spiral Ascent", buildSpiralAscent],
  ["Caldera Rim", buildCalderaRim],
  ["Ember Falls", buildEmberFalls],
  ["Hot Cauldron Dream", buildDream],
];
const routes = {};
for (const [name, build] of builders) {
  const { id, route, flyFrom, gap } = build();
  const level = loadFinal(name);
  // Ramps are drivable deck too: decor must clear the slide, not just roads.
  const pieces = level.solids.filter((s) => s.kind === "road" || s.kind === "ramp");
  separate(name, level, pieces);
  // Yaw burners ramp-out: the 18u launch ramp must face away from the road.
  for (const p of level.prefabs) {
    if (p.kind !== "burner") continue;
    let bx = 0;
    let bz = 0;
    let bd = Infinity;
    for (const s of pieces) {
      const d = dist2(p, s);
      if (d < bd) {
        bd = d;
        bx = s.x;
        bz = s.z;
      }
    }
    const ox = p.x - bx;
    const oz = p.z - bz;
    p.yaw = Math.atan2(-ox, -oz);
  }
  save(name, level);
  audit(name, level, pieces);
  const entry = { route };
  if (flyFrom !== undefined) entry.flyFrom = flyFrom;
  routes[id] = entry;
  console.log(
    `${id}: solids=${level.solids.length} prefabs=${level.prefabs.length} ` +
      `checkpoints=${level.checkpoints.length} waypoints=${route.length}` +
      (gap !== undefined ? ` gap=${gap.toFixed(0)}u` : ""),
  );
}
writeFileSync(ROUTES_OUT, JSON.stringify(routes, null, 1) + "\n");
console.log(`wrote ${ROUTES_OUT}`);
