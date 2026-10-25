import { test, expect } from "@playwright/test";
import { driveTrack } from "./course-driver";
import type { CustomLevel } from "../src/custom-level";
const PROBE = "e2e-probe";
const SPRINT = "e2e-sprint";
const probeLevel = (name: string): CustomLevel => ({
  name,
  mode: "race",
  spawn: { x: 0, y: 2.1, z: -100, yaw: 0 },
  checkpoints: [
    { x: 0, z: 0 },
    { x: 0, z: 100 },
  ],
  solids: [
    {
      id: "ground",
      kind: "ground",
      x: 0,
      y: -0.6,
      z: 0,
      w: 200,
      h: 1.2,
      d: 400,
      color: 0x6d817c,
      texture: "grass_ground",
    },
    {
      id: "road-1",
      kind: "road",
      x: 0,
      y: 0.015,
      z: 0,
      w: 24,
      h: 0.03,
      d: 230,
      color: 0x303e49,
      texture: "asphalt_02",
    },
  ],
  prefabs: [{ id: "book-1", kind: "book", x: 12, z: -40 }],
  medals: { gold: 35, silver: 50, bronze: 75 },
});
test("custom levels persist to disk and round-trip", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const roundtrip = await page.evaluate(
    async ({ probe, level }) => {
      const g = window.__game!;
      await g.customLevels.remove(probe).catch(() => {});
      await g.customLevels.save(level);
      const listed = await g.customLevels.list();
      const loaded = await g.customLevels.load(probe);
      const disk = await (await fetch(`/__levels?name=${probe}`)).json();
      await g.customLevels.remove(probe);
      const missing = await fetch(`/__levels?name=${probe}`).then(
        (r) => r.status,
      );
      return { listed, loaded, disk, missing };
    },
    { probe: PROBE, level: probeLevel(PROBE) },
  );
  expect(roundtrip.listed).toContain(PROBE);
  expect(roundtrip.loaded.name).toBe(PROBE);
  expect(roundtrip.disk.name).toBe(PROBE);
  expect(roundtrip.missing).toBe(404);
});
test("custom sprint completes end to end from disk", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(async (level) => {
    const g = window.__game!;
    await g.customLevels.save(level);
  }, probeLevel(SPRINT));
  const result = await driveTrack(page, `custom:${SPRINT}`, true);
  expect(result.state.run?.status, JSON.stringify(result.state.run)).toBe(
    "completed",
  );
  expect(result.state.integrity).toBeGreaterThan(0);
  await page.evaluate(async (name) => {
    await window.__game!.customLevels.remove(name);
  }, SPRINT);
});
