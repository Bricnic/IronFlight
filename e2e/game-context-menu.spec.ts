import { test, expect } from "@playwright/test";

test("right-clicking the gameplay canvas suppresses the browser image menu", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.evaluate(() => {
    window.__game!.select("easy");
    document.documentElement.dataset.gameContextPrevented = "missing";
    window.addEventListener("contextmenu", e => {
      document.documentElement.dataset.gameContextPrevented = String(e.defaultPrevented);
    }, { once: true });
  });
  await page.locator("#viewport canvas").click({ button: "right" });
  await expect(page.locator("html")).toHaveAttribute("data-game-context-prevented", "true");
});
