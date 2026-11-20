import { test, expect } from "@playwright/test";
import { mkdir, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import { blankLevel } from "../src/custom-level";

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
    await expect(picker.locator('option[value="official/Fairground"]')).toHaveCount(1);
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
