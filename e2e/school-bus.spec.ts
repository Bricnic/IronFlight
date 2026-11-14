import { test, expect } from "@playwright/test";
import { driveTrack } from "./course-driver";
test("School bus: complete Foundry Run with no light bar", async ({
  page,
}, info) => {
  const result = await driveTrack(page, "foundry-run", true, "school-bus");
  expect(result.state.vehicleId).toBe("school-bus");
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.run?.checkpoint).toBe(7);
  expect(result.state.integrity).toBeGreaterThan(0);
  const lights = await page.evaluate(() => window.__game!.stats().lights);
  expect(lights).toEqual({ a: 0, b: 0 });
  await page.screenshot({ path: info.outputPath("bus-foundry-finish.png") });
});
