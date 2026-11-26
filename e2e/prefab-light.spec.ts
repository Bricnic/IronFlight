import { test, expect, type Page } from "@playwright/test";
import { blankLevel, type CustomLevel } from "../src/custom-level";

test.slow();
async function boot(page: Page) {
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
}
test("settings start collapsed and prefab light defaults, bulk edits and saves reach preview and gameplay", async ({ page }, info) => {
  await boot(page);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  const name = "e2e-prefab-light";
  await page.locator("#editor-name").fill(name); await page.locator("#editor-new").click();
  try {
    for (const id of ["editor-level-settings", "editor-world-settings"]) await expect(page.locator(`#${id}`)).not.toHaveAttribute("open", "");
    const kinds = [["barrel", 0], ["cave-fairy", 150], ["firefly", 150], ["glow-mushroom", 500], ["birthday-candle", 250]] as const;
    for (const [kind, lumens] of kinds) {
      await page.locator("#editor-prefab-search").fill(kind); await page.locator(`#editor-prefab-picker button[data-kind="${kind}"]`).click(); await page.locator("#editor-add-prefab").click();
      await expect(page.locator('[data-prop="lightLumens"]')).toHaveValue(String(lumens));
      if (kind === "birthday-candle") await expect(page.locator('[data-prop="lightColor"]')).toHaveValue("#ffe6a3");
    }
    await page.locator("#editor-preview").click(); await page.locator("#editor-frame-selection").click();
    const candle = (await page.evaluate(() => window.__game!.inspectPreview())).prefabLights.find(p => p.id.startsWith("birthday-candle"))!;
    expect(candle.lumens).toBeCloseTo(250); expect(candle.position[1]).toBeGreaterThan(1);
    await page.locator("#level-editor canvas").screenshot({ path: info.outputPath("candle-tip-preview.png") });
    await page.locator('li[data-key="prefab:barrel-1"] span').click({ modifiers: ["Shift"] });
    await page.locator('[data-prop="lightLumens"]').fill("375"); await page.locator('[data-prop="lightLumens"]').dispatchEvent("change");
    const color = page.getByRole("textbox", { name: "Color", exact: true });
    await color.fill("#aabbcc"); await color.dispatchEvent("change");
    await page.locator("#editor-save").click(); await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    const saved = await page.evaluate(name => window.__game!.customLevels.load(name), name);
    expect(saved.prefabs.filter(p => p.lightLumens === 375 && p.lightColor === 0xaabbcc)).toHaveLength(2);
    await page.locator("#editor-playtest").click(); await expect(page.locator("#level-editor")).toBeHidden({ timeout: 20000 });
    expect((await page.evaluate(() => window.__game!.stats())).prefabLights.filter(p => Math.abs(p.lumens - 375) < 0.01 && p.color === 0xaabbcc)).toHaveLength(2);
  } finally { await page.evaluate(name => window.__game!.customLevels.remove(name), name); }
});

async function sample(page: Page, buffer: Buffer, points: { x: number; y: number }[]) {
  return page.evaluate(async ({ data, points }) => {
    const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
    const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(img, 0, 0);
    return points.map(({ x, y }) => {
      const values = ctx.getImageData(Math.round(x) - 2, Math.round(y) - 2, 5, 5).data;
      let total = 0; for (let i = 0; i < values.length; i += 4) total += (values[i] + values[i + 1] + values[i + 2]) / 3;
      return total / 25;
    });
  }, { data: buffer.toString("base64"), points });
}

test("headlights are blocked by a wall and a mushroom casts a floor shadow", async ({ page }, info) => {
  await boot(page);
  const name = "e2e-headlight-occlusion";
  const level: CustomLevel = { ...blankLevel(name), backgroundTemplate: "mystic-cave", forceNight: true,
    spawn: { x: 0, y: 2.1, z: 0, yaw: 0 }, checkpoints: [{ x: 0, z: 60 }],
    solids: [
      { id: "floor", kind: "ground", x: 0, y: -0.25, z: 25, w: 50, h: 0.5, d: 70, color: 0xffffff, texture: "concrete_floor_02" },
      { id: "wall", kind: "barrier", x: 0, y: 4, z: 15, w: 12, h: 8, d: 1, color: 0xffffff },
    ], prefabs: [{ id: "mushroom", kind: "glow-mushroom", x: 0, y: 0, z: 8, lightLumens: 0 }],
  };
  try {
    const render = async (level: CustomLevel, file: string) => {
      await page.evaluate(async level => { await window.__game!.customLevels.save(level); window.__game!.startTrack("custom:e2e-headlight-occlusion"); window.__game!.pause(true); window.__game!.frameSpot(0, 0, 17, 32, 0, 0.85); }, level);
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => window.__game!.frameSpot(0, 0, 17, 32, 0, 0.85));
      // Full-page screenshots preserve the screen coordinates returned by project().
      const shot = await page.screenshot({ path: info.outputPath(file) });
      const points = await page.evaluate(() => [
        { x: 4, y: 0.02, z: 20 }, { x: -4, y: 0.02, z: 20 }, { x: 3.5, y: 0.02, z: 20 },
        { x: 0, y: 0.02, z: 11 }, { x: -0.4, y: 0.02, z: 11 }, { x: 0.4, y: 0.02, z: 11 },
      ].map(p => window.__game!.project(p)));
      return sample(page, shot, points);
    };
    const blocked = await render(level, "wall-and-mushroom.png");
    const open = await render({ ...level, solids: level.solids.filter(s => s.id !== "wall") }, "mushroom-shadow.png");
    const clear = await render({ ...level, solids: level.solids.filter(s => s.id !== "wall"), prefabs: [] }, "unblocked-headlights.png");
    expect(Math.max(...open.slice(0, 3))).toBeGreaterThan(Math.max(...blocked.slice(0, 3)) + 10);
    expect(Math.min(...clear.slice(3))).toBeGreaterThan(Math.min(...open.slice(3)) + 10);
  } finally { await page.evaluate(name => window.__game!.customLevels.remove(name), name); }
});
