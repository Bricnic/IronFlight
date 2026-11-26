import { test, expect, type Page } from "@playwright/test";

test.slow();

async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#level-editor canvas")).toHaveCount(1);
}

test("every prefab kind has an editable yaw", async ({ page }) => {
  test.setTimeout(600000);
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("e2e-all-yaw").catch(() => {}),
  );
  await page.locator("#editor-name").fill("e2e-all-yaw");
  await page.locator("#editor-new").click();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  // Sweep the live kind list: a newly introduced prefab inherits the field.
  const kinds = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>("#editor-prefab-picker button[data-kind]"),
    ).map((o) => o.dataset.kind!),
  );
  expect(kinds.length).toBeGreaterThan(0);
  const yaw = page.locator('#editor-props input[data-prop="yaw"]');
  for (const kind of kinds) {
    await page.evaluate((kind) => document.querySelector<HTMLButtonElement>(`#editor-prefab-picker button[data-kind="${kind}"]`)!.click(), kind);
    // Forced: click mechanics are covered by sibling tests; the assertion
    // target here is the yaw field, and actionability checks are too slow
    // to repeat per kind.
    await page.locator("#editor-add-prefab").click({ force: true });
    await expect(yaw, kind).toBeVisible({ timeout: 5000 });
    await page.locator("#editor-remove").click();
  }
});

test("yaw on a newly supported kind saves to disk", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("e2e-yaw-save").catch(() => {}),
  );
  await page.locator("#editor-name").fill("e2e-yaw-save");
  await page.locator("#editor-new").click();
  await page.locator("#editor-prefab-search").fill("loop");
  await page.locator('#editor-prefab-picker button[data-kind="loop"]').click();
  await page.locator("#editor-add-prefab").click();
  await page.locator('#editor-props input[data-prop="yaw"]').fill("45");
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText("Saved e2e-yaw-save");
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("e2e-yaw-save"),
  );
  expect(loaded.prefabs.find((p) => p.kind === "loop")?.yaw).toBeCloseTo(Math.PI / 4);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-yaw-save",
  );
});

test("selected prefab shows an orientation arrow", async ({ page }) => {
  await openEditor(page);
  await page.locator("#editor-name").fill("e2e-arrow");
  await page.locator("#editor-new").click();
  await page.locator("#editor-prefab-search").fill("barrel");
  await page.locator('#editor-prefab-picker button[data-kind="barrel"]').click();
  await page.locator("#editor-add-prefab").click();
  const arrows = () =>
    page.evaluate(() => window.__game!.inspectPreview().prefabArrows);
  // Fresh prefab faces +z (yaw 0).
  await expect
    .poll(async () => (await arrows()).length, { timeout: 15000 })
    .toBe(1);
  let arrow = (await arrows())[0]!;
  expect(arrow.id).toBe("barrel-1");
  expect(arrow.dir.x).toBeCloseTo(0, 3);
  expect(arrow.dir.z).toBeCloseTo(1, 3);
  // Turning the prefab swings the arrow with it.
  await page.locator('#editor-props input[data-prop="yaw"]').fill("90");
  await page.keyboard.press("Tab");
  await expect
    .poll(async () => (await arrows())[0]!.dir.x, { timeout: 15000 })
    .toBeCloseTo(1, 2);
  arrow = (await arrows())[0]!;
  expect(arrow.dir.z).toBeCloseTo(0, 2);
  // Deselecting removes the arrow.
  await page.locator('#editor-objects li[data-key="solid:ground"]').click();
  await expect.poll(arrows, { timeout: 15000 }).toEqual([]);
});

test("look points the prefab at the cursor until clicked", async ({
  page,
}) => {
  await openEditor(page);
  await page.locator("#editor-name").fill("e2e-look");
  await page.locator("#editor-new").click();
  const look = page.locator("#editor-tool-look");
  const tool = () => page.evaluate(() => window.__game!.editor().tool);
  // Nothing selected: the button stays disabled.
  await expect(look).toBeDisabled();
  await page.locator("#editor-prefab-search").fill("barrel");
  await page.locator('#editor-prefab-picker button[data-kind="barrel"]').click();
  await page.locator("#editor-add-prefab").click();
  await expect(look).toBeEnabled();
  await look.click();
  await expect.poll(tool, { timeout: 15000 }).toBe("look");
  // Aim at world +x from the prefab at the origin: yaw tracks to PI/2.
  const at = await page.evaluate((p) => window.__game!.editorProject(p), {
    x: 10,
    y: 0,
    z: 0,
  });
  const yawInput = page.locator('#editor-props input[data-prop="yaw"]');
  await page.mouse.move(at.x, at.y);
  await expect
    .poll(async () => Number(await yawInput.inputValue()), { timeout: 15000 })
    .toBeCloseTo(90, 2);
  // Clicking ends the session and returns to the select tool.
  await page.mouse.down();
  await page.mouse.up();
  await expect.poll(tool, { timeout: 15000 }).toBe("select");
  expect(Number(await yawInput.inputValue())).toBeCloseTo(90, 2);
  // The whole look was one undo step.
  await page.locator("#editor-undo").click();
  await expect
    .poll(() => yawInput.inputValue(), { timeout: 15000 })
    .toBe("");
});
