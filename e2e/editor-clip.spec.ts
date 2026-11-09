import { test, expect, type Page } from "@playwright/test";
test.slow();
test.use({ viewport: { width: 1400, height: 1000 } });

async function open(page: Page, name: string) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill(name);
  await page.locator("#editor-new").click();
  // The editor draws on demand. Stop the hidden game's animation loop so
  // SwiftShader spends its time on the editor rather than the covered scene.
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
}
async function numeric(page: Page) {
  for (const [key, value] of Object.entries({
    minX: -4,
    maxX: 4,
    minZ: -4,
    maxZ: 4,
  }))
    await page.locator(`#editor-clip-${key}`).fill(String(value));
  await page.locator("#editor-clip-preview").click();
}
test("numeric clipping previews layers, cancels, commits once, saves, reloads and playtests", async ({
  page,
}, info) => {
  const name = "e2e-clip-numeric";
  await open(page, name);
  try {
    await page.locator('li[data-key="solid:ground"] span').click();
    await page
      .locator('li[data-key="solid:road-1"] span')
      .click({ modifiers: ["Shift"] });
    await page.locator("#editor-tool-clip").click();
    await numeric(page);
    await expect(page.locator("#editor-clip-summary")).toContainText(
      "2 affected solids · 8 retained pieces",
    );
    await expect
      .poll(() => page.evaluate(() => window.__game!.editor().solids))
      .toBe(2);
    await expect(page.locator("#editor-clip-layers")).toContainText("ground");
    await page.screenshot({ path: info.outputPath("clip-preview.png") });
    await page.keyboard.press("Escape");
    await expect(page.locator("#editor-clip-apply")).toHaveCount(0);
    expect(await page.evaluate(() => window.__game!.editor().dirty)).toBe(
      false,
    );
    await page.locator("#editor-tool-clip").click();
    await numeric(page);
    await page.locator("#editor-clip-apply").click();
    await expect
      .poll(() => page.evaluate(() => window.__game!.editor().solids))
      .toBe(8);
    await page.locator("#editor-undo").click();
    await expect
      .poll(() => page.evaluate(() => window.__game!.editor().solids))
      .toBe(2);
    await expect(page.locator("#editor-objects li.selected")).toHaveCount(2);
    await page.locator("#editor-redo").click();
    await expect(page.locator("#editor-objects li.selected")).toHaveCount(8);
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    const saved = await page.evaluate(
      (name) => window.__game!.customLevels.load(name),
      name,
    );
    expect(saved.solids).toHaveLength(8);
    for (const s of saved.solids)
      expect(
        s.x + s.w / 2 <= -4 ||
          s.x - s.w / 2 >= 4 ||
          s.z + s.d / 2 <= -4 ||
          s.z - s.d / 2 >= 4,
      ).toBe(true);
    const labels = await page
      .locator("#editor-objects li span")
      .allTextContents();
    expect(labels).toEqual(
      [...labels].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
      ),
    );
    await page.clock.resume();
    await page.reload();
    await page.waitForFunction(() => !!window.__game);
    // Re-pause: the reload restarts the hidden game loop, which saturates
    // SwiftShader and starves the evaluates below.
    await page.clock.pauseAt(new Date("2026-01-01T00:02:00Z"));
    await page
      .getByRole("button", { name: "Level editor", exact: true })
      .click();
    await page.locator("#editor-levels").selectOption(name);
    await expect(page.locator("#editor-status")).toContainText(
      `Opened ${name}`,
    );
    await expect
      .poll(() => page.evaluate(() => window.__game!.editor().solids))
      .toBe(8);
    await page.locator("#editor-playtest").click();
    await expect(page.locator("#level-editor")).toBeHidden();
  } finally {
    await page.evaluate(
      (name) => window.__game!.customLevels.remove(name),
      name,
    );
  }
});
test("draws a through-cut and preserves an existing cutter; locked and rotated layers are identified", async ({
  page,
}) => {
  await open(page, "e2e-clip-draw");
  await page.locator('li[data-key="solid:ground"] span').click();
  await page.locator("#editor-tool-clip").click();
  const points = await page.evaluate(() =>
    [-5, 5].map((n) =>
      window.__game!.editorProject({ x: n, y: 0, z: -40 + n }),
    ),
  );
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  await page.mouse.move(points[1].x, points[1].y, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator("#editor-clip-summary")).toContainText(
    "1 affected solids · 4 retained pieces",
  );
  await page.locator("#editor-clip-cancel").click();
  await page.locator('li[data-key="solid:road-1"] button').click();
  await page.locator('li[data-key="solid:ground"] span').click();
  await page.locator("#editor-tool-clip").click();
  await numeric(page);
  await expect(page.locator("#editor-clip-layers")).toContainText("locked");
  await expect(
    page.getByRole("checkbox", { name: "Clip target road-1", exact: true }),
  ).toBeDisabled();
  await page.locator("#editor-clip-cancel").click();
  await page.locator('li[data-key="solid:road-1"] button').click();
  await page.locator('li[data-key="solid:road-1"] span').click();
  await page.locator('[data-prop="yaw"]').fill("0.2");
  await page.locator('[data-prop="yaw"]').press("Tab");
  await page.locator("#editor-tool-clip").click();
  await numeric(page);
  await expect(page.locator("#editor-clip-layers")).toContainText(
    "rotated solid",
  );
  await expect(page.locator("#editor-clip-apply")).toBeDisabled();
  await page.locator("#editor-clip-cancel").click();
  await page.locator('[data-prop="yaw"]').fill("0");
  await page.locator('[data-prop="yaw"]').press("Tab");
  await page.locator("#editor-tool-clip").click();
  await page.locator("#editor-clip-object").selectOption("road-1");
  await page.locator("#editor-clip-use-object").click();
  await page
    .getByRole("checkbox", { name: "Clip target ground", exact: true })
    .check();
  await expect(page.locator("#editor-clip-layers")).toContainText(
    "cutter (kept)",
  );
  await page.locator("#editor-clip-apply").click();
  await expect(page.locator('li[data-key="solid:road-1"]')).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => window.__game!.editor().solids))
    .toBe(5);
});
