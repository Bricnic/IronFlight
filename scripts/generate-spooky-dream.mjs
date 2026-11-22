// Deterministic generator for the Spooky Places Dream level.
// Usage: node scripts/generate-spooky-dream.mjs
// Writes levels/official/spooky-places/Spooky Places Dream.json
// and prints ideal-line stats for medal tuning.
import { writeFileSync } from "node:fs";

const OUT = "levels/official/spooky-places/Spooky Places Dream.json";

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

const level = {
  name: "Spooky Places Dream",
  mode: "race",
  spawn: { x: 0, y: 2, z: -20, yaw: 0 },
  checkpoints: [],
  solids: [],
  prefabs: [],
  medals: { gold: 86, silver: 125, bronze: 172 },
  limit: 240,
  backgroundTemplate: "spooky-dream",
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
const MOOR = "grass_ground";
const STONE = "monastery_stone_floor";

// Ground slabs (tops at y=0, butt joints share edges only, never areas).
solid("ground", "g-leg1", 0, 0, 130, 120, 340, { texture: MOOR, color: 0x6a8a6a });
solid("ground", "g-court", 0, 0, 380, 240, 160, { texture: MOOR, color: 0x6a8a6a });
solid("ground", "g-leg2", 0, 0, 482.5, 120, 45, { texture: MOOR, color: 0x6a8a6a });
solid("ground", "g-land", 0, 0, 632.5, 120, 135, { texture: MOOR, color: 0x6a8a6a });

// Cobblestone driving ribbons float just above the slabs; adjacent pieces
// step up 0.04 so overlaps never z-fight.
solid("road", "r-leg1", 0, 0.05, 135, 16, 330, { h: 0.06, texture: STONE, color: 0xa8ccb0 });
solid("road", "r-arc-a", 27.5, 0.09, 347.5, 16, 46, { h: 0.06, texture: STONE, color: 0xa8ccb0, yaw: Math.atan2(55, 65) });
solid("road", "r-arc-b", 27.5, 0.13, 412.5, 16, 46, { h: 0.06, texture: STONE, color: 0xa8ccb0, yaw: Math.atan2(-55, 65) });
solid("road", "r-leg2", 0, 0.09, 475, 16, 60, { h: 0.06, texture: STONE, color: 0xa8ccb0 });
solid("road", "r-land", 0, 0.05, 630, 16, 130, { h: 0.06, texture: STONE, color: 0xa8ccb0 });

// Launch ramp and gorge walls around the flight gap.
solid("ramp", "kicker", 0, 1.5, 495, 12, 14, { h: 1, color: 0xe6b655, angle: -0.35 });
solid("barrier", "gorge-l", -19, 0, 535, 6, 60, { h: 12, color: 0x8a8fa0, texture: STONE });
solid("barrier", "gorge-r", 19, 0, 535, 6, 60, { h: 12, color: 0x8a8fa0, texture: STONE });

// Mausoleum knoll steps beside the home straight.
solid("barrier", "knoll-1", 34, 2, 620, 22, 22, { h: 2, color: 0x6a6f7e });
solid("barrier", "knoll-2", 34, 4, 620, 15, 15, { h: 2, color: 0x6a6f7e });
solid("barrier", "knoll-3", 34, 6, 620, 8, 8, { h: 2, color: 0x6a6f7e });

// Stone bridge ribs flanking the gap (outside the flight corridor).
for (const x of [-30, 30])
  for (const z of [515, 535, 555])
    solid("barrier", `rib-${x}-${z}`, x, 2, z, 3, 3, { h: 4, color: 0x9aa0b5, texture: STONE });

checkpoint(0, 60);
checkpoint(-8, 120);
checkpoint(8, 180);
checkpoint(0, 250);
checkpoint(0, 330);
checkpoint(55, 380);
checkpoint(0, 430);
checkpoint(0, 480);

// Air gate over the gorge as a tall checkpoint prefab (height 24),
// followed by the last two gates as prefabs to preserve gate order.
prefab("checkpoint", 0, 535, { id: "gate-air", y: 12, resizeScale: 3 });
prefab("checkpoint", 0, 600, { id: "gate-600", y: 8, resizeScale: 2 });
prefab("checkpoint", 0, 665, { id: "gate-665" });

// ------------------------------------------------------------- pickups
prefab("wings", 4, 180, { id: "wings-1", y: 2 });
prefab("gold-star", 0, 535, { id: "gold-star-1", y: 14 });

// ---------------------------------------------------------------- decor
for (const z of [40, 110, 190, 260, 350, 420, 465])
  prefab("spooky-bunting", 0, z, { yaw: 0 });
for (const [x, z, len] of [[-11, 90, 0], [11, 150, 0], [-11, 230, 0], [11, 300, 0], [-11, 440, 0], [11, 580, 0], [-11, 640, 0]])
  prefab("iron-fence", x, z, { yaw: Math.PI / 2 });
for (const [x, z] of [
  [-28, 60], [30, 90], [-34, 140], [28, 170], [-30, 220], [34, 250],
  [-50, 330], [70, 350], [-70, 410], [70, 430], [-30, 480], [30, 500],
  [-28, 590], [28, 640],
])
  prefab("dead-tree", x, z, { yaw: (x * 7 + z) % 6 });
for (const z of [70, 140, 210, 270, 580, 620])
  for (const x of [-13, 13]) prefab("jack-o-lantern", x, z);
// Graveyard clusters (smashable stones, skulls, pumpkins).
for (const [x, z] of [[-22, 100], [22, 160], [-24, 240], [24, 300], [-22, 440], [22, 560], [-22, 610]])
  prefab("gravestone", x, z, { yaw: (x + z) % 5 });
for (const [x, z] of [[-18, 130], [19, 190], [-17, 280], [18, 330], [-19, 460], [17, 620]])
  prefab("skull", x, z);
for (const [x, z] of [[-16, 80], [16, 200], [-15, 320], [15, 420], [-16, 540], [16, 660]])
  prefab("pumpkin", x, z);
// Haunts and glow around the square.
for (const [x, z] of [[-30, 340], [60, 360], [-60, 400], [60, 420], [20, 330], [-20, 430]])
  prefab("ghost", x, z, { y: 3 });
for (const [x, z] of [[28, 380], [-8, 400.8], [-20, 380], [16, 359.2]])
  prefab("glow-mushroom", x, z);
for (const [x, z] of [[-40, 330], [75, 380], [-75, 430]])
  prefab("cave-bat", x, z, { y: 6 });
// Gargoyle gate before the ramp.
for (const x of [-8, 8]) prefab("gargoyle", x, 473, { yaw: Math.PI + (x > 0 ? -0.3 : 0.3) });
for (const [x, z] of [[-14, 30], [14, 55], [-14, 250], [14, 275], [-14, 610], [14, 635]])
  prefab("gravestone", x, z, { yaw: (x * 3 + z) % 5 });
for (const [x, z] of [[-16, 45], [16, 265], [-16, 625]])
  prefab("skull", x, z);
for (const [x, z] of [[-14, 100], [14, 150], [-14, 200], [14, 290], [-14, 610], [14, 650]])
  prefab("jack-o-lantern", x, z);
prefab("gargoyle", -30, 660, { yaw: Math.PI + 0.4 });
prefab("gargoyle", 30, 660, { yaw: Math.PI - 0.4 });

writeFileSync(OUT, JSON.stringify(level, null, 2) + "\n");

// Ideal-line report for medal tuning.
const pts = [{ x: level.spawn.x, z: level.spawn.z }, ...level.checkpoints];
let poly = 0;
for (let i = 1; i < pts.length; i++)
  poly += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
console.log(`ideal ${(poly / 12.7).toFixed(1)}s over ${poly.toFixed(0)}u, ${level.solids.length} solids, ${level.prefabs.length} prefabs`);
