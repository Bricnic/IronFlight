import { test, expect } from "@playwright/test";
import { driveTrack } from "./course-driver";

const NEW_VEHICLES = ["hovercraft", "snow-groomer", "hot-rod", "tow-truck"];

for (const vehicle of NEW_VEHICLES) {
  test(`${vehicle}: Foundry Run clears the ramp above 0.4 integrity`, async ({
    page,
  }, info) => {
    const result = await driveTrack(page, "foundry-run", true, vehicle);
    expect(result.state.vehicleId).toBe(vehicle);
    expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
      "completed",
    );
    expect(result.state.run?.checkpoint).toBe(7);
    expect(result.state.integrity).toBeGreaterThan(0.4);
    expect(result.peakY).toBeGreaterThan(3.1);
    await page.screenshot({ path: info.outputPath(`${vehicle}-foundry.png`) });
  });

  test(`${vehicle}: Skyline Circuit laps 16/16 above 0.8 integrity`, async ({
    page,
  }, info) => {
    const result = await driveTrack(page, "skyline-circuit", true, vehicle);
    expect(result.state.vehicleId).toBe(vehicle);
    expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
      "completed",
    );
    expect(result.state.run?.checkpoint).toBe(16);
    expect(result.state.integrity).toBeGreaterThan(0.8);
    expect(result.art.gates).toBe(0);
    await page.screenshot({ path: info.outputPath(`${vehicle}-skyline.png`) });
  });

  test(`${vehicle}: Scrapyard Sweep banks 12/12 tokens within 90 s`, async ({
    page,
  }, info) => {
    const result = await driveTrack(page, "scrapyard-sweep", true, vehicle);
    expect(result.state.vehicleId).toBe(vehicle);
    expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
      "completed",
    );
    expect(result.state.run?.collected).toHaveLength(12);
    expect(result.state.run!.elapsed).toBeLessThanOrEqual(90);
    expect(result.state.integrity).toBeGreaterThan(0.5);
    expect(result.initial.pickups).toBe(12);
    expect(result.art.pickups).toBe(0);
    await page.screenshot({ path: info.outputPath(`${vehicle}-scrapyard.png`) });
  });

  test(`${vehicle}: Inferno Vault recovers 10/10 cores within 112.5 s`, async ({
    page,
  }, info) => {
    const result = await driveTrack(page, "inferno-vault", true, vehicle);
    expect(result.state.vehicleId).toBe(vehicle);
    expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
      "completed",
    );
    expect(result.state.run?.collected).toHaveLength(10);
    expect(result.state.run!.elapsed).toBeLessThanOrEqual(112.5);
    expect(result.state.integrity).toBeGreaterThan(0.4);
    expect(result.initial.pickups).toBe(10);
    expect(result.art.pickups).toBe(0);
    await page.screenshot({ path: info.outputPath(`${vehicle}-inferno.png`) });
  });
}
