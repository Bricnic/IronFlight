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

test("mouse wheel zooms the actual camera in and out with limits and restart reset", async ({
  page,
}) => {
  await page.evaluate(() => window.__game!.pause(true));
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.35);
  const before = await page.evaluate(() => window.__game!.camera());
  await page.mouse.wheel(0, -400);
  await expect
    .poll(() => page.evaluate(() => window.__game!.camera().distance))
    .toBeLessThan(15.04);
  await expect
    .poll(() => page.evaluate(() => window.__game!.camera().position.z))
    .toBeGreaterThan(before.position.z);
  const near = await page.evaluate(() => window.__game!.camera());
  expect(near.position.z).toBeGreaterThan(before.position.z);
  expect(near.orbit).toEqual(before.orbit);
  await page.mouse.wheel(0, 800);
  await expect
    .poll(() => page.evaluate(() => window.__game!.camera().distance))
    .toBeGreaterThan(15.04);
  await expect
    .poll(() => page.evaluate(() => window.__game!.camera().position.z))
    .toBeLessThan(near.position.z);
  const far = await page.evaluate(() => window.__game!.camera());
  expect(far.position.z).toBeLessThan(near.position.z);
  await page.mouse.move(100, 30);
  await page.mouse.wheel(0, -400);
  expect(await page.evaluate(() => window.__game!.camera().distance)).toBe(
    far.distance,
  );
  for (const [delta, expected] of [
    [-10000, 6],
    [10000, 45],
  ]) {
    const prevented = await page.evaluate((delta) => {
      const e = new WheelEvent("wheel", {
        deltaY: delta,
        deltaMode: 1,
        cancelable: true,
        bubbles: true,
      });
      document.querySelector("canvas")!.dispatchEvent(e);
      return e.defaultPrevented;
    }, delta);
    expect(prevented).toBe(true);
    await expect
      .poll(() => page.evaluate(() => window.__game!.camera().distance))
      .toBe(expected);
  }
  await page.keyboard.press("r");
  expect(await page.evaluate(() => window.__game!.camera().distance)).toBe(
    15.04,
  );
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
