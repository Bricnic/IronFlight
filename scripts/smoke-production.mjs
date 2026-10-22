import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// Run against `npx vite preview --host 127.0.0.1 --port 4173` after a build.
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const runs = [];
try {
  await page.goto("http://127.0.0.1:4173");
  await page.locator("#loading").waitFor({ state: "detached", timeout: 30000 });
  assert.equal(
    await page.evaluate(() => typeof window.__game),
    "undefined",
    "Production must not expose the dev harness",
  );
  await page.keyboard.press("Backquote");
  assert.equal(await page.locator("#debug-menu").isVisible(), true);
  for (const key of [
    "acceleration",
    "topSpeed",
    "boostPower",
    "friction",
    "steeringRate",
  ]) {
    const slider = page.locator(`#tune-${key}`);
    assert.equal(await slider.getAttribute("min"), "1");
    assert.equal(await slider.getAttribute("max"), "10");
    assert.equal(await slider.getAttribute("step"), "0.1");
  }
  assert.equal(await page.locator("#tune-boostPower").inputValue(), "3");
  await page.screenshot({ path: "artifacts/production-tuning.png" });
  await page.keyboard.press("Backquote");
  assert.equal(await page.locator("#debug-menu").isVisible(), false);
  for (const [stage, rate] of [
    ["easy", 1],
    ["easy", 16],
    ["medium", 16],
    ["hard", 16],
  ]) {
    await page.locator(`[data-stage="${stage}"]`).click();
    await page.getByLabel("Playback speed").selectOption(String(rate));
    await page.keyboard.down("w");
    await page.waitForFunction(
      () =>
        ["CLEAN LANDING", "TRUCK DOWN"].includes(
          document.getElementById("state-label")?.textContent ?? "",
        ),
      undefined,
      { timeout: 60000 },
    );
    await page.keyboard.up("w");
    assert.equal(
      await page.locator("#state-label").innerText(),
      "CLEAN LANDING",
      `${stage} at ${rate}x must finish`,
    );
    const readouts = await page.locator("#telemetry").innerText();
    runs.push({ stage, rate, outcome: "finished", readouts });
    console.log(`${stage} at ${rate}x: finished`);
    await page.screenshot({
      path: `artifacts/production-${stage}-${rate}x.png`,
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/production-report.json",
    JSON.stringify(
      { productionHarnessAbsent: true, tuningMenuVerified: true, runs, errors },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      { productionHarnessAbsent: true, tuningMenuVerified: true, runs, errors },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({ path: "artifacts/production-failed.png" });
  await writeFile(
    "artifacts/production-report.json",
    JSON.stringify(
      {
        runs,
        errors,
        failure: String(error),
        readouts: await page.locator("#telemetry").innerText(),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
