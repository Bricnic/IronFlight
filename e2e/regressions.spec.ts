import { test, expect } from "@playwright/test";
test("lab hides course geometry that has no lab collision counterpart", async ({
  page,
}, info) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Destruction lab" }).click();
  expect(await page.evaluate(() => window.__game!.stats().courseVisible)).toBe(
    false,
  );
  await page.screenshot({ path: info.outputPath("destruction-lab.png") });
});
test("initial lab target matches the damage tool target", async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Destruction lab" }).click();
  await expect(page.getByLabel("Target part")).toHaveValue("hood");
  await page.getByRole("button", { name: "Dent panel" }).click();
  expect(
    await page.evaluate(() => window.__game!.snapshot().parts.hood.health),
  ).toBe(65);
});
test("a complete jump is playable with keyboard input at real time", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?test=1");
  await page.waitForFunction(() => !!window.__game);
  await page.keyboard.down("w");
  await expect
    .poll(() => page.evaluate(() => window.__game!.snapshot().status), {
      timeout: 45000,
    })
    .toBe("finished");
  await page.keyboard.up("w");
  const result = await page.evaluate(() => window.__game!.snapshot());
  expect(result.landed).toBe(true);
  expect(errors).toEqual([]);
  await info.attach("keyboard-1x", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("keyboard-finish.png") });
});
