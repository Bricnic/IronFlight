// Deterministic generator for the 7 Space collection levels (dream excluded).
// Usage: node scripts/generate-space-levels.mjs
// Writes levels/official/space/*.json and prints ideal-line stats.
import { writeFileSync, mkdirSync } from "node:fs";

const DIR = "levels/official/space";
mkdirSync(DIR, { recursive: true });

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

// Rainbow road: consecutive pieces cycle these colors, each lit at 250lm.
const RAINBOW = [0xff3b5c, 0xff8a1e, 0xf2c200, 0x2fd35f, 0x2b7de2, 0x9a5fe0];

function makeLevel(name, backgroundTemplate) {
  return {
    level: {
      name,
      mode: "race",
      spawn: { x: 0, y: 2, z: -20, yaw: 0 },
      checkpoints: [],
      solids: [],
      prefabs: [],
      medals: { gold: 100, silver: 150, bronze: 220 },
      limit: 240,
      backgroundTemplate,
      gravityScale: 0.5,
      forceNight: true,
    },
    colorSeq: 0,
    prefabSeq: 0,
  };
}

function checkpoint(ctx, x, z, yaw) {
  ctx.level.checkpoints.push(yaw === undefined ? { x, z } : { x, z, yaw: round4(yaw) });
}

function solid(ctx, kind, id, x, yTop, z, w, d, o = {}) {
  const h = o.h ?? 1.2;
  ctx.level.solids.push({
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
    color: o.color ?? 0xffffff,
    ...(o.texture === undefined ? {} : { texture: o.texture }),
    ...(o.lightLumens === undefined ? {} : { lightLumens: o.lightLumens }),
    ...(o.lightColor === undefined ? {} : { lightColor: o.lightColor }),
    ...(o.footprint === undefined ? {} : { footprint: o.footprint }),
  });
}

function prefab(ctx, kind, x, z, o = {}) {
  ctx.prefabSeq += 1;
  ctx.level.prefabs.push({
    id: o.id ?? `${kind}-${ctx.prefabSeq}`,
    kind,
    x: round2(x),
    z: round2(z),
    ...(o.y === undefined ? {} : { y: round2(o.y) }),
    ...(o.yaw === undefined ? {} : { yaw: round4(o.yaw) }),
    ...(o.scale === undefined ? {} : { scale: o.scale }),
  });
}

/** Straight rainbow road: butt-jointed colored chunks, 250 lumens each. */
function straight(ctx, id, x0, z0, x1, z1, w = 16) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / 14));
  const yaw = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i < n; i++) {
    const ax = round2(x0 + ((x1 - x0) * i) / n), az = round2(z0 + ((z1 - z0) * i) / n);
    const bx = round2(x0 + ((x1 - x0) * (i + 1)) / n), bz = round2(z0 + ((z1 - z0) * (i + 1)) / n);
    const color = RAINBOW[(ctx.colorSeq + i) % RAINBOW.length];
    solid(ctx, "tile", `${id}-${i}`, (ax + bx) / 2, 0.05, (az + bz) / 2, w,
      round2(Math.hypot(bx - ax, bz - az) - 0.04), {
        h: 0.06,
        color,
        lightLumens: 250,
        lightColor: color,
        ...(yaw === 0 ? {} : { yaw }),
      });
  }
  ctx.colorSeq += n;
}

/**
 * Smooth arc road: chained convex trapezoid footprint solids sharing exact
 * miter edges (no gaps, no overlaps, no z-fighting), rainbow lit.
 * Angles in radians, point(t) = center + r*(cos t, sin t) in x/z.
 */
function arc(ctx, id, cx, cz, r, a0, a1, w = 16, pieces = 10) {
  // Normalize to an increasing sweep: same curve, stable winding + insets.
  if (a1 < a0) [a0, a1] = [a1, a0];
  const pt = (a, rr) => [cx + rr * Math.cos(a), cz + rr * Math.sin(a)];
  for (let i = 0; i < pieces; i++) {
    const t0 = a0 + ((a1 - a0) * i) / pieces;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / pieces;
    // Inset each bay slightly so neighbors share edges without area overlap.
    const pad = ((a1 - a0) / pieces) * 0.004;
    const s0 = t0 + pad, s1 = t1 - pad;
    const [ix0, iz0] = pt(s0, r - w / 2), [ox0, oz0] = pt(s0, r + w / 2);
    const [ix1, iz1] = pt(s1, r - w / 2), [ox1, oz1] = pt(s1, r + w / 2);
    const cx0 = (ix0 + ox0 + ix1 + ox1) / 4, cz0 = (iz0 + oz0 + iz1 + oz1) / 4;
    const color = RAINBOW[(ctx.colorSeq + i) % RAINBOW.length];
    const span = Math.hypot(ix1 - ix0, iz1 - iz0);
    // Kind "tile" renders the flat color; "road" would force a gray default.
    solid(ctx, "tile", `${id}-${i}`, cx0, 0.05, cz0, w + 1, span + 1, {
      h: 0.06,
      color,
      lightLumens: 250,
      lightColor: color,
      footprint: [
        { x: round2(ix0 - cx0), z: round2(iz0 - cz0) },
        { x: round2(ox0 - cx0), z: round2(oz0 - cz0) },
        { x: round2(ox1 - cx0), z: round2(oz1 - cz0) },
        { x: round2(ix1 - cx0), z: round2(iz1 - cz0) },
      ],
    });
  }
  ctx.colorSeq += pieces;
}

const DECK = "station_deck_01";
const REGOLITH = "moon_regolith_01";

// --- Level 1: Airlock Approach (station exterior intro) ---
{
  const ctx = makeLevel("Airlock Approach", "station-void");
  ctx.level.spawn = { x: 0, y: 2, z: -20, yaw: 0 };
  solid(ctx, "ground", "g1", 0, 0, 60, 160, 260, { texture: DECK });
  solid(ctx, "ground", "g2", -140, 0, 190, 220, 120, { texture: DECK });
  straight(ctx, "r-straight", 0, -30, 0, 150);
  arc(ctx, "r-turn", -40, 150, 40, 0, Math.PI / 2, 16, 10);
  straight(ctx, "r-leg", -40, 190, -200, 190);
  for (const [x, z] of [[0, 40], [0, 100], [0, 150], [-19, 184], [-40, 190], [-100, 190], [-160, 190]])
    checkpoint(ctx, x, z);
  checkpoint(ctx, -195, 190);
  prefab(ctx, "gold-star", 12, 100, { id: "gold-star-1", y: 2 });
  for (const [x, z] of [[-14, 20], [14, 60], [-14, 110], [14, 140], [-70, 204], [-130, 176]])
    prefab(ctx, "station-pillar", x, z);
  for (const [x, z] of [[-16, 45], [16, 45], [16, 130], [-70, 176], [-130, 204]])
    prefab(ctx, "supply-crate", x, z);
  for (const [x, z] of [[22, 90], [-22, 130]])
    prefab(ctx, "solar-panel", x, z, { yaw: 0.3 });
  prefab(ctx, "satellite-dish", -60, 150);
  prefab(ctx, "alien", 45, 60);
  prefab(ctx, "oxygen-tank", -16, 75);
  finishLevel(ctx, "Airlock Approach.json");
}

// --- Level 2: Station Ring (full exterior loop) ---
{
  const ctx = makeLevel("Station Ring", "station-void");
  ctx.level.spawn = { x: 140, y: 2, z: 100, yaw: -Math.PI / 2 };
  solid(ctx, "ground", "g-ring", 0, 0, 100, 340, 340, { texture: DECK });
  arc(ctx, "r-ring", 0, 100, 70, 0, Math.PI * 2, 16, 28);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    // Gate 1 faces ring-tangent travel: the truck approaches from the
    // star detour, not from the spawn the default normal assumes.
    checkpoint(ctx, 70 * Math.cos(a), 100 + 70 * Math.sin(a), i === 0 ? -Math.PI / 4 : undefined);
  }
  prefab(ctx, "gold-star", 88, 100, { id: "gold-star-1", y: 2 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    prefab(ctx, "station-pillar", 96 * Math.cos(a), 100 + 96 * Math.sin(a));
    prefab(ctx, "solar-panel", 48 * Math.cos(a), 100 + 48 * Math.sin(a), { yaw: a });
  }
  for (const [x, z] of [[140, 140], [60, 40], [-5, 185], [40, 190]])
    prefab(ctx, "supply-crate", x, z);
  prefab(ctx, "asteroid", -120, 100, { y: 9, yaw: Math.PI / 2 });
  prefab(ctx, "asteroid", 120, -60, { y: 14, yaw: -Math.PI / 2 });
  prefab(ctx, "ufo", -150, 100);
  prefab(ctx, "satellite-dish", -100, 40);
  prefab(ctx, "satellite-dish", 100, 170);
  finishLevel(ctx, "Station Ring.json");
}

// --- Level 3: Solar Array (S-curves between panel rows) ---
{
  const ctx = makeLevel("Solar Array", "station-void");
  ctx.level.spawn = { x: 0, y: 2, z: -20, yaw: 0 };
  solid(ctx, "ground", "g1", 40, 0, 100, 280, 300, { texture: DECK });
  solid(ctx, "ground", "g2", 140, 0, 280, 280, 240, { texture: DECK });
  straight(ctx, "r-s1", 0, -30, 0, 120);
  arc(ctx, "r-t1", 40, 120, 40, Math.PI, Math.PI / 2, 16, 10);
  straight(ctx, "r-s2", 40, 160, 140, 160);
  arc(ctx, "r-t2", 140, 200, 40, -Math.PI / 2, 0, 16, 10);
  straight(ctx, "r-s3", 180, 200, 180, 350);
  for (const [x, z] of [[0, 40], [0, 110], [20, 150], [60, 160], [120, 160], [168, 172], [180, 250], [180, 320]])
    checkpoint(ctx, x, z);
  checkpoint(ctx, 180, 345);
  prefab(ctx, "gold-star", 100, 172, { id: "gold-star-1", y: 2 });
  for (const [x, z] of [[60, 140], [90, 140], [120, 140], [60, 180], [90, 180], [120, 180]])
    prefab(ctx, "solar-panel", x, z, { yaw: 0.4 });
  for (const [x, z] of [[16, 70], [-16, 100], [100, 140], [196, 300]])
    prefab(ctx, "supply-crate", x, z);
  for (const [x, z] of [[164, 220], [200, 180]])
    prefab(ctx, "oxygen-tank", x, z);
  for (const [x, z] of [[-14, 140], [194, 260]])
    prefab(ctx, "station-pillar", x, z);
  prefab(ctx, "alien", -20, 60);
  prefab(ctx, "ufo", 150, 250);
  finishLevel(ctx, "Solar Array.json");
}

// --- Level 4: Reactor Core (enclosed interior hangar) ---
{
  const ctx = makeLevel("Reactor Core", "station-void");
  ctx.level.spawn = { x: -30, y: 2, z: 0, yaw: 0 };
  solid(ctx, "ground", "floor", 0, 0, 110, 140, 280, { texture: DECK });
  // Walls rise 12 above the floor with a ceiling slab on top.
  solid(ctx, "barrier", "wall-w", -70, 12, 110, 4, 280, { h: 12, color: 0x3a414c });
  solid(ctx, "barrier", "wall-e", 70, 12, 110, 4, 280, { h: 12, color: 0x3a414c });
  solid(ctx, "barrier", "wall-s", 0, 12, -30, 144, 4, { h: 12, color: 0x3a414c });
  solid(ctx, "barrier", "wall-n", 0, 12, 250, 144, 4, { h: 12, color: 0x3a414c });
  solid(ctx, "barrier", "roof", 0, 13, 110, 144, 284, { h: 1, color: 0x232830 });
  straight(ctx, "r-up", -30, -30, -30, 190);
  arc(ctx, "r-hairpin", 0, 190, 30, 0, Math.PI, 16, 12);
  straight(ctx, "r-down", 30, 190, 30, 20);
  for (const [x, z] of [[-30, 40], [-30, 120], [-24, 175], [0, 218], [24, 205], [30, 190], [30, 120], [30, 60]])
    checkpoint(ctx, x, z);
  checkpoint(ctx, 30, 25);
  prefab(ctx, "gold-star", 0, 220, { id: "gold-star-1", y: 2 });
  for (const [x, z] of [[-52, 60], [-52, 140], [52, 60], [52, 140], [0, 60], [0, 120]])
    prefab(ctx, "station-pillar", x, z);
  for (const [x, z] of [[-52, 100], [52, 100], [-10, 230], [10, 230]])
    prefab(ctx, "supply-crate", x, z);
  prefab(ctx, "oxygen-tank", -52, 20);
  prefab(ctx, "oxygen-tank", 52, 20);
  prefab(ctx, "alien", 0, 90);
  prefab(ctx, "alien", -45, 215);
  finishLevel(ctx, "Reactor Core.json");
}

// --- Level 5: Docking Bay (tunnel exit to exterior pad) ---
{
  const ctx = makeLevel("Docking Bay", "station-void");
  ctx.level.spawn = { x: 0, y: 2, z: -20, yaw: 0 };
  solid(ctx, "ground", "gin", 0, 0, 50, 120, 220, { texture: DECK });
  solid(ctx, "ground", "gout", -80, 0, 260, 360, 220, { texture: DECK });
  // Enclosed tunnel for the first straight, open pad after.
  solid(ctx, "barrier", "tun-w", -14, 10, 40, 4, 170, { h: 10, color: 0x3a414c });
  solid(ctx, "barrier", "tun-e", 14, 10, 40, 4, 170, { h: 10, color: 0x3a414c });
  solid(ctx, "barrier", "tun-roof", 0, 11, 40, 32, 170, { h: 1, color: 0x232830 });
  straight(ctx, "r-tun", 0, -30, 0, 125);
  straight(ctx, "r-pad", 0, 125, 0, 230);
  arc(ctx, "r-sweep", -70, 230, 70, 0, Math.PI / 2, 16, 12);
  straight(ctx, "r-end", -70, 300, -220, 300);
  for (const [x, z] of [[0, 30], [0, 100], [0, 170], [0, 230], [-25, 275], [-70, 300], [-140, 300], [-200, 300]])
    checkpoint(ctx, x, z);
  checkpoint(ctx, -215, 300);
  prefab(ctx, "gold-star", -12, 170, { id: "gold-star-1", y: 2 });
  for (const [x, z] of [[-24, 160], [24, 200], [-30, 260], [0, 330], [-120, 330]])
    prefab(ctx, "station-pillar", x, z);
  for (const [x, z] of [[-24, 240], [-100, 278]])
    prefab(ctx, "supply-crate", x, z);
  prefab(ctx, "satellite-dish", 20, 330);
  prefab(ctx, "alien", 0, 60);
  prefab(ctx, "ufo", -60, 345);
  prefab(ctx, "oxygen-tank", 20, 250);
  finishLevel(ctx, "Docking Bay.json");
}

// --- Level 6: Crater Field (open moon rover run) ---
{
  const ctx = makeLevel("Crater Field", "moon-surface");
  ctx.level.spawn = { x: 0, y: 2, z: -20, yaw: 0 };
  solid(ctx, "ground", "g1", 0, 0, 120, 300, 340, { texture: REGOLITH });
  solid(ctx, "ground", "g2", -160, 0, 260, 280, 160, { texture: REGOLITH });
  straight(ctx, "r-s1", 0, -30, 0, 200);
  arc(ctx, "r-bend", -60, 200, 60, 0, Math.PI / 2, 16, 12);
  straight(ctx, "r-s2", -60, 260, -230, 260);
  for (const [x, z] of [[0, 50], [0, 130], [-7, 229], [-28, 251], [-120, 260], [-180, 260]])
    checkpoint(ctx, x, z);
  checkpoint(ctx, -225, 260);
  prefab(ctx, "gold-star", -140, 260, { id: "gold-star-1", y: 2 });
  for (const [x, z] of [[-25, 40], [25, 100], [-30, 160], [30, 230], [-120, 292], [-180, 228]])
    prefab(ctx, "moon-rock", x, z, { yaw: (x + z) % 6 });
  for (const [x, z] of [[-18, 80], [18, 150], [-100, 244], [-160, 276]])
    prefab(ctx, "supply-crate", x, z);
  for (const [x, z] of [[18, 40], [-140, 292]])
    prefab(ctx, "oxygen-tank", x, z);
  for (const [x, z] of [[0, 120], [-140, 300], [-200, 230]])
    prefab(ctx, "meteor", x, z);
  prefab(ctx, "alien", -100, 200);
  prefab(ctx, "satellite-dish", 30, 280);
  finishLevel(ctx, "Crater Field.json");
}

// --- Level 7: Meteor Storm (moon slalom under fire) ---
{
  const ctx = makeLevel("Meteor Storm", "moon-surface");
  ctx.level.spawn = { x: 0, y: 2, z: -20, yaw: 0 };
  solid(ctx, "ground", "g1", 40, 0, 150, 340, 400, { texture: REGOLITH });
  solid(ctx, "ground", "g2", 200, 0, 350, 260, 260, { texture: REGOLITH });
  straight(ctx, "r-s1", 0, -30, 0, 140);
  arc(ctx, "r-t1", 50, 140, 50, Math.PI, Math.PI / 2, 16, 10);
  straight(ctx, "r-s2", 50, 190, 150, 190);
  arc(ctx, "r-t2", 150, 240, 50, -Math.PI / 2, 0, 16, 10);
  straight(ctx, "r-s3", 200, 240, 200, 450);
  for (const [x, z] of [[0, 50], [0, 130], [15, 175], [80, 190], [140, 190], [185, 215], [200, 270], [200, 360]])
    checkpoint(ctx, x, z);
  checkpoint(ctx, 200, 445);
  prefab(ctx, "gold-star", 100, 202, { id: "gold-star-1", y: 2 });
  for (const [x, z] of [[-28, 60], [28, 110], [100, 222], [160, 150], [172, 420], [228, 420]])
    prefab(ctx, "moon-rock", x, z, { yaw: (x * 2 + z) % 6 });
  for (const [x, z] of [[-18, 90], [100, 214], [182, 400], [218, 350]])
    prefab(ctx, "supply-crate", x, z);
  prefab(ctx, "oxygen-tank", 182, 300);
  for (const [x, z] of [[30, 80], [100, 230], [200, 380], [160, 420], [235, 350]])
    prefab(ctx, "meteor", x, z);
  for (const [x, z] of [[-35, 200], [150, 330]])
    prefab(ctx, "alien", x, z);
  prefab(ctx, "ufo", 150, 380);
  prefab(ctx, "satellite-dish", -40, 250);
  finishLevel(ctx, "Meteor Storm.json");
}

function finishLevel(ctx, file) {
  const level = ctx.level;
  const pts = [{ x: level.spawn.x, z: level.spawn.z }, ...level.checkpoints];
  let poly = 0;
  for (let i = 1; i < pts.length; i++)
    poly += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  const ideal = poly / 12.7;
  level.medals = {
    gold: Math.round(ideal * 2),
    silver: Math.round(ideal * 2.8),
    bronze: Math.round(ideal * 3.8),
  };
  level.limit = Math.round(ideal * 5);
  writeFileSync(`${DIR}/${file}`, JSON.stringify(level, null, 2) + "\n");
  console.log(`${level.name}: ideal ${ideal.toFixed(1)}s over ${poly.toFixed(0)}u, ${level.solids.length} solids, ${level.prefabs.length} prefabs, medals ${level.medals.gold}/${level.medals.silver}/${level.medals.bronze}`);
}
