import { test, expect } from "@playwright/test";
import { blankLevel } from "../src/custom-level";

test("object help defaults off, changes existing labels live and persists for rebuilt models", async ({ page }) => {
  test.slow();
  const name = "e2e-object-help", level = blankLevel(name);
  level.prefabs = [
    { id: "candle", kind: "birthday-candle", x: -8, z: 0, resizeScale: 3 },
    { id: "book", kind: "book", x: 20, z: 25, resizeScale: 1.5 },
  ];
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.evaluate(level => window.__game!.customLevels.save(level), level);
  const play = async () => {
    await page.getByRole("button", { name: "Level editor", exact: true }).click();
    await page.locator("#editor-levels").selectOption(name);
    await expect(page.locator("#editor-status")).toContainText(`Opened ${name}`);
    await page.locator("#editor-playtest").click();
    await expect(page.locator("#level-editor")).toBeHidden({ timeout: 20000 });
    await expect.poll(() => page.evaluate(() => window.__game!.snapshot().run?.trackId)).toBe("custom:e2e-object-help");
    await page.evaluate(() => window.__game!.pause(true));
  };
  const helpStats = () => page.evaluate(() => window.__game!.stats().objectHelp);
  try {
    await play();
    await expect.poll(helpStats).toEqual({ total: 2, visible: 0 });
    await page.screenshot({ path: "artifacts/object-help-off.png" });
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    const toggle = page.getByRole("switch", { name: "Show object help text", exact: true });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("Tune the game to your machine.", { exact: true })).toHaveCount(0);
    await toggle.click(); await expect.poll(helpStats).toEqual({ total: 2, visible: 2 });
    await page.locator('[data-video="low"] button').click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("iron-flight-settings-v1")!).showObjectHelp)).toBe(true);
    await toggle.scrollIntoViewIfNeeded(); await page.screenshot({ path: "artifacts/settings-object-help.png" });
    await page.reload(); await page.waitForFunction(() => !!window.__game);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await play(); await expect.poll(helpStats).toEqual({ total: 2, visible: 2 });
    await page.screenshot({ path: "artifacts/object-help-on.png" });
    await page.getByRole("button", { name: "Settings", exact: true }).click(); await toggle.click();
    await expect.poll(helpStats).toEqual({ total: 2, visible: 0 });
  } finally { await page.evaluate(name => window.__game!.customLevels.remove(name), name); }
});
