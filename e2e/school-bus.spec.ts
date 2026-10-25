import { test, expect } from "@playwright/test";
import { driveTrack } from "./course-driver";
test("School bus: complete Harbor Sprint with no light bar", async ({
  page,
}, info) => {
  const result = await driveTrack(page, "harbor-sprint", true, "school-bus");
  expect(result.state.vehicleId).toBe("school-bus");
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.run?.checkpoint).toBe(6);
  expect(result.state.integrity).toBeGreaterThan(0);
  const lights = await page.evaluate(() => window.__game!.stats().lights);
  expect(lights).toEqual({ a: 0, b: 0 });
  await page.screenshot({ path: info.outputPath("bus-harbor-finish.png") });
});
