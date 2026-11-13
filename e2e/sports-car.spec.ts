import { test, expect } from "@playwright/test";
import { driveTrack } from "./course-driver";
test("Sports car: complete Foundry Run in the new vehicle", async ({
  page,
}, info) => {
  const result = await driveTrack(page, "foundry-run", true, "sports-car");
  expect(result.state.vehicleId).toBe("sports-car");
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.run?.checkpoint).toBe(7);
  expect(result.state.integrity).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath("sports-foundry-finish.png") });
});
