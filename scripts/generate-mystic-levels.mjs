// Deterministic generator for the 3 mystic-caves race levels.
// Usage: node scripts/generate-mystic-levels.mjs
// Writes levels/official/{Mystic Caverns,Firefly Grotto,Lavabridge Abyss}.json
// and prints ideal-line stats for medal tuning.
import { writeFileSync } from "node:fs";

const MOSS = "glow_moss_01";
const WALL = "cave_wall_01";
const CRYSTAL = "crystal_vein_01";

let layer = 0;
function top(base) {
  layer += 1;
  return base + layer * 0.004;
}

function makeLevel(name, medals, limit) {
  return {
    name,
    mode: "race",
    spawn: { x: 0, y: 2, z: 0, yaw: 0 },
    checkpoints: [],
    solids: [],
    prefabs: [],
    medals,
    limit,
    underground: true,
    backgroundTemplate: "mystic-cave",
  };
}

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;
const yawTo = (x0, z0, x1, z1) => Math.atan2(x1 - x0, z1 - z0);

function solid(level, kind, id, x, yTop, z, w, d, o = {}) {
  const h = o.h ?? { road: 0.03, lava: 1, ground: 1.2 }[kind] ?? 2;
  level.solids.push({
    id,
    kind,
    x: round2(x),
    y: round2(yTop - h / 2),
    z: round2(z),
    w: round2(w),
    h,
    d: round2(d),
    ...(o.yaw === undefined ? {} : { yaw: round4(o.yaw) }),
    ...(o.angle === undefined ? {} : { angle: round4(o.angle) }),
    color: o.color ?? 0x2a3450,
    ...(o.texture === undefined ? {} : { texture: o.texture }),
    ...(o.name === undefined ? {} : { name: o.name }),
  });
}

function road(level, id, x, z, w, d, yaw, yTop = 0.03, o = {}) {
  solid(level, "road", id, x, top(yTop), z, w, d, { yaw, color: 0xc8d8d0, texture: MOSS, ...o });
}

function checkpoint(level, name, x, y, z) {
  level.checkpoints.push({ name, x: round2(x), y: round2(y), z: round2(z) });
}

function prefab(level, id, kind, x, z, o = {}) {
  level.prefabs.push({
    id,
    kind,
    x: round2(x),
    z: round2(z),
    ...(o.y === undefined ? {} : { y: round2(o.y) }),
    ...(o.yaw === undefined ? {} : { yaw: round4(o.yaw) }),
  });
}

/**
 * Fillet a polyline into tangent-continuous straights + circular arcs so
 * every turn is smooth. Nodes: [{x, z}]. Returns segments in travel order.
 */
function filletPath(nodes, r) {
  const segs = [];
  let cursor = { ...nodes[0] };
  const legs = [];
  for (let i = 1; i < nodes.length; i++) {
    const dx = nodes[i].x - nodes[i - 1].x, dz = nodes[i].z - nodes[i - 1].z;
    const len = Math.hypot(dx, dz);
    legs.push({ ux: dx / len, uz: dz / len, len });
  }
  for (let i = 1; i < nodes.length - 1; i++) {
    const u = legs[i - 1], v = legs[i];
    const cosT = Math.max(-1, Math.min(1, u.ux * v.ux + u.uz * v.uz));
    const theta = Math.acos(cosT);
    if (theta < 0.05) continue;
    const t = Math.min(r * Math.tan(theta / 2), u.len / 2 - 1, v.len / 2 - 1);
    const p = nodes[i];
    const t0 = { x: p.x - u.ux * t, z: p.z - u.uz * t };
    const t1 = { x: p.x + v.ux * t, z: p.z + v.uz * t };
    segs.push({ kind: "line", x0: cursor.x, z0: cursor.z, x1: t0.x, z1: t0.z });
    const cross = u.ux * v.uz - u.uz * v.ux;
    const side = cross > 0 ? 1 : -1;
    const nx = -u.uz * side, nz = u.ux * side;
    const rr = t / Math.tan(theta / 2);
    const cx = t0.x + nx * rr, cz = t0.z + nz * rr;
    segs.push({
      kind: "arc", cx, cz, r: rr,
      a0: Math.atan2(t0.z - cz, t0.x - cx),
      a1: Math.atan2(t1.z - cz, t1.x - cx),
      dir: side,
    });
    cursor = t1;
  }
  const last = nodes[nodes.length - 1];
  segs.push({ kind: "line", x0: cursor.x, z0: cursor.z, x1: last.x, z1: last.z });
  return segs;
}

/** Lay yawed deck slabs along filleted segments at deck height yTop. */
function deck(level, prefix, segs, width, yTop, o = {}) {
  let k = 0;
  for (const s of segs) {
    if (s.kind === "line") {
      const len = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
      if (len < 0.5) continue;
      const n = Math.max(1, Math.ceil(len / 14));
      const yaw = yawTo(s.x0, s.z0, s.x1, s.z1);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        road(level, `${prefix}-d${k++}`, s.x0 + (s.x1 - s.x0) * t, s.z0 + (s.z1 - s.z0) * t, width, (len / n) * 1.2 + 2, yaw, yTop, o);
      }
    } else {
      let sweep = (s.a1 - s.a0) * s.dir;
      while (sweep <= 0) sweep += Math.PI * 2;
      const len = s.r * sweep;
      const n = Math.max(3, Math.ceil(len / 11));
      for (let i = 0; i < n; i++) {
        const a = s.a0 + s.dir * ((i + 0.5) / n) * sweep;
        // Tangent for travel direction.
        const tx = -Math.sin(a) * s.dir, tz = Math.cos(a) * s.dir;
        road(level, `${prefix}-d${k++}`, s.cx + Math.cos(a) * s.r, s.cz + Math.sin(a) * s.r, width, (len / n) * 1.25 + 2, Math.atan2(tx, tz), yTop, o);
      }
    }
  }
}

/** Pitched ramp deck climbing from y0 to y1. */
function ramp(level, prefix, x0, z0, y0, x1, z1, y1, width, o = {}) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const yaw = yawTo(x0, z0, x1, z1);
  const angle = -Math.atan2(y1 - y0, len);
  const n = Math.max(2, Math.ceil(len / 16));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    solid(level, "ramp", `${prefix}-r${i}`, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t, width, (len / n) * 1.25 + 2, { yaw, angle, h: 0.4, color: 0xc8d8d0, texture: MOSS, ...o });
  }
}

/** Tunnel walls + roof along a straight run. */
function tunnel(level, prefix, x0, z0, x1, z1, width, deckY, o = {}) {
  const wallH = o.wallH ?? 10;
  const yaw = yawTo(x0, z0, x1, z1);
  const nx = Math.cos(yaw), nz = -Math.sin(yaw);
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.ceil(len / 20);
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      solid(level, "barrier", `${prefix}-w${side < 0 ? "l" : "r"}${i}`,
        x0 + (x1 - x0) * t + nx * side * (width / 2 + 2.5),
        deckY + wallH,
        z0 + (z1 - z0) * t + nz * side * (width / 2 + 2.5),
        3, (len / n) * 1.15, { yaw, h: wallH, color: 0x7070a8, texture: WALL });
    }
  }
  solid(level, "barrier", `${prefix}-roof`, (x0 + x1) / 2, deckY + wallH + 1, (z0 + z1) / 2, width + 10, len + 4, { yaw, h: 2, color: 0x60608f, texture: WALL });
}

/** Mushroom cluster + fairy + fireflies dressing. */
function grove(level, prefix, x, z, y = 0, n = 3) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + prefix.length;
    prefab(level, `${prefix}-mush-${i}`, "glow-mushroom", x + Math.cos(a) * 5, z + Math.sin(a) * 5, { y });
  }
  prefab(level, `${prefix}-fairy`, "cave-fairy", x, z, { y: y + 3 });
  for (let i = 0; i < 3; i++)
    prefab(level, `${prefix}-fire-${i}`, "firefly", x + (i - 1) * 6, z + (i % 2) * 5 - 2, { y: y + 2 });
}

/** Mushroom rows lining a tunnel interior (trackside glow). */
function tunnelShrooms(level, prefix, x0, z0, x1, z1, inset = 10.5) {
  const yaw = yawTo(x0, z0, x1, z1);
  const nx = Math.cos(yaw), nz = -Math.sin(yaw);
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.floor(len / 18);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const side = i % 2 ? 1 : -1;
    prefab(level, `${prefix}-tsh-${i}`, "glow-mushroom",
      x0 + (x1 - x0) * t + nx * side * inset,
      z0 + (z1 - z0) * t + nz * side * inset, { y: 0 });
  }
}

/** Perched bat cluster for a jump scare. */
function batRoost(level, prefix, x, z, y, count = 5) {
  for (let i = 0; i < count; i++)
    prefab(level, `${prefix}-bat-${i}`, "cave-bat", x + (i % 3) * 2 - 2, z + Math.floor(i / 3) * 2, { y: y + (i % 2) });
}

function polyOf(points) {
  let poly = 0;
  for (let i = 1; i < points.length; i++)
    poly += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  return poly;
}

function distToPath(x, z, path) {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const ax = path[i - 1].x, az = path[i - 1].z;
    const dx = path[i].x - ax, dz = path[i].z - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

const STRUCT = new Set(["container", "barrier", "support"]);

/** Mirror of tests/prefab-embed.test.ts: prefab bases must clear structural volumes. */
function assertNoEmbeds(level) {
  const structs = level.solids.filter((s) => STRUCT.has(s.kind));
  for (const p of level.prefabs) {
    const py = p.y ?? 0;
    for (const s of structs) {
      const yaw = s.yaw ?? 0;
      const c = Math.cos(-yaw), si = Math.sin(-yaw);
      const dx = p.x - s.x, dz = p.z - s.z;
      const lx = dx * c - dz * si, lz = dx * si + dz * c;
      if (Math.abs(lx) > s.w / 2 || Math.abs(lz) > s.d / 2) continue;
      const top = s.y + s.h / 2, bot = s.y - s.h / 2;
      if (py > top - 0.5 || py < bot) continue;
      throw new Error(`${level.name}: ${p.id} embedded in ${s.id} (py=${py} vs ${bot.toFixed(1)}..${top.toFixed(1)})`);
    }
  }
}

/** Assert gold-star geometry rules; throws with detail on violation. */
function assertStar(level, starId, landmarkId) {
  const star = level.prefabs.find((p) => p.id === starId);
  const path = [level.spawn, ...level.checkpoints];
  const dLine = distToPath(star.x, star.z, path);
  if (dLine < 15) throw new Error(`${level.name}: star ${dLine.toFixed(1)}u off line (<15)`);
  const mark = level.prefabs.find((p) => p.id === landmarkId) ?? level.solids.find((s) => s.id === landmarkId);
  if (!mark) throw new Error(`${level.name}: landmark ${landmarkId} missing`);
  const dMark = Math.hypot(mark.x - star.x, mark.z - star.z);
  if (dMark > 30) throw new Error(`${level.name}: landmark ${dMark.toFixed(1)}u away (>30)`);
  console.log(`${level.name}: star ${dLine.toFixed(1)}u off line, landmark ${dMark.toFixed(1)}u`);
}

// ---------------------------------------------------------------------------
// Level 1: Mystic Caverns — winding tunnels into a grand cavern with a
// ramp-over-rock pass, mushroom groves, a caterpillar and a dust moth.
// ---------------------------------------------------------------------------
function buildCaverns() {
  const level = makeLevel("Mystic Caverns", { gold: 85, silver: 125, bronze: 170 }, 230);
  solid(level, "ground", "mc-ground", 20, 0, -20, 440, 500, { color: 0x1a2030, texture: MOSS });
  // Flat deck in two parts; the ramp-over-rock pass bridges the gap.
  deck(level, "mc-a", filletPath([{ x: 0, z: -190 }, { x: 0, z: -100 }, { x: 70, z: -40 }, { x: 120, z: 50 }], 28), 24, 0.03);
  deck(level, "mc-b", filletPath([{ x: 90, z: 130 }, { x: 0, z: 150 }, { x: -90, z: 100 }, { x: -110, z: 0 }, { x: -80, z: -80 }], 28), 24, 0.03);
  tunnel(level, "mc-tun0", 0, -195, 0, -95, 24, 0);
  tunnelShrooms(level, "mc-tun0", 0, -195, 0, -95);
  // Ramp-over-rock pass bulging east off the racing line (verticality).
  // Wide flat switchback platform at the crest with room to turn.
  ramp(level, "mc-up", 120, 50, 0.08, 142, 88, 6, 20);
  solid(level, "road", "mc-peak", 128, 6.05, 100, 32, 28, { yaw: 0, color: 0xc8d8d0, texture: MOSS });
  ramp(level, "mc-down", 114, 114, 6, 90, 130, 0.08, 20);
  level.spawn = { x: 0, y: 2, z: -190, yaw: yawTo(0, -190, 0, -100) };
  checkpoint(level, "Tunnel Mouth", 0, 2, -100);
  checkpoint(level, "Cavern Bend", 70, 2, -40);
  checkpoint(level, "Shoulder Base", 120, 2, 50);
  checkpoint(level, "Loop Falls", 0, 2, 150);
  checkpoint(level, "Deep Exit", -80, 2, -80);
  // Central rock mass + crystal accents (roadside, off the deck).
  solid(level, "container", "mc-rock-core", 30, 8, 40, 26, 26, { h: 16, color: 0x3a3a55, texture: WALL, name: "Central Rock" });
  solid(level, "barrier", "mc-crystal-1", 20, 6, 50, 4, 4, { h: 12, color: 0x6a4a9a, texture: CRYSTAL, name: "Crystal Spire" });
  solid(level, "barrier", "mc-crystal-2", 150, 4, 115, 3, 3, { h: 8, color: 0x6a4a9a, texture: CRYSTAL });
  // Hazards + dressing.
  prefab(level, "mc-cat-1", "cave-caterpillar", 60, 130);
  prefab(level, "mc-moth-1", "cave-moth", -40, 60, { y: 0 });
  batRoost(level, "mc-roost", -6, -108, 7.5);
  grove(level, "mc-grove-s0", -6, -172, 0, 3);
  grove(level, "mc-grove-s1", 6, -165, 0, 3);
  grove(level, "mc-grove-a", -25, -60, 0, 4);
  grove(level, "mc-grove-b", 40, 100, 0, 4);
  grove(level, "mc-grove-peak", 126, 94, 6, 2);
  grove(level, "mc-grove-c", -95, 45, 0, 3);
  for (let i = 0; i < 6; i++)
    prefab(level, `mc-tunfire-${i}`, "firefly", i % 2 ? 8 : -8, -180 + i * 16, { y: 3 });
  // Gold star on the peak deck: on the road, far off the racing line.
  prefab(level, "gold-star-1", "gold-star", 140, 90, { y: 7.9 });
  assertStar(level, "gold-star-1", "mc-crystal-2");
  return level;
}

// ---------------------------------------------------------------------------
// Level 2: Firefly Grotto — tiered grotto, rickety plank bridge over a lava
// rift, dense fireflies, a caterpillar and a dust moth.
// ---------------------------------------------------------------------------
function buildGrotto() {
  const level = makeLevel("Firefly Grotto", { gold: 75, silver: 110, bronze: 150 }, 200);
  // Ground split around the lava rift (x 55..155, z 42..78).
  solid(level, "ground", "fg-ground-w", -82, 0, -20, 275, 500, { color: 0x1a2030, texture: MOSS });
  solid(level, "ground", "fg-ground-e", 187, 0, -20, 65, 500, { color: 0x1a2030, texture: MOSS });
  solid(level, "ground", "fg-ground-s", 105, 0, -109, 100, 302, { color: 0x1a2030, texture: MOSS });
  solid(level, "ground", "fg-ground-n", 105, 0, 169, 100, 182, { color: 0x1a2030, texture: MOSS });
  solid(level, "lava", "fg-rift", 105, -2, 60, 100, 36, { color: 0xff5a1f });
  // Rift pit walls (visible rock faces + a small guard lip).
  solid(level, "barrier", "fg-rift-wn", 55, 0.5, 60, 2, 36, { h: 4.5, color: 0x3a3a55, texture: WALL });
  solid(level, "barrier", "fg-rift-en", 155, 0.5, 60, 2, 36, { h: 4.5, color: 0x3a3a55, texture: WALL });
  // Grotto floor deck.
  deck(level, "fg-a", filletPath([{ x: 0, z: -180 }, { x: -70, z: -120 }, { x: -70, z: -30 }, { x: 0, z: 20 }], 26), 24, 0.03);
  tunnel(level, "fg-tun0", -8, -172, -62, -128, 24, 0);
  tunnelShrooms(level, "fg-tun0", -8, -172, -62, -128);
  // Climb to the bridge tier.
  ramp(level, "fg-up", 0, 20, 0.08, 50, 55, 6, 20);
  // Elevated approach stubs + plank bridge over the rift.
  deck(level, "fg-apr", filletPath([{ x: 50, z: 55 }, { x: 70, z: 60 }], 10), 12, 6);
  for (let i = 0; i < 14; i++)
    prefab(level, `fg-plank-${i}`, "rickety-plank", 72.5 + i * 5, 60, { y: 6 });
  // Guide-light fireflies strung over the bridge deck.
  for (let i = 0; i < 6; i++)
    prefab(level, `fg-bridgefire-${i}`, "firefly", 72 + i * 14, 60, { y: 9 });
  deck(level, "fg-ext", filletPath([{ x: 140, z: 60 }, { x: 170, z: 60 }], 10), 14, 6);
  // Extended landing pad giving the exit turn room (south half).
  road(level, "fg-pad-s", 155, 73, 30, 27, 0, 6.02);
  ramp(level, "fg-down", 155, 84, 6, 150, 140, 0.08, 20);
  deck(level, "fg-b", filletPath([{ x: 150, z: 140 }, { x: 100, z: 175 }, { x: 40, z: 180 }], 26), 24, 0.03);
  // Bridge support pylons rising from the lava, flanking the span.
  solid(level, "support", "fg-pier-1", 70, 6, 50, 3, 3, { h: 12, color: 0x8a6a3a });
  solid(level, "support", "fg-pier-2", 100, 6, 50, 3, 3, { h: 12, color: 0x8a6a3a });
  solid(level, "support", "fg-pier-3", 100, 6, 70, 3, 3, { h: 12, color: 0x8a6a3a });
  solid(level, "support", "fg-pier-4", 166, 5.9, 60, 3, 3, { h: 12, color: 0x8a6a3a });
  level.spawn = { x: 0, y: 2, z: -180, yaw: yawTo(0, -180, -70, -120) };
  checkpoint(level, "Grotto Floor", -70, 2, -30);
  checkpoint(level, "Climb Base", 0, 2, 20);
  checkpoint(level, "Far Landing", 150, 8, 60);
  checkpoint(level, "Lower Grotto", 150, 2, 140);
  checkpoint(level, "Firefly Rest", 40, 2, 180);
  // Rock arch at the bridge entrance (bat roost hangs here).
  solid(level, "barrier", "fg-arch-l", 58, 14, 48, 4, 4, { h: 16, color: 0x3a3a55, texture: WALL });
  solid(level, "barrier", "fg-arch-r", 58, 14, 72, 4, 4, { h: 16, color: 0x3a3a55, texture: WALL });
  solid(level, "barrier", "fg-arch-top", 58, 17, 60, 4, 28, { h: 3, color: 0x3a3a55, texture: WALL, name: "Bridge Arch" });
  // Hazards + dressing.
  prefab(level, "fg-cat-1", "cave-caterpillar", -40, -70);
  prefab(level, "fg-moth-1", "cave-moth", 120, 80, { y: 0 });
  batRoost(level, "fg-roost", 58, 60, 12.5);
  grove(level, "fg-grove-s0", -26, -156, 0, 3);
  grove(level, "fg-grove-s1", 18, -155, 0, 3);
  grove(level, "fg-grove-a", -100, -70, 0, 4);
  grove(level, "fg-grove-b", 30, -20, 0, 4);
  grove(level, "fg-grove-c", 120, 170, 0, 4);
  for (let i = 0; i < 10; i++)
    prefab(level, `fg-grotfire-${i}`, "firefly", -90 + (i % 5) * 12, -110 + Math.floor(i / 5) * 40, { y: 2 + (i % 3) });
  // Gold star on the elevated approach, off the racing line.
  prefab(level, "gold-star-1", "gold-star", 50, 55, { y: 7.9 });
  assertStar(level, "gold-star-1", "fg-plank-0");
  return level;
}

/** Circular-arch bridge deck along +z, chord `len`, peak `peak`, narrow. */
function archBridge(level, prefix, x, z0, len, peak, width, o = {}) {
  const r = (Math.pow(len / 2, 2) + peak * peak) / (2 * peak);
  const n = Math.max(8, Math.ceil(len / 12));
  for (let i = 0; i < n; i++) {
    const s = ((i + 0.5) / n) * len;
    const y = Math.sqrt(r * r - Math.pow(s - len / 2, 2)) - (r - peak);
    const slope = -(s - len / 2) / Math.sqrt(r * r - Math.pow(s - len / 2, 2));
    solid(level, "ramp", `${prefix}-a${i}`, x, y, z0 + s, width, (len / n) * 1.3 + 1.5, {
      yaw: 0, angle: -Math.atan(slope), h: 0.5, color: 0xc8d8d0, texture: MOSS, ...o,
    });
  }
}

// ---------------------------------------------------------------------------
// Level 3: Lavabridge Abyss — grand cavern, narrow arched bridge over a lava
// lake, twin moths, crystals and a far-side caterpillar.
// ---------------------------------------------------------------------------
function buildAbyss() {
  const level = makeLevel("Lavabridge Abyss", { gold: 85, silver: 125, bronze: 170 }, 230);
  // Ground split around the lava lake (x -40..120, z -10..110).
  solid(level, "ground", "la-ground-w", -135, 0, 20, 190, 500, { color: 0x1a2030, texture: MOSS });
  solid(level, "ground", "la-ground-e", 185, 0, 20, 130, 500, { color: 0x1a2030, texture: MOSS });
  solid(level, "ground", "la-ground-s", 40, 0, -135, 160, 250, { color: 0x1a2030, texture: MOSS });
  solid(level, "ground", "la-ground-n", 40, 0, 185, 160, 150, { color: 0x1a2030, texture: MOSS });
  solid(level, "lava", "la-lake", 40, -2, 50, 160, 120, { color: 0xff5a1f });
  // Lake rim walls with a guard lip; the north rim leaves a gap for the road.
  solid(level, "barrier", "la-rim-w", -40, 0.5, 50, 2, 120, { h: 4.5, color: 0x3a3a55, texture: WALL });
  solid(level, "barrier", "la-rim-e", 120, 0.5, 50, 2, 120, { h: 4.5, color: 0x3a3a55, texture: WALL });
  solid(level, "barrier", "la-rim-s", 40, 0.5, -10, 160, 2, { h: 4.5, color: 0x3a3a55, texture: WALL });
  solid(level, "barrier", "la-rim-nw", -16, 0.5, 110, 48, 2, { h: 4.5, color: 0x3a3a55, texture: WALL });
  solid(level, "barrier", "la-rim-ne", 85, 0.5, 110, 70, 2, { h: 4.5, color: 0x3a3a55, texture: WALL });
  // Approach through the west tunnel.
  deck(level, "la-a", filletPath([{ x: -150, z: -170 }, { x: -80, z: -150 }, { x: -80, z: -60 }, { x: -30, z: -30 }], 26), 24, 0.03);
  tunnel(level, "la-tun0", -142, -166, -86, -146, 24, 0);
  tunnelShrooms(level, "la-tun0", -142, -166, -86, -146);
  deck(level, "la-apr", filletPath([{ x: -30, z: -30 }, { x: 20, z: -44 }, { x: 20, z: -20 }], 12), 16, 0.03);
  // Railed funnel guiding the turn onto the bridge mouth.
  solid(level, "barrier", "la-rail-w", 13, 1.2, -22, 1.5, 18, { h: 1.2, color: 0x8a6a3a });
  solid(level, "barrier", "la-rail-e", 27, 1.2, -22, 1.5, 18, { h: 1.2, color: 0x8a6a3a });
  // The arched bridge: 120u chord, 10u peak, 10 wide, over open lava.
  archBridge(level, "la-arch", 20, -20, 120, 10, 10);
  // Guide-light fairies strung over the arch.
  for (let i = 0; i < 8; i++)
    prefab(level, `la-archfairy-${i}`, "cave-fairy", 20, -10 + i * 15, { y: 12 });
  deck(level, "la-b", filletPath([{ x: 20, z: 100 }, { x: 80, z: 140 }, { x: 140, z: 170 }, { x: 40, z: 210 }, { x: -60, z: 190 }], 26), 22, 0.03);
  tunnel(level, "la-tun1", 30, 208, -50, 192, 22, 0);
  tunnelShrooms(level, "la-tun1", 30, 208, -50, 192, 9.5);
  level.spawn = { x: -150, y: 2, z: -170, yaw: yawTo(-150, -170, -80, -150) };
  checkpoint(level, "West Tunnel", -80, 2, -60);
  checkpoint(level, "Arch Base", 20, 2, -20);
  checkpoint(level, "Arch Landing", 20, 2, 100);
  checkpoint(level, "Far Cavern", 140, 2, 170);
  checkpoint(level, "Abyss Gate", -60, 2, 190);
  // Crystal gardens flanking the lake.
  solid(level, "barrier", "la-crystal-1", -55, 7, 30, 5, 5, { h: 14, color: 0x6a4a9a, texture: CRYSTAL, name: "West Crystal" });
  solid(level, "barrier", "la-crystal-2", 135, 6, 60, 4, 4, { h: 12, color: 0x6a4a9a, texture: CRYSTAL });
  solid(level, "barrier", "la-crystal-3", 60, 5, 140, 4, 4, { h: 10, color: 0x6a4a9a, texture: CRYSTAL });
  // Hazards + dressing.
  prefab(level, "la-moth-1", "cave-moth", -10, 40, { y: 0 });
  prefab(level, "la-moth-2", "cave-moth", 50, 95, { y: 0 });
  prefab(level, "la-cat-1", "cave-caterpillar", 100, 150);
  batRoost(level, "la-roost", -10, 200, 7.5);
  grove(level, "la-grove-s0", -132, -158, 0, 3);
  grove(level, "la-grove-s1", -112, -128, 0, 3);
  grove(level, "la-grove-a", -100, -100, 0, 4);
  grove(level, "la-grove-b", 60, 200, 0, 4);
  grove(level, "la-grove-c", -70, 60, 0, 3);
  for (let i = 0; i < 8; i++)
    prefab(level, `la-lakefire-${i}`, "firefly", -30 + i * 20, -30 + (i % 3) * 60, { y: 3 });
  // Gold star on the far loop road where it bulges off the racing line.
  prefab(level, "gold-star-1", "gold-star", 40, 210, { y: 1.9 });
  assertStar(level, "gold-star-1", "la-grove-b-mush-0");
  return level;
}

const levels = [buildCaverns(), buildGrotto(), buildAbyss()];
for (const level of levels) {
  assertNoEmbeds(level);
  const pts = [level.spawn, ...level.checkpoints];
  const poly = Math.round(polyOf(pts));
  const pace = poly / level.medals.gold;
  console.log(`${level.name}: poly=${poly} pace=${pace.toFixed(2)} perfect=${(poly / 12.7).toFixed(1)}s steady=${(poly / 3.5).toFixed(1)}s gold=${level.medals.gold} solids=${level.solids.length} prefabs=${level.prefabs.length}`);
  writeFileSync(`levels/official/spooky-places/${level.name}.json`, JSON.stringify(level, null, 2) + "\n");
}
console.log("wrote 3 mystic levels");
