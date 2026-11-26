import { chromium } from "@playwright/test";
import { build } from "vite";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve, join, extname, sep } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";

// Capture thumbnails and clips together from the actual destruction lab. Frame
// zero produces both assets, so hovering preserves the camera and background.
const output = "public/vehicles/turntables";
await mkdir(output, { recursive: true });
await mkdir("artifacts/vehicle-turntables", { recursive: true });
const root = resolve("artifacts/vehicle-turntables/capture-build");
await build({
  define: { "import.meta.env.DEV": "true" },
  build: { outDir: root },
  logLevel: "warn",
});
const browserRoot = resolve(dirname(chromium.executablePath()), "../..");
const ffmpegDir = (await readdir(browserRoot)).find((name) =>
  name.startsWith("ffmpeg-"),
);
const ffmpeg =
  process.env.FFMPEG_PATH ??
  join(
    browserRoot,
    ffmpegDir ?? "ffmpeg-1011",
    process.platform === "win32" ? "ffmpeg-win64.exe" : "ffmpeg-linux",
  );
const browser = await chromium.launch({
  args:
    process.env.TURNTABLE_GPU === "1"
      ? [
          "--enable-webgl",
          "--use-gl=angle",
          "--use-angle=d3d11",
          "--enable-gpu",
          "--ignore-gpu-blocklist",
        ]
      : [
          "--enable-webgl",
          "--use-gl=angle",
          "--use-angle=swiftshader",
          "--enable-unsafe-swiftshader",
        ],
});
const results = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 600 },
    deviceScaleFactor: 1,
  });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await page.route("**/*", async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
    if (!file.startsWith(root + sep)) return route.fulfill({ status: 403 });
    const types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".json": "application/json",
      ".webm": "video/webm",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    };
    try {
      await route.fulfill({
        body: await readFile(file),
        contentType: types[extname(file)] ?? "application/octet-stream",
      });
    } catch {
      await route.fulfill({ status: 404, body: "Not found" });
    }
  });
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      raf((t) => {
        if (!window.__captureFreeze) cb(t);
      });
    localStorage.setItem(
      "iron-flight-settings-v1",
      JSON.stringify({
        video: "high",
        night: false,
        rain: false,
        randomizeAtmosphere: false,
      }),
    );
  });
  await page.goto("http://vehicle-capture.local/?test=lab-turntables");
  await page.waitForFunction(() => !!window.__game, null, { timeout: 90000 });
  await page.getByRole("button", { name: "Select vehicle" }).click();
  const catalog = await page
    .locator("#vehicle-select [data-vehicle]")
    .evaluateAll((cards) => cards.map((card) => card.dataset.vehicle));
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : catalog;
  if (!ids.length) throw Error("No vehicles found in garage");
  for (const id of ids)
    if (!catalog.includes(id)) throw Error(`Unknown vehicle: ${id}`);
  await page.evaluate(() => {
    window.__game.pause(true);
    window.__captureFreeze = true;
  });
  await page.addStyleTag({
    content:
      "#app > :not(#viewport) { visibility: hidden !important; } #viewport { inset: 0 !important; }",
  });
  await page.setViewportSize({ width: 800, height: 450 });
  for (const id of ids) {
    const start = Date.now();
    await page.evaluate((id) => {
      localStorage.setItem("vehicle", id);
      const g = window.__game;
      g.select("lab");
      g.pause(true);
      g.advanceFrames(90, 1, {});
    }, id);
    await page.waitForFunction(
      () =>
        window.__game
          .inspectSolids()
          .every(
            ({ map, normalMap, roughnessMap }) =>
              ![map, normalMap, roughnessMap].includes("pending"),
          ),
      null,
      { polling: 100, timeout: 60000 },
    );
    // Wait for image loaders used by the arena, including assets outside course solids.
    await page.waitForLoadState("networkidle");
    const first = await page.evaluate(() => {
      const g = window.__game;
      g.vehiclePreview(Math.PI / 4);
      const source = document.querySelector("#viewport canvas");
      const small = document.createElement("canvas");
      small.width = 512;
      small.height = 288;
      const context = small.getContext("2d");
      context.drawImage(source, 0, 0, 512, 288);
      window.__turntableCanvas = small;
      return {
        thumbnail: source.toDataURL("image/png").split(",")[1],
        jpeg: small.toDataURL("image/jpeg", 0.92).split(",")[1],
        snapshot: g.snapshot(),
        errors: g.textureLoadErrors(),
      };
    });
    if (first.errors.length)
      throw Error(id + ": texture failures " + first.errors.join(", "));
    await writeFile(
      "public/vehicles/" + id + ".png",
      Buffer.from(first.thumbnail, "base64"),
    );
    const child = spawn(
      ffmpeg,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "image2pipe",
        "-framerate",
        "20",
        "-c:v",
        "mjpeg",
        "-i",
        "pipe:0",
        "-c:v",
        "libvpx",
        "-b:v",
        "650k",
        "-crf",
        "16",
        "-deadline",
        "good",
        "-cpu-used",
        "4",
        "-an",
        "-y",
        output + "/" + id + ".webm",
      ],
      { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] },
    );
    let errors = "";
    child.stderr.on("data", (data) => (errors += data));
    child.stdin.on("error", () => {});
    const finished = once(child, "close");
    for (let frame = 0; frame < 160; frame++) {
      const jpeg =
        frame === 0
          ? first.jpeg
          : await page.evaluate((i) => {
              window.__game.vehiclePreview(
                Math.PI / 4 + (i / 160) * Math.PI * 2,
              );
              const small = window.__turntableCanvas;
              small
                .getContext("2d")
                .drawImage(
                  document.querySelector("#viewport canvas"),
                  0,
                  0,
                  512,
                  288,
                );
              return small.toDataURL("image/jpeg", 0.92).split(",")[1];
            }, frame);
      if (!child.stdin.write(Buffer.from(jpeg, "base64")))
        await once(child.stdin, "drain");
    }
    child.stdin.end();
    const [code] = await finished;
    if (code !== 0) throw Error(id + ": FFmpeg failed " + errors);
    results.push({
      id,
      stage: "lab",
      firstFrame: "shared-thumbnail-capture",
      frames: 160,
      fps: 20,
      duration: 8,
      camera: Math.PI / 4,
    });
    console.log(
      "Captured lab thumbnail and video: " +
        id +
        " (" +
        ((Date.now() - start) / 1000).toFixed(1) +
        "s)",
    );
  }
  if (pageErrors.length) throw Error(pageErrors.join("\n"));
  await writeFile(
    "artifacts/vehicle-turntables/generation.json",
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
}
