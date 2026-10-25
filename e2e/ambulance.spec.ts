import { test, expect } from "@playwright/test";
import { driveTrack } from "./course-driver";
test("Ambulance: complete Harbor Sprint in the new vehicle", async ({
  page,
}, info) => {
  const result = await driveTrack(page, "harbor-sprint", true, "ambulance");
  expect(result.state.vehicleId).toBe("ambulance");
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.run?.checkpoint).toBe(6);
  expect(result.state.integrity).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath("ems-harbor-finish.png") });
});
test("Ambulance: light bar flashes only above 90 mph", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const samples = await page.evaluate(() => {
    const g = window.__game!;
    localStorage.setItem("vehicle", "ambulance");
    g.pause(true);
    g.select("lab");
    const out: { speed: number; a: number; b: number }[] = [];
    for (let i = 0; i < 40; i++) {
      g.driveFrames(4, 16, () => ({ throttle: 1, steer: 0, brake: 0 }), false);
      const snap = g.snapshot();
      const lights = g.stats().lights;
      out.push({ speed: snap.speed, a: lights.a, b: lights.b });
    }
    return out;
  });
  expect(Math.max(...samples.map((s) => s.speed))).toBeGreaterThan(25);
  expect(samples.some((s) => s.speed <= 25 && s.a < 1 && s.b < 1)).toBe(true);
  expect(samples.some((s) => s.speed > 25 && s.a > 1)).toBe(true);
  expect(samples.some((s) => s.speed > 25 && s.b > 1)).toBe(true);
  expect(
    samples.every((s) => (s.speed > 25 ? s.a > 1 !== s.b > 1 : true)),
  ).toBe(true);
});
