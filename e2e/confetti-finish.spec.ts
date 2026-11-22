import { test, expect } from "@playwright/test";
import { blankLevel } from "../src/custom-level";

test("finish confetti keeps falling, clears on level select, and expires naturally", async ({ page }) => {
  test.slow();
  const name = "e2e-finish-confetti", level = blankLevel(name);
  level.spawn = { x: 0, y: 2.1, z: -10, yaw: 0 };
  level.checkpoints = [{ x: 0, z: 0 }, { x: 0, z: 8 }];
  level.prefabs = [{ id: "finish-star", kind: "gold-star", x: 0, y: 2, z: 3 }];
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.evaluate(level => window.__game!.customLevels.save(level), level);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  const finish = async () => {
    await page.getByRole("button", { name: "Level editor", exact: true }).click();
    await page.locator("#editor-levels").selectOption(name);
    await expect(page.locator("#editor-status")).toContainText(`Opened ${name}`);
    await page.locator("#editor-playtest").click(); await expect(page.locator("#run-progress")).toBeVisible();
    const run = await page.evaluate(() => {
      const g = window.__game!; g.pause(true);
      for (let f = 0; f < 600 && g.snapshot().run?.status === "running"; f++) g.advanceFrames(1, 1, { throttle: 1 });
      return g.snapshot().run;
    });
    expect(run?.status).toBe("completed");
    await expect(page.locator("#confetti")).toBeVisible();
  };
  const pixels = () => page.locator("#confetti").evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());
  try {
    await finish();
    const before = await pixels(), time = await page.evaluate(() => window.__game!.snapshot().time);
    await page.clock.runFor(500);
    expect((await pixels()) !== before).toBe(true);
    expect(await page.evaluate(() => window.__game!.snapshot().time)).toBe(time);
    await page.screenshot({ path: "artifacts/confetti-course-complete.png" });
    await page.getByRole("button", { name: "Level select", exact: true }).first().click();
    await expect(page.locator("#confetti")).toBeHidden();
    expect(await page.locator("#confetti").evaluate(canvas => {
      const c = canvas as HTMLCanvasElement;
      return c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data.some(value => value !== 0);
    })).toBe(false);
    await finish(); await page.clock.runFor(3000);
    await expect(page.locator("#confetti")).toBeHidden();
  } finally { await page.evaluate(name => window.__game!.customLevels.remove(name), name).catch(() => {}); }
});
