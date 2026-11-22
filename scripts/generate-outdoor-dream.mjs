// Deterministic generator for the Outdoor Adventures Dream level.
// Usage: node scripts/generate-outdoor-dream.mjs
// Writes levels/official/outdoor-adventures/Outdoor Adventures Dream.json
// and prints ideal-line stats for medal tuning.
import { writeFileSync } from "node:fs";

const OUT = "levels/official/outdoor-adventures/Outdoor Adventures Dream.json";

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

const level = {
  name: "Outdoor Adventures Dream",
  mode: "race",
  spawn: { x: 0, y: 2, z: -20, yaw: 0 },
  checkpoints: [],
  solids: [],
  prefabs: [],
  medals: { gold: 86, silver: 125, bronze: 172 },
  limit: 240,
  backgroundTemplate: "outdoor-dream",
};

function checkpoint(x, z, y) {
  level.checkpoints.push(
    y === undefined ? { x, z } : { x, y, z },
  );
}

function solid(kind, id, x, yTop, z, w, d, o = {}) {
  const h = o.h ?? 1.2;
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
    color: o.color ?? 0xffffff,
    ...(o.texture === undefined ? {} : { texture: o.texture }),
  });
}

let prefabSeq = 0;
function prefab(kind, x, z, o = {}) {
  prefabSeq += 1;
  level.prefabs.push({
    id: o.id ?? `${kind}-${prefabSeq}`,
    kind,
    x: round2(x),
    z: round2(z),
    ...(o.y === undefined ? {} : { y: round2(o.y) }),
    ...(o.yaw === undefined ? {} : { yaw: round4(o.yaw) }),
    ...(o.scale === undefined ? {} : { scale: o.scale }),
    ...(o.resizeScale === undefined ? {} : { resizeScale: o.resizeScale }),
  });
}

// ---------------------------------------------------------------- course
const SAND = "coast_sand_rocks_02";

// Ground slabs: warm desert sand (tops at y=0, butt joints share edges).
solid("ground", "g-leg1", 0, 0, 130, 120, 340, { texture: SAND, color: 0xe8a880 });
solid("ground", "g-court", 0, 0, 380, 240, 160, { texture: SAND, color: 0xe8a880 });
solid("ground", "g-leg2", 0, 0, 482.5, 120, 45, { texture: SAND, color: 0xe8a880 });
solid("ground", "g-land", 0, 0, 632.5, 120, 135, { texture: SAND, color: 0xe8a880 });

// Rainbow train-track road: butt-jointed colored chunks at one height.
// Chunk boundaries are shared by construction, so neighbors meet at exact
// edges with no area overlap (no z-fight) and no lips (smooth driving).
// Trail tiles: tan, rust, and river teal, deep bases for the hard sun.
const TRACK_COLORS = [0x6e5232, 0x6e3a1e, 0x2e6e6a];
let colorSeq = 0;
function trackRun(id, x0, z0, x1, z1, w = 16) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / 12));
  const yaw = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i < n; i++) {
    // Round the shared boundary points (not centers): neighbors then meet
    // at identical edge values with no area overlap after quantization.
    const ax = round2(x0 + ((x1 - x0) * i) / n), az = round2(z0 + ((z1 - z0) * i) / n);
    const bx = round2(x0 + ((x1 - x0) * (i + 1)) / n), bz = round2(z0 + ((z1 - z0) * (i + 1)) / n);
    const cx = round2((ax + bx) / 2), cz = round2((az + bz) / 2);
    // 0.04 shorter than the bay: wood-track joints can never overlap.
    // Kind "tile" renders the flat plastic color; "road" would force asphalt.
    solid("tile", `${id}-${i}`, cx, 0.05, cz, w, round2(Math.hypot(bx - ax, bz - az) - 0.04), {
      h: 0.06,
      color: TRACK_COLORS[(colorSeq + i) % TRACK_COLORS.length],
      ...(yaw === 0 ? {} : { yaw }),
    });
  }
  colorSeq += n;
}
trackRun("r-leg1", 0, -30, 0, 300);
trackRun("r-arc-a", 12.6, 330, 42.4, 365);
trackRun("r-arc-b", 42.4, 395, 12.6, 430);
trackRun("r-leg2", 0, 445, 0, 505);
trackRun("r-land", 0, 565, 0, 695);

// Launch ramp (log kicker) and canyon walls around the gorge.
solid("ramp", "kicker", 0, 1.5, 495, 12, 14, { h: 1, color: 0xffffff, texture: "bark_brown_01", angle: -0.35 });
const STRATA = [0xb0502e, 0x8a3f24, 0xc96a3a, 0x9a4526];
for (const side of [-1, 1])
  for (let i = 0; i < 4; i++)
    solid("barrier", `canyon-${side}-${i}`, side * 19, 0, 512.5 + i * 15, 6, 15, {
      h: 12,
      color: STRATA[(i + (side > 0 ? 2 : 0)) % STRATA.length],
    });

// Hoodoo pillars flanking the gap (outside the flight corridor).
for (const x of [-30, 30])
  for (const z of [515, 535, 555])
    solid("barrier", `hoodoo-${x}-${z}`, x, 2, z, 3, 3, { h: 4, color: 0xc98a5a });

// Mesa knoll beside the home straight.
solid("barrier", "knoll-1", 34, 2, 620, 22, 22, { h: 2, color: 0xb0502e });
solid("barrier", "knoll-2", 34, 4, 620, 15, 15, { h: 2, color: 0xc96a3a });
solid("barrier", "knoll-3", 34, 6, 620, 8, 8, { h: 2, color: 0x9a4526 });

checkpoint(0, 60);
checkpoint(-8, 120);
checkpoint(8, 180);
checkpoint(0, 250);
checkpoint(0, 330);
checkpoint(55, 380);
checkpoint(0, 430);
checkpoint(0, 480);

// Air gate over the floor gap as a tall checkpoint prefab (height 24),
// followed by the last two gates as prefabs to preserve gate order.
prefab("checkpoint", 0, 535, { id: "gate-air", y: 12, resizeScale: 3 });
prefab("checkpoint", 0, 600, { id: "gate-600", y: 8, resizeScale: 2 });
prefab("checkpoint", 0, 665, { id: "gate-665" });

// ------------------------------------------------------------- pickups
prefab("wings", 4, 180, { id: "wings-1", y: 2 });
prefab("gold-star", 0, 535, { id: "gold-star-1", y: 14 });

// ---------------------------------------------------------------- decor
// Trailhead arches over the road (posts at |x|=10 clear the 16-wide track).
for (const z of [60, 250]) prefab("trail-arch", 0, z);
// Pine lanes and mesa buttes roadside.
for (const [x, z] of [[-14, 90], [14, 140], [-15, 200], [15, 280], [-14, 470], [14, 560], [-14, 620], [14, 660]])
  prefab("pine-tree", x, z, { yaw: (x * 3 + z) % 6 });
for (const [x, z, yaw] of [[-30, 160, 0.3], [32, 320, 1.1], [-34, 520, 0.7]])
  prefab("mesa-rock", x, z, { yaw });
// Waterfalls and raft ponds (proven-safe square points for court pieces).
for (const [x, z, yaw] of [[-24, 240, 1.2], [28, 380, -0.9], [-22, 600, 0.9]])
  prefab("waterfall", x, z, { yaw });
for (const [x, z] of [[24, 180], [-28, 380], [22, 640]])
  prefab("raft-pond", x, z);
// Compass rocks trailside.
for (const [x, z] of [[-13, 40], [13, 330], [-13, 500], [13, 610]])
  prefab("compass-rock", x, z, { yaw: (x + z) % 6 });
// Roadside cacti, signs, drums, and blocks.
for (const [x, z] of [[-16, 120], [16, 220], [-16, 420], [16, 480], [-16, 580], [16, 660]])
  prefab("cacti-patch", x, z);
for (const [x, z] of [[-13, 260], [13, 30], [-13, 640], [13, 110]])
  prefab("sign", x, z, { yaw: x > 0 ? -0.3 : 0.3 });
for (const [x, z] of [[-15, 350], [15, 30], [-15, 560], [15, 620]])
  prefab("barrel", x, z);
for (const [x, y, z] of [[-26, 6, 150], [26, 8, 260], [-30, 7, 420], [30, 9, 560]])
  prefab("loose-blocks", x, z, { y });

writeFileSync(OUT, JSON.stringify(level, null, 2) + "\n");

// Ideal-line report for medal tuning.
const pts = [{ x: level.spawn.x, z: level.spawn.z }, ...level.checkpoints];
let poly = 0;
for (let i = 1; i < pts.length; i++)
  poly += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
console.log(`ideal ${(poly / 12.7).toFixed(1)}s over ${poly.toFixed(0)}u, ${level.solids.length} solids, ${level.prefabs.length} prefabs`);
