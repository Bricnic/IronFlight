import { test, expect } from "@playwright/test";

test("wheel moves the editor camera without distance limits, changing FOV or slowing pan", async ({ page }) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  const canvas = page.locator("#level-editor canvas"); const box = (await canvas.boundingBox())!;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const camera = () => page.evaluate(() => window.__game!.inspectPreview().camera);
  const pan = async () => {
    const before = (await camera()).target;
    await page.mouse.move(center.x, center.y); await page.mouse.down({ button: "middle" }); await page.mouse.down({ button: "left" });
    await page.mouse.move(center.x + 50, center.y + 20, { steps: 4 }); await page.mouse.up({ button: "left" }); await page.mouse.up({ button: "middle" });
    const after = (await camera()).target; return after.map((v, i) => v - before[i]);
  };
  const firstPan = await pan(); const before = await camera();
  await page.mouse.move(center.x, center.y);
  for (let i = 0; i < 20; i++) await canvas.dispatchEvent("wheel", { deltaY: -1000, bubbles: true, cancelable: true });
  const forward = await camera();
  expect(Math.hypot(...forward.position.map((v, i) => v - before.position[i]))).toBeGreaterThan(500);
  expect(forward.fov).toBe(before.fov); expect(forward.distance).toBeCloseTo(before.distance);
  const secondPan = await pan(); secondPan.forEach((v, i) => expect(v).toBeCloseTo(firstPan[i]));
  const at = await camera();
  for (let i = 0; i < 40; i++) await canvas.dispatchEvent("wheel", { deltaY: 1000, bubbles: true, cancelable: true });
  const backward = await camera();
  expect(Math.hypot(...backward.position.map((v, i) => v - at.position[i]))).toBeGreaterThan(1000);
  expect(backward.fov).toBe(before.fov); expect(backward.distance).toBeCloseTo(before.distance);
});
