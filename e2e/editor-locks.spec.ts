import { test, expect } from "@playwright/test";

test.slow();

test("locked solids cannot be picked or dragged until unlocked", async ({
  page,
}, info) => {
  const name = "e2e-viewport-lock";
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill(name);
  await page.locator("#editor-new").click();
  try {
    await page.locator("#editor-solid-kind").selectOption("barrier");
    await page.locator("#editor-add-solid").click();
    const row = page.locator('li[data-key="solid:barrier-3"]');
    const at = await page.evaluate(() =>
      window.__game!.editorProject({ x: 4, y: 0.8, z: 0 }),
    );
    const selection = () =>
      page.evaluate(() => window.__game!.editor().selection);
    await page.mouse.click(at.x, at.y);
    await expect.poll(selection).toBe("solid:barrier-3");
    for (const key of ["solid:ground", "solid:road-1", "solid:barrier-3"])
      await page
        .locator(`li[data-key="${key}"]`)
        .getByRole("button", { name: /^Lock / })
        .click();
    await page.mouse.click(at.x, at.y);
    await expect.poll(selection).toBeNull();
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 40, at.y + 15, { steps: 5 });
    await page.mouse.up();
    await expect.poll(selection).toBeNull();
    await page.screenshot({ path: info.outputPath("locked-objects.png") });
    // Empty-space drags orbit the camera, so reproject the solid after unlock.
    await page.locator("#editor-tool-select").click();
    await row.getByRole("button", { name: /^Unlock / }).click();
    await row.locator("span").click();
    const x = page.locator('#editor-props input[data-prop="x"]');
    await expect(x).toHaveValue("4");
    const unlockedAt = await page.evaluate(() =>
      window.__game!.editorProject({ x: 4, y: 0.8, z: 0 }),
    );
    await page.mouse.move(unlockedAt.x, unlockedAt.y);
    await page.mouse.down();
    await page.mouse.move(unlockedAt.x + 60, unlockedAt.y + 20, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => x.inputValue()).not.toBe("4");
    await expect.poll(selection).toBe("solid:barrier-3");
  } finally {
    await page.evaluate(
      (name) => window.__game!.customLevels.remove(name),
      name,
    );
  }
});

test("object locks prevent list and viewport selection and persist through disk reload", async ({
  page,
}) => {
  const name = "e2e-object-locks";
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill(name);
  await page.locator("#editor-new").click();
  try {
    await page.locator("#editor-prefab-kind").selectOption("axe");
    await page.locator("#editor-add-prefab").click();
    await page.locator("#editor-add-target").click();
    await page.locator("#editor-add-ring").click();
    const keys = [
      "solid:ground",
      "solid:road-1",
      "prefab:axe-1",
      "checkpoint:0",
      "target:0",
      "ring:0",
      "spawn",
    ];
    const selection = () =>
      page.evaluate(() => window.__game!.editor().selection);
    for (const key of keys) {
      const row = page.locator(`li[data-key="${key}"]`);
      await row.locator("span").click();
      await expect.poll(selection).toBe(key);
      await row.getByRole("button", { name: /^Lock / }).click();
      await expect(row).toHaveAttribute("data-locked", "true");
      await expect.poll(selection).toBeNull();
      await row.locator("span").click();
      expect(await selection()).toBeNull();
    }
    // All objects are locked, so viewport picking must not find a selectable
    // fallback under the spawn marker either.
    const point = await page.evaluate(() =>
      window.__game!.editorProject({ x: 0, y: 3.6, z: -40 }),
    );
    await page.mouse.click(point.x, point.y);
    expect(await selection()).toBeNull();
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    const locked = await page.evaluate(
      (name) => window.__game!.customLevels.load(name),
      name,
    );
    expect(
      [
        locked.spawn,
        ...locked.solids,
        ...locked.prefabs,
        ...locked.checkpoints,
        ...locked.collectibles!,
        ...locked.rings!,
      ].every((item) => item.locked),
    ).toBe(true);

    await page.reload();
    await page.waitForFunction(() => !!window.__game);
    await page
      .getByRole("button", { name: "Level editor", exact: true })
      .click();
    await page.locator("#editor-levels").selectOption(name);
    await expect(page.locator("#editor-status")).toContainText(
      `Opened ${name}`,
    );
    for (const key of keys) {
      const row = page.locator(`li[data-key="${key}"]`);
      await expect(row).toHaveAttribute("data-locked", "true");
      await row.getByRole("button", { name: /^Unlock / }).click();
      await row.locator("span").click();
      await expect.poll(selection).toBe(key);
    }
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    const unlocked = await page.evaluate(
      (name) => window.__game!.customLevels.load(name),
      name,
    );
    expect(
      [
        unlocked.spawn,
        ...unlocked.solids,
        ...unlocked.prefabs,
        ...unlocked.checkpoints,
        ...unlocked.collectibles!,
        ...unlocked.rings!,
      ].every((item) => item.locked === false),
    ).toBe(true);
  } finally {
    await page.evaluate(
      (name) => window.__game!.customLevels.remove(name),
      name,
    );
  }
});
