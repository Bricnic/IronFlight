import { test, expect } from "@playwright/test";
import { driveTrack } from "./course-driver";
test("Harbor Sprint: drive every checkpoint from spawn to finish", async ({
  page,
}, info) => {
  const result = await driveTrack(page, "harbor-sprint");
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.run?.checkpoint).toBe(6);
  expect(result.state.integrity).toBeGreaterThan(0.8);
  expect(result.initial.gates).toBe(6);
  expect(result.art.gates).toBe(0);
  expect(result.art.solids).toBeGreaterThan(20);
  await info.attach("completion", {
    body: JSON.stringify(result.state),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("harbor-finish.png") });
});

test("Foundry Run: complete ramp, machinery and timed flame sections", async ({
  page,
}, info) => {
  const result = await driveTrack(page, "foundry-run");
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.run?.checkpoint).toBe(7);
  expect(result.state.integrity).toBeGreaterThan(0.4);
  expect(result.peakY).toBeGreaterThan(3.1);
  await info.attach("completion", {
    body: JSON.stringify(result.state),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("foundry-finish.png") });
});

test("Skyline Circuit: complete a full physical lap through all sectors", async ({
  page,
}, info) => {
  const result = await driveTrack(page, "skyline-circuit");
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.run?.checkpoint).toBe(16);
  expect(result.state.integrity).toBeGreaterThan(0.8);
  expect(result.art.gates).toBe(0);
  await info.attach("completion", {
    body: JSON.stringify(result.state),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("skyline-finish.png") });
});

test("Scrapyard Sweep: collect all twelve tokens with 30 seconds to spare", async ({
  page,
}, info) => {
  const result = await driveTrack(page, "scrapyard-sweep");
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.run?.collected).toHaveLength(12);
  expect(result.state.run!.elapsed).toBeLessThanOrEqual(90);
  expect(result.state.integrity).toBeGreaterThan(0.5);
  expect(result.initial.pickups).toBe(12);
  expect(result.art.pickups).toBe(0);
  await info.attach("completion", {
    body: JSON.stringify(result.state),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("scrapyard-complete.png") });
});
