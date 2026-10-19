import { test, expect } from "@playwright/test";
test("backtick toggles live tuning; sliders persist and tires slew", async ({
  page,
}) => {
  await page.goto("/?test=tuning");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    window.__game!.pause(true);
    window.__game!.select("lab");
  });
  const menu = page.locator("#debug-menu");
  await expect(menu).toBeHidden();
  await page.keyboard.press("Backquote");
  await expect(menu).toBeVisible();
  for (const key of [
    "acceleration",
    "topSpeed",
    "boostPower",
    "friction",
    "steeringRate",
  ]) {
    const slider = page.locator(`#tune-${key}`);
    await expect(slider).toHaveAttribute("min", "1");
    await expect(slider).toHaveAttribute("max", "10");
    await expect(slider).toHaveAttribute("step", "0.1");
    await slider.fill("2.3");
    await slider.dispatchEvent("input");
    expect(
      await page.evaluate(
        (key) => window.__game!.snapshot().tuning[key as "topSpeed"],
        key,
      ),
    ).toBe(2.3);
  }
  await page.keyboard.press("Backquote");
  await expect(menu).toBeHidden();
  await page.keyboard.down("a");
  await page.evaluate(() => window.__game!.advanceFrames(1, 1));
  const first = await page.evaluate(
    () => window.__game!.snapshot().steeringAngle,
  );
  expect(first).toBeGreaterThan(0);
  expect(first).toBeLessThan(0.1);
  await page.evaluate(() => window.__game!.advanceFrames(20, 1));
  expect(
    await page.evaluate(() => window.__game!.snapshot().steeringAngle),
  ).toBeCloseTo(0.35);
  await page.keyboard.up("a");
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  expect(
    await page.evaluate(() => window.__game!.snapshot().tuning.topSpeed),
  ).toBe(2.3);
  await page.keyboard.press("Backquote");
  await page.getByRole("button", { name: "Reset tuning" }).click();
  expect(
    await page.evaluate(() => window.__game!.snapshot().tuning.topSpeed),
  ).toBe(1);
});
