import { test, expect, type Page } from "@playwright/test";
test.slow();
async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor" }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
  await expect(page.locator("#level-editor canvas")).toHaveCount(1);
}
test("wireframe editor creates, edits and saves", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("e2e-edit").catch(() => {}),
  );
  await page.locator("#editor-name").fill("e2e-edit");
  await page.locator("#editor-new").click();
  await page.locator("#editor-solid-kind").selectOption("barrier");
  await page.locator("#editor-add-solid").click();
  const x = page.locator('#editor-props input[data-prop="x"]');
  await x.fill("30");
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText("Saved e2e-edit");
  const probe = await page.evaluate(() => window.__game!.editor());
  expect(probe).toMatchObject({ name: "e2e-edit", solids: 3, dirty: false });
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("e2e-edit"),
  );
  expect(loaded.solids.find((s) => s.kind === "barrier")?.x).toBe(30);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-edit",
  );
});
test("wireframe editor reloads and deletes from disk", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(async () => {
    const g = window.__game!;
    await g.customLevels.remove("e2e-edit").catch(() => {});
    await g.customLevels.save({
      name: "e2e-edit",
      mode: "race",
      spawn: { x: 0, y: 2.1, z: -40, yaw: 0 },
      checkpoints: [{ x: 0, z: 40 }],
      solids: [
        {
          id: "ground",
          kind: "ground",
          x: 0,
          y: -0.6,
          z: 0,
          w: 200,
          h: 1.2,
          d: 200,
          color: 0x6d817c,
        },
        {
          id: "barrier-1",
          kind: "barrier",
          x: 30,
          y: 0.8,
          z: 0,
          w: 6,
          h: 1.6,
          d: 5,
          color: 0xe6c16a,
        },
      ],
      prefabs: [],
      medals: { gold: 30, silver: 45, bronze: 60 },
    });
  });
  await page.reload();
  await openEditor(page);
  await page.locator("#editor-levels").selectOption("e2e-edit");
  await expect(page.locator("#editor-status")).toContainText("Opened e2e-edit");
  let probe = await page.evaluate(() => window.__game!.editor());
  expect(probe).toMatchObject({ name: "e2e-edit", solids: 2 });
  await page.locator('#editor-objects li[data-key="solid:barrier-1"]').click();
  await page.locator("#editor-remove").click();
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText("Saved e2e-edit");
  probe = await page.evaluate(() => window.__game!.editor());
  expect(probe.solids).toBe(1);
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("e2e-edit"),
  );
  expect(loaded.solids).toHaveLength(1);
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-edit",
  );
});
test("wireframe editor assigns a texture per primitive", async ({ page }) => {
  await openEditor(page);
  await page.evaluate(() =>
    window.__game!.customLevels.remove("e2e-tex").catch(() => {}),
  );
  await page.locator("#editor-name").fill("e2e-tex");
  await page.locator("#editor-new").click();
  await page.locator("#editor-solid-kind").selectOption("barrier");
  await page.locator("#editor-add-solid").click();
  await page
    .locator('#editor-props select[data-prop="texture"]')
    .selectOption("rock_06");
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-status")).toContainText("Saved e2e-tex");
  const loaded = await page.evaluate(() =>
    window.__game!.customLevels.load("e2e-tex"),
  );
  expect(
    loaded.solids.find((s) => s.kind === "barrier")?.texture,
  ).toBe("rock_06");
  await page.evaluate(
    (name) => window.__game!.customLevels.remove(name),
    "e2e-tex",
  );
});
test("wireframe editor blocks invalid saves with an error", async ({
  page,
}) => {
  await openEditor(page);
  await page.locator("#editor-name").fill("");
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-error")).toContainText("name");
  let probe = await page.evaluate(() => window.__game!.editor());
  expect(probe.levels).not.toContain("");
  await page.locator("#editor-name").fill("e2e-bad");
  await page.locator('#editor-objects li[data-key="checkpoint:0"]').click();
  await page.locator("#editor-remove").click();
  await page.locator("#editor-save").click();
  await expect(page.locator("#editor-error")).toContainText("checkpoint");
  probe = await page.evaluate(() => window.__game!.editor());
  expect(probe.levels).not.toContain("e2e-bad");
});
