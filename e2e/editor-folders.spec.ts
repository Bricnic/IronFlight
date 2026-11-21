import { test, expect } from "@playwright/test";
import { mkdir, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import { blankLevel } from "../src/custom-level";

test("playtesting an edited official level stays in the game without reloading", async ({ page }) => {
  test.slow();
  const file = "levels/official/industrial-mayhem/Amber Undertow.json";
  const original = await readFile(file);
  try {
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    await page.getByRole("button", { name: "Level editor", exact: true }).click();
    await page.locator("#editor-levels").selectOption("official/industrial-mayhem/Amber Undertow");
    await expect(page.locator("#editor-status")).toContainText("Opened official/industrial-mayhem/Amber Undertow");
    await page.locator("#editor-solid-kind").selectOption("barrier");
    await page.locator("#editor-add-solid").click();
    const solids = await page.evaluate(() => window.__game!.editor().solids);
    let navigations = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations++;
    });
    await page.locator("#editor-playtest").click();
    await expect(page.locator("#level-editor")).toBeHidden();
    // Vite's file watcher may reload after the save response and game start.
    await page.waitForTimeout(2000);
    expect(navigations).toBe(0);
    await expect(page.locator("#level-select")).toBeHidden();
    await expect(page.locator("#placement-bar")).toBeVisible();
    expect(await page.evaluate(() => window.__game!.snapshot().run?.trackId)).toBe("custom:amber-undertow");
    expect(await page.evaluate(() => window.__game!.track("custom:amber-undertow").custom!.solids.length)).toBe(solids);
    expect(JSON.parse(await readFile(file, "utf8")).solids).toHaveLength(solids);
  } finally {
    await writeFile(file, original);
  }
});

test("editor browses nested levels and saves to the original file", async ({ page }) => {
  test.slow();
  const folder = "levels/backgrounds/e2e-nested";
  const path = "backgrounds/e2e-nested/File Name";
  const root = "e2e-folder-new";
  await mkdir(folder, { recursive: true });
  await writeFile(`${folder}/File Name.json`, JSON.stringify(blankLevel("Original Name")));
  try {
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    await page.getByRole("button", { name: "Level editor", exact: true }).click();
    const picker = page.locator("#editor-levels");
    await expect(picker.locator('option[value="official/stunt-parks/Fairground"]')).toHaveCount(1);
    await expect(picker.locator(`option[value="${path}"]`)).toHaveCount(1);
    await expect(picker.locator('option[value="official/order"]')).toHaveCount(0);
    await picker.selectOption(path);
    await expect(page.locator("#editor-status")).toContainText(`Opened ${path}`);
    await page.locator("#editor-name").fill("Renamed Level");
    await page.locator("#editor-name").press("Tab");
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText("Saved Renamed Level");
    const saved = JSON.parse(await readFile(`${folder}/File Name.json`, "utf8"));
    expect(saved.name).toBe("Renamed Level");
    expect(saved).not.toHaveProperty("sourcePath");
    await expect(readFile("levels/Renamed Level.json", "utf8")).rejects.toThrow();
    await page.locator("#editor-name").fill(root);
    await page.locator("#editor-new").click();
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(`Saved ${root}`);
    expect(JSON.parse(await readFile(`levels/${root}.json`, "utf8")).name).toBe(root);
    for (const name of ["../package", "official/../../package", "official\\Fairground"]) {
      const response = await page.request.get(`/__levels?name=${encodeURIComponent(name)}`);
      expect(response.status()).toBe(400);
    }
  } finally {
    await unlink(`${folder}/File Name.json`);
    await rmdir(folder);
    await unlink(`levels/${root}.json`).catch(() => {});
  }
});
