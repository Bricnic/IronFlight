import { chromium, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { build } from "vite";

// Build a separate QA bundle with the existing game harness enabled. Production
// output keeps its harness disabled. Intercept bytes to avoid loopback sockets.
await build({
  define: { "import.meta.env.DEV": "true" },
  build: { outDir: "artifacts/dream-game-build" },
  logLevel: "warn",
});
const root = resolve("artifacts/dream-game-build");
const output = "artifacts/dream-vehicle-review";
const ids = [
  "gingerbread-glider",
  "haunted-hearse",
  "windup-wonder",
  "loop-launcher",
  "slag-hauler",
  "canyon-camper",
  "meteor-prospector",
];
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 600 },
  });
  const errors = [];
  page.on("pageerror", (e) => {
    errors.push(String(e));
    console.error(e);
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const file = resolve(
      root,
      `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`,
    );
    if (!file.startsWith(root + sep)) return route.fulfill({ status: 403 });
    const types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".svg": "image/svg+xml",
      ".wasm": "application/wasm",
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
    localStorage.setItem("iron-flight-debug-allow-locked-content", "true");
  });
  await page.goto("http://dream-review.local/?test=dream-model-review");
  await page.waitForFunction(() => !!window.__game, null, { timeout: 90000 });
  console.log("Game harness ready");
  await page.evaluate(() => {
    window.__game.pause(true);
    window.__captureFreeze = true;
  });
  await page.addStyleTag({
    content:
      "#app > :not(#viewport) { visibility:hidden!important } #viewport { inset:0!important }",
  });
  await page.setViewportSize({ width: 800, height: 450 });
  await mkdir(output, { recursive: true });
  const reports = [];
  for (const id of ids) {
    await page.evaluate((id) => {
      const g = window.__game;
      g.startTrack("foundry-run", "easy", id);
      g.place({ x: 0, y: 2.1, z: -95 }, 0);
      g.advanceFrames(45, 1, {});
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
      { timeout: 60000, polling: 100 },
    );
    const report = await page.evaluate(() => {
      const g = window.__game;
      g.vehiclePreview();
      return {
        snapshot: g.snapshot(),
        camera: g.camera(),
        errors: g.textureLoadErrors(),
      };
    });
    await page
      .locator("#viewport canvas")
      .screenshot({ path: `public/vehicles/${id}.png` });
    await page
      .locator("#viewport canvas")
      .screenshot({ path: `${output}/${id}-in-game.png` });
    reports.push({ id, ...report });
    expect(report.errors).toEqual([]);
    console.log(`Refreshed in-game preview: ${id}`);
  }
  if (errors.length) throw Error(errors.join("\n"));
  await writeFile(
    `${output}/game-reports.json`,
    JSON.stringify(reports, null, 2),
  );
} finally {
  await browser.close();
}
