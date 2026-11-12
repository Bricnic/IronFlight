import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import type { CustomTrackId } from "../src/tracks";

// Roughly half the corridor flanking each christmas course is fragile ice, so
// leaving the track is a genuine gamble. These tests prove it from the
// rendered frames: at three points along each course, a wide top-down capture
// covers the corridor, pixels are mapped back to world space and masked to
// within 100m of the track centerline, then the masked terrain is classified
// and at least 40% must read as ice. Set COVERAGE_CAL=1 to dump threshold
// histograms instead of asserting.
const TRACKS = [
  { file: "Tinsel Town.json", id: "custom:tinsel-town", slug: "tinsel-town" },
  { file: "Mistletoe Mile.json", id: "custom:mistletoe-mile", slug: "mistletoe-mile" },
  { file: "Nutcracker Run.json", id: "custom:nutcracker-run", slug: "nutcracker-run" },
  { file: "Sleigh Bell Sprint.json", id: "custom:sleigh-bell-sprint", slug: "sleigh-bell-sprint" },
  { file: "North Pole Summit.json", id: "custom:north-pole-summit", slug: "north-pole-summit" },
] as const;

type XY = { x: number; z: number };

function trackPolyline(file: string): XY[] {
  const level = JSON.parse(readFileSync(`levels/official/${file}`, "utf8")) as {
    spawn: XY;
    checkpoints: XY[];
  };
  return [level.spawn, ...level.checkpoints];
}

/** Points at fractions along the spawn -> checkpoints polyline. */
function linePoints(file: string, fracs: number[]): XY[] {
  const pts = trackPolyline(file);
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    segs.push(len);
    total += len;
  }
  return fracs.map((f) => {
    let d = total * f;
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i]) {
        const t = segs[i] ? d / segs[i] : 0;
        return {
          x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
          z: pts[i].z + (pts[i + 1].z - pts[i].z) * t,
        };
      }
      d -= segs[i];
    }
    return { ...pts[pts.length - 1] };
  });
}

/** Minimal PNG decoder (8-bit RGB/RGBA, non-interlaced) for pixel counting. */
function decodePng(path: string): { w: number; h: number; px: Buffer } {
  const raw = readFileSync(path);
  let pos = 8;
  let w = 0, h = 0, channels = 0;
  const idat: Buffer[] = [];
  while (pos < raw.length) {
    const len = raw.readUInt32BE(pos);
    const type = raw.toString("ascii", pos + 4, pos + 8);
    const data = raw.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      const colorType = data[9];
      if (colorType !== 2 && colorType !== 6)
        throw new Error(`unsupported PNG color type ${colorType} in ${path}`);
      channels = colorType === 2 ? 3 : 4;
    } else if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const inflated = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const rawPx = Buffer.alloc(w * h * channels);
  let at = 0;
  for (let y = 0; y < h; y++) {
    const filter = inflated[at++];
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? rawPx[y * stride + x - channels] : 0;
      const up = y > 0 ? rawPx[(y - 1) * stride + x] : 0;
      const upLeft = x >= channels && y > 0 ? rawPx[(y - 1) * stride + x - channels] : 0;
      let v = inflated[at++];
      if (filter === 1) v += left;
      else if (filter === 2) v += up;
      else if (filter === 3) v += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        v += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      rawPx[y * stride + x] = v & 0xff;
    }
  }
  if (channels === 4) return { w, h, px: rawPx };
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = rawPx[i * 3];
    px[i * 4 + 1] = rawPx[i * 3 + 1];
    px[i * 4 + 2] = rawPx[i * 3 + 2];
    px[i * 4 + 3] = 255;
  }
  return { w, h, px };
}

/**
 * Ice reads blue-dominant (day sheets or moonlit night ice); snow reads
 * near-neutral; road stays in the snow bucket (the generator likewise counts
 * road cells as non-lake corridor). Dark pixels (night road, void, shadow)
 * and warm pixels (brown rock, wood, warm decor) are excluded from both
 * sides. The fraction is ice over ice-plus-snow: the share of visible
 * corridor terrain that is frozen lake. Thresholds were calibrated from
 * captures (run with COVERAGE_CAL=1 to re-dump, COVERAGE_RGB=1 for samples):
 * day snow r-b <= +1, rock r-b >= +7, day ice b-r >= 12, night ice b-r >= 52.
 */
const ICE_BLUE_MARGIN = Number(process.env.COVERAGE_T ?? 20);
const ICE_MIN_RED = Number(process.env.COVERAGE_R ?? 70);

function distToPolyline(x: number, z: number, pts: XY[]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x, az = pts[i - 1].z;
    const dx = pts[i].x - ax, dz = pts[i].z - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

/**
 * Fraction of corridor terrain reading as ice. The capture is top-down from
 * `height` at (cx, cz) with a 55-degree vertical FOV, so pixels map linearly
 * to world space (screen right = +x, screen up = -z); only pixels within
 * 100m of the track polyline count, which skips bare ground margins and void
 * past the corridor edge.
 */
function iceFraction(
  path: string,
  view: { cx: number; cz: number; height: number; poly: XY[] },
  margin = ICE_BLUE_MARGIN,
  minRed = ICE_MIN_RED,
): { ice: number; snow: number } {
  const { w, h, px } = decodePng(path);
  const footH = 2 * view.height * Math.tan((55 / 2) * (Math.PI / 180));
  const footW = footH * (w / h);
  let ice = 0, snow = 0;
  for (let j = 0; j < h; j++) {
    const wz = view.cz + (j / h - 0.5) * footH;
    for (let i = 0; i < w; i++) {
      const r = px[(j * w + i) * 4], b = px[(j * w + i) * 4 + 2];
      if (r < minRed) continue;
      if (r - b > 6) continue;
      const wx = view.cx + (i / w - 0.5) * footW;
      if (distToPolyline(wx, wz, view.poly) > 100) continue;
      if (b - r > margin) ice++;
      else snow++;
    }
  }
  return { ice, snow };
}

for (const track of TRACKS) {
  test(`fragile ice covers the ${track.slug} corridor`, async ({ page }) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) =>
        raf((t) => {
          if (!(window as unknown as { __captureFreeze?: boolean }).__captureFreeze) cb(t);
        });
    });
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    await page.waitForFunction((id: CustomTrackId) => {
      try {
        window.__game!.track(id);
        return true;
      } catch {
        return false;
      }
    }, track.id);
    await page.evaluate((id: CustomTrackId) => {
      window.__game!.pause(true);
      window.__game!.startTrack(id);
    }, track.id);
    await page.addStyleTag({
      content:
        "#app > :not(#viewport) { visibility: hidden !important; } " +
        "#viewport { inset: 0 !important; } " +
        "#viewport > :not(canvas) { display: none !important; }",
    });
    const poly = trackPolyline(track.file);
    for (const [i, p] of linePoints(track.file, [0.25, 0.5, 0.75]).entries()) {
      const shot = `artifacts/christmas-ice-cover-${track.slug}-${i}.png`;
      const height = 200;
      await page.evaluate(
        ({ x, z, h }) => {
          window.__game!.overhead(x, z, h);
          (window as unknown as { __captureFreeze?: boolean }).__captureFreeze = true;
        },
        { x: p.x, z: p.z, h: height },
      );
      await page.locator("#viewport canvas").screenshot({ path: shot });
      await page.evaluate(() => {
        (window as unknown as { __captureFreeze?: boolean }).__captureFreeze = false;
      });
      const view = { cx: p.x, cz: p.z, height, poly };
      if (process.env.COVERAGE_CAL) {
        const hist = [
          [15, 70], [20, 70], [25, 70], [30, 70], [20, 60], [20, 90],
        ]
          .map(([t, r]) => {
            const { ice, snow } = iceFraction(shot, view, t, r);
            return `T${t}/R${r}=${((100 * ice) / (ice + snow)).toFixed(1)}%`;
          })
          .join(" ");
        console.log(`${track.slug}[${i}] ${hist}`);
        if (process.env.COVERAGE_RGB) {
          const { w, h, px } = decodePng(shot);
          const rows: string[] = [];
          for (let y = 64; y < h; y += 128) {
            const cells: string[] = [];
            for (let x = 64; x < w; x += 128)
              cells.push(
                `${px[(y * w + x) * 4]},${px[(y * w + x) * 4 + 1]},${px[(y * w + x) * 4 + 2]}`,
              );
            rows.push(cells.join(" "));
          }
          console.log(`${track.slug}[${i}] rgb:\n${rows.join("\n")}`);
        }
      } else {
        const { ice, snow } = iceFraction(shot, view);
        const frac = ice / (ice + snow);
        // eslint-disable-next-line no-console
        console.log(`${track.slug}[${i}] ice=${(100 * frac).toFixed(1)}%`);
        expect(
          frac,
          `${track.slug} viewpoint ${i} shows at least 40% ice (got ${(100 * frac).toFixed(1)}%)`,
        ).toBeGreaterThanOrEqual(0.4);
      }
    }
    expect(errors).toHaveLength(0);
  });
}
