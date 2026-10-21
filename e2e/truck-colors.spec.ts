import { test, expect } from "@playwright/test";
import defaults from "../src/tuning-defaults.json" with { type: "json" };

test("color wheels recolor paint and trim, persist across reload/reset, and keep hex entry from driving", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?test=truck-colors");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    window.__game!.pause(true);
    window.__game!.select("lab");
  });
  await page.keyboard.press("Backquote");
  const wheel = page.getByRole("slider", {
    name: "Primary color wheel",
    exact: true,
  });
  const box = (await wheel.boundingBox())!;
  await wheel.click({ position: { x: box.width * 0.8, y: box.height / 2 } });
  const picked = await page.evaluate(
    () => window.__game!.snapshot().tuning.primaryColor,
  );
  expect(picked).not.toBe(defaults.primaryColor);
  await wheel.focus();
  await page.keyboard.press("ArrowRight");
  expect(
    await page.evaluate(() => window.__game!.snapshot().tuning.primaryColor),
  ).not.toBe(picked);
  for (const [name, value] of [
    ["Primary color hex", "#236bff"],
    ["Secondary color hex", "#ec2fd3"],
  ]) {
    const field = page.getByRole("textbox", { name, exact: true });
    await field.fill(value);
    await field.dispatchEvent("input");
  }
  await page.evaluate(() => window.__game!.advanceFrames(1, 1));
  expect(
    await page.evaluate(() => window.__game!.stats().fire.palette),
  ).toEqual({ primary: "236bff", secondary: "ec2fd3" });
  // Typing a color that contains steering keys must stay inside the field.
  const field = page.getByRole("textbox", {
    name: "Primary color hex",
    exact: true,
  });
  await field.fill("");
  await field.pressSequentially("#22aaff");
  await page.evaluate(() => window.__game!.advanceFrames(120, 1));
  expect(
    await page.evaluate(() => window.__game!.snapshot().speed),
  ).toBeLessThan(0.1);
  expect(
    await page.evaluate(() => window.__game!.snapshot().steeringAngle),
  ).toBe(0);
  expect(
    await page.evaluate(() => window.__game!.snapshot().time),
  ).toBeGreaterThan(1);
  await field.fill("#236bff");
  await field.dispatchEvent("input");
  await field.blur();
  await page.screenshot({ path: "artifacts/truck-color-wheels.png" });
  await page.keyboard.press("Backquote");
  await page.screenshot({ path: "artifacts/truck-recolored.png" });
  await page.evaluate(() => window.__game!.select("easy"));
  expect(
    await page.evaluate(() => window.__game!.stats().fire.palette),
  ).toEqual({ primary: "236bff", secondary: "ec2fd3" });
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => window.__game!.pause(true));
  expect(
    await page.evaluate(() => window.__game!.stats().fire.palette),
  ).toEqual({ primary: "236bff", secondary: "ec2fd3" });
  await page.keyboard.press("Backquote");
  await page.getByRole("button", { name: "Reset tuning", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Primary color hex", exact: true }),
  ).toHaveValue(`#${defaults.primaryColor.toString(16).padStart(6, "0")}`);
  await expect(
    page.getByRole("textbox", { name: "Secondary color hex", exact: true }),
  ).toHaveValue(`#${defaults.secondaryColor.toString(16).padStart(6, "0")}`);
  expect(errors).toEqual([]);
});
