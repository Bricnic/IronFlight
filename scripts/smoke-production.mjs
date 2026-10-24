import DEFAULT_TUNING from "../src/tuning-defaults.json" with { type: "json" };
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
  assert.equal(await page.locator("#level-select").isVisible(), true);
  assert.equal(await page.locator(".track-card").count(), 9);
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll(".track-card img")).every(
      (i) => i.complete && i.naturalWidth > 0,
    ),
  );
  await page.screenshot({ path: "artifacts/production-level-select.png" });
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
  assert.equal(
    await page.locator("#tune-boostPower").inputValue(),
    String(DEFAULT_TUNING.boostPower),
  );
  assert.equal(await page.locator("#store-defaults").isDisabled(), true);
  assert.equal(
    await page.locator("#color-primaryColor").inputValue(),
    `#${DEFAULT_TUNING.primaryColor.toString(16).padStart(6, "0")}`,
  );
  assert.equal(
    await page.locator("#color-secondaryColor").inputValue(),
    `#${DEFAULT_TUNING.secondaryColor.toString(16).padStart(6, "0")}`,
  );
  await page.screenshot({ path: "artifacts/production-tuning.png" });
  await page.keyboard.press("Backquote");
  assert.equal(await page.locator("#debug-menu").isVisible(), false);
  await page
    .getByRole("button", { name: "Play Triple Loop", exact: true })
    .click();
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
        /^Checkpoint [1-3] \/ /.test(
          document.getElementById("run-progress")?.textContent ?? "",
        ) || !document.getElementById("track-result")?.hidden,
      undefined,
      { timeout: 60000 },
    );
    await page.keyboard.up("w");
    const checkpoint = await page.locator("#run-progress").innerText();
    assert.match(
      checkpoint,
      /^Checkpoint [1-3] \/ /,
      `${stage} at ${rate}x must clear its jump and first official checkpoint`,
    );
    const readouts = await page.locator("#telemetry").innerText();
    runs.push({ stage, rate, outcome: "jump-cleared", checkpoint, readouts });
    console.log(`${stage} at ${rate}x: jump cleared`);
    await page.screenshot({
      path: `artifacts/production-${stage}-${rate}x.png`,
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/production-report.json",
    JSON.stringify(
      {
        productionHarnessAbsent: true,
        levelSelectVerified: true,
        tuningMenuVerified: true,
        runs,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        productionHarnessAbsent: true,
        levelSelectVerified: true,
        tuningMenuVerified: true,
        runs,
        errors,
      },
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
