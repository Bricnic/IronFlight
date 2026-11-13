import { test, expect } from "@playwright/test";
import { blankLevel } from "../src/custom-level";

test.slow();
test("repeated clicks cycle through occluded objects front to back and wrap", async ({
  page,
}) => {
  const level = blankLevel("e2e-overlap-cycle");
  level.solids = [
    { ...level.solids[0], locked: true },
    ...[10, 8, 6].map((size, i) => ({
      id: ["front", "middle", "back"][i],
      kind: "barrier" as const,
      x: 0,
      y: 5,
      z: 0,
      w: size,
      h: size,
      d: size,
      color: 0x44aacc + i * 0x220000,
    })),
  ];
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((l) => window.__game!.customLevels.save(l), level);
  try {
    await page
      .getByRole("button", { name: "Level editor", exact: true })
      .click();
    await page.locator("#editor-levels").selectOption(level.name);
    await expect(page.locator("#editor-status")).toContainText(
      `Opened ${level.name}`,
    );
    for (const preview of [false, true]) {
      if (preview) await page.locator("#editor-preview").click();
      for (const id of ["front", "middle", "back", "front"]) {
        // Recompute per click: font loading shifts the canvas mid-test.
        const point = await page.evaluate(() =>
          window.__game!.editorProject({ x: 0, y: 5, z: 0 }),
        );
        await page.mouse.click(point.x, point.y);
        await expect
          .poll(() => page.evaluate(() => window.__game!.editor().selection))
          .toBe(`solid:${id}`);
      }
    }
    expect(await page.evaluate(() => window.__game!.editor().dirty)).toBe(
      false,
    );
    await page
      .locator('li[data-key="solid:middle"]')
      .getByRole("button", { name: /^Lock / })
      .click();
    const point = await page.evaluate(() =>
      window.__game!.editorProject({ x: 0, y: 5, z: 0 }),
    );
    for (const id of ["front", "back", "front"]) {
      await page.mouse.click(point.x, point.y);
      await expect
        .poll(() => page.evaluate(() => window.__game!.editor().selection))
        .toBe(`solid:${id}`);
    }
  } finally {
    await page.evaluate(
      (name) => window.__game!.customLevels.remove(name),
      level.name,
    );
  }
});
