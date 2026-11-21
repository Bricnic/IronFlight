import { test, expect } from "@playwright/test";

test("formal groups show their bounding center, translate together and Shift-drag only in Y", async ({ page }, info) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  const name = "e2e-group-location";
  await page.locator("#editor-name").fill(name); await page.locator("#editor-new").click();
  const field = (key: string) => page.locator(`#editor-props [data-prop="${key}"]`);
  const set = async (key: string, value: number) => { await field(key).fill(String(value)); await field(key).dispatchEvent("change"); };
  const save = async () => { await page.locator("#editor-save").click(); await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`); return page.evaluate(name => window.__game!.customLevels.load(name), name); };
  try {
    for (const [kind, values] of [
      ["barrier", { x: 0, y: 2, z: 0, w: 4, h: 4, d: 4 }],
      ["tile", { x: 20, y: 8, z: 10, w: 12, h: 2, d: 8 }],
    ] as const) {
      await page.locator("#editor-solid-kind").selectOption(kind); await page.locator("#editor-add-solid").click();
      for (const [key, value] of Object.entries(values)) await set(key, value);
    }
    await page.locator('li[data-key="solid:barrier-3"] span').click();
    await page.locator('li[data-key="solid:tile-4"] span').click({ modifiers: ["Shift"] });
    await expect(field("x")).toHaveAttribute("placeholder", "(various)");
    await page.locator("#editor-group").click();
    await expect(page.getByRole("heading", { name: "Group location", exact: true })).toBeVisible();
    // Bounding-box center differs from the average of the member origins (10, 5, 5).
    await expect(field("x")).toHaveValue("12"); await expect(field("y")).toHaveValue("4.5"); await expect(field("z")).toHaveValue("6");
    await set("x", 100); await set("y", 15); await set("z", -20);
    await page.locator("#editor-selection-lock").click(); await expect(field("x")).toBeDisabled();
    await page.locator("#editor-selection-lock").click(); await expect(field("x")).toBeEnabled();
    const before = await save();
    expect(before.solids.find(s => s.id === "barrier-3")).toMatchObject({ x: 88, y: 12.5, z: -26 });
    expect(before.solids.find(s => s.id === "tile-4")).toMatchObject({ x: 108, y: 18.5, z: -16 });
    await page.locator("#editor-frame-selection").click();
    const at = await page.evaluate(() => { const p = window.__game!.editor().selectedObject!; return window.__game!.editorProject({ x: p.x as number, y: p.y as number, z: p.z as number }); });
    await page.mouse.move(at.x, at.y); await page.keyboard.down("Shift"); await page.mouse.down();
    await page.mouse.move(at.x + 35, at.y - 65, { steps: 8 }); await page.mouse.up(); await page.keyboard.up("Shift");
    const after = await save(); let dy: number | undefined;
    for (const old of before.solids.filter(s => s.group)) {
      const moved = after.solids.find(s => s.id === old.id)!;
      expect(moved.x).toBe(old.x); expect(moved.z).toBe(old.z);
      expect(moved.y).toBeGreaterThan(old.y);
      if (dy === undefined) dy = moved.y - old.y; else expect(moved.y - old.y).toBeCloseTo(dy);
    }
    await page.locator("#editor-undo").click(); await expect(field("y")).toHaveValue("15");
    await save();
    await page.locator("#editor-levels").selectOption(name);
    await expect(page.locator("#editor-status")).toContainText(`Opened ${name}`);
    await page.locator('.editor-group[data-group="Group"] .editor-group-name').first().click();
    await expect(field("x")).toHaveValue("100"); await expect(field("y")).toHaveValue("15"); await expect(field("z")).toHaveValue("-20");
    await page.locator("#editor-frame-selection").click();
    await page.screenshot({ path: info.outputPath("group-center.png") });
  } finally { await page.evaluate(name => window.__game!.customLevels.remove(name), name); }
});

test("Shift can constrain an active Select drag, and Shift-click still toggles selection", async ({ page }) => {
  test.slow();
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill("Vertical select verification"); await page.locator("#editor-new").click();
  await page.locator("#editor-solid-kind").selectOption("barrier"); await page.locator("#editor-add-solid").click();
  for (const [key, value] of Object.entries({ x: 1.3, y: 5, z: 3.7, w: 8, h: 8, d: 8 })) {
    const field = page.locator(`#editor-props [data-prop="${key}"]`); await field.fill(String(value)); await field.dispatchEvent("change");
  }
  await page.locator("#editor-frame-selection").click();
  const object = () => page.evaluate(() => window.__game!.editor().selectedObject!);
  const original = await object();
  const at = await page.evaluate(() => window.__game!.editorProject({ x: 1.3, y: 5, z: 3.7 }));
  await page.mouse.move(at.x, at.y); await page.mouse.down(); await page.mouse.move(at.x + 30, at.y + 10, { steps: 4 });
  const horizontal = await object();
  await page.keyboard.down("Shift"); await page.mouse.move(at.x + 60, at.y - 40, { steps: 6 });
  const vertical = await object();
  expect(vertical.x).toBe(horizontal.x); expect(vertical.z).toBe(horizontal.z); expect(vertical.y).not.toBe(horizontal.y);
  await page.keyboard.up("Shift"); await page.mouse.move(at.x + 90, at.y - 30, { steps: 4 }); await page.mouse.up();
  expect((await object()).y).toBe(vertical.y);
  await page.locator("#editor-undo").click(); expect(await object()).toEqual(original);
  await page.keyboard.down("Shift"); await page.mouse.click(at.x, at.y); await page.keyboard.up("Shift");
  expect((await page.evaluate(() => window.__game!.editor())).selection).toBeNull();
});
