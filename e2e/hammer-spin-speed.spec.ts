import { test, expect } from "@playwright/test";
import { blankLevel } from "../src/custom-level";

test("a single hammer exposes and persists its spin-speed setting", async ({
  page,
}) => {
  const level = blankLevel("e2e-hammer-spin-speed");
  level.prefabs = [{ id: "hammer-demo", kind: "hammer", x: 10, y: 3.5, z: 10 }];
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  try {
    await page.evaluate(
      (level) => window.__game!.customLevels.save(level),
      level,
    );
    await page
      .getByRole("button", { name: "Level editor", exact: true })
      .click();
    await page.locator("#editor-levels").selectOption(level.name);
    await expect(page.locator("#editor-status")).toContainText(
      `Opened ${level.name}`,
    );
    await page
      .locator('li[data-key="prefab:hammer-demo"] span')
      .first()
      .click();
    const speed = page.locator('#editor-props [data-prop="spinSpeed"]');
    await expect(speed).toHaveValue("1");
    await speed.fill("0.25");
    await speed.dispatchEvent("change");
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(
      `Saved ${level.name}`,
    );
    const saved = await page.evaluate(
      (name) => window.__game!.customLevels.load(name),
      level.name,
    );
    expect(saved.prefabs[0].spinSpeed).toBe(0.25);
    await speed.fill("0");
    await speed.dispatchEvent("change");
    await page.locator("#editor-save").click();
    await expect(page.locator("#editor-status")).toContainText(
      `Saved ${level.name}`,
    );
    expect(
      (
        await page.evaluate(
          (name) => window.__game!.customLevels.load(name),
          level.name,
        )
      ).prefabs[0].spinSpeed,
    ).toBe(0);
  } finally {
    await page.evaluate(
      (name) => window.__game!.customLevels.remove(name),
      level.name,
    );
  }
});
