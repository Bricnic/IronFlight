import { test, expect } from "@playwright/test";
import { blankLevel, TEXTURE_IDS } from "../src/custom-level";

test("inspector selects by kind, locks, bulk edits mixed values, and saves one value to all", async ({ page }) => {
  test.slow();
  const name = "e2e-bulk-properties", level = blankLevel(name);
  level.solids = [0, 1, 2].map(i => ({ id: `tile-${i}`, kind: "tile", x: i * 20, y: 3, z: i * 20, w: 10, h: 2, d: 8, color: i ? 0x223344 : 0x112233, texture: TEXTURE_IDS[i ? 1 : 0], locked: i === 2 }));
  level.prefabs = [0, 1, 2].map(i => ({ id: `candle-${i}`, kind: "birthday-candle", x: i * 10, z: 50, resizeScale: i === 1 ? 2 : 1 }));
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.evaluate(level => window.__game!.customLevels.save(level), level);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-levels").selectOption(name);
  try {
    const section = page.locator('[data-kind="solid:tile"]');
    await expect(section.locator(".editor-kind-toggle")).toHaveAttribute("aria-expanded", "false");
    await section.locator(".editor-kind-toggle").click();
    await page.locator('li[data-key="solid:tile-0"] span').click();
    const props = page.locator("#editor-props");
    await expect(props).toContainText("Kind: tile");
    await expect(props.locator('[data-prop="name"]')).toHaveCount(1);
    await page.locator("#editor-select-kind").click();
    await expect(props).toContainText("2 objects selected");
    await expect(props.locator('[data-prop="name"]')).toHaveCount(0);
    await expect(props.locator('[data-prop="w"]')).toHaveValue("10");
    await expect(props.locator('[data-prop="x"]')).toHaveAttribute("placeholder", "(various)");
    await expect(props.locator('[data-prop="texture"] option:checked')).toHaveText("(various)");
    await expect(props.locator('[data-prop="color"]')).toHaveValue("");
    await props.locator('[data-prop="x"]').fill("7"); await props.locator('[data-prop="x"]').dispatchEvent("change");
    await page.locator("#editor-undo").click();
    await expect(props.locator('[data-prop="x"]')).toHaveValue("");
    for (const [key, value] of Object.entries({ w: "14", yaw: "45", color: "#334455" })) {
      await props.locator(`[data-prop="${key}"]`).fill(value); await props.locator(`[data-prop="${key}"]`).dispatchEvent("change");
    }
    await props.locator('[data-prop="texture"]').selectOption(TEXTURE_IDS[2]);
    await page.locator("#editor-selection-lock").click();
    await expect(page.locator("#editor-selection-lock")).toHaveText("Unlock selected");
    await expect(props.locator('[data-prop="w"]')).toBeDisabled();
    await page.locator("#editor-selection-lock").click();
    await expect(props.locator('[data-prop="w"]')).toBeEnabled();
    await page.locator("#editor-save").click(); await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    const saved = await page.evaluate(name => window.__game!.customLevels.load(name), name);
    for (const tile of saved.solids.slice(0, 2)) { expect(tile.w).toBe(14); expect(tile.yaw).toBeCloseTo(Math.PI / 4); expect(tile.color).toBe(0x334455); expect(tile.texture).toBe(TEXTURE_IDS[2]); }
    expect(saved.solids.map(p => p.x)).toEqual([0, 20, 40]); expect(saved.solids[2].w).toBe(10);
    const order = await page.evaluate(() => ["editor-copy", "editor-paste", "editor-duplicate", "editor-remove", "editor-select-spawn", "editor-objects"].map(id => Array.from(document.querySelectorAll("#level-editor *")).indexOf(document.getElementById(id)!)));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    await page.locator('[data-kind="prefab:birthday-candle"] .editor-kind-toggle').click();
    await page.locator('li[data-key="prefab:candle-0"] span').click(); await page.locator("#editor-select-kind").click();
    await expect(props.locator('[data-prop="resizeScale"]')).toHaveValue("");
    await props.locator('[data-prop="resizeScale"]').fill("1.5"); await props.locator('[data-prop="resizeScale"]').dispatchEvent("change");
    await page.locator("#editor-save").click(); await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    expect((await page.evaluate(name => window.__game!.customLevels.load(name), name)).prefabs.map(p => p.resizeScale)).toEqual([1.5, 1.5, 1.5]);
    await page.screenshot({ path: "artifacts/editor-bulk-properties.png" });
  } finally { await page.evaluate(name => window.__game!.customLevels.remove(name), name); }
});

test("Birthday Cake Circuit starts with birthday candles collapsed by kind", async ({ page }) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-levels").selectOption("official/Birthday Cake Circuit");
  await expect(page.locator("#editor-status")).toContainText("Opened official/Birthday Cake Circuit");
  const section = page.locator('[data-kind="prefab:birthday-candle"]');
  await expect(section.locator(".editor-kind-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(section.locator(".editor-kind-children")).toBeHidden();
  await section.scrollIntoViewIfNeeded(); await page.screenshot({ path: "artifacts/editor-birthday-candles-collapsed.png" });
  await section.locator(".editor-kind-toggle").click();
  const row = section.locator('li[data-key^="prefab:"] span').first(); await row.click();
  await page.locator("#editor-select-kind").click();
  await expect(page.locator("#editor-props")).toContainText("27 objects selected");
});

test("mixed groups remain grouped while kind selection and bulk edits target exactly the matching objects", async ({ page }) => {
  test.slow();
  const name = "e2e-mixed-kind-group", level = blankLevel(name);
  level.solids = [{ ...level.solids[0], group: "Party" }];
  level.prefabs = [0, 1, 2].map(i => ({ id: `candle-${i}`, kind: "birthday-candle", x: i * 10, z: 0, group: "Party" }));
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.evaluate(level => window.__game!.customLevels.save(level), level);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-levels").selectOption(name);
  try {
    const section = page.locator('[data-kind="prefab:birthday-candle"]');
    await expect(section.locator(".editor-kind-toggle")).toHaveAttribute("aria-expanded", "false");
    await section.locator(".editor-kind-toggle").click();
    await section.locator(".editor-group-name").click();
    await expect(page.locator("#editor-props")).toContainText("4 objects selected");
    await page.locator("#editor-select-kind").click();
    await expect(page.locator("#editor-props")).toContainText("3 objects selected");
    const y = page.locator('#editor-props [data-prop="y"]'); await y.fill("5"); await y.dispatchEvent("change");
    await page.locator("#editor-selection-lock").click();
    await page.locator("#editor-save").click(); await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    const saved = await page.evaluate(name => window.__game!.customLevels.load(name), name);
    expect(saved.prefabs.every(p => p.y === 5 && p.locked)).toBe(true);
    expect(saved.solids[0].y).toBe(level.solids[0].y); expect(saved.solids[0].locked).toBe(true);
  } finally { await page.evaluate(name => window.__game!.customLevels.remove(name), name); }
});
