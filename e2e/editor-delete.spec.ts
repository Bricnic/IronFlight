import { test, expect, type Page } from "@playwright/test";

async function openEditor(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await expect(page.locator("#level-editor")).toBeVisible();
}

async function addBarrier(page: Page) {
  await page.locator("#editor-solid-kind").selectOption("barrier");
  await page.locator("#editor-add-solid").click();
}

async function blur(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
}

test("Delete removes the selection even after focus moves to the document body, and supports undo", async ({
  page,
}) => {
  await openEditor(page);
  const before = await page.evaluate(() => window.__game!.editor().solids);
  await addBarrier(page);
  await blur(page);
  await page.keyboard.press("Delete");
  await expect
    .poll(() => page.evaluate(() => window.__game!.editor().solids))
    .toBe(before);
  await expect
    .poll(() => page.evaluate(() => window.__game!.editor().selection))
    .toBeNull();
  await page.keyboard.press("Control+z");
  await expect
    .poll(() => page.evaluate(() => window.__game!.editor().solids))
    .toBe(before + 1);
  await blur(page);
  await page.keyboard.press("Backspace");
  await expect
    .poll(() => page.evaluate(() => window.__game!.editor().solids))
    .toBe(before);
});

test("Delete edits text fields and contenteditable text without deleting selected objects", async ({
  page,
}) => {
  await openEditor(page);
  await addBarrier(page);
  const before = await page.evaluate(() => window.__game!.editor().solids);
  const name = page.locator('#editor-props [data-prop="name"]');
  await name.fill("Rock");
  await page.keyboard.press("Home");
  await page.keyboard.press("Delete");
  await expect(name).toHaveValue("ock");
  expect(await page.evaluate(() => window.__game!.editor().solids)).toBe(
    before,
  );
  await page.evaluate(() => {
    const note = document.createElement("div");
    note.id = "delete-test-note";
    note.contentEditable = "true";
    note.textContent = "Note";
    document.getElementById("level-editor")!.append(note);
    note.focus();
  });
  await page.keyboard.press("Home");
  await page.keyboard.press("Delete");
  await expect(page.locator("#delete-test-note")).toHaveText("ote");
  expect(await page.evaluate(() => window.__game!.editor().solids)).toBe(
    before,
  );
});

test("Delete respects locked objects and does nothing while the editor is hidden", async ({
  page,
}) => {
  await openEditor(page);
  await addBarrier(page);
  const before = await page.evaluate(() => window.__game!.editor().solids);
  await page.locator("#editor-selection-lock").click();
  await blur(page);
  await page.keyboard.press("Delete");
  expect(await page.evaluate(() => window.__game!.editor().solids)).toBe(
    before,
  );
  await page.locator("#editor-selection-lock").click();
  await page.getByRole("button", { name: "Select level", exact: true }).click();
  await blur(page);
  await page.keyboard.press("Delete");
  expect(await page.evaluate(() => window.__game!.editor().solids)).toBe(
    before,
  );
});
