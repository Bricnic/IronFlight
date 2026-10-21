import DEFAULT_TUNING from "../src/tuning-defaults.json" with { type: "json" };
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
  ).toBeCloseTo((DEFAULT_TUNING.maxSteeringAngle * Math.PI) / 180);
  await page.keyboard.up("a");
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  expect(
    await page.evaluate(() => window.__game!.snapshot().tuning.topSpeed),
  ).toBe(2.3);
  await page.keyboard.press("Backquote");
  await page.getByRole("button", { name: "Reset tuning" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__game!.snapshot().tuning.topSpeed))
    .toBe(DEFAULT_TUNING.topSpeed);
});

test("new sliders have their requested limits, save values, and reset to requested defaults", async ({
  page,
}) => {
  await page.goto("/?test=new-sliders");
  await page.waitForFunction(() => !!window.__game);
  await page.keyboard.press("Backquote");
  for (const key of [
    "brakePower",
    "dragonDamage",
    "hammerSpeed",
    "handbrakePower",
    "shadowDarkness",
  ]) {
    const slider = page.locator(`#tune-${key}`);
    await expect(slider).toHaveAttribute("min", "1");
    await expect(slider).toHaveAttribute("max", "10");
    await slider.fill("2.4");
    await slider.dispatchEvent("input");
  }
  const angle = page.locator("#tune-maxSteeringAngle");
  await expect(angle).toHaveAttribute("min", "5");
  await expect(angle).toHaveAttribute("max", "90");
  await angle.fill("90");
  await angle.dispatchEvent("input");
  await expect(page.locator("#value-maxSteeringAngle")).toHaveText("90°");
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  const saved = await page.evaluate(() => window.__game!.snapshot().tuning);
  expect(saved.maxSteeringAngle).toBe(90);
  expect(saved.dragonDamage).toBe(2.4);
  expect(saved.brakePower).toBe(2.4);
  expect(saved.hammerSpeed).toBe(2.4);
  expect(saved.handbrakePower).toBe(2.4);
  expect(saved.shadowDarkness).toBe(2.4);
  await page.keyboard.press("Backquote");
  await page.getByRole("button", { name: "Reset tuning" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__game!.snapshot().tuning))
    .toMatchObject(DEFAULT_TUNING);
});

test("turning power supports weaker steering, persists and resets to source defaults", async ({
  page,
}) => {
  await page.goto("/?test=turning-power");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => window.__game!.pause(true));
  await page.keyboard.press("Backquote");
  const slider = page.locator("#tune-turningPower");
  await expect(slider).toHaveAttribute("min", "0.1");
  await expect(slider).toHaveAttribute("max", "10");
  const before = await page.evaluate(() => window.__game!.snapshot().tuning);
  await slider.fill("0.4");
  await slider.dispatchEvent("input");
  await expect(page.locator("#value-turningPower")).toHaveText("0.4×");
  expect(await page.evaluate(() => window.__game!.snapshot().tuning)).toEqual({
    ...before,
    turningPower: 0.4,
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  expect(
    await page.evaluate(() => window.__game!.snapshot().tuning.turningPower),
  ).toBe(0.4);
  await page.keyboard.press("Backquote");
  await page.getByRole("button", { name: "Reset tuning", exact: true }).click();
  await expect(slider).toHaveValue(String(DEFAULT_TUNING.turningPower));
});
