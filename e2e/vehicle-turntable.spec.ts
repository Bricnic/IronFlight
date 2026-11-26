import { test as base, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

// Optional offline execution against a harness-enabled QA build. Normal e2e
// runs continue to use the development server from playwright.config.ts.
const test = base.extend({
  page: async ({ page }, use) => {
    if (process.env.PLAYWRIGHT_OFFLINE_DIST) {
      const root = resolve(process.env.PLAYWRIGHT_OFFLINE_DIST);
      await page.route("**/*", async (route) => {
        const path = decodeURIComponent(
          new URL(route.request().url()).pathname,
        );
        const file = resolve(root, `.${path === "/" ? "/index.html" : path}`);
        if (!file.startsWith(root + sep)) return route.fulfill({ status: 403 });
        const types: Record<string, string> = {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".webm": "video/webm",
          ".woff": "font/woff",
          ".woff2": "font/woff2",
        };
        try {
          const body = await readFile(file);
          const range = route
            .request()
            .headers()
            ["range"]?.match(/^bytes=(\d+)-(\d*)$/);
          if (range) {
            const start = Number(range[1]);
            const end = range[2]
              ? Math.min(Number(range[2]), body.length - 1)
              : body.length - 1;
            await route.fulfill({
              status: 206,
              body: body.subarray(start, end + 1),
              contentType: types[extname(file)] ?? "application/octet-stream",
              headers: {
                "accept-ranges": "bytes",
                "content-range": `bytes ${start}-${end}/${body.length}`,
              },
            });
            return;
          }
          await route.fulfill({
            body,
            headers: { "accept-ranges": "bytes" },
            contentType: types[extname(file)] ?? "application/octet-stream",
          });
        } catch {
          await route.fulfill({ status: 404, body: "Not found" });
        }
      });
    }
    await use(page);
  },
});

test("garage plays one silent looping turntable on hover, and unloads it on exit", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Select vehicle" }).click();
  const first = page.locator('[data-vehicle="monster-truck"]');
  await first.hover();
  await expect(first).toHaveClass(/preview-playing/);
  const clip = first.locator("video");
  await expect
    .poll(() => clip.evaluate((v) => (v as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0.1);
  expect(
    await clip.evaluate((v) => {
      const video = v as HTMLVideoElement;
      return {
        loop: video.loop,
        muted: video.muted,
        inline: video.playsInline,
      };
    }),
  ).toEqual({ loop: true, muted: true, inline: true });
  await clip.evaluate((node) => {
    (node as HTMLVideoElement).currentTime = 7.8;
  });
  await expect
    .poll(() => clip.evaluate((node) => (node as HTMLVideoElement).currentTime))
    .toBeLessThan(1);

  await mkdir("artifacts/vehicle-turntables", { recursive: true });
  await expect(clip).toHaveCSS("opacity", "1");
  let previousFrame: string | undefined;
  for (const [angle, time] of [
    ["front", 0.1],
    ["back", 4.1],
  ] as const) {
    const frame = await clip.evaluate(async (node, time) => {
      const video = node as HTMLVideoElement;
      video.pause();
      await new Promise<void>((resolve) => {
        video.addEventListener("seeked", () => resolve(), { once: true });
        video.currentTime = time;
      });
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      return canvas.toDataURL();
    }, time);
    if (previousFrame) expect(frame).not.toBe(previousFrame);
    previousFrame = frame;
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await first.screenshot({
      path: `artifacts/vehicle-turntables/hover-${angle}.png`,
    });
  }
  const second = page.locator('[data-vehicle="meteor-prospector"]');
  await second.hover();
  await expect(second).toHaveClass(/preview-playing/);
  await expect(page.locator("#vehicle-select video")).toHaveCount(1);
  await expect(first.locator("video")).toHaveCount(0);
  // A locked vehicle can be inspected without bypassing its unlock requirement.
  await expect(second).toHaveClass(/locked/);
  await second.locator("button").click();
  await expect(page.locator("#vehicle-select")).toBeVisible();
  await expect(page.locator("#vehicle-lock-toast")).toBeVisible();
  await page.locator("#vehicle-back").hover();
  await expect(page.locator("#vehicle-select video")).toHaveCount(0);
  await first.hover();
  await expect(first).toHaveClass(/preview-playing/);
  await page.locator("#vehicle-back").click();
  await expect(page.locator("#vehicle-select video")).toHaveCount(0);
});

test("keyboard focus previews cars and reduced motion keeps thumbnails", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Select vehicle" }).click();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".vehicle-card:has(:focus)")).toHaveClass(
    /preview-playing/,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#vehicle-select video")).toHaveCount(0);
  await page.locator('[data-vehicle="meteor-prospector"]').hover();
  await expect(page.locator("#vehicle-select video")).toHaveCount(0);
});

test("a missing clip leaves the thumbnail and lock interaction usable", async ({
  page,
}) => {
  await page.route("**/turntables/meteor-prospector.webm", (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Select vehicle" }).click();
  const card = page.locator('[data-vehicle="meteor-prospector"]');
  await card.hover();
  await expect
    .poll(() =>
      card
        .locator("video")
        .evaluate((node) => (node as HTMLVideoElement).error?.code ?? 0),
    )
    .toBeGreaterThan(0);
  await expect(card).not.toHaveClass(/preview-playing/);
  await expect(card.locator("img")).toBeVisible();
  await card.locator("button").click();
  await expect(page.locator("#vehicle-lock-toast")).toBeVisible();
});

test("lab thumbnail and first video frame have matching backgrounds", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Select vehicle" }).click();
  const card = page.locator('[data-vehicle="monster-truck"]');
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator("video")).toHaveCount(0);
  await card
    .locator("img")
    .evaluate((node) => (node as HTMLImageElement).decode());
  await mkdir("artifacts/vehicle-turntables", { recursive: true });
  const thumbnail = await card.screenshot({
    path: "artifacts/vehicle-turntables/lab-thumbnail.png",
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await card.hover();
  await expect(card).toHaveClass(/preview-playing/);
  const video = card.locator("video");
  await expect(video).toHaveCSS("opacity", "1");
  await video.evaluate(async (node) => {
    const clip = node as HTMLVideoElement;
    clip.pause();
    const presented = new Promise<void>((resolve) =>
      clip.requestVideoFrameCallback(() => resolve()),
    );
    const seeked = new Promise<void>((resolve) =>
      clip.addEventListener("seeked", () => resolve(), { once: true }),
    );
    clip.currentTime = 0;
    await Promise.all([seeked, presented]);
  });
  const comparison = await card.evaluate((card) => {
    const image = card.querySelector("img")!;
    const video = card.querySelector("video")!;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 288;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0, 512, 288);
    const still = context.getImageData(0, 0, 512, 288).data;
    context.drawImage(video, 0, 0, 512, 288);
    const moving = context.getImageData(0, 0, 512, 288).data;
    let total = 0,
      count = 0;
    // Top/bottom and side borders are background rather than vehicle pixels.
    for (let y = 0; y < 288; y++)
      for (let x = 0; x < 512; x++) {
        if (y >= 32 && y < 256 && x >= 32 && x < 480) continue;
        const i = (y * 512 + x) * 4;
        for (let c = 0; c < 3; c++) {
          total += Math.abs(still[i + c] - moving[i + c]);
          count++;
        }
      }
    return {
      backgroundMeanAbsoluteError: total / count,
      duration: video.duration,
      firstFrameTime: video.currentTime,
      thumbnail: [image.naturalWidth, image.naturalHeight],
    };
  });
  expect(comparison.thumbnail).toEqual([800, 450]);
  expect(comparison.firstFrameTime).toBeLessThan(0.05);
  // Allow JPEG and VP8 compression, while rejecting an environment or camera change.
  expect(comparison.backgroundMeanAbsoluteError).toBeLessThan(6);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const firstFrame = await card.screenshot({
    path: "artifacts/vehicle-turntables/lab-video-first-frame.png",
  });
  await writeFile(
    "artifacts/vehicle-turntables/background-comparison.json",
    JSON.stringify(comparison, null, 2),
  );
  await page.setViewportSize({ width: 1000, height: 620 });
  await page.setContent(
    '<style>body{margin:0;padding:20px;background:#182126;color:#f5f3e9;font:16px Arial}h1{font-size:24px;margin:0 0 16px}.pair{display:flex;gap:20px}section{width:460px}h2{font-size:18px;margin:0 0 10px}img{width:460px;border-radius:8px}</style><h1>Destruction lab: thumbnail and first video frame</h1><div class="pair"><section><h2>Thumbnail</h2><img src="data:image/png;base64,' +
      thumbnail.toString("base64") +
      '"></section><section><h2>Video first frame (0.00s)</h2><img src="data:image/png;base64,' +
      firstFrame.toString("base64") +
      '"></section></div>',
  );
  await page.screenshot({
    path: "artifacts/vehicle-turntables/lab-background-comparison.png",
    fullPage: true,
  });
});
