// Deterministic generator for the Industrial Mayhem Dream level.
// Usage: node scripts/generate-industrial-dream.mjs
// Writes levels/official/industrial-mayhem/Industrial Mayhem Dream.json
// and prints ideal-line stats for medal tuning.
import { writeFileSync } from "node:fs";

const OUT = "levels/official/industrial-mayhem/Industrial Mayhem Dream.json";

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

const level = {
  name: "Industrial Mayhem Dream",
  mode: "race",
  spawn: { x: 0, y: 2, z: -20, yaw: 0 },
  checkpoints: [],
  solids: [],
  prefabs: [],
  medals: { gold: 86, silver: 125, bronze: 172 },
  limit: 240,
  backgroundTemplate: "industrial-dream",
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
const PAVE = "concrete_floor_02";

// Ground slabs: cool foundry pavement (tops at y=0, butt joints share edges).
solid("ground", "g-leg1", 0, 0, 130, 120, 340, { texture: PAVE, color: 0x9aa4b0 });
solid("ground", "g-court", 0, 0, 380, 240, 160, { texture: PAVE, color: 0x9aa4b0 });
solid("ground", "g-leg2", 0, 0, 482.5, 120, 45, { texture: PAVE, color: 0x9aa4b0 });
solid("ground", "g-land", 0, 0, 632.5, 120, 135, { texture: PAVE, color: 0x9aa4b0 });

// Rainbow train-track road: butt-jointed colored chunks at one height.
// Chunk boundaries are shared by construction, so neighbors meet at exact
// edges with no area overlap (no z-fight) and no lips (smooth driving).
// Hazard striping: safety yellow and graphite, deep bases for the hard sun.
const TRACK_COLORS = [0x7a5f10, 0x23262c];
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

// Launch ramp (steel kicker) and pipe-works walls around the coolant gap.
solid("ramp", "kicker", 0, 1.5, 495, 12, 14, { h: 1, color: 0xffffff, texture: "green_metal_rust", angle: -0.35 });
const PIPES = [0x2e8a7a, 0x8a5a2e, 0x2e8a7a, 0x6a7684];
for (const side of [-1, 1])
  for (let i = 0; i < 4; i++)
    solid("barrier", `pipewall-${side}-${i}`, side * 19, 0, 512.5 + i * 15, 6, 15, {
      h: 12,
      color: PIPES[(i + (side > 0 ? 2 : 0)) % PIPES.length],
    });

// Barrel-stack pillars flanking the gap (outside the flight corridor).
for (const x of [-30, 30])
  for (const z of [515, 535, 555])
    solid("barrier", `drum-${x}-${z}`, x, 2, z, 3, 3, { h: 4, color: 0x2b6de2 });

// Crate-stack knoll beside the home straight.
solid("barrier", "knoll-1", 34, 2, 620, 22, 22, { h: 2, color: 0x6a5a3b });
solid("barrier", "knoll-2", 34, 4, 620, 15, 15, { h: 2, color: 0x8a5a2e });
solid("barrier", "knoll-3", 34, 6, 620, 8, 8, { h: 2, color: 0x9a8a5a });

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
// Pipe gantries over the road (posts at |x|=10 clear the 16-wide track).
for (const z of [60, 250]) prefab("pipe-arch", 0, z);
// Stacks and pylons roadside.
for (const [x, z] of [[-22, 100], [24, 260], [-24, 470], [24, 600]])
  prefab("smokestack", x, z);
for (const [x, z] of [[-26, 180], [26, 340], [-26, 560]])
  prefab("power-pylon", x, z);
// Gear works and slime tanks (proven-safe square points for court pieces).
for (const [x, z, yaw] of [[20, 130, 0], [-28, 380, 0.6], [16, 620, 0]])
  prefab("gear-works", x, z, { yaw });
for (const [x, z] of [[-20, 220], [28, 380], [-20, 640]])
  prefab("slime-tank", x, z);
// Scrapyard corners.
for (const [x, z, yaw] of [[-30, 40, 0.4], [30, 90, 1.2], [-32, 330, 0.8], [32, 450, 2.1], [-30, 660, 0.2]])
  prefab("scrap-pile", x, z, { yaw });
// Roadside drums, boosters, and floodlights.
for (const [x, z] of [[-14, 70], [14, 150], [-14, 290], [14, 350], [-14, 500], [14, 580]])
  prefab("barrel", x, z);
for (const [x, z] of [[24, 140], [-24, 470]])
  prefab("boost-pad", x, z);
for (const x of [-11, 11])
  for (const z of [90, 230, 330, 470, 560, 650])
    prefab("lamp", x, z);

writeFileSync(OUT, JSON.stringify(level, null, 2) + "\n");

// Ideal-line report for medal tuning.
const pts = [{ x: level.spawn.x, z: level.spawn.z }, ...level.checkpoints];
let poly = 0;
for (let i = 1; i < pts.length; i++)
  poly += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
console.log(`ideal ${(poly / 12.7).toFixed(1)}s over ${poly.toFixed(0)}u, ${level.solids.length} solids, ${level.prefabs.length} prefabs`);
