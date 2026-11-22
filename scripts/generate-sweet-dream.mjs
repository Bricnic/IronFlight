// Deterministic generator for the Sweet Celebrations Dream level.
// Usage: node scripts/generate-sweet-dream.mjs
// Writes levels/official/sweet-celebrations/Sweet Celebrations Dream.json
// and prints ideal-line stats for medal tuning.
import { writeFileSync } from "node:fs";

const OUT = "levels/official/sweet-celebrations/Sweet Celebrations Dream.json";

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

const level = {
  name: "Sweet Celebrations Dream",
  mode: "race",
  spawn: { x: 0, y: 2, z: -20, yaw: 0 },
  checkpoints: [],
  solids: [],
  prefabs: [],
  medals: { gold: 86, silver: 125, bronze: 172 },
  limit: 240,
  backgroundTemplate: "sweet-dream",
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
    color: o.color ?? 0xf6e8d8,
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
const CREAM = 0xf9d3e6;
const PINK = 0xf27fb0;
const CHOCO = 0x3a2416;

// Ground slabs (tops at y=0, butt joints share edges only, never areas).
solid("ground", "g-leg1", 0, 0, 130, 120, 340, { color: 0xffffff, texture: "candy_cream_01" });
solid("ground", "g-court", 0, 0, 380, 240, 160, { color: 0xffffff, texture: "candy_cream_01" });
solid("ground", "g-leg2", 0, 0, 482.5, 120, 45, { color: 0xffffff, texture: "candy_cream_01" });
solid("ground", "g-land", 0, 0, 632.5, 120, 135, { color: 0xffffff, texture: "candy_cream_01" });

// Pink driving ribbons float just above the slabs; adjacent pieces step up
// 0.04 so overlaps never z-fight.
solid("road", "r-leg1", 0, 0.05, 135, 16, 330, { h: 0.06, color: 0xffffff, texture: "pink_frosting_01" });
solid("road", "r-arc-a", 27.5, 0.09, 347.5, 16, 46, { h: 0.06, color: 0xffffff, texture: "pink_frosting_01", yaw: Math.atan2(55, 65) });
solid("road", "r-arc-b", 27.5, 0.13, 412.5, 16, 46, { h: 0.06, color: 0xffffff, texture: "pink_frosting_01", yaw: Math.atan2(-55, 65) });
solid("road", "r-leg2", 0, 0.09, 475, 16, 60, { h: 0.06, color: 0xffffff, texture: "pink_frosting_01" });
solid("road", "r-land", 0, 0.05, 630, 16, 130, { h: 0.06, color: 0xffffff, texture: "pink_frosting_01" });

// Launch ramp and chocolate canyon walls around the flight gap.
solid("ramp", "kicker", 0, 1.5, 495, 12, 14, { h: 1, color: 0xe6b655, angle: -0.35 });
solid("barrier", "choc-l", -19, 0, 535, 6, 60, { h: 12, color: CHOCO });
solid("barrier", "choc-r", 19, 0, 535, 6, 60, { h: 12, color: CHOCO });

// Cherry hill steps beside the home straight.
solid("barrier", "hill-1", 34, 2, 620, 22, 22, { h: 2, color: 0xd98cb3 });
solid("barrier", "hill-2", 34, 4, 620, 15, 15, { h: 2, color: 0xc97ba6 });
solid("barrier", "hill-3", 34, 6, 620, 8, 8, { h: 2, color: 0x5a3a26 });

checkpoint(0, 60);
checkpoint(-8, 120);
checkpoint(8, 180);
checkpoint(0, 250);
checkpoint(0, 330);
checkpoint(55, 380);
checkpoint(0, 430);
checkpoint(0, 480);

// Air gate over the chocolate gap as a tall checkpoint prefab (height 24,
// band y 0..24), followed by the last two gates as prefabs to preserve
// gate order (prefab gates append after plain checkpoints).
prefab("checkpoint", 0, 535, { id: "gate-air", y: 12, resizeScale: 3 });
prefab("checkpoint", 0, 600, { id: "gate-600", y: 8, resizeScale: 2 });
prefab("checkpoint", 0, 665, { id: "gate-665" });

// ------------------------------------------------------------- pickups
prefab("wings", 4, 180, { id: "wings-1", y: 2 });
prefab("gold-star", 0, 535, { id: "gold-star-1", y: 14 });

// ---------------------------------------------------------------- decor
// Bunting across the road.
for (const z of [40, 110, 190, 260, 350, 420, 465])
  prefab("bunting-string", 0, z, { yaw: 0 });
// Balloon poles flanking the road.
for (const z of [20, 90, 160, 230, 310, 390, 460, 590, 650])
  for (const x of [-14, 14]) prefab("balloon-pole", x, z);
// Gumdrop forest.
for (const [x, z] of [
  [-28, 60], [30, 90], [-34, 140], [28, 170], [-30, 220], [34, 250],
  [-50, 330], [70, 350], [-70, 410], [70, 430], [-30, 480], [30, 500],
  [-28, 590], [28, 640],
])
  prefab("gumdrop-tree", x, z, { yaw: (x * 7 + z) % 6 });
// Lollipop row.
for (const z of [70, 140, 210, 270, 580, 620])
  for (const x of [-13, 13]) prefab("lollipop-stand", x, z);
// Grand cake looms beside the courtyard (r70: keep the road well clear)
// while a cupcake cluster marks the driving circle.
prefab("birthday-cake-grand", -100, 380, { id: "cake-grand" });
for (const [x, z] of [[0, 380], [5, 380], [-5, 380], [0, 375], [0, 385]])
  prefab("cupcake", x, z);
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2;
  prefab("cupcake", 4 + Math.cos(a) * 24, 380 + Math.sin(a) * 24);
}
for (const [x, z] of [[-14, 348], [32, 334], [-14, 412], [32, 428]])
  prefab("gift-box", x, z);
for (const [x, z] of [[48, 352], [40, 380], [0, 344], [0, 416]])
  prefab("party-hat", x, z);
// Gifts and hats along the road.
for (const [x, z] of [[-14, 30], [14, 55], [-14, 250], [14, 275], [-14, 610], [14, 635]])
  prefab("gift-box", x, z);
for (const [x, z] of [[13, 100], [-13, 150], [13, 200], [-13, 290], [13, 450], [-16, 610], [16, 650]])
  prefab("party-hat", x, z);
// Drive-through arch before the ramp, treats on the hill.
prefab("candy-cane-arch", 0, 473, { id: "arch-1" });
prefab("cupcake", 28, 610, { y: 2 });
prefab("cupcake", 40, 628, { y: 2 });
prefab("party-hat", 34, 620, { y: 6 });
prefab("gift-box", -30, 660);
prefab("gift-box", 30, 660);

writeFileSync(OUT, JSON.stringify(level, null, 2) + "\n");

// Ideal-line report for medal tuning.
const pts = [{ x: level.spawn.x, z: level.spawn.z }, ...level.checkpoints];
let poly = 0;
for (let i = 1; i < pts.length; i++)
  poly += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
console.log(`ideal ${(poly / 12.7).toFixed(1)}s over ${poly.toFixed(0)}u, ${level.solids.length} solids, ${level.prefabs.length} prefabs`);
