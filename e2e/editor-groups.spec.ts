import { test, expect } from "@playwright/test";
import { unlink } from "node:fs/promises";
import { blankLevel } from "../src/custom-level";

test("large grouped ice levels save to disk", async ({ request }) => {
  const level = blankLevel("e2e-large-groups");
  level.prefabs = Array.from({ length: 5073 }, (_, i) => ({ id: `ice-${i}`, kind: "fragile-ice", x: i * 5, z: 0, group: `Frozen lake ${Math.floor(i / 500) + 1}` }));
  try {
    const response = await request.post("/__levels", { headers: { Origin: "http://127.0.0.1:5173" }, data: { name: level.name, level } });
    expect(response.status(), await response.text()).toBe(200);
    const loaded = await (await request.get(`/__levels?name=${level.name}`)).json();
    expect(loaded.prefabs).toHaveLength(5073);
    expect(loaded.prefabs[5000].group).toBe("Frozen lake 11");
  } finally {
    await unlink(`levels/${level.name}.json`).catch(() => {});
  }
});

test("editor owns C, copy/paste and group/ungroup shortcuts", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill("e2e-groups");
  await page.locator("#editor-new").click();
  await page.locator("#editor-prefab-kind").selectOption("fragile-ice");
  await page.locator("#editor-add-prefab").click();
  await page.locator("#editor-add-prefab").click();
  const rows = page.locator('#editor-objects li[data-key^="prefab:"]');
  await rows.nth(0).locator("span").click();
  await rows.nth(1).locator("span").click({ modifiers: ["Control"] });
  await page.locator("#editor-group").click();
  await expect(page.locator("#editor-objects .editor-group")).toHaveCount(1);
  await page.locator("#editor-tool-select").focus();
  await page.keyboard.press("c");
  await expect(page.locator("#level-editor")).toBeVisible();
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  expect((await page.evaluate(() => window.__game!.editor())).prefabs).toBe(4);
  await expect(page.locator("#editor-objects .editor-group")).toHaveCount(2);
  await page.locator("#editor-ungroup").click();
  await expect(page.locator("#editor-objects .editor-group")).toHaveCount(1);
  await page.locator("#editor-undo").click();
  await expect(page.locator("#editor-objects .editor-group")).toHaveCount(2);
  // Text fields retain native copy/paste and never copy scene objects.
  await page.locator("#editor-name").focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+c");
  expect((await page.evaluate(() => window.__game!.editor())).prefabs).toBe(4);
});

test("C alone does not leave the editor", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-tool-select").focus();
  await page.keyboard.press("c");
  await expect(page.locator("#level-editor")).toBeVisible();
});

test("dragging, locking and saving a group affects all its members", async ({ page }) => {
  test.slow();
  const level = blankLevel("e2e-group-drag");
  level.spawn.z = -40;
  level.solids.push(...[0, 16].map((x, i) => ({ id: `tile-${i}`, kind: "tile" as const, x, y: 1, z: 0, w: 10, h: 2, d: 10, color: 0x137e91, group: "Tile pair" })));
  try {
    await page.goto("/"); await page.waitForFunction(() => !!window.__game);
    await page.evaluate(level => window.__game!.customLevels.save(level), level);
    await page.getByRole("button", { name: "Level editor", exact: true }).click();
    await page.locator("#editor-levels").selectOption(level.name);
    await expect(page.locator("#editor-status")).toContainText(`Opened ${level.name}`);
    await page.getByRole("button", { name: "Tile pair (2)", exact: true }).click();
    const at = await page.evaluate(() => window.__game!.editorProject({ x: 0, y: 2, z: 0 }));
    await page.mouse.move(at.x, at.y); await page.mouse.down();
    await page.mouse.move(at.x + 45, at.y + 15, { steps: 6 }); await page.mouse.up();
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(`Saved ${level.name}`);
    const saved = await page.evaluate(name => window.__game!.customLevels.load(name), level.name);
    const tiles = saved.solids.filter(s => s.group === "Tile pair");
    expect(tiles[0].x).not.toBe(0);
    expect(tiles[1].x - tiles[0].x).toBeCloseTo(16);
    expect(tiles[1].z - tiles[0].z).toBeCloseTo(0);
    await page.getByRole("button", { name: "Lock Tile pair", exact: true }).click();
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(`Saved ${level.name}`);
    const locked = await page.evaluate(name => window.__game!.customLevels.load(name), level.name);
    expect(locked.solids.filter(s => s.group === "Tile pair").every(s => s.locked)).toBe(true);
    await page.getByRole("button", { name: "Unlock Tile pair", exact: true }).click();
    await page.getByRole("button", { name: "Tile pair (2)", exact: true }).click();
    await page.locator("#editor-ungroup").click();
    await expect(page.locator("#editor-objects .editor-group")).toHaveCount(0);
  } finally {
    await page.evaluate(name => window.__game!.customLevels.remove(name), level.name).catch(() => {});
  }
});

test("official tile sections and North Pole ice patches appear as named groups", async ({ page }) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-levels").selectOption("official/Amber Undertow");
  await expect(page.locator("#editor-status")).toContainText("Opened official/Amber Undertow");
  await expect(page.locator("#editor-objects .editor-group")).toHaveCount(3);
  await page.getByRole("button", { name: /^Copper side passage \(/ }).click();
  await expect(page.getByRole("textbox", { name: "Group name", exact: true })).toHaveValue("Copper side passage");
  await page.locator("#editor-preview").click();
  await page.screenshot({ path: "artifacts/editor-amber-groups.png" });
  await page.locator("#editor-preview").click();
  await page.locator("#editor-levels").selectOption("official/North Pole Summit");
  await expect(page.locator("#editor-status")).toContainText("Opened official/North Pole Summit", { timeout: 30000 });
  await expect(page.locator("#editor-objects .editor-group")).toHaveCount(53);
  await expect(page.locator('#editor-objects li[data-key^="prefab:np-lake-"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Ice field 1 (16)", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Group name", exact: true })).toHaveValue("Ice field 1");
  await page.getByRole("button", { name: "Expand Ice field 1", exact: true }).click();
  await expect(page.locator('[data-group="Ice field 1"] li')).toHaveCount(16);
  await page.screenshot({ path: "artifacts/editor-summit-groups.png" });
});
