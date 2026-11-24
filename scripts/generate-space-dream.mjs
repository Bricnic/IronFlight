// Deterministic generator for the Space Dream level.
// Usage: node scripts/generate-space-dream.mjs
// Writes levels/official/space/Space Dream.json
// and prints ideal-line stats for medal tuning.
import { writeFileSync } from "node:fs";

const OUT = "levels/official/space/Space Dream.json";

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

const level = {
  name: "Space Dream",
  mode: "race",
  spawn: { x: 0, y: 2, z: -20, yaw: 0 },
  gravityScale: 0.5,
  checkpoints: [],
  solids: [],
  prefabs: [],
  medals: { gold: 87, silver: 122, bronze: 165 },
  limit: 240,
  backgroundTemplate: "moon-surface",
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
    ...(o.lightLumens === undefined ? {} : { lightLumens: o.lightLumens }),
    ...(o.lightColor === undefined ? {} : { lightColor: o.lightColor }),
    ...(o.footprint === undefined ? {} : { footprint: o.footprint }),
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
const REGOLITH = "moon_regolith_01";

// Ground slabs (tops at y=0): the flight gap z 505..565 has no ground.
solid("ground", "g-leg1", 0, 0, 130, 140, 340, { texture: REGOLITH });
solid("ground", "g-court", 0, 0, 380, 260, 160, { texture: REGOLITH });
solid("ground", "g-leg2", 0, 0, 482.5, 140, 45, { texture: REGOLITH });
solid("ground", "g-land", 0, 0, 632.5, 140, 135, { texture: REGOLITH });

// Rainbow road: butt-jointed colored chunks, 250 lumens each.
const RAINBOW = [0xff3b5c, 0xff8a1e, 0xf2c200, 0x2fd35f, 0x2b7de2, 0x9a5fe0];
let colorSeq = 0;
function trackRun(id, x0, z0, x1, z1, w = 16) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / 14));
  const yaw = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i < n; i++) {
    const ax = round2(x0 + ((x1 - x0) * i) / n), az = round2(z0 + ((z1 - z0) * i) / n);
    const bx = round2(x0 + ((x1 - x0) * (i + 1)) / n), bz = round2(z0 + ((z1 - z0) * (i + 1)) / n);
    const color = RAINBOW[(colorSeq + i) % RAINBOW.length];
    solid("tile", `${id}-${i}`, (ax + bx) / 2, 0.05, (az + bz) / 2, w,
      round2(Math.hypot(bx - ax, bz - az) - 0.04), {
        h: 0.06,
        color,
        lightLumens: 250,
        lightColor: color,
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

// Launch ramp and crater walls around the gorge.
solid("ramp", "kicker", 0, 1.5, 495, 12, 14, { h: 1, color: 0xd8dce5, angle: -0.35 });
const STRATA = [0x8a8580, 0x6e6963, 0x9a958e, 0x7a756e];
for (const side of [-1, 1])
  for (let i = 0; i < 4; i++)
    solid("barrier", `crater-${side}-${i}`, side * 19, 0, 512.5 + i * 15, 6, 15, {
      h: 12,
      color: STRATA[(i + (side > 0 ? 2 : 0)) % STRATA.length],
    });

// Comms masts flanking the gap (outside the flight corridor).
for (const x of [-30, 30])
  for (const z of [515, 535, 555])
    solid("barrier", `mast-${x}-${z}`, x, 2, z, 3, 3, { h: 4, color: 0x4a5462 });

// Rock pile beside the home straight.
solid("barrier", "pile-1", 34, 2, 620, 22, 22, { h: 2, color: 0x8a8580 });
solid("barrier", "pile-2", 34, 4, 620, 15, 15, { h: 2, color: 0x9a958e });
solid("barrier", "pile-3", 34, 6, 620, 8, 8, { h: 2, color: 0x6e6963 });

checkpoint(0, 60);
checkpoint(-8, 120);
checkpoint(8, 180);
checkpoint(0, 250);
checkpoint(0, 330);
checkpoint(55, 380);
checkpoint(0, 430);
checkpoint(0, 480);

// Air gate over the gap as a tall checkpoint prefab (height 24),
// followed by the last two gates as prefabs to preserve gate order.
prefab("checkpoint", 0, 535, { id: "gate-air", y: 12, resizeScale: 3 });
prefab("checkpoint", 0, 600, { id: "gate-600", y: 8, resizeScale: 2 });
prefab("checkpoint", 0, 665, { id: "gate-665" });

// ------------------------------------------------------------- pickups
prefab("wings", 4, 180, { id: "wings-1", y: 2 });
prefab("gold-star", 0, 535, { id: "gold-star-1", y: 14 });

// ---------------------------------------------------------------- decor
// Station complex roadside: tower, dome, dishes, and pillars.
prefab("station-tower", -42, 120);
prefab("habitat-dome", 46, 200);
prefab("station-tower", 64, 420);
prefab("habitat-dome", -62, 352);
for (const [x, z] of [[-24, 60], [24, 100], [-24, 250], [24, 290], [-30, 470], [30, 600], [-26, 650]])
  prefab("station-pillar", x, z);
// Landing beacons: glowing pillars mark the far side of the flight gap.
for (const [x, z] of [[-14, 572], [14, 572]])
  prefab("station-pillar", x, z);
for (const [x, z] of [[-34, 150], [36, 240], [-36, 420], [38, 560]])
  prefab("satellite-dish", x, z);
// Solar lanes and moon rocks trailside.
for (const [x, z] of [[-20, 90], [20, 210], [-20, 350], [20, 450], [-20, 610], [20, 660]])
  prefab("solar-panel", x, z, { yaw: 0.3 });
for (const [x, z] of [[-30, 40], [30, 130], [-32, 280], [32, 380], [-30, 500], [30, 640], [-28, 690]])
  prefab("moon-rock", x, z, { yaw: (x + z) % 6 });
// Supply caches off the racing line.
for (const [x, z] of [[-18, 170], [18, 320], [-18, 460], [18, 630]])
  prefab("supply-crate", x, z);
for (const [x, z] of [[18, 100], [-18, 560]])
  prefab("oxygen-tank", x, z);
// Distant storm: asteroid flyover above the gap (safe altitude) and
// off-path meteors for the thumbnail vibe.
prefab("asteroid", 60, 535, { y: 12, yaw: Math.PI / 2 });
prefab("meteor", 42, 300, {});
prefab("meteor", -42, 620, {});

writeFileSync(OUT, JSON.stringify(level, null, 2) + "\n");

// Ideal-line report for medal tuning.
const pts = [{ x: level.spawn.x, z: level.spawn.z }, ...level.checkpoints];
let poly = 0;
for (let i = 1; i < pts.length; i++)
  poly += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
console.log(`ideal ${(poly / 12.7).toFixed(1)}s over ${poly.toFixed(0)}u, ${level.solids.length} solids, ${level.prefabs.length} prefabs`);
