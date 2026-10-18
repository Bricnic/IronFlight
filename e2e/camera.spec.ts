import { test, expect } from "@playwright/test";
import { lampMotion } from "./camera-motion";
test.beforeEach(async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => !!window.__game);
});
test("default camera is directly behind, and mouse drag orbits the truck", async ({
  page,
}) => {
  await page.evaluate(() => window.__game!.pause(true));
  const before = await page.evaluate(() => ({
    camera: window.__game!.camera(),
    state: window.__game!.snapshot(),
  }));
  expect(before.camera.position.x).toBeCloseTo(before.state.position.x, 2);
  expect(before.camera.position.z).toBeLessThan(before.state.position.z);
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.55, box!.y + box!.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width * 0.75,
    box!.y + box!.height * 0.6,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(() => Math.abs(window.__game!.camera().orbit.yaw)),
    )
    .toBeGreaterThan(0.2);
});
test("lamp-post motion is monotonic across accelerate jump landing and finish", async ({
  page,
}, info) => {
  for (const stage of ["easy", "medium", "hard"] as const) {
    const samples = await page.evaluate((stage) => {
      const g = window.__game!;
      g.select(stage);
      g.pause(true);
      return g.traceFrames(780, 1, { throttle: 1 });
    }, stage);
    const motion = lampMotion(samples);
    await info.attach(`${stage}-lamp-motion`, {
      body: JSON.stringify({ motion, samples }),
      contentType: "application/json",
    });
    expect(samples.some((s) => s.state.status === "finished")).toBe(true);
    expect(motion.comparisons).toBeGreaterThan(300);
    expect(motion.maxBackstep).toBeLessThan(0.004);
  }
});
test("live normal-speed camera remains smooth through a full keyboard-driven jump", async ({
  page,
}, info) => {
  await page.evaluate(() => window.__game!.startCameraTrace());
  await page.keyboard.down("w");
  await expect
    .poll(() => page.evaluate(() => window.__game!.snapshot().status), {
      timeout: 45000,
    })
    .toBe("finished");
  await page.keyboard.up("w");
  const samples = await page.evaluate(() => window.__game!.stopCameraTrace());
  const motion = lampMotion(samples);
  await info.attach("live-camera", {
    body: JSON.stringify({ motion, samples }),
    contentType: "application/json",
  });
  expect(motion.comparisons).toBeGreaterThan(30);
  expect(motion.maxBackstep).toBeLessThan(0.004);
  await page.screenshot({ path: info.outputPath("rear-camera-finish.png") });
});
