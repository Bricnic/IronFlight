import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
// Level-select thumbnails: real in-game screenshots, one per official level.
// Usage: PREVIEW_PORT=5199 node scripts/capture-level-previews.mjs [id...]
// IDs default to the full official lineup, read live from the level-select
// screen; pass a subset to recapture. Each level uses the next vehicle in
// garage order (triple-loop -> Monster Truck, foundry-run -> Sports Car,
// ...) at the default chase distance, with a stylized top-down minimap of
// the level drawn as a box in the lower right of each preview.
const PORT = process.env.PREVIEW_PORT ?? "5173";
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const file = (id) => id.replace(/^custom:/, "");
/** Draw (or redraw) the stylized minimap overlay for a track. */
async function drawMinimap(page, trackId) {
  await page.evaluate((trackId) => {
    const track = window.__game.track(trackId);
    let box = document.getElementById("minimap-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "minimap-box";
      box.style.cssText =
        "position:absolute;right:14px;bottom:14px;width:204px;height:154px;" +
        "background:rgba(8,14,18,0.82);border:2px solid rgba(255,255,255,0.30);" +
        "border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.45);";
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 150;
      canvas.style.cssText =
        "display:block;width:200px;height:150px;border-radius:8px;";
      box.appendChild(canvas);
      document.getElementById("viewport").appendChild(box);
    }
    const canvas = box.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const W = 200,
      H = 150,
      pad = 14;
    ctx.clearRect(0, 0, W, H);
    const pts = [
      ...track.path,
      ...track.checkpoints,
      ...track.collectibles,
      ...(track.demolish ?? []),
      ...(track.rings ?? []),
      ...(track.ring ? [track.ring] : []),
      track.spawn,
    ];
    let minX = Math.min(...pts.map((p) => p.x));
    let maxX = Math.max(...pts.map((p) => p.x));
    let minZ = Math.min(...pts.map((p) => p.z));
    let maxZ = Math.max(...pts.map((p) => p.z));
    if (maxX - minX < 1) {
      minX -= 0.5;
      maxX += 0.5;
    }
    if (maxZ - minZ < 1) {
      minZ -= 0.5;
      maxZ += 0.5;
    }
    const s = Math.min(
      (W - pad * 2) / (maxX - minX),
      (H - pad * 2) / (maxZ - minZ),
    );
    const ox = (W - s * (maxX - minX)) / 2;
    const oy = (H - s * (maxZ - minZ)) / 2;
    const X = (x) => ox + s * (x - minX);
    const Y = (z) => oy + s * (maxZ - z);
    const hex = `#${track.color.toString(16).padStart(6, "0")}`;
    if (track.mode === "race" && track.path.length > 1) {
      ctx.strokeStyle = hex;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      track.path.forEach((p, i) =>
        i ? ctx.lineTo(X(p.x), Y(p.z)) : ctx.moveTo(X(p.x), Y(p.z)),
      );
      ctx.stroke();
    }
    const dot = (x, z, r, fill) => {
      ctx.beginPath();
      ctx.arc(X(x), Y(z), r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.stroke();
    };
    for (const c of track.checkpoints) dot(c.x, c.z, 2.5, "#ffffff");
    for (const c of track.collectibles) dot(c.x, c.z, 3, "#ffd34d");
    for (const d of track.demolish ?? []) dot(d.x, d.z, 3, "#ff5a4d");
    const goalRing = (r) => {
      ctx.beginPath();
      ctx.arc(X(r.x), Y(r.z), Math.max(3, r.radius * s), 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    };
    for (const r of track.rings ?? []) goalRing(r);
    if (track.ring) goalRing(track.ring);
    dot(track.spawn.x, track.spawn.z, 3.5, "#7ee787");
  }, trackId);
}
try {
  const page = await browser.newPage({
    viewport: { width: 800, height: 450 },
    deviceScaleFactor: 1,
  });
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      raf((t) => {
        if (!window.__captureFreeze) cb(t);
      });
  });
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForFunction(() => !!window.__game);
  await page.waitForFunction(() => {
    try {
      return !!window.__game.track("custom:dungeon");
    } catch {
      return false;
    }
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll("#level-select [data-track]").length > 0,
  );
  const lineup = await page
    .locator("#level-select [data-track]")
    .evaluateAll((cards) =>
      cards.map((card) => ({
        id: card.dataset.track,
        img: card.querySelector("img")?.getAttribute("src") ?? null,
      })),
    );
  const vehicles = await page
    .locator("#vehicle-select [data-vehicle]")
    .evaluateAll((cards) => cards.map((card) => card.dataset.vehicle));
  if (!vehicles.length) throw new Error("No vehicles found in garage");
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const indexOf = (id) => {
    const at = lineup.findIndex((t) => t.id === id);
    if (at >= 0) return at;
    return lineup.findIndex((t) => t.id === `custom:${id}`);
  };
  const queue = wanted.length ? wanted : lineup.map((t) => t.id);
  await page.addStyleTag({
    content:
      "#app > :not(#viewport) { visibility: hidden !important; } #viewport { inset: 0 !important; }",
  });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(500);
  await mkdir("public/tracks", { recursive: true });
  for (const id of queue) {
    const at = indexOf(id);
    if (at < 0) throw new Error(`Unknown official level: ${id}`);
    const trackId = lineup[at].id;
    const vehicle = vehicles[at % vehicles.length];
    await page.evaluate(
      ({ trackId, vehicle }) => {
        window.__captureFreeze = false;
        window.__game.pause(false);
        window.__game.startTrack(trackId, "easy", vehicle);
        window.__game.advanceFrames(90, 1, {});
      },
      { trackId, vehicle },
    );
    await page.waitForTimeout(2000);
    await drawMinimap(page, trackId);
    const distance = await page.evaluate(
      () => window.__game.camera().distance,
    );
    await page.evaluate(() => {
      window.__game.pause(true);
      window.__captureFreeze = true;
      window.__game.advanceFrames(2, 1, {});
    });
    const img = lineup[at].img;
    const out =
      img?.startsWith("/tracks/") && img.endsWith(".png")
        ? `public${img}`
        : `public/tracks/${file(trackId)}.png`;
    await page.locator("#viewport").screenshot({ path: out });
    const bytes = await readFile(out);
    const w = bytes.readUInt32BE(16),
      h = bytes.readUInt32BE(20);
    if (w < 640 || h < 360) throw new Error(`${out} too small: ${w}x${h}`);
    console.log(
      `Captured ${trackId} with ${vehicle} @ distance ${distance.toFixed(1)} ${w}x${h}`,
    );
  }
} finally {
  await browser.close();
}
