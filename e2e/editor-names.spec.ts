import { test, expect } from "@playwright/test";
test.slow();
test("object names sort automatically and survive save/reload for every object kind", async ({
  page,
}) => {
  const name = "e2e-object-names";
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Level editor", exact: true }).click();
  await page.locator("#editor-name").fill(name);
  await page.locator("#editor-new").click();
  try {
    await page.locator("#editor-prefab-kind").selectOption("sign");
    await page.locator("#editor-add-prefab").click();
    await page.locator("#editor-add-target").click();
    await page.locator("#editor-add-ring").click();
    const entries = [
      ["solid:ground", "Zebra ground"],
      ["prefab:sign-1", "Alpha sign"],
      ["checkpoint:0", "Delta gate"],
      ["target:0", "beta pickup"],
      ["ring:0", "Charlie hoop"],
      ["spawn", "Echo spawn"],
    ];
    const sorted = async () => {
      const labels = await page
        .locator("#editor-objects li > span")
        .allTextContents();
      expect(labels).toEqual(
        [...labels].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
        ),
      );
    };
    for (const [key, label] of entries) {
      await page.locator(`li[data-key="${key}"] > span`).click();
      await page
        .getByRole("textbox", { name: "Object name", exact: true })
        .fill(label);
      await page
        .getByRole("textbox", { name: "Object name", exact: true })
        .press("Tab");
      await expect(page.locator(`li[data-key="${key}"] > span`)).toHaveText(
        label,
      );
      await sorted();
    }
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(`Saved ${name}`);
    await page.reload();
    await page.waitForFunction(() => !!window.__game);
    await page
      .getByRole("button", { name: "Level editor", exact: true })
      .click();
    await page.locator("#editor-levels").selectOption(name);
    await expect(page.locator("#editor-status")).toContainText(
      `Opened ${name}`,
    );
    for (const [key, label] of entries)
      await expect(page.locator(`li[data-key="${key}"] > span`)).toHaveText(
        label,
      );
    await sorted();
    const level = await page.evaluate(
      (name) => window.__game!.customLevels.load(name),
      name,
    );
    expect(level.spawn.name).toBe("Echo spawn");
    expect(level.prefabs[0].name).toBe("Alpha sign");
  } finally {
    await page.evaluate(
      (name) => window.__game!.customLevels.remove(name),
      name,
    );
  }
});
