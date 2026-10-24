import { test, expect } from "@playwright/test";
import { driveTrack } from "./course-driver";
test("Canyon Plunge: descend the ramp, clear the gorge and run the gauntlet", async ({
  page,
}, info) => {
  const result = await driveTrack(page, "canyon-plunge");
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.run?.checkpoint).toBe(8);
  expect(result.state.run!.elapsed).toBeGreaterThanOrEqual(120);
  expect(result.state.run!.elapsed).toBeLessThanOrEqual(225);
  expect(result.state.integrity).toBeGreaterThan(0);
  expect(result.state.axes.axes).toHaveLength(6);
  expect(result.art.gates).toBe(0);
  await info.attach("completion", {
    body: JSON.stringify(result.state),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("canyon-finish.png") });
});
test("Haunted Hollow: smash every gravestone while ghosts hunt the truck", async ({
  page,
}, info) => {
  const result = await driveTrack(page, "haunted-hollow");
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.run?.destroyed).toHaveLength(12);
  expect(result.state.run!.elapsed).toBeGreaterThanOrEqual(120);
  expect(result.state.run!.elapsed).toBeLessThanOrEqual(225);
  expect(result.state.integrity).toBeGreaterThan(0);
  expect(result.art.ghosts).toBe(3);
  await info.attach("completion", {
    body: JSON.stringify(result.state),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("hollow-finish.png") });
});
