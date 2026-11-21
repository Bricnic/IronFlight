import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("level cards show readable medals and medal-colored best times above Play", async ({ page }) => {
  test.slow();
  const files = ["Block Party", "Toybox Road", "Tabletop Brawl", "Fireside Sonata"];
  const medals = ["gold", "silver", "bronze", ""];
  const records: Record<string, { time: number; splits: number[] }> = {};
  const cases = [];
  for (const [i, name] of files.entries()) {
    const level = JSON.parse(await readFile(`levels/official/toybox-adventures/${name}.json`, "utf8"));
    const time = i === 0 ? 35.3 : i === 1 ? (level.medals.gold + level.medals.silver) / 2 : i === 2 ? (level.medals.silver + level.medals.bronze) / 2 : level.medals.bronze + 10;
    const id = `custom:${name.toLowerCase().replaceAll(" ", "-")}`;
    records[`${id}:default`] = { time, splits: [] }; cases.push({ id, time, medal: medals[i] });
  }
  await page.addInitScript(records => localStorage.setItem("iron-flight-best-times-v1", JSON.stringify({ version: 1, records })), records);
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.locator('[data-collection="toybox-adventures"] button').click();
  for (const item of cases) {
    const card = page.locator(`.track-card[data-track="${item.id}"]`);
    const fonts = await card.evaluate(card => [".best-medal", ".play-word"].map(selector => getComputedStyle(card.querySelector(selector)!).fontSize));
    expect(fonts[0]).toBe(fonts[1]);
    await expect(card.locator(".best-time")).toHaveText(`Best: ${item.time.toFixed(1)}s`);
    if (item.medal) {
      await expect(card.locator(".best-time")).toHaveClass(new RegExp(item.medal));
      const colors = await card.evaluate(card => [".best-medal", ".best-time"].map(selector => getComputedStyle(card.querySelector(selector)!).color));
      expect(colors[0]).toBe(colors[1]);
    }
    const best = await card.locator(".best-time").boundingBox(), play = await card.locator(".play-word").boundingBox();
    expect(best!.y + best!.height).toBeLessThanOrEqual(play!.y);
    expect(Math.abs(best!.x + best!.width - play!.x - play!.width)).toBeLessThan(1);
  }
  await expect(page.locator('[data-track="custom:booster-gap"] .best-time')).toHaveText("NO TIME SET");
  await page.locator('[data-track="custom:block-party"]').screenshot({ path: "artifacts/level-card-best.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  const narrow = page.locator('[data-track="custom:block-party"]');
  await narrow.scrollIntoViewIfNeeded();
  expect(await page.locator("#level-select").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const cardBox = await narrow.boundingBox(), timeBox = await narrow.locator(".best-time").boundingBox();
  expect(timeBox!.x + timeBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width);
  await narrow.screenshot({ path: "artifacts/level-card-best-narrow.png" });
});
