import { test, expect } from "@playwright/test";

test("collection cards keep their size while showing the full artwork and compact progress", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("iron-flight-best-times-v1", JSON.stringify({ version: 1, records: { "custom:birthday-cake-circuit:default": { time: 1, splits: [] } } })));
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  const card = page.locator('.collection-card[data-collection="sweet-celebrations"]');
  await expect(card.locator(".collection-theme")).toHaveCount(0);
  await expect(card.locator(".play-word")).toHaveCount(0);
  await expect(card.locator(".collection-levels")).toHaveCount(0);
  await expect(card.locator(".collection-gold")).toHaveText("🟡1/8 gold");
  await expect(card.locator(".collection-stars")).toHaveText("⭐0/8 stars");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox(), image = await card.locator(".collection-image").boundingBox();
    expect(Math.abs(box!.height - 358)).toBeLessThan(2);
    expect(image!.height).toBeGreaterThan(240);
    expect(await card.locator("img").evaluate(img => getComputedStyle(img).objectFit)).toBe("contain");
    expect(await card.locator(".collection-stats").evaluate(row => row.scrollWidth <= row.clientWidth)).toBe(true);
    await card.screenshot({ path: `artifacts/collection-art-${width}.png` });
  }
});

test("Select level stays available in every screen and lab header shortcuts are removed", async ({ page }) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  const select = page.locator("#level-select-button");
  await expect(select).toHaveAccessibleName("Select level"); await expect(select).toBeVisible();
  for (const [button, screen] of [["settings-button", "settings-screen"], ["vehicle-select-button", "vehicle-select"], ["level-editor-button", "level-editor"]]) {
    await page.locator(`#${button}`).click(); await expect(page.locator(`#${screen}`)).toBeVisible();
    await expect(select).toBeVisible(); await select.click(); await expect(page.locator("#level-select")).toBeVisible();
  }
  await page.evaluate(() => { window.__game!.startTrack("triple-loop"); window.__game!.pause(true); });
  await expect(select).toBeVisible(); await expect(page.locator("header").getByRole("button", { name: "Destruction lab", exact: true })).toHaveCount(0);
  await expect(page.locator("#lab-toggle")).toHaveCount(0);
  await select.click(); await page.locator("#menu-lab").click();
  await expect(page.locator("#lab-panel")).toBeVisible(); await expect(select).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to stunt routes", exact: true })).toHaveCount(0);
  await page.locator("header").screenshot({ path: "artifacts/lab-navigation.png" });
  await select.click(); await page.setViewportSize({ width: 390, height: 844 });
  await expect(select).toBeVisible(); const bounds = await select.boundingBox(); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
});
