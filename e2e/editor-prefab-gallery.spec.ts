import { test, expect } from "@playwright/test";
import { PREFAB_KINDS } from "../src/custom-level";
import { mkdir, writeFile } from "node:fs/promises";

test("each prefab has a complete static model in wireframe and preview", async ({ page }) => {
  test.setTimeout(900000);
  await mkdir("artifacts/prefab-gallery", { recursive: true });
  // Keep this long visual audit independent of development-server reloads.
  await page.routeWebSocket(() => true, socket => { socket.onMessage(() => {}); });
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill("Prefab gallery verification");
  await page.locator("#editor-new").click();
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  const canvas = page.locator("#level-editor canvas");
  const results: object[] = [];
  for (const kind of PREFAB_KINDS) {
    await page.locator("#editor-prefab-search").fill(kind);
    await page.locator(`#editor-prefab-picker button[data-kind="${kind}"]`).click();
    await page.locator("#editor-add-prefab").click();
    await page.locator("#editor-frame-selection").click();
    await canvas.screenshot({ path: `artifacts/prefab-gallery/${kind}-wire.png` });
    await page.locator("#editor-preview").click();
    await canvas.screenshot({ path: `artifacts/prefab-gallery/${kind}-preview.png` });
    const before = await page.evaluate(() => window.__game!.inspectPreview());
    await page.clock.fastForward(1000);
    const after = await page.evaluate(() => window.__game!.inspectPreview());
    expect(after.prefabs, kind).toEqual(before.prefabs);
    expect(after.prefabs.find(p => p.id === after.selectedPrefab)?.meshes, kind).toBeGreaterThan(0);
    results.push({ kind, ...after.prefabs.find(p => p.id === after.selectedPrefab) });
    await page.locator("#editor-preview").click();
    await page.locator("#editor-remove").click();
  }
  await writeFile("artifacts/prefab-gallery/inspection.json", JSON.stringify(results, null, 2));
});
